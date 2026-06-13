import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { GameState } from '../managers/GameState.js';
import { LivesManager } from '../managers/LivesManager.js';
import { LEVELS } from '../data/levels.js';
import { CHAPTERS } from '../data/chapters.js';

const MAP_H = 3800;

// Winding path — one entry per level (index 0 = level 1)
const LEVEL_DOTS = [
  // Chapter 1 (1–10)
  { x: 310, y: 140 }, { x: 270, y: 190 }, { x: 310, y: 245 },
  { x: 260, y: 295 }, { x: 200, y: 320 }, { x: 155, y: 275 },
  { x: 110, y: 315 }, { x: 90,  y: 375 }, { x: 130, y: 430 },
  { x: 185, y: 465 },
  // Chapter 2 (11–15)
  { x: 235, y: 510 }, { x: 285, y: 555 }, { x: 320, y: 600 },
  { x: 275, y: 648 }, { x: 220, y: 675 },
  // Chapter 3 (16–25)
  { x: 165, y: 705 }, { x: 115, y: 738 }, { x: 82,  y: 778 },
  { x: 105, y: 822 }, { x: 155, y: 855 }, { x: 210, y: 878 },
  { x: 265, y: 868 }, { x: 308, y: 840 }, { x: 318, y: 800 },
  { x: 278, y: 762 },
  // Chapter 4 (26–35)
  { x: 240, y: 960  }, { x: 185, y: 1005 }, { x: 128, y: 1050 },
  { x: 82,  y: 1100 }, { x: 88,  y: 1160 }, { x: 142, y: 1205 },
  { x: 200, y: 1248 }, { x: 258, y: 1292 }, { x: 308, y: 1342 },
  { x: 260, y: 1398 },
  // Chapter 5 (36–45)
  { x: 200, y: 1478 }, { x: 148, y: 1522 }, { x: 92,  y: 1568 },
  { x: 70,  y: 1628 }, { x: 108, y: 1682 }, { x: 162, y: 1722 },
  { x: 222, y: 1765 }, { x: 278, y: 1812 }, { x: 315, y: 1868 },
  { x: 260, y: 1926 },
  // Chapter 6 (46–55)
  { x: 198, y: 2008 }, { x: 143, y: 2052 }, { x: 88,  y: 2098 },
  { x: 68,  y: 2158 }, { x: 104, y: 2212 }, { x: 162, y: 2256 },
  { x: 222, y: 2302 }, { x: 278, y: 2350 }, { x: 314, y: 2410 },
  { x: 256, y: 2468 },
  // Chapter 7 (56–65)
  { x: 194, y: 2550 }, { x: 138, y: 2596 }, { x: 84,  y: 2642 },
  { x: 63,  y: 2706 }, { x: 100, y: 2760 }, { x: 158, y: 2806 },
  { x: 218, y: 2856 }, { x: 275, y: 2908 }, { x: 312, y: 2968 },
  { x: 254, y: 3026 },
  // Chapter 8 (66–75)
  { x: 192, y: 3108 }, { x: 138, y: 3156 }, { x: 85,  y: 3206 },
  { x: 63,  y: 3268 }, { x: 100, y: 3323 }, { x: 158, y: 3372 },
  { x: 216, y: 3422 }, { x: 272, y: 3476 }, { x: 308, y: 3536 },
  { x: 200, y: 3600 },
];

