import Phaser from 'phaser';
import { NODE_CONFIG, HEX_RADIUS, ANIM, DEPTHS } from '../constants.js';

// Displayed orb size. The texture is a 192px sphere whose solid body is 80% of
// the image (the rest is bloom halo), so display ≈ 44px → ~35px body, leaving a
// soft glow that just kisses neighbouring cells.
const ORB_DISPLAY = 44;
const BODY_R = ORB_DISPLAY * 0.40; // on-screen radius of the solid sphere (~17.6)

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

    // The plasma orb itself (high-res radial-gradient texture)
    this._orb = this.scene.add.image(0, 0, 'orb_' + this.type)
      .setDisplaySize(ORB_DISPLAY, ORB_DISPLAY);
    this.add(this._orb);

    // Hot core that breathes in/out — additive over the orb centre
    this._core = this.scene.add.image(0, 0, 'orbcore_' + this.type)
      .setDisplaySize(ORB_DISPLAY * 0.72, ORB_DISPLAY * 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
    this.add(this._core);

    // Elemental glyph drawn crisp on top
    this._symbol = this.scene.add.graphics();
    this._drawSymbol();
    this.add(this._symbol);

    // Two glowing motes slowly orbiting the orb — the "magic" tell
    this._motes = this.scene.add.container(0, 0);
    const moteR = ORB_DISPLAY * 0.52;
    for (let i = 0; i < 2; i++) {
      const m = this.scene.add.image(i === 0 ? moteR : -moteR, 0, 'glow')
        .setDisplaySize(7, 7)
        .setTint(cfg.light)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.85);
      this._motes.add(m);
    }
    this.add(this._motes);

    // Anchor indicator (drawn only if anchor)
    this._anchorRing = this.scene.add.graphics();
    this.add(this._anchorRing);

    this._startMagic();
  }

  // Continuous "alive" animation — independent of the chain/idle scale tweens so
  // it survives highlight()'s killTweensOf(this) (those target the container).
  _startMagic() {
    this.scene.tweens.add({
      targets: this._core,
      alpha: 0.95,
      scaleX: this._core.scaleX * 1.18,
      scaleY: this._core.scaleY * 1.18,
      duration: 1100 + Math.random() * 900,
      delay: Math.random() * 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this._motes,
      rotation: Math.PI * 2,
      duration: 6000 + Math.random() * 4000,
      repeat: -1, ease: 'Linear',
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
