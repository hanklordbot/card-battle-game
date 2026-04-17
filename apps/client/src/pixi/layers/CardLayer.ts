import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { Card, isMonster, MonsterCard, CardType, Position, FieldCard } from '../../core/card';
import { getCardFrameColor } from '../../game/constants';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';
import { SLOT_W, SLOT_H, type SlotInfo } from './FieldLayer';
import { getTexture } from '../TexturePreloader';
import { getCardImageUrl } from '../../services/card-mapping';

const CARD_W = 80;
const CARD_H = 116;
const HAND_CARD_W = 80;
const HAND_CARD_H = 116;

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class CardSprite extends Container {
  private bg = new Graphics();
  private nameText: Text;
  private statsText: Text;
  private typeBadge: Text;
  private backSprite: Sprite;
  private artSprite: Sprite;
  private statsOverlay = new Graphics();
  private statsOverlayText: Text;
  private _faceDown = false;
  private _loadedCardId = '';
  cardRef: Card | null = null;
  cardIndex = -1;

  constructor(private w = CARD_W, private h = CARD_H) {
    super();
    this.addChild(this.bg);

    // Card art image (loaded async)
    this.artSprite = new Sprite();
    this.artSprite.width = w;
    this.artSprite.height = h;
    this.artSprite.visible = false;
    this.addChild(this.artSprite);

    const nameStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontWeight: 'bold', wordWrap: true, wordWrapWidth: w - 8 });
    this.nameText = new Text({ text: '', style: nameStyle });
    this.nameText.position.set(4, 4);
    this.addChild(this.nameText);

    const statsStyle = new TextStyle({ fontSize: 14, fill: 0xffd700, fontWeight: 'bold' });
    this.statsText = new Text({ text: '', style: statsStyle });
    this.statsText.anchor.set(0.5, 1);
    this.statsText.position.set(w / 2, h - 4);
    this.addChild(this.statsText);

    const badgeStyle = new TextStyle({ fontSize: 22, fill: 0xffffff, fontWeight: 'bold' });
    this.typeBadge = new Text({ text: '', style: badgeStyle });
    this.typeBadge.anchor.set(0.5);
    this.typeBadge.position.set(w / 2, h / 2);
    this.addChild(this.typeBadge);

    // Stats overlay (shown on top of card art)
    this.addChild(this.statsOverlay);
    this.statsOverlayText = new Text({ text: '', style: new TextStyle({ fontSize: 13, fill: 0xffffff, fontWeight: 'bold' }) });
    this.statsOverlayText.anchor.set(0.5, 1);
    this.statsOverlayText.position.set(w / 2, h - 3);
    this.statsOverlayText.visible = false;
    this.addChild(this.statsOverlayText);
    this.typeBadge = new Text({ text: '', style: badgeStyle });
    this.typeBadge.anchor.set(0.5);
    this.typeBadge.position.set(w / 2, h / 2);
    this.addChild(this.typeBadge);

    this.backSprite = new Sprite(getTexture('card_back'));
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

    if (faceDown) {
      this.artSprite.visible = false;
    } else {
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

      // Load card art image (async, no CORS — uses <img> crossOrigin)
      if (this._loadedCardId !== card.id) {
        this._loadedCardId = card.id;
        this.artSprite.visible = false;
        this.statsOverlay.visible = false;
        this.statsOverlayText.visible = false;
        const url = getCardImageUrl(card.id);
        if (url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (this.cardRef?.id !== card.id) return; // stale
            const tex = Texture.from(img);
            this.artSprite.texture = tex;
            this.artSprite.width = this.w;
            this.artSprite.height = this.h;
            this.artSprite.visible = true;
            this.nameText.visible = false;
            this.typeBadge.visible = false;
            this.bg.visible = false;
            this.statsText.visible = false;
            this.showStatsOverlay(card);
          };
          img.src = url;
        }
      } else if (this.artSprite.texture && this.artSprite.texture !== Texture.EMPTY) {
        this.artSprite.visible = true;
        this.nameText.visible = false;
        this.typeBadge.visible = false;
        this.bg.visible = false;
        this.statsText.visible = false;
        this.showStatsOverlay(card);
      }
    }
  }

  private showStatsOverlay(card: Card) {
    if (!isMonster(card)) { this.statsOverlay.visible = false; this.statsOverlayText.visible = false; return; }
    const m = card as MonsterCard;
    this.statsOverlay.clear();
    this.statsOverlay.roundRect(0, this.h - 22, this.w, 22, 0);
    this.statsOverlay.fill({ color: 0x000000, alpha: 0.7 });
    this.statsOverlay.visible = true;
    this.statsOverlayText.text = `${m.atk}/${m.def}`;
    this.statsOverlayText.visible = true;
  }

  get faceDown() { return this._faceDown; }
}

export class CardLayer extends Container {
  private playerHandCards: CardSprite[] = [];
  private oppHandCards: CardSprite[] = [];
  private fieldCards = new Map<string, CardSprite>();
  private handCardPool: CardSprite[] = []; // recycled hand card sprites

  onHandCardClick?: (index: number) => void;
  onHandCardRightClick?: (card: Card) => void;
  onFieldCardClick?: (player: number, zoneType: 'monster' | 'spell', index: number) => void;
  onFieldCardRightClick?: (card: Card) => void;

  constructor() {
    super();
  }

  private acquireHandCard(w: number, h: number): CardSprite {
    const cs = this.handCardPool.pop() ?? new CardSprite(w, h);
    cs.visible = true;
    this.addChild(cs);
    return cs;
  }

  private releaseHandCard(cs: CardSprite) {
    cs.removeAllListeners();
    cs.visible = false;
    this.removeChild(cs);
    this.handCardPool.push(cs);
  }

  updateHand(cards: Card[], isOpponent: boolean) {
    const pool = isOpponent ? this.oppHandCards : this.playerHandCards;

    // Release excess to pool
    while (pool.length > cards.length) {
      this.releaseHandCard(pool.pop()!);
    }
    // Acquire missing from pool
    while (pool.length < cards.length) {
      pool.push(this.acquireHandCard(HAND_CARD_W, HAND_CARD_H));
    }

    const gap = 8;
    const totalW = cards.length * HAND_CARD_W + Math.max(0, cards.length - 1) * gap;
    const startX = (LOGICAL_W - totalW) / 2 + HAND_CARD_W / 2;
    const y = isOpponent ? 60 : LOGICAL_H - 90;

    for (let i = 0; i < cards.length; i++) {
      const cs = pool[i];
      cs.setCard(cards[i], isOpponent);
      cs.cardIndex = i;
      cs.position.set(startX + i * (HAND_CARD_W + gap), y);
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
