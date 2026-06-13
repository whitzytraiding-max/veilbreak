import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
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
  }

  // ── Goal bar — one accent pill per objective ────────────────────────────────

  _drawGoalBar() {
    const barY = 70;
    const barH = 64;
    this.add.graphics().fillStyle(0x0A0A20, 0.92).fillRect(0, barY, GAME_W, barH);
    this.add.graphics().lineStyle(1, 0x2A3358, 0.7).lineBetween(0, barY + barH, GAME_W, barY + barH);

    this._goalTexts = {};
    this._goalBars = {};
    const goals = this.levelData.goals || [];
    const n = goals.length || 1;
    const pad = 9;
    const pillW = Math.min(126, (GAME_W - pad * (n + 1)) / n);
    const pillH = 46;
    const totalW = pillW * n + pad * (n - 1);
    const startX = (GAME_W - totalW) / 2;
    const cy = barY + barH / 2;

    goals.forEach((goal, i) => {
      const px = startX + i * (pillW + pad);
      const top = cy - pillH / 2;
      const accent = this._goalColorInt(goal.type);
      const accentHex = this._goalColor(goal.type);
      const p = this.goalProgress?.[goal.type] || { current: 0, target: goal.target };

      // Accent bloom behind the pill (magical glow, matches the orbs/nodes)
      this.add.image(px + pillW / 2, cy, 'glow')
        .setDisplaySize(pillW * 1.1, pillH * 1.6).setTint(accent)
        .setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD);

      // Pill
      const g = this.add.graphics();
      g.fillStyle(0x05040F, 0.6); g.fillRoundedRect(px, top, pillW, pillH, 11);
      g.lineStyle(1.5, accent, 0.55); g.strokeRoundedRect(px, top, pillW, pillH, 11);

      // Glyph chip on the left
      this.add.text(px + 18, top + 18, this._goalGlyph(goal.type), {
        fontFamily: 'Arial', fontSize: '18px', color: accentHex,
      }).setOrigin(0.5);

      // Label + progress, stacked to the right of the glyph
      this.add.text(px + 34, top + 12, this._goalLabel(goal.type), {
        fontFamily: 'Georgia, serif', fontSize: '8px', color: accentHex,
        fontStyle: 'bold', letterSpacing: 1.5,
      }).setOrigin(0, 0.5);
      this._goalTexts[goal.type] = this.add.text(px + 34, top + 26, `${p.current}/${goal.target}`, {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // Progress bar along the bottom of the pill
      const barX = px + 12, barWMax = pillW - 24, by = top + pillH - 9, thick = 3;
      this.add.graphics().fillStyle(0x223052, 0.9).fillRoundedRect(barX, by, barWMax, thick, 1.5);
      const fill = this.add.graphics();
      this._goalBars[goal.type] = { gfx: fill, x: barX, y: by, wMax: barWMax, thick, color: accent, target: goal.target };
      this._redrawGoalBar(goal.type, p.current);
    });
  }

  _redrawGoalBar(type, current) {
    const b = this._goalBars?.[type];
    if (!b) return;
    const ratio = Phaser.Math.Clamp(current / (b.target || 1), 0, 1);
    b.gfx.clear();
    if (ratio > 0) {
      const done = current >= b.target;
      b.gfx.fillStyle(done ? 0x33FF88 : b.color, 1)
        .fillRoundedRect(b.x, b.y, Math.max(b.thick, b.wMax * ratio), b.thick, 1.5);
    }
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
    const barH = 78;
    const barY = GAME_H - barH;
    this.add.graphics().fillStyle(0x080818, 0.92).fillRect(0, barY, GAME_W, barH);
    this.add.graphics().lineStyle(1, 0x2A3358, 0.7).lineBetween(0, barY, GAME_W, barY);
    this.add.graphics().lineStyle(1, 0x2A3358, 0.4)
      .lineBetween(GAME_W / 2, barY + 14, GAME_W / 2, GAME_H - 14);

    const cy = barY + barH / 2;

    // Score (left) — gold glow behind the number
    this.add.image(GAME_W * 0.25, cy + 9, 'glow')
      .setDisplaySize(150, 56).setTint(0xFFCC44).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD);
    this.add.text(GAME_W * 0.25, cy - 17, 'SCORE', {
      fontFamily: 'Georgia, serif', fontSize: '10px', color: '#7488AA', letterSpacing: 3, fontStyle: 'bold',
    }).setOrigin(0.5);
    this._scoreText = this.add.text(GAME_W * 0.25, cy + 11, '0', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#FFCC44', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Moves (right) — soft cool glow behind the number
    this._movesGlow = this.add.image(GAME_W * 0.75, cy + 9, 'glow')
      .setDisplaySize(150, 56).setTint(0x88AAFF).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD);
    this.add.text(GAME_W * 0.75, cy - 17, 'MOVES', {
      fontFamily: 'Georgia, serif', fontSize: '10px', color: '#7488AA', letterSpacing: 3, fontStyle: 'bold',
    }).setOrigin(0.5);
    this._movesText = this.add.text(GAME_W * 0.75, cy + 11, String(this.movesLeft), {
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
    let col = '#FFFFFF', glow = 0x88AAFF;
    if (n <= 5) { col = '#FF4444'; glow = 0xFF4444; }
    else if (n <= 10) { col = '#FFAA33'; glow = 0xFFAA33; }
    this._movesText.setColor(col);
    this._movesGlow?.setTint(glow);
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
    this._redrawGoalBar(type, current);
    if (done) {
      this.tweens.add({ targets: t, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true });
    }
  }
}
