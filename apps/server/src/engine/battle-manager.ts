import { nanoid } from 'nanoid';

// Re-implement core types inline to avoid cross-workspace dependency issues.
// In production monorepo, these would be imported from @card-game/core.

export enum Phase { Draw = 'draw', Standby = 'standby', Main1 = 'main1', Battle = 'battle', Main2 = 'main2', End = 'end' }
export enum Position { FaceUpAttack = 'face_up_attack', FaceUpDefense = 'face_up_defense', FaceDownDefense = 'face_down_defense' }

export interface CardInstance {
  instanceId: string;
  cardId: string;
  position: Position;
  atk: number;
  def: number;
  canAttack: boolean;
  hasAttackedThisTurn: boolean;
}

export interface PlayerBattleState {
  playerId: string;
  lp: number;
  handCount: number;
  hand: string[]; // card IDs (hidden from opponent)
  deckCount: number;
  monsterZones: (CardInstance | null)[];
  spellTrapZones: (CardInstance | null)[];
  fieldSpell: CardInstance | null;
  graveyardCount: number;
  graveyard: string[];
}

export interface BattleState {
  battleId: string;
  status: 'waiting' | 'playing' | 'finished';
  turnCount: number;
  currentPhase: Phase;
  turnPlayer: string; // playerId
  players: [PlayerBattleState, PlayerBattleState];
  normalSummonUsed: boolean;
  winner?: string;
  resultReason?: string;
  startedAt: number;
}

export interface StateChange {
  type: string;
  [key: string]: unknown;
}

export function createBattleState(player1Id: string, player2Id: string): BattleState {
  const battleId = nanoid(12);
  return {
    battleId,
    status: 'waiting',
    turnCount: 1,
    currentPhase: Phase.Draw,
    turnPlayer: player1Id,
    normalSummonUsed: false,
    players: [
      createPlayerBattleState(player1Id),
      createPlayerBattleState(player2Id),
    ],
    startedAt: Date.now(),
  };
}

function createPlayerBattleState(playerId: string): PlayerBattleState {
  return {
    playerId, lp: 8000, handCount: 0, hand: [], deckCount: 40,
    monsterZones: [null, null, null, null, null],
    spellTrapZones: [null, null, null, null, null],
    fieldSpell: null, graveyardCount: 0, graveyard: [],
  };
}

/** Get the state visible to a specific player (hides opponent's hand) */
export function getVisibleState(state: BattleState, forPlayerId: string): object {
  const playerIdx = state.players.findIndex(p => p.playerId === forPlayerId);
  const opponentIdx = playerIdx === 0 ? 1 : 0;

  return {
    battleId: state.battleId,
    status: state.status,
    turnCount: state.turnCount,
    currentPhase: state.currentPhase,
    turnPlayer: state.turnPlayer,
    normalSummonUsed: state.normalSummonUsed,
    winner: state.winner,
    me: state.players[playerIdx],
    opponent: {
      ...state.players[opponentIdx],
      hand: undefined, // hide opponent's hand
      handCount: state.players[opponentIdx].handCount,
    },
  };
}

const PHASE_ORDER = [Phase.Draw, Phase.Standby, Phase.Main1, Phase.Battle, Phase.Main2, Phase.End];

