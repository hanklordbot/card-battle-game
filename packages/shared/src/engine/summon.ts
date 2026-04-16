import { Card, MonsterCard, FieldCard, Position, CardType, CardSubType, isMonster, isFusionMonster, getTributeCount } from '../models/card';
import { DuelState, Phase, MONSTER_ZONE_SIZE } from './duel';

export enum SummonError {
  NotMainPhase = 'not_main_phase',
  NotMonster = 'not_monster',
  NormalSummonUsed = 'normal_summon_already_used',
  NotEnoughTributes = 'not_enough_tributes',
  MonsterZoneFull = 'monster_zone_full',
  CardNotInHand = 'card_not_in_hand',
  CannotFlipSummon = 'cannot_flip_summon',
  InvalidTributeIndex = 'invalid_tribute_index',
  FusionCannotNormalSummon = 'fusion_cannot_normal_summon',
}

export type SummonResult = { success: true } | { success: false; error: SummonError };

function isMainPhase(phase: Phase): boolean {
  return phase === Phase.Main1 || phase === Phase.Main2;
}

function findEmptyMonsterZone(state: DuelState, playerIndex: 0 | 1): number {
  return state.players[playerIndex].monsterZone.findIndex(s => s === null);
}

/**
 * Normal summon a monster from hand.
 * For level 5-6: requires 1 tribute index. For level 7+: requires 2 tribute indices.
 */
export function normalSummon(
  state: DuelState,
  playerIndex: 0 | 1,
  handIndex: number,
  position: Position.FaceUpAttack | Position.FaceDownDefense,
  tributeIndices: number[] = [],
): SummonResult {
  if (!isMainPhase(state.phase)) return { success: false, error: SummonError.NotMainPhase };

  const player = state.players[playerIndex];
  if (player.normalSummonUsed) return { success: false, error: SummonError.NormalSummonUsed };
  if (handIndex < 0 || handIndex >= player.hand.length) return { success: false, error: SummonError.CardNotInHand };

  const card = player.hand[handIndex];
  if (!isMonster(card)) return { success: false, error: SummonError.NotMonster };
  if (isFusionMonster(card)) return { success: false, error: SummonError.FusionCannotNormalSummon };

  const monster = card as MonsterCard;
  const requiredTributes = getTributeCount(monster.level);

  // Validate tributes
  if (tributeIndices.length < requiredTributes) return { success: false, error: SummonError.NotEnoughTributes };

  // Validate tribute indices
  for (const idx of tributeIndices) {
    if (idx < 0 || idx >= MONSTER_ZONE_SIZE || !player.monsterZone[idx]) {
      return { success: false, error: SummonError.InvalidTributeIndex };
    }
  }

  // Check for duplicates in tribute indices
  if (new Set(tributeIndices).size !== tributeIndices.length) {
    return { success: false, error: SummonError.InvalidTributeIndex };
  }

  // Send tributes to graveyard
  for (const idx of tributeIndices) {
    player.graveyard.push(player.monsterZone[idx]!.card);
    player.monsterZone[idx] = null;
  }

  // Find empty zone (tribute may have freed a slot)
  const zoneIndex = findEmptyMonsterZone(state, playerIndex);
  if (zoneIndex === -1) return { success: false, error: SummonError.MonsterZoneFull };

  // Remove from hand
  player.hand.splice(handIndex, 1);

  // Place on field
  player.monsterZone[zoneIndex] = {
    card: monster,
    position,
    canAttack: position === Position.FaceUpAttack,
    canChangePosition: false, // cannot change position the turn it's summoned
    turnPlaced: state.turnCount,
    hasAttackedThisTurn: false,
  };

  player.normalSummonUsed = true;
  return { success: true };
}

/**
 * Set a monster face-down in defense position (counts as normal summon).
 */
export function setMonster(
  state: DuelState,
  playerIndex: 0 | 1,
  handIndex: number,
  tributeIndices: number[] = [],
): SummonResult {
  return normalSummon(state, playerIndex, handIndex, Position.FaceDownDefense, tributeIndices);
}

/**
 * Special summon a monster to the field (does not consume normal summon).
 */
export function specialSummon(
  state: DuelState,
  playerIndex: 0 | 1,
  card: MonsterCard,
  position: Position.FaceUpAttack | Position.FaceUpDefense,
  source: 'hand' | 'deck' | 'graveyard' | 'banished' | 'extra',
): SummonResult {
  const player = state.players[playerIndex];
  const zoneIndex = findEmptyMonsterZone(state, playerIndex);
  if (zoneIndex === -1) return { success: false, error: SummonError.MonsterZoneFull };

  // Remove card from source
  let sourceArray: Card[];
  switch (source) {
    case 'hand': sourceArray = player.hand; break;
    case 'deck': sourceArray = player.deck; break;
    case 'graveyard': sourceArray = player.graveyard; break;
    case 'banished': sourceArray = player.banished; break;
    case 'extra': sourceArray = player.extraDeck; break;
  }

  const idx = sourceArray.findIndex(c => c.id === card.id);
  if (idx === -1) return { success: false, error: SummonError.CardNotInHand };
  sourceArray.splice(idx, 1);

  player.monsterZone[zoneIndex] = {
    card,
    position,
    canAttack: false, // special summoned monsters typically can't attack the turn they're summoned (depends on game rules)
    canChangePosition: false,
    turnPlaced: state.turnCount,
    hasAttackedThisTurn: false,
  };

  return { success: true };
}

/**
 * Flip summon: flip a face-down defense monster to face-up attack.
 * Cannot flip summon a monster the same turn it was set.
 */
export function flipSummon(
  state: DuelState,
  playerIndex: 0 | 1,
  zoneIndex: number,
): SummonResult {
  if (!isMainPhase(state.phase)) return { success: false, error: SummonError.NotMainPhase };

  const player = state.players[playerIndex];
  const slot = player.monsterZone[zoneIndex];

  if (!slot) return { success: false, error: SummonError.CannotFlipSummon };
  if (slot.position !== Position.FaceDownDefense) return { success: false, error: SummonError.CannotFlipSummon };
  if (slot.turnPlaced === state.turnCount) return { success: false, error: SummonError.CannotFlipSummon };

  slot.position = Position.FaceUpAttack;
  slot.canAttack = true;

  return { success: true };
}
