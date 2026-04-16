import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { cards } from '../db/schema.js';
import { eq, like, sql } from 'drizzle-orm';
import { authGuard } from '../middleware/auth.js';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cardType: z.string().optional(),
  rarity: z.string().optional(),
  search: z.string().optional(),
});

export async function cardRoutes(app: FastifyInstance) {
  app.get('/api/cards', { preHandler: [authGuard] }, async (request) => {
    const query = querySchema.parse(request.query);
    const offset = (query.page - 1) * query.limit;

    let where = sql`1=1`;
    if (query.cardType) where = sql`${where} AND ${cards.cardType} = ${query.cardType}`;
    if (query.rarity) where = sql`${where} AND ${cards.rarity} = ${query.rarity}`;
    if (query.search) where = sql`${where} AND ${cards.name} ILIKE ${'%' + query.search + '%'}`;

    const [data, countResult] = await Promise.all([
      db.select().from(cards).where(where).limit(query.limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(cards).where(where),
    ]);

    return { data, total: countResult[0].count, page: query.page, limit: query.limit };
  });

  app.get('/api/cards/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    if (!card) return reply.code(404).send({ error: 'Card not found' });
    return card;
  });
}
