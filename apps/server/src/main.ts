import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { cardRoutes } from './routes/cards.js';
import { deckRoutes } from './routes/decks.js';
import { playerRoutes } from './routes/players.js';
import { setupWebSocket } from './ws/handler.js';

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, { origin: config.corsOrigin });
await app.register(jwt, { secret: config.jwtSecret });

// Error handler for zod validation
app.setErrorHandler((error, request, reply) => {
  if (error.name === 'ZodError') {
    return reply.code(400).send({ error: 'Validation error', details: (error as any).issues });
  }
  app.log.error(error);
  reply.code(error.statusCode ?? 500).send({ error: error.message });
});

// REST Routes
await app.register(authRoutes);
await app.register(cardRoutes);
await app.register(deckRoutes);
await app.register(playerRoutes);

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// WebSocket
setupWebSocket(app);

// Start
try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Server running on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
