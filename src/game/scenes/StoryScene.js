import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { CHAPTERS } from '../data/chapters.js';
import { fitCamera } from '../resScale.js';
import { UI, gradientTitle } from '../ui.js';

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }

  init(data) {
    this.chapterId = data.chapterId;
    this.chapter = CHAPTERS.find(c => c.id === this.chapterId);
    this.panelIndex = 0;
    this.panels = this.chapter?.storyPanels || [];
  }

  create() {
    fitCamera(this);
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
      fontFamily: UI.SERIF, fontSize: '14px',
      color: '#9A8AC0', fontStyle: 'italic', letterSpacing: 2,
    }).setOrigin(0.5);

    // Soft accent bloom behind the title so it feels lit
    const titleBloom = this.add.image(GAME_W / 2, GAME_H * 0.22, 'glow')
      .setTint(panel.accent).setScale(9, 4).setAlpha(0).setBlendMode(Phaser.BlendModes.SCREEN);

    // Panel title — premium gradient serif
    const title = gradientTitle(this, GAME_W / 2, GAME_H * 0.22, panel.title, { size: 28, glow: panel.accent }).setAlpha(0);

    // Accent divider with centre node
    const divider = this.add.graphics().setAlpha(0);
    divider.lineStyle(1, panel.accent, 0.6);
    divider.lineBetween(GAME_W * 0.22, GAME_H * 0.3, GAME_W * 0.42, GAME_H * 0.3);
    divider.lineBetween(GAME_W * 0.58, GAME_H * 0.3, GAME_W * 0.78, GAME_H * 0.3);
    divider.fillStyle(panel.accent, 0.9);
    divider.fillCircle(GAME_W / 2, GAME_H * 0.3, 2.5);

    // Story lines — reveal one by one
    const lineObjs = [];
    panel.lines.forEach((line, i) => {
      const txt = this.add.text(GAME_W / 2, GAME_H * 0.38 + i * 40, line, {
        fontFamily: UI.SERIF, fontSize: '18px', color: '#C9BCE6',
        fontStyle: 'italic', align: 'center', wordWrap: { width: GAME_W - 60 },
      }).setOrigin(0.5).setAlpha(0);
      lineObjs.push(txt);
    });

    // Animate in
    this.tweens.add({ targets: title, alpha: 1, duration: 600, delay: 300 });
    this.tweens.add({ targets: titleBloom, alpha: 0.22, duration: 700, delay: 300 });
    this.tweens.add({ targets: divider, alpha: 1, duration: 400, delay: 600 });
    lineObjs.forEach((t, i) => {
      this.tweens.add({ targets: t, alpha: 1, duration: 500, delay: 800 + i * 300, ease: 'Sine.easeOut' });
    });

    // Accent glow orb (decorative) — soft additive bloom + pulsing core
    const orbY = GAME_H * 0.75;
    this.add.image(GAME_W / 2, orbY, 'glow').setTint(panel.accent).setScale(3.5).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    const orbCore = this.add.image(GAME_W / 2, orbY, 'glow').setTint(0xFFFFFF).setScale(0.7).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: orbCore, scale: 0.9, alpha: 0.5, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // "Tap to continue" prompt
    const next = this.add.text(GAME_W / 2, GAME_H - 58, 'Tap to continue', {
      fontFamily: UI.SERIF, fontSize: '14px', color: '#8A7AB8', fontStyle: 'italic',
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
