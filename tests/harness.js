// Lädt die Spiellogik (ohne Browser) in einen vm-Kontext
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function load() {
  const ctx = vm.createContext({ console, btoa, atob, Math, Date, JSON, Float32Array, Int32Array, Map, Set, Number, Object, Array, String, Infinity, isFinite });
  ctx.globalThis = ctx;
  for (const f of ['util', 'data', 'meta', 'save', 'game']) {
    const file = path.join(__dirname, '..', 'js', f + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  return ctx.HDE;
}

/** Einfacher Bot: weicht Egges aus, sammelt Gems, wählt Upgrades zufällig/gierig */
function makeBot(game, mode = 'random') {
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  let wanderA = Math.random() * 6.28;
  return {
    steer() {
      const p = game.player;
      let vx = 0, vy = 0;
      const en = game.enemies;
      let crowd = 0, nearD = 1e9, near = null;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e.dead) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 100 * 100) crowd++;
        if (d2 < nearD) { nearD = d2; near = e; }
        if (e.boss) { // Boss umkreisen: nah genug für Nahkampf-Waffen, aber nicht drauf
          const d = Math.sqrt(d2) || 1;
          const want = 120;
          const k = (d - want) / 100; // >0: zu weit weg -> ran
          vx += (-dx / d) * clampN(k, -2, 2) * 1.5; vy += (-dy / d) * clampN(k, -2, 2) * 1.5;
          vx += (-dy / d) * 1.2; vy += (dx / d) * 1.2; // tangential
        }
      }
      if (crowd >= 9) {
        // Umzingelt: weg vom Schwerpunkt
        let cx = 0, cy = 0, n = 0;
        for (const e of en) {
          if (e.dead) continue;
          const dx = p.x - e.x, dy = p.y - e.y;
          if (dx * dx + dy * dy < 160 * 160) { cx += dx; cy += dy; n++; }
        }
        const l = Math.hypot(cx, cy) || 1;
        vx += (cx / l) * 3; vy += (cy / l) * 3;
      } else if (near && nearD > 90 * 90) {
        const d = Math.sqrt(nearD);
        vx -= ((p.x - near.x) / d) * 0.8; vy -= ((p.y - near.y) / d) * 0.8;
      }
      // Gems einsammeln
      let bd = 300 * 300, bg = null;
      for (const g of game.gems) {
        const dx = g.x - p.x, dy = g.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; bg = g; }
      }
      for (const k of game.pickups) {
        const dx = k.x - p.x, dy = k.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; bg = k; }
      }
      if (bg && crowd < 9) {
        const dx = bg.x - p.x, dy = bg.y - p.y, d = Math.hypot(dx, dy) || 1;
        vx += (dx / d) * 1.2; vy += (dy / d) * 1.2;
      }
      wanderA += (Math.random() - 0.5) * 0.3;
      vx += Math.cos(wanderA) * 0.35; vy += Math.sin(wanderA) * 0.35;
      const l = Math.hypot(vx, vy) || 1;
      game.input.x = vx / l; game.input.y = vy / l;
    },
    choose() {
      if (game.state !== 'levelup') return;
      const ch = game.choices;
      let idx = 0;
      if (mode === 'random') idx = Math.floor(Math.random() * ch.length);
      else {
        // gierig: Evolution > Waffe up > neue Waffe > Passiv
        const rank = { evo: 0, weapon_up: 1, weapon_new: 2, passive_up: 3, passive_new: 4 };
        let best = 99;
        ch.forEach((c, i) => { const r = rank[c.type] ?? 5; if (r < best) { best = r; idx = i; } });
      }
      game.pickChoice(idx);
    },
  };
}

module.exports = { load, makeBot };
