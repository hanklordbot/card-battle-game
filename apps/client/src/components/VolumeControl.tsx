import React, { useState, useCallback } from 'react';
import { audioManager } from '../audio';

interface Props {
  onClose: () => void;
}

export default function VolumeControl({ onClose }: Props) {
  const [settings, setSettings] = useState(() => audioManager.getSettings());

  const update = useCallback(() => setSettings(audioManager.getSettings()), []);

  const handleMaster = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioManager.setMasterVolume(parseFloat(e.target.value));
    update();
  }, []);

  const handleBgm = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioManager.setBusVolume('bgm', parseFloat(e.target.value));
    update();
  }, []);

  const handleSfx = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioManager.setBusVolume('sfx', parseFloat(e.target.value));
    update();
  }, []);

  const handleMute = useCallback(() => {
    audioManager.toggleMute();
    update();
  }, []);

  return (
    <div className="volume-overlay" onClick={onClose}>
      <div className="volume-panel" onClick={e => e.stopPropagation()}>
        <div className="volume-header">
          <span>🔊 音量設定</span>
          <button className="volume-close" onClick={onClose}>✕</button>
        </div>

        <div className="volume-row">
          <label>主音量</label>
          <input type="range" min="0" max="1" step="0.05" value={settings.master} onChange={handleMaster} />
          <span className="volume-val">{Math.round(settings.master * 100)}%</span>
        </div>

        <div className="volume-row">
          <label>BGM</label>
          <input type="range" min="0" max="1" step="0.05" value={settings.bgm} onChange={handleBgm} />
          <span className="volume-val">{Math.round(settings.bgm * 100)}%</span>
        </div>

        <div className="volume-row">
          <label>音效</label>
          <input type="range" min="0" max="1" step="0.05" value={settings.sfx} onChange={handleSfx} />
          <span className="volume-val">{Math.round(settings.sfx * 100)}%</span>
        </div>

        <button className={`mute-btn ${settings.muted ? 'muted' : ''}`} onClick={handleMute}>
          {settings.muted ? '🔇 已靜音 — 點擊取消' : '🔊 靜音'}
        </button>
      </div>
    </div>
  );
}
