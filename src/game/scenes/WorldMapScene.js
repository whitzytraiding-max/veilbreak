import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../constants.js';
import { GameState } from '../managers/GameState.js';
import { LivesManager } from '../managers/LivesManager.js';
import { LEVELS } from '../data/levels.js';
import { CHAPTERS } from '../data/chapters.js';

const LEVEL_DOTS = [
  // Chapter 1 path — wind down from top-right to bottom-left
  { x: 310, y: 140 }, { x: 270, y: 190 }, { x: 310, y: 245 },
  { x: 260, y: 295 }, { x: 200, y: 320 }, { x: 155, y: 275 },
  { x: 110, y: 315 }, { x: 90,  y: 375 }, { x: 130, y: 430 },
  { x: 185, y: 465 },
  // Chapter 2 path
  { x: 235, y: 490 }, { x: 285, y: 535 }, { x: 320, y: 585 },
  { x: 280, y: 635 }, { x: 230, y: 660 },
];

export class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMap'); }

  create() {
    this._drawBg();
    this._drawPath();
    this._drawLevelDots();
    this._drawHeader();
  }

  _drawBg() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COLORS.BG, 1);

    // Faint topographic lines
    const g = this.add.graphics();
    for (let i = 0; i < 12; i++) {
      const y = 50 + i * 65;
      g.lineStyle(1, 0x1A2244, 0.4);
      g.beginPath();
      g.moveTo(0, y + Math.sin(i) * 15);
      for (let x = 0; x <= GAME_W; x += 20) {
        g.lineTo(x, y + Math.sin(x * 0.03 + i * 0.8) * 18);
      }
      g.strokePath();
    }

    // Stars
    for (let i = 0; i < 50; i++) {
      this.add.circle(
        Math.random() * GAME_W, Math.random() * GAME_H,
        Math.random() + 0.5, 0xFFFFFF, Math.random() * 0.5 + 0.1
      );
    }
  }

  _drawPath() {
    const highestUnlocked = GameState.get().highestUnlocked;
    const g = this.add.graphics();

    for (let i = 0; i < LEVEL_DOTS.length - 1; i++) {
      const a = LEVEL_DOTS[i];
      const b = LEVEL_DOTS[i + 1];
      const unlocked = i + 1 <= highestUnlocked;
      g.lineStyle(4, unlocked ? 0x4455AA : 0x1A2233, 0.8);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  _drawLevelDots() {
    const highestUnlocked = GameState.get().highestUnlocked;

    LEVEL_DOTS.forEach((pos, i) => {
      const levelId = i + 1;
      const unlocked = levelId <= highestUnlocked;
      const stars = GameState.getStars(levelId);
      const isCurrent = levelId === highestUnlocked;

      const r = isCurrent ? 22 : 18;
      const color = unlocked ? (isCurrent ? 0x9955FF : 0x445599) : 0x1A2233;
      const borderColor = unlocked ? (isCurrent ? 0xDDAAFF : 0x6677BB) : 0x2A3355;

      const dot = this.add.circle(pos.x, pos.y, r, color, 1);
      dot.setStrokeStyle(2.5, borderColor, 1);

      if (isCurrent) {
        this.tweens.add({
          targets: dot,
          scaleX: 1.12, scaleY: 1.12,
          duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        // Glow ring
        const glow = this.add.circle(pos.x, pos.y, r + 12, 0x9955FF, 0.18);
        this.tweens.add({
          targets: glow, alpha: 0.04,
          duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      // Level number
      this.add.text(pos.x, pos.y, String(levelId), {
        fontFamily: 'Georgia, serif',
        fontSize: unlocked ? '16px' : '13px',
        color: unlocked ? '#FFFFFF' : '#334466',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Stars below dot
      if (stars > 0) {
        this.add.text(pos.x, pos.y + r + 8, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#FFCC00',
        }).setOrigin(0.5, 0);
      }

      // Tap to play
      if (unlocked) {
        const zone = this.add.zone(pos.x, pos.y, r * 2.5, r * 2.5).setInteractive();
        zone.on('pointerdown', () => this._startLevel(levelId));
      }
    });
  }

  _drawHeader() {
    // Back arrow
    const back = this.add.text(20, 18, '←', {
      fontFamily: 'Arial', fontSize: '28px', color: '#8899CC',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('Menu'));

    this.add.text(GAME_W / 2, 28, 'REALMS', {
      fontFamily: 'Georgia, serif', fontSize: '22px',
      color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Lives
    const lives = LivesManager.getLives();
    this.add.text(GAME_W - 20, 28, '♥'.repeat(lives), {
      fontFamily: 'Arial', fontSize: '18px', color: '#FF4466',
    }).setOrigin(1, 0.5);

    // Chapter labels
    CHAPTERS.forEach((ch, i) => {
      const baseIdx = i * 10;
      if (baseIdx >= LEVEL_DOTS.length) return;
      const pos = LEVEL_DOTS[baseIdx];
      this.add.text(pos.x - 35, pos.y - 38, `Ch.${ch.id}  ${ch.title}`, {
        fontFamily: 'Georgia, serif', fontSize: '11px',
        color: '#667799', fontStyle: 'italic',
      });
    });
  }

  _startLevel(levelId) {
    if (!LivesManager.hasLife()) {
      this._showNoLivesPopup();
      return;
    }
    GameState.setCurrentLevel(levelId);
    this.scene.start('Game', { levelId });
  }

  _showNoLivesPopup() {
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7)
      .setInteractive();
    this.add.text(GAME_W / 2, GAME_H / 2 - 60, 'No lives left!', {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#FF4466',
    }).setOrigin(0.5);
    const secs = LivesManager.getSecondsUntilNextLife();
    const mins = Math.ceil(secs / 60);
    this.add.text(GAME_W / 2, GAME_H / 2 - 20, `Next life in ${mins} min`, {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#AABBCC',
    }).setOrigin(0.5);
    const close = this.add.text(GAME_W / 2, GAME_H / 2 + 40, 'OK', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#FFFFFF',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => { overlay.destroy(); close.destroy(); });
  }
}
