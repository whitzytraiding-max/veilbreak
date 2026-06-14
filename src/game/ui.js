import Phaser from 'phaser';
import { GAME_W } from './constants.js';
import { AudioManager } from './managers/AudioManager.js';

// Shared premium UI kit so every screen matches the main menu's bar: silver→
// lavender gradient serif titles, frosted-glass buttons with inner glow, and a
// consistent lavender/indigo palette. Built from the soft `glow` texture +
// blend modes; everything is tween-driven and mobile-light.

export const UI = {
  bgIndigo:   0x070312,
  violetBlack: 0x110827,
  bgMid:      0x140A2A,
  lavender:   0xC084FC,
  paleViolet: 0xE9D5FF,
  etherBlue:  0x60A5FA,
  softRose:   0xF9A8D4,
  silver:     0xF5F3FF,
  gold:       0xFFD24A,   // reward accent (stars / new best)
  green:      0x47E08A,   // positive / rewarded-ad accent
  muted:      0x8A7AB8,   // understated text
  SERIF:      'Georgia, "Times New Roman", serif',
};

const hex = (n) => '#' + (n >>> 0 & 0xFFFFFF).toString(16).padStart(6, '0');

// Apply the signature silver→lavender vertical gradient + soft bloom to a Text.
export function applyTitleGradient(t, glowColor = UI.lavender) {
  const grad = t.context.createLinearGradient(0, 0, 0, t.height);
  grad.addColorStop(0, '#FBFAFF');
  grad.addColorStop(0.5, '#E9D5FF');
  grad.addColorStop(1, hex(UI.lavender));
  t.setFill(grad);
  t.setStroke('#3A1A6E', Math.max(2, Math.round(t.style.fontSize?.replace?.('px', '') / 18) || 3));
  t.setShadow(0, 0, hex(glowColor), 16, false, true);
  return t;
}

// Premium gradient serif title.
export function gradientTitle(scene, x, y, text, opts = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: UI.SERIF,
    fontSize: (opts.size ?? 30) + 'px',
    fontStyle: 'bold',
    color: '#F5F3FF',
    letterSpacing: opts.letterSpacing ?? 0,
  }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
  applyTitleGradient(t, opts.glow ?? UI.lavender);
  return t;
}

// Soft additive glow sprite — quick bloom helper.
export function softGlow(scene, x, y, tint, scale = 4, alpha = 0.3, blend = Phaser.BlendModes.SCREEN) {
  return scene.add.image(x, y, 'glow').setTint(tint).setAlpha(alpha).setScale(scale).setBlendMode(blend);
}

// A frosted-glass rounded panel (drawn into a fresh Graphics).
export function frostedPanel(scene, x, y, w, h, opts = {}) {
  const r = opts.radius ?? 16;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, opts.shadow ?? 0.3);
  g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, r);
  g.fillStyle(UI.paleViolet, opts.fill ?? 0.08);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.fillStyle(0xFFFFFF, 0.05);
  g.fillRoundedRect(x - w / 2 + 5, y - h / 2 + 4, w - 10, h * 0.4, r * 0.7);
  g.lineStyle(1.2, opts.border ?? UI.lavender, opts.borderAlpha ?? 0.45);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  return g;
}

