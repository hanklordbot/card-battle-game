import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { BattleState, createBattleState, processAction, getVisibleState } from '../engine/battle-manager.js';
import { db } from '../db/index.js';
import { battles } from '../db/schema.js';

interface WSClient {
  ws: WebSocket;
  playerId: string;
  username: string;
  battleId?: string;
  lastHeartbeat: number;
}

interface Room {
  id: string;
  state: BattleState;
  clients: Map<string, WSClient>; // playerId -> client
  disconnectedAt: Map<string, number>; // playerId -> timestamp for reconnect
}

// Matchmaking queue entry
interface QueueEntry {
  playerId: string;
  username: string;
  elo: number;
  joinedAt: number;
  ws: WebSocket;
}

const clients = new Map<string, WSClient>(); // playerId -> client
const rooms = new Map<string, Room>(); // roomId -> room
const matchQueue: QueueEntry[] = [];
let matchmakingTimer: ReturnType<typeof setInterval> | null = null;

function send(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ts: Date.now(), payload }));
  }
}

function broadcastToRoom(room: Room, type: string, payload: unknown, excludePlayerId?: string) {
  for (const [pid, client] of room.clients) {
    if (pid !== excludePlayerId) {
      send(client.ws, type, payload);
    }
  }
}

export function setupWebSocket(app: FastifyInstance) {
  const wss = new WebSocketServer({ noServer: true });

  // Upgrade HTTP to WS
  app.server.on('upgrade', (request: IncomingMessage, socket, head) => {
    // Extract token from query string
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) { socket.destroy(); return; }

    try {
      const decoded = app.jwt.verify(token) as { id: string; username: string };
      (request as any).user = decoded;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const user = (request as any).user as { id: string; username: string };
    const client: WSClient = { ws, playerId: user.id, username: user.username, lastHeartbeat: Date.now() };

    // Check for reconnection
    const existingClient = clients.get(user.id);
    if (existingClient?.battleId) {
      const room = rooms.get(existingClient.battleId);
      if (room && room.disconnectedAt.has(user.id)) {
        // Reconnect
        room.disconnectedAt.delete(user.id);
        client.battleId = existingClient.battleId;
        room.clients.set(user.id, client);
        clients.set(user.id, client);
        send(ws, 'battle:reconnect', getVisibleState(room.state, user.id));
        app.log.info(`Player ${user.username} reconnected to battle ${client.battleId}`);
        return;
      }
    }

    // Disconnect old connection if exists
    if (existingClient) {
      existingClient.ws.close(1000, 'New connection');
    }

    clients.set(user.id, client);
    send(ws, 'connected', { playerId: user.id, username: user.username });
    app.log.info(`Player ${user.username} connected via WebSocket`);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(app, client, msg);
      } catch (e) {
        send(ws, 'error', { message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      handleDisconnect(app, client);
    });

    ws.on('pong', () => {
      client.lastHeartbeat = Date.now();
    });
  });

  // Heartbeat
  setInterval(() => {
    for (const [, client] of clients) {
      if (Date.now() - client.lastHeartbeat > config.heartbeatInterval * 2) {
        client.ws.terminate();
        continue;
      }
      if (client.ws.readyState === WebSocket.OPEN) client.ws.ping();
    }
  }, config.heartbeatInterval);

  // Start matchmaking loop
  matchmakingTimer = setInterval(() => runMatchmaking(app), config.matchmakingInterval);

  app.log.info('WebSocket server initialized');
}

function handleMessage(app: FastifyInstance, client: WSClient, msg: { type: string; payload?: any }) {
  switch (msg.type) {
    case 'match:join': handleMatchJoin(app, client, msg.payload); break;
    case 'match:cancel': handleMatchCancel(client); break;
    case 'room:create': handleRoomCreate(app, client); break;
    case 'room:join': handleRoomJoin(app, client, msg.payload); break;
    case 'room:leave': handleRoomLeave(app, client); break;
    case 'battle:action': handleBattleAction(app, client, msg.payload); break;
    case 'battle:surrender': handleBattleAction(app, client, { action: 'surrender', params: {} }); break;
    case 'heartbeat': send(client.ws, 'heartbeat_ack', {}); break;
    default: send(client.ws, 'error', { message: `Unknown message type: ${msg.type}` });
  }
}

