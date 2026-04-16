/**
 * GameAudio — High-level audio API for game events.
 * Registers all assets from manifest, provides event-driven sound triggers.
 */

import { audioManager } from './AudioManager';
import type { BusName } from './AudioManager';

// === Asset Registration (from manifest) ===

const BGM_ASSETS: { id: string; bus: BusName; loop: boolean; loopStart?: number; loopEnd?: number }[] = [
  { id: 'bgm_main_menu', bus: 'bgm', loop: true, loopStart: 10.0, loopEnd: 96.0 },
  { id: 'bgm_battle_normal', bus: 'bgm', loop: true, loopStart: 0, loopEnd: 128.0 },
  { id: 'bgm_battle_tense', bus: 'bgm', loop: true, loopStart: 0, loopEnd: 104.0 },
  { id: 'bgm_battle_boss', bus: 'bgm', loop: true, loopStart: 3.0, loopEnd: 96.0 },
  { id: 'bgm_deck_edit', bus: 'bgm', loop: true, loopStart: 0, loopEnd: 128.0 },
  { id: 'bgm_victory', bus: 'bgm', loop: false },
  { id: 'bgm_defeat', bus: 'bgm', loop: false },
];

const SFX_ASSETS: { id: string; bus: BusName; loop: boolean }[] = [
  // Card ops
  { id: 'sfx_draw_card', bus: 'sfx', loop: false },
  { id: 'sfx_set_card', bus: 'sfx', loop: false },
  { id: 'sfx_flip_card', bus: 'sfx', loop: false },
  { id: 'sfx_card_select', bus: 'sfx', loop: false },
  { id: 'sfx_discard', bus: 'sfx', loop: false },
  // Summon
  { id: 'sfx_normal_summon', bus: 'sfx', loop: false },
  { id: 'sfx_tribute_summon', bus: 'sfx', loop: false },
  { id: 'sfx_special_summon', bus: 'sfx', loop: false },
  { id: 'sfx_fusion_summon', bus: 'sfx', loop: false },
  { id: 'sfx_tribute_release', bus: 'sfx', loop: false },
  // Battle
  { id: 'sfx_attack_declare', bus: 'sfx', loop: false },
  { id: 'sfx_attack_hit', bus: 'sfx', loop: false },
  { id: 'sfx_monster_destroy', bus: 'sfx', loop: false },
  { id: 'sfx_direct_attack', bus: 'sfx', loop: false },
  { id: 'sfx_damage_small', bus: 'sfx', loop: false },
  { id: 'sfx_damage_large', bus: 'sfx', loop: false },
  { id: 'sfx_attack_reflect', bus: 'sfx', loop: false },
  // Spell/Trap
  { id: 'sfx_spell_activate', bus: 'sfx', loop: false },
  { id: 'sfx_trap_activate', bus: 'sfx', loop: false },
  { id: 'sfx_chain_start', bus: 'sfx', loop: false },
  { id: 'sfx_chain_stack', bus: 'sfx', loop: false },
  { id: 'sfx_chain_resolve', bus: 'sfx', loop: false },
  { id: 'sfx_negate', bus: 'sfx', loop: false },
  // Turn
  { id: 'sfx_turn_start_mine', bus: 'sfx', loop: false },
  { id: 'sfx_turn_start_opponent', bus: 'sfx', loop: false },
  { id: 'sfx_phase_change', bus: 'sfx', loop: false },
  { id: 'sfx_turn_end', bus: 'sfx', loop: false },
  // LP
  { id: 'sfx_lp_damage', bus: 'sfx', loop: false },
  { id: 'sfx_lp_heal', bus: 'sfx', loop: false },
  { id: 'sfx_lp_warning', bus: 'ambient', loop: true },
  // Result
  { id: 'sfx_victory', bus: 'sfx', loop: false },
  { id: 'sfx_defeat', bus: 'sfx', loop: false },
  // UI
  { id: 'sfx_ui_click', bus: 'ui', loop: false },
  { id: 'sfx_ui_hover', bus: 'ui', loop: false },
  { id: 'sfx_ui_popup_open', bus: 'ui', loop: false },
  { id: 'sfx_ui_popup_close', bus: 'ui', loop: false },
  { id: 'sfx_match_found', bus: 'sfx', loop: false },
  { id: 'sfx_countdown_tick', bus: 'sfx', loop: false },
];

/** Register all assets. Call once at app startup. */
export function registerAllAudio(): void {
  for (const a of BGM_ASSETS) audioManager.register(a.id, a.bus, a.loop, a.loopStart, a.loopEnd);
  for (const a of SFX_ASSETS) audioManager.register(a.id, a.bus, a.loop);
}

/** Preload assets for a given strategy group. */
export async function preloadAudio(group: 'preload' | 'battlePreload' | 'deckEditPreload', basePath = '/audio'): Promise<void> {
  const groups: Record<string, string[]> = {
    preload: ['bgm_main_menu', 'sfx_ui_click', 'sfx_match_found', 'sfx_countdown_tick'],
    battlePreload: [
      'bgm_battle_normal', 'bgm_battle_tense', 'bgm_battle_boss', 'bgm_victory', 'bgm_defeat',
      'sfx_draw_card', 'sfx_set_card', 'sfx_flip_card', 'sfx_normal_summon', 'sfx_tribute_summon',
      'sfx_special_summon', 'sfx_attack_declare', 'sfx_attack_hit', 'sfx_monster_destroy',
      'sfx_direct_attack', 'sfx_spell_activate', 'sfx_trap_activate', 'sfx_chain_start',
      'sfx_chain_resolve', 'sfx_negate', 'sfx_turn_start_mine', 'sfx_turn_start_opponent',
      'sfx_phase_change', 'sfx_lp_damage', 'sfx_lp_warning', 'sfx_victory', 'sfx_defeat',
    ],
    deckEditPreload: ['bgm_deck_edit'],
  };
  await audioManager.loadByStrategy(groups[group] ?? [], basePath);
}

