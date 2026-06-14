import Phaser from 'phaser';
import { GAME_W, GAME_H } from './constants.js';

// Shared "living cosmos" backdrop used by the Menu, World Map and Game scenes so
// they all share one smooth, soft look instead of each rolling its own (and the
// old hard-edged circle blobs that read as cheap). Everything is built from the
// soft radial `glow` / `sparkle` textures generated in BootScene + additive
// blending, then kept gently in motion (breathing nebula, drifting motes,
// occasional shooting stars).

// Desaturated deep-space tint of an accent colour — used for nebula gas so the
// chapter colour reads without blowing out to neon.
function deepTint(accent, t) {
  const c = Phaser.Display.Color.IntegerToColor(accent);
  return Phaser.Display.Color.GetColor(
    Math.round(0x0A + (c.red   - 0x0A) * t),
    Math.round(0x06 + (c.green - 0x06) * t),
    Math.round(0x16 + (c.blue  - 0x16) * t),
  );
}

// Soft nebula clouds that breathe (scale + alpha), drift, and slowly rotate.
export function addNebula(scene, defs) {
  defs.forEach(n => {
    const blob = scene.add.image(n.x, n.y, 'glow')
      .setTint(deepTint(n.accent, n.t ?? 0.45))
      .setAlpha(n.a)
      .setScale(n.r / 26)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setScrollFactor(n.scrollFactor ?? 1);
    scene.tweens.add({
      targets: blob,
      x: n.x + (Math.random() - 0.5) * 50,
      y: n.y + (Math.random() - 0.5) * 40,
      scale: blob.scale * (1.1 + Math.random() * 0.18),
      duration: 7000 + Math.random() * 5000,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: Math.random() * 3000,
    });
    scene.tweens.add({
      targets: blob, angle: 360,
      duration: 60000 + Math.random() * 40000,
      repeat: -1, ease: 'Linear',
    });
  });
}

// One drifting energy mote: rises up the screen, fading in then back out.
export function spawnMote(scene, accent, { scrollFactor = 1, depth = 1 } = {}) {
  const x = Math.random() * GAME_W;
  const mote = scene.add.image(x, GAME_H + 15, 'glow')
    .setTint(accent).setAlpha(0)
    .setScale(0.04 + Math.random() * 0.09)
    .setDepth(depth)
    .setScrollFactor(scrollFactor)
    .setBlendMode(Phaser.BlendModes.ADD);
  const drift = (Math.random() - 0.5) * 60;
  const peak = 0.12 + Math.random() * 0.16;
  const dur = 7000 + Math.random() * 5000;
  scene.tweens.add({
    targets: mote, y: -20, x: x + drift,
    duration: dur, ease: 'Sine.easeInOut',
    onComplete: () => mote.destroy(),
  });
  scene.tweens.add({
    targets: mote, alpha: peak,
    duration: dur * 0.4, yoyo: true, hold: dur * 0.2, ease: 'Sine.easeInOut',
  });
  return mote;
}

// Continuous mote emitter; returns the TimerEvent (auto-cleared on scene shutdown).
export function startMotes(scene, accent, opts = {}) {
  return scene.time.addEvent({
    delay: opts.delay ?? 700, loop: true,
    callback: () => spawnMote(scene, accent, opts),
  });
}

