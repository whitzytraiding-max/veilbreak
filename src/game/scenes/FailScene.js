import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { AdManager } from '../managers/AdManager.js';
import { fitCamera } from '../resScale.js';

export class FailScene extends Phaser.Scene {
  constructor() { super('Fail'); }

  init(data) {
    this.levelId = data.levelId;
    this.reason = data.reason;
    this.movesLeft = data.movesLeft;
    this.levelData = data.levelData;
    this.nodesCleared = data.nodesCleared;
  }

  create() {
    fitCamera(this);
    this._drawBg();
    this.time.delayedCall(400, () => this._showUI());
  }

  _drawBg() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x050510, 0.92);

    // Veil-like tendrils from edges
    const g = this.add.graphics();
    g.lineStyle(2, 0x330033, 0.3);
    for (let i = 0; i < 8; i++) {
      const startX = Math.random() < 0.5 ? 0 : GAME_W;
      const startY = Math.random() * GAME_H;
      g.lineBetween(startX, startY, GAME_W / 2 + (Math.random() - 0.5) * 120, GAME_H / 2);
    }
  }

  _showUI() {
    const msg = this.reason === 'veil' ? 'The Veil consumed the board' : 'Out of moves';
    const hasAd = this.reason === 'moves';

    this.add.text(GAME_W / 2, GAME_H * 0.28, '✦', {
      fontFamily: 'Arial', fontSize: '48px', color: '#550077',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H * 0.38, 'LEVEL FAILED', {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#FF4466', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H * 0.45, msg, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#778899', fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H * 0.52, `${this.nodesCleared} nodes mended`, {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#445566',
    }).setOrigin(0.5);

    // Watch ad for +3 moves (only when you ran out of moves)
    if (hasAd) {
      this._addAdButton(GAME_W / 2, GAME_H * 0.63, '+3 Moves', '▶ Watch Ad', 0x1A3A1A, 0x33FF88, () => {
        AdManager.showRewarded('EXTRA_MOVES', () => {
          this.scene.start('Game', { levelId: this.levelId, extraMoves: 3 });
        });
      });
    }

    // Retry — unlimited (no lives)
    this._addButton(GAME_W / 2, hasAd ? GAME_H * 0.75 : GAME_H * 0.66, 'Try Again', 0x7733CC, 0xFFFFFF, () => {
      this.scene.start('Game', { levelId: this.levelId });
    });

    this._addButton(GAME_W / 2, hasAd ? GAME_H * 0.85 : GAME_H * 0.76, 'Map', 0x111122, 0x8899CC, () => {
      this.scene.start('WorldMap');
    }, true);
  }

  _addAdButton(x, y, title, subtitle, bgColor, accentColor, onTap) {
    const w = 240;
    const h = 56;
    const g = this.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(2, accentColor, 0.7);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

    this.add.text(x, y - 9, subtitle, {
      fontFamily: 'Arial', fontSize: '11px', color: `#${accentColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    this.add.text(x, y + 9, title, {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap);
  }

  _addButton(x, y, label, bgColor, textColor, onTap, small = false) {
    const w = small ? 130 : 200;
    const h = small ? 38 : 50;
    const g = this.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: small ? '15px' : '20px',
      color: `#${textColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.tweens.add({ targets: [g, txt], scaleX: 0.95, scaleY: 0.95, duration: 80, yoyo: true });
        this.time.delayedCall(100, onTap);
      });
  }
}
