import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { Rarity } from '../../core/card';

function easeOutBack(t: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class CardVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
  }

  /** White flash + scale bounce (0.3s) */
  normalSummon(card: Container, pos: { x: number; y: number }): Promise<void> {
    return new Promise(resolve => {
      const flash = new Graphics();
      flash.rect(-50, -70, 100, 140);
      flash.fill({ color: 0xffffff, alpha: 0.8 });
      flash.position.set(pos.x, pos.y);
      this.stage.addChild(flash);

      const origSX = card.scale.x, origSY = card.scale.y;
      const dur = 300;
      let elapsed = 0;

      // Burst particles
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const speed = 80 + Math.random() * 70;
        this.pool.spawn(pos.x, pos.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5, 3, 0xffffff, 0, 1);
      }

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        // Flash fade
        flash.alpha = 1 - t;

        // Scale bounce
        const s = easeOutBack(t);
        const scale = t < 0.5 ? 1 + 0.3 * (t / 0.5) : 1 + 0.3 * (1 - (t - 0.5) / 0.5);
        card.scale.set(origSX * scale, origSY * scale);

        if (t >= 1) {
          this.app.ticker.remove(tick);
          card.scale.set(origSX, origSY);
          this.stage.removeChild(flash);
          flash.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Purple pillar + shockwave (0.8s) */
  tributeSummon(card: Container, pos: { x: number; y: number }): Promise<void> {
    return new Promise(resolve => {
      const pillar = new Graphics();
      this.stage.addChild(pillar);

      const ring = new Graphics();
      ring.position.set(pos.x, pos.y);
      this.stage.addChild(ring);

      const dur = 800;
      let elapsed = 0;

      // Purple particles
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 60 + Math.random() * 90;
        this.pool.spawn(pos.x, pos.y, Math.cos(angle) * speed, Math.sin(angle) * speed - 40, 0.7, 4, 0x8b5cf6, 20, 1);
      }

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        // Pillar grows then fades
        const pillarH = 300 * Math.min(t * 3, 1);
        const pillarAlpha = t < 0.3 ? t / 0.3 * 0.8 : 0.8 * (1 - (t - 0.3) / 0.7);
        pillar.clear();
        pillar.rect(pos.x - 30, pos.y - pillarH, 60, pillarH);
        pillar.fill({ color: 0x8b5cf6, alpha: Math.max(0, pillarAlpha) });

        // Shockwave ring
        const ringR = 80 * t;
        const ringAlpha = 0.6 * (1 - t);
        ring.clear();
        ring.circle(0, 0, ringR);
        ring.stroke({ color: 0x8b5cf6, width: 3 - 2 * t, alpha: Math.max(0, ringAlpha) });

        // Scale bounce
        const origSX = 1, origSY = 1;
        if (t < 0.4) {
          const bt = t / 0.4;
          card.scale.set(1 + 0.3 * easeOutBack(bt));
        } else if (t < 0.6) {
          card.scale.set(1.3 - 0.3 * ((t - 0.4) / 0.2));
        } else {
          card.scale.set(1);
        }

        if (t >= 1) {
          this.app.ticker.remove(tick);
          card.scale.set(origSX, origSY);
          this.stage.removeChild(pillar);
          this.stage.removeChild(ring);
          pillar.destroy();
          ring.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** scaleX cos flip animation (0.4s) */
  flipSummon(card: Container): Promise<void> {
    return new Promise(resolve => {
      const dur = 400;
      let elapsed = 0;
      const origSX = card.scale.x;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);
        // Flip: scaleX goes 1 -> 0 -> 1
        card.scale.x = origSX * Math.abs(Math.cos(Math.PI * t));

        if (t >= 1) {
          this.app.ticker.remove(tick);
          card.scale.x = origSX;
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Rarity glow effects - continuous. Returns cleanup function. */
  rarityGlow(card: Container, rarity: Rarity): (() => void) | null {
    if (rarity === Rarity.N) return null;

    const overlay = new Graphics();
    card.addChild(overlay);
    let elapsed = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      elapsed += this.app.ticker.deltaMS / 1000;

      overlay.clear();
      const w = card.width / card.scale.x;
      const h = card.height / card.scale.y;

      if (rarity === Rarity.R) {
        // Silver shimmer sweep
        const cycle = 3;
        const phase = (elapsed % cycle) / cycle;
        const sweepX = phase * (w + 40) - 20;
        overlay.rect(sweepX - 10, 0, 20, h);
        overlay.fill({ color: 0xd9dbe0, alpha: 0.3 * Math.max(0, 1 - Math.abs(phase - 0.5) * 4) });
      } else if (rarity === Rarity.SR) {
        // Rainbow cycle
        const hue = (elapsed * 60) % 360;
        const color = hslToHex(hue, 0.5, 0.7);
        overlay.rect(0, 0, w, h);
        overlay.fill({ color, alpha: 0.1 });
        // Border glow
        overlay.rect(0, 0, w, h);
        overlay.stroke({ color, width: 2, alpha: 0.4 });
      } else if (rarity === Rarity.UR) {
        // Rainbow border + orbiting particles
        const hue = (elapsed * 60) % 360;
        const color = hslToHex(hue, 0.7, 0.6);
        overlay.rect(0, 0, w, h);
        overlay.stroke({ color, width: 2, alpha: 0.6 });
        // Holographic base
        overlay.rect(0, 0, w, h);
        overlay.fill({ color: hslToHex((hue + 180) % 360, 0.4, 0.7), alpha: 0.08 });
      }
    };

    this.app.ticker.add(tick);

    return () => {
      stopped = true;
      this.app.ticker.remove(tick);
      card.removeChild(overlay);
      overlay.destroy();
    };
  }

  /** 3D flip: animate scaleX from 1→0→1 with card face swap at midpoint */
  flip3D(card: Container, onMidpoint?: () => void): Promise<void> {
    return new Promise(resolve => {
      const dur = 500;
      let elapsed = 0;
      const origSX = card.scale.x;
      let midpointFired = false;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        if (t <= 0.5) {
          // First half: scale down
          const ht = t / 0.5;
          card.scale.x = origSX * (1 - ht);
        } else {
          if (!midpointFired) {
            midpointFired = true;
            onMidpoint?.();
          }
          // Second half: scale up
          const ht = (t - 0.5) / 0.5;
          card.scale.x = origSX * ht;
        }

        if (t >= 1) {
          this.app.ticker.remove(tick);
          card.scale.x = origSX;
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }
}

function hslToHex(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return (ri << 16) | (gi << 8) | bi;
}
