/* Hau den Egge - Web Audio API Sound-Effekte und Chiptune-Musik (100% autark) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let isMuted = false;
  let musicTimer = null;
  let musicStep = 0;

  function initAudio() {
    if (ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.6;
      sfxGain.connect(masterGain);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.22;
      musicGain.connect(masterGain);
    } catch (e) {
      console.warn('AudioContext nicht verfügbar:', e);
    }
  }

  function resumeAudio() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  /* Sound-Effekt-Generatoren per Oszillator & Noise */
  const SFX = {
    hit: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.09);
    },

    whip: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      // Quietsch / Peitsche
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.14);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);
    },

    throw: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.12);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.13);
    },

    boom: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
    },

    levelup: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C5 E5 G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        g.gain.setValueAtTime(0.18, t + idx * 0.05);
        g.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.18);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.19);
      });
    },

    chest: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const notes = [392.00, 493.88, 587.33, 783.99, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        g.gain.setValueAtTime(0.25, t + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.06 + 0.22);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.23);
      });
    },

    gem: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.05);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.06);
    },

    shell: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987, t);
      osc.frequency.exponentialRampToValueAtTime(1318, t + 0.06);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    },

    heal: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.16);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.17);
    },

    hurt: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.13);
    },

    revive: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      [220, 277.18, 329.63, 440, 554.37].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.04);
        g.gain.setValueAtTime(0.3, t + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(t + i * 0.04);
        osc.stop(t + 0.65);
      });
    },

    boss: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.linearRampToValueAtTime(110, t + 0.25);
      osc.frequency.linearRampToValueAtTime(55, t + 0.55);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.65);
    },

    bossdead: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.7);
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.75);
    },

    bubble: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(820, t + 0.07);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    },

    mower: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    },

    shock: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.31);
    },

    shoot: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(290, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.09);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.1);
    },

    die: () => {
      if (!ctx || !sfxGain) return;
      const t = ctx.currentTime;
      const notes = [220, 207.65, 196, 185];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.15);
        g.gain.setValueAtTime(0.35, t + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.25);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.26);
      });
    },
  };

  /* Retro Chiptune Loop (Synthetisiert) */
  const BASS_LINE = [
    110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83,
    98, 98, 123.47, 130.81, 98, 98, 146.83, 130.81,
    87.31, 87.31, 110, 123.47, 87.31, 87.31, 130.81, 110,
    110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98
  ];
  const LEAD_LINE = [
    440, 0, 523.25, 0, 587.33, 659.25, 587.33, 523.25,
    392, 0, 440, 0, 493.88, 523.25, 493.88, 392,
    349.23, 0, 392, 0, 440, 523.25, 440, 349.23,
    440, 0, 523.25, 587.33, 659.25, 0, 587.33, 440
  ];

  function playMusicStep() {
    if (!ctx || !musicGain || isMuted) return;
    const t = ctx.currentTime;
    const bassFreq = BASS_LINE[musicStep % BASS_LINE.length];
    const leadFreq = LEAD_LINE[musicStep % LEAD_LINE.length];
    musicStep++;

    if (bassFreq > 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    if (leadFreq > 0 && Math.random() < 0.85) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(leadFreq, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.13);
    }
  }

  function startMusic() {
    if (musicTimer) return;
    initAudio();
    musicTimer = setInterval(playMusicStep, 150); // ~100 BPM 16th-groove
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  const Audio = {
    init: initAudio,
    resume: resumeAudio,
    play(name) {
      initAudio();
      resumeAudio();
      if (isMuted) return;
      if (SFX[name]) SFX[name]();
    },
    startMusic,
    stopMusic,
    setMuted(m) {
      isMuted = !!m;
      if (masterGain) masterGain.gain.value = isMuted ? 0 : 0.5;
    },
    setMusic(enabled) {
      if (musicGain) musicGain.gain.value = enabled ? 0.22 : 0;
    },
    setVolume(vol) {
      if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, vol)) * 0.7;
    }
  };

  HDE.Audio = Audio;
})();
