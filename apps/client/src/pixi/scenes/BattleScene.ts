import { Application, Container, Rectangle } from 'pixi.js';
import { FieldLayer } from '../layers/FieldLayer';
import { CardLayer } from '../layers/CardLayer';
import { UILayer } from '../layers/UILayer';
import { OverlayLayer } from '../layers/OverlayLayer';
import { InteractionManager } from '../InteractionManager';
import { useBattleStore } from '../../stores/battleStore';
import { useUIStore } from '../../stores/uiStore';
import { DuelResult, Phase } from '../../core/duel';
import { Position } from '../../core/card';
import { COLORS } from '../../game/constants';
import { vfxManager } from '../vfx/VFXManager';

function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class BattleScene extends Container {
  fieldLayer: FieldLayer;
  cardLayer: CardLayer;
  uiLayer: UILayer;
  overlayLayer: OverlayLayer;
  private interaction: InteractionManager;
  private _lastGameStarted = false;
  private _lastGameOverShown = false;

  constructor() {
    super();
    // Enable culling — PixiJS skips rendering children outside this area
    this.cullable = true;
    this.cullArea = new Rectangle(0, 0, 1920, 1080);

    this.fieldLayer = new FieldLayer();
    this.cardLayer = new CardLayer();
    this.uiLayer = new UILayer();
    this.overlayLayer = new OverlayLayer();

    this.addChild(this.fieldLayer);
    this.addChild(this.cardLayer);
    this.addChild(this.uiLayer);
    this.addChild(this.overlayLayer);

    this.interaction = new InteractionManager(this);
  }

  initVFX(app: Application) {
    vfxManager.init(app, this);
  }

  update() {
    const { duel, gameStarted, logs } = useBattleStore.getState();
    const ui = useUIStore.getState();

    // Start screen
    if (!gameStarted || !duel) {
      this.overlayLayer.showStart(true);
      this.fieldLayer.visible = false;
      this.cardLayer.visible = false;
      this.uiLayer.visible = false;
      return;
    }

    this.overlayLayer.showStart(false);
    this.fieldLayer.visible = true;
    this.cardLayer.visible = true;
    this.uiLayer.visible = true;

    const isMyTurn = duel.turnPlayer === 0;
    const isMainPhase = duel.phase === Phase.Main1 || duel.phase === Phase.Main2;
    const isBattlePhase = duel.phase === Phase.Battle;
    const gameOver = duel.result !== undefined && duel.result !== DuelResult.Ongoing;

    // LP
    this.uiLayer.updateLP(duel.players[0].lp, duel.players[1].lp);

    // Phase
    this.uiLayer.updatePhase(duel.phase, isMyTurn, duel.turnCount);

    // Buttons
    this.uiLayer.updateButtons(isMyTurn, gameOver, duel.phase, ui.mode);

    // Direct attack button
    const oppHasNoMonsters = duel.players[1].monsterZone.every(s => s === null);
    this.uiLayer.directAttackBtn.visible = ui.mode === 'attack_select' && oppHasNoMonsters;

    // Hands
    this.cardLayer.updateHand(duel.players[0].hand, false);
    this.cardLayer.updateHand(duel.players[1].hand, true);

    // Field cards
    this.cardLayer.updateFieldCards(
      duel.players[0].monsterZone,
      duel.players[0].spellTrapZone,
      duel.players[1].monsterZone,
      duel.players[1].spellTrapZone,
      {
        playerMonster: this.fieldLayer.playerMonsterSlots,
        playerSpell: this.fieldLayer.playerSpellSlots,
        oppMonster: this.fieldLayer.oppMonsterSlots,
        oppSpell: this.fieldLayer.oppSpellSlots,
      }
    );

    // Highlights
    this.fieldLayer.clearAllHighlights();

    if (ui.mode === 'summon_select') {
      for (let i = 0; i < 5; i++) {
        if (!duel.players[0].monsterZone[i]) {
          this.fieldLayer.setHighlight(this.fieldLayer.playerMonsterSlots, i, true, hexNum(COLORS.canSummon));
        }
      }
    }

    if (ui.mode === 'idle' && isBattlePhase && isMyTurn) {
      for (let i = 0; i < 5; i++) {
        const slot = duel.players[0].monsterZone[i];
        if (slot && slot.position === Position.FaceUpAttack && !slot.hasAttackedThisTurn) {
          this.fieldLayer.setHighlight(this.fieldLayer.playerMonsterSlots, i, true, hexNum(COLORS.canAttack));
        }
      }
    }

    if (ui.mode === 'attack_select' && ui.selectedMonsterZone !== null) {
      this.fieldLayer.setHighlight(this.fieldLayer.playerMonsterSlots, ui.selectedMonsterZone, true, hexNum(COLORS.myAccent));
      for (let i = 0; i < 5; i++) {
        if (duel.players[1].monsterZone[i]) {
          this.fieldLayer.setHighlight(this.fieldLayer.oppMonsterSlots, i, true, hexNum(COLORS.canTarget));
        }
      }
    }

    // Toast
    if (ui.message) this.uiLayer.showToast(ui.message);

    // Game log
    this.uiLayer.updateLog(logs);

    // Card detail
    if (ui.showDetail && ui.detailCard) {
      this.overlayLayer.showCardDetail(ui.detailCard);
    } else {
      this.overlayLayer.hideCardDetail();
    }

    // Game over — only trigger VFX once
    if (gameOver) {
      if (!this._lastGameOverShown) {
        this._lastGameOverShown = true;
        this.overlayLayer.showGameOver(duel.result);
      }
    } else {
      this._lastGameOverShown = false;
      this.overlayLayer.hideGameOver();
    }
  }
}
