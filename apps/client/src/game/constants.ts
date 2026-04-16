import { Phase } from '../core/duel';
import { Card, CardType, CardSubType, MonsterCard, isMonster, Attribute } from '../core/card';

// Colors from art spec
export const COLORS = {
  fieldBg: '#1A1A2E',
  fieldGrid: '#16213E',
  slotFill: '#0F3460',
  myAccent: '#00D4FF',
  oppAccent: '#FF4444',
  lpText: '#FFFFFF',
  phaseActive: '#FFD43B',
  phaseInactive: '#495057',
  btnPrimary: '#E94560',
  btnSecondary: '#533483',
  canSummon: '#00FF88',
  canAttack: '#FF6B6B',
  canTarget: '#BB86FC',
  textPrimary: '#E0E0E0',
  textSecondary: '#868E96',
  separator: '#00D4FF',
};

export const PHASE_LABELS: Record<Phase, string> = {
  [Phase.Draw]: 'DP',
  [Phase.Standby]: 'SP',
  [Phase.Main1]: 'MP1',
  [Phase.Battle]: 'BP',
  [Phase.Main2]: 'MP2',
  [Phase.End]: 'EP',
};

export const PHASE_ORDER: Phase[] = [Phase.Draw, Phase.Standby, Phase.Main1, Phase.Battle, Phase.Main2, Phase.End];

// Card frame colors by subtype
export function getCardFrameColor(card: Card): string {
  switch (card.cardSubType) {
    case CardSubType.NormalMonster: return '#C4A43C'; // yellow
    case CardSubType.EffectMonster: return '#C47030'; // orange
    case CardSubType.FusionMonster: return '#8040A0'; // purple
    case CardSubType.NormalSpell:
    case CardSubType.QuickSpell:
    case CardSubType.ContinuousSpell:
    case CardSubType.EquipSpell:
    case CardSubType.FieldSpell: return '#2E8B57'; // green
    case CardSubType.NormalTrap:
    case CardSubType.ContinuousTrap:
    case CardSubType.CounterTrap: return '#8B2252'; // magenta
    default: return '#666';
  }
}

export function getAttributeColor(attr: Attribute): string {
  switch (attr) {
    case Attribute.Light: return '#FFD700';
    case Attribute.Dark: return '#8B00FF';
    case Attribute.Fire: return '#FF4500';
    case Attribute.Water: return '#1E90FF';
    case Attribute.Wind: return '#32CD32';
    case Attribute.Earth: return '#8B4513';
    case Attribute.Divine: return '#FFD700';
  }
}

export function getCardTypeLabel(card: Card): string {
  if (isMonster(card)) {
    const m = card as MonsterCard;
    return `${'★'.repeat(m.level)} ${m.attribute} ${m.monsterType}`;
  }
  switch (card.cardSubType) {
    case CardSubType.NormalSpell: return '通常魔法';
    case CardSubType.QuickSpell: return '速攻魔法';
    case CardSubType.ContinuousSpell: return '永續魔法';
    case CardSubType.EquipSpell: return '裝備魔法';
    case CardSubType.FieldSpell: return '場地魔法';
    case CardSubType.NormalTrap: return '通常陷阱';
    case CardSubType.ContinuousTrap: return '永續陷阱';
    case CardSubType.CounterTrap: return '反擊陷阱';
    default: return '';
  }
}
