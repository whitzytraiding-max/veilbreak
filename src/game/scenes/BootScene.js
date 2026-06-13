import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, NODE_CONFIG, NODE_TYPES } from '../constants.js';
import { Settings } from '../managers/SettingsManager.js';

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
    Settings.apply();
    this.scene.start('Menu');
  }

  // ── Magic energy orb — high-res radial-gradient plasma sphere ───────────────
  // Rendered large (S px) and displayed small, so it stays crisp and the
  // gradients read as a glowing glass orb rather than flat vector circles.
  // A glossy glass orb filled with mysterious dark "magic liquid" and a few
  // suspended sparkles — you can't quite see what's inside.
  _makeOrbTexture(type) {
    const cfg = NODE_CONFIG[type];
    const S = 192;
    const c = S / 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');

    const bodyR = S * 0.40;
    const haloR = S * 0.50;
    const dark = this._darken(cfg.base, 0.35);   // deep, murky liquid
    const deep = this._darken(cfg.base, 0.6);

    // 1. Subtle outer glow (liquid quietly luminous, not blazing)
    let halo = ctx.createRadialGradient(c, c, bodyR * 0.75, c, c, haloR);
    halo.addColorStop(0, this._rgba(cfg.glow, 0.35));
    halo.addColorStop(1, this._rgba(cfg.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);

    // 2. Liquid body — light is absorbed toward the centre, so it reads as
    //    deep/unknowable; the rim stays a touch brighter where glass catches light.
    let body = ctx.createRadialGradient(c, c, bodyR * 0.08, c, c, bodyR);
    body.addColorStop(0, this._rgba(dark, 1));
    body.addColorStop(0.55, this._rgba(deep, 1));
    body.addColorStop(0.85, this._rgba(cfg.base, 1));
    body.addColorStop(1, this._rgba(cfg.mid, 1));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.fill();

    // Everything below is clipped to the glass sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.clip();

    // 3. Light penetrating the top of the liquid (soft, where the surface glows)
    let topLight = ctx.createRadialGradient(
      c, c - bodyR * 0.55, 0, c, c - bodyR * 0.45, bodyR * 0.95);
    topLight.addColorStop(0, this._rgba(cfg.light, 0.5));
    topLight.addColorStop(0.5, this._rgba(cfg.glow, 0.14));
    topLight.addColorStop(1, this._rgba(cfg.glow, 0));
    ctx.fillStyle = topLight;
    ctx.fillRect(0, 0, S, S);

    // 4. Slow liquid swirls — translucent darker + lighter curls suggesting motion
    ctx.lineCap = 'round';
    ctx.strokeStyle = this._rgba(deep, 0.55);
    ctx.lineWidth = bodyR * 0.16;
    ctx.beginPath();
    ctx.arc(c - bodyR * 0.1, c + bodyR * 0.15, bodyR * 0.5, 0.6, 2.7);
    ctx.stroke();
    ctx.strokeStyle = this._rgba(cfg.mid, 0.35);
    ctx.lineWidth = bodyR * 0.1;
    ctx.beginPath();
    ctx.arc(c + bodyR * 0.12, c - bodyR * 0.05, bodyR * 0.42, 3.2, 5.2);
    ctx.stroke();

    // 5. Suspended sparkles drifting in the liquid
    const sparks = [
      { x: -0.18, y: 0.20, r: 0.05 }, { x: 0.22, y: 0.32, r: 0.035 },
      { x: 0.10, y: -0.10, r: 0.045 }, { x: -0.28, y: -0.05, r: 0.03 },
      { x: 0.30, y: -0.22, r: 0.038 },
    ];
    ctx.globalCompositeOperation = 'lighter';
    sparks.forEach(s => {
      const x = c + s.x * bodyR, y = c + s.y * bodyR, r = s.r * S;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, this._rgba(cfg.light, 0.5));
      g.addColorStop(1, this._rgba(cfg.light, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore(); // end clip

    // 6. Glass rim — thin bright catch-light around the upper edge
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, bodyR, 0, Math.PI * 2);
    ctx.clip();
    let rim = ctx.createRadialGradient(c, c, bodyR * 0.82, c, c, bodyR);
    rim.addColorStop(0, this._rgba(cfg.light, 0));
    rim.addColorStop(0.7, this._rgba(cfg.light, 0.05));
    rim.addColorStop(1, this._rgba(cfg.light, 0.45));
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();

    // 7. Big glossy specular highlight, upper-left (the "wet glass" sheen)
    const sx = c - bodyR * 0.30, sy = c - bodyR * 0.40;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(sx, sy, bodyR * 0.34, bodyR * 0.22, -0.6, 0, Math.PI * 2);
    let spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, bodyR * 0.34);
    spec.addColorStop(0, 'rgba(255,255,255,0.95)');
    spec.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fill();
    // tiny secondary highlight
    ctx.beginPath();
    ctx.arc(c + bodyR * 0.28, c + bodyR * 0.30, bodyR * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.restore();

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
