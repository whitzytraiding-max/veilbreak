import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, NODE_CONFIG, COLS, ROWS, DEPTHS } from '../constants.js';
import { fitCamera } from '../resScale.js';
import { HexGrid } from '../objects/HexGrid.js';
import { ChainDrawer } from '../objects/ChainDrawer.js';
import { VeilManager } from '../objects/VeilManager.js';
import { Effects } from '../objects/Effects.js';
import { getLevelData } from '../data/levels.js';
import { CHAPTERS } from '../data/chapters.js';
import { createCosmicBackground } from '../background.js';
import { GameState } from '../managers/GameState.js';
import { AdManager } from '../managers/AdManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { Haptic } from '../managers/Haptics.js';
import { Tutorial } from '../managers/TutorialManager.js';

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
    fitCamera(this);
    this._createBackground();

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

    // One-time coaching: the basic-drag demo on the very first play, then a card
    // the first time each objective type appears.
    const queue = [];
    if (!Tutorial.seen('intro')) queue.push('intro');
    (this.levelData.goals || []).forEach(g => {
      if (!Tutorial.seen(g.type)) queue.push(g.type);
    });
    if (queue.length) this._showTutorial(queue);
  }

  // ── Background ───────────────────────────────────────────────────────────────

  // A living, chapter-tinted backdrop — see src/game/background.js. The
  // chapter's accentColor flavours the nebula, rising motes and aurora so every
  // realm feels distinct, and it's always gently in motion so the board never
  // feels dead.
  _createBackground() {
    const chapter = CHAPTERS.find(c => c.id === (this.levelData.chapter || 1));
    createCosmicBackground(this, { accent: chapter?.accentColor ?? 0x3B7AE8 });
  }

  // ── Tutorial cards ───────────────────────────────────────────────────────────

  _showTutorial(queue) {
    this.chainDrawer.lock();
    let i = 0;
    const next = () => {
      if (i >= queue.length) { this.chainDrawer.unlock(); return; }
      const key = queue[i];
      this._tutorialCard(key, () => { Tutorial.markSeen(key); i++; next(); });
    };
    next();
  }

  _tutorialCard(key, onClose) {
    const CARDS = {
      intro:   { glyph: '✦', color: 0xCBA6FF, title: 'Mend the Veil',       body: 'Drag across 3 or more matching orbs, then lift your finger to clear them.', demo: true },
      CLEAR:   { glyph: '✦', color: 0x88BBFF, title: 'Clear Orbs',          body: 'Mend the target number of orbs to complete the realm.' },
      ANCHOR:  { glyph: '⬡', color: 0xFFCC44, title: 'Free the Anchors',    body: 'Anchored orbs have a ring. Include them in a chain to free the required number.' },
      CONTAIN: { glyph: '◈', color: 0xBB55FF, title: 'Hold Back the Veil',  body: 'The dark Veil spreads each turn. Clear orbs next to it to push it back.' },
      CHAIN:   { glyph: '↯', color: 0x33FF88, title: 'Build a Long Chain',  body: 'Connect a single chain of the required length in one drag.' },
    };
    const c = CARDS[key] || CARDS.intro;
    const D = 950;
    const items = [];
    const add = (o) => { items.push(o.setDepth(D)); return o; };
    const colHex = '#' + c.color.toString(16).padStart(6, '0');
    const px = GAME_W / 2, py = GAME_H / 2;
    const pw = 322, ph = c.demo ? 312 : 236;
    const top = py - ph / 2;

    add(this.add.rectangle(px, py, GAME_W, GAME_H, 0x03020A, 0.88).setInteractive());

    const g = this.add.graphics();
    g.fillStyle(0x0C0C22, 0.98); g.fillRoundedRect(px - pw / 2, top, pw, ph, 18);
    g.lineStyle(2, c.color, 0.6); g.strokeRoundedRect(px - pw / 2, top, pw, ph, 18);
    add(g);

    add(this.add.image(px, top + 50, 'glow').setDisplaySize(82, 82).setTint(c.color)
      .setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
    add(this.add.text(px, top + 50, c.glyph, { fontFamily: 'Arial', fontSize: '34px', color: colHex }).setOrigin(0.5));
    add(this.add.text(px, top + 95, c.title, {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5));
    add(this.add.text(px, top + 122, c.body, {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#AAB6D0',
      align: 'center', wordWrap: { width: pw - 52 }, lineSpacing: 5,
    }).setOrigin(0.5, 0));

    if (c.demo) this._tutorialDemo(px, top + ph - 86, add);

    const by = top + ph - 30;
    const bg = this.add.graphics();
    bg.fillStyle(c.color, 1); bg.fillRoundedRect(px - 72, by - 18, 144, 36, 18);
    add(bg);
    add(this.add.text(px, by, 'Got it', {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0B1020', fontStyle: 'bold',
    }).setOrigin(0.5));
    add(this.add.zone(px, by, 170, 46).setInteractive({ useHandCursor: true }))
      .on('pointerdown', () => {
        AudioManager.playTap();
        items.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
        onClose();
      });
  }

  // Animated finger sweeping across three orbs to show the drag gesture
  _tutorialDemo(cx, cy, add) {
    const gap = 52;
    const xs = [cx - gap, cx, cx + gap];
    xs.forEach(x => add(this.add.image(x, cy, 'orb_WATER').setDisplaySize(40, 40)));
    const line = add(this.add.graphics());
    const glow = add(this.add.image(xs[0], cy, 'glow').setDisplaySize(26, 26)
      .setTint(0xFFFFFF).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7));
    const finger = add(this.add.circle(xs[0], cy, 6, 0xFFFFFF, 1));
    this.tweens.add({
      targets: [finger, glow], x: xs[2],
      duration: 1300, repeat: -1, repeatDelay: 700, ease: 'Sine.easeInOut',
      onUpdate: () => {
        line.clear();
        line.lineStyle(3, 0x55AAFF, 0.85);
        line.beginPath(); line.moveTo(xs[0], cy); line.lineTo(finger.x, cy); line.strokePath();
      },
      onRepeat: () => { finger.x = xs[0]; glow.x = xs[0]; line.clear(); },
    });
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
      fontFamily: 'Georgia, serif', fontSize: '28px',
      color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTHS.UI).setScale(0);

    // Punch in, then drift up and fade
    this.tweens.add({
      targets: t, scaleX: 1.35, scaleY: 1.35,
      duration: 150, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: t, y: y - 80, alpha: 0, scaleX: 0.85, scaleY: 0.85,
        duration: 950, ease: 'Quad.easeOut',
        onComplete: () => t.destroy(),
      }),
    });
  }

  _showLabel(text, color) {
    const t = this.add.text(GAME_W / 2, GAME_H * 0.37, text, {
      fontFamily: 'Georgia, serif', fontSize: '34px',
      color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTHS.UI + 1).setScale(0);

    this.tweens.add({
      targets: t, scaleX: 1.12, scaleY: 1.12,
      duration: 220, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: t, y: GAME_H * 0.30, alpha: 0,
        duration: 750, delay: 350, ease: 'Quad.easeIn',
        onComplete: () => t.destroy(),
      }),
    });
  }

  // Brief freeze-frame for big moments — everything stalls for `ms` real
  // milliseconds then snaps back, which makes the convergence land with weight.
  // Uses a real timer (not a scaled scene timer) so the resume always fires.
  _hitStop(ms = 80) {
    if (this._hitStopActive) return;
    this._hitStopActive = true;
    this.time.timeScale = 0.0001;
    this.tweens.timeScale = 0.0001;
    setTimeout(() => {
      if (!this.scene || !this.scene.isActive()) return;
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this._hitStopActive = false;
    }, ms);
  }

  // ── Chain handlers ──────────────────────────────────────────────────────────

  _onChainComplete(chain, veilCleared) {
    if (this._inputLocked) return;
    this._lockInput();

    const chainLen = chain.length;
    if (chainLen > this.longestChain) this.longestChain = chainLen;

    AudioManager.playChainClear(chain[0].type, chainLen);
    Haptic.medium();
    this._tickGoal('CHAIN', chainLen);
    this._tickGoal('CONTAIN', veilCleared || 0);
    try { this.effects.chainGlow(chain); } catch (_) {}

    const midNode = chain[Math.floor(chain.length / 2)];
    this._addScore(this._chainScore(chainLen) + (veilCleared || 0) * 75, midNode.x, midNode.y - 30);

    // Juice — wrapped so any error can never block clearNodes
    try {
      if      (chainLen >= 9) this._showLabel('LEGENDARY!', '#FF44FF');
      else if (chainLen >= 7) this._showLabel('AMAZING!',   '#FF8844');
      else if (chainLen >= 5) this._showLabel('GREAT!',     '#FFCC44');
      else if (chainLen >= 4) this._showLabel('NICE!',      '#AADDFF');
      this.effects.screenFlash(NODE_CONFIG[chain[0].type].glow, chainLen >= 5 ? 0.18 : 0.09);
      // Scaled camera kick — small for a 3-chain, punchy for a big one
      const intensity = Math.min(0.002 + (chainLen - 3) * 0.0011, 0.009);
      this.cameras.main.shake(120 + chainLen * 12, intensity);
    } catch (_) {}

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
    Haptic.success();
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

    try { this.effects.convergenceBurst(chain[0]); } catch (_) {}
    this._tickGoal('CONTAIN', veilCleared || 0);

    try {
      const glowHex = '#' + NODE_CONFIG[type].glow.toString(16).padStart(6, '0');
      this._showLabel('CONVERGENCE!', glowHex);
      this.cameras.main.shake(300, 0.01);
      this._hitStop(80);
    } catch (_) {}

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
    try { this.effects.screenFlash(0x220033, 0.22); } catch (_) {}
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
    Haptic.heavy();
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
