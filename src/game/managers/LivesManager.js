const MAX_LIVES = 5;
const REGEN_MS = 30 * 60 * 1000; // 30 minutes per life
const LIVES_KEY = 'veilbreak_lives';

function loadLives() {
  try {
    const raw = localStorage.getItem(LIVES_KEY);
    if (!raw) return { lives: MAX_LIVES, lastLost: null };
    return JSON.parse(raw);
  } catch {
    return { lives: MAX_LIVES, lastLost: null };
  }
}

function saveLives(data) {
  try { localStorage.setItem(LIVES_KEY, JSON.stringify(data)); } catch {}
}

export const LivesManager = {
  getLives() {
    const data = loadLives();
    if (data.lives >= MAX_LIVES || !data.lastLost) return MAX_LIVES;

    // Regenerate lives based on elapsed time
    const elapsed = Date.now() - data.lastLost;
    const regenned = Math.floor(elapsed / REGEN_MS);
    if (regenned > 0) {
      const newLives = Math.min(MAX_LIVES, data.lives + regenned);
      const newLastLost = newLives >= MAX_LIVES ? null : data.lastLost + regenned * REGEN_MS;
      saveLives({ lives: newLives, lastLost: newLastLost });
      return newLives;
    }
    return data.lives;
  },

  hasLife() {
    return this.getLives() > 0;
  },

  loseLife() {
    const lives = this.getLives();
    const newLives = Math.max(0, lives - 1);
    const data = { lives: newLives, lastLost: newLives < MAX_LIVES ? Date.now() : null };
    saveLives(data);
    return newLives;
  },

  addLife() {
    const lives = this.getLives();
    const newLives = Math.min(MAX_LIVES, lives + 1);
    const data = {
      lives: newLives,
      lastLost: newLives >= MAX_LIVES ? null : loadLives().lastLost,
    };
    saveLives(data);
    return newLives;
  },

  getSecondsUntilNextLife() {
    const data = loadLives();
    if (data.lives >= MAX_LIVES || !data.lastLost) return 0;
    const elapsed = Date.now() - data.lastLost;
    const remaining = REGEN_MS - (elapsed % REGEN_MS);
    return Math.ceil(remaining / 1000);
  },

  getMaxLives: () => MAX_LIVES,
};
