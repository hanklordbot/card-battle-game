import { FieldCard, Position, isMonster, MonsterCard } from '../models/card';
import { DuelState, dealDamage } from './duel';

export interface BattleResult {
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
  damageToAttacker: number;
  damageToDefender: number;
}

/**
 * Calculate battle between attacker and defender.
 * Attacker is always in face-up attack position.
 */
export function calculateBattle(attacker: FieldCard, defender: FieldCard): BattleResult {
  const atkCard = attacker.card as MonsterCard;
  const defCard = defender.card as MonsterCard;

  const atkValue = atkCard.atk;

  if (defender.position === Position.FaceUpAttack) {
    // ATK vs ATK
    const defValue = defCard.atk;
    if (atkValue > defValue) {
      return { attackerDestroyed: false, defenderDestroyed: true, damageToAttacker: 0, damageToDefender: atkValue - defValue };
    } else if (atkValue === defValue) {
      return { attackerDestroyed: true, defenderDestroyed: true, damageToAttacker: 0, damageToDefender: 0 };
    } else {
      return { attackerDestroyed: true, defenderDestroyed: false, damageToAttacker: defValue - atkValue, damageToDefender: 0 };
    }
  } else {
    // ATK vs DEF (face-up defense or face-down defense)
    const defValue = defCard.def;
    if (atkValue > defValue) {
      return { attackerDestroyed: false, defenderDestroyed: true, damageToAttacker: 0, damageToDefender: 0 };
    } else if (atkValue === defValue) {
      return { attackerDestroyed: false, defenderDestroyed: false, damageToAttacker: 0, damageToDefender: 0 };
    } else {
      return { attackerDestroyed: false, defenderDestroyed: false, damageToAttacker: defValue - atkValue, damageToDefender: 0 };
    }
  }
}

/**
 * Calculate direct attack damage (when opponent has no monsters).
 */
export function calculateDirectAttack(attacker: FieldCard): number {
  return (attacker.card as MonsterCard).atk;
}

/**
 * Execute a battle between two monsters on the field, applying damage to duel state.
 */
export function executeBattle(
  state: DuelState,
  attackerPlayerIndex: 0 | 1,
  attackerZoneIndex: number,
  defenderZoneIndex: number,
): BattleResult | null {
  const defenderPlayerIndex: 0 | 1 = attackerPlayerIndex === 0 ? 1 : 0;
  const attackerSlot = state.players[attackerPlayerIndex].monsterZone[attackerZoneIndex];
  const defenderSlot = state.players[defenderPlayerIndex].monsterZone[defenderZoneIndex];

  if (!attackerSlot || !defenderSlot) return null;
  if (attackerSlot.position !== Position.FaceUpAttack) return null;
  if (attackerSlot.hasAttackedThisTurn) return null;

  // Flip face-down defender to face-up defense
  if (defenderSlot.position === Position.FaceDownDefense) {
    defenderSlot.position = Position.FaceUpDefense;
  }

  const result = calculateBattle(attackerSlot, defenderSlot);

  // Apply destruction
  if (result.attackerDestroyed) {
    state.players[attackerPlayerIndex].graveyard.push(attackerSlot.card);
    state.players[attackerPlayerIndex].monsterZone[attackerZoneIndex] = null;
  }
  if (result.defenderDestroyed) {
    state.players[defenderPlayerIndex].graveyard.push(defenderSlot.card);
    state.players[defenderPlayerIndex].monsterZone[defenderZoneIndex] = null;
  }

  // Apply damage
  if (result.damageToAttacker > 0) dealDamage(state, attackerPlayerIndex, result.damageToAttacker);
  if (result.damageToDefender > 0) dealDamage(state, defenderPlayerIndex, result.damageToDefender);

  attackerSlot.hasAttackedThisTurn = true;

  return result;
}

/**
 * Execute a direct attack against the opponent player.
 */
export function executeDirectAttack(
  state: DuelState,
  attackerPlayerIndex: 0 | 1,
  attackerZoneIndex: number,
): number | null {
  const defenderPlayerIndex: 0 | 1 = attackerPlayerIndex === 0 ? 1 : 0;
  const attackerSlot = state.players[attackerPlayerIndex].monsterZone[attackerZoneIndex];

  if (!attackerSlot) return null;
  if (attackerSlot.position !== Position.FaceUpAttack) return null;
  if (attackerSlot.hasAttackedThisTurn) return null;

  // Check opponent has no monsters
  const hasDefender = state.players[defenderPlayerIndex].monsterZone.some(s => s !== null);
  if (hasDefender) return null;

  const damage = calculateDirectAttack(attackerSlot);
  dealDamage(state, defenderPlayerIndex, damage);
  attackerSlot.hasAttackedThisTurn = true;

  return damage;
}
