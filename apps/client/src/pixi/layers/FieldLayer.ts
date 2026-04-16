import { Container, Sprite, Texture } from 'pixi.js';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

const SLOT_W = 80;
const SLOT_H = 116;
const SLOT_GAP = 12;
const ZONE_SIZE = 60;

// Layout constants
const CENTER_Y = LOGICAL_H / 2;
const MONSTER_ROW_OFFSET = 80;  // distance from center to monster row
const SPELL_ROW_OFFSET = 210;   // distance from center to spell row
const FIELD_X_START = (LOGICAL_W - (5 * SLOT_W + 4 * SLOT_GAP)) / 2;

export interface SlotInfo { x: number; y: number; sprite: Sprite; highlight: Sprite }

export class FieldLayer extends Container {
  playerMonsterSlots: SlotInfo[] = [];
  playerSpellSlots: SlotInfo[] = [];
  oppMonsterSlots: SlotInfo[] = [];
  oppSpellSlots: SlotInfo[] = [];
  playerDeck!: Sprite;
  playerGrave!: Sprite;
  playerBanished!: Sprite;
  oppDeck!: Sprite;
  oppGrave!: Sprite;
  oppBanished!: Sprite;
  playerFieldSpell!: Sprite;
  oppFieldSpell!: Sprite;

  constructor() {
    super();
    this.build();
  }

  private build() {
    // Background
    const bg = Sprite.from('assets/battle-field-png/background/bg_default.png');
    bg.width = LOGICAL_W;
    bg.height = LOGICAL_H;
    this.addChild(bg);

    // Center divider
    const divider = Sprite.from('assets/battle-field-png/ui/center_divider.png');
    divider.anchor.set(0.5);
    divider.position.set(LOGICAL_W / 2, CENTER_Y);
    divider.width = LOGICAL_W * 0.6;
    divider.height = 4;
    this.addChild(divider);

    // Create slot rows
    this.oppMonsterSlots = this.createSlotRow(CENTER_Y - MONSTER_ROW_OFFSET, 'slot_monster');
    this.oppSpellSlots = this.createSlotRow(CENTER_Y - SPELL_ROW_OFFSET, 'slot_spelltrap');
    this.playerMonsterSlots = this.createSlotRow(CENTER_Y + MONSTER_ROW_OFFSET, 'slot_monster');
    this.playerSpellSlots = this.createSlotRow(CENTER_Y + SPELL_ROW_OFFSET, 'slot_spelltrap');

    // Side zones - player
    this.playerDeck = this.createZone(FIELD_X_START + 5 * (SLOT_W + SLOT_GAP) + 30, CENTER_Y + MONSTER_ROW_OFFSET, 'zone_deck');
    this.playerGrave = this.createZone(FIELD_X_START + 5 * (SLOT_W + SLOT_GAP) + 30, CENTER_Y + SPELL_ROW_OFFSET, 'zone_graveyard');
    this.playerBanished = this.createZone(FIELD_X_START - ZONE_SIZE - 30, CENTER_Y + MONSTER_ROW_OFFSET, 'zone_banished');
    this.playerFieldSpell = this.createZone(FIELD_X_START - ZONE_SIZE - 30, CENTER_Y + SPELL_ROW_OFFSET, 'zone_deck');

    // Side zones - opponent
    this.oppDeck = this.createZone(FIELD_X_START - ZONE_SIZE - 30, CENTER_Y - MONSTER_ROW_OFFSET, 'zone_deck');
    this.oppGrave = this.createZone(FIELD_X_START - ZONE_SIZE - 30, CENTER_Y - SPELL_ROW_OFFSET, 'zone_graveyard');
    this.oppBanished = this.createZone(FIELD_X_START + 5 * (SLOT_W + SLOT_GAP) + 30, CENTER_Y - MONSTER_ROW_OFFSET, 'zone_banished');
    this.oppFieldSpell = this.createZone(FIELD_X_START + 5 * (SLOT_W + SLOT_GAP) + 30, CENTER_Y - SPELL_ROW_OFFSET, 'zone_deck');
  }

  private createSlotRow(cy: number, texName: string): SlotInfo[] {
    const slots: SlotInfo[] = [];
    for (let i = 0; i < 5; i++) {
      const x = FIELD_X_START + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
      const y = cy;

      const sprite = Sprite.from(`assets/battle-field-png/card-slots/${texName}.png`);
      sprite.anchor.set(0.5);
      sprite.width = SLOT_W;
      sprite.height = SLOT_H;
      sprite.position.set(x, y);
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      this.addChild(sprite);

      const highlight = Sprite.from('assets/battle-field-png/card-slots/slot_highlight.png');
      highlight.anchor.set(0.5);
      highlight.width = SLOT_W + 8;
      highlight.height = SLOT_H + 8;
      highlight.position.set(x, y);
      highlight.visible = false;
      highlight.alpha = 0.7;
      this.addChild(highlight);

      slots.push({ x, y, sprite, highlight });
    }
    return slots;
  }

  private createZone(x: number, cy: number, texName: string): Sprite {
    const s = Sprite.from(`assets/battle-field-png/functional/${texName}.png`);
    s.anchor.set(0.5);
    s.width = ZONE_SIZE;
    s.height = ZONE_SIZE;
    s.position.set(x, cy);
    s.eventMode = 'static';
    s.cursor = 'pointer';
    this.addChild(s);
    return s;
  }

  setHighlight(slots: SlotInfo[], index: number, visible: boolean, tint = 0xffffff) {
    const slot = slots[index];
    if (!slot) return;
    slot.highlight.visible = visible;
    slot.highlight.tint = tint;
  }

  clearAllHighlights() {
    const all = [...this.playerMonsterSlots, ...this.playerSpellSlots, ...this.oppMonsterSlots, ...this.oppSpellSlots];
    for (const s of all) s.highlight.visible = false;
  }
}

export { SLOT_W, SLOT_H, FIELD_X_START, SLOT_GAP, CENTER_Y, MONSTER_ROW_OFFSET, SPELL_ROW_OFFSET };
