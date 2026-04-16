import { Card, FieldCard, Position } from '../models/card';

// === Phase / Turn Enums ===

export enum Phase {
  Draw = 'draw',
  Standby = 'standby',
  Main1 = 'main1',
  Battle = 'battle',
  Main2 = 'main2',
  End = 'end',
}

export enum BattleStep {
  Start = 'start',
  Battle = 'battle',
  Damage = 'damage',
  End = 'end',
}

export enum DuelResult {
  Ongoing = 'ongoing',
  Player1Win = 'player1_win',
  Player2Win = 'player2_win',
  Draw = 'draw',
}

// === Constants ===

export const INITIAL_LP = 8000;
export const INITIAL_HAND_SIZE = 5;
export const HAND_LIMIT = 6;
export const MONSTER_ZONE_SIZE = 5;
export const SPELL_TRAP_ZONE_SIZE = 5;
export const TURN_TIME_LIMIT = 180;
export const CHAIN_RESPONSE_TIME = 15;
export const MAX_TIMEOUT_COUNT = 3;

// === Player State ===

export interface PlayerState {
  lp: number;
  hand: Card[];
  deck: Card[];
  monsterZone: (FieldCard | null)[];
  spellTrapZone: (FieldCard | null)[];
  fieldSpell: FieldCard | null;
  graveyard: Card[];
  banished: Card[];
  extraDeck: Card[];
  normalSummonUsed: boolean;
  timeoutCount: number;
}

export function createPlayerState(mainDeck: Card[], extraDeck: Card[] = []): PlayerState {
  return {
    lp: INITIAL_LP,
    hand: [],
    deck: [...mainDeck],
    monsterZone: Array(MONSTER_ZONE_SIZE).fill(null),
    spellTrapZone: Array(SPELL_TRAP_ZONE_SIZE).fill(null),
    fieldSpell: null,
    graveyard: [],
    banished: [],
    extraDeck: [...extraDeck],
    normalSummonUsed: false,
    timeoutCount: 0,
  };
}

// === Duel State ===

export interface DuelState {
  players: [PlayerState, PlayerState];
  turnPlayer: 0 | 1; // index
  turnCount: number;
  phase: Phase;
  battleStep: BattleStep | null;
  result: DuelResult;
  firstTurn: boolean; // true if this is the very first turn of the duel
}

export function createDuelState(deck1: Card[], deck2: Card[], extraDeck1: Card[] = [], extraDeck2: Card[] = []): DuelState {
  return {
    players: [createPlayerState(deck1, extraDeck1), createPlayerState(deck2, extraDeck2)],
    turnPlayer: 0,
    turnCount: 1,
    phase: Phase.Draw,
    battleStep: null,
    result: DuelResult.Ongoing,
    firstTurn: true,
  };
}

// === LP Management ===

export function dealDamage(state: DuelState, playerIndex: 0 | 1, amount: number): void {
  state.players[playerIndex].lp = Math.max(0, state.players[playerIndex].lp - amount);
  if (state.players[playerIndex].lp <= 0) {
    state.result = playerIndex === 0 ? DuelResult.Player2Win : DuelResult.Player1Win;
  }
}

export function healLP(state: DuelState, playerIndex: 0 | 1, amount: number): void {
  state.players[playerIndex].lp += amount;
}

// === Draw ===

export function drawCard(state: DuelState, playerIndex: 0 | 1, count: number = 1): boolean {
  const player = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      // Deck out — this player loses
      state.result = playerIndex === 0 ? DuelResult.Player2Win : DuelResult.Player1Win;
      return false;
    }
    player.hand.push(player.deck.shift()!);
  }
  return true;
}

// === Shuffle ===

export function shuffleDeck(player: PlayerState): void {
  const deck = player.deck;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// === Draw Initial Hands ===

export function drawInitialHands(state: DuelState): void {
  drawCard(state, 0, INITIAL_HAND_SIZE);
  drawCard(state, 1, INITIAL_HAND_SIZE);
}

// === Phase Transitions ===

const PHASE_ORDER: Phase[] = [Phase.Draw, Phase.Standby, Phase.Main1, Phase.Battle, Phase.Main2, Phase.End];

export function advancePhase(state: DuelState): void {
  if (state.result !== DuelResult.Ongoing) return;

  const currentIndex = PHASE_ORDER.indexOf(state.phase);

  // Skip battle phase on first turn
  if (state.phase === Phase.Main1 && state.firstTurn) {
    state.phase = Phase.Main2;
    return;
  }

  if (state.phase === Phase.End) {
    endTurn(state);
    return;
  }

  // Enter battle phase → set battle step
  if (state.phase === Phase.Main1) {
    state.phase = Phase.Battle;
    state.battleStep = BattleStep.Start;
    return;
  }

  // Leave battle phase
  if (state.phase === Phase.Battle) {
    state.battleStep = null;
    state.phase = Phase.Main2;
    return;
  }

  state.phase = PHASE_ORDER[currentIndex + 1];
}

export function advanceBattleStep(state: DuelState): void {
  if (state.phase !== Phase.Battle || state.battleStep === null) return;

  switch (state.battleStep) {
    case BattleStep.Start:
      state.battleStep = BattleStep.Battle;
      break;
    case BattleStep.Battle:
      state.battleStep = BattleStep.Damage;
      break;
    case BattleStep.Damage:
      // After damage, can attack again or end
      state.battleStep = BattleStep.Battle;
      break;
    case BattleStep.End:
      // Transition out of battle phase handled by advancePhase
      break;
  }
}

export function endBattlePhase(state: DuelState): void {
  if (state.phase === Phase.Battle) {
    state.battleStep = BattleStep.End;
  }
}

function endTurn(state: DuelState): void {
  const player = state.players[state.turnPlayer];

  // Discard to hand limit
  // (In real game, player chooses which to discard; here we just track the requirement)

  // Reset per-turn flags
  player.normalSummonUsed = false;
  for (const slot of player.monsterZone) {
    if (slot) {
      slot.hasAttackedThisTurn = false;
      slot.canChangePosition = true;
    }
  }

  // Switch turn
  state.turnPlayer = state.turnPlayer === 0 ? 1 : 0;
  state.turnCount++;
  state.phase = Phase.Draw;
  state.battleStep = null;
  state.firstTurn = false;
}

// === Discard to hand limit ===

export function getDiscardCount(state: DuelState, playerIndex: 0 | 1): number {
  return Math.max(0, state.players[playerIndex].hand.length - HAND_LIMIT);
}

export function discardFromHand(state: DuelState, playerIndex: 0 | 1, handIndex: number): boolean {
  const player = state.players[playerIndex];
  if (handIndex < 0 || handIndex >= player.hand.length) return false;
  const [card] = player.hand.splice(handIndex, 1);
  player.graveyard.push(card);
  return true;
}

// === Execute Draw Phase ===

export function executeDrawPhase(state: DuelState): boolean {
  if (state.phase !== Phase.Draw) return false;
  return drawCard(state, state.turnPlayer);
}
