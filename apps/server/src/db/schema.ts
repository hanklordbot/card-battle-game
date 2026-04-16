import { pgTable, uuid, varchar, smallint, integer, text, jsonb, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

// === Players ===
export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 30 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 30 }).notNull(),
  eloRating: integer('elo_rating').default(1000).notNull(),
  coins: integer('coins').default(1000).notNull(),
  gems: integer('gems').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
});

// === Cards ===
export const cards = pgTable('cards', {
  id: varchar('id', { length: 16 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  cardType: varchar('card_type', { length: 10 }).notNull(),
  cardSubType: varchar('card_sub_type', { length: 20 }).notNull(),
  attribute: varchar('attribute', { length: 4 }),
  monsterType: varchar('monster_type', { length: 20 }),
  level: smallint('level'),
  atk: smallint('atk'),
  def: smallint('def'),
  effectDescription: text('effect_description'),
  effectScripts: jsonb('effect_scripts').default([]),
  rarity: varchar('rarity', { length: 2 }).notNull(),
  artworkId: varchar('artwork_id', { length: 50 }).notNull(),
  flavorText: text('flavor_text'),
  limitStatus: varchar('limit_status', { length: 14 }).default('unlimited').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_cards_type').on(table.cardType),
  index('idx_cards_rarity').on(table.rarity),
]);

// === Player Cards (collection) ===
export const playerCards = pgTable('player_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull().references(() => players.id),
  cardId: varchar('card_id', { length: 16 }).notNull().references(() => cards.id),
  quantity: smallint('quantity').default(1).notNull(),
  obtainedAt: timestamp('obtained_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_player_cards_unique').on(table.playerId, table.cardId),
  index('idx_player_cards_player').on(table.playerId),
]);

// === Decks ===
export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull().references(() => players.id),
  name: varchar('name', { length: 50 }).notNull(),
  mainDeck: jsonb('main_deck').notNull().$type<string[]>(),
  extraDeck: jsonb('extra_deck').default([]).$type<string[]>(),
  sideDeck: jsonb('side_deck').default([]).$type<string[]>(),
  isValid: boolean('is_valid').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_decks_player').on(table.playerId),
]);

// === Battles ===
export const battles = pgTable('battles', {
  id: uuid('id').primaryKey().defaultRandom(),
  mode: varchar('mode', { length: 10 }).notNull(),
  player1Id: uuid('player1_id').notNull().references(() => players.id),
  player2Id: uuid('player2_id').references(() => players.id),
  winnerId: uuid('winner_id').references(() => players.id),
  resultReason: varchar('result_reason', { length: 20 }),
  player1EloBefore: integer('player1_elo_before'),
  player1EloAfter: integer('player1_elo_after'),
  player2EloBefore: integer('player2_elo_before'),
  player2EloAfter: integer('player2_elo_after'),
  turnCount: smallint('turn_count'),
  durationSec: integer('duration_sec'),
  replayData: jsonb('replay_data'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (table) => [
  index('idx_battles_player1').on(table.player1Id),
  index('idx_battles_player2').on(table.player2Id),
]);
