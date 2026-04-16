import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { players } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
  displayName: z.string().min(1).max(30),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await db.select().from(players).where(eq(players.username, body.username)).limit(1);
    if (existing.length > 0) return reply.code(409).send({ error: 'Username already exists' });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const [player] = await db.insert(players).values({
      username: body.username,
      passwordHash,
      displayName: body.displayName,
    }).returning();

    const token = app.jwt.sign({ id: player.id, username: player.username });
    return { token, player: { id: player.id, username: player.username, displayName: player.displayName, eloRating: player.eloRating, coins: player.coins, gems: player.gems } };
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const [player] = await db.select().from(players).where(eq(players.username, body.username)).limit(1);
    if (!player) return reply.code(401).send({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(body.password, player.passwordHash);
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });

    await db.update(players).set({ lastLogin: new Date() }).where(eq(players.id, player.id));
    const token = app.jwt.sign({ id: player.id, username: player.username });
    return { token, player: { id: player.id, username: player.username, displayName: player.displayName, eloRating: player.eloRating, coins: player.coins, gems: player.gems } };
  });
}
