import { Card, isMonster, MonsterCard, CardType, Position } from '../core/card';
import { Phase, DuelResult } from '../core/duel';
import { useBattleStore } from '../stores/battleStore';
import { useUIStore } from '../stores/uiStore';
import { runAITurn } from '../game/ai';
import { gameAudio } from '../audio';
import { vfxManager } from './vfx/VFXManager';
import type { BattleScene } from './scenes/BattleScene';

export class InteractionManager {
  constructor(private scene: BattleScene) {
    this.bind();
  }

  private bind() {
    const { cardLayer, uiLayer, overlayLayer, fieldLayer } = this.scene;

    // Hand card click
    cardLayer.onHandCardClick = (index) => this.handleHandClick(index);
    cardLayer.onHandCardRightClick = (card) => this.handleRightClick(card);
    cardLayer.onFieldCardClick = (player, _zoneType, index) => {
      if (player === 0) this.handleMyMonsterZoneClick(index);
      else this.handleOppMonsterZoneClick(index);
    };
    cardLayer.onFieldCardRightClick = (card) => this.handleRightClick(card);

    // Field slot clicks
    for (let i = 0; i < 5; i++) {
      const idx = i;
      fieldLayer.playerMonsterSlots[i].sprite.on('pointerdown', () => this.handleMyMonsterZoneClick(idx));
      fieldLayer.oppMonsterSlots[i].sprite.on('pointerdown', () => this.handleOppMonsterZoneClick(idx));
    }

    // UI buttons
    uiLayer.phaseBtn.on('pointerdown', () => this.handleAdvancePhase());
    uiLayer.surrenderBtn.on('pointerdown', () => this.handleSurrender());
    uiLayer.cancelBtn.on('pointerdown', () => this.handleCancel());
    uiLayer.directAttackBtn.on('pointerdown', () => this.handleDirectAttack());

    // Overlay
    overlayLayer.onDetailClose = () => useUIStore.getState().hideCardDetail();
    overlayLayer.onRestartClick = () => {
      useBattleStore.setState({ gameStarted: false, duel: null, logs: [] });
      useUIStore.getState().reset();
    };
  }

  private handleHandClick(index: number) {
    const duel = useBattleStore.getState().duel;
    if (!duel || duel.turnPlayer !== 0) return;
    const { mode, selectHand, setMode, reset } = useUIStore.getState();
    const { doSetSpellTrap, doNormalSummon } = useBattleStore.getState();
    const card = duel.players[0].hand[index];
    const isMainPhase = duel.phase === Phase.Main1 || duel.phase === Phase.Main2;

    gameAudio.selectCard();

    if (mode === 'idle' && isMainPhase) {
      selectHand(index);
      if (isMonster(card)) {
        setMode('summon_select');
        useUIStore.getState().showMessage('選擇：點擊場地召喚');
      } else {
        const ok = doSetSpellTrap(index);
        if (ok) useUIStore.getState().showMessage('蓋放成功！');
        reset();
      }
    }
  }

  private handleMyMonsterZoneClick(index: number) {
    const duel = useBattleStore.getState().duel;
    if (!duel || duel.turnPlayer !== 0) return;
    const ui = useUIStore.getState();
    const store = useBattleStore.getState();
    const isMainPhase = duel.phase === Phase.Main1 || duel.phase === Phase.Main2;
    const isBattlePhase = duel.phase === Phase.Battle;

    if (ui.mode === 'summon_select' && ui.selectedHandIndex !== null && isMainPhase) {
      if (duel.players[0].monsterZone[index] !== null) {
        ui.showMessage('此格位已有怪獸！');
        return;
      }
      const err = store.doNormalSummon(ui.selectedHandIndex, 'atk');
      if (err) ui.showMessage(`召喚失敗：${err}`);
      else {
        ui.showMessage('召喚成功！');
        // Trigger summon VFX at the slot position
        if (vfxManager.isInitialized) {
          const slot = this.scene.fieldLayer.playerMonsterSlots[index];
          if (slot) {
            const cardContainer = this.scene.cardLayer;
            vfxManager.cardVFX.normalSummon(cardContainer, { x: slot.x, y: slot.y });
          }
        }
      }
      ui.reset();
      return;
    }

    if (ui.mode === 'idle' && isBattlePhase) {
      const slot = duel.players[0].monsterZone[index];
      if (slot && slot.position === Position.FaceUpAttack && !slot.hasAttackedThisTurn) {
        ui.selectMonsterZone(index);
        ui.setMode('attack_select');
        ui.showMessage('選擇攻擊目標（點擊對方怪獸或直接攻擊）');
      }
    }
  }

