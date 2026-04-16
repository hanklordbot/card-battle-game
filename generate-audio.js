#!/usr/bin/env node
/**
 * generate-audio.js — Synthesize WAV files for the card battle game.
 * Pure Node.js, zero dependencies. Writes 16-bit PCM WAV files.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, 'apps/client/public/audio');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── WAV Writer ───

function writeWav(filename, samples, channels = 1) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);       // fmt chunk size
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(channels, 22); // channels
  buf.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
  buf.writeUInt32LE(byteRate, 28);    // byte rate
  buf.writeUInt16LE(blockAlign, 32);  // block align
  buf.writeUInt16LE(16, 34);          // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  const fp = path.join(OUT_DIR, filename + '.wav');
  fs.writeFileSync(fp, buf);
  console.log(`  ✓ ${filename}.wav (${(buf.length / 1024).toFixed(1)} KB)`);
}

// ─── DSP Helpers ───

function sine(freq, t) { return Math.sin(2 * Math.PI * freq * t); }
function saw(freq, t) { return 2 * ((freq * t) % 1) - 1; }
function square(freq, t) { return sine(freq, t) > 0 ? 0.6 : -0.6; }
function noise() { return Math.random() * 2 - 1; }

function adsr(t, a, d, s, r, dur) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function makeSamples(duration, fn) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SAMPLE_RATE, i, n);
  return out;
}

// ─── BGM Generator (simple looping melodies) ───

function generateBGM(name, bpm, notes, baseFreq, duration, waveform = sine, vol = 0.25) {
  const beatLen = 60 / bpm;
  const samples = makeSamples(duration, (t) => {
    const beatPos = (t / beatLen) % notes.length;
    const noteIdx = Math.floor(beatPos);
    const note = notes[noteIdx % notes.length];
    const freq = baseFreq * Math.pow(2, note / 12);
    const noteT = (beatPos - noteIdx) * beatLen;
    const env = adsr(noteT, 0.02, 0.1, 0.6, 0.1, beatLen);
    // Add a subtle bass
    const bass = sine(baseFreq * 0.5, t) * 0.15;
    // Add light percussion on beats
    const kick = (beatPos - noteIdx < 0.05) ? noise() * 0.1 * (1 - (beatPos - noteIdx) / 0.05) : 0;
    return (waveform(freq, t) * env * vol + bass + kick) * 0.7;
  });
  writeWav(name, samples);
}

// E minor scale degrees: E=0, F#=2, G=3, A=5, B=7, C=8, D=10
const Em_melody1 = [0, 3, 7, 5, 3, 7, 10, 8, 7, 5, 3, 0, -2, 0, 3, 5]; // battle normal
const Em_melody2 = [0, 0, 3, 3, 7, 7, 10, 12, 12, 10, 8, 7, 5, 3, 0, 0]; // battle tense
const Dm_melody  = [0, 3, 7, 10, 12, 10, 7, 3, 5, 8, 12, 15, 12, 8, 5, 3]; // boss
const Dm_menu    = [0, 5, 3, 0, -2, 0, 3, 5, 7, 5, 3, 0, -4, -2, 0, 3]; // menu (slower)
const C_melody   = [0, 4, 7, 12, 11, 7, 4, 0, 2, 5, 9, 12, 11, 9, 5, 2]; // deck edit

console.log('Generating BGM...');
// D minor base = 293.66 Hz (D4), E minor base = 329.63 Hz (E4)
generateBGM('bgm_main_menu', 78, Dm_menu, 293.66, 16, sine, 0.2);
generateBGM('bgm_battle_normal', 120, Em_melody1, 329.63, 16, saw, 0.18);
generateBGM('bgm_battle_tense', 140, Em_melody2, 329.63, 16, square, 0.18);
generateBGM('bgm_battle_boss', 150, Dm_melody, 293.66, 16, saw, 0.22);
generateBGM('bgm_deck_edit', 90, C_melody, 261.63, 16, sine, 0.18);

// Victory: ascending triumphant
generateBGM('bgm_victory', 130, [0, 4, 7, 12, 0, 4, 7, 12, 14, 12, 7, 4, 0, 4, 7, 12], 293.66, 8, sine, 0.25);
// Defeat: descending somber
generateBGM('bgm_defeat', 70, [12, 10, 7, 5, 3, 0, -2, -5, 0, 3, 5, 3, 0, -2, -5, -7], 220, 8, sine, 0.2);

// ─── SFX Generators ───

console.log('\nGenerating SFX...');

function genSFX(name, duration, fn) {
  writeWav(name, makeSamples(duration, fn));
}

// Card draw: short paper swoosh
genSFX('sfx_draw_card', 0.4, (t) => {
  const env = adsr(t, 0.01, 0.05, 0.3, 0.2, 0.4);
  return (noise() * 0.5 + sine(800 + 2000 * (1 - t / 0.4), t) * 0.3) * env;
});

// Set card: thud
genSFX('sfx_set_card', 0.35, (t) => {
  const env = adsr(t, 0.005, 0.08, 0.2, 0.15, 0.35);
  return (noise() * 0.3 + sine(200 - 100 * t, t) * 0.5) * env;
});

// Flip card: whoosh + reveal
genSFX('sfx_flip_card', 0.45, (t) => {
  const env = adsr(t, 0.02, 0.1, 0.4, 0.2, 0.45);
  const sweep = sine(400 + 1200 * t, t);
  return (sweep * 0.4 + noise() * 0.2) * env;
});

// Card select: tiny click
genSFX('sfx_card_select', 0.12, (t) => {
  const env = Math.exp(-t * 40);
  return sine(1200, t) * 0.5 * env;
});

// Discard: downward swoosh
genSFX('sfx_discard', 0.35, (t) => {
  const env = adsr(t, 0.01, 0.1, 0.3, 0.15, 0.35);
  return (noise() * 0.3 + sine(600 - 400 * t / 0.35, t) * 0.4) * env;
});

// Normal summon: rising tone + impact
genSFX('sfx_normal_summon', 0.9, (t) => {
  const env = adsr(t, 0.05, 0.2, 0.5, 0.3, 0.9);
  const freq = 300 + 500 * (t / 0.9);
  const impact = t > 0.5 ? Math.exp(-(t - 0.5) * 15) * 0.6 : 0;
  return (sine(freq, t) * 0.4 + saw(freq * 0.5, t) * 0.15 + impact * noise()) * env;
});

// Tribute summon: dramatic rising
genSFX('sfx_tribute_summon', 1.3, (t) => {
  const env = adsr(t, 0.1, 0.3, 0.6, 0.3, 1.3);
  const freq = 200 + 800 * Math.pow(t / 1.3, 2);
  const rumble = sine(80, t) * 0.2;
  const impact = t > 0.8 ? Math.exp(-(t - 0.8) * 10) * 0.5 : 0;
  return (sine(freq, t) * 0.35 + rumble + impact * (noise() + sine(freq * 2, t))) * env;
});

// Special summon: mystical shimmer
genSFX('sfx_special_summon', 0.9, (t) => {
  const env = adsr(t, 0.05, 0.15, 0.5, 0.3, 0.9);
  const freq = 500 + 300 * Math.sin(t * 8);
  return (sine(freq, t) * 0.3 + sine(freq * 1.5, t) * 0.2 + noise() * 0.05) * env;
});

// Fusion summon: converge → burst → reveal
genSFX('sfx_fusion_summon', 2.3, (t) => {
  let v = 0;
  if (t < 0.8) { // converge
    const env = t / 0.8;
    v = (sine(200 + 600 * env, t) * 0.3 + noise() * 0.1 * env) * env;
  } else if (t < 1.5) { // burst
    const bt = t - 0.8;
    const env = Math.exp(-bt * 5);
    v = (noise() * 0.6 + sine(100, t) * 0.3) * env;
  } else { // reveal
    const rt = t - 1.5;
    const env = adsr(rt, 0.05, 0.2, 0.5, 0.3, 0.8);
    v = (sine(600 + 200 * rt, t) * 0.4 + sine(900, t) * 0.2) * env;
  }
  return v * 0.8;
});

// Tribute release: energy dissolve
genSFX('sfx_tribute_release', 0.6, (t) => {
  const env = adsr(t, 0.01, 0.15, 0.3, 0.3, 0.6);
  return (noise() * 0.3 + sine(400 - 300 * t, t) * 0.3) * env;
});

// Attack declare: whoosh charge
genSFX('sfx_attack_declare', 0.6, (t) => {
  const env = adsr(t, 0.02, 0.1, 0.6, 0.2, 0.6);
  const freq = 300 + 700 * t / 0.6;
  return (saw(freq, t) * 0.3 + noise() * 0.15) * env;
});

// Attack hit: impact
genSFX('sfx_attack_hit', 0.5, (t) => {
  const env = Math.exp(-t * 8);
  return (noise() * 0.5 + sine(100 - 50 * t, t) * 0.4 + sine(60, t) * 0.3) * env;
});

// Monster destroy: shatter
genSFX('sfx_monster_destroy', 0.7, (t) => {
  const env = Math.exp(-t * 5);
  const crackle = noise() * 0.5 * (t < 0.1 ? 1 : Math.exp(-(t - 0.1) * 8));
  return (crackle + sine(150 - 100 * t, t) * 0.3 + noise() * 0.2) * env;
});

// Direct attack: heavy slam
genSFX('sfx_direct_attack', 0.9, (t) => {
  const env = adsr(t, 0.01, 0.15, 0.4, 0.4, 0.9);
  const boom = Math.exp(-t * 6) * sine(60, t) * 0.6;
  const hit = t < 0.15 ? noise() * 0.6 * (1 - t / 0.15) : 0;
  return (boom + hit + sine(200 - 150 * t, t) * 0.2) * env;
});

// Damage small
genSFX('sfx_damage_small', 0.35, (t) => {
  const env = Math.exp(-t * 10);
  return (noise() * 0.3 + sine(300, t) * 0.2) * env;
});

// Damage large
genSFX('sfx_damage_large', 0.6, (t) => {
  const env = Math.exp(-t * 5);
  return (noise() * 0.5 + sine(80, t) * 0.4 + sine(200, t) * 0.2) * env;
});

// Attack reflect: metallic ping
genSFX('sfx_attack_reflect', 0.55, (t) => {
  const env = Math.exp(-t * 6);
  return (sine(800, t) * 0.3 + sine(1200, t) * 0.2 + noise() * 0.1) * env;
});

// Spell activate: magical chime
genSFX('sfx_spell_activate', 0.6, (t) => {
  const env = adsr(t, 0.02, 0.15, 0.4, 0.25, 0.6);
  return (sine(600, t) * 0.3 + sine(900, t) * 0.2 + sine(1200, t) * 0.1) * env;
});

// Trap activate: ominous reveal
genSFX('sfx_trap_activate', 0.7, (t) => {
  const env = adsr(t, 0.01, 0.2, 0.5, 0.2, 0.7);
  const freq = 300 - 100 * t;
  return (square(freq, t) * 0.25 + noise() * 0.15 + sine(freq * 2, t) * 0.15) * env;
});

// Chain start: tension riser
genSFX('sfx_chain_start', 0.45, (t) => {
  const env = adsr(t, 0.02, 0.1, 0.5, 0.15, 0.45);
  return (sine(500 + 500 * t, t) * 0.3 + sine(750 + 500 * t, t) * 0.2) * env;
});

// Chain stack: ascending ping
genSFX('sfx_chain_stack', 0.35, (t) => {
  const env = Math.exp(-t * 10);
  return sine(800, t) * 0.4 * env;
});

// Chain resolve: release burst
genSFX('sfx_chain_resolve', 0.55, (t) => {
  const env = Math.exp(-t * 6);
  return (noise() * 0.3 + sine(400, t) * 0.3 + sine(600, t) * 0.2) * env;
});

// Negate: harsh buzz
genSFX('sfx_negate', 0.7, (t) => {
  const env = adsr(t, 0.01, 0.15, 0.4, 0.3, 0.7);
  return (square(200, t) * 0.3 + noise() * 0.2 + sine(100, t) * 0.2) * env;
});

// Continuous activate: hum
genSFX('sfx_continuous_activate', 0.45, (t) => {
  const env = adsr(t, 0.05, 0.1, 0.5, 0.15, 0.45);
  return sine(300, t) * 0.3 * env;
});

// Turn start mine: bright fanfare
genSFX('sfx_turn_start_mine', 0.7, (t) => {
  const env = adsr(t, 0.02, 0.15, 0.5, 0.2, 0.7);
  const f = t < 0.3 ? 500 : 700;
  return (sine(f, t) * 0.3 + sine(f * 1.5, t) * 0.15) * env;
});

// Turn start opponent: darker tone
genSFX('sfx_turn_start_opponent', 0.5, (t) => {
  const env = adsr(t, 0.02, 0.1, 0.4, 0.2, 0.5);
  return (sine(350, t) * 0.3 + sine(250, t) * 0.2) * env;
});

// Phase change: quick tick
genSFX('sfx_phase_change', 0.25, (t) => {
  const env = Math.exp(-t * 15);
  return sine(1000, t) * 0.35 * env;
});

// Turn end: soft close
genSFX('sfx_turn_end', 0.35, (t) => {
  const env = Math.exp(-t * 8);
  return (sine(500, t) * 0.2 + sine(400, t) * 0.15) * env;
});

// LP damage: hit + rumble
genSFX('sfx_lp_damage', 0.9, (t) => {
  const env = adsr(t, 0.01, 0.2, 0.3, 0.4, 0.9);
  const hit = t < 0.1 ? noise() * 0.5 : 0;
  return (hit + sine(80, t) * 0.3 + sine(150, t) * 0.15) * env;
});

// LP heal: warm ascending
genSFX('sfx_lp_heal', 0.7, (t) => {
  const env = adsr(t, 0.05, 0.15, 0.4, 0.2, 0.7);
  const freq = 400 + 400 * t / 0.7;
  return (sine(freq, t) * 0.3 + sine(freq * 1.5, t) * 0.1) * env;
});

// LP warning: heartbeat loop
genSFX('sfx_lp_warning', 1.8, (t) => {
  const beat = (t % 0.9);
  const thump = beat < 0.08 ? Math.exp(-beat * 40) * 0.5 : 0;
  const second = (beat > 0.2 && beat < 0.28) ? Math.exp(-(beat - 0.2) * 40) * 0.3 : 0;
  return (thump + second) * sine(50, t);
});

// Victory SFX: triumphant sting
genSFX('sfx_victory', 1.2, (t) => {
  const env = adsr(t, 0.02, 0.3, 0.5, 0.4, 1.2);
  const f = t < 0.4 ? 500 + 500 * (t / 0.4) : 1000;
  return (sine(f, t) * 0.3 + sine(f * 1.5, t) * 0.15 + sine(f * 2, t) * 0.1) * env;
});

// Defeat SFX: descending
genSFX('sfx_defeat', 1.1, (t) => {
  const env = adsr(t, 0.02, 0.3, 0.4, 0.4, 1.1);
  const f = 500 - 300 * (t / 1.1);
  return (sine(f, t) * 0.3 + sine(f * 0.5, t) * 0.2) * env;
});

// UI click
genSFX('sfx_ui_click', 0.1, (t) => {
  return sine(1200, t) * 0.4 * Math.exp(-t * 40);
});

// UI hover
genSFX('sfx_ui_hover', 0.06, (t) => {
  return sine(1500, t) * 0.2 * Math.exp(-t * 50);
});

// UI popup open
genSFX('sfx_ui_popup_open', 0.25, (t) => {
  const env = adsr(t, 0.02, 0.08, 0.4, 0.1, 0.25);
  return sine(600 + 400 * t, t) * 0.3 * env;
});

// UI popup close
genSFX('sfx_ui_popup_close', 0.18, (t) => {
  const env = Math.exp(-t * 15);
  return sine(800 - 400 * t, t) * 0.3 * env;
});

// Match found: exciting ping
genSFX('sfx_match_found', 0.9, (t) => {
  const env = adsr(t, 0.02, 0.2, 0.4, 0.3, 0.9);
  const f = t < 0.3 ? 600 : t < 0.6 ? 800 : 1000;
  return (sine(f, t) * 0.3 + sine(f * 1.5, t) * 0.15) * env;
});

// Countdown tick
genSFX('sfx_countdown_tick', 0.12, (t) => {
  return sine(1000, t) * 0.35 * Math.exp(-t * 30);
});

// Countdown end
genSFX('sfx_countdown_end', 0.35, (t) => {
  const env = Math.exp(-t * 8);
  return (sine(800, t) * 0.3 + sine(600, t) * 0.2) * env;
});

// Matching loop: pulsing search
genSFX('sfx_matching_loop', 2.0, (t) => {
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  return sine(400, t) * 0.15 * pulse;
});

console.log(`\nDone! Generated ${fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.wav')).length} WAV files in ${OUT_DIR}`);
