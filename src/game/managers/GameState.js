const SAVE_KEY = 'veilbreak_save';

const defaults = {
  currentLevel: 1,
  highestUnlocked: 1,
  levelStars: {},      // { [levelId]: 1|2|3 }
  totalNodesCleared: 0,
  convergencesTriggered: 0,
  lastPlayed: null,
};

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

let _state = load();

export const GameState = {
  get: () => _state,

  getCurrentLevel: () => _state.currentLevel,

  setCurrentLevel(id) {
    _state.currentLevel = id;
    save(_state);
  },

  completeLevel(levelId, stars, nodesCleared) {
    const prev = _state.levelStars[levelId] || 0;
    _state.levelStars[levelId] = Math.max(prev, stars);
    _state.totalNodesCleared += nodesCleared;
    _state.lastPlayed = Date.now();

    const nextId = levelId + 1;
    if (nextId > _state.highestUnlocked) {
      _state.highestUnlocked = nextId;
    }
    _state.currentLevel = nextId;
    save(_state);
  },

  isLevelUnlocked(levelId) {
    return levelId <= _state.highestUnlocked;
  },

  getStars(levelId) {
    return _state.levelStars[levelId] || 0;
  },

  recordConvergence() {
    _state.convergencesTriggered += 1;
    save(_state);
  },

  saveLevelScore(levelId, score) {
    const key = `score_${levelId}`;
    if (score > (_state[key] || 0)) {
      _state[key] = score;
      save(_state);
    }
  },

  getBestScore(levelId) {
    return _state[`score_${levelId}`] || 0;
  },

  reset() {
    _state = { ...defaults };
    save(_state);
  },
};
