import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { LivesManager } from '../managers/LivesManager.js';
import { fitCamera } from '../resScale.js';

export class UIOverlayScene extends Phaser.Scene {
  constructor() { super('UIOverlay'); }

  init(data) {
    this.levelData = data.levelData;
    this.movesLeft = data.movesLeft;
    this.goalProgress = data.goalProgress;
    this.score = data.score || 0;
  }

  create() {
    fitCamera(this);
    this._drawTopBar();
    this._drawGoalBar();
    this._drawBottomBar();
  }

  // ── Top bar: back, level, lives ────────────────────────────────────────────

  _drawTopBar() {
    const H = 70;
    this.add.graphics().fillStyle(0x080818, 0.92).fillRect(0, 0, GAME_W, H);
    // thin accent base line
    this.add.graphics().lineStyle(1, 0x2A3358, 0.7).lineBetween(0, H, GAME_W, H);

    // Back arrow — bigger tap target via invisible zone
    this.add.text(22, H / 2, '←', {
      fontFamily: 'Arial', fontSize: '28px', color: '#8899CC',
    }).setOrigin(0.5);
    this.add.zone(22, H / 2, 60, 60).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Stop Game before stopping self — avoids self-destruction before cleanup runs
        this.scene.stop('Game');
        this.scene.stop('UIOverlay');
        this.scene.start('WorldMap');
      });

    this.add.text(GAME_W / 2, 19, `LEVEL ${this.levelData.id}`, {
      fontFamily: 'Georgia, serif', fontSize: '10px', color: '#667799',
      fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 40, this.levelData.name, {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    const lives = LivesManager.getLives();
    this.add.text(GAME_W - 16, H / 2, '♥'.repeat(lives), {
      fontFamily: 'Arial', fontSize: '18px', color: '#FF4466',
    }).setOrigin(1, 0.5);
  }

  // ── Goal bar — one accent pill per objective ────────────────────────────────

  _drawGoalBar() {
    const barY = 70;
    const barH = 56;
    this.add.graphics().fillStyle(0x0A0A20, 0.92).fillRect(0, barY, GAME_W, barH);
    this.add.graphics().lineStyle(1, 0x2A3358, 0.7).lineBetween(0, barY + barH, GAME_W, barY + barH);

    this._goalTexts = {};
    const goals = this.levelData.goals || [];
    const n = goals.length || 1;
    const pad = 9;
    const pillW = Math.min(124, (GAME_W - pad * (n + 1)) / n);
    const totalW = pillW * n + pad * (n - 1);
    const startX = (GAME_W - totalW) / 2;
    const cy = barY + barH / 2;

    goals.forEach((goal, i) => {
      const px = startX + i * (pillW + pad);
      const accent = this._goalColorInt(goal.type);
      const accentHex = this._goalColor(goal.type);
      const p = this.goalProgress?.[goal.type] || { current: 0, target: goal.target };

      // Pill
      const g = this.add.graphics();
      g.fillStyle(0x05040F, 0.55); g.fillRoundedRect(px, cy - 19, pillW, 38, 10);
      g.lineStyle(1.5, accent, 0.5);  g.strokeRoundedRect(px, cy - 19, pillW, 38, 10);

      // Glyph chip on the left
      this.add.text(px + 17, cy, this._goalGlyph(goal.type), {
        fontFamily: 'Arial', fontSize: '17px', color: accentHex,
      }).setOrigin(0.5);

      // Label + progress, stacked to the right of the glyph
      this.add.text(px + 33, cy - 8, this._goalLabel(goal.type), {
        fontFamily: 'Georgia, serif', fontSize: '8px', color: accentHex,
        fontStyle: 'bold', letterSpacing: 1.5,
      }).setOrigin(0, 0.5);
      this._goalTexts[goal.type] = this.add.text(px + 33, cy + 7, `${p.current}/${goal.target}`, {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
    });
  }

  _goalLabel(type) {
    return { CLEAR: 'CLEAR', ANCHOR: 'ANCHORS', CONTAIN: 'VEIL', CHAIN: 'CHAIN' }[type] || type;
  }

  _goalColor(type) {
    return { CLEAR: '#88BBFF', ANCHOR: '#FFCC44', CONTAIN: '#BB55FF', CHAIN: '#33FF88' }[type] || '#AABBCC';
  }

  _goalColorInt(type) {
    return { CLEAR: 0x88BBFF, ANCHOR: 0xFFCC44, CONTAIN: 0xBB55FF, CHAIN: 0x33FF88 }[type] || 0xAABBCC;
  }

  _goalGlyph(type) {
    return { CLEAR: '✦', ANCHOR: '⬡', CONTAIN: '◈', CHAIN: '↯' }[type] || '•';
  }

  // ── Score + Moves bar (flush to bottom) ───────────────────────────────────

  _drawBottomBar() {
    const barH = 72;
    const barY = GAME_H - barH;
    this.add.graphics().fillStyle(0x080818, 0.9).fillRect(0, barY, GAME_W, barH);
    this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.4)
      .lineBetween(0, barY, GAME_W, barY);
    this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.25)
      .lineBetween(GAME_W / 2, barY + 8, GAME_W / 2, GAME_H - 8);

    const cy = barY + barH / 2;

    // Score (left)
    this.add.text(GAME_W * 0.25, cy - 16, 'SCORE', {
      fontFamily: 'Georgia, serif', fontSize: '10px', color: '#556688', letterSpacing: 3,
    }).setOrigin(0.5);
    this._scoreText = this.add.text(GAME_W * 0.25, cy + 10, '0', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#FFCC44', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Moves (right)
    this.add.text(GAME_W * 0.75, cy - 16, 'MOVES', {
      fontFamily: 'Georgia, serif', fontSize: '10px', color: '#556688', letterSpacing: 3,
    }).setOrigin(0.5);
    this._movesText = this.add.text(GAME_W * 0.75, cy + 10, String(this.movesLeft), {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ── Update API (called from GameScene) ────────────────────────────────────

  updateScore(n) {
    if (!this._scoreText) return;
    this._scoreText.setText(n.toLocaleString());
    this.tweens.add({
      targets: this._scoreText,
      scaleX: 1.25, scaleY: 1.25,
      duration: 100, yoyo: true, ease: 'Back.easeOut',
    });
  }

  updateMoves(n) {
    if (!this._movesText) return;
    this._movesText.setText(String(n));
    if (n <= 5) this._movesText.setColor('#FF4444');
    else if (n <= 10) this._movesText.setColor('#FFAA33');
    else this._movesText.setColor('#FFFFFF');
    this.tweens.add({
      targets: this._movesText,
      scaleX: 1.2, scaleY: 1.2,
      duration: 100, yoyo: true, ease: 'Back.easeOut',
    });
  }

  updateGoal(type, current, target) {
    const t = this._goalTexts?.[type];
    if (!t) return;
    const done = current >= target;
    t.setText(`${current}/${target}`);
    t.setColor(done ? '#33FF88' : '#FFFFFF');
    if (done) {
      this.tweens.add({ targets: t, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true });
    }
  }
}
