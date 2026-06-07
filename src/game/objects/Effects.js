import { NODE_CONFIG, GAME_W, DEPTHS } from '../constants.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this._particles = [];
    this._generateParticleTexture();
  }

  _generateParticleTexture() {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('particle_dot', 16, 16);
    g.destroy();
  }

  burstAtNode(node, count = 18) {
    const cfg = NODE_CONFIG[node.type];
    const emitter = this.scene.add.particles(node.x, node.y, 'particle_dot', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 280, max: 500 },
      tint: [cfg.glow, cfg.mid, 0xFFFFFF],
      quantity: count,
      frequency: -1,
      depth: DEPTHS.PARTICLES,
      blendMode: 'ADD',
    });
    emitter.explode(count);
    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  convergenceBurst(node) {
    const cfg = NODE_CONFIG[node.type];

    // Big ring wave
    const ring = this.scene.add.graphics().setDepth(DEPTHS.PARTICLES);
    ring.lineStyle(4, cfg.glow, 1);
    ring.strokeCircle(node.x, node.y, 10);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 10,
      scaleY: 10,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Heavy particle burst
    this.burstAtNode(node, 60);

    // Screen flash
    this.screenFlash(cfg.glow, 0.25);
  }

  screenFlash(color = 0xFFFFFF, maxAlpha = 0.18) {
    const flash = this.scene.add.rectangle(GAME_W / 2, 0, GAME_W, 900, color, maxAlpha)
      .setDepth(DEPTHS.UI - 1)
      .setOrigin(0.5, 0);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  chainGlow(nodes) {
    nodes.forEach(node => this.burstAtNode(node, 8));
  }

  veilClearFlash(x, y) {
    const flash = this.scene.add.graphics().setDepth(DEPTHS.PARTICLES);
    flash.fillStyle(0xBB55FF, 0.7);
    flash.fillCircle(x, y, 28);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  destroy() {
    this._particles.forEach(p => p.destroy());
  }
}
