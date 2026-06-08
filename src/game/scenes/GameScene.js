import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, NODE_CONFIG, COLS, ROWS } from '../constants.js';
import { HexGrid } from '../objects/HexGrid.js';
import { ChainDrawer } from '../objects/ChainDrawer.js';
import { VeilManager } from '../objects/VeilManager.js';
import { Effects } from '../objects/Effects.js';
import { getLevelData } from '../data/levels.js';
import { GameState } from '../managers/GameState.js';
import { LivesManager } from '../managers/LivesManager.js';
import { AdManager } from '../managers/AdManager.js';
import { AudioManager } from '../managers/AudioManager.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = data?.levelId || GameState.getCurrentLevel();
    this.levelData = getLevelData(this.levelId);
    this.movesLeft = this.levelData.moves;
    this.nodesCleared = 0;
    this.anchorsCleared = 0;
    this.longestChain = 0;
    this.goalProgress = this._initGoalProgress();
    this._inputLocked = false;
  }

  create() {
    // Dark background with subtle star field
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x080818, 1);
    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Math.random() * GAME_W, Math.random() * GAME_H,
        Math.random() * 1.2 + 0.3, 0xFFFFFF, Math.random() * 0.35 + 0.05
      );
    }

    this.hexGrid = new HexGrid(this);
    this.hexGrid.populate(this.levelData.nodeTypes, this.levelData.anchors || []);

    this.veilManager = new VeilManager(this, this.hexGrid, this.levelData.veil);
    this.chainDrawer = new ChainDrawer(this, this.hexGrid);
    this.effects = new Effects(this);

    this.chainDrawer.on('chainComplete', this._onChainComplete, this);
    this.chainDrawer.on('convergence', this._onConvergence, this);
    this.events.on('veilSpread', this._onVeilSpread, this);

    this.scene.launch('UIOverlay', {
      levelData: this.levelData,
      movesLeft: this.movesLeft,
      goalProgress: this.goalProgress,
    });
    this.uiScene = this.scene.get('UIOverlay');

    AudioManager.startAmbient(this.levelData.chapter || 1);
  }

  // ── Goal tracking ───────────────────────────────────────────────────────────

  _initGoalProgress() {
    const progress = {};
    (this.levelData.goals || []).forEach(goal => {
      progress[goal.type] = { current: 0, target: goal.target, done: false };
    });
    return progress;
  }

  _tickGoal(type, amount) {
    const g = this.goalProgress[type];
    if (!g || g.done) return;
    g.current = Math.min(g.target, g.current + amount);
    if (g.current >= g.target) g.done = true;
    this.uiScene?.updateGoal(type, g.current, g.target);
  }

  _allGoalsMet() {
    return Object.values(this.goalProgress).every(g => g.done);
  }

  // ── Chain handlers ──────────────────────────────────────────────────────────

  _onChainComplete(chain) {
    if (this._inputLocked) return;
    this._lockInput();

    const chainLen = chain.length;
    if (chainLen > this.longestChain) this.longestChain = chainLen;

    AudioManager.playChainClear(chain[0].type, chainLen);
    this._tickGoal('CHAIN', chainLen);
    try { this.effects.chainGlow(chain); } catch (_) {}

    // Count cleared anchors
    chain.forEach(n => { if (n.isAnchor) this.anchorsCleared++; });

    this.hexGrid.clearNodes(chain, () => {
      this.nodesCleared += chainLen;
      this._tickGoal('CLEAR', chainLen);
      this._tickGoal('ANCHOR', chain.filter(n => n.isAnchor).length);

      this.hexGrid.applyGravity(() => {
        this.hexGrid.fillEmpty(this.levelData.nodeTypes, () => {
          this._afterMove();
        });
      });
    });
  }

  _onConvergence(chain) {
    if (this._inputLocked) return;
    this._lockInput();

    GameState.recordConvergence();
    AudioManager.playConvergence();
    const type = chain[0].type;

    // Collect all nodes of matching type on board
    const allOfType = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const node = this.hexGrid.getNode(c, r);
        if (node && node.type === type) allOfType.push(node);
      }
    }

    // Anchors in convergence also count
    const anchorCount = allOfType.filter(n => n.isAnchor).length;
    this.anchorsCleared += anchorCount;

    this.effects.convergenceBurst(chain[0]);

    this.hexGrid.clearNodes(allOfType, () => {
      this.nodesCleared += allOfType.length;
      this._tickGoal('CLEAR', allOfType.length);
      this._tickGoal('ANCHOR', anchorCount);
      this._tickGoal('CHAIN', chain.length);

      this.hexGrid.applyGravity(() => {
        this.hexGrid.fillEmpty(this.levelData.nodeTypes, () => {
          this._afterMove();
        });
      });
    });
  }

  // ── Move resolution ─────────────────────────────────────────────────────────

  _afterMove() {
    this.movesLeft--;
    this.veilManager.onMoveMade();
    this.uiScene?.updateMoves(this.movesLeft);

    if (this._allGoalsMet()) {
      AudioManager.playWin();
      this.time.delayedCall(400, () => this._win());
      return;
    }

    if (this.veilManager.isBoardLost()) {
      AudioManager.playFail();
      this.time.delayedCall(400, () => this._fail('veil'));
      return;
    }

    if (this.movesLeft <= 0) {
      AudioManager.playFail();
      this.time.delayedCall(500, () => this._fail('moves'));
      return;
    }

    this._unlockInput();
  }

  _onVeilSpread() {
    if (this.veilManager.isBoardLost()) {
      this.time.delayedCall(500, () => this._fail('veil'));
    }
  }

  // ── Win / Fail ──────────────────────────────────────────────────────────────

  _win() {
    const stars = this._calcStars();
    this.scene.stop('UIOverlay');
    this.scene.start('Win', {
      levelId: this.levelId,
      stars,
      nodesCleared: this.nodesCleared,
      levelData: this.levelData,
    });
  }

  _fail(reason) {
    LivesManager.loseLife();
    this.scene.stop('UIOverlay');
    this.scene.start('Fail', {
      levelId: this.levelId,
      reason,
      movesLeft: this.movesLeft,
      levelData: this.levelData,
      nodesCleared: this.nodesCleared,
    });
  }

  _calcStars() {
    const ratio = this.movesLeft / this.levelData.moves;
    if (ratio >= 0.4) return 3;
    if (ratio >= 0.2) return 2;
    return 1;
  }

  // ── Booster API (called from UIOverlay) ────────────────────────────────────

  useBooster(type) {
    if (this._inputLocked) return;
    switch (type) {
      case 'NOVA': this._boosterNova(); break;
      case 'PULSE': this._boosterPulse(); break;
      case 'MEND': this._boosterMend(); break;
      case 'SURGE': this._boosterSurge(); break;
    }
  }

  _boosterNova() {
    // Clear most common type on board
    const counts = {};
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const n = this.hexGrid.getNode(c, r);
        if (n) counts[n.type] = (counts[n.type] || 0) + 1;
      }
    const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topType) return;

    this._lockInput();
    const nodes = [];
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const n = this.hexGrid.getNode(c, r);
        if (n?.type === topType) nodes.push(n);
      }
    this.effects.screenFlash(NODE_CONFIG[topType].glow, 0.3);
    this.hexGrid.clearNodes(nodes, () => {
      this.nodesCleared += nodes.length;
      this._tickGoal('CLEAR', nodes.length);
      this.hexGrid.applyGravity(() => this.hexGrid.fillEmpty(this.levelData.nodeTypes, () => this._afterMove()));
    });
  }

  _boosterPulse() {
    // Clear center 7-cell hex zone
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    const targets = [[cx, cy], ...this.hexGrid.getNeighbors(cx, cy)]
      .map(([c, r]) => this.hexGrid.getNode(c, r)).filter(Boolean);
    this._lockInput();
    this.effects.screenFlash(0xFFFFFF, 0.2);
    this.hexGrid.clearNodes(targets, () => {
      this.nodesCleared += targets.length;
      this._tickGoal('CLEAR', targets.length);
      this.hexGrid.applyGravity(() => this.hexGrid.fillEmpty(this.levelData.nodeTypes, () => this._afterMove()));
    });
  }

  _boosterMend() {
    // Clear all veil
    Object.keys(this.hexGrid.veilCells).forEach(key => {
      const [c, r] = key.split(',').map(Number);
      this.hexGrid.clearVeilAt(c, r);
      const { x, y } = this.hexGrid.cellToPixel(c, r);
      this.effects.veilClearFlash(x, y);
    });
    this._unlockInput();
  }

  _boosterSurge() {
    this.movesLeft += 3;
    this.uiScene?.updateMoves(this.movesLeft);
    this.effects.screenFlash(0x33FF88, 0.2);
    this._unlockInput();
  }

  // ── Input lock ──────────────────────────────────────────────────────────────

  _lockInput() {
    this._inputLocked = true;
    // Lock at ChainDrawer level — do NOT call input.setEnabled(false) on iOS
    // because disabling the InputPlugin drops Phaser's active touch tracking
    // and the subsequent pointerup is silently lost, freezing the game.
    this.chainDrawer?.lock();
    if (this._unlockTimer) this._unlockTimer.remove();
    this._unlockTimer = this.time.delayedCall(4000, () => {
      if (this._inputLocked) this._unlockInput();
    });
  }

  _unlockInput() {
    this._inputLocked = false;
    this.chainDrawer?.unlock();
    if (this._unlockTimer) { this._unlockTimer.remove(); this._unlockTimer = null; }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  shutdown() {
    AudioManager.stopAmbient();
    this.chainDrawer?.destroy();
    this.hexGrid?.destroy();
    this.effects?.destroy();
    this.veilManager?.destroy();
  }
}
