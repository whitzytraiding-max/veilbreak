import Phaser from 'phaser';
import { NODE_CONFIG, HEX_RADIUS, ANIM, DEPTHS } from '../constants.js';

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
    const r = HEX_RADIUS - 11; // 16px disc — leaves 8.5px gap vertically between neighbours

    // Glow layers stay within cell boundaries
    for (let i = 2; i >= 1; i--) {
      const glow = this.scene.add.graphics();
      glow.fillStyle(cfg.glow, 0.10 * i);
      glow.fillCircle(0, 0, r + i * 3);
      this.add(glow);
    }

    // Main disc
    this._disc = this.scene.add.graphics();
    this._drawDisc(1);
    this.add(this._disc);

    // Anchor indicator (drawn if anchor)
    this._anchorRing = this.scene.add.graphics();
    this.add(this._anchorRing);
  }

  _drawDisc(alpha = 1) {
    const cfg = NODE_CONFIG[this.type];
    const r = HEX_RADIUS - 11; // match _buildGraphics
    this._disc.clear();

    // Base circle
    this._disc.fillStyle(cfg.base, alpha);
    this._disc.fillCircle(0, 0, r);

    // Mid highlight (upper half)
    this._disc.fillStyle(cfg.mid, 0.45 * alpha);
    this._disc.fillCircle(-r * 0.15, -r * 0.18, r * 0.65);

    // Bright specular
    this._disc.fillStyle(0xFFFFFF, 0.55 * alpha);
    this._disc.fillCircle(-r * 0.32, -r * 0.32, r * 0.22);

    // Small center glow
    this._disc.fillStyle(cfg.light, 0.35 * alpha);
    this._disc.fillCircle(0, 0, r * 0.3);
  }

  setAnchor(value) {
    this.isAnchor = value;
    this._anchorRing.clear();
    if (value) {
      const r = HEX_RADIUS - 11;
      this._anchorRing.lineStyle(2, 0xFFFFFF, 0.7);
      this._anchorRing.strokeCircle(0, 0, r + 3);
      this._anchorRing.lineStyle(1.5, NODE_CONFIG[this.type].glow, 0.9);
      this._anchorRing.strokeCircle(0, 0, r + 6);
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
    const cfg = NODE_CONFIG[this.type];
    if (on) {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.22,
        scaleY: 1.22,
        duration: 120,
        ease: 'Back.easeOut',
      });
      this._drawDisc(1);
    } else {
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