// === Matchmaking ===

function handleMatchJoin(app: FastifyInstance, client: WSClient, payload: any) {
  // Remove if already in queue
  const idx = matchQueue.findIndex(e => e.playerId === client.playerId);
  if (idx !== -1) matchQueue.splice(idx, 1);

  matchQueue.push({
    playerId: client.playerId,
    username: client.username,
    elo: payload?.elo ?? 1000,
    joinedAt: Date.now(),
    ws: client.ws,
  });
  send(client.ws, 'match:queued', { position: matchQueue.length });
  app.log.info(`Player ${client.username} joined matchmaking queue`);
}

function handleMatchCancel(client: WSClient) {
  const idx = matchQueue.findIndex(e => e.playerId === client.playerId);
  if (idx !== -1) {
    matchQueue.splice(idx, 1);
    send(client.ws, 'match:cancelled', {});
  }
}

function runMatchmaking(app: FastifyInstance) {
  if (matchQueue.length < 2) return;

  // Simple: match first two in queue (expand ELO range over time in production)
  const BASE_RANGE = 100;
  const EXPAND_PER_SEC = 10;
  const MAX_RANGE = 500;

  for (let i = 0; i < matchQueue.length; i++) {
    const p1 = matchQueue[i];
    const waitTime = (Date.now() - p1.joinedAt) / 1000;
    const range = Math.min(BASE_RANGE + waitTime * EXPAND_PER_SEC, MAX_RANGE);

    for (let j = i + 1; j < matchQueue.length; j++) {
      const p2 = matchQueue[j];
      if (Math.abs(p1.elo - p2.elo) <= range) {
        // Match found
        matchQueue.splice(j, 1);
        matchQueue.splice(i, 1);
        createMatchedRoom(app, p1, p2);
        return;
      }
    }
  }
}

function createMatchedRoom(app: FastifyInstance, p1: QueueEntry, p2: QueueEntry) {
  const state = createBattleState(p1.playerId, p2.playerId);
  state.status = 'playing';

  // Simulate initial draw (5 cards each)
  state.players[0].handCount = 5;
  state.players[0].deckCount = 35;
  state.players[1].handCount = 5;
  state.players[1].deckCount = 35;

  const room: Room = {
    id: state.battleId,
    state,
    clients: new Map(),
    disconnectedAt: new Map(),
  };

  const c1 = clients.get(p1.playerId);
  const c2 = clients.get(p2.playerId);
  if (c1) { c1.battleId = room.id; room.clients.set(p1.playerId, c1); }
  if (c2) { c2.battleId = room.id; room.clients.set(p2.playerId, c2); }

  rooms.set(room.id, room);

  // Notify both players
  if (c1) send(c1.ws, 'match:found', { battleId: room.id, opponent: { playerId: p2.playerId, username: p2.username } });
  if (c2) send(c2.ws, 'match:found', { battleId: room.id, opponent: { playerId: p1.playerId, username: p1.username } });

  // Send initial state
  if (c1) send(c1.ws, 'battle:init', getVisibleState(state, p1.playerId));
  if (c2) send(c2.ws, 'battle:init', getVisibleState(state, p2.playerId));

  app.log.info(`Match created: ${p1.username} vs ${p2.username} (battle: ${room.id})`);
}

// === Room Management ===

function handleRoomCreate(app: FastifyInstance, client: WSClient) {
  const state = createBattleState(client.playerId, '');
  const room: Room = { id: state.battleId, state, clients: new Map(), disconnectedAt: new Map() };
  room.clients.set(client.playerId, client);
  client.battleId = room.id;
  rooms.set(room.id, room);
  send(client.ws, 'room:created', { roomId: room.id });
  app.log.info(`Room ${room.id} created by ${client.username}`);
}

function handleRoomJoin(app: FastifyInstance, client: WSClient, payload: any) {
  const roomId = payload?.roomId as string;
  const room = rooms.get(roomId);
  if (!room) { send(client.ws, 'error', { message: 'Room not found' }); return; }
  if (room.clients.size >= 2) { send(client.ws, 'error', { message: 'Room is full' }); return; }

  room.clients.set(client.playerId, client);
  client.battleId = room.id;
  room.state.players[1].playerId = client.playerId;
  room.state.status = 'playing';

  // Simulate initial draw
  room.state.players[0].handCount = 5;
  room.state.players[0].deckCount = 35;
  room.state.players[1].handCount = 5;
  room.state.players[1].deckCount = 35;

  // Notify both
  for (const [pid, c] of room.clients) {
    send(c.ws, 'room:joined', { roomId: room.id, playerId: client.playerId });
    send(c.ws, 'battle:init', getVisibleState(room.state, pid));
  }
  app.log.info(`Player ${client.username} joined room ${room.id}`);
}

