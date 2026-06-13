import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { Settings } from '../managers/SettingsManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { Haptic } from '../managers/Haptics.js';
import { fitCamera } from '../resScale.js';

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

    this._button(GAME_H * 0.62, 'How to Play', 0x2A1F4A, 0xCBA6FF, () => this._showHowTo());

    this.add.text(GAME_W / 2, GAME_H - 24, 'VeilBreak · v0.1', {
      fontFamily: 'monospace', fontSize: '11px', color: '#334466',
    }).setOrigin(0.5);
  }

  _drawBg() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x05040F, 1);
    [[80, 180, 0x1A0A3A], [330, 520, 0x0A1828], [200, 760, 0x15082A]].forEach(([x, y, c]) => {
      this.add.image(x, y, 'glow').setDisplaySize(360, 360).setTint(c)
        .setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    });
    for (let i = 0; i < 90; i++) {
      this.add.circle(Math.random() * GAME_W, Math.random() * GAME_H,
        Math.random() * 1.3 + 0.3, 0xFFFFFF, Math.random() * 0.5 + 0.1);
    }
  }

  _drawHeader() {
    this.add.text(20, 36, '←', { fontFamily: 'Arial', fontSize: '28px', color: '#8899CC' }).setOrigin(0.5);
    this.add.zone(24, 36, 64, 60).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'));
    this.add.text(GAME_W / 2, 50, 'SETTINGS', {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#FFFFFF', fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);
  }

  _toggleRow(y, label, key) {
    const m = 30, w = GAME_W - m * 2;
    const g = this.add.graphics();
    g.fillStyle(0x0C0C22, 0.85); g.fillRoundedRect(m, y - 26, w, 52, 12);
    g.lineStyle(1, 0x2A3358, 0.7); g.strokeRoundedRect(m, y - 26, w, 52, 12);

    this.add.text(m + 18, y, label, {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#DDE6FF',
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

    const render = () => {
      track.clear();
      track.fillStyle(on ? 0x2E9E5B : 0x33405E, 1);
      track.fillRoundedRect(x - trackW / 2, y - trackH / 2, trackW, trackH, trackH / 2);
      knob.x = on ? x + trackW / 2 - knobR - 3 : x - trackW / 2 + knobR + 3;
      knob.setFillStyle(on ? 0xEAFFF2 : 0xAAB4CC, 1);
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

  _button(y, label, bg, accent, onTap) {
    const w = 230, h = 52;
    const g = this.add.graphics();
    g.fillStyle(bg, 1); g.fillRoundedRect(GAME_W / 2 - w / 2, y - h / 2, w, h, h / 2);
    g.lineStyle(1.5, accent, 0.6); g.strokeRoundedRect(GAME_W / 2 - w / 2, y - h / 2, w, h, h / 2);
    const txt = this.add.text(GAME_W / 2, y, label, {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.zone(GAME_W / 2, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.tweens.add({ targets: [g, txt], scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true });
        AudioManager.playTap();
        this.time.delayedCall(90, onTap);
      });
  }

  // ── How to Play overlay ─────────────────────────────────────────────────────

  _showHowTo() {
    const D = 800;
    const items = [];
    const add = (o) => { items.push(o); o.setDepth(D); };

    add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x03020A, 0.92).setInteractive());
    add(this.add.text(GAME_W / 2, GAME_H * 0.12, 'HOW TO PLAY', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#FFFFFF', fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5));

    const lines = [
      ['◈  Mend', 'Drag across 3 or more matching orbs to clear them.'],
      ['↯  Convergence', 'Close a loop back to your start (6+ orbs) to clear EVERY orb of that colour.'],
      ['✦  The Veil', 'Dark veil spreads over the board. Clear orbs next to it to push it back — don\'t let it take over.'],
      ['⬡  Objectives', 'Each level lists goals up top: CLEAR a count, free ANCHORS, hold back the VEIL, or build a long CHAIN.'],
    ];
    let y = GAME_H * 0.22;
    lines.forEach(([title, body]) => {
      add(this.add.text(36, y, title, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#CBA6FF', fontStyle: 'bold',
      }).setOrigin(0, 0));
      add(this.add.text(36, y + 24, body, {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#AAB6D0',
        wordWrap: { width: GAME_W - 72 }, lineSpacing: 4,
      }).setOrigin(0, 0));
      y += 110;
    });

    const close = this.add.text(GAME_W / 2, GAME_H * 0.9, 'Got it', {
      fontFamily: 'Georgia, serif', fontSize: '19px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D).setInteractive({ useHandCursor: true });
    add(close);
    close.on('pointerdown', () => items.forEach(o => o.destroy()));
  }
}
