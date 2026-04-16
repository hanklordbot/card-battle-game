import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { Phase, INITIAL_LP, DuelState } from '../../core/duel';
import { COLORS, PHASE_LABELS, PHASE_ORDER } from '../../game/constants';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class UILayer extends Container {
  // LP
  private playerLpText: Text;
  private oppLpText: Text;
  private playerLpBar = new Graphics();
  private oppLpBar = new Graphics();
  private playerLpLabel: Text;
  private oppLpLabel: Text;

  // Phase
  private phaseNodes: Text[] = [];
  private turnLabel: Text;

  // Buttons
  phaseBtn: Container;
  private phaseBtnBg: Sprite;
  private phaseBtnText: Text;
  surrenderBtn: Container;
  cancelBtn: Container;
  private cancelBtnGfx = new Graphics();
  directAttackBtn: Container;
  private directAtkGfx = new Graphics();

  // Toast
  private toastText: Text;
  private toastTimer = 0;

  // Game log
  private logContainer: Container;
  private logTexts: Text[] = [];
  private logMask = new Graphics();

  // Waiting label
  private waitingLabel: Text;

  constructor() {
    super();

    const lpStyle = new TextStyle({ fontSize: 22, fill: 0xffffff, fontWeight: 'bold' });
    const labelStyle = new TextStyle({ fontSize: 14, fill: 0xffffff });

    // Player LP
    this.playerLpLabel = new Text({ text: '我方', style: new TextStyle({ fontSize: 14, fill: hexNum(COLORS.myAccent) }) });
    this.playerLpLabel.position.set(30, LOGICAL_H - 140);
    this.addChild(this.playerLpLabel);

    this.playerLpText = new Text({ text: `${INITIAL_LP}`, style: lpStyle });
    this.playerLpText.position.set(30, LOGICAL_H - 120);
    this.addChild(this.playerLpText);

    this.playerLpBar.position.set(30, LOGICAL_H - 95);
    this.addChild(this.playerLpBar);

    // Opponent LP
    this.oppLpLabel = new Text({ text: '對方', style: new TextStyle({ fontSize: 14, fill: hexNum(COLORS.oppAccent) }) });
    this.oppLpLabel.position.set(30, 20);
    this.addChild(this.oppLpLabel);

    this.oppLpText = new Text({ text: `${INITIAL_LP}`, style: lpStyle });
    this.oppLpText.position.set(30, 40);
    this.addChild(this.oppLpText);

    this.oppLpBar.position.set(30, 65);
    this.addChild(this.oppLpBar);

    // Turn label
    this.turnLabel = new Text({ text: '', style: new TextStyle({ fontSize: 16, fill: hexNum(COLORS.myAccent), fontWeight: 'bold' }) });
    this.turnLabel.anchor.set(0.5, 0);
    this.turnLabel.position.set(LOGICAL_W / 2, LOGICAL_H - 145);
    this.addChild(this.turnLabel);

    // Phase nodes
    const phaseY = LOGICAL_H - 120;
    const phaseStartX = LOGICAL_W / 2 - (PHASE_ORDER.length - 1) * 40;
    for (let i = 0; i < PHASE_ORDER.length; i++) {
      const t = new Text({
        text: PHASE_LABELS[PHASE_ORDER[i]],
        style: new TextStyle({ fontSize: 14, fill: hexNum(COLORS.phaseInactive), fontWeight: 'bold' }),
      });
      t.anchor.set(0.5);
      t.position.set(phaseStartX + i * 80, phaseY);
      this.addChild(t);
      this.phaseNodes.push(t);
    }

    // Phase button
    this.phaseBtn = new Container();
    this.phaseBtn.eventMode = 'static';
    this.phaseBtn.cursor = 'pointer';
    this.phaseBtnBg = Sprite.from('assets/battle-field-png/ui/btn_phase_normal.png');
    this.phaseBtnBg.anchor.set(0.5);
    this.phaseBtnBg.width = 160;
    this.phaseBtnBg.height = 44;
    this.phaseBtn.addChild(this.phaseBtnBg);
    this.phaseBtnText = new Text({ text: '▶ 下一階段', style: new TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: 'bold' }) });
    this.phaseBtnText.anchor.set(0.5);
    this.phaseBtn.addChild(this.phaseBtnText);
    this.phaseBtn.position.set(LOGICAL_W / 2, LOGICAL_H - 80);
    this.phaseBtn.on('pointerover', () => { this.phaseBtnBg.texture = Sprite.from('assets/battle-field-png/ui/btn_phase_hover.png').texture; });
    this.phaseBtn.on('pointerout', () => { this.phaseBtnBg.texture = Sprite.from('assets/battle-field-png/ui/btn_phase_normal.png').texture; });
    this.addChild(this.phaseBtn);

    // Surrender button
    this.surrenderBtn = new Container();
    this.surrenderBtn.eventMode = 'static';
    this.surrenderBtn.cursor = 'pointer';
    const surBg = Sprite.from('assets/battle-field-png/ui/btn_surrender.png');
    surBg.anchor.set(0.5);
    surBg.width = 120;
    surBg.height = 40;
    this.surrenderBtn.addChild(surBg);
    const surText = new Text({ text: '🏳 投降', style: new TextStyle({ fontSize: 14, fill: 0xffffff }) });
    surText.anchor.set(0.5);
    this.surrenderBtn.addChild(surText);
    this.surrenderBtn.position.set(LOGICAL_W / 2 + 200, LOGICAL_H - 80);
    this.addChild(this.surrenderBtn);

    // Cancel button
    this.cancelBtn = new Container();
    this.cancelBtn.eventMode = 'static';
    this.cancelBtn.cursor = 'pointer';
    this.cancelBtn.visible = false;
    this.cancelBtnGfx.roundRect(-60, -18, 120, 36, 6);
    this.cancelBtnGfx.fill({ color: 0x333333 });
    this.cancelBtn.addChild(this.cancelBtnGfx);
    const cancelText = new Text({ text: '✕ 取消', style: new TextStyle({ fontSize: 14, fill: 0xffffff }) });
    cancelText.anchor.set(0.5);
    this.cancelBtn.addChild(cancelText);
    this.cancelBtn.position.set(LOGICAL_W / 2 - 200, LOGICAL_H - 80);
    this.addChild(this.cancelBtn);

    // Direct attack button
    this.directAttackBtn = new Container();
    this.directAttackBtn.eventMode = 'static';
    this.directAttackBtn.cursor = 'pointer';
    this.directAttackBtn.visible = false;
    this.directAtkGfx.roundRect(-80, -20, 160, 40, 8);
    this.directAtkGfx.fill({ color: hexNum(COLORS.canAttack) });
    this.directAttackBtn.addChild(this.directAtkGfx);
    const dAtkText = new Text({ text: '⚔ 直接攻擊', style: new TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: 'bold' }) });
    dAtkText.anchor.set(0.5);
    this.directAttackBtn.addChild(dAtkText);
    this.directAttackBtn.position.set(LOGICAL_W / 2, LOGICAL_H / 2);
    this.addChild(this.directAttackBtn);

    // Toast
    this.toastText = new Text({ text: '', style: new TextStyle({ fontSize: 20, fill: 0xffffff, fontWeight: 'bold', dropShadow: true }) });
    this.toastText.anchor.set(0.5);
    this.toastText.position.set(LOGICAL_W / 2, LOGICAL_H / 2 - 200);
    this.toastText.visible = false;
    this.addChild(this.toastText);

    // Waiting label
    this.waitingLabel = new Text({ text: '對方回合中...', style: new TextStyle({ fontSize: 16, fill: hexNum(COLORS.oppAccent) }) });
    this.waitingLabel.anchor.set(0.5);
    this.waitingLabel.position.set(LOGICAL_W / 2 - 100, LOGICAL_H - 80);
    this.waitingLabel.visible = false;
    this.addChild(this.waitingLabel);

    // Game log
    this.logContainer = new Container();
    this.logContainer.position.set(LOGICAL_W - 280, LOGICAL_H / 2 - 150);
    this.logMask.rect(0, 0, 260, 300);
    this.logMask.fill({ color: 0xffffff });
    this.logContainer.mask = this.logMask;
    this.logContainer.addChild(this.logMask);
    this.addChild(this.logContainer);
  }

  updateLP(playerLp: number, oppLp: number) {
    this.playerLpText.text = `${playerLp}`;
    this.oppLpText.text = `${oppLp}`;

    const barW = 150;
    const barH = 10;

    this.playerLpBar.clear();
    this.playerLpBar.roundRect(0, 0, barW, barH, 3);
    this.playerLpBar.fill({ color: 0x333333 });
    const pPct = Math.max(0, playerLp / INITIAL_LP);
    this.playerLpBar.roundRect(0, 0, barW * pPct, barH, 3);
    this.playerLpBar.fill({ color: hexNum(COLORS.myAccent) });

    this.oppLpBar.clear();
    this.oppLpBar.roundRect(0, 0, barW, barH, 3);
    this.oppLpBar.fill({ color: 0x333333 });
    const oPct = Math.max(0, oppLp / INITIAL_LP);
    this.oppLpBar.roundRect(0, 0, barW * oPct, barH, 3);
    this.oppLpBar.fill({ color: hexNum(COLORS.oppAccent) });
  }

  updatePhase(phase: Phase, isMyTurn: boolean, turnCount: number) {
    this.turnLabel.text = `${isMyTurn ? '我方回合' : '對方回合'} - Turn ${turnCount}`;
    (this.turnLabel.style as TextStyle).fill = hexNum(isMyTurn ? COLORS.myAccent : COLORS.oppAccent);

    const currentIdx = PHASE_ORDER.indexOf(phase);
    for (let i = 0; i < this.phaseNodes.length; i++) {
      const node = this.phaseNodes[i];
      if (i === currentIdx) {
        (node.style as TextStyle).fill = hexNum(COLORS.phaseActive);
        node.scale.set(1.3);
      } else if (i < currentIdx) {
        (node.style as TextStyle).fill = hexNum(COLORS.textSecondary);
        node.scale.set(1);
      } else {
        (node.style as TextStyle).fill = hexNum(COLORS.phaseInactive);
        node.scale.set(1);
      }
    }
  }

  updateButtons(isMyTurn: boolean, gameOver: boolean, phase: Phase, uiMode: string) {
    this.phaseBtn.visible = isMyTurn && !gameOver;
    this.phaseBtnText.text = phase === Phase.Draw ? '▶ 開始回合' : '▶ 下一階段';
    this.cancelBtn.visible = uiMode !== 'idle';
    this.waitingLabel.visible = !isMyTurn && !gameOver;
  }

  showToast(msg: string) {
    this.toastText.text = msg;
    this.toastText.visible = true;
    this.toastText.alpha = 1;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { this.toastText.visible = false; }, 2000);
  }

  updateLog(logs: { message: string }[]) {
    // Remove old
    for (const t of this.logTexts) { this.logContainer.removeChild(t); t.destroy(); }
    this.logTexts = [];

    const recent = logs.slice(-15);
    const style = new TextStyle({ fontSize: 11, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 250 });
    let y = 0;
    for (const log of recent) {
      const t = new Text({ text: log.message, style });
      t.position.set(5, y);
      this.logContainer.addChild(t);
      this.logTexts.push(t);
      y += t.height + 2;
    }
    // Scroll to bottom
    if (y > 300) {
      for (const t of this.logTexts) t.y -= y - 300;
    }
  }
}
