import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, NODE_CONFIG, NODE_TYPES } from '../constants.js';

const hex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Generate all programmatic textures here so every scene can use them.
    this._makeSoftGlow();
    this._makeStarTexture();
    this._makeSparkle();
    NODE_TYPES.forEach((t) => this._makeOrbTexture(t));
  }

  create() {
    this.scene.start('Menu');
  }

  // ── Magic energy orb — high-res radial-gradient plasma sphere ───────────────
  // Rendered large (S px) and displayed small, so it stays crisp and the
  // gradients read as a glowing glass orb rather than flat vector circles.
  _makeOrbTexture(type) {
    const cfg = NODE_CONFIG[type];
    const S = 192;
    const c = S / 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');

    const bodyR = S * 0.40;   // the solid sphere
    const haloR = S * 0.50;   // outer bloom reaches the texture edge

    // 1. Outer bloom halo — soft colored light bleeding off the orb
    let halo = ctx.createRadialGradient(c, c, bodyR * 0.6, c, c, haloR);
    halo.addColorStop(0, this._rgba(cfg.glow, 0.6));
    halo.addColorStop(0.5, this._rgba(cfg.glow, 0.22));
    halo.addColorStop(1, this._rgba(cfg.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);

    // 2. Sphere body — darker rim → mid, leaving the centre for the energy core
    const bx = c - bodyR * 0.18;
    const by = c - bodyR * 0.20;
    let body = ctx.createRadialGradient(bx, by, bodyR * 0.05, c, c, bodyR);
    body.addColorStop(0, this._rgba(cfg.mid, 1));
    body.addColorStop(0.45, this._rgba(cfg.base, 1));
    body.addColorStop(0.82, this._rgba(this._darken(cfg.base, 0.7), 1));
    body.addColorStop(1, this._rgba(this._darken(cfg.base, 0.45), 1));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Swirling plasma energy — additive bright wisps clipped to the sphere,
    //    so the orb looks alive and molten rather than like a solid gem.
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const wisps = [
      { x: c - bodyR * 0.22, y: c - bodyR * 0.10, r: bodyR * 0.55, a: 0.5 },
      { x: c + bodyR * 0.28, y: c + bodyR * 0.18, r: bodyR * 0.42, a: 0.4 },
      { x: c + bodyR * 0.05, y: c - bodyR * 0.30, r: bodyR * 0.30, a: 0.45 },
      { x: c - bodyR * 0.10, y: c + bodyR * 0.32, r: bodyR * 0.35, a: 0.35 },
    ];
    wisps.forEach(w => {
      const grd = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
      grd.addColorStop(0, this._rgba(cfg.light, w.a));
      grd.addColorStop(0.6, this._rgba(cfg.glow, w.a * 0.45));
      grd.addColorStop(1, this._rgba(cfg.glow, 0));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, S, S);
    });
    ctx.restore();

    // 4. Hot energy core — intense white-hot centre with a colored aura
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let core = ctx.createRadialGradient(c, c, 0, c, c, bodyR * 0.62);
    core.addColorStop(0, this._rgba(0xffffff, 0.95));
    core.addColorStop(0.25, this._rgba(cfg.light, 0.7));
    core.addColorStop(0.6, this._rgba(cfg.glow, 0.25));
    core.addColorStop(1, this._rgba(cfg.glow, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c, c, bodyR * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Rim light — thin brighter arc on the lower-right edge (glass sphere)
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.clip();
    let rim = ctx.createRadialGradient(
      c + bodyR * 0.35, c + bodyR * 0.4, bodyR * 0.55,
      c + bodyR * 0.35, c + bodyR * 0.4, bodyR * 1.05,
    );
    rim.addColorStop(0, this._rgba(cfg.glow, 0));
    rim.addColorStop(1, this._rgba(cfg.glow, 0.55));
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();

    // 6. Glassy specular highlight — small bright blob, upper-left
    const sx = c - bodyR * 0.34;
    const sy = c - bodyR * 0.40;
    let spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, bodyR * 0.32);
    spec.addColorStop(0, this._rgba(0xffffff, 0.95));
    spec.addColorStop(0.5, this._rgba(0xffffff, 0.28));
    spec.addColorStop(1, this._rgba(0xffffff, 0));
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(sx, sy, bodyR * 0.32, 0, Math.PI * 2);
    ctx.fill();

    this._addCanvasTexture('orb_' + type, cv);

    // Separate hot-core texture so HexNode can pulse it independently for "life"
    this._makeOrbCore(type, cfg);
  }

  // Independent core glow that HexNode breathes in/out over the orb
  _makeOrbCore(type, cfg) {
    const S = 96;
    const c = S / 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, this._rgba(0xffffff, 0.95));
    g.addColorStop(0.35, this._rgba(cfg.light, 0.6));
    g.addColorStop(0.7, this._rgba(cfg.glow, 0.18));
    g.addColorStop(1, this._rgba(cfg.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    this._addCanvasTexture('orbcore_' + type, cv);
  }

  // ── Soft circular glow (used for nebula clouds, bloom, particles) ───────────
  _makeSoftGlow() {
    const S = 128;
    const c = S / 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    this._addCanvasTexture('glow', cv);
  }

  // ── Four-point sparkle / star flare ─────────────────────────────────────────
  _makeSparkle() {
    const S = 64;
    const c = S / 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    // soft core
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // cross flare
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c, 4); ctx.lineTo(c, S - 4);
    ctx.moveTo(4, c); ctx.lineTo(S - 4, c);
    ctx.stroke();
    this._addCanvasTexture('sparkle', cv);
  }

  _makeStarTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('star_dot', 6, 6);
    g.destroy();
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  _addCanvasTexture(key, canvas) {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  _rgba(n, a) {
    const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
    return `rgba(${r},${g},${b},${a})`;
  }

  _darken(n, f) {
    const r = Math.floor(((n >> 16) & 0xff) * f);
    const g = Math.floor(((n >> 8) & 0xff) * f);
    const b = Math.floor((n & 0xff) * f);
    return (r << 16) | (g << 8) | b;
  }
}
