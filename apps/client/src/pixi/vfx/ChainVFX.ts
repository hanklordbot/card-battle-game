import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

export class ChainVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;
  private chainContainer: Container | null = null;
  private edgeLines: Graphics | null = null;
  private counterContainer: Container | null = null;
  private counterText: Text | null = null;
  private chainLevel = 0;
  private pulseTick: (() => void) | null = null;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
  }

  /** Glowing number badge at chain position */
  showChainLink(number: number, pos: { x: number; y: number }): void {
    this.chainLevel = number;

    // Create chain container on first link
    if (!this.chainContainer) {
      this.chainContainer = new Container();
      this.chainContainer.zIndex = 90;
      this.stage.addChild(this.chainContainer);
      this.stage.sortChildren();
      this.startEdgeGlow();
    }

    // Badge at card position
    const badge = new Graphics();
    badge.circle(0, 0, 14);
    badge.fill({ color: this.getChainColor(number), alpha: 0.9 });
    badge.stroke({ color: 0xffffff, width: 1 });
    badge.position.set(pos.x + 30, pos.y - 40);
    this.chainContainer.addChild(badge);

    const numText = new Text({
      text: `${number}`,
      style: new TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: 'bold' }),
    });
    numText.anchor.set(0.5);
    numText.position.set(pos.x + 30, pos.y - 40);
    this.chainContainer.addChild(numText);

    // Scale bounce
    badge.scale.set(0.5);
    numText.scale.set(0.5);
    let elapsed = 0;
    const bounceTick = () => {
      elapsed += this.app.ticker.deltaMS;
      const t = Math.min(elapsed / 300, 1);
      const s = t < 0.6 ? 0.5 + 0.8 * (t / 0.6) : 1.3 - 0.3 * ((t - 0.6) / 0.4);
      badge.scale.set(s);
      numText.scale.set(s);
      if (t >= 1) this.app.ticker.remove(bounceTick);
    };
    this.app.ticker.add(bounceTick);

    // Update counter HUD
    this.updateCounter(number);

    // Screen shake for chain 2+
    if (number >= 2) {
      const intensity = Math.min(6, number * 1.5);
      const dur = Math.min(250, 50 + number * 50);
      let shakeElapsed = 0;
      const shakeTick = () => {
        shakeElapsed += this.app.ticker.deltaMS;
        const st = Math.min(shakeElapsed / dur, 1);
        if (st < 1) {
          const amt = intensity * (1 - st);
          this.stage.position.set((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt);
        } else {
          this.app.ticker.remove(shakeTick);
          this.stage.position.set(0, 0);
        }
      };
      this.app.ticker.add(shakeTick);
    }
  }

  /** Burst effect when chain resolves */
  chainResolve(): Promise<void> {
    return new Promise(resolve => {
      // Screen flash
      const flash = new Graphics();
      flash.rect(0, 0, LOGICAL_W, LOGICAL_H);
      flash.fill({ color: 0xffffff, alpha: 0.3 });
      this.stage.addChild(flash);

      // Resolve particles from edges toward center
      for (let i = 0; i < 40; i++) {
        const edge = Math.floor(Math.random() * 4);
        let px: number, py: number;
        if (edge === 0) { px = Math.random() * LOGICAL_W; py = 0; }
        else if (edge === 1) { px = LOGICAL_W; py = Math.random() * LOGICAL_H; }
        else if (edge === 2) { px = Math.random() * LOGICAL_W; py = LOGICAL_H; }
        else { px = 0; py = Math.random() * LOGICAL_H; }

        const dx = LOGICAL_W / 2 - px, dy = LOGICAL_H / 2 - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 200 + Math.random() * 200;
        const color = [0xa78bfa, 0x8b5cf6, 0xc4b5fd, 0xffffff][i % 4];
        this.pool.spawn(px, py, (dx / dist) * speed, (dy / dist) * speed, 0.6, 4, color, 0, 0);
      }

      const dur = 600;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);
        flash.alpha = 0.3 * (1 - t);

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.removeChild(flash);
          flash.destroy();
          this.cleanup();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  private getChainColor(level: number): number {
    if (level >= 5) return 0xd4a843;
    if (level >= 3) return 0xa78bfa;
    return 0x8b5cf6;
  }

  private startEdgeGlow() {
    this.edgeLines = new Graphics();
    this.edgeLines.zIndex = 90;
    this.stage.addChild(this.edgeLines);

    let elapsed = 0;
    this.pulseTick = () => {
      elapsed += this.app.ticker.deltaMS / 1000;
      if (!this.edgeLines) return;
      const period = Math.max(0.4, 1.5 - this.chainLevel * 0.2);
      const pulse = 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 / period));
      const w = Math.min(12, 4 + this.chainLevel * 2);
      const color = this.getChainColor(this.chainLevel);

      this.edgeLines.clear();
      // Top
      this.edgeLines.rect(0, 0, LOGICAL_W, w);
      this.edgeLines.fill({ color, alpha: pulse });
      // Bottom
      this.edgeLines.rect(0, LOGICAL_H - w, LOGICAL_W, w);
      this.edgeLines.fill({ color, alpha: pulse });
      // Left
      this.edgeLines.rect(0, 0, w, LOGICAL_H);
      this.edgeLines.fill({ color, alpha: pulse });
      // Right
      this.edgeLines.rect(LOGICAL_W - w, 0, w, LOGICAL_H);
      this.edgeLines.fill({ color, alpha: pulse });
    };
    this.app.ticker.add(this.pulseTick);
  }

  private updateCounter(level: number) {
    if (!this.counterContainer) {
      this.counterContainer = new Container();
      this.counterContainer.zIndex = 95;
      this.counterContainer.position.set(LOGICAL_W - 100, 60);
      this.stage.addChild(this.counterContainer);
      this.stage.sortChildren();

      const bg = new Graphics();
      bg.roundRect(-60, -24, 120, 48, 8);
      bg.fill({ color: 0x12142a, alpha: 0.85 });
      bg.stroke({ color: 0x8b5cf6, width: 2 });
      this.counterContainer.addChild(bg);

      const label = new Text({
        text: 'CHAIN',
        style: new TextStyle({ fontSize: 12, fill: 0x94a3b8 }),
      });
      label.anchor.set(0.5);
      label.position.set(-15, -5);
      this.counterContainer.addChild(label);

      this.counterText = new Text({
        text: `${level}`,
        style: new TextStyle({ fontSize: 32, fill: 0xa78bfa, fontWeight: 'bold' }),
      });
      this.counterText.anchor.set(0.5);
      this.counterText.position.set(30, 0);
      this.counterContainer.addChild(this.counterText);
    } else if (this.counterText) {
      this.counterText.text = `${level}`;
      (this.counterText.style as TextStyle).fill = this.getChainColor(level);
    }

    // Bounce animation
    this.counterContainer.scale.set(1.3);
    let elapsed = 0;
    const bounceTick = () => {
      elapsed += this.app.ticker.deltaMS;
      const t = Math.min(elapsed / 300, 1);
      this.counterContainer!.scale.set(1.3 - 0.3 * t);
      if (t >= 1) this.app.ticker.remove(bounceTick);
    };
    this.app.ticker.add(bounceTick);
  }

  private cleanup() {
    if (this.pulseTick) {
      this.app.ticker.remove(this.pulseTick);
      this.pulseTick = null;
    }
    if (this.edgeLines) {
      this.stage.removeChild(this.edgeLines);
      this.edgeLines.destroy();
      this.edgeLines = null;
    }
    if (this.chainContainer) {
      this.stage.removeChild(this.chainContainer);
      this.chainContainer.destroy({ children: true });
      this.chainContainer = null;
    }
    if (this.counterContainer) {
      this.stage.removeChild(this.counterContainer);
      this.counterContainer.destroy({ children: true });
      this.counterContainer = null;
      this.counterText = null;
    }
    this.chainLevel = 0;
  }
}
