/**
 * Card ID mapping: our game card ID → YGOProDeck card ID.
 * YGOProDeck image URL: https://images.ygoprodeck.com/images/cards_small/{ygoproId}.jpg
 *
 * Source: 遊戲企劃 card-ygopro-mapping.json (20 cards, API verified)
 */

export const CARD_IMAGE_MAP: Record<string, number> = {
  // Monsters (10)
  'MON-001': 46986414,  // 暗黑魔術師 → Dark Magician
  'MON-002': 89631139,  // 青眼白龍 → Blue-Eyes White Dragon
  'MON-003': 11813953,  // 火焰劍士 → Great Angus
  'MON-004': 49522489,  // 水精靈 → Beelze Frog
  'MON-005': 42969214,  // 鋼鐵巨人 → Aye-Iron
  'MON-006': 17658803,  // 風之翼龍 → Luster Dragon #2
  'MON-007': 49881766,  // 暗影刺客 → Archfiend Soldier
  'MON-008': 37742478,  // 光之天使 → Honest
  'MON-009': 14708569,  // 森林守衛者 → Arlownay
  'MON-010': 51945556,  // 雷電鳥 → Zaborg the Thunder Monarch

  // Spells (5)
  'SPL-001': 55144522,  // 強欲之壺 → Pot of Greed
  'SPL-002': 5318639,   // 旋風 → Mystical Space Typhoon
  'SPL-003': 40619825,  // 戰士之力 → Axe of Despair
  'SPL-004': 59197169,  // 黑暗領域 → Yami
  'SPL-005': 94425169,  // 生命之泉 → Spring of Rebirth

  // Traps (5)
  'TRP-001': 29401950,  // 奈落的落穴 → Bottomless Trap Hole
  'TRP-002': 62279055,  // 魔法筒 → Magic Cylinder
  'TRP-003': 41420027,  // 神之宣告 → Solemn Judgment
  'TRP-004': 53239672,  // 聖潔之鏡 → Spirit Barrier
  'TRP-005': 94192409,  // 強制脫出裝置 → Compulsory Evacuation Device
};

/** Get card image URL. Uses local files to avoid CORS issues. */
export function getCardImageUrl(cardId: string): string | null {
  const ygoproId = CARD_IMAGE_MAP[cardId];
  if (!ygoproId) return null;
  return `${import.meta.env.BASE_URL}card-images/${ygoproId}.jpg`;
}
