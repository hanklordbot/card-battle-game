import { Sprite, Container, Graphics, RenderTexture, Application } from 'pixi.js';
import { getQualityConfig } from '../../stores/qualityStore';

export interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  gravity: number;
  active: boolean;
  /** @deprecated alias for backward compat — returns sprite */
  gfx: Sprite;
}

/** Shared circle texture generated once, reused by all particles. */
let sharedCircleTex: RenderTexture | null = null;

function getCircleTexture(app: Application): RenderTexture {
  if (sharedCircleTex) return sharedCircleTex;
  const g = new Graphics();
  g.circle(0, 0, 8);
  g.fill({ color: 0xffffff });
  sharedCircleTex = RenderTexture.create({ width: 16, height: 16 });
  app.renderer.render({ container: g, target: sharedCircleTex });
  g.destroy();
  return sharedCircleTex;
}

export class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private container: Container;
  private maxParticles: number;

  constructor(parent: Container, app?: Application) {
    this.container = new Container();
    parent.addChild(this.container);

    const qc = getQualityConfig();
    this.maxParticles = qc.maxParticles;

    // Pre-allocate sprite-based particles
    for (let i = 0; i < this.maxParticles; i++) {
      let sprite: Sprite;
      if (app && sharedCircleTex === null) getCircleTexture(app);
      if (sharedCircleTex) {
        sprite = new Sprite(sharedCircleTex);
      } else {
        // Fallback: use a simple white sprite
        sprite = new Sprite();
      }
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      const p: Particle = {
        sprite, vx: 0, vy: 0, life: 0, maxLife: 1,
        startSize: 4, endSize: 0, gravity: 0, active: false,
        get gfx() { return this.sprite; },
      };
      this.pool.push(p);
    }
  }

  /** Initialize shared texture (call after app.renderer is ready) */
  initTexture(app: Application) {
    const tex = getCircleTexture(app);
    for (const p of this.pool) {
      if (!p.sprite.texture || p.sprite.texture === Sprite.from('').texture) {
        p.sprite.texture = tex;
      }
    }
  }

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: number, gravity = 0, endSize = 0): Particle | null {
    if (this.active.length >= this.maxParticles) return null;
    const p = this.pool.find(p => !p.active);
    if (!p) return null;

    p.sprite.position.set(x, y);
    p.sprite.tint = color;
    p.sprite.alpha = 1;
    p.sprite.scale.set(size / 8); // 8 = base circle radius in texture
    p.sprite.visible = true;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.startSize = size;
    p.endSize = endSize;
    p.gravity = gravity;
    p.active = true;
    this.active.push(p);
    return p;
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        this.active.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      const t = 1 - p.life / p.maxLife;
      p.sprite.alpha = 1 - t;
      const s = p.startSize + (p.endSize - p.startSize) * t;
      p.sprite.scale.set(Math.max(0.01, s / 8));
    }
  }

  clear() {
    for (const p of this.active) {
      p.active = false;
      p.sprite.visible = false;
    }
    this.active.length = 0;
  }

  get activeCount() { return this.active.length; }

  destroy() {
    this.clear();
    this.container.destroy({ children: true });
  }
}