export function processAction(state: BattleState, playerId: string, action: string, params: Record<string, unknown>): StateChange[] {
  const changes: StateChange[] = [];
  const playerIdx = state.players.findIndex(p => p.playerId === playerId);
  if (playerIdx === -1) return [{ type: 'error', message: 'Player not in battle' }];

  const isCurrentTurn = state.turnPlayer === playerId;

  switch (action) {
    case 'advance_phase': {
      if (!isCurrentTurn) return [{ type: 'error', message: 'Not your turn' }];
      const curIdx = PHASE_ORDER.indexOf(state.currentPhase);
      if (state.currentPhase === Phase.End) {
        // End turn
        state.normalSummonUsed = false;
        state.players[playerIdx].monsterZones.forEach(m => { if (m) m.hasAttackedThisTurn = false; });
        const opponentIdx = playerIdx === 0 ? 1 : 0;
        state.turnPlayer = state.players[opponentIdx].playerId;
        state.turnCount++;
        state.currentPhase = Phase.Draw;
        // Auto draw
        state.players[opponentIdx].deckCount--;
        state.players[opponentIdx].handCount++;
        if (state.players[opponentIdx].deckCount < 0) {
          state.status = 'finished';
          state.winner = playerId;
          state.resultReason = 'deck_out';
          changes.push({ type: 'battle_end', winner: playerId, reason: 'deck_out' });
        }
        changes.push({ type: 'turn_change', turnPlayer: state.turnPlayer, turnCount: state.turnCount });
        changes.push({ type: 'phase_change', phase: Phase.Draw });
      } else if (state.currentPhase === Phase.Main1 && state.turnCount === 1) {
        // Skip battle on first turn
        state.currentPhase = Phase.Main2;
        changes.push({ type: 'phase_change', phase: Phase.Main2 });
      } else {
        state.currentPhase = PHASE_ORDER[curIdx + 1];
        changes.push({ type: 'phase_change', phase: state.currentPhase });
      }
      break;
    }

    case 'summon': {
      if (!isCurrentTurn) return [{ type: 'error', message: 'Not your turn' }];
      if (state.currentPhase !== Phase.Main1 && state.currentPhase !== Phase.Main2) return [{ type: 'error', message: 'Not in main phase' }];
      if (state.normalSummonUsed) return [{ type: 'error', message: 'Normal summon already used' }];

      const zoneIndex = (params.zoneIndex as number) ?? state.players[playerIdx].monsterZones.findIndex(z => z === null);
      if (zoneIndex === -1 || state.players[playerIdx].monsterZones[zoneIndex] !== null) return [{ type: 'error', message: 'No empty monster zone' }];

      const cardId = params.cardId as string;
      const position = (params.position as Position) ?? Position.FaceUpAttack;
      const instance: CardInstance = {
        instanceId: nanoid(8), cardId, position,
        atk: (params.atk as number) ?? 0, def: (params.def as number) ?? 0,
        canAttack: position === Position.FaceUpAttack, hasAttackedThisTurn: false,
      };
      state.players[playerIdx].monsterZones[zoneIndex] = instance;
      state.players[playerIdx].handCount--;
      state.normalSummonUsed = true;
      changes.push({ type: 'card_summoned', playerId, zoneIndex, card: instance });
      break;
    }

    case 'attack': {
      if (!isCurrentTurn) return [{ type: 'error', message: 'Not your turn' }];
      if (state.currentPhase !== Phase.Battle) return [{ type: 'error', message: 'Not in battle phase' }];

      const attackerZone = params.attackerZone as number;
      const attacker = state.players[playerIdx].monsterZones[attackerZone];
      if (!attacker || attacker.position !== Position.FaceUpAttack || attacker.hasAttackedThisTurn) {
        return [{ type: 'error', message: 'Invalid attacker' }];
      }

      const opponentIdx = playerIdx === 0 ? 1 : 0;
      const targetZone = params.targetZone as number | undefined;

      if (targetZone === undefined || targetZone === -1) {
        // Direct attack
        const hasDefender = state.players[opponentIdx].monsterZones.some(m => m !== null);
        if (hasDefender) return [{ type: 'error', message: 'Opponent has monsters' }];
        state.players[opponentIdx].lp -= attacker.atk;
        attacker.hasAttackedThisTurn = true;
        changes.push({ type: 'direct_attack', playerId, attackerZone, damage: attacker.atk });
        if (state.players[opponentIdx].lp <= 0) {
          state.players[opponentIdx].lp = 0;
          state.status = 'finished';
          state.winner = playerId;
          state.resultReason = 'lp_zero';
          changes.push({ type: 'battle_end', winner: playerId, reason: 'lp_zero' });
        }
        changes.push({ type: 'lp_changed', playerId: state.players[opponentIdx].playerId, lp: state.players[opponentIdx].lp });
      } else {
        // Battle with monster
        const defender = state.players[opponentIdx].monsterZones[targetZone];
        if (!defender) return [{ type: 'error', message: 'No defender at target zone' }];

        if (defender.position === Position.FaceUpAttack) {
          if (attacker.atk > defender.atk) {
            const dmg = attacker.atk - defender.atk;
            state.players[opponentIdx].lp -= dmg;
            state.players[opponentIdx].monsterZones[targetZone] = null;
            state.players[opponentIdx].graveyardCount++;
            changes.push({ type: 'monster_destroyed', playerId: state.players[opponentIdx].playerId, zoneIndex: targetZone });
            changes.push({ type: 'lp_changed', playerId: state.players[opponentIdx].playerId, lp: state.players[opponentIdx].lp });
          } else if (attacker.atk === defender.atk) {
            state.players[playerIdx].monsterZones[attackerZone] = null;
            state.players[opponentIdx].monsterZones[targetZone] = null;
            state.players[playerIdx].graveyardCount++;
            state.players[opponentIdx].graveyardCount++;
            changes.push({ type: 'monster_destroyed', playerId, zoneIndex: attackerZone });
            changes.push({ type: 'monster_destroyed', playerId: state.players[opponentIdx].playerId, zoneIndex: targetZone });
          } else {
            const dmg = defender.atk - attacker.atk;
            state.players[playerIdx].lp -= dmg;
            state.players[playerIdx].monsterZones[attackerZone] = null;
            state.players[playerIdx].graveyardCount++;
            changes.push({ type: 'monster_destroyed', playerId, zoneIndex: attackerZone });
            changes.push({ type: 'lp_changed', playerId, lp: state.players[playerIdx].lp });
          }
        } else {
          // ATK vs DEF
          if (attacker.atk > defender.def) {
            state.players[opponentIdx].monsterZones[targetZone] = null;
            state.players[opponentIdx].graveyardCount++;
            changes.push({ type: 'monster_destroyed', playerId: state.players[opponentIdx].playerId, zoneIndex: targetZone });
          } else if (attacker.atk < defender.def) {
            const dmg = defender.def - attacker.atk;
            state.players[playerIdx].lp -= dmg;
            changes.push({ type: 'lp_changed', playerId, lp: state.players[playerIdx].lp });
          }
        }
        attacker.hasAttackedThisTurn = true;
        changes.push({ type: 'battle_resolved', attackerZone, targetZone });

        // Check LP
        for (const p of state.players) {
          if (p.lp <= 0) {
            p.lp = 0;
            state.status = 'finished';
            state.winner = state.players.find(pp => pp.playerId !== p.playerId)!.playerId;
            state.resultReason = 'lp_zero';
            changes.push({ type: 'battle_end', winner: state.winner, reason: 'lp_zero' });
          }
        }
      }
      break;
    }

    case 'surrender': {
      const opponentIdx = playerIdx === 0 ? 1 : 0;
      state.status = 'finished';
      state.winner = state.players[opponentIdx].playerId;
      state.resultReason = 'surrender';
      changes.push({ type: 'battle_end', winner: state.winner, reason: 'surrender' });
      break;
    }

    default:
      changes.push({ type: 'error', message: `Unknown action: ${action}` });
  }

  return changes;
}
