import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Card, isMonster, MonsterCard, CardType } from '../../core/card';
import { DuelResult } from '../../core/duel';
import { getCardFrameColor, getCardTypeLabel } from '../../game/constants';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';
import { vfxManager } from '../vfx/VFXManager';

function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class OverlayLayer extends Container {
  // Start screen
  private startScreen = new Container();
  startBtn: Container;

  // Game over
  private gameOverScreen = new Container();
  restartBtn: Container;
  private gameOverTitle: Text;
  private gameOverSub: Text;

  // Card detail
  private detailPanel = new Container();
  private detailBg = new Graphics();
  private detailArt = new Graphics();
  private detailName: Text;
  private detailType: Text;
  private detailStats: Text;
  private detailEffect: Text;
  private detailRarity: Text;

  onStartClick?: () => void;
  onRestartClick?: () => void;
  onDetailClose?: () => void;

  constructor() {
    super();
    this.buildStartScreen();
    this.buildGameOver();
    this.buildDetailPanel();
  }

  private buildStartScreen() {
    const bg = new Graphics();
    bg.rect(0, 0, LOGICAL_W, LOGICAL_H);
    bg.fill({ color: 0x1a1a2e });
    this.startScreen.addChild(bg);

    const title = new Text({ text: '卡片對戰遊戲', style: new TextStyle({ fontSize: 48, fill: 0x00d4ff, fontWeight: 'bold' }) });
    title.anchor.set(0.5);
    title.position.set(LOGICAL_W / 2, LOGICAL_H / 2 - 80);
    this.startScreen.addChild(title);

    const sub = new Text({ text: '網頁 TCG 對戰原型', style: new TextStyle({ fontSize: 20, fill: 0xaaaaaa }) });
    sub.anchor.set(0.5);
    sub.position.set(LOGICAL_W / 2, LOGICAL_H / 2 - 30);
    this.startScreen.addChild(sub);

    this.startBtn = new Container();
    this.startBtn.eventMode = 'static';
    this.startBtn.cursor = 'pointer';
    const btnBg = new Graphics();
    btnBg.roundRect(-100, -25, 200, 50, 10);
    btnBg.fill({ color: 0xe94560 });
    this.startBtn.addChild(btnBg);
    const btnText = new Text({ text: '開始對戰', style: new TextStyle({ fontSize: 22, fill: 0xffffff, fontWeight: 'bold' }) });
    btnText.anchor.set(0.5);
    this.startBtn.addChild(btnText);
    this.startBtn.position.set(LOGICAL_W / 2, LOGICAL_H / 2 + 40);
    this.startBtn.on('pointerdown', () => this.onStartClick?.());
    this.startScreen.addChild(this.startBtn);

    this.addChild(this.startScreen);
  }

  private buildGameOver() {
    this.gameOverScreen.visible = false;
    const bg = new Graphics();
    bg.rect(0, 0, LOGICAL_W, LOGICAL_H);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    bg.eventMode = 'static';
    this.gameOverScreen.addChild(bg);

    const panel = new Graphics();
    panel.roundRect(LOGICAL_W / 2 - 200, LOGICAL_H / 2 - 100, 400, 200, 12);
    panel.fill({ color: 0x1a1a2e });
    panel.stroke({ color: 0x00d4ff, width: 2 });
    this.gameOverScreen.addChild(panel);

    this.gameOverTitle = new Text({ text: '', style: new TextStyle({ fontSize: 32, fill: 0xffffff, fontWeight: 'bold' }) });
    this.gameOverTitle.anchor.set(0.5);
    this.gameOverTitle.position.set(LOGICAL_W / 2, LOGICAL_H / 2 - 50);
    this.gameOverScreen.addChild(this.gameOverTitle);

    this.gameOverSub = new Text({ text: '', style: new TextStyle({ fontSize: 18, fill: 0xcccccc }) });
    this.gameOverSub.anchor.set(0.5);
    this.gameOverSub.position.set(LOGICAL_W / 2, LOGICAL_H / 2 - 10);
    this.gameOverScreen.addChild(this.gameOverSub);

    this.restartBtn = new Container();
    this.restartBtn.eventMode = 'static';
    this.restartBtn.cursor = 'pointer';
    const rBg = new Graphics();
    rBg.roundRect(-80, -20, 160, 40, 8);
    rBg.fill({ color: 0xe94560 });
    this.restartBtn.addChild(rBg);
    const rText = new Text({ text: '再來一局', style: new TextStyle({ fontSize: 18, fill: 0xffffff, fontWeight: 'bold' }) });
    rText.anchor.set(0.5);
    this.restartBtn.addChild(rText);
    this.restartBtn.position.set(LOGICAL_W / 2, LOGICAL_H / 2 + 50);
    this.restartBtn.on('pointerdown', () => this.onRestartClick?.());
    this.gameOverScreen.addChild(this.restartBtn);

    this.addChild(this.gameOverScreen);
  }

  private buildDetailPanel() {
    this.detailPanel.visible = false;

    const overlay = new Graphics();
    overlay.rect(0, 0, LOGICAL_W, LOGICAL_H);
    overlay.fill({ color: 0x000000, alpha: 0.6 });
    overlay.eventMode = 'static';
    overlay.on('pointerdown', () => this.onDetailClose?.());
    this.detailPanel.addChild(overlay);

    const panelW = 320;
    const panelH = 450;
    const px = LOGICAL_W / 2 - panelW / 2;
    const py = LOGICAL_H / 2 - panelH / 2;

    const panelBg = new Graphics();
    panelBg.roundRect(px, py, panelW, panelH, 10);
    panelBg.fill({ color: 0x1a1a2e });
    panelBg.stroke({ color: 0x00d4ff, width: 2 });
    panelBg.eventMode = 'static';
    this.detailPanel.addChild(panelBg);

    this.detailArt.position.set(px, py);
    this.detailPanel.addChild(this.detailArt);

    this.detailName = new Text({ text: '', style: new TextStyle({ fontSize: 22, fill: 0xffffff, fontWeight: 'bold', wordWrap: true, wordWrapWidth: panelW - 30 }) });
    this.detailName.position.set(px + 15, py + 140);
    this.detailPanel.addChild(this.detailName);

    this.detailType = new Text({ text: '', style: new TextStyle({ fontSize: 14, fill: 0xaaaaaa }) });
    this.detailType.position.set(px + 15, py + 170);
    this.detailPanel.addChild(this.detailType);

    this.detailStats = new Text({ text: '', style: new TextStyle({ fontSize: 18, fill: 0xffd700, fontWeight: 'bold' }) });
    this.detailStats.position.set(px + 15, py + 200);
    this.detailPanel.addChild(this.detailStats);

    this.detailEffect = new Text({ text: '', style: new TextStyle({ fontSize: 13, fill: 0xcccccc, wordWrap: true, wordWrapWidth: panelW - 30 }) });
    this.detailEffect.position.set(px + 15, py + 240);
    this.detailPanel.addChild(this.detailEffect);

    this.detailRarity = new Text({ text: '', style: new TextStyle({ fontSize: 12, fill: 0x888888 }) });
    this.detailRarity.position.set(px + 15, py + panelH - 30);
    this.detailPanel.addChild(this.detailRarity);

    // Close button
    const closeBtn = new Container();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    const closeText = new Text({ text: '✕', style: new TextStyle({ fontSize: 24, fill: 0xffffff }) });
    closeText.anchor.set(0.5);
    closeBtn.addChild(closeText);
    closeBtn.position.set(px + panelW - 20, py + 15);
    closeBtn.on('pointerdown', () => this.onDetailClose?.());
    this.detailPanel.addChild(closeBtn);

    this.addChild(this.detailPanel);
  }

  showStart(visible: boolean) {
    this.startScreen.visible = visible;
  }

  showGameOver(result: DuelResult) {
    this.gameOverScreen.visible = true;
    const win = result === DuelResult.Player1Win;
    this.gameOverTitle.text = win ? '🎉 勝利！' : '💀 敗北...';
    this.gameOverSub.text = win ? '恭喜你贏得了對戰！' : '對方獲得了勝利。';

    // Trigger result VFX
    if (vfxManager.isInitialized) {
      if (win) vfxManager.resultVFX.playVictory();
      else vfxManager.resultVFX.playDefeat();
    }
  }

  hideGameOver() {
    this.gameOverScreen.visible = false;
    if (vfxManager.isInitialized) vfxManager.resultVFX.cleanup();
  }

  showCardDetail(card: Card) {
    this.detailPanel.visible = true;
    const panelW = 320;
    const px = LOGICAL_W / 2 - panelW / 2;
    const py = LOGICAL_H / 2 - 225;

    const color = hexNum(getCardFrameColor(card));
    this.detailArt.clear();
    this.detailArt.roundRect(0, 0, panelW, 130, 10);
    this.detailArt.fill({ color, alpha: 0.3 });

    this.detailName.text = card.name;
    this.detailType.text = getCardTypeLabel(card);

    if (isMonster(card)) {
      const m = card as MonsterCard;
      this.detailStats.text = `ATK/${m.atk}  DEF/${m.def}`;
    } else {
      this.detailStats.text = '';
    }

    const mon = isMonster(card) ? card as MonsterCard : null;
    this.detailEffect.text = card.effectDescription || mon?.flavorText || '無效果描述';
    this.detailRarity.text = `稀有度: ${card.rarity}`;
  }

  hideCardDetail() {
    this.detailPanel.visible = false;
  }
}
