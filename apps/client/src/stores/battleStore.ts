import { create } from 'zustand';
import {
  DuelState, createDuelState, Phase, DuelResult, INITIAL_LP,
  drawCard, drawInitialHands, advancePhase, dealDamage, healLP,
  shuffleDeck, getDiscardCount, discardFromHand, executeDrawPhase,
} from '../core/duel';
import { executeBattle, executeDirectAttack, BattleResult } from '../core/battle';
import { normalSummon, setMonster, flipSummon, SummonError } from '../core/summon';
import { Card, FieldCard, Position, isMonster, MonsterCard, CardType, getTributeCount } from '../core/card';
import { buildTestDeck } from '../data/cards';
import { gameAudio } from '../audio';

export interface GameLog {
  turn: number;
  phase: string;
  player: 0 | 1;
  message: string;
}

interface BattleStoreState {
  duel: DuelState | null;
  logs: GameLog[];
  gameStarted: boolean;
  startGame: () => void;
  doDrawPhase: () => void;
  doAdvancePhase: () => void;
  doNormalSummon: (handIndex: number, position: 'atk' | 'def', tributeIndices?: number[]) => string | null;
  doFlipSummon: (zoneIndex: number) => string | null;
  doAttack: (attackerZone: number, defenderZone: number) => BattleResult | null;
  doDirectAttack: (attackerZone: number) => number | null;
  doSetSpellTrap: (handIndex: number) => boolean;
  doDiscard: (handIndex: number) => boolean;
  addLog: (message: string) => void;
  getDuel: () => DuelState;
}

