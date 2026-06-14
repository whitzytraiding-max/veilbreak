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
    // Veil renders ABOVE the orbs so it visibly shrouds them (below the chain line)
    this._veilGraphics = scene.add.graphics().setDepth(DEPTHS.NODES + 5);
    this._veilPulseT = 0;
    this._veilLastRedraw = 0;
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
    // Find closest cell center within a forgiving touch radius (~1 cell), so
    // fingers reliably grab the nearest orb rather than falling into dead zones.
    let best = null;
    let bestDist = HEX_RADIUS * 1.9;
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
    const now = this.scene.time.now;
    cells.forEach(([c, r]) => {
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && !this.veilCells[`${c},${r}`]) {
        // store the birth time so _redrawVeil can grow each cell in
        this.veilCells[`${c},${r}`] = now;
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

  updateVeil(time) {
    this._veilPulseT = time;
    if (time - this._veilLastRedraw < 33) return;
    this._veilLastRedraw = time;
    if (Object.keys(this.veilCells).length > 0) {
      this._redrawVeil();
    }
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

        // Recessed inner face — gives each cell a 3D depth look
        const innerPts = this._hexPoints(x, y, HEX_RADIUS * 0.55);
        g.fillStyle(0x0A0A1C, 1);
        g.fillPoints(innerPts, true);

        g.lineStyle(1.5, COLORS.HEX_BORDER, 0.9);
        g.strokePoints(pts, true);
      }
    }
  }

  _redrawVeil() {
    const t = this._veilPulseT;
    const pulse = Math.sin(t * 0.0025) * 0.5 + 0.5; // 0→1→0 slow cycle
    const g = this._veilGraphics;
    g.clear();
    Object.entries(this.veilCells).forEach(([key, birth]) => {
      const [c, r] = key.split(',').map(Number);
      const { x, y } = this.cellToPixel(c, r);
      // grow each cell in over ~320ms so spreading reads as creeping corruption
      const age = typeof birth === 'number' ? t - birth : 9999;
      const grow = Phaser.Math.Clamp(age / 320, 0, 1);
      const ease = grow * (2 - grow); // easeOutQuad
      const rr = (HEX_RADIUS - 1) * (0.5 + 0.5 * ease);
      const a = ease; // overall opacity ramp
      const pts = this._hexPoints(x, y, rr);

      // 1. Wide purple corruption glow bleeding past the cell edge — makes
      //    veiled cells "bloom" so they read at a glance across the board
      g.fillStyle(0x8A1AFF, (0.10 + pulse * 0.10) * a);
      g.fillCircle(x, y, rr * 1.5);

      // 2. Frosted membrane — translucent, NOT opaque, so the orb's colour and
      //    glyph still read through. This is the legibility fix: you can plan
      //    around what's veiled instead of guessing.
      g.fillStyle(0x2A0A4D, 0.42 * a);
      g.fillPoints(pts, true);
      g.fillStyle(0x5A1AA0, (0.14 + pulse * 0.10) * a);
      g.fillPoints(pts, true);

      // 3. Bright pulsing edge — the clearest "this is veiled" signal,
      //    pushed harder so the veil stands out against the dark board
      g.lineStyle(3 + pulse * 2.5, 0xD66BFF, (0.85 + pulse * 0.15) * a);
      g.strokePoints(pts, true);
      // inner halo of the edge for extra glow
      g.lineStyle(1.5, 0xF0C4FF, (0.5 + pulse * 0.3) * a);
      g.strokePoints(this._hexPoints(x, y, rr * 0.88), true);

      // 4. Drifting corruption motes inside (kept toward the rim so they don't
      //    cover the orb glyph in the centre)
      const spin = t * 0.002;
      for (let i = 0; i < 4; i++) {
        const ang = spin + i * 1.6;
        const mr = (HEX_RADIUS - 6) * (0.55 + 0.28 * Math.sin(spin * 1.3 + i));
        const mx = x + Math.cos(ang) * mr;
        const my = y + Math.sin(ang) * mr;
        g.fillStyle(0xF0C4FF, (0.28 + pulse * 0.22) * a);
        g.fillCircle(mx, my, (2.2 + pulse * 1.4) * ease);
      }
    });
  }
}
