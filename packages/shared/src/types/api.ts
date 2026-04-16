// === Auth ===
export interface LoginRequest { username: string; password: string }
export interface LoginResponse { accessToken: string; refreshToken: string; player: PlayerResponse }
export interface RegisterRequest { username: string; email: string; password: string; nickname: string }

// === Player ===
export interface PlayerResponse {
  id: string;
  username: string;
  nickname: string;
  level: number;
  eloRating: number;
  coins: number;
  gems: number;
}

// === Deck ===
export interface DeckResponse {
  id: string;
  name: string;
  mainDeck: string[];
  extraDeck: string[];
  sideDeck: string[];
  coverCard?: string;
  isValid: boolean;
}

export interface DeckCreateRequest {
  name: string;
  mainDeck: string[];
  extraDeck: string[];
  sideDeck: string[];
  coverCard?: string;
}

// === Battle History ===
export interface BattleHistoryResponse {
  id: string;
  mode: string;
  opponentNickname: string;
  result: 'win' | 'loss' | 'draw';
  eloChange: number;
  turnCount: number;
  durationSec: number;
  playedAt: string;
}
