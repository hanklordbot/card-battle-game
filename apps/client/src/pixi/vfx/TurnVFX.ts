import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { LOGICAL_W, LOGICAL_H } from '../PixiApp';

export class TurnVFX {
  private app: Application;
  private stage: Container;
  private pool: ParticlePool;

  constructor(app: Application, stage: Container, pool: ParticlePool) {
    this.app = app;
    this.stage = stage;
    this.pool = pool;
  }

  /** Banner slides in from side, holds 1s, slides out. Returns promise. */
  playTurnBanner(isMyTurn: boolean): Promise<void> {
    return new Promise(resolve => {
      const bannerContainer = new Container();
      bannerContainer.zIndex = 102;
      this.stage.addChild(bannerContainer);
      this.stage.sortChildren();

      // Dark overlay
      const overlay = new Graphics();
      overlay.rect(0, 0, LOGICAL_W, LOGICAL_H);
      overlay.fill({ color: 0x000000, alpha: 0 });
      bannerContainer.addChild(overlay);

      // Banner body
      const banner = new Graphics();
      const bannerY = LOGICAL_H / 2 - 60;
      banner.rect(0, 0, LOGICAL_W, 120);
      banner.fill({ color: isMyTurn ? 0x12142a : 0x1a1e3e, alpha: 0.9 });
      // Top/bottom lines
      banner.rect(0, 0, LOGICAL_W, 3);
      banner.fill({ color: isMyTurn ? 0xd4a843 : 0x8b5cf6 });
      banner.rect(0, 117, LOGICAL_W, 3);
      banner.fill({ color: isMyTurn ? 0xd4a843 : 0x8b5cf6 });
      banner.position.set(LOGICAL_W, bannerY); // Start offscreen right
      bannerContainer.addChild(banner);

      // Title text
      const title = new Text({
        text: isMyTurn ? '我的回合' : '對方回合',
        style: new TextStyle({
          fontSize: 48, fill: isMyTurn ? 0xf5d77a : 0xa78bfa,
          fontWeight: 'bold', fontFamily: 'Noto Sans TC, sans-serif', letterSpacing: 12,
        }),
      });
      title.anchor.set(0.5);
      title.position.set(LOGICAL_W / 2, 50);
      banner.addChild(title);

      // Subtitle
      const subtitle = new Text({
        text: isMyTurn ? 'MY TURN' : "OPPONENT'S TURN",
        style: new TextStyle({
          fontSize: 20, fill: isMyTurn ? 0xd4a843 : 0x8b5cf6,
          fontWeight: 'bold', letterSpacing: 6,
        }),
      });
      subtitle.anchor.set(0.5);
      subtitle.position.set(LOGICAL_W / 2, 90);
      banner.addChild(subtitle);

      // Animation phases: slide in (300ms) -> hold (1000ms) -> slide out (300ms) -> fade overlay (200ms)
      const totalDur = 2000;
      let elapsed = 0;
      const colors = isMyTurn ? [0xf5d77a, 0xd4a843, 0xffffff] : [0xa78bfa, 0x8b5cf6, 0xffffff];

      const tick = () => {
        elapsed += this.app.ticker.deltaMS;
        const t = elapsed;

        // Overlay fade
        if (t < 200) overlay.alpha = (t / 200) * 0.6;
        else if (t > totalDur - 200) overlay.alpha = 0.6 * (1 - (t - (totalDur - 200)) / 200);
        else overlay.alpha = 0.6;

        // Banner slide
        if (t < 300) {
          // Slide in: ease-out-quad
          const st = t / 300;
          const ease = 1 - (1 - st) * (1 - st);
          banner.x = LOGICAL_W * (1 - ease);
        } else if (t < 1300) {
          banner.x = 0;
          // Spawn particles during hold
          if (Math.random() < 0.3) {
            const side = Math.random() < 0.5;
            const px = side ? Math.random() * LOGICAL_W : Math.random() * LOGICAL_W;
            const py = bannerY + (side ? 0 : 120);
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.pool.spawn(px, py, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60, 0.8, 3, color, 0, 0);
          }
        } else if (t < 1600) {
          // Slide out: ease-in-quad
          const st = (t - 1300) / 300;
          const ease = st * st;
          banner.x = -LOGICAL_W * ease;
        } else {
          banner.x = -LOGICAL_W;
        }

        if (t >= totalDur) {
          this.app.ticker.remove(tick);
          this.stage.removeChild(bannerContainer);
          bannerContainer.destroy({ children: true });
          resolve();
        }
      };
      this.app.ticker.add(tick);
    });
  }
}