function checkGameResult(duel: DuelState) {
  if (duel.result === DuelResult.Player1Win) gameAudio.playVictorySequence();
  else if (duel.result === DuelResult.Player2Win) gameAudio.playDefeatSequence();
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  duel: null,
  logs: [],
  gameStarted: false,

  startGame: () => {
    const deck1 = buildTestDeck();
    const deck2 = buildTestDeck();
    const duel = createDuelState(deck1, deck2);
    shuffleDeck(duel.players[0]);
    shuffleDeck(duel.players[1]);
    drawInitialHands(duel);
    // 🔊 Audio: battle BGM + draw cards
    gameAudio.playBattleBGM();
    for (let i = 0; i < 5; i++) setTimeout(() => gameAudio.drawCard(), i * 150);
    set({ duel: { ...duel }, gameStarted: true, logs: [{ turn: 1, phase: 'start', player: 0, message: '對戰開始！雙方各抽5張手牌。' }] });
  },

  doDrawPhase: () => {
    const duel = get().duel;
    if (!duel || duel.phase !== Phase.Draw) return;
    const success = executeDrawPhase(duel);
    const tp = duel.turnPlayer;
    if (!success) {
      get().addLog(`玩家${tp === 0 ? '我方' : '對方'}牌庫耗盡，敗北！`);
      checkGameResult(duel);
    } else {
      get().addLog(`${tp === 0 ? '我方' : '對方'}抽了1張牌。`);
      gameAudio.drawCard(); // 🔊
    }
    set({ duel: { ...duel } });
  },

  doAdvancePhase: () => {
    const duel = get().duel;
    if (!duel || duel.result !== DuelResult.Ongoing) return;
    const oldTurn = duel.turnCount;
    advancePhase(duel);
    if (duel.turnCount !== oldTurn) {
      // 🔊 Turn change
      if (duel.turnPlayer === 0) gameAudio.turnStartMine();
      else gameAudio.turnStartOpponent();
      get().addLog(`回合 ${duel.turnCount} 開始，${duel.turnPlayer === 0 ? '我方' : '對方'}回合。`);
    } else {
      gameAudio.phaseChange(); // 🔊
    }
    set({ duel: { ...duel } });
  },

  doNormalSummon: (handIndex, position, tributeIndices = []) => {
    const duel = get().duel;
    if (!duel) return 'no duel';
    const card = duel.players[duel.turnPlayer].hand[handIndex];
    const hasTributes = tributeIndices.length > 0;
    const pos = position === 'atk' ? Position.FaceUpAttack : Position.FaceDownDefense;
    const result = normalSummon(duel, duel.turnPlayer, handIndex, pos, tributeIndices);
    if (!result.success) return result.error;

    // 🔊 Audio
    if (position === 'def') {
      gameAudio.setCard();
    } else if (hasTributes) {
      gameAudio.tributeSummon();
      // Boss BGM for 7+ star
      if (isMonster(card) && (card as MonsterCard).level >= 7) {
        gameAudio.triggerBossBGM(duel.players[0].lp, duel.players[1].lp);
      }
    } else {
      gameAudio.normalSummon();
    }

    const placed = duel.players[duel.turnPlayer].monsterZone.find(s => s !== null)?.card;
    get().addLog(`${duel.turnPlayer === 0 ? '我方' : '對方'}${position === 'atk' ? '召喚' : '蓋放'}了「${placed?.name ?? '怪獸'}」。`);
    set({ duel: { ...duel } });
    return null;
  },

  doFlipSummon: (zoneIndex) => {
    const duel = get().duel;
    if (!duel) return 'no duel';
    const result = flipSummon(duel, duel.turnPlayer, zoneIndex);
    if (!result.success) return result.error;
    gameAudio.flipCard(); // 🔊
    set({ duel: { ...duel } });
    return null;
  },

  doAttack: (attackerZone, defenderZone) => {
    const duel = get().duel;
    if (!duel) return null;
    gameAudio.attackDeclare(); // 🔊
    const result = executeBattle(duel, duel.turnPlayer, attackerZone, defenderZone);
    if (result) {
      gameAudio.attackHit(); // 🔊
      if (result.defenderDestroyed) { gameAudio.monsterDestroy(); get().addLog(`對方怪獸被破壞！`); }
      if (result.attackerDestroyed) { gameAudio.monsterDestroy(); get().addLog(`我方怪獸被破壞！`); }
      if (result.damageToDefender > 0) {
        gameAudio.lpDamage(result.damageToDefender); // 🔊
        get().addLog(`對方受到 ${result.damageToDefender} 點戰鬥傷害！`);
      }
      if (result.damageToAttacker > 0) {
        gameAudio.lpDamage(result.damageToAttacker); // 🔊
        gameAudio.attackReflect();
        get().addLog(`我方受到 ${result.damageToAttacker} 點戰鬥傷害！`);
      }
      // 🔊 Check LP-based BGM switch
      gameAudio.checkBattleBGM(duel.players[0].lp, duel.players[1].lp);
      checkGameResult(duel);
    }
    set({ duel: { ...duel } });
    return result;
  },

  doDirectAttack: (attackerZone) => {
    const duel = get().duel;
    if (!duel) return null;
    gameAudio.attackDeclare(); // 🔊
    const damage = executeDirectAttack(duel, duel.turnPlayer, attackerZone);
    if (damage !== null) {
      gameAudio.directAttack(); // 🔊
      gameAudio.lpDamage(damage); // 🔊
      get().addLog(`直接攻擊！造成 ${damage} 點傷害！`);
      gameAudio.checkBattleBGM(duel.players[0].lp, duel.players[1].lp);
      checkGameResult(duel);
    }
    set({ duel: { ...duel } });
    return damage;
  },

  doSetSpellTrap: (handIndex) => {
    const duel = get().duel;
    if (!duel) return false;
    const player = duel.players[duel.turnPlayer];
    if (handIndex < 0 || handIndex >= player.hand.length) return false;
    const card = player.hand[handIndex];
    if (card.cardType !== CardType.Spell && card.cardType !== CardType.Trap) return false;
    const emptyIdx = player.spellTrapZone.findIndex(s => s === null);
    if (emptyIdx === -1) return false;
    player.hand.splice(handIndex, 1);
    player.spellTrapZone[emptyIdx] = {
      card, position: Position.FaceDownDefense, canAttack: false,
      canChangePosition: false, turnPlaced: duel.turnCount, hasAttackedThisTurn: false,
    };
    gameAudio.setCard(); // 🔊
    get().addLog(`${duel.turnPlayer === 0 ? '我方' : '對方'}蓋放了1張魔法/陷阱卡。`);
    set({ duel: { ...duel } });
    return true;
  },

  doDiscard: (handIndex) => {
    const duel = get().duel;
    if (!duel) return false;
    const result = discardFromHand(duel, duel.turnPlayer, handIndex);
    if (result) {
      gameAudio.discard(); // 🔊
      set({ duel: { ...duel } });
    }
    return result;
  },

  addLog: (message) => {
    const duel = get().duel;
    set(state => ({
      logs: [...state.logs, {
        turn: duel?.turnCount ?? 0,
        phase: duel?.phase ?? '',
        player: duel?.turnPlayer ?? 0,
        message,
      }],
    }));
  },

  getDuel: () => get().duel!,
}));
