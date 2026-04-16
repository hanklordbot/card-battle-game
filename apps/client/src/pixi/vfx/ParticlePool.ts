import { Graphics, Container } from 'pixi.js';

const MAX_PARTICLES = 300;

export interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  gravity: number;
  active: boolean;
}

export class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private container: Container;

  constructor(parent: Container) {
    this.container = new Container();
    parent.addChild(this.container);
    // Pre-allocate
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const gfx = new Graphics();
      gfx.circle(0, 0, 4);
      gfx.fill({ color: 0xffffff });
      gfx.visible = false;
      this.container.addChild(gfx);
      this.pool.push({ gfx, vx: 0, vy: 0, life: 0, maxLife: 1, startSize: 4, endSize: 0, gravity: 0, active: false });
    }
  }

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: number, gravity = 0, endSize = 0): Particle | null {
    if (this.active.length >= MAX_PARTICLES) return null;
    const p = this.pool.find(p => !p.active);
    if (!p) return null;
    p.gfx.clear();
    p.gfx.circle(0, 0, size);
    p.gfx.fill({ color });
    p.gfx.position.set(x, y);
    p.gfx.alpha = 1;
    p.gfx.scale.set(1);
    p.gfx.visible = true;
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
        p.gfx.visible = false;
        this.active.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      const t = 1 - p.life / p.maxLife;
      p.gfx.alpha = 1 - t;
      const s = p.startSize + (p.endSize - p.startSize) * t;
      p.gfx.scale.set(Math.max(0.01, s / p.startSize));
    }
  }

  clear() {
    for (const p of this.active) {
      p.active = false;
      p.gfx.visible = false;
    }
    this.active.length = 0;
  }

  get activeCount() { return this.active.length; }

  destroy() {
    this.clear();
    this.container.destroy({ children: true });
  }
}
