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
    this.score = 0;
    this.nodesCleared = 0;
    this.anchorsCleared = 0;
    this.longestChain = 0;
    this.goalProgress = this._initGoalProgress();
    this._inputLocked = false;
  }

  create() {
    // Deep space base
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x05040F, 1);

    // Nebula blobs — soft colored clouds in background
    const nebulaDefs = [
      { x: 70,  y: 180, r: 110, color: 0x1A0A3A, a: 0.55 },
      { x: 330, y: 370, r: 90,  color: 0x0A1828, a: 0.45 },
      { x: 180, y: 620, r: 120, color: 0x180A2A, a: 0.4  },
      { x: 320, y: 680, r: 70,  color: 0x0A1A1A, a: 0.35 },
    ];
    nebulaDefs.forEach(n => {
      for (let layer = 3; layer >= 1; layer--) {
        const blob = this.add.circle(n.x, n.y, n.r * layer * 0.42, n.color, n.a / layer);
        this.tweens.add({
          targets: blob,
          x: n.x + (Math.random() - 0.5) * 20,
          y: n.y + (Math.random() - 0.5) * 15,
          duration: 8000 + Math.random() * 5000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 4000,
        });
      }
    });

    // Twinkling stars
    for (let i = 0; i < 90; i++) {
      const sx = Math.random() * GAME_W;
      const sy = Math.random() * GAME_H;
      const sr = Math.random() * 1.3 + 0.2;
      const sa = Math.random() * 0.5 + 0.1;
      const star = this.add.circle(sx, sy, sr, 0xFFFFFF, sa);
      this.tweens.add({
        targets: star,
        alpha: sa * 0.1,
        duration: 1200 + Math.random() * 2800,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 3000,
        ease: 'Sine.easeInOut',
      });
    }

    // Vignette — darken edges so grid pops
    const corners = [[0, 0], [GAME_W, 0], [0, GAME_H], [GAME_W, GAME_H]];
    corners.forEach(([cx, cy]) => this.add.circle(cx, cy, 220, 0x020108, 0.65));

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
      score: 0,
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

  // ── Scoring ─────────────────────────────────────────────────────────────────

  _chainScore(n) {
    // Tetris-style quadratic: 3→300, 4→600, 5→1000, 6→1500, 7→2100, 8→2800
    return 50 * n * (n - 1);
  }

  _addScore(points, x, y) {
    this.score += points;
    this.uiScene?.updateScore(this.score);
    const color = points >= 3000 ? '#FF88FF'
      : points >= 1000 ? '#FF8844'
      : points >= 500  ? '#FFCC44'
      : '#FFFFFF';
    this._floatText(x, y, `+${points.toLocaleString()}`, color);
  }

  _floatText(x, y, text, color = '#FFFFFF') {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif', fontSize: '26px',
      color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTHS.UI);
    this.tweens.add({
      targets: t, y: y - 70, alpha: 0,
      duration: 1100, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // ── Chain handlers ──────────────────────────────────────────────────────────

  _onChainComplete(chain, veilCleared) {
    if (this._inputLocked) return;
    this._lockInput();

    const chainLen = chain.length;
    if (chainLen > this.longestChain) this.longestChain = chainLen;

    AudioManager.playChainClear(chain[0].type, chainLen);
    this._tickGoal('CHAIN', chainLen);
    this._tickGoal('CONTAIN', veilCleared || 0);
    try { this.effects.chainGlow(chain); } catch (_) {}

    const midNode = chain[Math.floor(chain.length / 2)];
    this._addScore(this._chainScore(chainLen) + (veilCleared || 0) * 75, midNode.x, midNode.y - 30);

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

  _onConvergence(chain, veilCleared) {
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
    this._tickGoal('CONTAIN', veilCleared || 0);

    const convScore = this._chainScore(chain.length) * 3
      + (allOfType.length - chain.length) * 150
      + (veilCleared || 0) * 75;
    this._addScore(convScore, chain[0].x, chain[0].y - 40);

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
    const moveBonus = this.movesLeft * 100;
    if (moveBonus > 0) {
      this.score += moveBonus;
      this.uiScene?.updateScore(this.score);
      this._floatText(GAME_W / 2, GAME_H * 0.42, `+${moveBonus} moves bonus!`, '#33FF88');
    }
    GameState.saveLevelScore(this.levelId, this.score);
    const bestScore = GameState.getBestScore(this.levelId);
    this.time.delayedCall(moveBonus > 0 ? 900 : 300, () => {
      this.scene.stop('UIOverlay');
      this.scene.start('Win', {
        levelId: this.levelId,
        stars,
        nodesCleared: this.nodesCleared,
        levelData: this.levelData,
        score: this.score,
        bestScore,
      });
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

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(time) {
    this.hexGrid?.updateVeil(time);
    this.chainDrawer?.update(time);
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
