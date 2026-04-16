import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

export class LPVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;
  private vignetteOverlay: Graphics | null = null;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
  }

  /** Screen shake + floating damage number + red flash */
  lpDamage(amount: number, playerSide: 'player' | 'opponent'): Promise<void> {
    return new Promise(resolve => {
      // Red flash overlay
      const flash = new Graphics();
      flash.rect(0, 0, LOGICAL_W, LOGICAL_H);
      flash.fill({ color: 0xff0000, alpha: amount >= 3000 ? 0.25 : 0.15 });
      this.stage.addChild(flash);

      // Floating damage text
      const textX = playerSide === 'player' ? 120 : 120;
      const textY = playerSide === 'player' ? LOGICAL_H - 160 : 80;
      const dmgText = new Text({
        text: `-${amount}`,
        style: new TextStyle({ fontSize: 28, fill: 0xff4444, fontWeight: 'bold', fontFamily: 'monospace' }),
      });
      dmgText.anchor.set(0.5);
      dmgText.position.set(textX, textY);
      dmgText.scale.set(1.2);
      this.stage.addChild(dmgText);

      // Shake params based on damage
      let shakeIntensity: number, shakeDur: number;
      if (amount < 500) { shakeIntensity = 2; shakeDur = 150; }
      else if (amount < 1500) { shakeIntensity = 4; shakeDur = 250; }
      else if (amount < 3000) { shakeIntensity = 6; shakeDur = 350; }
      else { shakeIntensity = 10; shakeDur = 500; }

      const dur = 1000;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        // Flash fade
        flash.alpha = (amount >= 3000 ? 0.25 : 0.15) * Math.max(0, 1 - t * 3);

        // Floating text
        dmgText.y = textY - 40 * t;
        dmgText.scale.set(1.2 - 0.4 * t);
        dmgText.alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

        // Screen shake
        const shakeT = Math.min(elapsed / shakeDur, 1);
        if (shakeT < 1) {
          const amt = shakeIntensity * (1 - shakeT);
          this.stage.position.set((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt);
        } else {
          this.stage.position.set(0, 0);
        }

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.position.set(0, 0);
          this.stage.removeChild(flash);
          this.stage.removeChild(dmgText);
          flash.destroy();
          dmgText.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Green glow + floating heal number */
  lpHeal(amount: number, playerSide: 'player' | 'opponent'): Promise<void> {
    return new Promise(resolve => {
      const textX = playerSide === 'player' ? 120 : 120;
      const textY = playerSide === 'player' ? LOGICAL_H - 160 : 80;

      // Green glow
      const glow = new Graphics();
      glow.rect(0, 0, LOGICAL_W, LOGICAL_H);
      glow.fill({ color: 0x51cf66, alpha: 0.1 });
      this.stage.addChild(glow);

      // Floating heal text
      const healText = new Text({
        text: `+${amount}`,
        style: new TextStyle({ fontSize: 28, fill: 0x51cf66, fontWeight: 'bold', fontFamily: 'monospace' }),
      });
      healText.anchor.set(0.5);
      healText.position.set(textX, textY);
      this.stage.addChild(healText);

      // Green particles
      for (let i = 0; i < 12; i++) {
        this.pool.spawn(textX + (Math.random() - 0.5) * 100, textY + 20,
          (Math.random() - 0.5) * 20, -40 - Math.random() * 40, 1.5, 4, 0x51cf66, 0, 1);
      }

      const dur = 1000;
      let elapsed = 0;

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        glow.alpha = 0.1 * (1 - t);
        healText.y = textY - 40 * t;
        healText.alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

        if (t >= 1) {
          this.app.ticker.remove(tick);
          this.stage.removeChild(glow);
          this.stage.removeChild(healText);
          glow.destroy();
          healText.destroy();
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }

  /** Dark vignette overlay when LP < 2000. Call with current LP to update. */
  lowHPVignette(lp: number) {
    if (lp >= 4000) {
      // Remove vignette
      if (this.vignetteOverlay) {
        this.stage.removeChild(this.vignetteOverlay);
        this.vignetteOverlay.destroy();
        this.vignetteOverlay = null;
      }
      return;
    }

    if (!this.vignetteOverlay) {
      this.vignetteOverlay = new Graphics();
      this.stage.addChild(this.vignetteOverlay);
    }

    // Determine intensity based on LP
    let alpha: number;
    if (lp > 2000) alpha = 0.15;
    else if (lp > 800) alpha = 0.35;
    else alpha = 0.55;

    this.vignetteOverlay.clear();

    // Simulate vignette with concentric rects at edges
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const inset = t * 200;
      const a = alpha * (1 - t);
      this.vignetteOverlay.rect(inset, inset, LOGICAL_W - inset * 2, LOGICAL_H - inset * 2);
      this.vignetteOverlay.stroke({ color: 0x1a0000, width: 200 / steps, alpha: a });
    }
    // Dark corners
    this.vignetteOverlay.rect(0, 0, LOGICAL_W, LOGICAL_H);
    this.vignetteOverlay.fill({ color: 0x000000, alpha: alpha * 0.3 });
  }
}
