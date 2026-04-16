import { Application, Container } from 'pixi.js';
import { ParticlePool } from './ParticlePool';
import { CardVFX } from './CardVFX';
import { BattleVFX } from './BattleVFX';
import { LPVFX } from './LPVFX';
import { FieldVFX } from './FieldVFX';
import { TurnVFX } from './TurnVFX';
import { ChainVFX } from './ChainVFX';
import { ResultVFX } from './ResultVFX';

export class VFXManager {
  private app!: Application;
  private vfxLayer!: Container;
  pool!: ParticlePool;
  cardVFX!: CardVFX;
  battleVFX!: BattleVFX;
  lpVFX!: LPVFX;
  fieldVFX!: FieldVFX;
  turnVFX!: TurnVFX;
  chainVFX!: ChainVFX;
  resultVFX!: ResultVFX;
  private initialized = false;
  private tickFn: (() => void) | null = null;

  init(app: Application, stage: Container) {
    if (this.initialized) return;
    this.initialized = true;
    this.app = app;

    // Create a dedicated VFX layer on top of everything
    this.vfxLayer = new Container();
    this.vfxLayer.zIndex = 50;
    stage.addChild(this.vfxLayer);
    stage.sortChildren();

    this.pool = new ParticlePool(this.vfxLayer);
    this.cardVFX = new CardVFX(app, this.vfxLayer, this.pool);
    this.battleVFX = new BattleVFX(app, this.vfxLayer, this.pool);
    this.lpVFX = new LPVFX(app, this.vfxLayer, this.pool);
    this.fieldVFX = new FieldVFX(app, stage, this.pool); // Field goes on main stage (behind cards)
    this.turnVFX = new TurnVFX(app, this.vfxLayer, this.pool);
    this.chainVFX = new ChainVFX(app, this.vfxLayer, this.pool);
    this.resultVFX = new ResultVFX(app, this.vfxLayer, this.pool);

    // Update particle pool every frame
    this.tickFn = () => {
      const dt = this.app.ticker.deltaMS / 1000;
      this.pool.update(dt);
    };
    this.app.ticker.add(this.tickFn);
  }

  get isInitialized() { return this.initialized; }

  destroy() {
    if (!this.initialized) return;
    if (this.tickFn) this.app.ticker.remove(this.tickFn);
    this.pool.destroy();
    this.fieldVFX.destroy();
    this.resultVFX.cleanup();
    this.vfxLayer.destroy({ children: true });
    this.initialized = false;
  }
}

/** Singleton VFX manager */
export const vfxManager = new VFXManager();
