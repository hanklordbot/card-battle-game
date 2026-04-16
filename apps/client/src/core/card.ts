// === Enums ===

export enum CardType {
  Monster = 'monster',
  Spell = 'spell',
  Trap = 'trap',
}

export enum CardSubType {
  // Monster
  NormalMonster = 'normal_monster',
  EffectMonster = 'effect_monster',
  FusionMonster = 'fusion_monster',
  // Spell
  NormalSpell = 'normal_spell',
  QuickSpell = 'quick_spell',
  ContinuousSpell = 'continuous_spell',
  EquipSpell = 'equip_spell',
  FieldSpell = 'field_spell',
  // Trap
  NormalTrap = 'normal_trap',
  ContinuousTrap = 'continuous_trap',
  CounterTrap = 'counter_trap',
}

export enum Attribute {
  Light = '光',
  Dark = '闇',
  Fire = '火',
  Water = '水',
  Wind = '風',
  Earth = '地',
  Divine = '神',
}

export enum Rarity {
  N = 'N',
  R = 'R',
  SR = 'SR',
  UR = 'UR',
}

export enum LimitStatus {
  Unlimited = 'unlimited',
  SemiLimited = 'semi_limited',
  Limited = 'limited',
  Forbidden = 'forbidden',
}

export enum MonsterEffectType {
  Flip = 'flip',
  Summon = 'summon',
  Continuous = 'continuous',
  Ignition = 'ignition',
  Trigger = 'trigger',
}

export enum SpellSpeed {
  Speed1 = 1,
  Speed2 = 2,
  Speed3 = 3,
}

// === Card Interfaces ===

export interface CardBase {
  id: string;
  name: string;
  cardType: CardType;
  cardSubType: CardSubType;
  effectDescription: string;
  effectScripts: string[];
  rarity: Rarity;
  artworkId: string;
  limitStatus: LimitStatus;
}

export interface MonsterCard extends CardBase {
  cardType: CardType.Monster;
  cardSubType: CardSubType.NormalMonster | CardSubType.EffectMonster | CardSubType.FusionMonster;
  attribute: Attribute;
  monsterType: string;
  level: number; // 1-12
  atk: number;
  def: number;
  flavorText?: string; // normal monsters only
}

export interface SpellCard extends CardBase {
  cardType: CardType.Spell;
  cardSubType: CardSubType.NormalSpell | CardSubType.QuickSpell | CardSubType.ContinuousSpell | CardSubType.EquipSpell | CardSubType.FieldSpell;
}

export interface TrapCard extends CardBase {
  cardType: CardType.Trap;
  cardSubType: CardSubType.NormalTrap | CardSubType.ContinuousTrap | CardSubType.CounterTrap;
}

export type Card = MonsterCard | SpellCard | TrapCard;

// === Position / State on Field ===

export enum Position {
  FaceUpAttack = 'face_up_attack',
  FaceUpDefense = 'face_up_defense',
  FaceDownDefense = 'face_down_defense',
}

export interface FieldCard {
  card: Card;
  position: Position;
  canAttack: boolean;
  canChangePosition: boolean;
  turnPlaced: number; // the turn number when placed
  hasAttackedThisTurn: boolean;
}

// === Helpers ===

export function isMonster(card: Card): card is MonsterCard {
  return card.cardType === CardType.Monster;
}

export function isSpell(card: Card): card is SpellCard {
  return card.cardType === CardType.Spell;
}

export function isTrap(card: Card): card is TrapCard {
  return card.cardType === CardType.Trap;
}

export function isFusionMonster(card: Card): card is MonsterCard {
  return card.cardSubType === CardSubType.FusionMonster;
}

export function getSpellSpeed(card: Card): SpellSpeed {
  switch (card.cardSubType) {
    case CardSubType.QuickSpell:
    case CardSubType.NormalTrap:
    case CardSubType.ContinuousTrap:
      return SpellSpeed.Speed2;
    case CardSubType.CounterTrap:
      return SpellSpeed.Speed3;
    default:
      return SpellSpeed.Speed1;
  }
}

export function getTributeCount(level: number): number {
  if (level <= 4) return 0;
  if (level <= 6) return 1;
  return 2;
}
