import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Generate all programmatic textures here so every scene can use them
    this._makeGlowTexture();
    this._makeStarTexture();
  }

  create() {
    this.scene.start('Menu');
  }

  _makeGlowTexture() {
    const size = 64;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(0xFFFFFF, 0.06 * i);
      g.fillCircle(size / 2, size / 2, (size / 2) * (i / 4));
    }
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(size / 2, size / 2, size / 6);
    g.generateTexture('glow', size, size);
    g.destroy();
  }

  _makeStarTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('star_dot', 6, 6);
    g.destroy();
  }
}
