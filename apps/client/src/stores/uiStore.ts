import { create } from 'zustand';
import { Card } from '../core/card';

export type UIMode = 'idle' | 'summon_select' | 'attack_select' | 'target_select' | 'set_select';

interface UIStoreState {
  mode: UIMode;
  selectedHandIndex: number | null;
  selectedMonsterZone: number | null;
  hoveredCard: Card | null;
  detailCard: Card | null;
  showDetail: boolean;
  message: string | null;
  messageTimeout: number | null;

  setMode: (mode: UIMode) => void;
  selectHand: (index: number | null) => void;
  selectMonsterZone: (index: number | null) => void;
  setHoveredCard: (card: Card | null) => void;
  showCardDetail: (card: Card) => void;
  hideCardDetail: () => void;
  showMessage: (msg: string, duration?: number) => void;
  clearMessage: () => void;
  reset: () => void;
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  mode: 'idle',
  selectedHandIndex: null,
  selectedMonsterZone: null,
  hoveredCard: null,
  detailCard: null,
  showDetail: false,
  message: null,
  messageTimeout: null,

  setMode: (mode) => set({ mode }),
  selectHand: (index) => set({ selectedHandIndex: index }),
  selectMonsterZone: (index) => set({ selectedMonsterZone: index }),
  setHoveredCard: (card) => set({ hoveredCard: card }),
  showCardDetail: (card) => set({ detailCard: card, showDetail: true }),
  hideCardDetail: () => set({ showDetail: false, detailCard: null }),
  showMessage: (msg, duration = 2000) => {
    const prev = get().messageTimeout;
    if (prev) clearTimeout(prev);
    const timeout = window.setTimeout(() => set({ message: null, messageTimeout: null }), duration);
    set({ message: msg, messageTimeout: timeout });
  },
  clearMessage: () => set({ message: null }),
  reset: () => set({ mode: 'idle', selectedHandIndex: null, selectedMonsterZone: null, hoveredCard: null, showDetail: false, detailCard: null }),
}));
