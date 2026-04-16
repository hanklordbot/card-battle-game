import React, { useCallback, useRef } from 'react';
import { useBattleStore } from '../stores/battleStore';
import { useUIStore } from '../stores/uiStore';
import { Phase, DuelResult, INITIAL_LP } from '../core/duel';
import { Card, FieldCard, Position, isMonster, MonsterCard, CardType, getTributeCount } from '../core/card';
import { COLORS, PHASE_LABELS, PHASE_ORDER, getCardFrameColor, getCardTypeLabel } from '../game/constants';
import { runAITurn } from '../game/ai';
import { audioManager, gameAudio, registerAllAudio, preloadAudio } from '../audio';
import VolumeControl from './VolumeControl';
import './BattleField.css';

// ============ Sub-components ============

function CardFace({ card, small, faceDown, rotated, onClick, onContextMenu, highlight, className }: {
  card: Card; small?: boolean; faceDown?: boolean; rotated?: boolean;
  onClick?: () => void; onContextMenu?: (e: React.MouseEvent) => void;
  highlight?: string; className?: string;
}) {
  const frameColor = getCardFrameColor(card);
  const mon = isMonster(card) ? card as MonsterCard : null;
  const w = small ? 60 : 80;
  const h = small ? 87 : 116;

  if (faceDown) {
    return (
      <div
        className={`card-face card-facedown ${rotated ? 'rotated' : ''} ${className ?? ''}`}
        style={{ width: rotated ? h : w, height: rotated ? w : h, borderColor: highlight ?? '#333' }}
        onClick={onClick} onContextMenu={onContextMenu}
      >
        <div className="card-back-pattern">?</div>
      </div>
    );
  }

  return (
    <div
      className={`card-face ${rotated ? 'rotated' : ''} ${className ?? ''}`}
      style={{ width: rotated ? h : w, height: rotated ? w : h, borderColor: highlight ?? frameColor, background: `linear-gradient(135deg, ${frameColor}40, ${frameColor}20)` }}
      onClick={onClick} onContextMenu={onContextMenu}
    >
      <div className="card-name" style={{ fontSize: small ? 8 : 10 }}>{card.name}</div>
      {mon && (
        <div className="card-stats">
          <span className="card-atk">{mon.atk}</span>/<span className="card-def">{mon.def}</span>
        </div>
      )}
      {mon && <div className="card-level">{'★'.repeat(Math.min(mon.level, 8))}</div>}
      {!mon && <div className="card-type-badge">{card.cardType === CardType.Spell ? '魔' : '陷'}</div>}
    </div>
  );
}

function EmptySlot({ onClick, highlight, label }: { onClick?: () => void; highlight?: string; label?: string }) {
  return (
    <div className="empty-slot" style={{ borderColor: highlight ?? COLORS.fieldGrid }} onClick={onClick}>
      {label && <span className="slot-label">{label}</span>}
    </div>
  );
}

function FieldZone({ slots, isOpponent, onSlotClick, onCardRightClick, highlightSlots }: {
  slots: (FieldCard | null)[];
  isOpponent: boolean;
  onSlotClick?: (index: number) => void;
  onCardRightClick?: (card: Card, e: React.MouseEvent) => void;
  highlightSlots?: Map<number, string>;
}) {
  return (
    <div className="field-zone">
      {slots.map((slot, i) => {
        const hl = highlightSlots?.get(i);
        if (!slot) {
          return <EmptySlot key={i} onClick={() => onSlotClick?.(i)} highlight={hl} />;
        }
        const isFaceDown = slot.position === Position.FaceDownDefense;
        const isDefense = slot.position === Position.FaceUpDefense || slot.position === Position.FaceDownDefense;
        return (
          <CardFace
            key={i}
            card={slot.card}
            faceDown={isFaceDown && isOpponent ? true : isFaceDown}
            rotated={isDefense}
            onClick={() => onSlotClick?.(i)}
            onContextMenu={(e) => { e.preventDefault(); onCardRightClick?.(slot.card, e); }}
            highlight={hl}
          />
        );
      })}
    </div>
  );
}

