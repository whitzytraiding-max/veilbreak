import { AudioManager } from './AudioManager.js';

const KEY = 'veilbreak_settings';
const defaults = { sfx: true, music: true, haptics: true };

function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}

let state = load();

export const Settings = {
  get: () => state,
  isSfx: () => state.sfx,
  isMusic: () => state.music,
  isHaptics: () => state.haptics,

  set(key, val) {
    state[key] = !!val;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    this.apply();
  },

  toggle(key) {
    this.set(key, !state[key]);
    return state[key];
  },

  // Push the current values into the systems that act on them.
  apply() {
    AudioManager.setEnabled(state.sfx);
    AudioManager.setMusicEnabled(state.music);
  },
};
