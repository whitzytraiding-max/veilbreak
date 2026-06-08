import Phaser from 'phaser';
import {
  COLS, ROWS, HEX_RADIUS, HEX_W, HEX_H, HEX_V_SPACING,
  GRID_OFFSET_X, GRID_OFFSET_Y, COLORS, HEX_DIRS, DEPTHS, ANIM,
} from '../constants.js';
import { HexNode } from './HexNode.js';

export class HexGrid {
  constructor(scene) {
    this.scene = scene;
    this.cells = [];      // cells[col][row] = HexNode | null
    this.veilCells = {}; // key = `${col},${row}` = true

    this._bgGraphics = scene.add.graphics().setDepth(DEPTHS.HEX_GRID);
    this._veilGraphics = scene.add.graphics().setDepth(DEPTHS.VEIL);
    this._drawBackground();

    // Init empty grid
    for (let c = 0; c < COLS; c++) {
      this.cells[c] = new Array(ROWS).fill(null);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  populate(nodeTypes, anchors = []) {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        const { x, y } = this.cellToPixel(c, r);
        const node = new HexNode(this.scene, c, r, type, x, y);
        this.cells[c][r] = node;
      }
    }
    anchors.forEach(([c, r]) => {
      const node = this.cells[c]?.[r];
      if (node) node.setAnchor(true);
    });
  }

  getNode(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return this.cells[col][row];
  }

  isVeil(col, row) {
    return !!this.veilCells[`${col},${row}`];
  }

  getNeighbors(col, row) {
    const dirs = row % 2 === 0 ? HEX_DIRS.even : HEX_DIRS.odd;
    return dirs
      .map(([dc, dr]) => [col + dc, row + dr])
      .filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
  }

  areAdjacent(col1, row1, col2, row2) {
    return this.getNeighbors(col1, row1).some(([c, r]) => c === col2 && r === row2);
  }

  getCellAtPoint(px, py) {
    // Find closest cell center within touch radius
    let best = null;
    let bestDist = HEX_RADIUS * 1.5;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const { x, y } = this.cellToPixel(c, r);
        const dist = Math.hypot(px - x, py - y);
        if (dist < bestDist && this.cells[c][r]) {
          bestDist = dist;
          best = this.cells[c][r];
        }
      }
    }
    return best;
  }

  clearNodes(nodes, onAllDone) {
    if (nodes.length === 0) { onAllDone?.(); return; }

    nodes.forEach((node, i) => {
      this.cells[node.col][node.row] = null;
      this.scene.time.delayedCall(i * 40, () => {
        try { node.explode(() => {}); } catch (_) { try { node.destroy(); } catch {} }
      });
    });

    // Timer fires after last explosion is guaranteed done — no tween callback dependency
    const maxWait = (nodes.length - 1) * 40 + Math.ceil(ANIM.EXPLOSION_DURATION * 0.7) + 60;
    this.scene.time.delayedCall(maxWait, () => {
      nodes.forEach(n => { try { if (!n.scene) return; n.destroy(); } catch {} });
      onAllDone?.();
    });
  }

  applyGravity(onComplete) {
    let anyMoved = false;

    for (let c = 0; c < COLS; c++) {
      let emptyRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.cells[c][r]) {
          if (r !== emptyRow) {
            this.cells[c][emptyRow] = this.cells[c][r];
            this.cells[c][r] = null;
            const node = this.cells[c][emptyRow];
            node.col = c;
            node.row = emptyRow;
            const { x, y } = this.cellToPixel(c, emptyRow);
            this.scene.tweens.killTweensOf(node);
            this.scene.tweens.add({
              targets: node,
              x,
              y,
              duration: ANIM.DROP_DURATION,
              ease: ANIM.DROP_EASE,
            });
            anyMoved = true;
          }
          emptyRow--;
        }
      }
    }

    // Single timer — avoids per-tween onComplete races
    const wait = anyMoved ? ANIM.DROP_DURATION + 50 : 0;
    this.scene.time.delayedCall(wait, () => onComplete?.());
  }

  fillEmpty(nodeTypes, onComplete) {
    const scene = this.scene;
    let maxWait = 0;

    for (let c = 0; c < COLS; c++) {
      let spawnIndex = 0;
      for (let r = 0; r < ROWS; r++) {
        if (!this.cells[c][r]) {
          const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
          const { x, y: targetY } = this.cellToPixel(c, r);
          const startY = GRID_OFFSET_Y - HEX_H * (spawnIndex + 1) * 1.6;
          const delay = spawnIndex * 45;

          const node = new HexNode(scene, c, r, type, x, startY);
          this.cells[c][r] = node;

          scene.tweens.add({
            targets: node,
            y: targetY,
            duration: ANIM.DROP_DURATION,
            delay,
            ease: ANIM.DROP_EASE,
          });

          maxWait = Math.max(maxWait, delay + ANIM.DROP_DURATION);
          spawnIndex++;
        }
      }
    }

    // Single timer fires after the last tween is guaranteed done.
    // Avoids per-tween onComplete races that can silently deadlock.
    scene.time.delayedCall(maxWait + 50, () => onComplete?.());
  }

  spreadVeil(cells) {
    cells.forEach(([c, r]) => {
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
        this.veilCells[`${c},${r}`] = true;
      }
    });
    this._redrawVeil();
  }

  clearVeilAt(col, row) {
    const key = `${col},${row}`;
    if (this.veilCells[key]) {
      delete this.veilCells[key];
      this._redrawVeil();
      return true;
    }
    return false;
  }

  getVeilCount() {
    return Object.keys(this.veilCells).length;
  }

  countAnchors() {
    let n = 0;
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++)
        if (this.cells[c][r]?.isAnchor) n++;
    return n;
  }

  destroy() {
    this._bgGraphics.destroy();
    this._veilGraphics.destroy();
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++)
        this.cells[c][r]?.destroy();
  }

  // ── Layout helpers ─────────────────────────────────────────────────────────

  cellToPixel(col, row) {
    const x = GRID_OFFSET_X + col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
    const y = GRID_OFFSET_Y + row * HEX_V_SPACING;
    return { x, y };
  }

  _hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push(new Phaser.Math.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return pts;
  }

  _drawBackground() {
    const g = this._bgGraphics;
    g.clear();
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const { x, y } = this.cellToPixel(c, r);
        const pts = this._hexPoints(x, y, HEX_RADIUS - 1);
        g.fillStyle(COLORS.HEX_FILL, 1);
        g.fillPoints(pts, true);
        g.lineStyle(1.5, COLORS.HEX_BORDER, 0.9);
        g.strokePoints(pts, true);
      }
    }
  }

  _redrawVeil() {
    const g = this._veilGraphics;
    g.clear();
    Object.keys(this.veilCells).forEach(key => {
      const [c, r] = key.split(',').map(Number);
      const { x, y } = this.cellToPixel(c, r);
      const pts = this._hexPoints(x, y, HEX_RADIUS - 1);

      g.fillStyle(COLORS.VEIL_FILL, 0.88);
      g.fillPoints(pts, true);
      g.lineStyle(2, COLORS.VEIL_BORDER, 0.9);
      g.strokePoints(pts, true);

      // Pulsing inner dot
      g.fillStyle(0x550077, 0.5);
      g.fillCircle(x, y, 7);
    });
  }
}
