import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { AdManager } from '../managers/AdManager.js';
import { fitCamera } from '../resScale.js';
import { UI, gradientTitle, softGlow, frostedButton } from '../ui.js';

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
    const g = this.add.graphics();
    g.fillGradientStyle(UI.bgIndigo, UI.bgIndigo, UI.bgMid, UI.violetBlack, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // A dimmed, somber veil bloom — the tear has won, for now.
    softGlow(this, GAME_W / 2, GAME_H * 0.3, 0x5A2A8A, 11, 0.22);

    // Veil tendrils creeping in from the edges (soft, not harsh)
    const t = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    t.lineStyle(1.5, UI.lavender, 0.12);
    for (let i = 0; i < 9; i++) {
      const startX = Math.random() < 0.5 ? -10 : GAME_W + 10;
      const startY = Math.random() * GAME_H;
      t.lineBetween(startX, startY, GAME_W / 2 + (Math.random() - 0.5) * 140, GAME_H * 0.32);
    }
  }

  _showUI() {
    const msg = this.reason === 'veil' ? 'The Veil consumed the board' : 'You ran out of moves';
    const hasAd = this.reason === 'moves';

    this.add.text(GAME_W / 2, GAME_H * 0.27, '✦', {
      fontFamily: UI.SERIF, fontSize: '46px', color: '#9A6AD8',
    }).setOrigin(0.5).setShadow(0, 0, '#C084FC', 18, false, true);

    gradientTitle(this, GAME_W / 2, GAME_H * 0.375, 'THE VEIL HOLDS', { size: 27, letterSpacing: 1, glow: UI.softRose });

    this.add.text(GAME_W / 2, GAME_H * 0.44, msg, {
      fontFamily: UI.SERIF, fontSize: '15px', color: '#B9A6DD', fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H * 0.51, `${this.nodesCleared} orbs mended`, {
      fontFamily: UI.SERIF, fontSize: '13px', color: '#7A6AA0',
    }).setOrigin(0.5);

    // Watch ad for +3 moves (only when you ran out of moves)
    if (hasAd) {
      frostedButton(this, GAME_W / 2, GAME_H * 0.63, '+3 Moves', () => {
        AdManager.showRewarded('EXTRA_MOVES', () => {
          this.scene.start('Game', { levelId: this.levelId, extraMoves: 3 });
        });
      }, { variant: 'primary', accent: UI.green, subtitle: '▶  WATCH AD', w: 240 });
    }

    // Retry — unlimited (no lives), primary CTA
    frostedButton(this, GAME_W / 2, hasAd ? GAME_H * 0.75 : GAME_H * 0.66, 'Try Again', () => {
      this.scene.start('Game', { levelId: this.levelId });
    }, { variant: 'primary', breathe: !hasAd });

    frostedButton(this, GAME_W / 2, hasAd ? GAME_H * 0.85 : GAME_H * 0.76, 'Map', () => {
      this.scene.start('WorldMap');
    }, { variant: 'ghost' });
  }
}
