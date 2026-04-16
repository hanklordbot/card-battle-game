import { Assets, Spritesheet, Texture } from 'pixi.js';

/**
 * Preload all battle-field PNG assets into PixiJS texture cache.
 * Groups assets by directory so PixiJS can batch sprites sharing the same base texture.
 * This replaces scattered Sprite.from() calls with pre-cached textures.
 */

const BATTLE_FIELD_ASSETS: Record<string, string> = {
  'bg_default': 'assets/battle-field-png/background/bg_default.png',
  'center_divider': 'assets/battle-field-png/ui/center_divider.png',
  'slot_monster': 'assets/battle-field-png/card-slots/slot_monster.png',
  'slot_spelltrap': 'assets/battle-field-png/card-slots/slot_spelltrap.png',
  'slot_empty': 'assets/battle-field-png/card-slots/slot_empty.png',
  'slot_highlight': 'assets/battle-field-png/card-slots/slot_highlight.png',
  'slot_fieldspell': 'assets/battle-field-png/card-slots/slot_fieldspell.png',
  'card_back': 'assets/battle-field-png/card-slots/card_back.png',
  'zone_deck': 'assets/battle-field-png/functional/zone_deck.png',
  'zone_graveyard': 'assets/battle-field-png/functional/zone_graveyard.png',
  'zone_banished': 'assets/battle-field-png/functional/zone_banished.png',
  'btn_phase_normal': 'assets/battle-field-png/ui/btn_phase_normal.png',
  'btn_phase_hover': 'assets/battle-field-png/ui/btn_phase_hover.png',
  'btn_phase_pressed': 'assets/battle-field-png/ui/btn_phase_pressed.png',
  'btn_surrender': 'assets/battle-field-png/ui/btn_surrender.png',
  'btn_settings': 'assets/battle-field-png/ui/btn_settings.png',
  'banner_my_turn': 'assets/battle-field-png/ui/banner_my_turn.png',
  'banner_opponent_turn': 'assets/battle-field-png/ui/banner_opponent_turn.png',
  'phase_indicator': 'assets/battle-field-png/ui/phase_indicator.png',
  'phase_node_active': 'assets/battle-field-png/ui/phase_node_active.png',
  'lp_bar_bg': 'assets/battle-field-png/ui/lp_bar_bg.png',
  'lp_bar_player': 'assets/battle-field-png/ui/lp_bar_player.png',
  'lp_bar_opponent': 'assets/battle-field-png/ui/lp_bar_opponent.png',
};

let loaded = false;

/** Preload all battlefield textures into PixiJS Assets cache. Call once before scene creation. */
export async function preloadBattleTextures(): Promise<void> {
  if (loaded) return;
  loaded = true;

  // Register all assets as a bundle
  const assets: { alias: string; src: string }[] = [];
  for (const [alias, src] of Object.entries(BATTLE_FIELD_ASSETS)) {
    assets.push({ alias, src });
  }

  Assets.addBundle('battlefield', assets);
  await Assets.loadBundle('battlefield');
}

/** Get a pre-cached texture by alias. Falls back to Sprite.from path if not preloaded. */
export function getTexture(alias: string): Texture {
  const tex = Assets.get<Texture>(alias);
  if (tex) return tex;
  // Fallback: load from full path if alias matches our map
  const path = BATTLE_FIELD_ASSETS[alias];
  if (path) return Texture.from(path);
  return Texture.from(alias);
}

/** Unload all preloaded battlefield textures to free GPU memory. */
export async function unloadBattleTextures(): Promise<void> {
  if (!loaded) return;
  await Assets.unloadBundle('battlefield');
  loaded = false;
}
