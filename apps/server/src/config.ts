export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/card_game',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  reconnectTimeout: 120_000, // 120 seconds
  matchmakingInterval: 3_000, // 3 seconds
  turnTimeLimit: 180_000, // 180 seconds
  chainResponseTime: 15_000, // 15 seconds
  heartbeatInterval: 30_000, // 30 seconds
};
