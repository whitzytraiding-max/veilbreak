import { COLS, ROWS, HEX_DIRS } from '../constants.js';
import { AudioManager } from '../managers/AudioManager.js';

export class VeilManager {
  constructor(scene, hexGrid, veilConfig) {
    this.scene = scene;
    this.hexGrid = hexGrid;
    this.config = veilConfig; // { startMove, spreadEvery, startCells }
    this.moveCount = 0;
    this.active = !!veilConfig;

    if (veilConfig?.startCells) {
      // Seed initial veil cells
      hexGrid.spreadVeil(veilConfig.startCells);
    }
  }

  onMoveMade() {
    if (!this.active || !this.config) return;
    this.moveCount++;

    if (this.moveCount < this.config.startMove) return;

    const sinceTrigger = this.moveCount - this.config.startMove;
    if (sinceTrigger % this.config.spreadEvery === 0) {
      this._spread();
    }
  }

  _spread() {
    const toAdd = [];
    const existing = Object.keys(this.hexGrid.veilCells);

    if (existing.length === 0) return;

    existing.forEach(key => {
      const [c, r] = key.split(',').map(Number);
      const dirs = r % 2 === 0 ? HEX_DIRS.even : HEX_DIRS.odd;
      dirs.forEach(([dc, dr]) => {
        const nc = c + dc;
        const nr = r + dr;
        if (
          nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS &&
          !this.hexGrid.veilCells[`${nc},${nr}`]
        ) {
          toAdd.push([nc, nr]);
        }
      });
    });

    // Pick random subset to prevent total instant spread
    const maxSpread = Math.min(toAdd.length, 2 + Math.floor(this.moveCount / 10));
    const spread = Phaser.Utils.Array.Shuffle(toAdd).slice(0, maxSpread);
    if (spread.length > 0) {
      this.hexGrid.spreadVeil(spread);
      AudioManager.playVeilSpread();
      this.scene.events.emit('veilSpread', spread);
    }
  }

  isBoardLost() {
    const totalCells = COLS * ROWS;
    const veilCount = this.hexGrid.getVeilCount();
    return veilCount >= Math.floor(totalCells * 0.45); // 45% covered = loss
  }

  destroy() {}
}
