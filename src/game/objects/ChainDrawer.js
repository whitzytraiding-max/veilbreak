import Phaser from 'phaser';
import { NODE_CONFIG, COLORS, ANIM, DEPTHS } from '../constants.js';
import { AudioManager } from '../managers/AudioManager.js';

export class ChainDrawer {
  constructor(scene, hexGrid) {
    this.scene = scene;
    this.hexGrid = hexGrid;
    this.chain = [];
    this.isDrawing = false;
    this.pendingConvergence = false;

    this._lineGfx = scene.add.graphics().setDepth(DEPTHS.CHAIN);
    this._glowGfx = scene.add.graphics().setDepth(DEPTHS.CHAIN - 1);
    this._ringGfx = scene.add.graphics().setDepth(DEPTHS.CHAIN + 1);

    this._events = new Phaser.Events.EventEmitter();
    this._bindInput();
  }

  on(event, fn, ctx) { this._events.on(event, fn, ctx); }

  lock()   { this._locked = true;  }
  unlock() { this._locked = false; }

  update(time) {
    if (!this.isDrawing || this.chain.length < 2) return;
    this._flowT = time;
    this._redrawLine();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _bindInput() {
    const s = this.scene;
    s.input.on('pointerdown', this._onDown, this);
    s.input.on('pointermove', this._onMove, this);
    s.input.on('pointerup', this._onUp, this);
    // iOS fires touchcancel (notification, incoming call) → treat as release
    s.input.on('pointercancel', this._onUp, this);
  }

  _onDown(ptr) {
    if (this._locked) return;
    // worldX/worldY are zoom-aware (design space); ptr.x/y are in the larger
    // canvas backing space once the retina camera zoom is applied.
    const node = this.hexGrid.getCellAtPoint(ptr.worldX, ptr.worldY);
    if (!node || this.hexGrid.isVeil(node.col, node.row)) return;

    this.isDrawing = true;
    this.chain = [node];
    this.pendingConvergence = false;
    this._chainVeilCleared = 0;
    node.highlight(true);
    AudioManager.playNodeAdd(node.type);
    this._redrawLine();
  }

  _onMove(ptr) {
    if (!this.isDrawing || this.chain.length === 0) return;

    const node = this.hexGrid.getCellAtPoint(ptr.worldX, ptr.worldY);
    if (!node) return;

    const first = this.chain[0];
    const last = this.chain[this.chain.length - 1];

    if (this.pendingConvergence) return;

    // Ring closure → convergence: the player steps onto a node that is adjacent
    // to BOTH the current chain tail AND the chain head, closing a real polygon.
    // The closing node must be a fresh cell — not the start node itself.
    if (
      this.chain.length >= 5 &&
      node !== first &&
      node.type === first.type &&
      !this.hexGrid.isVeil(node.col, node.row) &&
      this.chain.indexOf(node) === -1 &&
      this.hexGrid.areAdjacent(last.col, last.row, node.col, node.row) &&
      this.hexGrid.areAdjacent(node.col, node.row, first.col, first.row)
    ) {
      this.chain.push(node);
      node.highlight(true);
      AudioManager.playNodeAdd(node.type);
      this.pendingConvergence = true;
      this._drawConvergenceRing(first, node);
      this._redrawLine();
      return;
    }

    // Already in chain — allow backtracking one step
    const existingIdx = this.chain.indexOf(node);
    if (existingIdx !== -1 && existingIdx === this.chain.length - 2) {
      const removed = this.chain.pop();
      removed.highlight(false);
      this._redrawLine();
      return;
    }
    if (existingIdx !== -1) return;

    // Only same-type, non-veil cells can join the chain
    if (node.type !== first.type || this.hexGrid.isVeil(node.col, node.row)) return;

    if (this.hexGrid.areAdjacent(last.col, last.row, node.col, node.row)) {
      this._addToChain(node);
    } else {
      // Fast swipe: the finger jumped past one or more cells between pointermove
      // events. Bridge the gap with a same-type adjacent path so the move lands
      // instead of being silently dropped (the "doesn't connect" feeling).
      const path = this._findPath(last, node);
      if (path) path.forEach(n => this._addToChain(n));
    }
  }

  _addToChain(node) {
    this.chain.push(node);
    node.highlight(true);
    AudioManager.playNodeAdd(node.type);
    this.hexGrid.getNeighbors(node.col, node.row).forEach(([c, r]) => {
      if (this.hexGrid.clearVeilAt(c, r)) this._chainVeilCleared++;
    });
    this._redrawLine();
  }

  // BFS for the shortest same-type adjacent path from `from` to `to`, skipping
  // cells already in the chain. Returns the cells to append (excluding `from`),
  // or null if there's no clean bridge.
  _findPath(from, to) {
    const type = this.chain[0].type;
    const key = (c, r) => c + ',' + r;
    const inChain = new Set(this.chain.map(n => key(n.col, n.row)));
    const seen = new Set([key(from.col, from.row)]);
    const queue = [[from]];
    while (queue.length) {
      const path = queue.shift();
      const cur = path[path.length - 1];
      if (cur === to) return path.slice(1);
      if (path.length > 4) continue;               // cap bridge length
      for (const [c, r] of this.hexGrid.getNeighbors(cur.col, cur.row)) {
        const k = key(c, r);
        if (seen.has(k)) continue;
        const nb = this.hexGrid.getNode(c, r);
        if (!nb || nb.type !== type || this.hexGrid.isVeil(c, r) || inChain.has(k)) continue;
        seen.add(k);
        queue.push([...path, nb]);
      }
    }
    return null;
  }

  _onUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.pendingConvergence && this.chain.length >= 5) {
      this._completeChain(true);
    } else if (this.chain.length >= 3) {
      this._completeChain(false);
    } else {
      this._cancelChain();
    }
  }

  // ── Chain resolution ───────────────────────────────────────────────────────

  _completeChain(isConvergence) {
    const veilCleared = this._chainVeilCleared || 0;
    const chainCopy = [...this.chain];
    chainCopy.forEach(n => n.highlight(false));
    this._clearGraphics();
    this.chain = [];
    this.pendingConvergence = false;
    this._chainVeilCleared = 0;

    if (isConvergence) {
      this._events.emit('convergence', chainCopy, veilCleared);
    } else {
      this._events.emit('chainComplete', chainCopy, veilCleared);
    }
  }

  _cancelChain() {
    this.chain.forEach(n => n.highlight(false));
    this._clearGraphics();
    this.chain = [];
    this.pendingConvergence = false;
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _redrawLine() {
    this._lineGfx.clear();
    this._glowGfx.clear();
    if (this.chain.length < 2) return;

    const cfg = NODE_CONFIG[this.chain[0].type];

    // Build the list of segments to electrify (chain legs + closing leg if sealing)
    const segs = [];
    for (let i = 0; i < this.chain.length - 1; i++) {
      segs.push([this.chain[i], this.chain[i + 1]]);
    }
    if (this.pendingConvergence) {
      segs.push([this.chain[this.chain.length - 1], this.chain[0]]);
    }

    // Draw each leg as a flickering lightning bolt
    segs.forEach((seg, idx) => this._drawBolt(seg[0], seg[1], cfg, idx));

    // Bright nodes where the bolt connects
    this.chain.forEach(n => {
      this._lineGfx.fillStyle(cfg.light || 0xFFFFFF, 0.5);
      this._lineGfx.fillCircle(n.x, n.y, 7);
      this._lineGfx.fillStyle(0xFFFFFF, 0.95);
      this._lineGfx.fillCircle(n.x, n.y, 3.5);
    });
  }

  // A jagged electric arc between two points, regenerated each frame so it
  // crackles. Midpoint-displacement gives the lightning its forked, organic path.
  _drawBolt(a, b, cfg, seed) {
    const pts = this._boltPath(a.x, a.y, b.x, b.y, seed);

    // Outer glow
    this._glowGfx.lineStyle(12, cfg.glow, 0.2);
    this._strokePts(this._glowGfx, pts);
    this._glowGfx.lineStyle(6, cfg.light || cfg.glow, 0.3);
    this._strokePts(this._glowGfx, pts);
    // Mid colored arc
    this._lineGfx.lineStyle(4, cfg.glow, 0.8);
    this._strokePts(this._lineGfx, pts);
    // Hot white core
    this._lineGfx.lineStyle(2, 0xFFFFFF, 1);
    this._strokePts(this._lineGfx, pts);
  }

  // Jittered polyline between two points. Jitter is reseeded from _flowT so the
  // bolt visibly flickers; perpendicular offset shrinks near the endpoints.
  _boltPath(x1, y1, x2, y2, seed) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;          // unit normal
    const steps = Math.max(4, Math.round(len / 14));
    const amp = Math.min(13, len * 0.16);
    const t = (this._flowT || 0) * 0.02;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      // taper offset to 0 at both ends so it still touches the orbs
      const taper = Math.sin(f * Math.PI);
      // pseudo-random but smoothly time-varying displacement
      const wobble = Math.sin(f * 9 + seed * 2.3 + t) * 0.6
                   + Math.sin(f * 23 + seed + t * 1.7) * 0.4;
      const off = wobble * amp * taper;
      pts.push([x1 + dx * f + nx * off, y1 + dy * f + ny * off]);
    }
    return pts;
  }

  _strokePts(gfx, pts) {
    gfx.beginPath();
    gfx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i][0], pts[i][1]);
    gfx.strokePath();
  }

  // Draw rings on both the first node and the closing node to show the polygon sealed
  _drawConvergenceRing(firstNode, closingNode) {
    this._ringGfx.clear();
    const glow = NODE_CONFIG[firstNode.type].glow;

    [firstNode, closingNode].forEach(node => {
      if (!node) return;
      const r = 36;
      this._ringGfx.lineStyle(3, 0xFFFFFF, 0.9);
      this._ringGfx.strokeCircle(node.x, node.y, r);
      this._ringGfx.lineStyle(6, glow, 0.5);
      this._ringGfx.strokeCircle(node.x, node.y, r + 6);
    });

    this.scene.tweens.add({
      targets: this._ringGfx,
      alpha: 0.3,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  _clearGraphics() {
    this._lineGfx.clear();
    this._glowGfx.clear();
    this._ringGfx.clear();
    this.scene.tweens.killTweensOf(this._ringGfx);
    this._ringGfx.alpha = 1;
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onDown, this);
    this.scene.input.off('pointermove', this._onMove, this);
    this.scene.input.off('pointerup', this._onUp, this);
    this.scene.input.off('pointercancel', this._onUp, this);
    this._lineGfx.destroy();
    this._glowGfx.destroy();
    this._ringGfx.destroy();
    this._events.destroy();
  }
}
