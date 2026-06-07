import Phaser from 'phaser';
import { NODE_CONFIG, COLORS, ANIM, DEPTHS } from '../constants.js';

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

  // ── Input ──────────────────────────────────────────────────────────────────

  _bindInput() {
    const s = this.scene;
    s.input.on('pointerdown', this._onDown, this);
    s.input.on('pointermove', this._onMove, this);
    s.input.on('pointerup', this._onUp, this);
  }

  _onDown(ptr) {
    const node = this.hexGrid.getCellAtPoint(ptr.x, ptr.y);
    if (!node || this.hexGrid.isVeil(node.col, node.row)) return;

    this.isDrawing = true;
    this.chain = [node];
    this.pendingConvergence = false;
    node.highlight(true);
    this._redrawLine();
  }

  _onMove(ptr) {
    if (!this.isDrawing || this.chain.length === 0) return;

    const node = this.hexGrid.getCellAtPoint(ptr.x, ptr.y);
    if (!node) return;

    const first = this.chain[0];
    const last = this.chain[this.chain.length - 1];

    // Loop closure → convergence
    if (
      this.chain.length >= 3 &&
      node === first &&
      !this.pendingConvergence
    ) {
      this.pendingConvergence = true;
      this._drawConvergenceRing(first);
      return;
    }

    if (this.pendingConvergence) return;

    // Already in chain — allow backtracking
    const existingIdx = this.chain.indexOf(node);
    if (existingIdx !== -1 && existingIdx === this.chain.length - 2) {
      const removed = this.chain.pop();
      removed.highlight(false);
      this._redrawLine();
      return;
    }
    if (existingIdx !== -1) return;

    // Extend chain: same type, adjacent to last, not veil
    if (
      node.type === first.type &&
      this.hexGrid.areAdjacent(last.col, last.row, node.col, node.row) &&
      !this.hexGrid.isVeil(node.col, node.row)
    ) {
      this.chain.push(node);
      node.highlight(true);
      this._redrawLine();

      // Also clear adjacent veil when extending chain
      this.hexGrid.getNeighbors(node.col, node.row).forEach(([c, r]) => {
        this.hexGrid.clearVeilAt(c, r);
      });
    }
  }

  _onUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.pendingConvergence && this.chain.length >= 3) {
      this._completeChain(true);
    } else if (this.chain.length >= 3) {
      this._completeChain(false);
    } else {
      this._cancelChain();
    }
  }

  // ── Chain resolution ───────────────────────────────────────────────────────

  _completeChain(isConvergence) {
    const chainCopy = [...this.chain];
    chainCopy.forEach(n => n.highlight(false));
    this._clearGraphics();
    this.chain = [];
    this.pendingConvergence = false;

    if (isConvergence) {
      this._events.emit('convergence', chainCopy);
    } else {
      this._events.emit('chainComplete', chainCopy);
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

    // Glow layer
    this._glowGfx.lineStyle(ANIM.CHAIN_LINE_WIDTH + 8, cfg.glow, 0.25);
    this._glowGfx.beginPath();
    this._glowGfx.moveTo(this.chain[0].x, this.chain[0].y);
    this.chain.slice(1).forEach(n => this._glowGfx.lineTo(n.x, n.y));
    this._glowGfx.strokePath();

    // Main line
    this._lineGfx.lineStyle(ANIM.CHAIN_LINE_WIDTH, cfg.mid, 0.95);
    this._lineGfx.beginPath();
    this._lineGfx.moveTo(this.chain[0].x, this.chain[0].y);
    this.chain.slice(1).forEach(n => this._lineGfx.lineTo(n.x, n.y));
    this._lineGfx.strokePath();

    // Dots at each node
    this.chain.forEach(n => {
      this._lineGfx.fillStyle(0xFFFFFF, 0.8);
      this._lineGfx.fillCircle(n.x, n.y, 5);
    });
  }

  _drawConvergenceRing(node) {
    this._ringGfx.clear();
    const r = 36;
    this._ringGfx.lineStyle(3, 0xFFFFFF, 0.9);
    this._ringGfx.strokeCircle(node.x, node.y, r);
    this._ringGfx.lineStyle(6, NODE_CONFIG[node.type].glow, 0.5);
    this._ringGfx.strokeCircle(node.x, node.y, r + 6);

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
    this._lineGfx.destroy();
    this._glowGfx.destroy();
    this._ringGfx.destroy();
    this._events.destroy();
  }
}
