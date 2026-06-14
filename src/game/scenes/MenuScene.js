import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { fitCamera } from '../resScale.js';
import { spawnMote } from '../background.js';

// ── Palette (per design brief) ────────────────────────────────────────────────
const C = {
  bgIndigo:   0x070312,
  violetBlack: 0x110827,
  bgMid:      0x140A2A,
  lavender:   0xC084FC,
  paleViolet: 0xE9D5FF,
  etherBlue:  0x60A5FA,
  softRose:   0xF9A8D4,
  silver:     0xF5F3FF,
};
const CX = GAME_W / 2;
const VEIL_Y = GAME_H * 0.33; // centre of the portal / logo

// A premium, atmospheric main menu: an ethereal tear-in-reality veil that
// breathes and shimmers, a "BREAK" wordmark whose fractures mend and dissolve
// on a loop, and a frosted-glass Play button — all assembled through a short
// staged intro. The theme throughout is "mending what was broken".
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    fitCamera(this);
    this.cameras.main.setBackgroundColor('#070312');

    this._buildBackground();
    this._buildVeilPortal();
    this._buildLogo();
    this._buildTagline();
    this._buildPlayButton();
    this._buildSettings();
    this._startParticles();

    this._playIntro();
  }

  // ── Background: indigo gradient, drifting mist, distant stars ────────────────

  _buildBackground() {
    // Vertical gradient base — deep indigo at top into rich violet-black below.
    const g = this.add.graphics();
    g.fillGradientStyle(C.bgIndigo, C.bgIndigo, C.bgMid, C.violetBlack, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Distant stars — two parallax-ish sizes, gently twinkling.
    this._stars = this.add.container(0, 0).setAlpha(0);
    for (let i = 0; i < 70; i++) {
      const sr = Math.random() * 1.2 + 0.3;
      const sa = Math.random() * 0.5 + 0.12;
      const star = this.add.circle(Math.random() * GAME_W, Math.random() * GAME_H, sr, 0xFFFFFF, sa);
      this._stars.add(star);
      this.tweens.add({
        targets: star, alpha: sa * 0.12,
        duration: 1400 + Math.random() * 2800,
        yoyo: true, repeat: -1, delay: Math.random() * 3000, ease: 'Sine.easeInOut',
      });
    }

    // Magical mist — large, very soft violet/blue clouds drifting and breathing.
    this._mist = this.add.container(0, 0).setAlpha(0);
    const mistDefs = [
      { x: 90,  y: 220, s: 9,  tint: C.lavender,   a: 0.10 },
      { x: 320, y: 360, s: 8,  tint: C.etherBlue,  a: 0.07 },
      { x: 160, y: 600, s: 11, tint: C.violetBlack === C.lavender ? C.lavender : 0x6A3AD0, a: 0.12 },
      { x: 300, y: 680, s: 7,  tint: C.softRose,   a: 0.05 },
    ];
    mistDefs.forEach(m => {
      const cloud = this.add.image(m.x, m.y, 'glow')
        .setTint(m.tint).setAlpha(m.a).setScale(m.s)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      this._mist.add(cloud);
      this.tweens.add({
        targets: cloud,
        x: m.x + (Math.random() - 0.5) * 70,
        y: m.y + (Math.random() - 0.5) * 50,
        scale: m.s * (1.08 + Math.random() * 0.12),
        duration: 11000 + Math.random() * 7000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 4000,
      });
    });
  }

  // ── The Veil: an ethereal vertical tear in reality that breathes & shimmers ──

  _buildVeilPortal() {
    this._veil = this.add.container(CX, VEIL_Y).setAlpha(0).setScale(0.5);

    // Outer aura — a wide pale-violet bloom so the portal bleeds into the scene.
    const aura = this.add.image(0, 0, 'glow')
      .setTint(C.paleViolet).setAlpha(0.16).setScale(13, 16)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Core tear — a tall, narrow lavender glow: the "rip" itself.
    const core = this.add.image(0, 0, 'glow')
      .setTint(C.lavender).setAlpha(0.42).setScale(3.4, 11)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Bright inner seam — thin, intense, the molten edge of the tear.
    const seam = this.add.image(0, 0, 'glow')
      .setTint(C.silver).setAlpha(0.5).setScale(0.7, 8)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Shimmering rim — a stroked tear outline that gently pulses.
    const rim = this.add.graphics();
    this._drawTear(rim, 64, 230, C.paleViolet, 1.5, 0.5);
    rim.setBlendMode(Phaser.BlendModes.ADD);

    this._veil.add([aura, core, seam, rim]);

    // Slow "alive" pulsation of the whole veil.
    this.tweens.add({
      targets: core, scaleX: 3.8, alpha: 0.52,
      duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: seam, scaleX: 0.95, alpha: 0.72,
      duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: rim, alpha: 0.85, scaleX: 1.06, scaleY: 1.03,
      duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Faint crack patterns inside the veil that fade in then "mend" away.
    for (let i = 0; i < 4; i++) {
      const crack = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      const ox = (Math.random() - 0.5) * 90;
      const oy = (Math.random() - 0.5) * 280;
      this._drawJaggedLine(crack, ox, oy - 40, ox + (Math.random() - 0.5) * 50, oy + 60, 4, 14, C.paleViolet);
      crack.setAlpha(0);
      this._veil.add(crack);
      this.tweens.add({
        targets: crack, alpha: 0.35,
        duration: 2600 + Math.random() * 1800,
        yoyo: true, repeat: -1, hold: 400,
        repeatDelay: 2000 + Math.random() * 3000,
        delay: Math.random() * 4000, ease: 'Sine.easeInOut',
      });
    }
  }

  // ── Logo: pristine VEIL + fracturing/​mending BREAK ─────────────────────────

  _buildLogo() {
    this._logo = this.add.container(CX, VEIL_Y).setAlpha(0).setScale(0.86);

    // Soft bloom behind the wordmark so it sits inside the light, not on top.
    const bloom = this.add.image(0, 0, 'glow')
      .setTint(C.lavender).setAlpha(0.3).setScale(8, 4.5)
      .setBlendMode(Phaser.BlendModes.SCREEN);

    const titleStyle = {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '66px', fontStyle: 'bold',
      color: '#F5F3FF',
    };

    const veil = this.add.text(0, -8, 'VEIL', titleStyle).setOrigin(0.5, 1);
    this._applyTitleGradient(veil);
    veil.setStroke('#3A1A6E', 4);
    veil.setShadow(0, 0, '#C084FC', 18, false, true);

    const brk = this.add.text(0, -2, 'BREAK', titleStyle).setOrigin(0.5, 0);
    this._applyTitleGradient(brk);
    brk.setStroke('#3A1A6E', 4);
    brk.setShadow(0, 0, '#C084FC', 18, false, true);
    this._breakText = brk;

    this._logo.add([bloom, veil, brk]);

    // Fractures over BREAK — thin glowing cracks that loop between visible
    // (fractured) and faded (mended). Built once BREAK has measured bounds.
    const bw = brk.width, bh = brk.height;
    const bx = -bw / 2, by = -2;
    this._fractures = [];
    const crackDefs = [
      { x: bx + bw * 0.22, drift: { x: -3, y: -2 } },
      { x: bx + bw * 0.50, drift: { x: 2, y: -3 } },
      { x: bx + bw * 0.74, drift: { x: 4, y: 1 } },
    ];
    crackDefs.forEach((cd, i) => {
      const crack = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      this._drawJaggedLine(crack, cd.x, by + 4, cd.x + (Math.random() - 0.5) * 16, by + bh - 6, 5, 7, C.paleViolet);
      crack.setAlpha(0);
      this._logo.add(crack);
      this._fractures.push(crack);
      // appear (fracture) → linger → fade (mend), looping out of phase.
      this.tweens.add({
        targets: crack, alpha: 0.7,
        duration: 1600, yoyo: true, hold: 700,
        repeat: -1, repeatDelay: 2600,
        delay: 600 + i * 1100, ease: 'Sine.easeInOut',
      });
    });

    // Missing shards — small fragments of BREAK that detach, dissolve, then
    // drift back and reconstruct on a loop.
    crackDefs.forEach((cd, i) => {
      const shard = this.add.image(cd.x + (Math.random() - 0.5) * 20, by + bh * (0.3 + Math.random() * 0.4), 'sparkle')
        .setTint(C.paleViolet).setAlpha(0).setScale(0.32)
        .setBlendMode(Phaser.BlendModes.ADD);
      this._logo.add(shard);
      this.tweens.add({
        targets: shard,
        x: shard.x + cd.drift.x * 4, y: shard.y + cd.drift.y * 4,
        alpha: 0.85, angle: (Math.random() - 0.5) * 40,
        duration: 1500, yoyo: true, hold: 500,
        repeat: -1, repeatDelay: 2600,
        delay: 900 + i * 1100, ease: 'Sine.easeInOut',
      });
    });
  }

  _applyTitleGradient(t) {
    const grad = t.context.createLinearGradient(0, 0, 0, t.height);
    grad.addColorStop(0, '#FBFAFF');   // silver-white crown
    grad.addColorStop(0.5, '#E9D5FF'); // pale violet
    grad.addColorStop(1, '#C084FC');   // lavender base
    t.setFill(grad);
  }

  // ── Tagline ──────────────────────────────────────────────────────────────────

  _buildTagline() {
    this._tagline = this.add.text(CX, GAME_H * 0.455, 'Mend what was broken.', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '20px', fontStyle: 'italic',
      color: '#E9D5FF',
    }).setOrigin(0.5).setAlpha(0);
    this._tagline.setShadow(0, 1, '#070312', 6, false, true);

    // Hairline divider for elegance.
    this._divider = this.add.graphics().setAlpha(0);
    this._divider.lineStyle(1, C.lavender, 0.4);
    this._divider.lineBetween(CX - 70, GAME_H * 0.49, CX + 70, GAME_H * 0.49);
    // soft nodes at the ends
    this._divider.fillStyle(C.paleViolet, 0.6);
    this._divider.fillCircle(CX - 70, GAME_H * 0.49, 1.6);
    this._divider.fillCircle(CX + 70, GAME_H * 0.49, 1.6);
  }

  // ── Play button: frosted glass with inner glow + breathing ───────────────────

  _buildPlayButton() {
    const by = GAME_H * 0.6;
    const w = 224, h = 64, r = 32;
    this._play = this.add.container(CX, by).setAlpha(0).setScale(0.9);

    // Drop shadow for depth.
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);

    // Inner glow bloom (this is also the brightness layer for breathing/hover).
    const glow = this.add.image(0, 0, 'glow')
      .setTint(C.lavender).setAlpha(0.5).setScale(w / 60, h / 36)
      .setBlendMode(Phaser.BlendModes.ADD);
    this._playGlow = glow;

    // Frosted glass body — translucent pale fill.
    const glass = this.add.graphics();
    glass.fillStyle(C.paleViolet, 0.12);
    glass.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    glass.fillStyle(C.lavender, 0.10);
    glass.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    // Top highlight (upper sheen) for the glass read.
    glass.fillStyle(0xFFFFFF, 0.10);
    glass.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.42, r * 0.7);
    // Crisp rim.
    glass.lineStyle(1.5, C.paleViolet, 0.7);
    glass.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    const label = this.add.text(0, 0, 'PLAY', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '29px', fontStyle: 'bold', color: '#FBFAFF',
    }).setOrigin(0.5);
    label.setShadow(0, 0, '#C084FC', 10, false, true);
    label.setLetterSpacing?.(3);

    this._play.add([shadow, glow, glass, label]);
    this._play.setSize(w, h);

    // Hit zone (screen-space, so it works regardless of container scaling).
    const zone = this.add.zone(CX, by, w + 16, h + 16).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { this._playHover = true; });
    zone.on('pointerout',  () => { this._playHover = false; });
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: this._play, scaleX: 0.94, scaleY: 0.94, duration: 90, yoyo: true });
      this.time.delayedCall(160, () => this.scene.start('WorldMap'));
    });

    // Version stamp — understated.
    this.add.text(CX, GAME_H - 18, 'v0.1', {
      fontFamily: 'monospace', fontSize: '11px', color: '#3A2A5A',
    }).setOrigin(0.5).setAlpha(0.8);
  }

  // Drives the looping breathe (scale 1→1.03, glow ~+8%) and folds hover on top
  // of it cleanly via a single value tween, so the two never fight.
  _startPlayBreathing() {
    this._breath = { s: 1, b: 0.5 };
    this.tweens.add({
      targets: this._breath, s: 1.03, b: 0.54,
      duration: 1250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!this._play || !this._play.active) return;
        const hover = this._playHover ? 1.045 : 1;
        this._play.setScale(this._breath.s * hover);
        this._playGlow.setAlpha(this._breath.b * (this._playHover ? 1.5 : 1));
      },
    });
  }

  // ── Settings (understated) ───────────────────────────────────────────────────

  _buildSettings() {
    this._gear = this.add.text(GAME_W - 28, 34, '⚙', {
      fontFamily: 'Arial', fontSize: '24px', color: '#8A7AB8',
    }).setOrigin(0.5).setAlpha(0);
    this.add.zone(GAME_W - 28, 34, 56, 56).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Settings'));
    this.tweens.add({ targets: this._gear, angle: 360, duration: 18000, repeat: -1, ease: 'Linear' });
  }

  // ── Ambient particles: floating motes + occasional glowing fragments ─────────

  _startParticles() {
    // Slow-rising lavender motes (reuses the shared helper).
    this.time.addEvent({
      delay: 1100, loop: true,
      callback: () => spawnMote(this, C.lavender, { depth: 1 }),
    });
    // Occasional glowing fragment drifting slowly through the scene.
    this.time.addEvent({
      delay: 3600, loop: true,
      callback: () => { if (Math.random() < 0.8) this._spawnFragment(); },
    });
  }

  _spawnFragment() {
    const fromLeft = Math.random() < 0.5;
    const y = 120 + Math.random() * (GAME_H - 300);
    const x = fromLeft ? -20 : GAME_W + 20;
    const tint = Phaser.Math.RND.pick([C.paleViolet, C.etherBlue, C.softRose]);
    const frag = this.add.image(x, y, 'sparkle')
      .setTint(tint).setAlpha(0).setScale(0.3 + Math.random() * 0.3)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    const dx = fromLeft ? GAME_W + 40 : -GAME_W - 40;
    const dur = 12000 + Math.random() * 8000;
    this.tweens.add({
      targets: frag, x: x + dx, y: y + (Math.random() - 0.5) * 80,
      angle: (Math.random() - 0.5) * 180,
      duration: dur, ease: 'Sine.easeInOut',
      onComplete: () => frag.destroy(),
    });
    this.tweens.add({
      targets: frag, alpha: 0.5 + Math.random() * 0.3,
      duration: dur * 0.3, yoyo: true, hold: dur * 0.2, ease: 'Sine.easeInOut',
    });
  }

  // ── Intro choreography (~1.8s) ───────────────────────────────────────────────

  _playIntro() {
    // 0. Black cover fades out → background fades in.
    const cover = this.add.rectangle(CX, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1).setDepth(9999);
    this.tweens.add({ targets: cover, alpha: 0, duration: 500, ease: 'Quad.easeOut',
      onComplete: () => cover.destroy() });
    this.tweens.add({ targets: [this._stars, this._mist], alpha: 1, duration: 700, ease: 'Quad.easeOut' });

    // 1. Veil materialises.
    this.tweens.add({
      targets: this._veil, alpha: 1, scaleX: 1, scaleY: 1,
      delay: 250, duration: 650, ease: 'Cubic.easeOut',
    });

    // 2. Logo assembles from floating shards.
    this._assembleLogo(650);
    this.tweens.add({
      targets: this._logo, alpha: 1, scaleX: 1, scaleY: 1,
      delay: 650, duration: 600, ease: 'Back.easeOut',
    });

    // 3. Tagline fades in.
    this.tweens.add({ targets: [this._tagline, this._divider], alpha: 1, delay: 1150, duration: 550, ease: 'Quad.easeOut' });

    // 4. Play button emerges, then breathing begins.
    this.tweens.add({
      targets: this._play, alpha: 1, scaleX: 1, scaleY: 1,
      delay: 1400, duration: 550, ease: 'Back.easeOut',
      onComplete: () => this._startPlayBreathing(),
    });

    // 5. Settings fades in last, understated.
    this.tweens.add({ targets: this._gear, alpha: 0.7, delay: 1600, duration: 500 });
  }

  // Spawn shards around the logo that converge inward as it fades in.
  _assembleLogo(delay) {
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 110;
      const sx = CX + Math.cos(ang) * dist;
      const sy = VEIL_Y + Math.sin(ang) * dist * 0.7;
      const shard = this.add.image(sx, sy, 'sparkle')
        .setTint(Phaser.Math.RND.pick([C.paleViolet, C.silver, C.lavender]))
        .setAlpha(0).setScale(0.25 + Math.random() * 0.25)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
      this.tweens.add({
        targets: shard, alpha: 0.9,
        delay, duration: 200, yoyo: true, hold: 250, ease: 'Quad.easeOut',
      });
      this.tweens.add({
        targets: shard,
        x: CX + (Math.random() - 0.5) * 30, y: VEIL_Y + (Math.random() - 0.5) * 20,
        scale: 0.1,
        delay, duration: 650, ease: 'Cubic.easeIn',
        onComplete: () => shard.destroy(),
      });
    }
  }

  // ── Drawing helpers ──────────────────────────────────────────────────────────

  // A pointed vertical "tear" outline (lens shape) centred on (0,0).
  _drawTear(g, halfW, halfH, color, width, alpha) {
    g.lineStyle(width, color, alpha);
    g.beginPath();
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;            // 0..1 top→bottom
      const yy = -halfH + 2 * halfH * t;
      const w = halfW * Math.sin(Math.PI * t); // 0 at tips, max at middle
      if (i === 0) g.moveTo(w, yy); else g.lineTo(w, yy);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const yy = -halfH + 2 * halfH * t;
      const w = halfW * Math.sin(Math.PI * t);
      g.lineTo(-w, yy);
    }
    g.closePath();
    g.strokePath();
  }

  // A jagged glowing line (crack) from (x1,y1)→(x2,y2): a soft wide underlay
  // plus a crisp bright core.
  _drawJaggedLine(g, x1, y1, x2, y2, segs, jitter, color) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jx = i === 0 || i === segs ? 0 : (Math.random() - 0.5) * jitter;
      pts.push([x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t]);
    }
    const stroke = (width, a) => {
      g.lineStyle(width, color, a);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => g.lineTo(x, y));
      g.strokePath();
    };
    stroke(3.5, 0.25); // soft halo
    stroke(1, 0.9);    // bright core
  }
}