// One shooting star streaking across the upper sky.
export function spawnShootingStar(scene, { scrollFactor = 1, depth = 1 } = {}) {
  const startX = Math.random() * GAME_W * 0.6;
  const startY = 40 + Math.random() * 220;
  const len = 60 + Math.random() * 50;
  const star = scene.add.image(startX, startY, 'sparkle')
    .setScale(0.5).setAlpha(0).setDepth(depth)
    .setScrollFactor(scrollFactor).setBlendMode(Phaser.BlendModes.ADD);
  const trail = scene.add.rectangle(startX, startY, len, 2, 0xFFFFFF, 0.5)
    .setOrigin(1, 0.5).setAngle(28).setDepth(depth)
    .setScrollFactor(scrollFactor).setBlendMode(Phaser.BlendModes.ADD);
  const dx = 220 + Math.random() * 120;
  const dy = dx * 0.53; // matches the ~28° trail angle
  scene.tweens.add({
    targets: [star, trail], x: `+=${dx}`, y: `+=${dy}`,
    duration: 620, ease: 'Quad.easeIn',
    onComplete: () => { star.destroy(); trail.destroy(); },
  });
  scene.tweens.add({
    targets: [star, trail], alpha: 0.9,
    duration: 180, yoyo: true, hold: 120, ease: 'Sine.easeOut',
  });
}

// Periodic shooting stars; returns the TimerEvent.
export function startShootingStars(scene, opts = {}) {
  return scene.time.addEvent({
    delay: opts.delay ?? 4200, loop: true,
    callback: () => { if (Math.random() < (opts.chance ?? 0.7)) spawnShootingStar(scene, opts); },
  });
}

// Full single-screen cosmic backdrop. Builds base → aurora → nebula → stars →
// motes → shooting stars → vignette. Returns the spawned timers so the caller
// can hold a reference if needed (scene shutdown clears them automatically).
export function createCosmicBackground(scene, opts = {}) {
  const accent = opts.accent ?? 0x7A4DD8;

  // Deep space base
  scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x05040F, 1);

  // Low aurora glow rising from the bottom in the accent colour — slow breath
  const aurora = scene.add.image(GAME_W / 2, GAME_H + 60, 'glow')
    .setTint(accent).setAlpha(0.16).setScale(GAME_W / 64, GAME_H / 110)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: aurora, alpha: 0.26, scaleX: aurora.scaleX * 1.12,
    duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // Optional soft centre glow (used behind the menu logo)
  if (opts.centreGlow) {
    const cg = scene.add.image(GAME_W / 2, GAME_H * (opts.centreGlowY ?? 0.36), 'glow')
      .setTint(accent).setAlpha(0.2).setScale(GAME_W / 40)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    scene.tweens.add({
      targets: cg, alpha: 0.32, scale: cg.scale * 1.08,
      duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // Nebula clouds, tinted toward the accent
  addNebula(scene, (opts.nebula ?? [
    { x: 70,  y: 180, r: 120, t: 0.55, a: 0.5  },
    { x: 330, y: 360, r: 100, t: 0.30, a: 0.42 },
    { x: 180, y: 620, r: 130, t: 0.45, a: 0.4  },
    { x: 320, y: 700, r: 85,  t: 0.62, a: 0.36 },
  ]).map(n => ({ ...n, accent: n.accent ?? accent })));

  // Twinkling stars
  const starCount = opts.starCount ?? 90;
  for (let i = 0; i < starCount; i++) {
    const sr = Math.random() * 1.3 + 0.2;
    const sa = Math.random() * 0.5 + 0.1;
    const star = scene.add.circle(Math.random() * GAME_W, Math.random() * GAME_H, sr, 0xFFFFFF, sa);
    scene.tweens.add({
      targets: star, alpha: sa * 0.1,
      duration: 1200 + Math.random() * 2800,
      yoyo: true, repeat: -1, delay: Math.random() * 3000, ease: 'Sine.easeInOut',
    });
  }

  const timers = {};
  if (opts.motes !== false) timers.motes = startMotes(scene, accent);
  if (opts.shootingStars !== false) timers.shooting = startShootingStars(scene);

  // Vignette — darken edges so foreground pops
  const corners = [[0, 0], [GAME_W, 0], [0, GAME_H], [GAME_W, GAME_H]];
  corners.forEach(([cx, cy]) => scene.add.circle(cx, cy, 230, 0x020108, opts.vignette ?? 0.68).setDepth(2));

  return timers;
}
