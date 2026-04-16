import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

export class ResultVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;
  private resultContainer: Container | null = null;
  private continuousTick: (() => void) | null = null;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
  }

  /** Golden light rays + upward particles + screen glow */
  playVictory(): Promise<void> {
    return new Promise(resolve => {
      this.resultContainer = new Container();
      this.resultContainer.zIndex = 200;
      this.stage.addChild(this.resultContainer);
      this.stage.sortChildren();

      // White flash
      const flash = new Graphics();
      flash.rect(0, 0, LOGICAL_W, LOGICAL_H);
      flash.fill({ color: 0xffffff, alpha: 0.5 });
      this.resultContainer.addChild(flash);

      // Dark background
      const darken = new Graphics();
      darken.rect(0, 0, LOGICAL_W, LOGICAL_H);
      darken.fill({ color: 0x000000, alpha: 0 });
      this.resultContainer.addChild(darken);

      // Radial rays (simulated with lines)
      const rays = new Graphics();
      rays.position.set(LOGICAL_W / 2, LOGICAL_H / 2);
      rays.alpha = 0;
      this.resultContainer.addChild(rays);
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        rays.moveTo(0, 0);
        rays.lineTo(Math.cos(angle) * 800, Math.sin(angle) * 800);
        rays.stroke({ color: 0xd4a843, width: 20, alpha: 0.15 });
      }

      // Victory text
      const victoryText = new Text({
        text: 'VICTORY',
        style: new TextStyle({
          fontSize: 72, fill: 0xffd700, fontWeight: 'bold',
          letterSpacing: 8, fontFamily: 'serif',
        }),
      });
      victoryText.anchor.set(0.5);
      victoryText.position.set(LOGICAL_W / 2, 200);
      victoryText.scale.set(0.6);
      victoryText.alpha = 0;
      this.resultContainer.addChild(victoryText);

      // Gold glow behind text
      const textGlow = new Graphics();
      textGlow.circle(LOGICAL_W / 2, 400, 150);
      textGlow.fill({ color: 0xd4a843, alpha: 0 });
      this.resultContainer.addChild(textGlow);

      const dur = 4000;
      let elapsed = 0;
      let burstDone = false;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = elapsed;

        // 0-300ms: white flash fade
        if (t < 300) flash.alpha = 0.5 * (1 - t / 300);
        else flash.alpha = 0;

        // 300-500ms: darken
        if (t >= 300 && t < 500) darken.alpha = 0.7 * ((t - 300) / 200);
        else if (t >= 500) darken.alpha = 0.7;

        // 300-600ms: rays expand
        if (t >= 300 && t < 600) {
          const rt = (t - 300) / 300;
          rays.alpha = 0.15 * rt;
          rays.scale.set(rt * 1.5);
          rays.rotation += 0.005;
        } else if (t >= 600) {
          rays.rotation += 0.003;
        }

        // 500-1000ms: text drop with elastic
        if (t >= 500 && t < 1000) {
          const tt = (t - 500) / 500;
          victoryText.alpha = tt;
          const elastic = 1 - Math.pow(2, -10 * tt) * Math.cos(tt * Math.PI * 3);
          victoryText.y = 200 + 200 * elastic;
          victoryText.scale.set(0.6 + 0.4 * Math.min(tt * 1.5, 1));
          textGlow.alpha = 0.2 * tt;
        } else if (t >= 1000) {
          victoryText.y = 400 + Math.sin(t / 500) * 3;
        }

        // 500ms: particle burst
        if (t >= 500 && !burstDone) {
          burstDone = true;
          for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 * i) / 60;
            const speed = 150 + Math.random() * 350;
            const color = [0xffd700, 0xf5d77a, 0xd4a843, 0xffffff][i % 4];
            this.pool.spawn(LOGICAL_W / 2, LOGICAL_H / 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 2, 6, color, 20, 0);
          }
        }

        // Screen shake 500-800ms
        if (t >= 500 && t < 800) {
          const st = (t - 500) / 300;
          const amt = 8 * (1 - st);
          this.stage.position.set((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt);
        } else {
          this.stage.position.set(0, 0);
        }

        // Continuous upward particles after 800ms
        if (t >= 800 && Math.random() < 0.15) {
          const px = Math.random() * LOGICAL_W;
          const color = [0xffd700, 0xf5d77a, 0xd4a843][Math.floor(Math.random() * 3)];
          this.pool.spawn(px, LOGICAL_H + 10, (Math.random() - 0.5) * 20, -40 - Math.random() * 60, 3, 4, color, 0, 0);
        }

        if (t >= dur) {
          this.app.ticker.remove(tick);
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Grayscale tint + falling debris particles + crack overlay */
  playDefeat(): Promise<void> {
    return new Promise(resolve => {
      this.resultContainer = new Container();
      this.resultContainer.zIndex = 200;
      this.stage.addChild(this.resultContainer);
      this.stage.sortChildren();

      // Red flash
      const flash = new Graphics();
      flash.rect(0, 0, LOGICAL_W, LOGICAL_H);
      flash.fill({ color: 0xdc2626, alpha: 0.3 });
      this.resultContainer.addChild(flash);

      // Dark overlay
      const darken = new Graphics();
      darken.rect(0, 0, LOGICAL_W, LOGICAL_H);
      darken.fill({ color: 0x0a0000, alpha: 0 });
      this.resultContainer.addChild(darken);

      // Crack overlay (simulated with lines)
      const cracks = new Graphics();
      cracks.alpha = 0;
      this.resultContainer.addChild(cracks);
      const cx = LOGICAL_W / 2, cy = LOGICAL_H / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
        let px = cx, py = cy;
        for (let j = 0; j < 5; j++) {
          const nx = px + Math.cos(angle + (Math.random() - 0.5) * 0.8) * (60 + Math.random() * 40);
          const ny = py + Math.sin(angle + (Math.random() - 0.5) * 0.8) * (60 + Math.random() * 40);
          cracks.moveTo(px, py);
          cracks.lineTo(nx, ny);
          cracks.stroke({ color: 0xdc2626, width: 2, alpha: 0.12 });
          px = nx; py = ny;
        }
      }

      // Defeat text
      const defeatText = new Text({
        text: 'DEFEAT',
        style: new TextStyle({
          fontSize: 72, fill: 0xdc2626, fontWeight: 'bold',
          letterSpacing: 8, fontFamily: 'serif',
        }),
      });
      defeatText.anchor.set(0.5);
      defeatText.position.set(LOGICAL_W / 2, LOGICAL_H / 2);
      defeatText.alpha = 0;
      this.resultContainer.addChild(defeatText);

      const dur = 3500;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = elapsed;

        // 0-150ms: red flash
        if (t < 150) flash.alpha = 0.3 * (1 - t / 150);
        else flash.alpha = 0;

        // 150-400ms: darken
        if (t >= 150 && t < 400) darken.alpha = 0.75 * ((t - 150) / 250);
        else if (t >= 400) darken.alpha = 0.75;

        // 300-700ms: cracks appear
        if (t >= 300 && t < 700) cracks.alpha = 0.12 * ((t - 300) / 400);
        else if (t >= 700) cracks.alpha = 0.12;

        // 500-900ms: text with shake
        if (t >= 500 && t < 900) {
          const tt = (t - 500) / 400;
          defeatText.alpha = tt;
          defeatText.x = LOGICAL_W / 2 + (Math.random() - 0.5) * 6 * (1 - tt);
          defeatText.scale.set(1.05 - 0.05 * tt);
        } else if (t >= 900) {
          defeatText.x = LOGICAL_W / 2;
          // Breathing
          defeatText.alpha = 0.85 + 0.15 * Math.sin(t / 2000);
        }

        // Falling ash particles after 800ms
        if (t >= 800 && Math.random() < 0.1) {
          const px = Math.random() * LOGICAL_W;
          const color = [0xdc2626, 0x991b1b, 0x7f1d1d][Math.floor(Math.random() * 3)];
          this.pool.spawn(px, -10, (Math.random() - 0.5) * 10 + Math.sin(t / 500) * 5,
            20 + Math.random() * 40, 4, 5, color, 5, 2);
        }

        if (t >= dur) {
          this.app.ticker.remove(tick);
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Clean up result VFX */
  cleanup() {
    if (this.continuousTick) {
      this.app.ticker.remove(this.continuousTick);
      this.continuousTick = null;
    }
    if (this.resultContainer) {
      this.stage.removeChild(this.resultContainer);
      this.resultContainer.destroy({ children: true });
      this.resultContainer = null;
    }
  }
}
