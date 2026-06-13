import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { LivesManager } from '../managers/LivesManager.js';

export class UIOverlayScene extends Phaser.Scene {
  constructor() { super('UIOverlay'); }

  init(data) {
    this.levelData = data.levelData;
    this.movesLeft = data.movesLeft;
    this.goalProgress = data.goalProgress;
    this.score = data.score || 0;
  }

  create() {
    this._drawTopBar();
    this._drawGoalBar();
    this._drawBottomBar();
  }

  // ── Top bar: back, level, lives ────────────────────────────────────────────

  _drawTopBar() {
    this.add.graphics().fillStyle(0x080818, 0.88).fillRect(0, 0, GAME_W, 72);

    // Back arrow — bigger tap target via invisible zone
    this.add.text(22, 36, '←', {
      fontFamily: 'Arial', fontSize: '28px', color: '#8899CC',
    }).setOrigin(0.5);
    this.add.zone(22, 36, 60, 60).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Stop Game before stopping self — avoids self-destruction before cleanup runs
        this.scene.stop('Game');
        this.scene.stop('UIOverlay');
        this.scene.start('WorldMap');
      });

    this.add.text(GAME_W / 2, 20, `Level ${this.levelData.id}`, {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#667799',
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 42, this.levelData.name, {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    const lives = LivesManager.getLives();
    this.add.text(GAME_W - 16, 36, '♥'.repeat(lives), {
      fontFamily: 'Arial', fontSize: '18px', color: '#FF4466',
    }).setOrigin(1, 0.5);
  }

  // ── Goal bar ───────────────────────────────────────────────────────────────

  _drawGoalBar() {
    const barY = 78;
    this.add.graphics().fillStyle(0x0A0A20, 0.9).fillRect(0, barY, GAME_W, 48);

    this._goalTexts = {};
    const goals = this.levelData.goals || [];
    const spacing = GAME_W / (goals.length || 1);

    goals.forEach((goal, i) => {
      const x = spacing * i + spacing / 2;
      const p = this.goalProgress?.[goal.type] || { current: 0, target: goal.target };

      this.add.text(x, barY + 13, this._goalLabel(goal.type), {
        fontFamily: 'Georgia, serif', fontSize: '11px',
        color: this._goalColor(goal.type), letterSpacing: 2, fontStyle: 'bold',
      }).setOrigin(0.5);

      this._goalTexts[goal.type] = this.add.text(x, barY + 33, `${p.current} / ${goal.target}`, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0.5);

      if (i > 0) {
        this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.3)
          .lineBetween(spacing * i, barY + 4, spacing * i, barY + 44);
      }
    });

    this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.5)
      .lineBetween(0, barY + 48, GAME_W, barY + 48);
  }

  _goalLabel(type) {
    return { CLEAR: 'CLEAR', ANCHOR: 'ANCHORS', CONTAIN: 'VEIL', CHAIN: 'CHAIN' }[type] || type;
  }

  _goalColor(type) {
    return { CLEAR: '#88BBFF', ANCHOR: '#FFCC44', CONTAIN: '#BB55FF', CHAIN: '#33FF88' }[type] || '#AABBCC';
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
    t.setText(`${current} / ${target}`);
    t.setColor(done ? '#33FF88' : '#DDDDFF');
    if (done) {
      this.tweens.add({ targets: t, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true });
    }
  }
}
