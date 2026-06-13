export const GAME_W = 400;
export const GAME_H = 800;

export const COLS = 7;
export const ROWS = 8;
export const HEX_RADIUS = 29;
export const HEX_W = Math.sqrt(3) * HEX_RADIUS;   // ~50.2
export const HEX_H = 2 * HEX_RADIUS;               // 58
export const HEX_V_SPACING = HEX_H * 0.75;         // 43.5

// Centre the grid horizontally, accounting for the odd-row half-cell offset:
// columns span [0 .. (COLS-1)*HEX_W] on even rows and up to +HEX_W/2 on odd rows.
export const GRID_OFFSET_X = GAME_W / 2 - ((COLS - 1) * HEX_W + HEX_W / 2) / 2;

// Centre the grid vertically in the play area between the goal bar (~126) and the
// score/moves bar (GAME_H - 72), so it no longer floats high with dead space below.
const PLAY_TOP = 126;
const PLAY_BOTTOM = GAME_H - 72;
export const GRID_OFFSET_Y = (PLAY_TOP + PLAY_BOTTOM) / 2 - ((ROWS - 1) / 2) * HEX_V_SPACING;

export const NODE_TYPES = ['FIRE', 'WATER', 'EARTH', 'AIR', 'SHADOW', 'LIGHT'];

export const NODE_CONFIG = {
  FIRE:   { base: 0xE83B3B, glow: 0xFF7744, mid: 0xFF5533, light: 0xFFAA88 },
  WATER:  { base: 0x2F6FE8, glow: 0x55AAFF, mid: 0x4488FF, light: 0x99CCFF },
  EARTH:  { base: 0x2EAA4E, glow: 0x55EE77, mid: 0x33CC55, light: 0x88FFAA },
  AIR:    { base: 0x8899DD, glow: 0xCCDDFF, mid: 0xAABBFF, light: 0xEEEEFF },
  SHADOW: { base: 0x7733CC, glow: 0xBB55FF, mid: 0x9944EE, light: 0xCC99FF },
  LIGHT:  { base: 0xDDAA00, glow: 0xFFEE44, mid: 0xFFCC00, light: 0xFFFF88 },
};

export const COLORS = {
  BG:           0x05040F,
  HEX_FILL:     0x0D0D22,
  HEX_BORDER:   0x1A2244,
  HEX_HOVER:    0x223366,
  VEIL_FILL:    0x0A0015,
  VEIL_BORDER:  0x330044,
  TEXT_BRIGHT:  0xFFFFFF,
  TEXT_DIM:     0x7788AA,
  CHAIN_LINE:   0xFFFFFF,
  GOLD:         0xFFCC00,
  RED:          0xFF3333,
  GREEN:        0x33FF88,
};

export const DEPTHS = {
  BG:        0,
  HEX_GRID:  10,
  VEIL:      20,
  NODES:     30,
  CHAIN:     40,
  PARTICLES: 50,
  UI:        100,
};

export const ANIM = {
  NODE_PULSE_DURATION: 2200,
  NODE_PULSE_SCALE: 0.07,
  CHAIN_LINE_WIDTH: 5,
  EXPLOSION_DURATION: 400,
  DROP_DURATION: 220,
  DROP_EASE: 'Back.easeOut',
  WIN_DELAY: 600,
  FAIL_DELAY: 800,
};

// Odd-r offset hex neighbor directions
export const HEX_DIRS = {
  even: [[-1,-1],[0,-1],[1,0],[0,1],[-1,1],[-1,0]],
  odd:  [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,0]],
};
