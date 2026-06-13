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
    halo.addColorStop(0, this._rgba(cfg.glow, 0.55));
    halo.addColorStop(0.5, this._rgba(cfg.glow, 0.20));
    halo.addColorStop(1, this._rgba(cfg.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);

    // 2. Sphere body — bright hot core → mid → darker rim for 3D depth.
    //    Light source is upper-left, so the gradient centre is offset up-left.
    const bx = c - bodyR * 0.18;
    const by = c - bodyR * 0.20;
    let body = ctx.createRadialGradient(bx, by, bodyR * 0.05, c, c, bodyR);
    body.addColorStop(0, this._rgba(cfg.light, 1));
    body.addColorStop(0.35, this._rgba(cfg.mid, 1));
    body.addColorStop(0.78, this._rgba(cfg.base, 1));
    body.addColorStop(1, this._rgba(this._darken(cfg.base, 0.55), 1));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Inner energy core — a hot bloom pulsing at the centre
    let core = ctx.createRadialGradient(c, c, 0, c, c, bodyR * 0.55);
    core.addColorStop(0, this._rgba(0xffffff, 0.75));
    core.addColorStop(0.4, this._rgba(cfg.light, 0.45));
    core.addColorStop(1, this._rgba(cfg.light, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c, c, bodyR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rim light — thin brighter arc on the lower-right edge (glass sphere)
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.clip();
    let rim = ctx.createRadialGradient(
      c + bodyR * 0.35, c + bodyR * 0.4, bodyR * 0.55,
      c + bodyR * 0.35, c + bodyR * 0.4, bodyR * 1.05,
    );
    rim.addColorStop(0, this._rgba(cfg.glow, 0));
    rim.addColorStop(1, this._rgba(cfg.glow, 0.5));
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();

    // 5. Glassy specular highlight — small bright blob, upper-left
    const sx = c - bodyR * 0.34;
    const sy = c - bodyR * 0.40;
    let spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, bodyR * 0.34);
    spec.addColorStop(0, this._rgba(0xffffff, 0.95));
    spec.addColorStop(0.5, this._rgba(0xffffff, 0.30));
    spec.addColorStop(1, this._rgba(0xffffff, 0));
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(sx, sy, bodyR * 0.34, 0, Math.PI * 2);
    ctx.fill();

    this._addCanvasTexture('orb_' + type, cv);
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
