/* Hau den Egge - Hilfsfunktionen (RNG, Mathe, Formatierung) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) {
      this.seed = seed == null ? (Math.random() * 4294967296) >>> 0 : seed >>> 0;
      this._f = mulberry32(this.seed);
    }
    next() { return this._f(); }
    range(a, b) { return a + (b - a) * this._f(); }
    int(a, b) { return Math.floor(a + (b - a + 1) * this._f()); }
    chance(p) { return this._f() < p; }
    pick(arr) { return arr[Math.floor(this._f() * arr.length)]; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this._f() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  }

  /** Deterministischer Hash (x,y,seed) -> [0,1) */
  function hash2(x, y, seed) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtNum(n) {
    n = Math.floor(n);
    if (n < 10000) return String(n);
    const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    let i = 0, v = n;
    while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + u[i];
  }

  HDE.util = { RNG, mulberry32, hash2, clamp, lerp, fmtTime, fmtNum };
})();
