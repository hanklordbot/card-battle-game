import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { decks } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authGuard } from '../middleware/auth.js';

const createDeckSchema = z.object({
  name: z.string().min(1).max(50),
  mainDeck: z.array(z.string()).min(40).max(60),
  extraDeck: z.array(z.string()).max(15).default([]),
  sideDeck: z.array(z.string()).max(15).default([]),
});

const updateDeckSchema = createDeckSchema.partial();

export async function deckRoutes(app: FastifyInstance) {
  // List player's decks
  app.get('/api/decks', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { id: string };
    return db.select().from(decks).where(eq(decks.playerId, user.id));
  });

  // Create deck
  app.post('/api/decks', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { id: string };
    const body = createDeckSchema.parse(request.body);
    const [deck] = await db.insert(decks).values({ playerId: user.id, ...body }).returning();
    return deck;
  });

  // Get single deck
  app.get('/api/decks/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };
    const [deck] = await db.select().from(decks).where(and(eq(decks.id, id), eq(decks.playerId, user.id))).limit(1);
    if (!deck) return reply.code(404).send({ error: 'Deck not found' });
    return deck;
  });

  // Update deck
  app.put('/api/decks/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };
    const body = updateDeckSchema.parse(request.body);
    const [deck] = await db.update(decks).set({ ...body, updatedAt: new Date() }).where(and(eq(decks.id, id), eq(decks.playerId, user.id))).returning();
    if (!deck) return reply.code(404).send({ error: 'Deck not found' });
    return deck;
  });

  // Delete deck
  app.delete('/api/decks/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };
    const [deck] = await db.delete(decks).where(and(eq(decks.id, id), eq(decks.playerId, user.id))).returning();
    if (!deck) return reply.code(404).send({ error: 'Deck not found' });
    return { success: true };
  });

  // Validate deck
  app.post('/api/decks/:id/validate', { preHandler: [authGuard] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };
    const [deck] = await db.select().from(decks).where(and(eq(decks.id, id), eq(decks.playerId, user.id))).limit(1);
    if (!deck) return reply.code(404).send({ error: 'Deck not found' });

    const errors: string[] = [];
    const mainDeck = deck.mainDeck as string[];
    const extraDeck = (deck.extraDeck ?? []) as string[];
    const sideDeck = (deck.sideDeck ?? []) as string[];

    if (mainDeck.length < 40 || mainDeck.length > 60) errors.push(`主牌組張數必須在 40-60 之間，目前 ${mainDeck.length} 張`);
    if (extraDeck.length > 15) errors.push(`額外牌組上限 15 張，目前 ${extraDeck.length} 張`);
    if (sideDeck.length > 15) errors.push(`副牌組上限 15 張，目前 ${sideDeck.length} 張`);

    const isValid = errors.length === 0;
    await db.update(decks).set({ isValid }).where(eq(decks.id, id));
    return { valid: isValid, errors };
  });
}