function SideZone({ label, count, onClick }: { label: string; count: number; onClick?: () => void }) {
  return (
    <div className="side-zone" onClick={onClick}>
      <div className="side-label">{label}</div>
      <div className="side-count">{count}</div>
    </div>
  );
}

function HandArea({ cards, isOpponent, onCardClick, onCardRightClick, selectedIndex, canSummonIndices }: {
  cards: Card[];
  isOpponent: boolean;
  onCardClick?: (index: number) => void;
  onCardRightClick?: (card: Card, e: React.MouseEvent) => void;
  selectedIndex?: number | null;
  canSummonIndices?: Set<number>;
}) {
  const overlap = Math.max(-15, -cards.length * 2);
  return (
    <div className={`hand-area ${isOpponent ? 'opponent-hand' : 'my-hand'}`}>
      {cards.map((card, i) => {
        const isSelected = selectedIndex === i;
        const canSummon = canSummonIndices?.has(i);
        const hl = isSelected ? COLORS.myAccent : canSummon ? COLORS.canSummon : undefined;
        return (
          <div key={i} className={`hand-card ${isSelected ? 'selected' : ''}`} style={{ marginLeft: i > 0 ? overlap : 0 }}>
            <CardFace
              card={card}
              faceDown={isOpponent}
              small={isOpponent}
              onClick={() => onCardClick?.(i)}
              onContextMenu={(e) => { e.preventDefault(); onCardRightClick?.(card, e); }}
              highlight={hl}
            />
          </div>
        );
      })}
      {isOpponent && <span className="hand-count">×{cards.length}</span>}
    </div>
  );
}

function LPDisplay({ lp, isOpponent }: { lp: number; isOpponent: boolean }) {
  const pct = Math.max(0, (lp / INITIAL_LP) * 100);
  const color = isOpponent ? COLORS.oppAccent : COLORS.myAccent;
  return (
    <div className="lp-display">
      <div className="lp-label" style={{ color }}>{isOpponent ? '對方' : '我方'}</div>
      <div className="lp-value">{lp}</div>
      <div className="lp-bar-bg">
        <div className="lp-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      </div>
    </div>
  );
}

