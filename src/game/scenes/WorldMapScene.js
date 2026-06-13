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
    this._drawCosmicDetail();
    this._drawChapterLabels();
    this._drawPath();
    this._drawLevelDots();
    this._drawFixedHeader();
    this._startShootingStars();

    // NOTE: we don't use camera.setBounds here — it clamps scroll assuming a
    // centred camera origin, which conflicts with fitCamera()'s (0,0) origin and
    // shoves all world content sideways. scrollY is clamped manually below and in
    // update()/drag instead; scrollX is pinned to 0.
    this.cameras.main.scrollX = 0;

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

  // ── Distant planets + veil fractures (depth, theme) ─────────────────────────

  _drawCosmicDetail() {
    // A few distant worlds drifting far behind (slow parallax)
    const planets = [
      { y: 520,  r: 120, c1: 0x3A4E8A, c2: 0x10162E, ring: true,  sf: 0.4 },
      { y: 1500, r: 90,  c1: 0x8A3A4E, c2: 0x2E1018, ring: false, sf: 0.5 },
      { y: 2350, r: 150, c1: 0x6A3A8A, c2: 0x20102E, ring: true,  sf: 0.35 },
      { y: 3250, r: 100, c1: 0x8A7A3A, c2: 0x2E2810, ring: false, sf: 0.5 },
    ];
    planets.forEach((p, i) => {
      const x = i % 2 === 0 ? GAME_W - 40 : 50;
      // soft outer atmosphere
      this.add.image(x, p.y, 'glow').setDisplaySize(p.r * 2.4, p.r * 2.4)
        .setTint(p.c1).setAlpha(0.10).setBlendMode(Phaser.BlendModes.ADD)
        .setScrollFactor(p.sf);
      // planet disc with a day/night shaded gradient (drawn as stacked circles)
      const disc = this.add.circle(x, p.y, p.r, p.c2, 0.9).setScrollFactor(p.sf);
      const lit = this.add.circle(x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.7, p.c1, 0.5)
        .setScrollFactor(p.sf);
      if (p.ring) {
        const ring = this.add.ellipse(x, p.y, p.r * 3, p.r * 0.9, 0x000000, 0)
          .setStrokeStyle(2, p.c1, 0.45).setScrollFactor(p.sf).setAngle(-18);
      }
    });

    // Veil fractures — thin glowing cracks in space (ties to the game's theme)
    for (let i = 0; i < 7; i++) {
      const fx = Math.random() * GAME_W;
      const fy = 250 + Math.random() * (MAP_H - 400);
      const g = this.add.graphics().setScrollFactor(0.75);
      g.lineStyle(1, 0xAA66FF, 0.0);
      let px = fx, py = fy;
      const segs = 3 + Math.floor(Math.random() * 3);
      const pts = [[px, py]];
      for (let s = 0; s < segs; s++) {
        px += (Math.random() - 0.5) * 60;
        py += 30 + Math.random() * 50;
        pts.push([px, py]);
      }
      // glow + core stroke
      g.lineStyle(3, 0x7A3AD0, 0.12);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => g.lineTo(x, y));
      g.strokePath();
      g.lineStyle(1, 0xCBA6FF, 0.4);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => g.lineTo(x, y));
      g.strokePath();
      this.tweens.add({ targets: g, alpha: 0.4, duration: 2000 + Math.random() * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 2000 });
    }
  }

  // ── Shooting stars — periodic streaks across the viewport ───────────────────

  _startShootingStars() {
    const spawn = () => {
      if (!this.scene.isActive()) return;
      const fromTop = Math.random() < 0.5;
      const startX = Math.random() * GAME_W;
      const startY = fromTop ? -20 : Math.random() * GAME_H * 0.5;
      const len = 60 + Math.random() * 60;
      const streak = this.add.image(startX, startY, 'glow')
        .setDisplaySize(len, 3).setTint(0xCFE0FF)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)
        .setAngle(35).setScrollFactor(0).setDepth(200);
      this.tweens.add({
        targets: streak,
        x: startX + 220, y: startY + 300,
        alpha: { from: 0.9, to: 0 },
        duration: 700 + Math.random() * 400,
        ease: 'Sine.easeIn',
        onComplete: () => streak.destroy(),
      });
      this.time.delayedCall(2500 + Math.random() * 4000, spawn);
    };
    this.time.delayedCall(1500 + Math.random() * 2000, spawn);
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
      const level = LEVELS[i];
      if (!level) return;
      const levelId = i + 1;

      const unlocked = levelId <= highestUnlocked;
      const stars = GameState.getStars(levelId);
      const isCurrent = levelId === highestUnlocked;
      const played = stars > 0;
      const isMilestone = !!level.storyUnlock; // chapter-boss gate
      const accent = this._chapterAccentFor(levelId);

      // Halo glow — milestones and the current level burn brighter
      const haloR = isCurrent ? 58 : isMilestone ? 50 : unlocked ? 38 : 26;
      const haloTint = isCurrent ? 0xCCAAFF : isMilestone ? 0xFFD27A : unlocked ? accent : 0x223052;
      const haloA = isCurrent ? 0.5 : isMilestone ? 0.4 : unlocked ? 0.3 : 0.15;
      const halo = this.add.image(pos.x, pos.y, 'glow')
        .setDisplaySize(haloR, haloR).setTint(haloTint).setAlpha(haloA)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Milestone gate ring — a decorative double ring + crown ticks
      if (isMilestone) {
        const ringColor = unlocked ? 0xFFCC55 : 0x4A4A6E;
        const ring = this.add.circle(pos.x, pos.y, 18, 0x000000, 0)
          .setStrokeStyle(2, ringColor, unlocked ? 0.85 : 0.5);
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          this.add.star(pos.x + Math.cos(ang) * 22, pos.y + Math.sin(ang) * 22, 4, 0.8, 2.4,
            ringColor, unlocked ? 0.9 : 0.5);
        }
        if (unlocked) {
          this.tweens.add({
            targets: ring, scaleX: 1.14, scaleY: 1.14, alpha: 0.5,
            duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
      }

      // Star core
      const coreR = isCurrent ? 13 : isMilestone ? 13 : 11;
      const coreColor = unlocked ? (isCurrent ? 0xFFFFFF : isMilestone ? 0xFFF4DC : 0xEAF0FF) : 0x2A3658;
      const strokeColor = unlocked ? (isCurrent ? 0xCCAAFF : isMilestone ? 0xFFCC55 : accent) : 0x35446E;
      const core = this.add.circle(pos.x, pos.y, coreR, coreColor, 1);
      core.setStrokeStyle(isMilestone ? 2.5 : 2, strokeColor, 1);

      if (isCurrent) {
        const flare = this.add.image(pos.x, pos.y, 'sparkle')
          .setDisplaySize(48, 48).setTint(0xEEDDFF).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: [halo, flare], scaleX: '*=1.18', scaleY: '*=1.18', alpha: '-=0.12',
          duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: core, scaleX: 1.12, scaleY: 1.12,
          duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      // Level number
      this.add.text(pos.x, pos.y, String(levelId), {
        fontFamily: 'Georgia, serif',
        fontSize: unlocked ? '13px' : '11px',
        color: unlocked ? (isCurrent || isMilestone ? '#3A2A12' : '#1A2240') : '#46557E',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      if (!unlocked) {
        // Locked — small padlock just below the dim star
        this._drawLock(pos.x, pos.y + coreR + 8);
      } else if (played) {
        // Played — show earned star rating above the node
        this._drawStarPips(pos.x, pos.y - coreR - 9, stars);
      } else {
        // Unlocked but not yet cleared — hint the level's main challenge
        const goal = (level.goals && level.goals[0]) ? level.goals[0].type : null;
        if (goal) this._drawGoalGlyph(pos.x, pos.y + coreR + 9, goal);
      }

      if (unlocked) {
        const zone = this.add.zone(pos.x, pos.y, 54, 54).setInteractive();
        zone.on('pointerup', () => {
          if (!this._didScroll) this._startLevel(levelId);
        });
      }
    });
  }

  // 3-pip star rating (lit = earned)
  _drawStarPips(cx, cy, earned) {
    const gap = 8;
    for (let s = 0; s < 3; s++) {
      const x = cx + (s - 1) * gap;
      const lit = s < earned;
      this.add.star(x, cy, 5, 1.4, 3.4, lit ? 0xFFCC44 : 0x3A4664, lit ? 1 : 0.7);
    }
  }

  // Small element-coloured glyph hinting the level's goal type
  _drawGoalGlyph(cx, cy, type) {
    const map = {
      CLEAR:   { ch: '✦', color: '#88BBFF' },
      ANCHOR:  { ch: '⬡', color: '#FFCC44' },
      CONTAIN: { ch: '◈', color: '#BB55FF' },
      CHAIN:   { ch: '↯', color: '#33FF88' },
    };
    const g = map[type] || { ch: '◦', color: '#8899CC' };
    this.add.text(cx, cy, g.ch, {
      fontFamily: 'Arial', fontSize: '11px', color: g.color,
    }).setOrigin(0.5).setAlpha(0.85);
  }

  // Tiny padlock for locked levels
  _drawLock(cx, cy) {
    const g = this.add.graphics();
    g.fillStyle(0x46557E, 0.9);
    g.fillRoundedRect(cx - 4, cy - 1, 8, 6, 1.5);   // body
    g.lineStyle(1.4, 0x46557E, 0.9);
    g.beginPath();
    g.arc(cx, cy - 1, 2.4, Math.PI, 0);             // shackle
    g.strokePath();
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
