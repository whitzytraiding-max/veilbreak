// Pentatonic scale — every combination sounds musical, no wrong notes
const NOTE_HZ = {
  FIRE:   329.63, // E4  — warm, urgent
  WATER:  392.00, // G4  — smooth, flowing
  EARTH:  440.00, // A4  — grounded, solid
  AIR:    523.25, // C5  — light, airy
  SHADOW: 587.33, // D5  — mysterious, dark
  LIGHT:  659.25, // E5  — bright, triumphant
};

// Major-pentatonic step ratios from the root — every degree is consonant, so
// climbing them as a chain grows always sounds musical, never "wrong".
const PENTA_RATIOS = [
  1, 9 / 8, 5 / 4, 3 / 2, 5 / 3,        // root octave
  2, 9 / 4, 5 / 2, 3, 10 / 3,           // +1 octave
  4, 9 / 2, 5,                          // +2 octaves (very long chains)
];

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

  // Short filtered-noise burst — gives clears/impacts physical "body" that pure
  // oscillator tones lack. sweepTo bends the lowpass cutoff for a whoosh.
  _noise(vol = 0.2, duration = 0.25, cutoffStart = 1200, cutoffEnd = 300) {
    if (!this._ctx || !this._enabled) return;
    const now = this._ctx.currentTime;
    const len = Math.ceil(this._ctx.sampleRate * duration);
    const buf = this._ctx.createBuffer(1, len, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffStart, now);
    filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + duration);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start(now);
    src.stop(now + duration + 0.01);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  // Each node added to chain plays its note, bent UP a pentatonic degree per
  // step — so dragging a longer chain builds a satisfying rising arpeggio that
  // telegraphs "this is getting big" before the clear even lands.
  playNodeAdd(nodeType, step = 0) {
    this._boot();
    this._resume();
    const base = NOTE_HZ[nodeType] || 440;
    const ratio = PENTA_RATIOS[Math.min(step, PENTA_RATIOS.length - 1)];
    const freq = base * ratio;
    this._tone(freq, 'sine', 0.22, 0.14);
    // faint upper octave sparkle, brighter as the chain climbs
    this._tone(freq * 2, 'triangle', 0.04 + Math.min(step, 8) * 0.012, 0.10, 0.005);
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
    // physical impact body under the chord — bigger whoosh for longer chains
    this._noise(0.10 + Math.min(chainLen, 8) * 0.012, 0.22, 1600, 240);
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
    // Deep sub-boom + bright shimmer wash for the shockwave's physical impact
    this._tone(65.41, 'sine', 0.3, 0.7, 0);
    this._noise(0.16, 0.6, 4000, 200);
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

  // Melodic arpeggio background — look-ahead Web Audio scheduling pattern
  startAmbient(chapterId = 1) {
    this._boot();
    this._resume();
    if (!this._ctx || !this._musicEnabled) return;
    this.stopAmbient();

    // Pentatonic arpeggios: up and back down for a gentle, looping feel
    const sequences = {
      1: [261.63, 329.63, 392.00, 523.25, 392.00, 329.63], // C4 E4 G4 C5 G4 E4
      2: [220.00, 261.63, 329.63, 440.00, 329.63, 261.63], // A3 C4 E4 A4 E4 C4
      3: [392.00, 440.00, 523.25, 659.25, 523.25, 440.00], // G4 A4 C5 E5 C5 A4
    };
    const notes = sequences[chapterId] || sequences[1];

    this._bgGain = this._ctx.createGain();
    this._bgGain.gain.value = 0;
    this._bgGain.connect(this._master);
    this._bgGain.gain.linearRampToValueAtTime(1.0, this._ctx.currentTime + 2);

    const NOTE_DUR  = 0.45; // how long each note rings
    const NOTE_STEP = 0.52; // time between note starts
    const LOOP_GAP  = 1.6;  // silence before the sequence repeats

    let noteIndex = 0;
    let nextNoteTime = this._ctx.currentTime + 0.3;

    const tick = () => {
      if (!this._bgGain) return;
      const ctx = this._ctx;
      if (!ctx) return;

      // Schedule all notes that fall within the next 0.4 s look-ahead window
      while (nextNoteTime < ctx.currentTime + 0.4) {
        if (noteIndex < notes.length) {
          const freq = notes[noteIndex];
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, nextNoteTime);
          gain.gain.linearRampToValueAtTime(0.20, nextNoteTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + NOTE_DUR);
          osc.connect(gain);
          gain.connect(this._bgGain);
          osc.start(nextNoteTime);
          osc.stop(nextNoteTime + NOTE_DUR + 0.05);

          // Bass root on the first note of each sequence
          if (noteIndex === 0) {
            const bass     = ctx.createOscillator();
            const bassGain = ctx.createGain();
            bass.type = 'sine';
            bass.frequency.value = freq / 2;
            bassGain.gain.setValueAtTime(0, nextNoteTime);
            bassGain.gain.linearRampToValueAtTime(0.10, nextNoteTime + 0.04);
            bassGain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + NOTE_DUR * 1.6);
            bass.connect(bassGain);
            bassGain.connect(this._bgGain);
            bass.start(nextNoteTime);
            bass.stop(nextNoteTime + NOTE_DUR * 1.6 + 0.05);
          }

          nextNoteTime += NOTE_STEP;
          noteIndex++;
        } else {
          // End of sequence — pause then loop
          nextNoteTime += LOOP_GAP;
          noteIndex = 0;
        }
      }

      this._bgTimer = setTimeout(tick, 100);
    };

    tick();
  }

  stopAmbient() {
    clearTimeout(this._bgTimer);
    this._bgTimer = null;
    if (!this._bgGain || !this._ctx) return;
    this._bgGain.gain.linearRampToValueAtTime(0, this._ctx.currentTime + 1.5);
    const g = this._bgGain;
    setTimeout(() => { try { g.disconnect(); } catch {} }, 2000);
    this._bgGain = null;
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

  setEnabled(b) { this._enabled = !!b; }
  setMusicEnabled(b) {
    this._musicEnabled = !!b;
    if (!b) this.stopAmbient();
  }
  isEnabled() { return this._enabled; }
  isMusicEnabled() { return this._musicEnabled; }
}

export const AudioManager = new AudioManagerClass();
