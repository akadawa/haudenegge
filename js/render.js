/* Hau den Egge - Canvas 2D Renderer (Kamera, Sprites, Effekte, Partikel) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});
  const { Sprites, data: D } = HDE;
  const TAU = Math.PI * 2;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.camX = 0;
      this.camY = 0;
      this.zoom = 1;
      this.dpr = window.devicePixelRatio || 1;
      this.resize();
    }

    resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      // Passende Zoomstufe: ca. 550 bis 700 vertikale Spieleinheiten
      const targetH = 600;
      this.zoom = Math.max(1, Math.floor((h / targetH) * 1.5)) / 1.5;
      if (h < 500) this.zoom = 1.0;
    }

    render(game) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const p = game.player;

      // Kamera sanft nachführen + Screen-Shake
      const targetCamX = p.x;
      const targetCamY = p.y;
      this.camX += (targetCamX - this.camX) * 0.2;
      this.camY += (targetCamY - this.camY) * 0.2;

      let shakeX = 0, shakeY = 0;
      if (game.shake > 0.01) {
        const s = game.shake * 14 * this.zoom;
        shakeX = (Math.random() - 0.5) * s;
        shakeY = (Math.random() - 0.5) * s;
      }

      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      const viewW = w / this.dpr;
      const viewH = h / this.dpr;
      game.setView(viewW / this.zoom, viewH / this.zoom);

      // Hintergrund
      const biomeIdx = (game.stage - 1) % D.BIOMES.length;
      const pat = Sprites.floorPattern(ctx, biomeIdx);

      ctx.save();
      ctx.translate(viewW / 2 + shakeX, viewH / 2 + shakeY);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.camX, -this.camY);

      // Boden zeichnen
      const left = this.camX - (viewW / 2) / this.zoom;
      const top = this.camY - (viewH / 2) / this.zoom;
      const right = left + viewW / this.zoom;
      const bottom = top + viewH / this.zoom;

      ctx.fillStyle = pat;
      ctx.fillRect(left - 32, top - 32, (right - left) + 64, (bottom - top) + 64);

      // Grasflecken (Weed Spots)
      this.renderGrassPatches(ctx, game, left, top, right, bottom);

      // Zonen am Boden (Rauch, Bongwasser, Bananenschalen, Schwerkraft)
      this.renderZones(ctx, game);

      // Schatten aller Entitäten
      this.renderShadows(ctx, game);

      // Pickups & Drops (XP-Gems, Eierschalen, Hühnchen, Truhen)
      this.renderPickups(ctx, game);

      // Begleiter (z. B. Hühner-Pakt)
      this.renderCompanions(ctx, game);

      // Gegner (Egges)
      this.renderEnemies(ctx, game);

      // Spieler
      this.renderPlayer(ctx, game);

      // Waffen-Projektile & Animationen
      this.renderWeapons(ctx, game);

      // Gegner-Projektile (Feuerbälle, Blätter)
      this.renderEnemyProjectiles(ctx, game);

      // Partikel & Ringe & Explosionen
      this.renderEffects(ctx, game);

      // Schwebende Schadenszahlen
      this.renderFloaters(ctx, game);

      ctx.restore();
      ctx.restore();
    }

    /* ------------------------------------------------------------ Grasflecken */
    renderGrassPatches(ctx, game, left, top, right, bottom) {
      const minCX = Math.floor(left / D.CONST.CHUNK);
      const maxCX = Math.floor(right / D.CONST.CHUNK);
      const minCY = Math.floor(top / D.CONST.CHUNK);
      const maxCY = Math.floor(bottom / D.CONST.CHUNK);

      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cy = minCY; cy <= maxCY; cy++) {
          const pt = game.getPatch(cx, cy);
          if (!pt) continue;
          const img = Sprites.grass(pt);
          const drawR = pt.r;
          ctx.drawImage(img, pt.x - drawR, pt.y - drawR, drawR * 2, drawR * 2);

          // Kleines Hanfblatt-Symbol mittig im Grasfleck als Gag
          ctx.save();
          ctx.globalAlpha = 0.5;
          const leaf = Sprites.items.leaf;
          if (leaf) ctx.drawImage(leaf, pt.x - 10, pt.y - 10, 20, 20);
          ctx.restore();
        }
      }
    }

    /* ------------------------------------------------------------ Zonen */
    renderZones(ctx, game) {
      const t = game.time;
      for (const z of game.zones) {
        const frac = Math.max(0, z.life / (z.max || 1));
        if (z.kind === 'smoke') {
          ctx.save();
          ctx.globalAlpha = Math.min(0.45, frac * 0.6);
          ctx.fillStyle = '#c8e2b8';
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.r, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else if (z.kind === 'puddle') {
          ctx.save();
          ctx.globalAlpha = Math.min(0.5, frac * 0.7);
          ctx.fillStyle = '#78a272';
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, z.r, z.r * 0.65, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else if (z.kind === 'peel') {
          ctx.drawImage(Sprites.emoji('🍌', 18), z.x - 9, z.y - 9, 18, 18);
        } else if (z.kind === 'spikestrip') {
          ctx.save();
          ctx.globalAlpha = Math.min(0.95, frac + 0.2);
          ctx.drawImage(Sprites.emoji('🚧', 24), z.x - 12, z.y - 12, 24, 24);
          ctx.restore();
        } else if (z.kind === 'gravity') {
          ctx.save();
          ctx.globalAlpha = 0.35 + Math.sin(t * 12) * 0.15;
          ctx.strokeStyle = '#9d6be8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.r * (1 - (z.life / z.max) * 0.2), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* ------------------------------------------------------------ Schatten */
    renderShadows(ctx, game) {
      const sh = Sprites.shadow;
      if (!sh) return;
      const p = game.player;
      ctx.drawImage(sh, p.x - 16, p.y + p.r - 5, 32, 12);

      for (const c of game.companions) {
        ctx.drawImage(sh, c.x - 10, c.y + 10, 20, 8);
      }

      for (const e of game.enemies) {
        if (e.dead) continue;
        const sw = e.r * 2.2;
        const shh = sw * 0.36;
        ctx.drawImage(sh, e.x - sw / 2, e.y + e.r - shh * 0.5, sw, shh);
      }
    }

    /* ------------------------------------------------------------ Pickups */
    renderPickups(ctx, game) {
      const t = game.time;

      // XP-Gems
      for (const g of game.gems) {
        const bob = Math.sin(t * 6 + g.x) * 2;
        ctx.save();
        ctx.fillStyle = g.v >= 10 ? '#4fe8ff' : g.v >= 3 ? '#ffe14a' : '#4fc760';
        ctx.beginPath();
        // Kristall-Form (Raute)
        const size = g.v >= 10 ? 6 : g.v >= 3 ? 5 : 4;
        ctx.moveTo(g.x, g.y - size + bob);
        ctx.lineTo(g.x + size * 0.7, g.y + bob);
        ctx.lineTo(g.x, g.y + size + bob);
        ctx.lineTo(g.x - size * 0.7, g.y + bob);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Eierschalen, Hühnchen & Truhen
      for (const k of game.pickups) {
        const bob = Math.sin(t * 5 + k.x) * 3;
        if (k.kind === 'shell') {
          ctx.drawImage(Sprites.emoji('🥚', 20), k.x - 10, k.y - 10 + bob, 20, 20);
        } else if (k.kind === 'heal') {
          ctx.drawImage(Sprites.emoji('🍗', 22), k.x - 11, k.y - 11 + bob, 22, 22);
        } else if (k.kind === 'chest') {
          // Goldene Schatzkiste mit Leuchten
          ctx.save();
          ctx.shadowColor = '#ffe14a';
          ctx.shadowBlur = 12;
          ctx.drawImage(Sprites.emoji('🎁', 28), k.x - 14, k.y - 14 + bob, 28, 28);
          ctx.restore();
        }
      }
    }

    /* ------------------------------------------------------------ Begleiter */
    renderCompanions(ctx, game) {
      for (const c of game.companions) {
        ctx.drawImage(Sprites.emoji('🐔', 22), c.x - 11, c.y - 11, 22, 22);
      }
    }

    /* ------------------------------------------------------------ Gegner (Egges) */
    renderEnemies(ctx, game) {
      const t = game.time;
      for (const e of game.enemies) {
        if (e.dead) continue;

        ctx.save();
        ctx.translate(e.x, e.y);

        // Blickrichtung zum Spieler
        const flip = e.x > game.player.x ? -1 : 1;
        ctx.scale(flip, 1);

        // Skalierung je nach Egge-Größe (Boss / Elite / Normal)
        const baseScale = e.boss ? (e.mega ? 4.2 : 3.2) : e.scale * 1.5;
        const bob = Math.sin(e.anim * 8) * 1.5;

        // Status: Chillen im Gras -> Grünes Wölkchen & friedlicher Bob
        if (e.state === 'chill') {
          ctx.rotate(Math.sin(t * 3) * 0.1);
        }

        // Sprite auswählen (Normal / Gold / Boss)
        const variant = e.boss ? 'boss' : e.elite ? 'gold' : 'normal';
        const frames = Sprites.egge[variant] || Sprites.egge.normal;
        const frameIdx = Math.floor(e.anim * 6) % 2;
        let sprite = frames[frameIdx] || frames[0];

        // Treffer-Blitz (Weiß / Rot)
        if (e.flash > 0) {
          sprite = Sprites.flash(sprite, '#ffffff');
        } else if (e.chill > 0) {
          sprite = Sprites.flash(sprite, '#9be890');
        } else if (e.burn > 0) {
          sprite = Sprites.flash(sprite, '#ff8a3a');
        }

        const sw = 16 * baseScale;
        const sh = 19 * baseScale;
        ctx.drawImage(sprite, -sw / 2, -sh / 2 + bob, sw, sh);

        // Der Egge hält seinen Kiff-Gegenstand in der Hand!
        const itemKey = e.def ? e.def.item : 'joint';
        const itemSprite = Sprites.items[itemKey];
        if (itemSprite) {
          const isw = 12 * Math.min(baseScale, 2.2);
          const ish = 12 * Math.min(baseScale, 2.2);
          ctx.drawImage(itemSprite, sw * 0.15, -ish * 0.2 + bob, isw, ish);
        }

        // Status-Symbole (Betäubt, brennend)
        if (e.stun > 0 && !e.boss) {
          ctx.drawImage(Sprites.emoji('💫', 16), -8, -sh / 2 - 12 + bob, 16, 16);
        }

        // Lebensbalken über Elite & Boss-Egges
        if (e.boss || e.elite) {
          const hpW = e.boss ? 70 : 32;
          const hpH = e.boss ? 6 : 4;
          const hpFrac = Math.max(0, e.hp / e.maxHp);
          ctx.scale(flip, 1); // Balken nicht spiegeln
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(-hpW / 2 - 1, -sh / 2 - 12, hpW + 2, hpH + 2);
          ctx.fillStyle = e.boss ? (e.enraged ? '#ff2a2a' : '#ff7a2a') : '#ffe14a';
          ctx.fillRect(-hpW / 2, -sh / 2 - 11, hpW * hpFrac, hpH);
        }

        ctx.restore();
      }
    }

    /* ------------------------------------------------------------ Spieler */
    renderPlayer(ctx, game) {
      const p = game.player;
      ctx.save();
      ctx.translate(p.x, p.y);

      // Blickrichtung spiegeln
      const flip = p.face.x < 0 ? -1 : 1;
      ctx.scale(flip, 1);

      // Blinken bei Schaden / Unverwundbarkeit
      if (p.invuln > 0 || p.iframes > 0) {
        if (Math.floor(game.time * 24) % 2 === 0) {
          ctx.restore();
          return;
        }
      }

      const frameIdx = p.moving ? Math.floor(p.anim * 8) % 2 : 0;
      let sprite = Sprites.hero[frameIdx] || Sprites.hero[0];

      if (p.flash > 0) {
        sprite = Sprites.flash(sprite, '#ff4a4a');
      }

      const scale = 2.0;
      const sw = 16 * scale;
      const sh = 19 * scale;
      const bob = p.moving ? Math.sin(p.anim * 8) * 1.5 : 0;
      ctx.drawImage(sprite, -sw / 2, -sh / 2 + bob, sw, sh);

      // Rührei-Aura Aura-Kreis (falls Perk aktiv)
      if (game.stats.auraDps > 0) {
        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(game.time * 6) * 0.08;
        ctx.strokeStyle = '#ffe85a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 75 * game.stats.area, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    /* ------------------------------------------------------------ Waffen (Polizei-Utilities) */
    renderWeapons(ctx, game) {
      const p = game.player;

      // 1. Blaulicht-Sirene: Deutlich sichtbarer, dynamisch mit Skills & Perks skalierender Umkreis!
      const siren = game.getWeapon('siren');
      if (siren) {
        const r = siren.stats.range;
        const time = game.time;
        ctx.save();
        const isBlue = Math.sin(time * 6) > 0;

        // Weicher Blaulicht/Rotlicht-Verlauf im Umkreis
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        glowGrad.addColorStop(0, isBlue ? 'rgba(0, 140, 255, 0.22)' : 'rgba(255, 30, 60, 0.22)');
        glowGrad.addColorStop(0.75, isBlue ? 'rgba(0, 140, 255, 0.08)' : 'rgba(255, 30, 60, 0.08)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();

        // Gut sichtbare, rotierende gestrichelte Umfangslinie
        ctx.strokeStyle = isBlue ? '#00c3ff' : '#ff3366';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([9, 7]);
        ctx.lineDashOffset = -time * 35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();

        // Ausbreitende Schallwellen-Ringe
        const waveFrac = (time * 1.6) % 1;
        const waveR = r * waveFrac;
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = isBlue ? `rgba(0, 210, 255, ${0.45 * (1 - waveFrac)})` : `rgba(255, 80, 110, ${0.45 * (1 - waveFrac)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, waveR, 0, TAU);
        ctx.stroke();

        ctx.restore();
      }

      // 2. Orbit-Schlagstöcke
      const baton = game.getWeapon('baton');
      if (baton && baton.pos) {
        for (const pos of baton.pos) {
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(pos.a + Math.PI / 2);
          const sz = baton.stats.size * 2.2;
          ctx.drawImage(Sprites.emoji('🦯', Math.round(sz)), -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
      }

      // 3. Überwachungsdrohne
      const drone = game.getWeapon('drone');
      if (drone && drone.pos && drone.pos[0]) {
        const d = drone.pos[0];
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.drawImage(Sprites.emoji('🛸', 26), -13, -13, 26, 26);
        // Blaulicht-LED auf der Drohne
        ctx.fillStyle = Math.sin(game.time * 16) > 0 ? '#00b0ff' : '#ff3344';
        ctx.beginPath();
        ctx.arc(0, -6, 2.5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 4. Projektile (Kugeln, Handschellen, Pfefferspray, Wasserwerfer, Blendgranaten, Laser)
      for (const q of game.projectiles) {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot || q.a || 0);
        let sz = q.r * 2.2;
        switch (q.kind) {
          case 'bullet':
            ctx.fillStyle = '#ffea55';
            ctx.fillRect(-sz, -2, sz * 2, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-sz * 0.4, -1, sz * 0.8, 2);
            break;
          case 'handcuffs':
            ctx.drawImage(Sprites.emoji('⛓️', Math.round(sz)), -sz / 2, -sz / 2, sz, sz);
            break;
          case 'spray':
            ctx.globalAlpha = Math.min(0.65, q.life * 0.9);
            ctx.fillStyle = '#ff7a22';
            ctx.beginPath();
            ctx.arc(0, 0, q.r, 0, TAU);
            ctx.fill();
            break;
          case 'water':
            ctx.drawImage(Sprites.emoji('🌊', Math.round(sz * 1.5)), -sz * 0.75, -sz * 0.75, sz * 1.5, sz * 1.5);
            break;
          case 'flashbang':
            ctx.drawImage(Sprites.emoji('💥', Math.round(sz * 1.8)), -sz * 0.9, -sz * 0.9, sz * 1.8, sz * 1.8);
            break;
          case 'drone_laser':
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(-6, -1.5, 12, 3);
            break;
        }
        ctx.restore();
      }
    }

    /* ------------------------------------------------------------ Gegner-Projektile */
    renderEnemyProjectiles(ctx, game) {
      for (const q of game.eprojectiles) {
        ctx.save();
        ctx.translate(q.x, q.y);
        if (q.kind === 'flame') {
          ctx.drawImage(Sprites.emoji('🔥', 18), -9, -9, 18, 18);
        } else if (q.kind === 'leaf') {
          ctx.drawImage(Sprites.emoji('🍃', 18), -9, -9, 18, 18);
        }
        ctx.restore();
      }
    }

    /* ------------------------------------------------------------ Effekte & Ringe */
    renderEffects(ctx, game) {
      for (const f of game.fx) {
        const frac = f.t / f.dur;
        if (f.kind === 'ring' || f.kind === 'boom' || f.kind === 'siren_pulse') {
          ctx.save();
          ctx.globalAlpha = 1 - frac;
          ctx.strokeStyle = f.color || '#ffe14a';
          ctx.lineWidth = 4 * (1 - frac * 0.5);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * frac, 0, TAU);
          ctx.stroke();
          ctx.restore();
        } else if (f.kind === 'lightning') {
          // Taser Elektro-Lichtbogen
          ctx.save();
          ctx.globalAlpha = 1 - frac;
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(f.x1, f.y1);
          // 2-3 Zacken im Blitz
          const midX = (f.x1 + f.x2) / 2 + (Math.random() - 0.5) * 20;
          const midY = (f.y1 + f.y2) / 2 + (Math.random() - 0.5) * 20;
          ctx.lineTo(midX, midY);
          ctx.lineTo(f.x2, f.y2);
          ctx.stroke();
          ctx.restore();
        } else if (f.kind === 'flash') {
          // Blendgranaten-Blitz
          ctx.save();
          ctx.globalAlpha = (1 - frac) * 0.7;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else if (f.kind === 'muzzle') {
          // Mündungsfeuer
          ctx.save();
          ctx.globalAlpha = 1 - frac;
          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath();
          ctx.arc(f.x, f.y, 5, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }

      // Partikel
      for (const pt of game.particles) {
        const frac = pt.life / pt.max;
        ctx.save();
        ctx.globalAlpha = frac;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.restore();
      }
    }

    /* ------------------------------------------------------------ Schadenszahlen */
    renderFloaters(ctx, game) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const fl of game.floaters) {
        const alpha = Math.max(0, 1 - (fl.t / 0.7));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = fl.crit ? 'bold 15px "Courier New", monospace' : '12px "Courier New", monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(fl.text, fl.x + 1, fl.y + 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fl.x, fl.y);
        ctx.restore();
      }
    }
  }

  HDE.Renderer = Renderer;
})();
