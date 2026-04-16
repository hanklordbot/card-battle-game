// === WebSocket Message Envelope ===
export interface WSMessage<T = unknown> {
  type: string;
  seq: number;
  ts: number;
  payload: T;
}

// === Client → Server Events ===
export interface MatchJoinPayload { mode: 'ranked' | 'friendly' | 'ai'; deckId: string }
export interface BattleActionPayload { action: string; params: Record<string, unknown> }
export interface BattleSurrenderPayload {}
export interface ChainResponsePayload { cardId?: string; targets?: string[] }

// === Server → Client Events ===
export interface MatchFoundPayload { opponentInfo: { nickname: string; eloRating: number }; battleId: string }
export interface BattleInitPayload { fullState: unknown }
export interface StateDeltaPayload { changes: StateChange[] }
export interface PhaseChangePayload { phase: string; turnPlayer: string }
export interface BattleResultPayload { winner: string; reason: string; rewards?: unknown }
export interface TimerPayload { remaining: number; type: 'turn' | 'chain' }
export interface BattleErrorPayload { code: string; message: string }

export type StateChange =
  | { type: 'card_moved'; cardInstanceId: string; from: string; to: string }
  | { type: 'lp_changed'; playerId: string; newLp: number; delta: number }
  | { type: 'phase_changed'; phase: string; turnPlayer: string }
  | { type: 'turn_changed'; turnPlayer: string; turnCount: number }
  | { type: 'hand_count_changed'; playerId: string; count: number }
  | { type: 'deck_count_changed'; playerId: string; count: number };

// === Event Type Constants ===
export const WS_EVENTS = {
  // Client → Server
  MATCH_JOIN: 'match:join',
  MATCH_CANCEL: 'match:cancel',
  BATTLE_ACTION: 'battle:action',
  BATTLE_SURRENDER: 'battle:surrender',
  // Server → Client
  MATCH_FOUND: 'match:found',
  BATTLE_INIT: 'battle:init',
  BATTLE_STATE_DELTA: 'battle:state_delta',
  BATTLE_PHASE_CHANGE: 'battle:phase_change',
  BATTLE_TURN_CHANGE: 'battle:turn_change',
  BATTLE_RESULT: 'battle:result',
  BATTLE_TIMER: 'battle:timer',
  BATTLE_CHAIN_PROMPT: 'battle:chain_prompt',
  BATTLE_RECONNECT: 'battle:reconnect',
  BATTLE_ERROR: 'battle:error',
} as const;
