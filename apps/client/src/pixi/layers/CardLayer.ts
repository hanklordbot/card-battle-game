import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { Card, isMonster, MonsterCard, CardType, Position, FieldCard } from '../../core/card';
import { getCardFrameColor } from '../../game/constants';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';
import { SLOT_W, SLOT_H, type SlotInfo } from './FieldLayer';

const CARD_W = 80;
const CARD_H = 116;
const HAND_CARD_W = 70;
const HAND_CARD_H = 100;

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class CardSprite extends Container {
  private bg = new Graphics();
  private nameText: Text;
  private statsText: Text;
  private typeBadge: Text;
  private backSprite: Sprite;
  private _faceDown = false;
  cardRef: Card | null = null;
  cardIndex = -1;

  constructor(private w = CARD_W, private h = CARD_H) {
    super();
    this.addChild(this.bg);

    const nameStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: 'bold', wordWrap: true, wordWrapWidth: w - 8 });
    this.nameText = new Text({ text: '', style: nameStyle });
    this.nameText.position.set(4, 4);
    this.addChild(this.nameText);

    const statsStyle = new TextStyle({ fontSize: 11, fill: 0xffd700, fontWeight: 'bold' });
    this.statsText = new Text({ text: '', style: statsStyle });
    this.statsText.anchor.set(0.5, 1);
    this.statsText.position.set(w / 2, h - 4);
    this.addChild(this.statsText);

    const badgeStyle = new TextStyle({ fontSize: 18, fill: 0xffffff, fontWeight: 'bold' });
    this.typeBadge = new Text({ text: '', style: badgeStyle });
    this.typeBadge.anchor.set(0.5);
    this.typeBadge.position.set(w / 2, h / 2);
    this.addChild(this.typeBadge);

    this.backSprite = Sprite.from('assets/battle-field-png/card-slots/card_back.png');
    this.backSprite.width = w;
    this.backSprite.height = h;
    this.backSprite.visible = false;
    this.addChild(this.backSprite);

    this.pivot.set(w / 2, h / 2);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  setCard(card: Card, faceDown = false) {
    this.cardRef = card;
    this._faceDown = faceDown;
    this.backSprite.visible = faceDown;
    this.bg.visible = !faceDown;
    this.nameText.visible = !faceDown;
    this.statsText.visible = !faceDown;
    this.typeBadge.visible = !faceDown;

    if (!faceDown) {
      const color = hexToNum(getCardFrameColor(card));
      this.bg.clear();
      this.bg.roundRect(0, 0, this.w, this.h, 4);
      this.bg.fill({ color, alpha: 0.3 });
      this.bg.stroke({ color, width: 2 });

      this.nameText.text = card.name;
      if (isMonster(card)) {
        const m = card as MonsterCard;
        this.statsText.text = `${m.atk}/${m.def}`;
        this.typeBadge.text = '';
      } else {
        this.statsText.text = '';
        this.typeBadge.text = card.cardType === CardType.Spell ? '魔' : '陷';
      }
    }
  }

  get faceDown() { return this._faceDown; }
}

export class CardLayer extends Container {
  private playerHandCards: CardSprite[] = [];
  private oppHandCards: CardSprite[] = [];
  private fieldCards = new Map<string, CardSprite>(); // key: "p{player}m{zone}" or "p{player}s{zone}"

  onHandCardClick?: (index: number) => void;
  onHandCardRightClick?: (card: Card) => void;
  onFieldCardClick?: (player: number, zoneType: 'monster' | 'spell', index: number) => void;
  onFieldCardRightClick?: (card: Card) => void;

  constructor() {
    super();
  }

