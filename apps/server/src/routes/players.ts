import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { players, playerCards, battles } from '../db/schema.js';
import { eq, or, desc, sql } from 'drizzle-orm';
import { authGuard } from '../middleware/auth.js';

export async function playerRoutes(app: FastifyInstance) {
  // Get current player profile
  app.get('/api/players/me', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { id: string };
    const [player] = await db.select({
      id: players.id, username: players.username, displayName: players.displayName,
      eloRating: players.eloRating, coins: players.coins, gems: players.gems, createdAt: players.createdAt,
    }).from(players).where(eq(players.id, user.id)).limit(1);
    return player;
  });

  // Update display name
  app.patch('/api/players/me', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { id: string };
    const body = z.object({ displayName: z.string().min(1).max(30) }).parse(request.body);
    const [player] = await db.update(players).set(body).where(eq(players.id, user.id)).returning({
      id: players.id, username: players.username, displayName: players.displayName,
      eloRating: players.eloRating, coins: players.coins, gems: players.gems,
    });
    return player;
  });

  // Get player's card collection
  app.get('/api/players/me/cards', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { id: string };
    return db.select().from(playerCards).where(eq(playerCards.playerId, user.id));
  });

  // Get battle history
  app.get('/api/battles/history', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { id: string };
    const query = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) }).parse(request.query);
    return db.select().from(battles)
      .where(or(eq(battles.player1Id, user.id), eq(battles.player2Id, user.id)))
      .orderBy(desc(battles.startedAt))
      .limit(query.limit);
  });
}
