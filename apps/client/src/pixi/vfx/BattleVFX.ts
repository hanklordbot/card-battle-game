import { Application, Container, Graphics } from 'pixi.js';
import { ParticlePool } from './ParticlePool';

export class BattleVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
  }

  /** Slash line + speed lines (0.3s) */
  attackDeclare(from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
    return new Promise(resolve => {
      const line = new Graphics();
      this.stage.addChild(line);

      const dur = 300;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        line.clear();
        // Main slash line
        const cx = from.x + (to.x - from.x) * t;
        const cy = from.y + (to.y - from.y) * t;
        line.moveTo(from.x, from.y);
        line.lineTo(cx, cy);
        line.stroke({ color: 0xff4444, width: 3, alpha: 0.9 * (1 - t * 0.5) });

        // Speed lines
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len, ny = dx / len;
        for (let i = 0; i < 3; i++) {
          const off = (i - 1) * 15;
          const alpha = 0.3 * (1 - t);
          line.moveTo(from.x + nx * off, from.y + ny * off);
          line.lineTo(cx + nx * off, cy + ny * off);
          line.stroke({ color: 0xff6b6b, width: 1, alpha });
        }

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.removeChild(line);
          line.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Impact flash + shockwave ring (0.2s) */
  attackHit(pos: { x: number; y: number }): Promise<void> {
    return new Promise(resolve => {
      const flash = new Graphics();
      flash.position.set(pos.x, pos.y);
      this.stage.addChild(flash);

      const ring = new Graphics();
      ring.position.set(pos.x, pos.y);
      this.stage.addChild(ring);

      // Impact particles
      for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = 150 + Math.random() * 150;
        const color = [0xffffff, 0xffd43b, 0xff6b6b][i % 3];
        this.pool.spawn(pos.x, pos.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.4, 4, color, 0, 1);
      }

      const dur = 250;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        // Flash circle
        flash.clear();
        const r = 5 + 55 * t;
        flash.circle(0, 0, r);
        flash.fill({ color: 0xffffff, alpha: 0.8 * (1 - t) });

        // Shockwave ring
        ring.clear();
        const ringR = 10 + 70 * t;
        ring.circle(0, 0, ringR);
        ring.stroke({ color: 0xff6b6b, width: 4 - 3 * t, alpha: 0.8 * (1 - t) });

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.removeChild(flash);
          this.stage.removeChild(ring);
          flash.destroy();
          ring.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Shatter particles flying outward (0.5s) */
  monsterDestroy(pos: { x: number; y: number }): Promise<void> {
    return new Promise(resolve => {
      // White flash
      const flash = new Graphics();
      flash.rect(pos.x - 50, pos.y - 70, 100, 140);
      flash.fill({ color: 0xffffff, alpha: 0.9 });
      this.stage.addChild(flash);

      // Shatter fragments as particles
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
        const speed = 100 + Math.random() * 150;
        const color = [0xffd43b, 0xff6b6b, 0xbb86fc, 0x00d4ff][i % 4];
        this.pool.spawn(pos.x + (Math.random() - 0.5) * 60, pos.y + (Math.random() - 0.5) * 80,
          Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5 + Math.random() * 0.2, 5, color, 300, 1);
      }

      // Residual energy dots
      for (let i = 0; i < 8; i++) {
        this.pool.spawn(pos.x + (Math.random() - 0.5) * 40, pos.y,
          (Math.random() - 0.5) * 20, -30 - Math.random() * 30, 0.6, 3, 0xffd43b, 0, 1);
      }

      const dur = 500;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);
        flash.alpha = Math.max(0, 1 - t * 5); // Quick fade

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.removeChild(flash);
          flash.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Screen flash + large impact (0.4s) */
  directAttack(targetSide: 'player' | 'opponent'): Promise<void> {
    return new Promise(resolve => {
      const screenFlash = new Graphics();
      screenFlash.rect(0, 0, 1920, 1080);
      screenFlash.fill({ color: 0xff0000, alpha: 0.3 });
      this.stage.addChild(screenFlash);

      const impactY = targetSide === 'opponent' ? 200 : 880;
      const impact = new Graphics();
      impact.position.set(960, impactY);
      this.stage.addChild(impact);

      // Large burst particles
      for (let i = 0; i < 25; i++) {
        const angle = (Math.PI * 2 * i) / 25;
        const speed = 200 + Math.random() * 200;
        this.pool.spawn(960, impactY, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5, 5, 0xff4444, 0, 1);
      }

      const dur = 400;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        screenFlash.alpha = 0.3 * (1 - t);

        impact.clear();
        const r = 20 + 80 * t;
        impact.circle(0, 0, r);
        impact.fill({ color: 0xff4444, alpha: 0.6 * (1 - t) });

        // Screen shake
        if (t < 0.75) {
          const shakeAmt = 8 * (1 - t / 0.75);
          this.stage.position.set((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
        } else {
          this.stage.position.set(0, 0);
        }

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.position.set(0, 0);
          this.stage.removeChild(screenFlash);
          this.stage.removeChild(impact);
          screenFlash.destroy();
          impact.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Screen shake utility */
  screenShake(intensity: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      let elapsed = 0;
      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / duration, 1);
        if (t < 1) {
          const amt = intensity * (1 - t);
          this.stage.position.set((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt);
        } else {
          this.app.ticker.remove(tick);
          this.stage.position.set(0, 0);
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }
}
