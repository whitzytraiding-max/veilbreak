import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { GameState } from '../managers/GameState.js';
import { LivesManager } from '../managers/LivesManager.js';
import { LEVELS } from '../data/levels.js';
import { CHAPTERS } from '../data/chapters.js';
import { fitCamera } from '../resScale.js';

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
    fitCamera(this);
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
    // ptr.x/y are in canvas-backing space (design × RES once the retina zoom is
    // applied), but scrollY is in world units — normalise pointer Y by the zoom.
    const py = (ptr) => ptr.y / (this.cameras.main.zoom || 1);

    this.input.on('pointerdown', (ptr) => {
      this._dragging = true;
      this._dragStartY = py(ptr);
      this._dragStartScrollY = this.cameras.main.scrollY;
      this._lastPtrY = py(ptr);
      this._vel = 0;
      this._didScroll = false;
    });

    this.input.on('pointermove', (ptr) => {
      if (!this._dragging) return;
      const y = py(ptr);
      const dy = this._dragStartY - y;
      this._vel = (this._lastPtrY - y) * 0.6 + this._vel * 0.4;
      this._lastPtrY = y;
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

  // ── Chapter helpers ─────────────────────────────────────────────────────────

  // Vertical [yStart, yEnd] world band each chapter occupies along the path,
  // plus its accent colour — used to tint nebula sectors and constellation lines.
  _chapterBands() {
    return CHAPTERS.map((ch, i) => {
      const startIdx = (ch.startLevel || 1) - 1;
      const next = CHAPTERS[i + 1];
      const endIdx = next ? (next.startLevel || 1) - 1 : LEVEL_DOTS.length;
      const yStart = (LEVEL_DOTS[startIdx] || LEVEL_DOTS[0]).y - 70;
      const yEnd = (LEVEL_DOTS[Math.min(endIdx, LEVEL_DOTS.length - 1)]).y;
      return { ch, startIdx, endIdx, yStart, yEnd };
    });
  }

  _chapterAccentFor(levelId) {
    const band = this._chapterBands().find(b => levelId - 1 >= b.startIdx && levelId - 1 < b.endIdx);
    return band ? (band.ch.accentColor || 0x6677AA) : 0x6677AA;
  }

  // ── Deep-space background: parallax stars + per-chapter nebula sectors ───────

  _drawBg() {
    this.add.rectangle(GAME_W / 2, MAP_H / 2, GAME_W, MAP_H, COLORS.BG, 1);

    // Coloured nebula clouds anchored to each chapter's band, so scrolling moves
    // you through visibly distinct regions (blue coast → fiery vaults → …).
    this._chapterBands().forEach((b, i) => {
      const accent = b.ch.accentColor || 0x33446A;
      const midY = (b.yStart + b.yEnd) / 2;
      const clouds = [
        { x: i % 2 === 0 ? 90 : 310, y: midY - 40, r: 230, a: 0.16 },
        { x: i % 2 === 0 ? 300 : 100, y: midY + 70, r: 180, a: 0.11 },
        { x: GAME_W / 2, y: midY, r: 300, a: 0.06 },
      ];
      clouds.forEach(c => {
        const neb = this.add.image(c.x, c.y, 'glow')
          .setDisplaySize(c.r, c.r)
          .setTint(accent)
          .setAlpha(c.a)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: neb, alpha: c.a * 0.55,
          duration: 5000 + Math.random() * 4000,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          delay: Math.random() * 3000,
        });
      });
    });

    // Parallax star layers — far stars drift slower for a sense of depth.
    this._starLayer(140, 0.35, 0.9, 0.28);
    this._starLayer(120, 0.6, 1.2, 0.4);
    this._starLayer(160, 1.0, 1.5, 0.55);

    // A handful of bright twinkling flares
    for (let i = 0; i < 26; i++) {
      const fl = this.add.image(Math.random() * GAME_W, Math.random() * MAP_H, 'sparkle')
        .setDisplaySize(10, 10)
        .setAlpha(Math.random() * 0.4 + 0.2)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: fl, alpha: 0.05, scale: fl.scale * 0.6,
        duration: 1400 + Math.random() * 2600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 2000,
      });
    }
  }

  _starLayer(count, scrollFactor, maxR, maxA) {
    for (let i = 0; i < count; i++) {
      const star = this.add.circle(
        Math.random() * GAME_W,
        Math.random() * MAP_H,
        Math.random() * maxR + 0.3,
        0xFFFFFF,
        Math.random() * maxA + 0.06,
      ).setScrollFactor(scrollFactor);
    }
  }

  // ── Chapter sector labels ────────────────────────────────────────────────────

  _drawChapterLabels() {
    // Labels sit above the constellation (nodes are depth 0) but below the fixed
    // header (depth 500). A dark plate keeps them legible over stars and dots.
    const D = 300;
    this._chapterBands().forEach(b => {
      const ch = b.ch;
      const y = b.yStart - 6;
      const colHex = '#' + (ch.accentColor || 0x8899CC).toString(16).padStart(6, '0');

      // Dark backing plate for legibility
      this.add.rectangle(GAME_W / 2, y + 8, GAME_W, 46, 0x05040F, 0.62).setDepth(D - 2);

      // Soft accent glow over the plate
      this.add.image(GAME_W / 2, y + 8, 'glow')
        .setDisplaySize(280, 60).setTint(ch.accentColor || 0x33446A)
        .setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(D - 1);

      // Small diamond ornaments either side of the chapter number
      [GAME_W / 2 - 80, GAME_W / 2 + 80].forEach(x => {
        this.add.star(x, y + 1, 4, 1.5, 4, ch.accentColor || 0x8899CC, 0.95).setDepth(D);
      });

      this.add.text(GAME_W / 2, y, `CHAPTER ${ch.id}`, {
        fontFamily: 'Georgia, serif', fontSize: '10px',
        color: colHex, fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.95).setDepth(D);

      this.add.text(GAME_W / 2, y + 17, ch.title, {
        fontFamily: 'Georgia, serif', fontSize: '17px',
        color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(D);
    });
  }

  // ── Constellation lines connecting the level stars ──────────────────────────

  _drawPath() {
    const highestUnlocked = GameState.get().highestUnlocked || 1;
    const glow = this.add.graphics();
    const line = this.add.graphics();

    for (let i = 0; i < LEVEL_DOTS.length - 1; i++) {
      const a = LEVEL_DOTS[i];
      const b = LEVEL_DOTS[i + 1];
      const unlocked = i + 1 < highestUnlocked;
      const accent = this._chapterAccentFor(i + 1);

      if (unlocked) {
        glow.lineStyle(7, accent, 0.18);
        glow.lineBetween(a.x, a.y, b.x, b.y);
        line.lineStyle(1.5, 0xDDE6FF, 0.7);
        line.lineBetween(a.x, a.y, b.x, b.y);
      } else {
        // Faint dotted line for locked legs
        const steps = Math.max(2, Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 9));
        line.fillStyle(0x33406A, 0.5);
        for (let s = 0; s <= steps; s += 2) {
          const t = s / steps;
          line.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 1);
        }
      }
    }
  }

  // ── Level stars ──────────────────────────────────────────────────────────────

  _drawLevelDots() {
    const highestUnlocked = GameState.get().highestUnlocked || 1;

    LEVEL_DOTS.forEach((pos, i) => {
      const levelId = i + 1;
      if (!LEVELS[i]) return;

      const unlocked = levelId <= highestUnlocked;
      const stars = GameState.getStars(levelId);
      const isCurrent = levelId === highestUnlocked;
      const accent = this._chapterAccentFor(levelId);

      // Halo glow (sized/coloured by state)
      const haloR = isCurrent ? 56 : unlocked ? 38 : 26;
      const haloTint = isCurrent ? 0xCCAAFF : unlocked ? accent : 0x223052;
      const haloA = isCurrent ? 0.5 : unlocked ? 0.32 : 0.16;
      const halo = this.add.image(pos.x, pos.y, 'glow')
        .setDisplaySize(haloR, haloR).setTint(haloTint).setAlpha(haloA)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Star core
      const coreR = isCurrent ? 13 : 11;
      const coreColor = unlocked ? (isCurrent ? 0xFFFFFF : 0xEAF0FF) : 0x2A3658;
      const core = this.add.circle(pos.x, pos.y, coreR, coreColor, 1);
      core.setStrokeStyle(2, unlocked ? (isCurrent ? 0xCCAAFF : accent) : 0x35446E, 1);

      if (isCurrent) {
        const flare = this.add.image(pos.x, pos.y, 'sparkle')
          .setDisplaySize(46, 46).setTint(0xEEDDFF)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: [halo, flare], scaleX: '*=1.18', scaleY: '*=1.18', alpha: '-=0.12',
          duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: core, scaleX: 1.12, scaleY: 1.12,
          duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      // Level number (hidden on locked far stars to keep them subtle)
      this.add.text(pos.x, pos.y + (stars > 0 ? -4 : 0), String(levelId), {
        fontFamily: 'Georgia, serif',
        fontSize: unlocked ? '13px' : '11px',
        color: unlocked ? (isCurrent ? '#3A2A66' : '#1A2240') : '#46557E',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      if (stars > 0) {
        this.add.text(pos.x, pos.y + coreR + 5, '★'.repeat(stars), {
          fontFamily: 'Arial', fontSize: '10px', color: '#FFCC44',
        }).setOrigin(0.5, 0);
      }

      if (unlocked) {
        const zone = this.add.zone(pos.x, pos.y, 52, 52).setInteractive();
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