  private handleOppMonsterZoneClick(index: number) {
    const duel = useBattleStore.getState().duel;
    if (!duel || duel.turnPlayer !== 0) return;
    const ui = useUIStore.getState();
    const store = useBattleStore.getState();

    if (ui.mode === 'attack_select' && ui.selectedMonsterZone !== null) {
      if (duel.players[1].monsterZone[index] === null) {
        ui.showMessage('該格位沒有怪獸！');
        return;
      }
      const result = store.doAttack(ui.selectedMonsterZone, index);
      if (result) {
        // Trigger attack VFX
        if (vfxManager.isInitialized) {
          const fromSlot = this.scene.fieldLayer.playerMonsterSlots[ui.selectedMonsterZone];
          const toSlot = this.scene.fieldLayer.oppMonsterSlots[index];
          if (fromSlot && toSlot) {
            vfxManager.battleVFX.attackDeclare(fromSlot, toSlot);
            setTimeout(() => {
              vfxManager.battleVFX.attackHit(toSlot);
            }, 300);
          }
          if (result.damageToDefender > 0) {
            setTimeout(() => vfxManager.lpVFX.lpDamage(result.damageToDefender, 'opponent'), 500);
          }
          if (result.damageToAttacker > 0) {
            setTimeout(() => vfxManager.lpVFX.lpDamage(result.damageToAttacker, 'player'), 500);
          }
          if (result.defenderDestroyed) {
            setTimeout(() => vfxManager.battleVFX.monsterDestroy(toSlot), 400);
          }
          if (result.attackerDestroyed) {
            setTimeout(() => vfxManager.battleVFX.monsterDestroy(fromSlot), 400);
          }
        }
        if (result.defenderDestroyed) ui.showMessage('對方怪獸被破壞！');
        else if (result.attackerDestroyed) ui.showMessage('我方怪獸被破壞！');
        else ui.showMessage('戰鬥結束');
      }
      ui.reset();
    }
  }

  private handleDirectAttack() {
    const duel = useBattleStore.getState().duel;
    const ui = useUIStore.getState();
    if (!duel || duel.turnPlayer !== 0 || ui.mode !== 'attack_select' || ui.selectedMonsterZone === null) return;
    const damage = useBattleStore.getState().doDirectAttack(ui.selectedMonsterZone);
    if (damage !== null) {
      ui.showMessage(`直接攻擊！造成 ${damage} 點傷害！`);
      if (vfxManager.isInitialized) {
        vfxManager.battleVFX.directAttack('opponent');
        setTimeout(() => vfxManager.lpVFX.lpDamage(damage, 'opponent'), 400);
      }
    }
    else ui.showMessage('無法直接攻擊');
    ui.reset();
  }

  private handleAdvancePhase() {
    const duel = useBattleStore.getState().duel;
    if (!duel || duel.turnPlayer !== 0 || duel.result !== DuelResult.Ongoing) return;
    const store = useBattleStore.getState();
    const ui = useUIStore.getState();
    gameAudio.uiClick();

    if (duel.phase === Phase.Draw) {
      store.doDrawPhase();
      store.doAdvancePhase();
      store.doAdvancePhase();
      ui.showMessage('主要階段1開始');
      return;
    }

    store.doAdvancePhase();
    const newDuel = useBattleStore.getState().duel!;

    if (newDuel.phase === Phase.End) {
      store.doAdvancePhase();
      ui.showMessage('回合結束，對方回合開始');
      ui.reset();
      setTimeout(() => runAITurn(), 500);
      return;
    }

    if (newDuel.phase === Phase.Battle) ui.showMessage('戰鬥階段！選擇怪獸進行攻擊');
    else if (newDuel.phase === Phase.Main2) ui.showMessage('主要階段2');
  }

  private handleSurrender() {
    const duel = useBattleStore.getState().duel;
    if (!duel) return;
    gameAudio.uiClick();
    duel.result = DuelResult.Player2Win;
    useBattleStore.getState().addLog('我方投降！');
    gameAudio.playDefeatSequence();
    useBattleStore.setState({ duel: { ...duel } });
  }

  private handleCancel() {
    useUIStore.getState().reset();
    useUIStore.getState().showMessage('已取消');
  }

  private handleRightClick(card: Card) {
    gameAudio.uiPopupOpen();
    useUIStore.getState().showCardDetail(card);
  }
}
