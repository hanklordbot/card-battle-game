import { create } from 'zustand';

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityConfig {
  /** Canvas resolution multiplier (relative to devicePixelRatio) */
  resolutionScale: number;
  /** Enable antialiasing */
  antialias: boolean;
  /** Max active particles */
  maxParticles: number;
  /** Enable VFX screen shake */
  screenShake: boolean;
  /** Enable rarity glow effects */
  rarityGlow: boolean;
  /** Enable field theme ambient particles */
  fieldParticles: boolean;
  /** Enable continuous result VFX particles */
  resultParticles: boolean;
  /** Particle spawn rate multiplier (1 = full, 0.5 = half) */
  particleRate: number;
}

const QUALITY_PRESETS: Record<QualityTier, QualityConfig> = {
  low: {
    resolutionScale: 0.5,
    antialias: false,
    maxParticles: 80,
    screenShake: false,
    rarityGlow: false,
    fieldParticles: false,
    resultParticles: false,
    particleRate: 0.3,
  },
  medium: {
    resolutionScale: 0.75,
    antialias: false,
    maxParticles: 150,
    screenShake: true,
    rarityGlow: true,
    fieldParticles: true,
    resultParticles: true,
    particleRate: 0.6,
  },
  high: {
    resolutionScale: 1.0,
    antialias: true,
    maxParticles: 300,
    screenShake: true,
    rarityGlow: true,
    fieldParticles: true,
    resultParticles: true,
    particleRate: 1.0,
  },
};

const STORAGE_KEY = 'card-game-quality';

function loadTier(): QualityTier {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'low' || v === 'medium' || v === 'high') return v;
  } catch { /* ignore */ }
  return 'high';
}

interface QualityStoreState {
  tier: QualityTier;
  config: QualityConfig;
  setTier: (tier: QualityTier) => void;
}

export const useQualityStore = create<QualityStoreState>((set) => ({
  tier: loadTier(),
  config: QUALITY_PRESETS[loadTier()],
  setTier: (tier) => {
    try { localStorage.setItem(STORAGE_KEY, tier); } catch { /* ignore */ }
    set({ tier, config: QUALITY_PRESETS[tier] });
  },
}));

export function getQualityConfig(): QualityConfig {
  return useQualityStore.getState().config;
}
