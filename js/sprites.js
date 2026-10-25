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

  /* ------------------------------------------------------------ Egge (Pixel-Art Karikatur) */
  const EGGE_PAL = {
    H: '#201b22', h: '#3a323d', S: '#f7cbb0', s: '#dea382', r: '#e88778',
    G: '#12131a', W: '#ffffff', C: '#a6e2ff', E: '#181a24', M: '#c05050',
    Y: '#484e5c', y: '#343842', L: '#616a7d', K: '#727c91',
    P: '#262933', p: '#1c1e26', B: '#101116', '.': null
  };
  const EGGE_BODY = [
    '......hhhhhh........',
    '....hhHHHHHHHH......',
    '...hhHHHHHHHHHH.....',
    '..hHHHHHHHHHHHHH....',
    '..hHHSSSSSSSSSHH....',
    '..HHSSSSSSSSSSSH....',
    '..GGGGGG..GGGGGG....',
    '..GWCECG..GWCECG....',
    '..GWWECG..GWWECG....',
    '..GGGGGG..GGGGGG....',
    '..sSSSSSSSSSSSSs....',
    '...sSSrSSSSrSSs.....',
    '...sSSSSMMSSSSs.....',
    '....sSSSSSSSSs......',
    '....KKKKKKKKKK......',
    '...yLYYYYYYYYYy.....',
    '..yLYYYYYYYYYYYy....',
    '..yYYYYYYYYYYYYy....',
    '..yLLYYYYYYYYLLy....',
    '...yYYYYYYYYYYy.....',
  ];
  const EGGE_LEGS = [
    [
      '....PPPP....PPPP....',
      '....PPPP....PPPP....',
      '....pppp....pppp....',
      '....BBBB....BBBB....',
    ],
    [
      '...PPPP......PPPP...',
      '...PPPP......PPPP...',
      '...pppp......pppp...',
      '..BBBB........BBBB..',
    ],
  ];

  /* ------------------------------------------------------------ Mega-Boss Egge */
  const BOSS_PAL = {
    H: '#18141a', h: '#2d2530', S: '#f0be9e', s: '#c98a65',
    G: '#0a0a0f', R: '#ff2030', r: '#ff8090', W: '#ffffff', D: '#2b0a0a',
    Y: '#3a404c', y: '#262a33', L: '#525a6b', K: '#606a7e',
    P: '#1e2129', p: '#14161c', B: '#0c0d12', '.': null
  };
  const BOSS_BODY = [
    '.........hhhhHHHHHHHHhhhh.........',
    '.......hhHHHHHHHHHHHHHHHHhh.......',
    '......hHHHHHHHHHHHHHHHHHHHHh......',
    '.....hHHHHHHHHHHHHHHHHHHHHHHh.....',
    '.....hHHSSSSSSSSSSSSSSSSSSHHh.....',
    '....hHHSSSSSSSSSSSSSSSSSSSSHHh....',
    '....GGGGGGGGGGGG....GGGGGGGGGGGG..',
    '....GGWWrrRRWWGG....GGWWrrRRWWGG..',
    '....GGWWrrRRWWGG....GGWWrrRRWWGG..',
    '....GGGGGGGGGGGG....GGGGGGGGGGGG..',
    '....sSSSSSSSSSSSS..SSSSSSSSSSSSs..',
    '.....sSSSSSSSSSSSSSSSSSSSSSSSSs...',
    '.....sSSSsDWDWDWDWDWDWDsSSSSs.....',
    '......sSSsWDWDWDWDWDWDWsSSs.......',
    '.......sSSSSSSSSSSSSSSSSs.........',
    '.......sSSSSsKKKKKKsSSSSs.........',
    '..yyyy..sSSsKKKKKKKKsSSs..yyyy....',
    '.yLYYYy..ssKKKKKKKKKKss..yYYYLy...',
    'yLYYYYYyyyyyyyyyyyyyyyyyyyYYYYLy..',
    'yLYYYYYYYYYYYYYYYYYYYYYYYYYYYYLy..',
    'yYYYYLLYYYYYYLLLLYYYYYYLLYYYYYYy..',
    'yYYYYLLYYYYYYLLLLYYYYYYLLYYYYYYy..',
    '.yYYYYYYYYYYYYYYYYYYYYYYYYYYYYy...',
    '.yYYYYLLYYYYYYYYYYYYYYYYLLYYYYy...',
    '..sssssYYYYYYYYYYYYYYYYYYsssss....',
    '..sSSSsYYYYYYYYYYYYYYYYYYsSSSs....',
    '..sSSSsYYYYYYYYYYYYYYYYYYsSSSs....',
    '...sss..yyyyyyyyyyyyyyyy..sss.....',
  ];
  const BOSS_LEGS = [
    [
      '.......PPPPPPPP....PPPPPPPP.......',
      '.......PPPPPPPP....PPPPPPPP.......',
      '.......pppppppp....pppppppp.......',
      '.......BBBBBBBB....BBBBBBBB.......',
      '.......BBBBBBBB....BBBBBBBB.......',
    ],
    [
      '......PPPPPPPP......PPPPPPPP......',
      '......PPPPPPPP......PPPPPPPP......',
      '......pppppppp......pppppppp......',
      '.....BBBBBBBB........BBBBBBBB.....',
      '.....BBBBBBBB........BBBBBBBB.....',
    ],
  ];

  /* ------------------------------------------------------------ Held "Kämpfer" */
  const HERO_PAL = {
    H: '#382a20', h: '#4f3d32', G: '#9ca2ad', g: '#c4cad6', b: '#30241c',
    S: '#f5c6a5', s: '#d99f7d', r: '#e58578', E: '#121216', W: '#ffffff',
    Y: '#888e99', y: '#6d737e', L: '#a6acb8', Z: '#d2d6de',
    P: '#2b3a5c', p: '#1d2740', B: '#f0f0f0', O: '#b02020', K: '#18181e',
    '.': null
  };
  const HERO_BODY = [
    '.....hHHHHHHHHh.......',
    '....hHHHHgGGHHhH......',
    '....HHHHGggggGHHH.....',
    '...hHHHHGgGgGGHHH.....',
    '..HhSSSSSSSSSSSSHH....',
    '..GSSSSSSSSSSSSSSG....',
    '..GSSWEESS..SSWEESG...',
    '..HSSWEESS..SSWEESH...',
    '..hSSSSSSSSSSSSSSG....',
    '...sSSsrrr..rrrSss....',
    '...sbbSSSSSSSSbbs.....',
    '....bbbbbbbbbbbb......',
    '....bbbssssssbbb......',
    '....yLYYYYYYYYYy......',
    '...yLYYYZZZZYYYy......',
    '..yLYYYZYYYYZYYYy.....',
    '..yYYYYZYYYYZYYYYy....',
    '..yYYYYZYYYYZYYYYy....',
    '..yLLYYZYYYYZYYLLy....',
    '...yYYYYYYYYYYYYy.....',
  ];
  const HERO_LEGS = [
    [
      '....PPPP....PPPP......',
      '....PPPP....PPPP......',
      '....pppp....pppp......',
      '....BOOB....BOOB......',
      '....KKKK....KKKK......',
    ],
    [
      '...PPPP......PPPP.....',
      '...PPPP......PPPP.....',
      '...pppp......pppp.....',
      '..BOOB........BOOB....',
      '..KKKK........KKKK....',
    ],
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
    boss: [],      // Dedizierter Mega-Boss Sprite
    hero: [],
    heroBase: null,
    items: {},
    gems: null,
    flashCache: new Map(),
    emojiCache: new Map(),
    patternCache: new Map(),
    grassCache: new Map(),
    shadow: null,
    photos: { egge: null, hero: null },
  };

  function buildGems() {
    function makeGem(pal) {
      const w = 14, h = 16;
      const c = mk(w, h), x = c.getContext('2d');
      // Silhouette
      x.fillStyle = pal.outline || '#0e111a';
      x.beginPath();
      x.moveTo(7, 0); x.lineTo(13, 4); x.lineTo(13, 11); x.lineTo(7, 15); x.lineTo(1, 11); x.lineTo(1, 4);
      x.closePath(); x.fill();
      // Untere dunkle Facetten
      x.fillStyle = pal.dark;
      x.beginPath(); x.moveTo(7, 14); x.lineTo(12, 10); x.lineTo(7, 8); x.closePath(); x.fill();
      x.fillStyle = pal.shadow;
      x.beginPath(); x.moveTo(7, 14); x.lineTo(2, 10); x.lineTo(7, 8); x.closePath(); x.fill();
      // Mittlere Facetten
      x.fillStyle = pal.mid;
      x.beginPath(); x.moveTo(2, 10); x.lineTo(2, 5); x.lineTo(7, 8); x.closePath(); x.fill();
      x.fillStyle = pal.light;
      x.beginPath(); x.moveTo(12, 10); x.lineTo(12, 5); x.lineTo(7, 8); x.closePath(); x.fill();
      // Obere Facetten
      x.fillStyle = pal.mid;
      x.beginPath(); x.moveTo(7, 1); x.lineTo(2, 5); x.lineTo(7, 8); x.closePath(); x.fill();
      x.fillStyle = pal.light;
      x.beginPath(); x.moveTo(7, 1); x.lineTo(12, 5); x.lineTo(7, 8); x.closePath(); x.fill();
      // Glanzpunkt
      x.fillStyle = pal.highlight;
      x.fillRect(6, 4, 2, 2);
      x.fillRect(5, 5, 4, 1);
      return { sprite: c, glow: pal.glow };
    }
    return {
      green: makeGem({
        outline: '#062010', shadow: '#007a38', dark: '#009947', mid: '#00c853',
        light: '#69f0ae', highlight: '#ffffff', glow: 'rgba(0, 230, 118, 0.45)'
      }),
      blue: makeGem({
        outline: '#06162a', shadow: '#0059b3', dark: '#007acc', mid: '#00b0ff',
        light: '#80d8ff', highlight: '#ffffff', glow: 'rgba(0, 176, 255, 0.45)'
      }),
      gold: makeGem({
        outline: '#261a04', shadow: '#b37d00', dark: '#d49b00', mid: '#ffd600',
        light: '#ffff8d', highlight: '#ffffff', glow: 'rgba(255, 214, 0, 0.45)'
      }),
      purple: makeGem({
        outline: '#20042a', shadow: '#8000aa', dark: '#aa00e6', mid: '#d500f9',
        light: '#f599ff', highlight: '#ffffff', glow: 'rgba(213, 0, 249, 0.45)'
      })
    };
  }

  function buildBody(bodyRows, legs, pal, head) {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const rows = bodyRows.concat(legs[f]);
      let c = fromAscii(rows, pal);
      c = outline(c);
      if (head) {
        const x = c.getContext('2d');
        // Foto-Kopf (gepixelt) mittig über den Pixel-Körper legen
        x.clearRect(0, 0, c.width, 13);
        const ox = Math.max(0, Math.floor((c.width - head.width) / 2));
        x.drawImage(head, ox, 0);
        x.fillStyle = pal.Y || '#555';
      }
      frames.push(c);
    }
    return frames;
  }

  function makePhotoHead(img, sx, sy, s, w = 14, h = 13) {
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
    S.egge.gold = buildBody(EGGE_BODY, EGGE_LEGS, recolor(EGGE_PAL, { Y: '#e8b82a', y: '#b88a1a', L: '#ffe066', K: '#fff0a0', P: '#a87a1a' }), eggeHead);
    // Dedizierter Mega-Boss mit breiten Schultern, bösem Blick & Zähnefletschen
    S.boss = buildBody(BOSS_BODY, BOSS_LEGS, BOSS_PAL, eggeHead);
    S.egge.boss = S.boss;

    S.hero = buildBody(HERO_BODY, HERO_LEGS, HERO_PAL, heroHead);
    S.heroBase = S.hero[0];

    S.items = {};
    for (const k in ITEMS) S.items[k] = outline(fromAscii(ITEMS[k].rows, ITEMS[k].pal));

    // Facettierte XP-Gems
    S.gems = buildGems();

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
    const N = B.id === 'jahrmarkt' ? 256 : 128;
    const c = mk(N, N), x = c.getContext('2d');
    const r = rnd(1000 + biomeIdx);
    const T = N / 2;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        x.fillStyle = (i + j) % 2 ? B.b : B.a;
        x.fillRect(i * T, j * T, T, T);
      }
    }
    x.fillStyle = B.line;
    switch (B.id) {
      case 'jahrmarkt': { // Detailreiche Jahrmarkt-Holzplanken mit Holzmaserung, Nägeln & Konfetti
        const plankH = 32;
        const plankColors = [
          '#a56f3a', '#8e5927', '#b57c44', '#99632f',
          '#a9733e', '#8a5524', '#b67e46', '#945e2a'
        ];
        // 8 Planken zeichnen
        for (let j = 0; j < 8; j++) {
          const py = j * plankH;
          x.fillStyle = plankColors[j % plankColors.length];
          x.fillRect(0, py, N, plankH);

          // Subtile Holzmaserung (horizontale feine Linien)
          const grainRng = rnd(4000 + j * 73);
          for (let g = 0; g < 4; g++) {
            const gy = py + Math.floor(grainRng() * (plankH - 4)) + 2;
            x.fillStyle = grainRng() < 0.5 ? 'rgba(70, 35, 10, 0.12)' : 'rgba(255, 210, 130, 0.08)';
            x.fillRect(0, gy, N, 1);
          }

          // Horizontale Fuge zwischen Planken (Schatten + Glanzkante für Bevel-Tiefe)
          x.fillStyle = 'rgba(255, 220, 150, 0.22)';
          x.fillRect(0, py, N, 1);
          x.fillStyle = '#2d1607';
          x.fillRect(0, py + plankH - 2, N, 2);

          // Versetzte vertikale Fugen mit Nägeln
          const seamX = Math.floor(((j * 89) % (N - 30)) + 15);
          x.fillStyle = '#241105';
          x.fillRect(seamX, py, 2, plankH);
          // 2 Nägel links/rechts der Fuge
          x.fillStyle = '#180c04';
          x.fillRect(seamX - 4, py + 5, 2, 2);
          x.fillRect(seamX + 4, py + 5, 2, 2);
          x.fillRect(seamX - 4, py + plankH - 7, 2, 2);
          x.fillRect(seamX + 4, py + plankH - 7, 2, 2);
          x.fillStyle = '#6e4522';
          x.fillRect(seamX - 4, py + 5, 1, 1);
          x.fillRect(seamX + 4, py + 5, 1, 1);
        }

        // Buntes Jahrmarkt-Konfetti auf den Dielen verstreut
        const confettiColors = ['#ff2a5f', '#00e5ff', '#ffd200', '#b54aff', '#20df65', '#ffffff'];
        const confRng = rnd(8888);
        for (let k = 0; k < 75; k++) {
          const cx = Math.floor(confRng() * N);
          const cy = Math.floor(confRng() * N);
          const col = confettiColors[Math.floor(confRng() * confettiColors.length)];
          const shape = Math.floor(confRng() * 3);
          x.fillStyle = col;
          if (shape === 0) x.fillRect(cx, cy, 2, 2);
          else if (shape === 1) x.fillRect(cx, cy, 3, 2);
          else {
            x.fillRect(cx + 1, cy, 1, 3);
            x.fillRect(cx, cy + 1, 3, 1);
          }
        }
        break;
      }
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

  /** Jahrmarkt-Zentralmedaillon (Prachtvoller Zirkus-Sternenkreis am Boden) */
  S.drawCenterMedallion = function (ctx, cx, cy, time = 0) {
    ctx.save();
    ctx.translate(cx, cy);

    // Weicher Schattenwurf auf die Dielen
    ctx.fillStyle = 'rgba(15, 8, 4, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 4, 218, 0, Math.PI * 2);
    ctx.fill();

    // Äußerer Messing-Ring mit Zierrand
    ctx.fillStyle = '#b8861b';
    ctx.beginPath();
    ctx.arc(0, 0, 212, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dfaa33';
    ctx.beginPath();
    ctx.arc(0, 0, 206, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a2208';
    ctx.beginPath();
    ctx.arc(0, 0, 198, 0, Math.PI * 2);
    ctx.fill();

    // 16 Strahlen (Alternierend Zirkus-Karminrot und Goldgelb)
    const rayCount = 16;
    const rayAngle = (Math.PI * 2) / rayCount;
    for (let i = 0; i < rayCount; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 196, i * rayAngle, (i + 1) * rayAngle);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? (i % 4 === 0 ? '#b81e28' : '#9b161f') : (i % 4 === 1 ? '#e2a829' : '#f5bc3a');
      ctx.fill();
    }

    // Nieten auf dem Messing-Ring
    ctx.fillStyle = '#ffd65c';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rx = Math.cos(a) * 205;
      const ry = Math.sin(a) * 205;
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mittlerer Ring
    ctx.fillStyle = '#3a1f0a';
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b8861b';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c1526';
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();

    // Zentraler goldener 8-zackiger Zirkus-Stern
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    const pts = 8;
    for (let p = 0; p < pts * 2; p++) {
      const a = (p / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = p % 2 === 0 ? 54 : 24;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Zentraler Rubin-Kern
    ctx.fillStyle = '#d01c32';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff7a88';
    ctx.beginPath();
    ctx.arc(-3, -3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  /** Bunte Wimpelgirlanden rund um die Jahrmarkt-Arena */
  S.drawBunting = function (ctx, time = 0) {
    const poles = 8;
    const r = 740;
    const colors = ['#ff2848', '#ffcc00', '#00b8ff', '#2ce068'];

    ctx.save();
    for (let i = 0; i < poles; i++) {
      const a1 = (i / poles) * Math.PI * 2;
      const a2 = ((i + 1) / poles) * Math.PI * 2;
      const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
      const x2 = Math.cos(a2) * r, y2 = Math.sin(a2) * r;

      // Zirkus-Masten
      ctx.fillStyle = '#4a2d12';
      ctx.fillRect(x1 - 4, y1 - 28, 8, 32);
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.arc(x1, y1 - 28, 5, 0, Math.PI * 2);
      ctx.fill();

      // Hängende Girlandenleine (durchhängender Bogen)
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 + 35; // Durchhang
      ctx.strokeStyle = '#2d1b0a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - 24);
      ctx.quadraticCurveTo(midX, midY - 24, x2, y2 - 24);
      ctx.stroke();

      // Wimpel (Dreiecke) entlang des Bogens
      const flags = 9;
      for (let f = 1; f < flags; f++) {
        const t = f / flags;
        const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
        const by = (1 - t) * (1 - t) * (y1 - 24) + 2 * (1 - t) * t * (midY - 24) + t * t * (y2 - 24);

        const sway = Math.sin(time * 2.5 + i * 2 + f) * 2;
        const col = colors[(i * 3 + f) % colors.length];

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.lineTo(bx + 5, by);
        ctx.lineTo(bx + sway, by + 14);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
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

  S.EGGE_W = 20; S.EGGE_H = 24;
  HDE.Sprites = S;
})();
