import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, NODE_CONFIG } from '../constants.js';
import { fitCamera } from '../resScale.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    fitCamera(this);
    this._drawBg();
    this._spawnStars();
    this._spawnFloatingOrbs();
    this._drawLogo();
    this._drawUI();
  }

  _drawBg() {
    // Deep space base
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x05040F, 1);

    // Nebula layers — soft colored depth clouds
    const nebulaDefs = [
      { x: 60,  y: 150, r: 130, color: 0x1A0A3A, a: 0.5  },
      { x: 340, y: 320, r: 100, color: 0x0A0A2A, a: 0.4  },
      { x: 200, y: 560, r: 150, color: 0x15082A, a: 0.45 },
      { x: 350, y: 700, r: 80,  color: 0x0A1820, a: 0.35 },
    ];
    nebulaDefs.forEach(n => {
      for (let layer = 3; layer >= 1; layer--) {
        const blob = this.add.circle(n.x, n.y, n.r * layer * 0.4, n.color, n.a / layer);
        this.tweens.add({
          targets: blob,
          x: n.x + (Math.random() - 0.5) * 18,
          y: n.y + (Math.random() - 0.5) * 12,
          duration: 9000 + Math.random() * 6000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 4000,
        });
      }
    });

    // Radial centre glow behind logo area
    for (let i = 6; i >= 1; i--) {
      this.add.circle(GAME_W / 2, GAME_H * 0.38, i * 55, 0x1A1A4A, 0.035 * i);
    }

    // Vignette — darken corners
    const corners = [[0, 0], [GAME_W, 0], [0, GAME_H], [GAME_W, GAME_H]];
    corners.forEach(([cx, cy]) => this.add.circle(cx, cy, 230, 0x020108, 0.7));
  }

  _spawnStars() {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * GAME_W;
      const y = Math.random() * GAME_H;
      const r = Math.random() * 1.5 + 0.2;
      const alpha = Math.random() * 0.6 + 0.12;
      const dot = this.add.circle(x, y, r, 0xFFFFFF, alpha);
      this.tweens.add({
        targets: dot,
        alpha: alpha * 0.1,
        duration: 1200 + Math.random() * 2800,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2500,
        ease: 'Sine.easeInOut',
      });
    }
  }

  _spawnFloatingOrbs() {
    const types = Object.keys(NODE_CONFIG);
    for (let i = 0; i < 8; i++) {
      const cfg = NODE_CONFIG[types[i % types.length]];
      const x = 30 + Math.random() * (GAME_W - 60);
      const y = 80 + Math.random() * (GAME_H - 160);
      const r = 6 + Math.random() * 10;

      const orb = this.add.circle(x, y, r, cfg.glow, 0.18);
      this.add.circle(x, y, r * 0.5, cfg.mid, 0.35);

      this.tweens.add({
        targets: orb,
        y: y + (Math.random() > 0.5 ? 30 : -30),
        x: x + (Math.random() > 0.5 ? 15 : -15),
        duration: 3000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }
  }

  _drawLogo() {
    // Glow behind logo
    this.add.circle(GAME_W / 2, GAME_H * 0.3, 90, 0x4433AA, 0.2);
    this.add.circle(GAME_W / 2, GAME_H * 0.3, 55, 0x7755DD, 0.15);

    this.add.text(GAME_W / 2, GAME_H * 0.28, 'VEIL', {
      fontFamily: 'Georgia, serif',
      fontSize: '68px',
      color: '#FFFFFF',
      stroke: '#9955FF',
      strokeThickness: 3,
      alpha: 0.95,
    }).setOrigin(0.5, 1);

    this.add.text(GAME_W / 2, GAME_H * 0.28 + 4, 'BREAK', {
      fontFamily: 'Georgia, serif',
      fontSize: '68px',
      color: '#BB88FF',
      stroke: '#440088',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.add.text(GAME_W / 2, GAME_H * 0.42, 'Mend what was broken.', {
      fontFamily: 'Georgia, serif',
      fontSize: '17px',
      color: '#8899CC',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Divider line
    const line = this.add.graphics();
    line.lineStyle(1, 0x556699, 0.5);
    line.lineBetween(GAME_W * 0.25, GAME_H * 0.46, GAME_W * 0.75, GAME_H * 0.46);
  }

  _drawUI() {
    // Settings gear — top-right
    const gear = this.add.text(GAME_W - 28, 34, '⚙', {
      fontFamily: 'Arial', fontSize: '26px', color: '#8899CC',
    }).setOrigin(0.5);
    this.add.zone(GAME_W - 28, 34, 56, 56).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Settings'));
    this.tweens.add({ targets: gear, angle: 360, duration: 14000, repeat: -1, ease: 'Linear' });

    // Play button
    const btnY = GAME_H * 0.6;
    const btn = this.add.graphics();
    btn.fillStyle(0x7733CC, 1);
    this._roundRect(btn, GAME_W / 2 - 110, btnY - 28, 220, 56, 28);
    btn.lineStyle(2, 0xBB77FF, 0.8);
    this._roundRectStroke(btn, GAME_W / 2 - 110, btnY - 28, 220, 56, 28);

    const btnText = this.add.text(GAME_W / 2, btnY, 'PLAY', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hit zone
    const zone = this.add.zone(GAME_W / 2, btnY, 220, 56).setInteractive();
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: [btn, btnText], scaleX: 0.95, scaleY: 0.95, duration: 80, yoyo: true });
      this.time.delayedCall(150, () => this.scene.start('WorldMap'));
    });
    zone.on('pointerover', () => btnText.setColor('#DDAAFF'));
    zone.on('pointerout', () => btnText.setColor('#FFFFFF'));

    // Version
    this.add.text(GAME_W / 2, GAME_H - 18, 'v0.1', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#334466',
    }).setOrigin(0.5);
  }

  _roundRect(g, x, y, w, h, r) {
    g.fillRoundedRect(x, y, w, h, r);
  }

  _roundRectStroke(g, x, y, w, h, r) {
    g.strokeRoundedRect(x, y, w, h, r);
  }
}