export class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMap'); }

  create() {
    this._vel = 0;
    this._dragging = false;
    this._dragStartY = 0;
    this._dragStartScrollY = 0;
    this._lastPtrY = 0;
    this._didScroll = false;

    this._drawBg();
    this._drawChapterLabels();
    this._drawPath();
    this._drawLevelDots();
    this._drawFixedHeader();

    // Camera scroll bounds
    this.cameras.main.setBounds(0, 0, GAME_W, MAP_H);

    // Scroll so current level is centred in the viewport
    const state = GameState.get();
    const idx = Math.min((state.highestUnlocked || 1) - 1, LEVEL_DOTS.length - 1);
    const dot = LEVEL_DOTS[idx];
    this.cameras.main.scrollY = Phaser.Math.Clamp(
      dot.y - GAME_H * 0.55,
      0,
      MAP_H - GAME_H
    );

    this._setupScroll();
  }

  update() {
    if (this._dragging || Math.abs(this._vel) < 0.5) {
      if (!this._dragging) this._vel = 0;
      return;
    }
    this._vel *= 0.90;
    this.cameras.main.scrollY = Phaser.Math.Clamp(
      this.cameras.main.scrollY + this._vel,
      0,
      MAP_H - GAME_H
    );
  }

  // ── Scroll input ────────────────────────────────────────────────────────────

  _setupScroll() {
    this.input.on('pointerdown', (ptr) => {
      this._dragging = true;
      this._dragStartY = ptr.y;
      this._dragStartScrollY = this.cameras.main.scrollY;
      this._lastPtrY = ptr.y;
      this._vel = 0;
      this._didScroll = false;
    });

    this.input.on('pointermove', (ptr) => {
      if (!this._dragging) return;
      const dy = this._dragStartY - ptr.y;
      this._vel = (this._lastPtrY - ptr.y) * 0.6 + this._vel * 0.4;
      this._lastPtrY = ptr.y;
      if (Math.abs(dy) > 6) this._didScroll = true;
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this._dragStartScrollY + dy,
        0,
        MAP_H - GAME_H
      );
    });

    this.input.on('pointerup', () => { this._dragging = false; });
    this.input.on('pointercancel', () => { this._dragging = false; this._vel = 0; });
  }

  // ── Background (world space, covers full MAP_H) ─────────────────────────────

  _drawBg() {
    this.add.rectangle(GAME_W / 2, MAP_H / 2, GAME_W, MAP_H, COLORS.BG, 1);

    // Topo lines across full height
    const g = this.add.graphics();
    for (let y = 60; y < MAP_H; y += 65) {
      g.lineStyle(1, 0x1A2244, 0.28);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= GAME_W; x += 20) {
        g.lineTo(x, y + Math.sin(x * 0.03 + y * 0.008) * 14);
      }
      g.strokePath();
    }

    // Stars spread across full height
    for (let i = 0; i < 280; i++) {
      this.add.circle(
        Math.random() * GAME_W,
        Math.random() * MAP_H,
        Math.random() * 1.2 + 0.3,
        0xFFFFFF,
        Math.random() * 0.45 + 0.08
      );
    }
  }

  // ── Chapter section labels (world space) ────────────────────────────────────

  _drawChapterLabels() {
    CHAPTERS.forEach(ch => {
      const idx = (ch.startLevel || 1) - 1;
      if (idx >= LEVEL_DOTS.length) return;
      const pos = LEVEL_DOTS[idx];

      // Coloured accent line
      const g = this.add.graphics();
      g.lineStyle(1, ch.accentColor || 0x334466, 0.4);
      g.lineBetween(20, pos.y - 48, GAME_W - 20, pos.y - 48);

      this.add.text(GAME_W / 2, pos.y - 58, `— Chapter ${ch.id}  ·  ${ch.title} —`, {
        fontFamily: 'Georgia, serif', fontSize: '11px',
        color: '#' + ((ch.accentColor || 0x667799)).toString(16).padStart(6, '0'),
        fontStyle: 'italic', align: 'center',
      }).setOrigin(0.5);
    });
  }

  // ── Path lines (world space) ────────────────────────────────────────────────

  _drawPath() {
    const highestUnlocked = GameState.get().highestUnlocked || 1;
    const g = this.add.graphics();

    for (let i = 0; i < LEVEL_DOTS.length - 1; i++) {
      const a = LEVEL_DOTS[i];
      const b = LEVEL_DOTS[i + 1];
      const unlocked = i + 1 < highestUnlocked;
      g.lineStyle(4, unlocked ? 0x4455AA : 0x1A2233, unlocked ? 0.85 : 0.5);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  // ── Level dots (world space) ────────────────────────────────────────────────

  _drawLevelDots() {
    const highestUnlocked = GameState.get().highestUnlocked || 1;

    LEVEL_DOTS.forEach((pos, i) => {
      const levelId = i + 1;
      const level = LEVELS[i];
      if (!level) return;

      const unlocked = levelId <= highestUnlocked;
      const stars = GameState.getStars(levelId);
      const isCurrent = levelId === highestUnlocked;

      const r = isCurrent ? 22 : 18;
      const color = unlocked ? (isCurrent ? 0x9955FF : 0x334477) : 0x131828;
      const borderColor = unlocked ? (isCurrent ? 0xCCAAFF : 0x5566AA) : 0x1E2840;

      const dot = this.add.circle(pos.x, pos.y, r, color, 1);
      dot.setStrokeStyle(isCurrent ? 3 : 2, borderColor, 1);

      if (isCurrent) {
        this.tweens.add({
          targets: dot, scaleX: 1.12, scaleY: 1.12,
          duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        const glow = this.add.circle(pos.x, pos.y, r + 14, 0x9955FF, 0.16);
        this.tweens.add({
          targets: glow, alpha: 0.03,
          duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      this.add.text(pos.x, pos.y + (stars > 0 ? -5 : 0), String(levelId), {
        fontFamily: 'Georgia, serif',
        fontSize: unlocked ? '15px' : '12px',
        color: unlocked ? '#FFFFFF' : '#2A3A55',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      if (stars > 0) {
        this.add.text(pos.x, pos.y + r + 6, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
          fontFamily: 'Arial', fontSize: '10px', color: '#FFCC00',
        }).setOrigin(0.5, 0);
      }

      if (unlocked) {
        // Use zone + pointerup + didScroll check so dragging doesn't accidentally start a level
        const zone = this.add.zone(pos.x, pos.y, r * 2.8, r * 2.8).setInteractive();
        zone.on('pointerup', () => {
          if (!this._didScroll) this._startLevel(levelId);
        });
      }
    });
  }

  // ── Fixed header (scrollFactor 0, always on top) ───────────────────────────

  _drawFixedHeader() {
    const DEPTH = 500;

    // Dark background strip
    this.add.rectangle(GAME_W / 2, 28, GAME_W, 56, 0x080818, 0.96)
      .setScrollFactor(0).setDepth(DEPTH);

    // Bottom border
    const border = this.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    border.lineStyle(1, COLORS.HEX_BORDER, 0.5);
    border.lineBetween(0, 56, GAME_W, 56);

    // Back arrow
    this.add.text(22, 28, '←', {
      fontFamily: 'Arial', fontSize: '28px', color: '#8899CC',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1);

    this.add.zone(22, 28, 60, 56).setInteractive({ useHandCursor: true })
      .setScrollFactor(0).setDepth(DEPTH + 2)
      .on('pointerdown', () => this.scene.start('Menu'));

    // Title
    this.add.text(GAME_W / 2, 28, 'REALMS', {
      fontFamily: 'Georgia, serif', fontSize: '22px',
      color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1);

    // Lives
    const lives = LivesManager.getLives();
    this.add.text(GAME_W - 18, 28, '♥'.repeat(lives), {
      fontFamily: 'Arial', fontSize: '18px', color: '#FF4466',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH + 1);

    // Scroll hint — fades out after 2s
    const hint = this.add.text(GAME_W / 2, GAME_H - 22, 'scroll to explore', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#334466',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1);
    this.tweens.add({ targets: hint, alpha: 0, delay: 2000, duration: 800 });
  }

  // ── Level start ─────────────────────────────────────────────────────────────

  _startLevel(levelId) {
    if (!LivesManager.hasLife()) {
      this._showNoLivesPopup();
      return;
    }
    GameState.setCurrentLevel(levelId);
    this.scene.start('Game', { levelId });
  }

  _showNoLivesPopup() {
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(900).setInteractive();
    const secs = LivesManager.getSecondsUntilNextLife();
    const mins = Math.ceil(secs / 60);
    [
      { y: GAME_H / 2 - 55, text: 'No lives left!', size: '24px', color: '#FF4466' },
      { y: GAME_H / 2 - 15, text: `Next life in ${mins} min`, size: '16px', color: '#AABBCC' },
    ].forEach(({ y, text, size, color }) => {
      this.add.text(GAME_W / 2, y, text, {
        fontFamily: 'Georgia, serif', fontSize: size, color,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(901);
    });
    const close = this.add.text(GAME_W / 2, GAME_H / 2 + 45, 'OK', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(901).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => { overlay.destroy(); close.destroy(); });
  }
}