  updateHand(cards: Card[], isOpponent: boolean) {
    const pool = isOpponent ? this.oppHandCards : this.playerHandCards;

    // Remove excess
    while (pool.length > cards.length) {
      const c = pool.pop()!;
      this.removeChild(c);
      c.destroy();
    }
    // Add missing
    while (pool.length < cards.length) {
      const cs = new CardSprite(HAND_CARD_W, HAND_CARD_H);
      pool.push(cs);
      this.addChild(cs);
    }

    const totalW = cards.length * HAND_CARD_W - Math.max(0, cards.length - 1) * Math.max(15, cards.length * 2);
    const startX = (LOGICAL_W - totalW) / 2 + HAND_CARD_W / 2;
    const overlap = Math.max(15, cards.length * 2);
    const y = isOpponent ? 60 : LOGICAL_H - 60;

    for (let i = 0; i < cards.length; i++) {
      const cs = pool[i];
      cs.setCard(cards[i], isOpponent);
      cs.cardIndex = i;
      cs.position.set(startX + i * (HAND_CARD_W - overlap), y);
      cs.scale.set(1);
      cs.rotation = 0;

      cs.removeAllListeners();
      if (!isOpponent) {
        const idx = i;
        cs.on('pointerdown', () => this.onHandCardClick?.(idx));
        cs.on('rightclick', () => this.onHandCardRightClick?.(cards[idx]));
        cs.on('pointerover', () => { cs.scale.set(1.15); cs.zIndex = 100; this.sortChildren(); });
        cs.on('pointerout', () => { cs.scale.set(1); cs.zIndex = 0; this.sortChildren(); });
      }
    }
  }

  updateFieldCards(
    playerMonsters: (FieldCard | null)[],
    playerSpells: (FieldCard | null)[],
    oppMonsters: (FieldCard | null)[],
    oppSpells: (FieldCard | null)[],
    slots: {
      playerMonster: SlotInfo[];
      playerSpell: SlotInfo[];
      oppMonster: SlotInfo[];
      oppSpell: SlotInfo[];
    }
  ) {
    const entries: { key: string; fc: FieldCard | null; slot: SlotInfo; player: number; zoneType: 'monster' | 'spell'; idx: number }[] = [];

    for (let i = 0; i < 5; i++) {
      entries.push({ key: `p0m${i}`, fc: playerMonsters[i], slot: slots.playerMonster[i], player: 0, zoneType: 'monster', idx: i });
      entries.push({ key: `p0s${i}`, fc: playerSpells[i], slot: slots.playerSpell[i], player: 0, zoneType: 'spell', idx: i });
      entries.push({ key: `p1m${i}`, fc: oppMonsters[i], slot: slots.oppMonster[i], player: 1, zoneType: 'monster', idx: i });
      entries.push({ key: `p1s${i}`, fc: oppSpells[i], slot: slots.oppSpell[i], player: 1, zoneType: 'spell', idx: i });
    }

    const activeKeys = new Set<string>();

    for (const { key, fc, slot, player, zoneType, idx } of entries) {
      if (!fc) {
        const existing = this.fieldCards.get(key);
        if (existing) {
          this.removeChild(existing);
          existing.destroy();
          this.fieldCards.delete(key);
        }
        continue;
      }

      activeKeys.add(key);
      let cs = this.fieldCards.get(key);
      if (!cs) {
        cs = new CardSprite(SLOT_W, SLOT_H);
        this.fieldCards.set(key, cs);
        this.addChild(cs);
      }

      const isFaceDown = fc.position === Position.FaceDownDefense;
      const isDefense = fc.position === Position.FaceUpDefense || fc.position === Position.FaceDownDefense;
      const isOpp = player === 1;

      cs.setCard(fc.card, isFaceDown && isOpp ? true : isFaceDown);
      cs.position.set(slot.x, slot.y);
      cs.rotation = isDefense ? Math.PI / 2 : 0;

      cs.removeAllListeners();
      const p = player;
      const zt = zoneType;
      const ii = idx;
      cs.on('pointerdown', () => this.onFieldCardClick?.(p, zt, ii));
      cs.on('rightclick', () => this.onFieldCardRightClick?.(fc.card));
      cs.on('pointerover', () => { cs!.scale.set(1.08); });
      cs.on('pointerout', () => { cs!.scale.set(1); });
    }

    // Remove stale
    for (const [key, cs] of this.fieldCards) {
      if (!activeKeys.has(key)) {
        this.removeChild(cs);
        cs.destroy();
        this.fieldCards.delete(key);
      }
    }
  }
}
