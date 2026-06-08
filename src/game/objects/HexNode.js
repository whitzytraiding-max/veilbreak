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

    // Inner elemental symbol
    this._drawSymbol(alpha);
  }

  _drawSymbol(alpha = 1) {
    const cfg = NODE_CONFIG[this.type];
    const r = HEX_RADIUS - 11;
    const s = r * 0.33;
    const g = this._disc;

    switch (this.type) {
      case 'FIRE':
        g.fillStyle(cfg.light, 0.7 * alpha);
        g.fillTriangle(0, -s * 1.05, -s * 0.72, s * 0.65, s * 0.72, s * 0.65);
        g.fillStyle(0xFFEEAA, 0.5 * alpha);
        g.fillTriangle(0, -s * 0.35, -s * 0.3, s * 0.45, s * 0.3, s * 0.45);
        break;
      case 'WATER':
        g.fillStyle(cfg.light, 0.7 * alpha);
        g.fillCircle(0, s * 0.2, s * 0.62);
        g.fillTriangle(-s * 0.35, s * 0.2, s * 0.35, s * 0.2, 0, -s * 0.88);
        break;
      case 'EARTH':
        g.fillStyle(cfg.light, 0.65 * alpha);
        g.fillPoints([
          { x: 0, y: -s }, { x: s * 0.75, y: 0 },
          { x: 0, y: s }, { x: -s * 0.75, y: 0 },
        ], true);
        break;
      case 'AIR':
        g.lineStyle(1.5, cfg.light, 0.7 * alpha);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          g.lineBetween(
            Math.cos(a) * s * 0.25, Math.sin(a) * s * 0.25,
            Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88,
          );
        }
        g.fillStyle(cfg.light, 0.6 * alpha);
        g.fillCircle(0, 0, s * 0.22);
        break;
      case 'SHADOW':
        g.fillStyle(cfg.light, 0.7 * alpha);
        g.fillCircle(-s * 0.1, 0, s * 0.75);
        g.fillStyle(cfg.base, alpha);
        g.fillCircle(s * 0.35, -s * 0.15, s * 0.65);
        break;
      case 'LIGHT':
        g.lineStyle(1.5, cfg.light, 0.8 * alpha);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const innerR = i % 2 === 0 ? s * 0.28 : s * 0.18;
          g.lineBetween(
            Math.cos(a) * innerR, Math.sin(a) * innerR,
            Math.cos(a) * s * 0.92, Math.sin(a) * s * 0.92,
          );
        }
        g.fillStyle(cfg.light, 0.75 * alpha);
        g.fillCircle(0, 0, s * 0.28);
        break;
    }
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