function handleRoomLeave(app: FastifyInstance, client: WSClient) {
  if (!client.battleId) return;
  const room = rooms.get(client.battleId);
  if (!room) return;

  room.clients.delete(client.playerId);
  client.battleId = undefined;

  if (room.clients.size === 0) {
    rooms.delete(room.id);
  } else {
    broadcastToRoom(room, 'room:player_left', { playerId: client.playerId });
  }
}

// === Battle Actions ===

function handleBattleAction(app: FastifyInstance, client: WSClient, payload: any) {
  if (!client.battleId) { send(client.ws, 'error', { message: 'Not in a battle' }); return; }
  const room = rooms.get(client.battleId);
  if (!room || room.state.status === 'finished') { send(client.ws, 'error', { message: 'Battle not active' }); return; }

  const action = payload?.action as string;
  const params = payload?.params ?? {};
  const changes = processAction(room.state, client.playerId, action, params);

  // Broadcast state delta to both players
  for (const [pid, c] of room.clients) {
    send(c.ws, 'battle:state_delta', { changes });
    send(c.ws, 'battle:state', getVisibleState(room.state, pid));
  }

  // If battle ended, save to DB and clean up
  if ((room.state.status as string) === 'finished') {
    saveBattleResult(room.state).catch(e => app.log.error(e));
    setTimeout(() => {
      for (const [, c] of room.clients) c.battleId = undefined;
      rooms.delete(room.id);
    }, 5000);
  }
}

// === Disconnect / Reconnect ===

function handleDisconnect(app: FastifyInstance, client: WSClient) {
  // Remove from match queue
  const qIdx = matchQueue.findIndex(e => e.playerId === client.playerId);
  if (qIdx !== -1) matchQueue.splice(qIdx, 1);

  if (client.battleId) {
    const room = rooms.get(client.battleId);
    if (room && room.state.status === 'playing') {
      // Mark as disconnected, allow reconnect
      room.disconnectedAt.set(client.playerId, Date.now());
      room.clients.delete(client.playerId);
      broadcastToRoom(room, 'battle:opponent_disconnected', { playerId: client.playerId });

      // Set timeout for auto-forfeit
      setTimeout(() => {
        if (room.disconnectedAt.has(client.playerId)) {
          room.disconnectedAt.delete(client.playerId);
          const opponentId = room.state.players.find(p => p.playerId !== client.playerId)?.playerId;
          if (opponentId) {
            room.state.status = 'finished';
            room.state.winner = opponentId;
            room.state.resultReason = 'disconnect';
            broadcastToRoom(room, 'battle:end', { winner: opponentId, reason: 'disconnect' });
            saveBattleResult(room.state).catch(e => app.log.error(e));
          }
          rooms.delete(room.id);
        }
      }, config.reconnectTimeout);

      app.log.info(`Player ${client.username} disconnected from battle ${client.battleId}, waiting for reconnect`);
    } else {
      // Not in active battle, just clean up
      if (room) {
        room.clients.delete(client.playerId);
        if (room.clients.size === 0) rooms.delete(room.id);
      }
    }
  }

  clients.delete(client.playerId);
  app.log.info(`Player ${client.username} disconnected`);
}

async function saveBattleResult(state: BattleState) {
  const p1 = state.players[0];
  const p2 = state.players[1];
  if (!p2.playerId) return; // no opponent (room was never filled)

  await db.insert(battles).values({
    mode: 'ranked',
    player1Id: p1.playerId,
    player2Id: p2.playerId,
    winnerId: state.winner || null,
    resultReason: state.resultReason || 'unknown',
    turnCount: state.turnCount,
    durationSec: Math.floor((Date.now() - state.startedAt) / 1000),
    startedAt: new Date(state.startedAt),
    endedAt: new Date(),
  });
}

// Export for testing
export { rooms, clients, matchQueue };
