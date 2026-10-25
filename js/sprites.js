/* Hau den Egge - Pixel-Art-Sprites (alles per Code gezeichnet, keine externen Dateien nötig) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
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

  /* ------------------------------------------------------------ Chibi Vector-Sprites (wie im Mockup-Foto) */
  function createEggeSprite(isElite, frame) {
    const c = mk(36, 44), ctx = c.getContext('2d');
    const bob = frame === 1 ? 1 : 0;
    const legOffset = frame === 1 ? 2 : 0;

    // 1. Beine & Schuhe
    ctx.fillStyle = '#232733';
    ctx.fillRect(12 - legOffset, 32, 4, 7);
    ctx.fillRect(20 + legOffset, 32, 4, 7);
    ctx.fillStyle = '#111218';
    ctx.fillRect(11 - legOffset, 38, 6, 4);
    ctx.fillRect(19 + legOffset, 38, 6, 4);

    // 2. Körper / Pullover (Dunkelgrauer Rollkragenpulli)
    const sweaterCol = isElite ? '#e5b020' : '#454b57';
    const sweaterDark = isElite ? '#b88610' : '#333842';

    // Torso
    ctx.fillStyle = sweaterCol;
    roundRect(ctx, 10, 22 + bob, 16, 12, 3);
    ctx.fill();

    // Ärmel / Arme
    ctx.fillStyle = sweaterDark;
    ctx.fillRect(7, 24 + bob, 4, 8);
    ctx.fillRect(25, 24 + bob, 4, 8);
    // Hände
    ctx.fillStyle = '#f7cca6';
    ctx.beginPath();
    ctx.arc(8.5, 33 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(27.5, 33 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Rollkragen-Falte unter dem Kinn
    ctx.fillStyle = isElite ? '#ffd84d' : '#646c7d';
    roundRect(ctx, 11, 20 + bob, 14, 4, 2);
    ctx.fill();

    // 3. Chibi-Kopf (Großer runder Kopf, peachy Skin)
    ctx.fillStyle = '#f7cca6';
    ctx.beginPath();
    ctx.arc(18, 14 + bob, 11, 0, Math.PI * 2);
    ctx.fill();

    // Wangen-Rouge
    ctx.fillStyle = 'rgba(235, 120, 100, 0.4)';
    ctx.beginPath();
    ctx.arc(12, 17 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(24, 17 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mund (Verschmitztes Grinsen)
    ctx.strokeStyle = '#a84040';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(18, 17 + bob, 3, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // 4. Haare (Kurz, dunkel, mit Seitenscheitel)
    ctx.fillStyle = '#221c25';
    ctx.beginPath();
    ctx.arc(18, 13 + bob, 11.2, Math.PI, Math.PI * 2);
    ctx.lineTo(29, 13 + bob);
    ctx.lineTo(28, 8 + bob);
    ctx.quadraticCurveTo(24, 3 + bob, 18, 3 + bob);
    ctx.quadraticCurveTo(10, 3 + bob, 7, 8 + bob);
    ctx.lineTo(7, 13 + bob);
    ctx.closePath();
    ctx.fill();

    // Haar-Glanzkante
    ctx.strokeStyle = '#423848';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(18, 6 + bob, 6, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Ohren
    ctx.fillStyle = '#e8a882';
    ctx.beginPath();
    ctx.arc(6.5, 14 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(29.5, 14 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Die markante schwarze Rechteck-Brille!
    ctx.fillStyle = '#0e0f14';
    ctx.fillRect(8, 10 + bob, 8, 7);
    ctx.fillRect(20, 10 + bob, 8, 7);
    ctx.fillRect(16, 12 + bob, 4, 2);
    ctx.fillRect(6, 12 + bob, 3, 2);
    ctx.fillRect(27, 12 + bob, 3, 2);

    // Gläser-Hintergrund
    ctx.fillStyle = '#1c222e';
    ctx.fillRect(9.5, 11.5 + bob, 5, 4);
    ctx.fillRect(21.5, 11.5 + bob, 5, 4);

    // Augen dahinter
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 12.5 + bob, 2, 2.5);
    ctx.fillRect(24, 12.5 + bob, 2, 2.5);
    ctx.fillStyle = '#0e0f14';
    ctx.fillRect(13, 13 + bob, 1.5, 1.5);
    ctx.fillRect(25, 13 + bob, 1.5, 1.5);

    // Markante weiße Glanz-Reflexionen auf den Brillengläsern (aus dem Bild!)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9.5, 11.5 + bob, 2, 1.5);
    ctx.fillRect(10.5, 12.5 + bob, 1.5, 1.5);
    ctx.fillRect(21.5, 11.5 + bob, 2, 1.5);
    ctx.fillRect(22.5, 12.5 + bob, 1.5, 1.5);

    return outline(c, '#0b0c10');
  }

  function createBossSprite(frame) {
    const c = mk(104, 120), ctx = c.getContext('2d');
    const bob = frame === 1 ? 2 : 0;
    const legOffset = frame === 1 ? 4 : 0;

    // Beine & Stiefel
    ctx.fillStyle = '#1e222c';
    ctx.fillRect(36 - legOffset, 88, 12, 22);
    ctx.fillRect(56 + legOffset, 88, 12, 22);
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(33 - legOffset, 106, 17, 10);
    ctx.fillRect(54 + legOffset, 106, 17, 10);

    // Nacken / Trapezius
    ctx.fillStyle = '#c98a65';
    ctx.beginPath();
    ctx.moveTo(38, 48 + bob);
    ctx.lineTo(66, 48 + bob);
    ctx.lineTo(72, 60 + bob);
    ctx.lineTo(32, 60 + bob);
    ctx.closePath();
    ctx.fill();

    // Breiter Muskel-Torso (Dunkelgrauer Sweatshirt-Look)
    ctx.fillStyle = '#3a404c';
    roundRect(ctx, 22, 54 + bob, 60, 38, 8);
    ctx.fill();

    // Brustmuskel-Schattierung
    ctx.fillStyle = '#262a33';
    ctx.fillRect(28, 62 + bob, 22, 16);
    ctx.fillRect(54, 62 + bob, 22, 16);
    ctx.fillStyle = '#4e5666';
    ctx.fillRect(28, 60 + bob, 48, 3);

    // Kräftige Schultern & Oberarme
    ctx.fillStyle = '#3a404c';
    ctx.beginPath();
    ctx.ellipse(18, 62 + bob, 14, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(86, 62 + bob, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Unterarme
    ctx.fillStyle = '#2d323c';
    ctx.fillRect(10, 68 + bob, 14, 22);
    ctx.fillRect(80, 68 + bob, 14, 22);

    // Geballte Fäuste
    ctx.fillStyle = '#f0be9e';
    ctx.beginPath();
    ctx.arc(17, 94 + bob, 8, 0, Math.PI * 2);
    ctx.arc(87, 94 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c98a65';
    ctx.fillRect(12, 94 + bob, 9, 3);
    ctx.fillRect(83, 94 + bob, 9, 3);

    // Kragen
    ctx.fillStyle = '#545d6e';
    roundRect(ctx, 36, 52 + bob, 32, 8, 4);
    ctx.fill();

    // Riesiger wütender Boss-Kopf
    ctx.fillStyle = '#f0be9e';
    roundRect(ctx, 28, 12 + bob, 48, 40, 14);
    ctx.fill();

    // Wangen-Schatten
    ctx.fillStyle = 'rgba(180, 80, 50, 0.2)';
    ctx.beginPath();
    ctx.arc(38, 42 + bob, 7, 0, Math.PI * 2);
    ctx.arc(66, 42 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    // Wütende Ader an der Schläfe
    ctx.strokeStyle = '#b82030';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(27, 24 + bob); ctx.lineTo(31, 28 + bob); ctx.lineTo(29, 32 + bob);
    ctx.stroke();

    // Boss-Haare
    ctx.fillStyle = '#18141a';
    ctx.beginPath();
    ctx.arc(52, 22 + bob, 25, Math.PI, Math.PI * 2);
    ctx.lineTo(77, 26 + bob);
    ctx.lineTo(74, 12 + bob);
    ctx.quadraticCurveTo(52, 4 + bob, 30, 12 + bob);
    ctx.lineTo(27, 26 + bob);
    ctx.closePath();
    ctx.fill();

    // Ohren
    ctx.fillStyle = '#c98a65';
    ctx.beginPath();
    ctx.arc(26, 30 + bob, 4.5, 0, Math.PI * 2);
    ctx.arc(78, 30 + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Wütende, steil herabfallende Augenbrauen
    ctx.fillStyle = '#100c14';
    ctx.beginPath();
    ctx.moveTo(33, 22 + bob); ctx.lineTo(49, 27 + bob); ctx.lineTo(49, 24 + bob); ctx.lineTo(33, 19 + bob);
    ctx.moveTo(71, 22 + bob); ctx.lineTo(55, 27 + bob); ctx.lineTo(55, 24 + bob); ctx.lineTo(71, 19 + bob);
    ctx.fill();

    // Massive schwarze Brille
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(32, 24 + bob, 18, 14);
    ctx.fillRect(54, 24 + bob, 18, 14);
    ctx.fillRect(48, 27 + bob, 8, 4);
    ctx.fillRect(27, 27 + bob, 6, 3);
    ctx.fillRect(71, 27 + bob, 6, 3);

    // Gläser
    ctx.fillStyle = '#22080c';
    ctx.fillRect(35, 27 + bob, 12, 8);
    ctx.fillRect(57, 27 + bob, 12, 8);

    // Rot glühende Pupillen (Zorn des Mega-Bosses!)
    ctx.fillStyle = '#ff2030';
    ctx.beginPath();
    ctx.arc(42, 31 + bob, 3.5, 0, Math.PI * 2);
    ctx.arc(62, 31 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(41, 30 + bob, 1.2, 0, Math.PI * 2);
    ctx.arc(61, 30 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Glanzkanten auf der Brille
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(35, 27 + bob, 4, 2);
    ctx.fillRect(57, 27 + bob, 4, 2);

    // Zähnefletschender, grimmiger Mund (aus dem Bild!)
    ctx.fillStyle = '#0a0a0e';
    roundRect(ctx, 39, 41 + bob, 26, 8, 2);
    ctx.fill();

    // Weiße Zähne mit Zahnspalten
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(41, 42.5 + bob, 22, 5);
    ctx.fillStyle = '#1a1014';
    for (let z = 45; z <= 60; z += 3.5) {
      ctx.fillRect(z, 42.5 + bob, 1, 5);
    }
    ctx.fillRect(41, 45 + bob, 22, 0.8);

    return outline(c, '#090a0d');
  }

  function createHeroSprite(frame) {
    const c = mk(40, 48), ctx = c.getContext('2d');
    const bob = frame === 1 ? 1 : 0;
    const legOffset = frame === 1 ? 2 : 0;

    // Beine & Sneakers
    ctx.fillStyle = '#2b3a5c';
    ctx.fillRect(13 - legOffset, 34, 5, 8);
    ctx.fillRect(22 + legOffset, 34, 5, 8);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(12 - legOffset, 41, 7, 4);
    ctx.fillRect(21 + legOffset, 41, 7, 4);
    ctx.fillStyle = '#cc2020';
    ctx.fillRect(12 - legOffset, 42, 7, 1.2);
    ctx.fillRect(21 + legOffset, 42, 7, 1.2);

    // Hoodie (Meliertes Grau mit Reißverschluss & weißen Kordeln)
    ctx.fillStyle = '#787e8c';
    roundRect(ctx, 11, 23 + bob, 18, 13, 3);
    ctx.fill();

    ctx.fillStyle = '#626875';
    ctx.fillRect(11, 33 + bob, 18, 3);

    // Ärmel
    ctx.fillStyle = '#6a707e';
    ctx.fillRect(8, 25 + bob, 4, 8);
    ctx.fillRect(28, 25 + bob, 4, 8);

    // Hände
    ctx.fillStyle = '#f5c6a5';
    ctx.beginPath();
    ctx.arc(9.5, 34 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(30.5, 34 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Silberner Reißverschluss
    ctx.fillStyle = '#dcdfe6';
    ctx.fillRect(19.5, 23 + bob, 1.5, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(19, 25 + bob, 2.5, 2.5);

    // Weiße Hoodie-Kordeln
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 24 + bob, 1.2, 7);
    ctx.fillRect(23, 24 + bob, 1.2, 7);

    // Kopf & Gesicht
    ctx.fillStyle = '#f5c6a5';
    ctx.beginPath();
    ctx.arc(20, 15 + bob, 11, 0, Math.PI * 2);
    ctx.fill();

    // Bart & Bartschatten (meliert dunkel / grau)
    ctx.fillStyle = '#382a20';
    ctx.beginPath();
    ctx.arc(20, 16.5 + bob, 9.5, 0.2, Math.PI - 0.2);
    ctx.lineTo(13, 17 + bob);
    ctx.lineTo(27, 17 + bob);
    ctx.closePath();
    ctx.fill();

    // Graue Stoppeln im Bart
    ctx.fillStyle = '#9ca2ad';
    ctx.fillRect(15, 21 + bob, 2, 1);
    ctx.fillRect(23, 21 + bob, 2, 1);
    ctx.fillRect(19, 23 + bob, 2, 1);

    // Mund
    ctx.fillStyle = '#b05050';
    ctx.fillRect(18.5, 21 + bob, 3, 1.2);

    // Augen
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 13 + bob, 3.5, 2.5);
    ctx.fillRect(22.5, 13 + bob, 3.5, 2.5);
    ctx.fillStyle = '#15151c';
    ctx.fillRect(15.5, 13 + bob, 2, 2.5);
    ctx.fillRect(24, 13 + bob, 2, 2.5);

    // Augenbrauen
    ctx.strokeStyle = '#2d221a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(13, 11.5 + bob); ctx.lineTo(18, 13 + bob);
    ctx.moveTo(27, 11.5 + bob); ctx.lineTo(22, 13 + bob);
    ctx.stroke();

    // Haare (Meliertes dunkelbraunes Haar)
    ctx.fillStyle = '#382a20';
    ctx.beginPath();
    ctx.arc(20, 13 + bob, 11.5, Math.PI, Math.PI * 2);
    ctx.lineTo(31, 13 + bob);
    ctx.lineTo(31, 7 + bob);
    ctx.quadraticCurveTo(25, 2 + bob, 20, 2 + bob);
    ctx.quadraticCurveTo(15, 2 + bob, 9, 7 + bob);
    ctx.lineTo(9, 13 + bob);
    ctx.closePath();
    ctx.fill();

    // Graue / Silberne Haar-Strähnen an Schläfen
    ctx.strokeStyle = '#b8c0cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(26, 9 + bob, 3.5, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14, 9 + bob, 3.5, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Ohren
    ctx.fillStyle = '#dca080';
    ctx.beginPath();
    ctx.arc(8.5, 15 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(31.5, 15 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    return outline(c, '#0d0d12');
  }

  function drawChicken(ctx, cx, cy) {
    ctx.fillStyle = '#ffd214';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e82020';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 13, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 13, 2.5, 0, Math.PI * 2);
    ctx.arc(cx, cy - 15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd214';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff7a14';
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 10);
    ctx.lineTo(cx, cy - 13);
    ctx.lineTo(cx + 3, cy - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 2.5, cy - 10, 2, 0, Math.PI * 2);
    ctx.arc(cx + 2.5, cy - 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101014';
    ctx.beginPath();
    ctx.arc(cx - 2.5, cy - 10, 1, 0, Math.PI * 2);
    ctx.arc(cx + 2.5, cy - 10, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff9a14';
    ctx.fillRect(cx - 3, cy + 10, 2, 6);
    ctx.fillRect(cx + 1, cy + 10, 2, 6);
    ctx.fillRect(cx - 5, cy + 15, 4, 2);
    ctx.fillRect(cx + 1, cy + 15, 4, 2);
  }

  function buildWeapons() {
    // 1. Holzhammer
    const mc = mk(40, 40), mx = mc.getContext('2d');
    mx.fillStyle = '#6e441f';
    mx.fillRect(18, 14, 4, 24);
    mx.fillStyle = '#4a2c12';
    mx.fillRect(21, 14, 1, 24);
    mx.fillStyle = '#b87e38';
    roundRect(mx, 8, 4, 24, 13, 3);
    mx.fill();
    mx.fillStyle = '#3a2614';
    mx.fillRect(11, 4, 2, 13);
    mx.fillRect(27, 4, 2, 13);
    mx.fillStyle = 'rgba(255,255,255,0.4)';
    mx.fillRect(9, 5, 22, 1.5);

    // 2. Bratpfanne
    const pc = mk(36, 36), px = pc.getContext('2d');
    px.fillStyle = '#22232a';
    px.fillRect(16, 17, 4, 16);
    px.fillStyle = '#1a1b22';
    px.beginPath();
    px.arc(18, 11, 9.5, 0, Math.PI * 2);
    px.fill();
    px.fillStyle = '#2c2e3a';
    px.beginPath();
    px.arc(18, 11, 7.5, 0, Math.PI * 2);
    px.fill();
    px.strokeStyle = 'rgba(255,255,255,0.4)';
    px.lineWidth = 1.2;
    px.beginPath();
    px.arc(18, 11, 8.5, Math.PI * 0.7, Math.PI * 1.3);
    px.stroke();

    // 3. Gummihuhn
    const cc = mk(36, 40), cx = cc.getContext('2d');
    drawChicken(cx, 18, 19);

    // 4. Toaster
    const tc = mk(32, 32), tx = tc.getContext('2d');
    tx.fillStyle = '#adb3c2';
    roundRect(tx, 4, 8, 24, 18, 3);
    tx.fill();
    tx.fillStyle = '#e2e6ef';
    tx.fillRect(5, 9, 22, 2);
    tx.fillStyle = '#343842';
    tx.fillRect(8, 6, 7, 3);
    tx.fillRect(17, 6, 7, 3);
    tx.fillStyle = '#d49b28';
    tx.fillRect(9, 3, 5, 4);
    tx.fillRect(18, 3, 5, 4);
    tx.fillStyle = '#505664';
    tx.fillRect(25, 14, 4, 6);

    // 5. Banane
    const bc = mk(32, 32), bx = bc.getContext('2d');
    bx.fillStyle = '#ffd200';
    bx.beginPath();
    bx.arc(16, 16, 12, Math.PI * 0.1, Math.PI * 0.9);
    bx.quadraticCurveTo(16, 20, 24, 12);
    bx.closePath();
    bx.fill();
    bx.fillStyle = '#5c3a10';
    bx.fillRect(6, 18, 3, 2);

    return {
      mallet: outline(mc, '#0a0a0f'),
      pan: outline(pc, '#0a0a0f'),
      chicken: outline(cc, '#0a0a0f'),
      toaster: outline(tc, '#0a0a0f'),
      banana: outline(bc, '#0a0a0f'),
    };
  }

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

  /** Zirkuszelt-Dach mit radialen Streifen und weißem Fransen-Saum (aus Mockup-Foto) */
  function drawTentRoof(ctx, cx, cy, colors, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const R = 320;
    const stripes = 8;
    const wedgeAngle = (Math.PI / 2) / stripes;

    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, i * wedgeAngle, (i + 1) * wedgeAngle);
      ctx.closePath();
      ctx.fill();

      // Schattierung
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, (i + 0.82) * wedgeAngle, (i + 1) * wedgeAngle);
      ctx.closePath();
      ctx.fill();
    }

    // Weißer gewellter Baldachin-Saum (Zirkus-Fransen)
    const scallops = 10;
    const scAngle = (Math.PI / 2) / scallops;
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < scallops; s++) {
      const midA = (s + 0.5) * scAngle;
      const fx = Math.cos(midA) * R;
      const fy = Math.sin(midA) * R;
      ctx.beginPath();
      ctx.arc(fx, fy, 13, 0, Math.PI * 2);
      ctx.fill();
    }

    // Saum-Kante
    ctx.strokeStyle = '#201014';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, R + 3, 0, Math.PI / 2);
    ctx.stroke();

    ctx.restore();
  }

  /** Zuschauer-Egges in den Jahrmarkts-Buden am oberen Rand */
  function drawCarnivalBooths(ctx, time) {
    const boothY = -380;
    const boothW = 1300;
    // Holzwand
    ctx.fillStyle = '#4e3016';
    ctx.fillRect(-boothW / 2, boothY - 60, boothW, 55);
    // Theke
    ctx.fillStyle = '#7a4e25';
    ctx.fillRect(-boothW / 2, boothY - 10, boothW, 14);
    ctx.fillStyle = '#261608';
    ctx.fillRect(-boothW / 2, boothY + 4, boothW, 4);

    // Zuschauer-Egges an der Theke
    const eggeSprite = S.egge && S.egge.normal ? S.egge.normal[0] : null;
    if (eggeSprite) {
      for (let bx = -560; bx <= 560; bx += 70) {
        const bob = Math.sin(time * 3 + bx) * 2;
        ctx.save();
        ctx.translate(bx, boothY - 20 + bob);
        ctx.scale(0.8, 0.8);
        ctx.drawImage(eggeSprite, -eggeSprite.width / 2, -eggeSprite.height / 2);
        ctx.restore();
      }
    }
  }

  /** Zirkus-Wimpelgirlanden & Pfosten rund um die Arena */
  function drawArenaRope(ctx, time) {
    const poles = 16;
    const rx = 740, ry = 480;
    const colors = ['#e6283b', '#ffcc00', '#1894d8', '#2cd860'];

    for (let i = 0; i < poles; i++) {
      const a1 = (i / poles) * Math.PI * 2;
      const a2 = ((i + 1) / poles) * Math.PI * 2;
      const x1 = Math.cos(a1) * rx, y1 = Math.sin(a1) * ry;
      const x2 = Math.cos(a2) * rx, y2 = Math.sin(a2) * ry;

      // Zirkus-Masten
      ctx.fillStyle = '#3a220f';
      ctx.fillRect(x1 - 3, y1 - 24, 6, 28);
      ctx.fillStyle = '#ffcc22';
      ctx.beginPath();
      ctx.arc(x1, y1 - 24, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Hängendes Seil
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 + 18;
      ctx.strokeStyle = '#26150a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - 20);
      ctx.quadraticCurveTo(midX, midY - 20, x2, y2 - 20);
      ctx.stroke();

      // Dreiecks-Wimpel
      const flags = 5;
      for (let f = 1; f < flags; f++) {
        const t = f / flags;
        const fx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
        const fy = (1 - t) * (1 - t) * (y1 - 20) + 2 * (1 - t) * t * (midY - 20) + t * t * (y2 - 20);
        const col = colors[(i * 3 + f) % colors.length];
        const sway = Math.sin(time * 2.5 + i + f) * 1.5;

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(fx - 4, fy);
        ctx.lineTo(fx + 4, fy);
        ctx.lineTo(fx + sway, fy + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  S.drawArenaScenery = function (ctx, time = 0) {
    ctx.save();
    // 1. Zirkuszelt-Dächer in den 4 Ecken (wie auf dem Mockup-Foto!)
    // Unten-Links: Rot & Türkis
    drawTentRoof(ctx, -740, 440, ['#cf2234', '#15969a'], -Math.PI / 2);
    // Unten-Rechts: Gelb & Blau
    drawTentRoof(ctx, 740, 440, ['#f7c818', '#1b50b8'], Math.PI);
    // Oben-Links: Lila & Gold
    drawTentRoof(ctx, -740, -440, ['#842db8', '#dfa824'], 0);
    // Oben-Rechts: Rot & Blau
    drawTentRoof(ctx, 740, -440, ['#cf2234', '#1b50b8'], Math.PI / 2);

    // 2. Jahrmarkts-Buden & Zuschauer am oberen Rand
    drawCarnivalBooths(ctx, time);

    // 3. Wimpelgirlande entlang des Arena-Rings
    drawArenaRope(ctx, time);
    ctx.restore();
  };

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
    S.egge.normal = [createEggeSprite(false, 0), createEggeSprite(false, 1)];
    S.egge.gold = [createEggeSprite(true, 0), createEggeSprite(true, 1)];

    // Dedizierter Mega-Boss mit breiten Schultern, bösem Blick & Zähnefletschen
    S.boss = [createBossSprite(0), createBossSprite(1)];
    S.egge.boss = S.boss;

    S.hero = [createHeroSprite(0), createHeroSprite(1)];
    S.heroBase = S.hero[0];

    S.weapons = buildWeapons();

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
