import { Card, CardSubType, LimitStatus, isFusionMonster } from './card';

// === Constants ===

export const MAIN_DECK_MIN = 40;
export const MAIN_DECK_MAX = 60;
export const EXTRA_DECK_MAX = 15;
export const SIDE_DECK_MAX = 15;
export const DEFAULT_COPY_LIMIT = 3;

// === Validation Result ===

export interface DeckValidationError {
  code: string;
  message: string;
  cardId?: string;
}

export interface DeckValidationResult {
  valid: boolean;
  errors: DeckValidationError[];
}

export interface DeckInput {
  mainDeck: Card[];
  extraDeck: Card[];
  sideDeck: Card[];
}

// === Card Database (for existence check) ===

export type CardDatabase = Map<string, Card>;

// === Validation ===

export function validateDeck(deck: DeckInput, cardDb?: CardDatabase): DeckValidationResult {
  const errors: DeckValidationError[] = [];

  // 1. Main deck size
  if (deck.mainDeck.length < MAIN_DECK_MIN || deck.mainDeck.length > MAIN_DECK_MAX) {
    errors.push({ code: 'MAIN_DECK_SIZE', message: `主牌組張數必須在 ${MAIN_DECK_MIN}-${MAIN_DECK_MAX} 之間，目前 ${deck.mainDeck.length} 張` });
  }

  // 2. Extra deck size
  if (deck.extraDeck.length > EXTRA_DECK_MAX) {
    errors.push({ code: 'EXTRA_DECK_SIZE', message: `額外牌組上限 ${EXTRA_DECK_MAX} 張，目前 ${deck.extraDeck.length} 張` });
  }

  // 3. Side deck size
  if (deck.sideDeck.length > SIDE_DECK_MAX) {
    errors.push({ code: 'SIDE_DECK_SIZE', message: `副牌組上限 ${SIDE_DECK_MAX} 張，目前 ${deck.sideDeck.length} 張` });
  }

  // 4. Fusion monsters must be in extra deck only
  for (const card of deck.mainDeck) {
    if (isFusionMonster(card)) {
      errors.push({ code: 'FUSION_IN_MAIN', message: `融合怪獸「${card.name}」不可放入主牌組`, cardId: card.id });
    }
  }
  for (const card of deck.sideDeck) {
    if (isFusionMonster(card)) {
      errors.push({ code: 'FUSION_IN_SIDE', message: `融合怪獸「${card.name}」不可放入副牌組`, cardId: card.id });
    }
  }

  // 5. Count copies across all decks (main + extra + side)
  const allCards = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck];
  const countById = new Map<string, { count: number; card: Card }>();
  for (const card of allCards) {
    const entry = countById.get(card.id);
    if (entry) {
      entry.count++;
    } else {
      countById.set(card.id, { count: 1, card });
    }
  }

  for (const [id, { count, card }] of countById) {
    // 6. Forbidden cards
    if (card.limitStatus === LimitStatus.Forbidden) {
      errors.push({ code: 'FORBIDDEN', message: `「${card.name}」為禁止卡，不可放入牌組`, cardId: id });
      continue;
    }

    // 7. Copy limits based on limit status
    let maxCopies = DEFAULT_COPY_LIMIT;
    if (card.limitStatus === LimitStatus.Limited) maxCopies = 1;
    else if (card.limitStatus === LimitStatus.SemiLimited) maxCopies = 2;

    if (count > maxCopies) {
      errors.push({ code: 'COPY_LIMIT', message: `「${card.name}」上限 ${maxCopies} 張，目前 ${count} 張`, cardId: id });
    }
  }

  // 8. Card existence check (if database provided)
  if (cardDb) {
    for (const card of allCards) {
      if (!cardDb.has(card.id)) {
        errors.push({ code: 'CARD_NOT_FOUND', message: `卡片 ID「${card.id}」不存在於卡片資料庫`, cardId: card.id });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
