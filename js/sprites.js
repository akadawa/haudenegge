/* Hau den Egge - Pixel-Art-Sprites (alles per Code gezeichnet, keine externen Dateien nötig) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /** ASCII-Grafik -> Canvas */
  function fromAscii(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = mk(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ch = rows[j][i];
        const col = pal[ch];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }

  /** 1px dunkle Umrandung (Canvas muss "sauber" sein, also ohne Fotos) */
  function outline(src, color = '#1a1220') {
    const w = src.width + 2, h = src.height + 2;
    const out = mk(w, h), ctx = out.getContext('2d');
    const sctx = src.getContext('2d');
    const data = sctx.getImageData(0, 0, src.width, src.height).data;
    ctx.fillStyle = color;
    const solid = (x, y) => x >= 0 && y >= 0 && x < src.width && y < src.height && data[(y * src.width + x) * 4 + 3] > 10;
    for (let y = -1; y <= src.height; y++) {
      for (let x = -1; x <= src.width; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    ctx.drawImage(src, 1, 1);
    return out;
  }

  /** einfarbige Silhouette (für Treffer-Blitz & Statusfarben) */
  function tint(src, color) {
    const c = mk(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /* ------------------------------------------------------------ Egge */
  const EGGE_PAL = {
    H: '#2b2420', S: '#f0c09a', s: '#d49a76', G: '#15151c', W: '#cfe9ff', E: '#101015',
    M: '#9a3b3b', Y: '#5d6270', y: '#454a57', C: '#727889', P: '#2d3140', B: '#14141a',
  };
  const EGGE_BODY = [
    '....HHHHHH....',
    '...HHHHHHHH...',
    '..HHHHHHHHHH..',
    '..HSSSSSSSSH..',
    '..SGGGGGGGGS..',
    '..SGWEGGWEGS..',
    '..SGWWGGWWGS..',
    '..sSGGSSGGSs..',
    '...SSSMMSSS...',
    '....sSSSSs....',
    '...yCCCCCCy...',
    '..YYYYYYYYYY..',
    '..YYYYYYYYYY..',
    '..yYYYYYYYYy..',
  ];
  const EGGE_LEGS = [
    ['....PPP..PPP..', '....BBB..BBB..'],
    ['...PPP....PPP.', '..BBB......BBB'],
  ];

  const HERO_PAL = {
    H: '#4a3a30', h: '#7a6858', b: '#3a2c24', R: '#ff7a1a', S: '#f0c09a', s: '#d49a76', E: '#101015',
    D: '#5a5048', M: '#b05a5a', Y: '#9a9faa', y: '#767b86', w: '#f4f4f4', P: '#2b3a5c', B: '#e8e8e8',
  };
  const HERO_BODY = [
    '..hHhHHHHhH...',
    '..HHHHHHHHHH..',
    '.hHRRRRRRRRHh.',
    '..HbbSSSSbbH..',
    '..SSESSSSESS..',
    '..SSSSSSSSSS..',
    '..DSSSSSSSSD..',
    '..DDDMMMMDDD..',
    '...DDDDDDDD...',
    '....DDDDDD....',
    '...yYwYYwYy...',
    '..YYYYYYYYYY..',
    '..YYYYYwYYYY..',
    '..yYYYYwYYYy..',
  ];
  const HERO_LEGS = [
    ['....PPP..PPP..', '....BBB..BBB..'],
    ['...PPP....PPP.', '..BBB......BBB'],
  ];

  /* ------------------------------------------------------------ Kiff-Gegenstände (8x8) */
  const ITEMS = {
    joint: { pal: { W: '#f4f0e0', t: '#c9a96a', r: '#ff3b1a', O: '#ffa81a' }, rows: ['.......r', '......rO', '.....WW.', '....WW..', '...WW...', '..WW....', '.tt.....', '........'] },
    bong: { pal: { b: '#8fe0ff', B: '#3fa9d8', w: '#e0f6ff' }, rows: ['...bb...', '...bB...', '...bB...', '..bbBB..', '.bbbBBB.', '.bwbBwB.', '.bbbBBB.', '..BBBB..'] },
    grinder: { pal: { g: '#b4bac6', G: '#6b7080' }, rows: ['..gggg..', '.gGggGg.', 'gggGGggg', 'gGgGGgGg', 'gGgGGgGg', 'gggGGggg', '.gGggGg.', '..gggg..'] },
    lighter: { pal: { y: '#ffe14a', O: '#ff8a1a', R: '#d03030', r: '#ff5a4a', K: '#666a74' }, rows: ['....y...', '...yOy..', '...yOy..', '..RRRR..', '..RrrR..', '..RrrR..', '..RRRR..', '..KKKK..'] },
    papers: { pal: { W: '#f4f0e0', w: '#d8d2b8', G: '#4fc760' }, rows: ['........', '.WWWWWW.', '.WwwwwW.', '.WwGGwW.', '.WwGGwW.', '.WwwwwW.', '.WWWWWW.', '........'] },
    pipe: { pal: { b: '#9a6a34', B: '#3a2410' }, rows: ['.....bbb', '....bBBb', '....bBBb', '...bbbb.', '..bb....', '.bb.....', 'bb......', '........'] },
    vape: { pal: { w: '#e8eef8', k: '#2a2a34', L: '#4fe8ff', m: '#9aa0ac' }, rows: ['..wwww..', '.wwwwww.', '..kkkk..', '..kLLk..', '..kkkk..', '..kkkk..', '..kkkk..', '..mmmm..'] },
    cake: { pal: { b: '#a8693a', g: '#4fc760' }, rows: ['........', '..bbbb..', '.bbgbbb.', 'bbbbbgbb', 'bgbbbbbb', 'bbbgbbgb', '.bbbbbb.', '..bbbb..'] },
    stash: { pal: { g: '#c9a23a', G: '#e8c85a', y: '#fff0b0', L: '#2e9a4a' }, rows: ['........', '.gggggg.', 'gGGGGGGg', 'gGyyyyGg', 'gGyLLyGg', 'gGyyyyGg', 'gGGGGGGg', '.gggggg.'] },
    leaf: { pal: { g: '#4fc760', G: '#2e8a40' }, rows: ['...gg...', '.g.gg.g.', 'gggggggg', '..gggg..', '.gggggg.', '..gGGg..', '...GG...', '...GG...'] },
  };

  /* ------------------------------------------------------------ Aufbau */
  const S = {
    ready: false,
    photoMode: false,
    egge: {},      // variant -> [frame0, frame1]
    hero: [],
    heroBase: null,
    items: {},
    flashCache: new Map(),
    emojiCache: new Map(),
    patternCache: new Map(),
    grassCache: new Map(),
    shadow: null,
    photos: { egge: null, hero: null },
  };

  function buildBody(bodyRows, legs, pal, head) {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const rows = bodyRows.concat(legs[f]);
      let c = fromAscii(rows, pal);
      c = outline(c);
      if (head) {
        const x = c.getContext('2d');
        // Foto-Kopf (gepixelt) über den Pixel-Körper legen
        x.clearRect(0, 0, c.width, 11);
        x.drawImage(head, 2, 0);
        x.fillStyle = pal.Y || '#555';
      }
      frames.push(c);
    }
    return frames;
  }

  function makePhotoHead(img, sx, sy, s, w = 12, h = 11) {
    // Foto auf winzige Auflösung herunterrechnen -> automatisch Pixel-Look
    const c = mk(w + 2, h + 2), x = c.getContext('2d');
    x.fillStyle = '#1a1220';
    x.beginPath(); x.ellipse((w + 2) / 2, (h + 2) / 2, (w + 2) / 2, (h + 2) / 2, 0, 0, Math.PI * 2); x.fill();
    x.save();
    x.beginPath(); x.ellipse((w + 2) / 2, (h + 2) / 2, w / 2, h / 2, 0, 0, Math.PI * 2); x.clip();
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, sx, sy, s, s * (h / w), 1, 1, w, h);
    x.restore();
    return c;
  }

  function recolor(pal, map) { return Object.assign({}, pal, map); }

  S.init = function (photos, usePhotos) {
    S.photos = photos || { egge: null, hero: null };
    S.photoMode = !!(usePhotos && photos && photos.egge && photos.hero && photos.egge.complete && photos.hero.complete && photos.egge.naturalWidth);

    let eggeHead = null, heroHead = null;
    if (S.photoMode) {
      try {
        eggeHead = makePhotoHead(photos.egge, 62, 40, 140);
        heroHead = makePhotoHead(photos.hero, 130, 110, 440);
      } catch (e) { S.photoMode = false; }
    }
    S.egge = {};
    S.egge.normal = buildBody(EGGE_BODY, EGGE_LEGS, EGGE_PAL, eggeHead);
    S.egge.gold = buildBody(EGGE_BODY, EGGE_LEGS, recolor(EGGE_PAL, { Y: '#e8b82a', y: '#b88a1a', C: '#ffe066', P: '#a87a1a' }), eggeHead);
    S.egge.boss = buildBody(EGGE_BODY, EGGE_LEGS, recolor(EGGE_PAL, { Y: '#8a3a3a', y: '#5a2020', C: '#b04a4a', P: '#3a1c1c' }), eggeHead);
    S.hero = buildBody(HERO_BODY, HERO_LEGS, HERO_PAL, heroHead);
    S.heroBase = S.hero[0];

    S.items = {};
    for (const k in ITEMS) S.items[k] = outline(fromAscii(ITEMS[k].rows, ITEMS[k].pal));

    // Schatten
    const sh = mk(32, 12), sx = sh.getContext('2d');
    sx.fillStyle = 'rgba(0,0,0,0.28)';
    sx.beginPath(); sx.ellipse(16, 6, 15, 5, 0, 0, Math.PI * 2); sx.fill();
    S.shadow = sh;

    S.flashCache.clear();
    S.patternCache.clear();
    S.ready = true;
  };

  S.flash = function (canvas, color) {
    let m = S.flashCache.get(color);
    if (!m) { m = new Map(); S.flashCache.set(color, m); }
    let t = m.get(canvas);
    if (!t) { t = tint(canvas, color); m.set(canvas, t); }
    return t;
  };

  /** Emoji als kleines Pixel-Sprite (wird hochskaliert -> Pixel-Look) */
  S.emoji = function (ch, px = 20) {
    const key = ch + px;
    let c = S.emojiCache.get(key);
    if (c) return c;
    c = mk(px, px);
    const x = c.getContext('2d');
    x.font = `${Math.round(px * 0.82)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(ch, px / 2, px / 2 + px * 0.06);
    S.emojiCache.set(key, c);
    return c;
  };

  S.itemDataUrl = function (key) {
    const c = S.items[key];
    return c ? c.toDataURL() : '';
  };

  /* ------------------------------------------------------------ Boden-Muster pro Biom */
  function rnd(seed) { return HDE.util.mulberry32(seed); }

  S.floorPattern = function (ctx, biomeIdx) {
    let p = S.patternCache.get(biomeIdx);
    if (p) return p;
    const B = HDE.data.BIOMES[biomeIdx];
    const N = 128;
    const c = mk(N, N), x = c.getContext('2d');
    const r = rnd(1000 + biomeIdx);
    const T = 64;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        x.fillStyle = (i + j) % 2 ? B.b : B.a;
        x.fillRect(i * T, j * T, T, T);
      }
    }
    x.fillStyle = B.line;
    switch (B.id) {
      case 'jahrmarkt': // Holzplanken
        for (let j = 0; j < 8; j++) { x.fillRect(0, j * 16, N, 2); }
        for (let j = 0; j < 8; j++) { const off = (j % 2) * 40; x.fillRect((off + 30) % N, j * 16, 2, 16); }
        break;
      case 'buero': // Teppich-Fliesen
        x.fillRect(0, 0, N, 2); x.fillRect(0, T, N, 2); x.fillRect(0, 0, 2, N); x.fillRect(T, 0, 2, N);
        break;
      case 'kueche': // Schachbrett-Kacheln
        x.fillRect(0, 0, N, 1); x.fillRect(0, T, N, 1); x.fillRect(0, 0, 1, N); x.fillRect(T, 0, 1, N);
        break;
      case 'schwimmbad': // Fliesen mit Wellen
        for (let j = 0; j < 8; j++) x.fillRect(0, j * 16, N, 1);
        for (let i = 0; i < 8; i++) x.fillRect(i * 16, 0, 1, N);
        break;
      case 'weltraum':
        for (let k = 0; k < 40; k++) {
          x.fillStyle = r() < 0.2 ? '#ffffff' : '#8a8ad8';
          x.fillRect(Math.floor(r() * N), Math.floor(r() * N), r() < 0.15 ? 2 : 1, r() < 0.15 ? 2 : 1);
        }
        break;
      case 'hoelle':
        for (let k = 0; k < 6; k++) {
          let px = r() * N, py = r() * N;
          x.fillStyle = r() < 0.5 ? '#ff6a2a' : '#c0391a';
          for (let s = 0; s < 8; s++) { x.fillRect(Math.floor(px), Math.floor(py), 2, 2); px += r() * 6 - 3; py += r() * 6 - 1; }
        }
        break;
    }
    // Körnung
    for (let k = 0; k < 90; k++) {
      x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
      x.fillRect(Math.floor(r() * N), Math.floor(r() * N), 2, 2);
    }
    p = ctx.createPattern(c, 'repeat');
    S.patternCache.set(biomeIdx, p);
    return p;
  };

  /* ------------------------------------------------------------ Grasfleck (4 Welt-Einheiten pro Pixel) */
  S.grass = function (patch) {
    const key = patch.v + '_' + Math.round(patch.r);
    let c = S.grassCache.get(key);
    if (c) return c;
    const PX = 4;
    const n = Math.ceil((patch.r * 2) / PX);
    c = mk(n, n);
    const x = c.getContext('2d');
    const r = rnd(patch.v * 977 + Math.round(patch.r));
    const cx = n / 2, cy = n / 2;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const dx = i - cx + 0.5, dy = (j - cy + 0.5) * 1.15;
        const d = Math.sqrt(dx * dx + dy * dy) / (n / 2);
        const edge = 0.82 + r() * 0.18;
        if (d < edge) {
          const t = r();
          x.fillStyle = t < 0.55 ? '#3f9a3c' : t < 0.85 ? '#4fb34a' : '#2f7d33';
          x.fillRect(i, j, 1, 1);
        }
      }
    }
    // Halme
    for (let k = 0; k < n * 0.9; k++) {
      const i = Math.floor(r() * n), j = Math.floor(r() * n);
      const dx = i - cx, dy = j - cy;
      if (Math.sqrt(dx * dx + dy * dy) < n * 0.4) {
        x.fillStyle = '#8be07a'; x.fillRect(i, j, 1, 1);
        x.fillStyle = '#8be07a'; x.fillRect(i, j - 1, 1, 1);
      }
    }
    S.grassCache.set(key, c);
    return c;
  };

  S.EGGE_W = 14; S.EGGE_H = 17;
  HDE.Sprites = S;
})();
