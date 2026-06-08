// Pentatonic scale — every combination sounds musical, no wrong notes
const NOTE_HZ = {
  FIRE:   329.63, // E4  — warm, urgent
  WATER:  392.00, // G4  — smooth, flowing
  EARTH:  440.00, // A4  — grounded, solid
  AIR:    523.25, // C5  — light, airy
  SHADOW: 587.33, // D5  — mysterious, dark
  LIGHT:  659.25, // E5  — bright, triumphant
};

class AudioManagerClass {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._enabled = true;
    this._musicEnabled = true;
    this._bgNode = null;
  }

  _boot() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.5;
      this._master.connect(this._ctx.destination);
    } catch {}
  }

  _resume() {
    if (!this._ctx) return;
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  _playSilentBuffer() {
    // iOS WKWebView requires a real buffer to be played in the gesture
    // call stack to truly unlock Web Audio — resume() alone is not enough
    if (!this._ctx) return;
    try {
      const buf = this._ctx.createBuffer(1, 1, this._ctx.sampleRate);
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this._ctx.destination);
      src.start(0);
    } catch {}
  }

  _tone(freq, type = 'sine', vol = 0.28, duration = 0.18, startOffset = 0) {
    if (!this._ctx || !this._enabled) return;
    const now = this._ctx.currentTime + startOffset;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  // Each node added to chain plays its note — builds a melody as you drag
  playNodeAdd(nodeType) {
    this._boot();
    this._resume();
    const freq = NOTE_HZ[nodeType] || 440;
    this._tone(freq, 'sine', 0.22, 0.14);
  }

  // Chain burst — short chord on the node type's root note
  playChainClear(nodeType, chainLen) {
    this._boot();
    this._resume();
    if (!this._ctx || !this._enabled) return;
    const root = NOTE_HZ[nodeType] || 440;
    // Root + perfect fifth + octave, louder for longer chains
    const vol = Math.min(0.35, 0.18 + chainLen * 0.02);
    this._tone(root,         'sine', vol,       0.35, 0);
    this._tone(root * 1.498, 'sine', vol * 0.6, 0.30, 0.02);
    this._tone(root * 2,     'sine', vol * 0.4, 0.25, 0.04);
  }

  // Convergence — rising arpeggio then big chord swell
  playConvergence() {
    this._boot();
    this._resume();
    if (!this._ctx || !this._enabled) return;
    const freqs = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => this._tone(f, 'sine', 0.28, 0.55, i * 0.07));
    // Big pad chord at end
    [523.25, 659.25, 783.99].forEach((f, i) =>
      this._tone(f, 'triangle', 0.2, 0.9, freqs.length * 0.07 + i * 0.02)
    );
  }

  // Veil spread — low ominous pulse
  playVeilSpread() {
    this._boot();
    this._resume();
    if (!this._ctx || !this._enabled) return;
    this._tone(55,  'sawtooth', 0.18, 0.5, 0);
    this._tone(82.4,'sawtooth', 0.10, 0.4, 0.05);
  }

  // Veil cleared by a chain — light shimmery flash
  playVeilClear() {
    this._boot();
    this._resume();
    this._tone(1046.5, 'sine', 0.15, 0.2, 0);
    this._tone(1318.5, 'sine', 0.10, 0.15, 0.05);
  }

  // Level complete — ascending happy fanfare
  playWin() {
    this._boot();
    this._resume();
    if (!this._ctx || !this._enabled) return;
    const melody = [523.25, 659.25, 783.99, 1046.5];
    melody.forEach((f, i) => this._tone(f, 'triangle', 0.3, 0.45, i * 0.17));
    // Harmony
    const harmony = [392, 523.25, 659.25, 783.99];
    harmony.forEach((f, i) => this._tone(f, 'sine', 0.15, 0.4, i * 0.17 + 0.04));
  }

  // Level failed — descending sad progression
  playFail() {
    this._boot();
    this._resume();
    if (!this._ctx || !this._enabled) return;
    const melody = [392, 349.23, 329.63, 261.63];
    melody.forEach((f, i) => this._tone(f, 'triangle', 0.22, 0.4, i * 0.2));
  }

  // Booster activated — whoosh upward
  playBooster() {
    this._boot();
    this._resume();
    if (!this._ctx || !this._enabled) return;
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const now = this._ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // UI button tap
  playTap() {
    this._boot();
    this._resume();
    this._tone(880, 'sine', 0.12, 0.08);
  }

  // Ambient drone background (chapter-specific mood)
  startAmbient(chapterId = 1) {
    this._boot();
    this._resume();
    if (!this._ctx || !this._musicEnabled) return;
    this.stopAmbient();

    const baseFreqs = {
      1: [55, 82.4, 110],   // Chapter 1 — ocean, low and open
      2: [41.2, 55, 73.4],  // Chapter 2 — deep fire, darker
      3: [65.4, 87.3, 130], // Chapter 3 — forest, mid warm
    };
    const freqs = baseFreqs[chapterId] || baseFreqs[1];

    this._bgGain = this._ctx.createGain();
    this._bgGain.gain.value = 0;
    this._bgGain.connect(this._master);

    this._bgOscs = freqs.map((f, i) => {
      const osc = this._ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      // Slow detune drift for a living, breathing quality
      osc.detune.value = (i - 1) * 8;
      osc.connect(this._bgGain);
      osc.start();
      return osc;
    });

    // Fade in gently
    this._bgGain.gain.linearRampToValueAtTime(0.08, this._ctx.currentTime + 3);
  }

  stopAmbient() {
    if (!this._bgGain || !this._ctx) return;
    this._bgGain.gain.linearRampToValueAtTime(0, this._ctx.currentTime + 1.5);
    const g = this._bgGain;
    const oscs = this._bgOscs || [];
    setTimeout(() => {
      try { oscs.forEach(o => o.stop()); g.disconnect(); } catch {}
    }, 2000);
    this._bgGain = null;
    this._bgOscs = [];
  }

  // Called synchronously in the first touchstart in App.jsx.
  // Creates context, resumes it, AND plays a silent buffer — all three steps
  // are required for iOS WKWebView to fully unlock Web Audio.
  unlock() {
    this._boot();
    this._resume();
    this._playSilentBuffer();

    // Re-resume whenever the app returns from background
    if (!this._visibilityBound) {
      this._visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this._resume();
      });
    }
  }

  toggleSound() { this._enabled = !this._enabled; return this._enabled; }
  toggleMusic() {
    this._musicEnabled = !this._musicEnabled;
    if (!this._musicEnabled) this.stopAmbient();
    return this._musicEnabled;
  }
}

export const AudioManager = new AudioManagerClass();
