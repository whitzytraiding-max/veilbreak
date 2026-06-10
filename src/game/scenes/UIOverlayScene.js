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
    this._drawMoveCounter();
    this._drawBoosterBar();
  }

  // ── Top bar: back, level, lives ────────────────────────────────────────────

  _drawTopBar() {
    // Semi-transparent top strip
    const bar = this.add.graphics();
    bar.fillStyle(0x080818, 0.85);
    bar.fillRect(0, 0, GAME_W, 72);

    // Back
    const back = this.add.text(18, 36, '←', {
      fontFamily: 'Arial', fontSize: '26px', color: '#8899CC',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      this.scene.stop('UIOverlay');
      this.scene.stop('Game');
      this.scene.start('WorldMap');
    });

    // Level name
    this.add.text(GAME_W / 2, 20, `Level ${this.levelData.id}`, {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#667799',
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 40, this.levelData.name, {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Lives
    const lives = LivesManager.getLives();
    this._heartsText = this.add.text(GAME_W - 16, 36, '♥'.repeat(lives), {
      fontFamily: 'Arial', fontSize: '18px', color: '#FF4466',
    }).setOrigin(1, 0.5);
  }

  // ── Goal bar ───────────────────────────────────────────────────────────────

  _drawGoalBar() {
    const barY = 78;
    this.add.graphics().fillStyle(0x0A0A20, 0.9).fillRect(0, barY, GAME_W, 44);

    this._goalTexts = {};
    const goals = this.levelData.goals || [];
    const spacing = GAME_W / (goals.length || 1);

    goals.forEach((goal, i) => {
      const x = spacing * i + spacing / 2;
      const icon = this._goalIcon(goal.type);
      const p = this.goalProgress?.[goal.type] || { current: 0, target: goal.target };

      this.add.text(x - 22, barY + 22, icon, {
        fontFamily: 'Arial', fontSize: '18px', color: '#AABBCC',
      }).setOrigin(0.5);

      this._goalTexts[goal.type] = this.add.text(x + 8, barY + 22, `${p.current}/${goal.target}`, {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: '#DDDDFF', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
    });

    // Divider
    this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.5).lineBetween(0, barY + 44, GAME_W, barY + 44);
  }

  _goalIcon(type) {
    return { CLEAR: '✦', ANCHOR: '⬡', CONTAIN: '⊗', CHAIN: '↯' }[type] || '?';
  }

  // ── Score + Move counter ───────────────────────────────────────────────────

  _drawMoveCounter() {
    const cy = GAME_H - 115;
    this.add.graphics().fillStyle(0x080818, 0.8).fillRect(0, cy - 30, GAME_W, 60);

    // Divider between score and moves
    this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.35)
      .lineBetween(GAME_W / 2, cy - 22, GAME_W / 2, cy + 22);

    // Score (left half)
    this.add.text(GAME_W * 0.25, cy - 13, 'SCORE', {
      fontFamily: 'Georgia, serif', fontSize: '11px', color: '#556688', letterSpacing: 3,
    }).setOrigin(0.5);
    this._scoreText = this.add.text(GAME_W * 0.25, cy + 10, '0', {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: '#FFCC44', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Moves (right half)
    this.add.text(GAME_W * 0.75, cy - 13, 'MOVES', {
      fontFamily: 'Georgia, serif', fontSize: '11px', color: '#556688', letterSpacing: 3,
    }).setOrigin(0.5);
    this._movesText = this.add.text(GAME_W * 0.75, cy + 10, String(this.movesLeft), {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ── Booster bar ────────────────────────────────────────────────────────────

  _drawBoosterBar() {
    const barY = GAME_H - 68;
    this.add.graphics().fillStyle(0x050514, 0.95).fillRect(0, barY, GAME_W, 68);
    this.add.graphics().lineStyle(1, COLORS.HEX_BORDER, 0.4).lineBetween(0, barY, GAME_W, barY);

    const boosters = [
      { key: 'NOVA',  icon: '◈', label: 'Nova',  color: '#FF8844' },
      { key: 'PULSE', icon: '⊕', label: 'Pulse', color: '#44AAFF' },
      { key: 'MEND',  icon: '⬟', label: 'Mend',  color: '#BB55FF' },
      { key: 'SURGE', icon: '↑', label: 'Surge', color: '#33FF88' },
    ];

    const spacing = GAME_W / boosters.length;
    boosters.forEach((b, i) => {
      const x = spacing * i + spacing / 2;
      const cy = barY + 34;

      const bg = this.add.circle(x, cy, 22, 0x112233, 1);
      bg.setStrokeStyle(1.5, 0x334455, 1);

      const icon = this.add.text(x, cy - 4, b.icon, {
        fontFamily: 'Arial', fontSize: '20px', color: b.color,
      }).setOrigin(0.5);
      this.add.text(x, cy + 14, b.label, {
        fontFamily: 'Georgia, serif', fontSize: '9px', color: '#556677',
      }).setOrigin(0.5);

      const zone = this.add.zone(x, cy, 44, 52).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.tweens.add({ targets: [bg, icon], scaleX: 0.88, scaleY: 0.88, duration: 90, yoyo: true });
        this.scene.get('Game')?.useBooster(b.key);
      });
    });
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
    t.setColor(done ? '#33FF88' : '#DDDDFF');
    if (done) {
      this.tweens.add({ targets: t, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true });
    }
  }
}
