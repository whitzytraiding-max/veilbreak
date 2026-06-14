import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { Settings } from '../managers/SettingsManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { Haptic } from '../managers/Haptics.js';
import { fitCamera } from '../resScale.js';
import { UI, gradientTitle, softGlow, frostedButton, frostedPanel, backButton } from '../ui.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create() {
    fitCamera(this);
    this._drawBg();
    this._drawHeader();

    const rows = [
      { key: 'sfx', label: 'Sound Effects' },
      { key: 'music', label: 'Music' },
      { key: 'haptics', label: 'Haptics' },
    ];
    rows.forEach((r, i) => this._toggleRow(GAME_H * 0.30 + i * 78, r.label, r.key));

    frostedButton(this, GAME_W / 2, GAME_H * 0.62, 'How to Play', () => this._showHowTo(), { variant: 'primary', w: 230, fontSize: 20 });

    this.add.text(GAME_W / 2, GAME_H - 24, 'VeilBreak · v0.1', {
      fontFamily: 'monospace', fontSize: '11px', color: '#3A2A5A',
    }).setOrigin(0.5);
  }

  _drawBg() {
    const g = this.add.graphics();
    g.fillGradientStyle(UI.bgIndigo, UI.bgIndigo, UI.bgMid, UI.violetBlack, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    softGlow(this, 70, 200, UI.lavender, 10, 0.12);
    softGlow(this, 340, 560, UI.etherBlue, 9, 0.08);
    softGlow(this, 200, 780, UI.softRose, 8, 0.06);
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 0.45 + 0.1;
      const s = this.add.circle(Math.random() * GAME_W, Math.random() * GAME_H, Math.random() * 1.2 + 0.3, 0xFFFFFF, a);
      this.tweens.add({ targets: s, alpha: a * 0.12, duration: 1400 + Math.random() * 2600, yoyo: true, repeat: -1, delay: Math.random() * 3000, ease: 'Sine.easeInOut' });
    }
  }

  _drawHeader() {
    backButton(this, () => this.scene.start('Menu'));
    gradientTitle(this, GAME_W / 2, 50, 'SETTINGS', { size: 26, letterSpacing: 4 });
  }

  _toggleRow(y, label, key) {
    const m = 30, w = GAME_W - m * 2;
    frostedPanel(this, GAME_W / 2, y, w, 52, { radius: 14, fill: 0.06 });

    this.add.text(m + 18, y, label, {
      fontFamily: UI.SERIF, fontSize: '16px', color: '#E9D5FF',
    }).setOrigin(0, 0.5);

    this._switch(GAME_W - m - 44, y, Settings.get()[key], (on) => {
      Settings.set(key, on);
      AudioManager.playTap();
      Haptic.light();
    });
  }

  // Sliding on/off switch
  _switch(x, y, initial, onChange) {
    const trackW = 54, trackH = 28, knobR = 11;
    let on = initial;

    const track = this.add.graphics();
    const knob = this.add.circle(0, y, knobR, 0xFFFFFF, 1);

    const glow = this.add.image(x, y, 'glow').setTint(UI.lavender).setScale(1.7).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const render = () => {
      track.clear();
      track.fillStyle(on ? UI.lavender : 0x2A2348, on ? 0.85 : 1);
      track.fillRoundedRect(x - trackW / 2, y - trackH / 2, trackW, trackH, trackH / 2);
      track.lineStyle(1, on ? UI.paleViolet : 0x4A4068, on ? 0.7 : 0.5);
      track.strokeRoundedRect(x - trackW / 2, y - trackH / 2, trackW, trackH, trackH / 2);
      knob.x = on ? x + trackW / 2 - knobR - 3 : x - trackW / 2 + knobR + 3;
      knob.setFillStyle(on ? 0xFBFAFF : 0x9A8AC0, 1);
      glow.x = knob.x;
      glow.setAlpha(on ? 0.5 : 0);
    };
    render();

    this.add.zone(x, y, trackW + 30, 44).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        on = !on;
        this.tweens.add({ targets: knob, scaleX: 1.2, scaleY: 1.2, duration: 90, yoyo: true });
        render();
        onChange(on);
      });
  }

  // ── How to Play overlay ─────────────────────────────────────────────────────

  _showHowTo() {
    const D = 800;
    const items = [];
    const add = (o) => { items.push(o); o.setDepth(D); };

    add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x05030F, 0.94).setInteractive());
    add(this.add.image(GAME_W / 2, GAME_H * 0.16, 'glow').setTint(UI.lavender).setScale(10, 5).setAlpha(0.18).setBlendMode(Phaser.BlendModes.SCREEN));
    add(gradientTitle(this, GAME_W / 2, GAME_H * 0.12, 'HOW TO PLAY', { size: 22, letterSpacing: 3 }));

    const lines = [
      ['◈  Mend', 'Drag across 3 or more matching orbs to clear them.'],
      ['↯  Convergence', 'Close a loop back to your start (6+ orbs) to clear EVERY orb of that colour.'],
      ['✦  The Veil', 'Dark veil spreads over the board. Clear orbs next to it to push it back — don\'t let it take over.'],
      ['⬡  Objectives', 'Each level lists goals up top: CLEAR a count, free ANCHORS, hold back the VEIL, or build a long CHAIN.'],
    ];
    let y = GAME_H * 0.22;
    lines.forEach(([title, body]) => {
      add(this.add.text(36, y, title, {
        fontFamily: UI.SERIF, fontSize: '16px', color: '#CBA6FF', fontStyle: 'bold',
      }).setOrigin(0, 0).setShadow(0, 0, '#C084FC', 8, false, true));
      add(this.add.text(36, y + 24, body, {
        fontFamily: UI.SERIF, fontSize: '13px', color: '#B9A6DD',
        wordWrap: { width: GAME_W - 72 }, lineSpacing: 4,
      }).setOrigin(0, 0));
      y += 110;
    });

    const close = frostedButton(this, GAME_W / 2, GAME_H * 0.9, 'Got it', () => items.forEach(o => o.destroy()), { variant: 'secondary' });
    close.setDepth(D); items.push(close);
    close._zone.setDepth(D);
  }
}
