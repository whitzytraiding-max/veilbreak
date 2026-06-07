// goals: { type: 'CLEAR'|'ANCHOR'|'CONTAIN'|'CHAIN', target: number }
// veil: { startMove: number, spreadEvery: number, startCells: [[col,row],...] }
// anchors: [[col,row],...] — cells that must be cleared by chaining adjacent

export const LEVELS = [
  // ─── CHAPTER 1: The Shattered Coast ───────────────────────────────────────
  {
    id: 1, chapter: 1, levelInChapter: 1,
    name: 'First Light',
    goals: [{ type: 'CLEAR', target: 15 }],
    moves: 28,
    veil: null,
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 2, chapter: 1, levelInChapter: 2,
    name: 'Ripple',
    goals: [{ type: 'CLEAR', target: 20 }],
    moves: 28,
    veil: null,
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 3, chapter: 1, levelInChapter: 3,
    name: 'Tidebreak',
    goals: [{ type: 'CLEAR', target: 25 }],
    moves: 26,
    veil: null,
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 4, chapter: 1, levelInChapter: 4,
    name: 'Ember Rise',
    goals: [{ type: 'CLEAR', target: 22 }, { type: 'CHAIN', target: 5 }],
    moves: 24,
    veil: null,
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 5, chapter: 1, levelInChapter: 5,
    name: 'The Veil Arrives',
    goals: [{ type: 'CLEAR', target: 20 }],
    moves: 22,
    veil: { startMove: 5, spreadEvery: 4, startCells: [[0,0],[6,0]] },
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 6, chapter: 1, levelInChapter: 6,
    name: 'Dark Tide',
    goals: [{ type: 'CONTAIN', target: 10 }],
    moves: 25,
    veil: { startMove: 3, spreadEvery: 3, startCells: [[0,0],[6,0],[3,7]] },
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 7, chapter: 1, levelInChapter: 7,
    name: 'Stone Anchors',
    goals: [{ type: 'ANCHOR', target: 3 }],
    moves: 22,
    veil: null,
    anchors: [[1,2],[3,4],[5,2]],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 8, chapter: 1, levelInChapter: 8,
    name: 'Deeper Still',
    goals: [{ type: 'ANCHOR', target: 4 }, { type: 'CLEAR', target: 15 }],
    moves: 24,
    veil: { startMove: 6, spreadEvery: 4, startCells: [[0,7],[6,7]] },
    anchors: [[0,3],[2,1],[4,6],[6,3]],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 9, chapter: 1, levelInChapter: 9,
    name: 'The Last Shore',
    goals: [{ type: 'CLEAR', target: 30 }, { type: 'CHAIN', target: 7 }],
    moves: 26,
    veil: { startMove: 4, spreadEvery: 3, startCells: [[0,0],[6,0],[0,7],[6,7]] },
    anchors: [[3,3]],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
  },
  {
    id: 10, chapter: 1, levelInChapter: 10,
    name: 'Mending the Coast',
    goals: [{ type: 'ANCHOR', target: 5 }, { type: 'CLEAR', target: 25 }],
    moves: 28,
    veil: { startMove: 3, spreadEvery: 3, startCells: [[0,0],[6,0],[0,7],[6,7]] },
    anchors: [[1,1],[5,1],[1,6],[5,6],[3,3]],
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    minChain: 3,
    storyUnlock: true,
  },

  // ─── CHAPTER 2: Ember Vaults ───────────────────────────────────────────────
  {
    id: 11, chapter: 2, levelInChapter: 1,
    name: 'Into the Deep',
    goals: [{ type: 'CLEAR', target: 20 }],
    moves: 25,
    veil: null,
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'SHADOW'],
    minChain: 3,
  },
  {
    id: 12, chapter: 2, levelInChapter: 2,
    name: 'Shadow Bloom',
    goals: [{ type: 'CLEAR', target: 22 }],
    moves: 24,
    veil: { startMove: 5, spreadEvery: 4, startCells: [[3,0]] },
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'SHADOW'],
    minChain: 3,
  },
  {
    id: 13, chapter: 2, levelInChapter: 3,
    name: 'Forge Heart',
    goals: [{ type: 'ANCHOR', target: 3 }, { type: 'CLEAR', target: 18 }],
    moves: 26,
    veil: { startMove: 4, spreadEvery: 3, startCells: [[0,4],[6,4]] },
    anchors: [[3,0],[1,7],[5,7]],
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'SHADOW'],
    minChain: 3,
  },
  {
    id: 14, chapter: 2, levelInChapter: 4,
    name: 'Ash Tide',
    goals: [{ type: 'CONTAIN', target: 8 }, { type: 'CHAIN', target: 6 }],
    moves: 26,
    veil: { startMove: 2, spreadEvery: 3, startCells: [[0,0],[6,0],[3,7]] },
    anchors: [],
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'SHADOW'],
    minChain: 3,
  },
  {
    id: 15, chapter: 2, levelInChapter: 5,
    name: 'Sealed Vault',
    goals: [{ type: 'ANCHOR', target: 6 }],
    moves: 28,
    veil: { startMove: 5, spreadEvery: 4, startCells: [[0,0],[6,0]] },
    anchors: [[0,0],[6,0],[0,7],[6,7],[3,0],[3,7]],
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'SHADOW'],
    minChain: 3,
    storyUnlock: true,
  },
];

export function getLevelData(levelId) {
  return LEVELS.find(l => l.id === levelId) || LEVELS[0];
}

export function getChapterLevels(chapterId) {
  return LEVELS.filter(l => l.chapter === chapterId);
}

export function getTotalLevels() {
  return LEVELS.length;
}
