const KEY = 'veilbreak_tutorial';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

let state = load();

// Tracks which one-time coaching cards the player has already seen:
// 'intro' (basic drag) + one per objective type (CLEAR/ANCHOR/CONTAIN/CHAIN).
export const Tutorial = {
  seen: (k) => !!state[k],
  markSeen(k) {
    state[k] = true;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  },
  reset() {
    state = {};
    try { localStorage.removeItem(KEY); } catch {}
  },
};
