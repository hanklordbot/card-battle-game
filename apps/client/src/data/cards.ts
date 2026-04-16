import { MonsterCard, SpellCard, TrapCard, CardType, CardSubType, Attribute, Rarity, LimitStatus, Card } from '../core/card';

// === Test Monster Cards ===
const monsters: MonsterCard[] = [
  { id: 'MON-001', name: '暗黑戰士', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Dark, monsterType: '戰士族', level: 4, atk: 1800, def: 1200, effectDescription: '', effectScripts: [], rarity: Rarity.R, artworkId: 'mon001', limitStatus: LimitStatus.Unlimited, flavorText: '暗黑中的戰士，以強大的力量戰鬥。' },
  { id: 'MON-002', name: '火焰龍', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Fire, monsterType: '龍族', level: 4, atk: 1700, def: 1000, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon002', limitStatus: LimitStatus.Unlimited, flavorText: '噴射烈焰的小型龍。' },
  { id: 'MON-003', name: '光之天使', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Light, monsterType: '天使族', level: 4, atk: 1600, def: 1400, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon003', limitStatus: LimitStatus.Unlimited, flavorText: '守護光明的天使。' },
  { id: 'MON-004', name: '鋼鐵巨人', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Earth, monsterType: '機械族', level: 4, atk: 1500, def: 1800, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon004', limitStatus: LimitStatus.Unlimited, flavorText: '堅不可摧的鋼鐵巨人。' },
  { id: 'MON-005', name: '風之精靈', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Wind, monsterType: '魔法使族', level: 3, atk: 1200, def: 1000, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon005', limitStatus: LimitStatus.Unlimited, flavorText: '操控風之力的精靈。' },
  { id: 'MON-006', name: '水之守護者', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Water, monsterType: '水族', level: 4, atk: 1400, def: 1700, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon006', limitStatus: LimitStatus.Unlimited, flavorText: '守護水域的戰士。' },
  { id: 'MON-007', name: '暗黑魔術師', cardType: CardType.Monster, cardSubType: CardSubType.EffectMonster, attribute: Attribute.Dark, monsterType: '魔法使族', level: 7, atk: 2500, def: 2100, effectDescription: '此卡召喚成功時，可以從牌組抽1張牌。', effectScripts: ['EFF-001'], rarity: Rarity.UR, artworkId: 'mon007', limitStatus: LimitStatus.Unlimited },
  { id: 'MON-008', name: '青眼白龍', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Light, monsterType: '龍族', level: 8, atk: 3000, def: 2500, effectDescription: '', effectScripts: [], rarity: Rarity.UR, artworkId: 'mon008', limitStatus: LimitStatus.Unlimited, flavorText: '傳說中的白龍，擁有毀滅一切的力量。' },
  { id: 'MON-009', name: '小妖精', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Earth, monsterType: '獸族', level: 2, atk: 800, def: 600, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon009', limitStatus: LimitStatus.Unlimited, flavorText: '森林中的小妖精。' },
  { id: 'MON-010', name: '雷電鳥', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Wind, monsterType: '鳥獸族', level: 4, atk: 1600, def: 1200, effectDescription: '', effectScripts: [], rarity: Rarity.R, artworkId: 'mon010', limitStatus: LimitStatus.Unlimited, flavorText: '帶著雷電飛翔的猛禽。' },
  { id: 'MON-011', name: '岩石巨兵', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Earth, monsterType: '岩石族', level: 3, atk: 1000, def: 1800, effectDescription: '', effectScripts: [], rarity: Rarity.N, artworkId: 'mon011', limitStatus: LimitStatus.Unlimited, flavorText: '堅硬如岩石的守衛。' },
  { id: 'MON-012', name: '炎之劍士', cardType: CardType.Monster, cardSubType: CardSubType.NormalMonster, attribute: Attribute.Fire, monsterType: '戰士族', level: 5, atk: 2100, def: 1600, effectDescription: '', effectScripts: [], rarity: Rarity.SR, artworkId: 'mon012', limitStatus: LimitStatus.Unlimited, flavorText: '揮舞火焰之劍的勇者。' },
];

const spells: SpellCard[] = [
  { id: 'SPL-001', name: '力量增幅', cardType: CardType.Spell, cardSubType: CardSubType.NormalSpell, effectDescription: '選擇場上1隻怪獸，該怪獸攻擊力上升500。', effectScripts: [], rarity: Rarity.N, artworkId: 'spl001', limitStatus: LimitStatus.Unlimited },
  { id: 'SPL-002', name: '生命恢復', cardType: CardType.Spell, cardSubType: CardSubType.NormalSpell, effectDescription: '回復1000點生命值。', effectScripts: [], rarity: Rarity.N, artworkId: 'spl002', limitStatus: LimitStatus.Unlimited },
];

const traps: TrapCard[] = [
  { id: 'TRP-001', name: '防護壁壘', cardType: CardType.Trap, cardSubType: CardSubType.NormalTrap, effectDescription: '對方怪獸攻擊時，無效化該次攻擊。', effectScripts: [], rarity: Rarity.R, artworkId: 'trp001', limitStatus: LimitStatus.Unlimited },
];

export const ALL_CARDS: Card[] = [...monsters, ...spells, ...traps];
export const CARD_MAP = new Map(ALL_CARDS.map(c => [c.id, c]));

/** Build a 40-card test deck (just monster cards for simplicity) */
export function buildTestDeck(): Card[] {
  const deck: Card[] = [];
  // 3 copies of each level 4 or lower monster, fill to 40
  const lowLevel = monsters.filter(m => m.level <= 4);
  for (const m of lowLevel) {
    for (let i = 0; i < 3; i++) deck.push({ ...m });
  }
  // Add some level 5+ and spells/traps to fill
  deck.push({ ...monsters[11] }); // 炎之劍士 x2
  deck.push({ ...monsters[11] });
  deck.push({ ...spells[0] });
  deck.push({ ...spells[0] });
  deck.push({ ...spells[1] });
  deck.push({ ...traps[0] });
  deck.push({ ...traps[0] });
  // Trim or pad to exactly 40
  while (deck.length > 40) deck.pop();
  while (deck.length < 40) deck.push({ ...monsters[4] }); // pad with 風之精靈
  return deck;
}