function PhaseIndicator({ currentPhase, isMyTurn, turnCount }: { currentPhase: Phase; isMyTurn: boolean; turnCount: number }) {
  return (
    <div className="phase-indicator">
      <div className="turn-label" style={{ color: isMyTurn ? COLORS.myAccent : COLORS.oppAccent }}>
        {isMyTurn ? '我方回合' : '對方回合'} - Turn {turnCount}
      </div>
      <div className="phase-nodes">
        {PHASE_ORDER.map((phase, i) => {
          const isCurrent = phase === currentPhase;
          const isPast = PHASE_ORDER.indexOf(currentPhase) > i;
          return (
            <React.Fragment key={phase}>
              {i > 0 && <div className={`phase-line ${isPast ? 'past' : ''}`} />}
              <div className={`phase-node ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}>
                <div className="phase-dot" />
                <div className="phase-label">{PHASE_LABELS[phase]}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function CardDetailPanel({ card, onClose }: { card: Card; onClose: () => void }) {
  const mon = isMonster(card) ? card as MonsterCard : null;
  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-art" style={{ background: `linear-gradient(135deg, ${getCardFrameColor(card)}60, ${getCardFrameColor(card)}20)` }}>
          <div className="detail-art-name">{card.name}</div>
        </div>
        <div className="detail-info">
          <div className="detail-name">{card.name}</div>
          <div className="detail-type">{getCardTypeLabel(card)}</div>
          {mon && (
            <div className="detail-stats">
              <span>ATK/<b>{mon.atk}</b></span>
              <span>DEF/<b>{mon.def}</b></span>
            </div>
          )}
          <div className="detail-divider" />
          <div className="detail-effect">
            {card.effectDescription || (mon?.flavorText ?? '無效果描述')}
          </div>
          <div className="detail-rarity">稀有度: {card.rarity}</div>
        </div>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

function GameLog({ logs }: { logs: { message: string }[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [logs.length]);
  return (
    <div className="game-log" ref={ref}>
      {logs.slice(-20).map((log, i) => (
        <div key={i} className="log-entry">{log.message}</div>
      ))}
    </div>
  );
}

// ============ Main BattleField Component ============

export default function BattleField() {
  const { duel, gameStarted, startGame, doDrawPhase, doAdvancePhase, doNormalSummon, doAttack, doDirectAttack, doSetSpellTrap, addLog, logs } = useBattleStore();
  const { mode, selectedHandIndex, selectedMonsterZone, setMode, selectHand, selectMonsterZone, showCardDetail, hideCardDetail, showDetail, detailCard, showMessage, message, reset } = useUIStore();
  const [showVolume, setShowVolume] = React.useState(false);

  // Audio init on first user interaction
  const audioInited = useRef(false);
  const initAudio = useCallback(() => {
    if (audioInited.current) return;
    audioInited.current = true;
    registerAllAudio();
    audioManager.init();
    preloadAudio('battlePreload');
    // Tab visibility handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audioManager.suspend();
      else audioManager.resume();
    });
  }, []);

  const isMyTurn = duel?.turnPlayer === 0;
  const isMainPhase = duel?.phase === Phase.Main1 || duel?.phase === Phase.Main2;
  const isBattlePhase = duel?.phase === Phase.Battle;
  const gameOver = duel?.result !== undefined && duel?.result !== DuelResult.Ongoing;

  // Compute which hand cards can be summoned
  const canSummonIndices = React.useMemo(() => {
    const set = new Set<number>();
    if (!duel || !isMyTurn || !isMainPhase) return set;
    const player = duel.players[0];
    player.hand.forEach((card, i) => {
      if (isMonster(card) && (card as MonsterCard).level <= 4 && !player.normalSummonUsed) {
        if (player.monsterZone.some(s => s === null)) set.add(i);
      }
      if (card.cardType === CardType.Spell || card.cardType === CardType.Trap) {
        if (player.spellTrapZone.some(s => s === null)) set.add(i);
      }
    });
    return set;
  }, [duel, isMyTurn, isMainPhase]);

  // Compute which monsters can attack
  const canAttackZones = React.useMemo(() => {
    const set = new Set<number>();
    if (!duel || !isMyTurn || !isBattlePhase) return set;
    duel.players[0].monsterZone.forEach((slot, i) => {
      if (slot && slot.position === Position.FaceUpAttack && !slot.hasAttackedThisTurn) set.add(i);
    });
    return set;
  }, [duel, isMyTurn, isBattlePhase]);

  const handleHandClick = useCallback((index: number) => {
    if (!duel || !isMyTurn) return;
    const card = duel.players[0].hand[index];
    gameAudio.selectCard(); // 🔊

    if (mode === 'idle' && isMainPhase) {
      selectHand(index);
      if (isMonster(card)) {
        setMode('summon_select');
        showMessage('選擇：點擊場地召喚，或右鍵查看詳情');
      } else {
        // Spell/Trap: set it
        const ok = doSetSpellTrap(index);
        if (ok) showMessage('蓋放成功！');
        reset();
      }
    }
  }, [duel, isMyTurn, mode, isMainPhase]);

  const handleMyMonsterZoneClick = useCallback((index: number) => {
    if (!duel || !isMyTurn) return;

    if (mode === 'summon_select' && selectedHandIndex !== null && isMainPhase) {
      // Summon to this zone
      if (duel.players[0].monsterZone[index] !== null) {
        showMessage('此格位已有怪獸！');
        return;
      }
      const err = doNormalSummon(selectedHandIndex, 'atk');
      if (err) {
        showMessage(`召喚失敗：${err}`);
      } else {
        showMessage('召喚成功！');
      }
      reset();
      return;
    }

    if (mode === 'idle' && isBattlePhase && canAttackZones.has(index)) {
      selectMonsterZone(index);
      setMode('attack_select');
      showMessage('選擇攻擊目標（點擊對方怪獸或對方區域直接攻擊）');
      return;
    }
  }, [duel, isMyTurn, mode, selectedHandIndex, isMainPhase, isBattlePhase, canAttackZones]);

  const handleOppMonsterZoneClick = useCallback((index: number) => {
    if (!duel || !isMyTurn) return;

    if (mode === 'attack_select' && selectedMonsterZone !== null) {
      if (duel.players[1].monsterZone[index] === null) {
        showMessage('該格位沒有怪獸！');
        return;
      }
      const result = doAttack(selectedMonsterZone, index);
      if (result) {
        if (result.defenderDestroyed) showMessage('對方怪獸被破壞！');
        else if (result.attackerDestroyed) showMessage('我方怪獸被破壞！');
        else showMessage('戰鬥結束');
      }
      reset();
      return;
    }
  }, [duel, isMyTurn, mode, selectedMonsterZone]);

  const handleDirectAttackClick = useCallback(() => {
    if (!duel || !isMyTurn || mode !== 'attack_select' || selectedMonsterZone === null) return;
    const damage = doDirectAttack(selectedMonsterZone);
    if (damage !== null) {
      showMessage(`直接攻擊！造成 ${damage} 點傷害！`);
    } else {
      showMessage('無法直接攻擊');
    }
    reset();
  }, [duel, isMyTurn, mode, selectedMonsterZone]);

  const handleAdvancePhase = useCallback(() => {
    if (!duel || !isMyTurn || gameOver) return;
    gameAudio.uiClick(); // 🔊

    if (duel.phase === Phase.Draw) {
      doDrawPhase();
      doAdvancePhase(); // auto advance past draw
      doAdvancePhase(); // advance past standby to main1
      showMessage('主要階段1開始');
      return;
    }

    doAdvancePhase();

    // If we advanced to End phase, auto-advance to end turn
    const newDuel = useBattleStore.getState().duel!;
    if (newDuel.phase === Phase.End) {
      doAdvancePhase(); // end turn → opponent's draw
      showMessage('回合結束，對方回合開始');
      reset();
      // Trigger AI turn
      setTimeout(() => runAITurn(), 500);
      return;
    }

    if (newDuel.phase === Phase.Battle) {
      showMessage('戰鬥階段！選擇怪獸進行攻擊');
    } else if (newDuel.phase === Phase.Main2) {
      showMessage('主要階段2');
    }
  }, [duel, isMyTurn, gameOver]);

  const handleCardRightClick = useCallback((card: Card, e: React.MouseEvent) => {
    e.preventDefault();
    gameAudio.uiPopupOpen(); // 🔊
    showCardDetail(card);
  }, []);

  const handleSurrender = useCallback(() => {
    if (!duel) return;
    gameAudio.uiClick(); // 🔊
    duel.result = DuelResult.Player2Win;
    addLog('我方投降！');
    gameAudio.playDefeatSequence(); // 🔊
    useBattleStore.setState({ duel: { ...duel } });
  }, [duel]);

  // Monster zone highlights
  const myMonsterHighlights = React.useMemo(() => {
    const map = new Map<number, string>();
    if (mode === 'summon_select') {
      duel?.players[0].monsterZone.forEach((s, i) => { if (!s) map.set(i, COLORS.canSummon); });
    }
    if (mode === 'idle' && isBattlePhase) {
      canAttackZones.forEach(i => map.set(i, COLORS.canAttack));
    }
    if (mode === 'attack_select' && selectedMonsterZone !== null) {
      map.set(selectedMonsterZone, COLORS.myAccent);
    }
    return map;
  }, [mode, duel, isBattlePhase, canAttackZones, selectedMonsterZone]);

  const oppMonsterHighlights = React.useMemo(() => {
    const map = new Map<number, string>();
    if (mode === 'attack_select') {
      duel?.players[1].monsterZone.forEach((s, i) => { if (s) map.set(i, COLORS.canTarget); });
    }
    return map;
  }, [mode, duel]);

  // ============ Render ============

  if (!gameStarted || !duel) {
    return (
      <div className="battle-container">
        <div className="start-screen">
          <h1>卡片對戰遊戲</h1>
          <p>網頁 TCG 對戰原型</p>
          <button className="start-btn" onClick={() => { initAudio(); startGame(); }}>開始對戰</button>
        </div>
      </div>
    );
  }

  const oppHasNoMonsters = duel.players[1].monsterZone.every(s => s === null);

  return (
    <div className="battle-container">
      {/* Game Over Overlay */}
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-panel">
            <h2>{duel.result === DuelResult.Player1Win ? '🎉 勝利！' : '💀 敗北...'}</h2>
            <p>{duel.result === DuelResult.Player1Win ? '恭喜你贏得了對戰！' : '對方獲得了勝利。'}</p>
            <button className="start-btn" onClick={() => { useBattleStore.setState({ gameStarted: false, duel: null, logs: [] }); reset(); }}>
              再來一局
            </button>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && <div className="toast-message">{message}</div>}

      {/* Card Detail */}
      {showDetail && detailCard && <CardDetailPanel card={detailCard} onClose={hideCardDetail} />}

      {/* Opponent Hand */}
      <HandArea cards={duel.players[1].hand} isOpponent onCardRightClick={handleCardRightClick} />

      {/* Opponent Field */}
      <div className="field-section opponent-field">
        <div className="field-row">
          <SideZone label="墓地" count={duel.players[1].graveyard.length} />
          <FieldZone slots={duel.players[1].spellTrapZone} isOpponent onCardRightClick={handleCardRightClick} />
          <SideZone label="場魔" count={duel.players[1].fieldSpell ? 1 : 0} />
        </div>
        <div className="field-row">
          <SideZone label="除外" count={duel.players[1].banished.length} />
          <FieldZone
            slots={duel.players[1].monsterZone}
            isOpponent
            onSlotClick={handleOppMonsterZoneClick}
            onCardRightClick={handleCardRightClick}
            highlightSlots={oppMonsterHighlights}
          />
          <SideZone label="牌庫" count={duel.players[1].deck.length} />
        </div>
      </div>

      {/* Center Divider */}
      <div className="center-divider">
        {mode === 'attack_select' && oppHasNoMonsters && (
          <button className="direct-attack-btn" onClick={handleDirectAttackClick}>
            ⚔ 直接攻擊
          </button>
        )}
      </div>

      {/* My Field */}
      <div className="field-section my-field">
        <div className="field-row">
          <SideZone label="牌庫" count={duel.players[0].deck.length} />
          <FieldZone
            slots={duel.players[0].monsterZone}
            isOpponent={false}
            onSlotClick={handleMyMonsterZoneClick}
            onCardRightClick={handleCardRightClick}
            highlightSlots={myMonsterHighlights}
          />
          <SideZone label="除外" count={duel.players[0].banished.length} />
        </div>
        <div className="field-row">
          <SideZone label="場魔" count={duel.players[0].fieldSpell ? 1 : 0} />
          <FieldZone slots={duel.players[0].spellTrapZone} isOpponent={false} onCardRightClick={handleCardRightClick} />
          <SideZone label="墓地" count={duel.players[0].graveyard.length} />
        </div>
      </div>

      {/* My Hand */}
      <HandArea
        cards={duel.players[0].hand}
        isOpponent={false}
        onCardClick={handleHandClick}
        onCardRightClick={handleCardRightClick}
        selectedIndex={selectedHandIndex}
        canSummonIndices={canSummonIndices}
      />

      {/* Bottom HUD */}
      <div className="hud-bar">
        <LPDisplay lp={duel.players[0].lp} isOpponent={false} />
        <LPDisplay lp={duel.players[1].lp} isOpponent />
        <PhaseIndicator currentPhase={duel.phase} isMyTurn={isMyTurn!} turnCount={duel.turnCount} />
        <div className="hud-buttons">
          {isMyTurn && !gameOver && (
            <button className="phase-btn" onClick={handleAdvancePhase}>
              {duel.phase === Phase.Draw ? '▶ 開始回合' : '▶ 下一階段'}
            </button>
          )}
          {!isMyTurn && !gameOver && <div className="waiting-label">對方回合中...</div>}
          {mode !== 'idle' && (
            <button className="cancel-btn" onClick={() => { reset(); showMessage('已取消'); }}>✕ 取消</button>
          )}
          <button className="surrender-btn" onClick={handleSurrender}>🏳 投降</button>
          <button className="settings-btn" onClick={() => { gameAudio.uiClick(); setShowVolume(v => !v); }}>⚙</button>
        </div>
      </div>

      {/* Game Log */}
      <GameLog logs={logs} />

      {/* Volume Control */}
      {showVolume && <VolumeControl onClose={() => setShowVolume(false)} />}
    </div>
  );
}
