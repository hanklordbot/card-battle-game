import { Card, SpellSpeed, getSpellSpeed } from './card';

export const MAX_CHAIN_LENGTH = 16;

export enum ChainError {
  ChainFull = 'chain_full',
  SpeedTooLow = 'speed_too_low',
  SameCardAlreadyInChain = 'same_card_already_in_chain',
  ChainEmpty = 'chain_empty',
}

export interface ChainLink {
  card: Card;
  activatingPlayer: 0 | 1;
  spellSpeed: SpellSpeed;
  effectIndex: number; // which effect on the card
}

export interface ChainResolveResult {
  link: ChainLink;
  index: number; // original chain position (for logging)
}

export class Chain {
  private stack: ChainLink[] = [];

  get length(): number {
    return this.stack.length;
  }

  get isEmpty(): boolean {
    return this.stack.length === 0;
  }

  get currentSpellSpeed(): SpellSpeed | null {
    if (this.stack.length === 0) return null;
    return this.stack[this.stack.length - 1].spellSpeed;
  }

  /**
   * Check if a card can be added to the chain.
   */
  canAdd(card: Card): { allowed: true } | { allowed: false; error: ChainError } {
    if (this.stack.length >= MAX_CHAIN_LENGTH) {
      return { allowed: false, error: ChainError.ChainFull };
    }

    const speed = getSpellSpeed(card);

    // Speed 1 cards can only start a chain (chain link 1)
    if (this.stack.length > 0 && speed < (this.currentSpellSpeed ?? 1)) {
      return { allowed: false, error: ChainError.SpeedTooLow };
    }

    // Speed 1 cannot respond to anything
    if (this.stack.length > 0 && speed === SpellSpeed.Speed1) {
      return { allowed: false, error: ChainError.SpeedTooLow };
    }

    // Same card cannot be in the chain twice
    if (this.stack.some(link => link.card.id === card.id)) {
      return { allowed: false, error: ChainError.SameCardAlreadyInChain };
    }

    return { allowed: true };
  }

  /**
   * Add a card effect to the chain.
   */
  add(card: Card, activatingPlayer: 0 | 1, effectIndex: number = 0): ChainError | null {
    const check = this.canAdd(card);
    if (!check.allowed) return check.error;

    this.stack.push({
      card,
      activatingPlayer,
      spellSpeed: getSpellSpeed(card),
      effectIndex,
    });

    return null;
  }

  /**
   * Resolve the chain in reverse order (LIFO).
   * Returns links in resolution order (last added → first added).
   */
  resolve(): ChainResolveResult[] {
    if (this.stack.length === 0) return [];

    const results: ChainResolveResult[] = [];
    for (let i = this.stack.length - 1; i >= 0; i--) {
      results.push({ link: this.stack[i], index: i + 1 });
    }

    this.stack = [];
    return results;
  }

  /**
   * Get the current chain state (read-only view).
   */
  getLinks(): readonly ChainLink[] {
    return this.stack;
  }

  /**
   * Clear the chain without resolving.
   */
  clear(): void {
    this.stack = [];
  }
}