// Frosted-glass button. Returns a Container; honours variants + optional
// breathing CTA pulse and a hover/touch glow. Plays a tap on press.
//   opts: { w, h, fontSize, accent, glowAlpha, variant, subtitle, breathe, silent }
export function frostedButton(scene, x, y, label, onClick, opts = {}) {
  const variant = opts.variant ?? 'primary';
  const presets = {
    primary:   { w: 224, h: 60, fontSize: 26, glowAlpha: 0.42, borderA: 0.7 },
    secondary: { w: 180, h: 48, fontSize: 19, glowAlpha: 0.22, borderA: 0.5 },
    ghost:     { w: 150, h: 42, fontSize: 16, glowAlpha: 0.12, borderA: 0.35 },
  };
  const p = presets[variant] || presets.primary;
  const w = opts.w ?? p.w, h = opts.h ?? p.h, r = h / 2;
  const accent = opts.accent ?? UI.lavender;
  const glowAlpha = opts.glowAlpha ?? p.glowAlpha;

  const c = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.35);
  shadow.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, r);

  const glow = scene.add.image(0, 0, 'glow')
    .setTint(accent).setAlpha(glowAlpha).setScale(w / 60, h / 36)
    .setBlendMode(Phaser.BlendModes.ADD);

  const glass = scene.add.graphics();
  glass.fillStyle(UI.paleViolet, 0.12);
  glass.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  glass.fillStyle(accent, 0.10);
  glass.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  glass.fillStyle(0xFFFFFF, 0.10);
  glass.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.42, r * 0.7);
  glass.lineStyle(1.5, accent, p.borderA);
  glass.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

  const kids = [shadow, glow, glass];

  if (opts.subtitle) {
    const sub = scene.add.text(0, -h * 0.2, opts.subtitle, {
      fontFamily: 'Arial', fontSize: '11px', color: hex(accent),
    }).setOrigin(0.5);
    const lbl = scene.add.text(0, h * 0.16, label, {
      fontFamily: UI.SERIF, fontSize: (opts.fontSize ?? 18) + 'px', fontStyle: 'bold', color: '#FBFAFF',
    }).setOrigin(0.5);
    lbl.setShadow(0, 0, hex(accent), 10, false, true);
    kids.push(sub, lbl);
  } else {
    const lbl = scene.add.text(0, 0, label, {
      fontFamily: UI.SERIF, fontSize: (opts.fontSize ?? p.fontSize) + 'px', fontStyle: 'bold', color: '#FBFAFF',
    }).setOrigin(0.5);
    lbl.setShadow(0, 0, hex(accent), 10, false, true);
    kids.push(lbl);
  }

  c.add(kids);
  c.setSize(w, h);

  let hover = false;
  const zone = scene.add.zone(x, y, w + 16, h + 16).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => { hover = true; if (!opts.breathe) { glow.setAlpha(glowAlpha * 1.5); c.setScale(1.04); } });
  zone.on('pointerout',  () => { hover = false; if (!opts.breathe) { glow.setAlpha(glowAlpha); c.setScale(1); } });
  zone.on('pointerdown', () => {
    if (!opts.silent) AudioManager.playTap();
    scene.tweens.add({ targets: c, scaleX: 0.95, scaleY: 0.95, duration: 90, yoyo: true });
    scene.time.delayedCall(120, onClick);
  });

  if (opts.breathe) {
    const breath = { s: 1, b: glowAlpha };
    scene.tweens.add({
      targets: breath, s: 1.03, b: glowAlpha * 1.16,
      duration: 1250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!c.active) return;
        const hf = hover ? 1.045 : 1;
        c.setScale(breath.s * hf);
        glow.setAlpha(breath.b * (hover ? 1.5 : 1));
      },
    });
  }

  c._glow = glow;
  c._zone = zone;
  return c;
}

// Consistent back chevron (top-left). onClick fires on tap.
export function backButton(scene, onClick, opts = {}) {
  const x = opts.x ?? 24, y = opts.y ?? 36;
  const chevron = scene.add.text(x, y, '‹', {
    fontFamily: UI.SERIF, fontSize: '34px', color: hex(UI.paleViolet),
  }).setOrigin(0.5);
  chevron.setShadow(0, 0, hex(UI.lavender), 8, false, true);
  scene.add.zone(x + 4, y, 64, 60).setInteractive({ useHandCursor: true })
    .setScrollFactor(opts.scrollFactor ?? 1)
    .on('pointerdown', () => { AudioManager.playTap(); onClick(); });
  if (opts.scrollFactor != null) chevron.setScrollFactor(opts.scrollFactor);
  if (opts.depth != null) chevron.setDepth(opts.depth);
  return chevron;
}
