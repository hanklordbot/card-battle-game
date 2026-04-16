/**
 * AudioManager — Web Audio API based audio system.
 * Three-bus mixing: BGM, SFX, UI.
 * BGM crossfade support. Preload management by strategy.
 * Placeholder mode: logs to console when audio files are missing.
 */

export type BusName = 'bgm' | 'sfx' | 'ui' | 'ambient';

interface AudioAsset {
  id: string;
  bus: BusName;
  loop: boolean;
  loopStart?: number;
  loopEnd?: number;
  buffer: AudioBuffer | null;
}

interface VolumeSettings {
  master: number;
  bgm: number;
  sfx: number;
  ui: number;
  muted: boolean;
}

const STORAGE_KEY = 'card-game-audio-settings';
const DEFAULT_SETTINGS: VolumeSettings = { master: 0.8, bgm: 1.0, sfx: 1.0, ui: 1.0, muted: false };

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private busGains: Record<BusName, GainNode | null> = { bgm: null, sfx: null, ui: null, ambient: null };
  private assets = new Map<string, AudioAsset>();
  private settings: VolumeSettings;

  // BGM crossfade state
  private currentBgm: { source: AudioBufferSourceNode; gain: GainNode; id: string } | null = null;
  private bgmFading = false;

  // SFX pool tracking
  private activeSfx: AudioBufferSourceNode[] = [];
  private readonly maxSfx = 8;

  constructor() {
    this.settings = this.loadSettings();
  }

  /** Must be called after a user gesture (click) to unlock AudioContext. */
  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    for (const bus of ['bgm', 'sfx', 'ui', 'ambient'] as BusName[]) {
      const gain = this.ctx.createGain();
      gain.connect(this.masterGain);
      this.busGains[bus] = gain;
    }

    this.applySettings();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.init();
    return this.ctx!;
  }

  // === Asset Loading ===

  /** Register an asset (without loading the actual audio data yet). */
  register(id: string, bus: BusName, loop: boolean, loopStart?: number, loopEnd?: number): void {
    this.assets.set(id, { id, bus, loop, loopStart, loopEnd, buffer: null });
  }

  /** Load audio file for a registered asset. Falls back to placeholder if fetch fails. */
  async load(id: string, url: string): Promise<void> {
    const asset = this.assets.get(id);
    if (!asset) return;
    const ctx = this.ensureCtx();
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      asset.buffer = await ctx.decodeAudioData(arrayBuf);
    } catch {
      // Placeholder: generate a short silent buffer
      asset.buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      console.log(`[AudioManager] Placeholder for "${id}" (file not found, using silence)`);
    }
  }

  /** Batch load by strategy. */
  async loadByStrategy(strategy: string[], basePath: string): Promise<void> {
    await Promise.all(strategy.map(id => this.load(id, `${basePath}/${id}.wav`)));
  }

  // === BGM ===

  /** Play BGM with optional crossfade from current. */
  playBGM(id: string, crossfadeDuration = 2.0): void {
    const asset = this.assets.get(id);
    if (!asset) { console.log(`[AudioManager] BGM play: ${id} (not registered)`); return; }
    if (this.currentBgm?.id === id) return; // already playing

    const ctx = this.ensureCtx();
    const busGain = this.busGains.bgm;
    if (!busGain || !asset.buffer) {
      console.log(`[AudioManager] BGM play: ${id} (no buffer)`);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = asset.buffer;
    source.loop = asset.loop;
    if (asset.loopStart !== undefined) source.loopStart = asset.loopStart;
    if (asset.loopEnd !== undefined) source.loopEnd = asset.loopEnd;

    const fadeGain = ctx.createGain();
    fadeGain.connect(busGain);

    // Crossfade out old BGM
    if (this.currentBgm) {
      const old = this.currentBgm;
      old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + crossfadeDuration);
      setTimeout(() => { try { old.source.stop(); } catch {} }, crossfadeDuration * 1000 + 100);
    }

    // Fade in new BGM
    fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + crossfadeDuration);

    source.connect(fadeGain);
    source.start(0);

    this.currentBgm = { source, gain: fadeGain, id };
    console.log(`[AudioManager] BGM playing: ${id}`);
  }

  /** Hard-cut stop current BGM (for victory/defeat). */
  stopBGM(): void {
    if (this.currentBgm) {
      try { this.currentBgm.source.stop(); } catch {}
      this.currentBgm = null;
    }
  }

  get currentBgmId(): string | null {
    return this.currentBgm?.id ?? null;
  }

  // === SFX / UI ===

  /** Play a one-shot sound effect. */
  playSFX(id: string, playbackRate = 1.0): void {
    const asset = this.assets.get(id);
    if (!asset) { console.log(`[AudioManager] SFX: ${id} (not registered)`); return; }

    const ctx = this.ensureCtx();
    const busGain = this.busGains[asset.bus];
    if (!busGain || !asset.buffer) {
      console.log(`[AudioManager] SFX: ${id} (no buffer)`);
      return;
    }

    // Evict oldest if pool full
    if (this.activeSfx.length >= this.maxSfx) {
      const oldest = this.activeSfx.shift();
      try { oldest?.stop(); } catch {}
    }

    const source = ctx.createBufferSource();
    source.buffer = asset.buffer;
    source.loop = asset.loop;
    source.playbackRate.value = playbackRate;
    if (asset.loopStart !== undefined) source.loopStart = asset.loopStart;
    if (asset.loopEnd !== undefined) source.loopEnd = asset.loopEnd;
    source.connect(busGain);
    source.start(0);

    this.activeSfx.push(source);
    source.onended = () => {
      const idx = this.activeSfx.indexOf(source);
      if (idx !== -1) this.activeSfx.splice(idx, 1);
    };
  }

  /** Stop all active SFX (for victory/defeat hard cut). */
  stopAllSFX(): void {
    for (const s of this.activeSfx) { try { s.stop(); } catch {} }
    this.activeSfx = [];
  }

  // === Volume Control ===

  getSettings(): VolumeSettings {
    return { ...this.settings };
  }

  setMasterVolume(v: number): void {
    this.settings.master = Math.max(0, Math.min(1, v));
    this.applySettings();
    this.saveSettings();
  }

  setBusVolume(bus: 'bgm' | 'sfx' | 'ui', v: number): void {
    this.settings[bus] = Math.max(0, Math.min(1, v));
    this.applySettings();
    this.saveSettings();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applySettings();
    this.saveSettings();
  }

  toggleMute(): void {
    this.setMuted(!this.settings.muted);
  }

  private applySettings(): void {
    const effective = this.settings.muted ? 0 : this.settings.master;
    if (this.masterGain) this.masterGain.gain.value = effective;
    if (this.busGains.bgm) this.busGains.bgm.gain.value = this.settings.bgm;
    if (this.busGains.sfx) this.busGains.sfx.gain.value = this.settings.sfx;
    if (this.busGains.ui) this.busGains.ui.gain.value = this.settings.sfx; // UI shares SFX volume
    if (this.busGains.ambient) this.busGains.ambient.gain.value = this.settings.bgm * 0.5;
  }

  private loadSettings(): VolumeSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch {}
  }

  // === Lifecycle ===

  /** Suspend audio context (e.g., tab hidden). */
  suspend(): void { this.ctx?.suspend(); }

  /** Resume audio context (e.g., tab visible). */
  resume(): void { this.ctx?.resume(); }
}

/** Global singleton */
export const audioManager = new AudioManager();
