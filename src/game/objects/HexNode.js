import Phaser from 'phaser';
import { NODE_CONFIG, HEX_RADIUS, ANIM, DEPTHS } from '../constants.js';

// Displayed orb size, scaled to the hex cell. The texture is a 192px sphere whose
// solid body is 80% of the image (the rest is glow), so the body ≈ ORB_DISPLAY*0.8
// and a little glow spills toward neighbours.
const ORB_DISPLAY = HEX_RADIUS * 1.66;          // ~48 at radius 29
const BODY_R = ORB_DISPLAY * 0.40;              // on-screen radius of the glass sphere

export class HexNode extends Phaser.GameObjects.Container {
  constructor(scene, col, row, type, x, y) {
    super(scene, x, y);
    this.col = col;
    this.row = row;
    this.type = type;
    this.isAnchor = false;
    this.inChain = false;
    this.setDepth(DEPTHS.NODES);

    this._buildGraphics();
    this._startIdleAnim();
    scene.add.existing(this);
  }

  _buildGraphics() {
    const cfg = NODE_CONFIG[this.type];

    // Selection bloom — sits behind the orb, fades in when the node joins a chain
    this._glow = this.scene.add.image(0, 0, 'glow')
      .setDisplaySize(ORB_DISPLAY * 1.7, ORB_DISPLAY * 1.7)
      .setTint(cfg.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.add(this._glow);

    // The glossy liquid orb itself (high-res texture)
    this._orb = this.scene.add.image(0, 0, 'orb_' + this.type)
      .setDisplaySize(ORB_DISPLAY, ORB_DISPLAY);
    this.add(this._orb);

    // Faint elemental glyph — a barely-there hint suspended in the liquid, not a
    // bright icon (keeps the "you don't know what's inside" feel while still
    // giving colour-blind players a tell).
    this._symbol = this.scene.add.graphics();
    this._drawSymbol();
    this._symbol.setAlpha(0.4);
    this.add(this._symbol);

    // A couple of sparkles twinkling inside the liquid for life
    this._sparkles = [];
    const spots = [{ x: -0.16, y: 0.18 }, { x: 0.2, y: -0.12 }];
    spots.forEach(s => {
      const sp = this.scene.add.image(s.x * ORB_DISPLAY, s.y * ORB_DISPLAY, 'sparkle')
        .setDisplaySize(8, 8)
        .setTint(cfg.light)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.2);
      this._sparkles.push(sp);
      this.add(sp);
    });

    // Anchor indicator (drawn only if anchor)
    this._anchorRing = this.scene.add.graphics();
    this.add(this._anchorRing);

    this._startMagic();
  }

  // Continuous "alive" animation — independent of the chain/idle scale tweens so
  // it survives highlight()'s killTweensOf(this) (those target the container).
  _startMagic() {
    this._sparkles.forEach((sp, i) => {
      this.scene.tweens.add({
        targets: sp,
        alpha: 0.95,
        scaleX: sp.scaleX * 1.5,
        scaleY: sp.scaleY * 1.5,
        duration: 900 + Math.random() * 800,
        delay: i * 500 + Math.random() * 600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  _drawSymbol(alpha = 1) {
    const cfg = NODE_CONFIG[this.type];
    const s = BODY_R * 0.42;
    const g = this._symbol;
    g.clear();

    switch (this.type) {
      case 'FIRE':
        g.fillStyle(0xFFFFFF, 0.85 * alpha);
        g.fillTriangle(0, -s * 1.05, -s * 0.72, s * 0.65, s * 0.72, s * 0.65);
        g.fillStyle(cfg.light, 0.6 * alpha);
        g.fillTriangle(0, -s * 0.35, -s * 0.3, s * 0.45, s * 0.3, s * 0.45);
        break;
      case 'WATER':
        g.fillStyle(0xFFFFFF, 0.85 * alpha);
        g.fillCircle(0, s * 0.2, s * 0.62);
        g.fillTriangle(-s * 0.35, s * 0.2, s * 0.35, s * 0.2, 0, -s * 0.88);
        break;
      case 'EARTH':
        g.fillStyle(0xFFFFFF, 0.8 * alpha);
        g.fillPoints([
          { x: 0, y: -s }, { x: s * 0.75, y: 0 },
          { x: 0, y: s }, { x: -s * 0.75, y: 0 },
        ], true);
        break;
      case 'AIR':
        g.lineStyle(1.6, 0xFFFFFF, 0.85 * alpha);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          g.lineBetween(
            Math.cos(a) * s * 0.25, Math.sin(a) * s * 0.25,
            Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9,
          );
        }
        g.fillStyle(0xFFFFFF, 0.7 * alpha);
        g.fillCircle(0, 0, s * 0.22);
        break;
      case 'SHADOW':
        g.fillStyle(0xFFFFFF, 0.85 * alpha);
        g.fillCircle(-s * 0.1, 0, s * 0.78);
        g.fillStyle(cfg.base, alpha);
        g.fillCircle(s * 0.32, -s * 0.18, s * 0.66);
        break;
      case 'LIGHT':
        g.lineStyle(1.6, 0xFFFFFF, 0.9 * alpha);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const innerR = i % 2 === 0 ? s * 0.28 : s * 0.18;
          g.lineBetween(
            Math.cos(a) * innerR, Math.sin(a) * innerR,
            Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95,
          );
        }
        g.fillStyle(0xFFFFFF, 0.85 * alpha);
        g.fillCircle(0, 0, s * 0.3);
        break;
    }
  }

  setAnchor(value) {
    this.isAnchor = value;
    this._anchorRing.clear();
    if (value) {
      this._anchorRing.lineStyle(2, 0xFFFFFF, 0.8);
      this._anchorRing.strokeCircle(0, 0, BODY_R + 4);
      this._anchorRing.lineStyle(1.5, NODE_CONFIG[this.type].glow, 0.9);
      this._anchorRing.strokeCircle(0, 0, BODY_R + 7);
    }
  }

  _startIdleAnim() {
    const delay = Math.random() * ANIM.NODE_PULSE_DURATION;
    this.scene.tweens.add({
      targets: this,
      scaleX: 1 + ANIM.NODE_PULSE_SCALE,
      scaleY: 1 + ANIM.NODE_PULSE_SCALE,
      duration: ANIM.NODE_PULSE_DURATION,
      delay,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  highlight(on) {
    this.inChain = on;
    if (on) {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: 120,
        ease: 'Back.easeOut',
      });
      this.scene.tweens.add({
        targets: this._glow,
        alpha: 0.9,
        duration: 120,
      });
    } else {
      this.scene.tweens.add({
        targets: this._glow,
        alpha: 0,
        duration: 200,
      });
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Sine.easeOut',
        onComplete: () => this._startIdleAnim(),
      });
    }
  }

  explode(onComplete) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this._glow,
      alpha: 1,
      duration: 90,
      yoyo: true,
    });
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: ANIM.EXPLOSION_DURATION * 0.7,
      ease: 'Quad.easeOut',
    });
    onComplete?.(); // fire immediately — clearNodes timer handles timing
  }

  dropTo(targetY, delay = 0) {
    this.scene.tweens.add({
      targets: this,
      y: targetY,
      duration: ANIM.DROP_DURATION,
      delay,
      ease: ANIM.DROP_EASE,
    });
  }
}
