import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { GameState } from '../managers/GameState.js';
import { AdManager } from '../managers/AdManager.js';

export class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }

  init(data) {
    this.levelId = data.levelId;
    this.stars = data.stars;
    this.nodesCleared = data.nodesCleared;
    this.levelData = data.levelData;
  }

  create() {
    GameState.completeLevel(this.levelId, this.stars, this.nodesCleared);

    const shouldShowAd = AdManager.onLevelComplete();

    this._drawBg();
    this._spawnCelebration();

    // Story unlock
    if (this.levelData.storyUnlock) {
      this.time.delayedCall(800, () => {
        if (shouldShowAd) {
          AdManager.showInterstitial(() => this.scene.start('Story', { chapterId: this.levelData.chapter }));
        } else {
          this.scene.start('Story', { chapterId: this.levelData.chapter });
        }
      });
      return;
    }

    if (shouldShowAd) {
      this.time.delayedCall(1200, () => AdManager.showInterstitial(() => this._showResultUI()));
    } else {
      this.time.delayedCall(600, () => this._showResultUI());
    }
  }

  _drawBg() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COLORS.BG, 0.95);
    for (let i = 5; i >= 1; i--) {
      this.add.circle(GAME_W / 2, GAME_H * 0.38, i * 55, 0x2222AA, 0.06 * i);
    }
  }

  _spawnCelebration() {
    // Burst of colored particles from center
    const emitter = this.add.particles(GAME_W / 2, GAME_H * 0.38, 'glow', {
      speed: { min: 80, max: 260 },
      angle: { min: -110, max: -70 },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 600, max: 1100 },
      tint: [0xFFCC00, 0xFF8844, 0xBB55FF, 0x55AAFF, 0x33FF88],
      quantity: 4,
      frequency: 60,
      blendMode: 'ADD',
    });
    this.time.delayedCall(2500, () => emitter.destroy());
  }

  _showResultUI() {
    // Star row
    const starY = GAME_H * 0.32;
    for (let i = 0; i < 3; i++) {
      const filled = i < this.stars;
      const x = GAME_W / 2 + (i - 1) * 68;
      const star = this.add.text(x, starY, '★', {
        fontFamily: 'Arial', fontSize: filled ? '56px' : '44px',
        color: filled ? '#FFCC00' : '#223355',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: star, alpha: 1, scaleX: 1.2, scaleY: 1.2,
        delay: i * 200, duration: 350, ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({ targets: star, scaleX: 1, scaleY: 1, duration: 200 }),
      });
    }

    this.add.text(GAME_W / 2, GAME_H * 0.5, 'LEVEL COMPLETE', {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H * 0.57, `${this.nodesCleared} nodes mended`, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#8899CC',
    }).setOrigin(0.5);

    // Next level button
    this._addButton(GAME_W / 2, GAME_H * 0.70, 'NEXT LEVEL', 0x7733CC, 0xDDAAFF, () => {
      const nextId = this.levelId + 1;
      this.scene.start('Game', { levelId: nextId });
    });

    // Replay
    this._addButton(GAME_W / 2, GAME_H * 0.80, 'Replay', 0x223355, 0x8899CC, () => {
      this.scene.start('Game', { levelId: this.levelId });
    }, true);

    // Map
    this._addButton(GAME_W / 2, GAME_H * 0.87, 'Map', 0x111122, 0x667799, () => {
      this.scene.start('WorldMap');
    }, true);
  }

  _addButton(x, y, label, bgColor, textColor, onTap, small = false) {
    const w = small ? 140 : 220;
    const h = small ? 40 : 52;
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: small ? '15px' : '22px',
      color: `#${textColor.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.tweens.add({ targets: [bg, txt], scaleX: 0.95, scaleY: 0.95, duration: 80, yoyo: true });
        this.time.delayedCall(100, onTap);
      });
  }
}