// === High-Level Game Event Triggers ===

export const gameAudio = {
  // --- BGM ---
  playMenuBGM: () => audioManager.playBGM('bgm_main_menu'),
  playBattleBGM: () => audioManager.playBGM('bgm_battle_normal'),
  playTenseBGM: () => audioManager.playBGM('bgm_battle_tense'),
  playBossBGM: () => audioManager.playBGM('bgm_battle_boss'),
  playDeckEditBGM: () => audioManager.playBGM('bgm_deck_edit'),

  playVictorySequence: () => {
    audioManager.stopAllSFX();
    audioManager.stopBGM();
    audioManager.playSFX('sfx_victory');
    setTimeout(() => audioManager.playBGM('bgm_victory', 0), 1000);
  },

  playDefeatSequence: () => {
    audioManager.stopAllSFX();
    audioManager.stopBGM();
    audioManager.playSFX('sfx_defeat');
    setTimeout(() => audioManager.playBGM('bgm_defeat', 0), 1000);
  },

  // --- Card Ops ---
  drawCard: () => audioManager.playSFX('sfx_draw_card'),
  setCard: () => audioManager.playSFX('sfx_set_card'),
  flipCard: () => audioManager.playSFX('sfx_flip_card'),
  selectCard: () => audioManager.playSFX('sfx_card_select'),
  discard: () => audioManager.playSFX('sfx_discard'),

  // --- Summon ---
  normalSummon: () => audioManager.playSFX('sfx_normal_summon'),
  tributeSummon: () => {
    audioManager.playSFX('sfx_tribute_release');
    setTimeout(() => audioManager.playSFX('sfx_tribute_summon'), 300);
  },
  specialSummon: () => audioManager.playSFX('sfx_special_summon'),
  fusionSummon: () => audioManager.playSFX('sfx_fusion_summon'),

  // --- Battle ---
  attackDeclare: () => audioManager.playSFX('sfx_attack_declare'),
  attackHit: () => audioManager.playSFX('sfx_attack_hit'),
  monsterDestroy: () => audioManager.playSFX('sfx_monster_destroy'),
  directAttack: () => audioManager.playSFX('sfx_direct_attack'),
  attackReflect: () => audioManager.playSFX('sfx_attack_reflect'),

  // --- Spell/Trap ---
  spellActivate: () => audioManager.playSFX('sfx_spell_activate'),
  trapActivate: () => audioManager.playSFX('sfx_trap_activate'),
  chainStart: () => audioManager.playSFX('sfx_chain_start'),
  chainStack: (layer: number) => audioManager.playSFX('sfx_chain_stack', Math.pow(1.122, layer - 1)),
  chainResolve: () => audioManager.playSFX('sfx_chain_resolve'),
  negate: () => audioManager.playSFX('sfx_negate'),

  // --- Turn ---
  turnStartMine: () => audioManager.playSFX('sfx_turn_start_mine'),
  turnStartOpponent: () => audioManager.playSFX('sfx_turn_start_opponent'),
  phaseChange: () => audioManager.playSFX('sfx_phase_change'),
  turnEnd: () => audioManager.playSFX('sfx_turn_end'),

  // --- LP ---
  lpDamage: (amount: number) => {
    audioManager.playSFX('sfx_lp_damage');
    audioManager.playSFX(amount > 1000 ? 'sfx_damage_large' : 'sfx_damage_small');
  },
  lpHeal: () => audioManager.playSFX('sfx_lp_heal'),
  lpWarningStart: () => audioManager.playSFX('sfx_lp_warning'),

  // --- UI ---
  uiClick: () => audioManager.playSFX('sfx_ui_click'),
  uiHover: () => audioManager.playSFX('sfx_ui_hover'),
  uiPopupOpen: () => audioManager.playSFX('sfx_ui_popup_open'),
  uiPopupClose: () => audioManager.playSFX('sfx_ui_popup_close'),

  // --- Dynamic BGM Logic ---
  /** Check LP and switch BGM accordingly. */
  checkBattleBGM: (myLP: number, oppLP: number) => {
    const currentId = audioManager.currentBgmId;
    if (currentId === 'bgm_victory' || currentId === 'bgm_defeat') return;
    if (currentId === 'bgm_battle_boss') return; // boss BGM has priority

    if (myLP <= 2000 || oppLP <= 2000) {
      if (currentId !== 'bgm_battle_tense') audioManager.playBGM('bgm_battle_tense');
    } else {
      if (currentId !== 'bgm_battle_normal') audioManager.playBGM('bgm_battle_normal');
    }
  },

  /** Trigger boss BGM (high-level summon, chain 3+). Auto-reverts after 30s. */
  triggerBossBGM: (myLP: number, oppLP: number) => {
    audioManager.playBGM('bgm_battle_boss');
    setTimeout(() => gameAudio.checkBattleBGM(myLP, oppLP), 30000);
  },
};
