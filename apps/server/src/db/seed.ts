import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { config } from '../config.js';
import { cards } from './schema.js';

const client = postgres(config.databaseUrl, { max: 1 });
const db = drizzle(client);

const sampleCards = [
  { id: 'MON-001', name: '暗黑魔術師', cardType: 'monster', cardSubType: 'effect_monster', attribute: '闇', monsterType: '魔法使族', level: 7, atk: 2500, def: 2100, effectDescription: '此卡召喚成功時，可從牌組抽1張牌。', rarity: 'UR', artworkId: 'art-mon-001', limitStatus: 'unlimited' },
  { id: 'MON-002', name: '青眼白龍', cardType: 'monster', cardSubType: 'normal_monster', attribute: '光', monsterType: '龍族', level: 8, atk: 3000, def: 2500, effectDescription: '', rarity: 'UR', artworkId: 'art-mon-002', flavorText: '以強大的攻擊力自豪的傳說之龍。', limitStatus: 'unlimited' },
  { id: 'MON-003', name: '火焰劍士', cardType: 'monster', cardSubType: 'normal_monster', attribute: '火', monsterType: '戰士族', level: 4, atk: 1800, def: 1600, effectDescription: '', rarity: 'R', artworkId: 'art-mon-003', flavorText: '揮舞火焰之劍的勇猛戰士。', limitStatus: 'unlimited' },
  { id: 'MON-004', name: '翻轉守衛', cardType: 'monster', cardSubType: 'effect_monster', attribute: '地', monsterType: '岩石族', level: 3, atk: 800, def: 1400, effectDescription: '翻轉：破壞對方場上1張魔法/陷阱卡。', rarity: 'R', artworkId: 'art-mon-004', limitStatus: 'unlimited' },
  { id: 'MON-005', name: '精靈弓手', cardType: 'monster', cardSubType: 'effect_monster', attribute: '風', monsterType: '天使族', level: 4, atk: 1400, def: 1200, effectDescription: '此卡在場上時，我方所有怪獸攻擊力上升300。', rarity: 'SR', artworkId: 'art-mon-005', limitStatus: 'unlimited' },
  { id: 'MON-006', name: '水晶龍', cardType: 'monster', cardSubType: 'effect_monster', attribute: '水', monsterType: '龍族', level: 6, atk: 2200, def: 1800, effectDescription: '此卡被破壞時，從墓地特殊召喚1隻4星以下怪獸。', rarity: 'SR', artworkId: 'art-mon-006', limitStatus: 'unlimited' },
  { id: 'MON-007', name: '鋼鐵巨人', cardType: 'monster', cardSubType: 'normal_monster', attribute: '地', monsterType: '機械族', level: 4, atk: 1600, def: 1900, effectDescription: '', rarity: 'N', artworkId: 'art-mon-007', flavorText: '以鋼鐵之軀守護同伴的巨人。', limitStatus: 'unlimited' },
  { id: 'MON-008', name: '暗影刺客', cardType: 'monster', cardSubType: 'effect_monster', attribute: '闇', monsterType: '惡魔族', level: 4, atk: 1700, def: 1000, effectDescription: '一回合一次，可破壞場上1張卡。', rarity: 'SR', artworkId: 'art-mon-008', limitStatus: 'semi_limited' },
  { id: 'MON-009', name: '光之守護者', cardType: 'monster', cardSubType: 'normal_monster', attribute: '光', monsterType: '天使族', level: 4, atk: 1500, def: 1800, effectDescription: '', rarity: 'N', artworkId: 'art-mon-009', flavorText: '以光之力守護世界的天使。', limitStatus: 'unlimited' },
  { id: 'MON-010', name: '炎龍王', cardType: 'monster', cardSubType: 'fusion_monster', attribute: '火', monsterType: '龍族', level: 9, atk: 3200, def: 2800, effectDescription: '「火焰劍士」+「水晶龍」。融合召喚成功時，破壞對方場上所有魔法/陷阱卡。', rarity: 'UR', artworkId: 'art-mon-010', limitStatus: 'unlimited' },
  { id: 'SPL-001', name: '融合', cardType: 'spell', cardSubType: 'normal_spell', effectDescription: '選擇融合素材，從額外牌組融合召喚1隻融合怪獸。', rarity: 'R', artworkId: 'art-spl-001', limitStatus: 'unlimited' },
  { id: 'SPL-002', name: '強欲之壺', cardType: 'spell', cardSubType: 'normal_spell', effectDescription: '從牌組抽2張牌。', rarity: 'SR', artworkId: 'art-spl-002', limitStatus: 'limited' },
  { id: 'SPL-003', name: '旋風', cardType: 'spell', cardSubType: 'quick_spell', effectDescription: '破壞場上1張魔法/陷阱卡。', rarity: 'R', artworkId: 'art-spl-003', limitStatus: 'unlimited' },
  { id: 'SPL-004', name: '戰士之力', cardType: 'spell', cardSubType: 'equip_spell', effectDescription: '裝備怪獸攻擊力上升700，防禦力下降200。', rarity: 'N', artworkId: 'art-spl-004', limitStatus: 'unlimited' },
  { id: 'SPL-005', name: '光之結界', cardType: 'spell', cardSubType: 'field_spell', effectDescription: '光屬性怪獸攻擊力上升500。闇屬性怪獸攻擊力下降400。', rarity: 'R', artworkId: 'art-spl-005', limitStatus: 'unlimited' },
  { id: 'SPL-006', name: '永續增幅', cardType: 'spell', cardSubType: 'continuous_spell', effectDescription: '每回合準備階段，我方所有怪獸攻擊力上升200。', rarity: 'SR', artworkId: 'art-spl-006', limitStatus: 'unlimited' },
  { id: 'TRP-001', name: '奈落的落穴', cardType: 'trap', cardSubType: 'normal_trap', effectDescription: '對方召喚/特殊召喚攻擊力1500以上的怪獸時，破壞並除外該怪獸。', rarity: 'SR', artworkId: 'art-trp-001', limitStatus: 'unlimited' },
  { id: 'TRP-002', name: '神聖防護罩', cardType: 'trap', cardSubType: 'counter_trap', effectDescription: '無效化魔法/陷阱卡的發動並破壞。', rarity: 'UR', artworkId: 'art-trp-002', limitStatus: 'semi_limited' },
  { id: 'TRP-003', name: '鏡像力量', cardType: 'trap', cardSubType: 'normal_trap', effectDescription: '對方怪獸宣告攻擊時，破壞對方所有攻擊表示怪獸。', rarity: 'SR', artworkId: 'art-trp-003', limitStatus: 'unlimited' },
  { id: 'TRP-004', name: '持續防禦', cardType: 'trap', cardSubType: 'continuous_trap', effectDescription: '我方所有怪獸防禦力上升500。', rarity: 'R', artworkId: 'art-trp-004', limitStatus: 'unlimited' },
];

async function main() {
  console.log('Seeding cards...');
  for (const card of sampleCards) {
    await db.insert(cards).values(card as any).onConflictDoNothing();
  }
  console.log(`Seeded ${sampleCards.length} cards.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
