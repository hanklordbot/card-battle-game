import { useEffect, useRef, useCallback } from 'react';
import { useBattleStore } from '../stores/battleStore';
import { useUIStore } from '../stores/uiStore';
import { initPixiApp, destroyPixiApp, getPixiApp } from '../pixi/PixiApp';
import { BattleScene } from '../pixi/scenes/BattleScene';
import { vfxManager } from '../pixi/vfx/VFXManager';
import { audioManager, gameAudio, registerAllAudio, preloadAudio } from '../audio';
import { revokeAllCardImages } from '../services/card-image-service';
import VolumeControl from './VolumeControl';
import React from 'react';

export default function BattleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const audioInited = useRef(false);
  const [showVolume, setShowVolume] = React.useState(false);

  const initAudio = useCallback(() => {
    if (audioInited.current) return;
    audioInited.current = true;
    registerAllAudio();
    audioManager.init();
    preloadAudio('battlePreload');
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audioManager.suspend();
      else audioManager.resume();
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;

    (async () => {
      const app = await initPixiApp(el);
      if (destroyed) return;

      const scene = new BattleScene();
      sceneRef.current = scene;
      app.stage.addChild(scene);

      // Initialize VFX system
      scene.initVFX(app);

      // Wire start button to init audio + start game
      scene.overlayLayer.onStartClick = () => {
        initAudio();
        useBattleStore.getState().startGame();
      };

      // Initial render
      scene.update();

      // Subscribe to store changes
      const unsubBattle = useBattleStore.subscribe(() => {
        if (!destroyed) scene.update();
      });
      const unsubUI = useUIStore.subscribe(() => {
        if (!destroyed) scene.update();
      });

      // Store unsubs for cleanup
      (el as HTMLDivElement & { _unsubs?: (() => void)[] })._unsubs = [unsubBattle, unsubUI];
    })();

    return () => {
      destroyed = true;
      const unsubs = (el as HTMLDivElement & { _unsubs?: (() => void)[] })._unsubs;
      unsubs?.forEach(u => u());
      sceneRef.current = null;
      revokeAllCardImages();
      destroyPixiApp();
    };
  }, [initAudio]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      <button
        onClick={() => { gameAudio.uiClick(); setShowVolume(v => !v); }}
        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
      >
        ⚙
      </button>
      {showVolume && <VolumeControl onClose={() => setShowVolume(false)} />}
    </div>
  );
}
