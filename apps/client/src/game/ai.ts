import { DuelState, Phase, DuelResult, advancePhase, executeDrawPhase } from '../core/duel';
import { normalSummon, SummonError } from '../core/summon';
import { executeBattle, executeDirectAttack } from '../core/battle';
import { Card, isMonster, MonsterCard, Position, CardType, getTributeCount } from '../core/card';
import { useBattleStore } from '../stores/battleStore';

/**
 * Simple AI: plays as player 1 (opponent).
 * Strategy: summon strongest monster, attack with all available monsters.
 */
export function runAITurn(): void {
  const store = useBattleStore.getState();
  const duel = store.duel;
  if (!duel || duel.turnPlayer !== 1 || duel.result !== DuelResult.Ongoing) return;

  const delay = 400;
  let step = 0;

  function next(fn: () => void) {
    setTimeout(() => {
      fn();
      // Force re-render
      useBattleStore.setState({ duel: { ...useBattleStore.getState().duel! } });
    }, delay * ++step);
  }

  // Draw Phase
  next(() => {
    const d = useBattleStore.getState().duel!;
    if (d.phase === Phase.Draw) {
      executeDrawPhase(d);
      store.addLog('對方抽了1張牌。');
    }
  });

  // Advance to Standby
  next(() => { advancePhase(useBattleStore.getState().duel!); });
  // Advance to Main1
  next(() => { advancePhase(useBattleStore.getState().duel!); });

  // Main Phase 1: Try to summon strongest monster
  next(() => {
    const d = useBattleStore.getState().duel!;
    const hand = d.players[1].hand;
    // Find summonable monsters (level 4 or less for simplicity)
    const summonable = hand
      .map((c, i) => ({ card: c, index: i }))
      .filter(({ card }) => isMonster(card) && (card as MonsterCard).level <= 4)
      .sort((a, b) => (b.card as MonsterCard).atk - (a.card as MonsterCard).atk);

    if (summonable.length > 0 && !d.players[1].normalSummonUsed) {
      const best = summonable[0];
      const result = normalSummon(d, 1, best.index, Position.FaceUpAttack);
      if (result.success) {
        store.addLog(`對方召喚了「${best.card.name}」！`);
      }
    }

    // Try tribute summon if we have tributes and high-level monsters
    if (!d.players[1].normalSummonUsed) {
      const highLevel = hand
        .map((c, i) => ({ card: c, index: i }))
        .filter(({ card }) => isMonster(card) && (card as MonsterCard).level >= 5)
        .sort((a, b) => (b.card as MonsterCard).atk - (a.card as MonsterCard).atk);

      if (highLevel.length > 0) {
        const monster = highLevel[0].card as MonsterCard;
        const needed = getTributeCount(monster.level);
        const tributes = d.players[1].monsterZone
          .map((s, i) => ({ slot: s, index: i }))
          .filter(({ slot }) => slot !== null)
          .sort((a, b) => (a.slot!.card as MonsterCard).atk - (b.slot!.card as MonsterCard).atk)
          .slice(0, needed)
          .map(({ index }) => index);

        if (tributes.length >= needed) {
          const result = normalSummon(d, 1, highLevel[0].index, Position.FaceUpAttack, tributes);
          if (result.success) {
            store.addLog(`對方祭品召喚了「${monster.name}」！`);
          }
        }
      }
    }

    // Set spell/trap if any
    const spellTrap = hand.findIndex(c => c.cardType === CardType.Spell || c.cardType === CardType.Trap);
    if (spellTrap !== -1) {
      const emptyIdx = d.players[1].spellTrapZone.findIndex(s => s === null);
      if (emptyIdx !== -1) {
        const card = d.players[1].hand.splice(spellTrap, 1)[0];
        d.players[1].spellTrapZone[emptyIdx] = {
          card, position: Position.FaceDownDefense, canAttack: false,
          canChangePosition: false, turnPlaced: d.turnCount, hasAttackedThisTurn: false,
        };
        store.addLog('對方蓋放了1張卡片。');
      }
    }
  });

  // Advance to Battle Phase (skip if first turn)
  next(() => { advancePhase(useBattleStore.getState().duel!); });

  // Battle Phase: Attack with all available monsters
  next(() => {
    const d = useBattleStore.getState().duel!;
    if (d.phase !== Phase.Battle) return;

    const myMonsters = d.players[1].monsterZone
      .map((s, i) => ({ slot: s, index: i }))
      .filter(({ slot }) => slot !== null && slot.position === Position.FaceUpAttack && !slot.hasAttackedThisTurn);

    const oppMonsters = d.players[0].monsterZone
      .map((s, i) => ({ slot: s, index: i }))
      .filter(({ slot }) => slot !== null);

    for (const attacker of myMonsters) {
      if (d.result !== DuelResult.Ongoing) break;

      if (oppMonsters.length > 0) {
        // Attack weakest opponent monster
        const target = oppMonsters
          .filter(({ slot }) => slot !== null)
          .sort((a, b) => {
            const aCard = a.slot!.card as MonsterCard;
            const bCard = b.slot!.card as MonsterCard;
            return aCard.atk - bCard.atk;
          })[0];
        if (target && target.slot) {
          const result = executeBattle(d, 1, attacker.index, target.index);
          if (result) {
            if (result.defenderDestroyed) store.addLog(`對方的攻擊破壞了我方怪獸！`);
            if (result.damageToDefender > 0) store.addLog(`我方受到 ${result.damageToDefender} 點傷害！`);
            if (result.attackerDestroyed) store.addLog(`對方的怪獸被反擊破壞！`);
            if (result.damageToAttacker > 0) store.addLog(`對方受到 ${result.damageToAttacker} 點反擊傷害！`);
            // Remove destroyed from list
            if (result.defenderDestroyed) {
              const idx = oppMonsters.findIndex(m => m.index === target.index);
              if (idx !== -1) oppMonsters.splice(idx, 1);
            }
          }
        }
      } else {
        // Direct attack
        const damage = executeDirectAttack(d, 1, attacker.index);
        if (damage !== null) {
          store.addLog(`對方直接攻擊！我方受到 ${damage} 點傷害！`);
        }
      }
    }
  });

  // Advance to Main2
  next(() => { advancePhase(useBattleStore.getState().duel!); });
  // Advance to End
  next(() => { advancePhase(useBattleStore.getState().duel!); });
  // End turn (advance from End → next player's Draw)
  next(() => {
    const d = useBattleStore.getState().duel!;
    advancePhase(d);
    store.addLog(`回合 ${d.turnCount}，我方回合開始。`);
  });
}
