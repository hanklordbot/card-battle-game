import { Application, Container, Graphics } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

export type FieldTheme = 'none' | 'dark' | 'fire' | 'water' | 'wind' | 'earth';

interface ThemeConfig {
  bgColor: number;
  gridColor: number;
  particleColor: number;
  particleCount: number;
}

const THEMES: Record<Exclude<FieldTheme, 'none'>, ThemeConfig> = {
  dark:  { bgColor: 0x0d0015, gridColor: 0x9b59b6, particleColor: 0x9b59b6, particleCount: 30 },
  fire:  { bgColor: 0x1a0500, gridColor: 0xe74c3c, particleColor: 0xff6b00, particleCount: 35 },
  water: { bgColor: 0x001a1a, gridColor: 0x00bcd4, particleColor: 0x00bcd4, particleCount: 20 },
  wind:  { bgColor: 0x0a1628, gridColor: 0xf1c40f, particleColor: 0xf1c40f, particleCount: 25 },
  earth: { bgColor: 0x0a0a0f, gridColor: 0x95a5a6, particleColor: 0xc4a35a, particleCount: 15 },
};

export class FieldVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;
  private overlay: Graphics;
  private currentTheme: FieldTheme = 'none';
  private particleTimer = 0;
  private tickFn: (() => void) | null = null;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
    this.overlay = new Graphics();
    this.overlay.visible = false;
    // Insert at bottom of stage
    this.stage.addChildAt(this.overlay, 0);
  }

  /** Crossfade background tint/overlay for 5 themes */
  setFieldTheme(theme: FieldTheme): Promise<void> {
    return new Promise(resolve => {
      // Clean up previous
      if (this.tickFn) {
        this.app.ticker.remove(this.tickFn);
        this.tickFn = null;
      }

      if (theme === 'none') {
        this.overlay.visible = false;
        this.currentTheme = 'none';
        resolve();
        return;
      }

      const config = THEMES[theme];
      this.currentTheme = theme;
      this.overlay.visible = true;

      // Transition: fade in new overlay
      const dur = 1000;
      let elapsed = 0;

      // Flash
      const flash = new Graphics();
      flash.rect(0, 0, LOGICAL_W, LOGICAL_H);
      flash.fill({ color: 0xffffff, alpha: 0.4 });
      this.stage.addChild(flash);

      const transitionTick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = Math.min(elapsed / dur, 1);

        // Flash fade
        flash.alpha = 0.4 * Math.max(0, 1 - t * 3);

        // Overlay fade in
        this.overlay.clear();
        this.overlay.rect(0, 0, LOGICAL_W, LOGICAL_H);
        this.overlay.fill({ color: config.bgColor, alpha: 0.4 * t });

        if (t >= 1) {
          this.app.ticker.remove(transitionTick);
          this.stage.removeChild(flash);
          flash.destroy();
          this.startFieldParticles(config);
          resolve();
        }
      };
      this.app.ticker.add(transitionTick);
    });
  }

  private startFieldParticles(config: ThemeConfig) {
    this.particleTimer = 0;
    const interval = 1000 / (config.particleCount / 3); // spawn rate

    this.tickFn = () => {
      this.particleTimer += this.app.ticker.deltaMS;
      if (this.particleTimer >= interval) {
        this.particleTimer -= interval;
        const x = Math.random() * LOGICAL_W;
        const y = LOGICAL_H + 10;

        if (this.currentTheme === 'fire') {
          // Rising embers
          this.pool.spawn(x, y, (Math.random() - 0.5) * 20, -40 - Math.random() * 60, 2, 3, config.particleColor, 0, 1);
        } else if (this.currentTheme === 'water') {
          // Bubbles rising
          this.pool.spawn(x, y, (Math.random() - 0.5) * 10, -20 - Math.random() * 30, 3, 4, 0xffffff, 0, 2);
        } else if (this.currentTheme === 'dark') {
          // Spiral purple
          const angle = Math.random() * Math.PI * 2;
          const cx = LOGICAL_W / 2, cy = LOGICAL_H / 2;
          const r = 100 + Math.random() * 300;
          this.pool.spawn(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r,
            Math.cos(angle + 1.5) * 15, Math.sin(angle + 1.5) * 15, 3, 3, config.particleColor, 0, 1);
        } else if (this.currentTheme === 'wind') {
          // Gold dust floating
          this.pool.spawn(x, Math.random() * LOGICAL_H, 10 + Math.random() * 20, (Math.random() - 0.5) * 10, 3, 2, config.particleColor, 0, 1);
        } else if (this.currentTheme === 'earth') {
          // Electric sparks
          if (Math.random() < 0.3) {
            this.pool.spawn(Math.random() * LOGICAL_W, Math.random() * LOGICAL_H,
              (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 0.3, 2, 0x00d4ff, 0, 0);
          }
        }
      }
    };
    this.app.ticker.add(this.tickFn);
  }

  destroy() {
    if (this.tickFn) this.app.ticker.remove(this.tickFn);
    this.overlay.destroy();
  }
}
