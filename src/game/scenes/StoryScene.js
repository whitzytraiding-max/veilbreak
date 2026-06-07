import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { CHAPTERS } from '../data/chapters.js';

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }

  init(data) {
    this.chapterId = data.chapterId;
    this.chapter = CHAPTERS.find(c => c.id === this.chapterId);
    this.panelIndex = 0;
    this.panels = this.chapter?.storyPanels || [];
  }

  create() {
    if (!this.panels.length) {
      this.scene.start('WorldMap');
      return;
    }
    this._showPanel(0);
  }

  _showPanel(idx) {
    this.children.removeAll(true);
    const panel = this.panels[idx];
    if (!panel) { this._finish(); return; }

    // Letterbox background
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, panel.bg, 1);

    // Letterbox bars (cinematic feel)
    this.add.rectangle(GAME_W / 2, 45, GAME_W, 90, 0x000000, 1);
    this.add.rectangle(GAME_W / 2, GAME_H - 45, GAME_W, 90, 0x000000, 1);

    // Chapter title in top bar
    this.add.text(GAME_W / 2, 45, `Chapter ${this.chapterId}`, {
      fontFamily: 'Georgia, serif', fontSize: '14px',
      color: '#667799', fontStyle: 'italic', letterSpacing: 2,
    }).setOrigin(0.5);

    // Panel title
    this.add.text(GAME_W / 2, GAME_H * 0.22, panel.title, {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Story lines — reveal one by one
    const lineObjs = [];
    panel.lines.forEach((line, i) => {
      const txt = this.add.text(GAME_W / 2, GAME_H * 0.38 + i * 40, line, {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#AABBCC',
        fontStyle: 'italic', align: 'center', wordWrap: { width: GAME_W - 60 },
      }).setOrigin(0.5).setAlpha(0);
      lineObjs.push(txt);
    });

    // Accent divider
    const divider = this.add.graphics();
    divider.lineStyle(1, panel.accent, 0.6);
    divider.lineBetween(GAME_W * 0.2, GAME_H * 0.3, GAME_W * 0.8, GAME_H * 0.3);
    divider.setAlpha(0);

    // Animate in
    this.tweens.add({ targets: this.children.list[3], alpha: 1, duration: 600, delay: 300 });
    this.tweens.add({ targets: divider, alpha: 1, duration: 400, delay: 600 });
    lineObjs.forEach((t, i) => {
      this.tweens.add({ targets: t, alpha: 1, duration: 500, delay: 800 + i * 300, ease: 'Sine.easeOut' });
    });

    // Accent glow orb (decorative)
    const orbY = GAME_H * 0.75;
    for (let i = 3; i >= 1; i--) {
      this.add.circle(GAME_W / 2, orbY, i * 30, panel.accent, 0.04 * i);
    }
    this.add.circle(GAME_W / 2, orbY, 12, panel.accent, 0.7);

    // "Tap to continue" prompt
    const next = this.add.text(GAME_W / 2, GAME_H - 58, 'Tap to continue', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#556677', fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: next, alpha: 0.8, duration: 600, delay: 1800, yoyo: true, repeat: -1 });

    // Tap to advance
    this.input.once('pointerdown', () => {
      this.tweens.killAll();
      const ni = idx + 1;
      if (ni < this.panels.length) this._showPanel(ni);
      else this._finish();
    });
  }

  _finish() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(700, () => this.scene.start('WorldMap'));
  }
}
