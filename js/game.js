/* Hau den Egge - Spiellogik (rendering-unabhängig, daher auch headless testbar) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});
  const { RNG, clamp, hash2, fmtNum } = HDE.util;
  const D = HDE.data;
  const C = D.CONST;
  const TAU = Math.PI * 2;

  const GRID_CELL = 56;
  const GRID_BUCKETS = 4096;
  const MAX_FLOATERS = 45;
  const MAX_PARTICLES = 260;
  const MAX_GEMS = 320;

  class Game {
    /**
     * @param {object} save   Spielstand (Skilltree + Perks werden eingerechnet)
     * @param {object} opts   {seed, startWeapon, callbacks, headless}
     */
    constructor(save, opts = {}) {
      this.save = save;
      this.opts = opts;
      this.rng = new RNG(opts.seed);
      this.cb = opts.callbacks || {};
      this.headless = !!opts.headless;
      this.metaStats = HDE.Meta.computeStats(save);
      this.unlocked = HDE.Meta.unlockedWeapons(save.bestStage);
      this.worldSeed = this.rng.int(1, 1e9);
      this.viewW = 1066;
      this.viewH = C.VIEW_H;

      this.state = 'playing'; // playing | levelup | dead
      this.time = 0;
      this.stage = 1;
      this.stageTime = 0;
      this.kills = 0;
      this.bossKills = 0;
      this.collectedShells = 0;
      this.level = 1;
      this.xp = 0;
      this.pendingLevelUps = 0;
      this.pendingChests = 0;
      this.choices = [];
      this.choiceKind = 'level';
      this.rerollsLeft = 0;
      this.nextId = 1;
      this.result = null;

      this.enemies = [];
      this.projectiles = [];
      this.eprojectiles = [];
      this.gems = [];
      this.pickups = [];
      this.zones = [];
      this.companions = [];
      this.floaters = [];
      this.particles = [];
      this.fx = [];
      this.explosionQueue = [];
      this.boss = null;
      this.spawnAcc = 4;
      this.hordeDone = {};
      this.itemBag = [];
      this.lastItem = null;
      this.patchCache = new Map();
      this.peelT = 0;
      this.auraT = 0;
      this.shake = 0;
      this.input = { x: 0, y: 0 };

      // Raster
      this.gridHead = new Int32Array(GRID_BUCKETS).fill(-1);
      this.gridNext = new Int32Array(1024);
      this.qid = 1;

      this.weapons = [];
      this.passives = {};
      this.player = {
        x: 0, y: 0, vx: 0, vy: 0, r: 10, hp: 100, maxHp: 100,
        face: { x: 1, y: 0 }, iframes: 0, burn: 0, burnT: 0, slowT: 0,
        moving: false, anim: 0, flash: 0, invuln: 0, hitFlash: 0,
      };
      this.recompute(true);

      // Startwaffe
      let start = opts.startWeapon || 'baton';
      if (!this.unlocked.includes(start)) start = 'baton';
      this.addWeapon(start, this.stats.startWeaponLvl);
      this.startWeapon = start;
      if (this.stats.startRandom > 0) {
        const pool = this.unlocked.filter(w => w !== start);
        if (pool.length) this.addWeapon(this.rng.pick(pool), 1);
      }
      this.level = 1 + this.stats.startLevel;
      this.pendingLevelUps = this.stats.startLevel;
      this.rerollsLeft = this.stats.rerolls;
      this.player.hp = this.player.maxHp;
      this.refillItemBag();
    }

    /* ------------------------------------------------------------ Hilfen */
    setView(w, h) { this.viewW = w; this.viewH = h; }
    sfx(name) { if (this.cb.sfx && !this.headless) this.cb.sfx(name); }
    toast(text) { if (this.cb.toast) this.cb.toast(text); }
    get biome() { return D.BIOMES[(this.stage - 1) % D.BIOMES.length]; }

    xpNeed(level) { return Math.floor(5 + level * 4 + Math.pow(level, 1.6) * 0.8); }

    /* Gegner-Skalierung pro Stage */
    scaling() {
      const st = this.stage - 1;
      const t = clamp(this.stageTime / C.STAGE_LEN, 0, 1.5);
      const s = this.stats;
      return {
        hp: Math.pow(1.17, st) * (1 + 0.6 * t) * s.enemyHp,
        dmg: 1 + 0.08 * st,
        speed: Math.min(1 + 0.02 * st, 1.45) * s.enemySpeed,
        xp: 1 + 0.12 * st,
      };
    }

    /* ------------------------------------------------------------ Werte neu berechnen */
    recompute(first) {
      const s = Object.assign({}, this.metaStats);
      for (const id in this.passives) D.PASSIVES[id].apply(s, this.passives[id]);
      s.maxHp = Math.max(10, Math.round(s.maxHp));
      this.stats = s;
      const p = this.player;
      if (p) {
        const diff = s.maxHp - p.maxHp;
        p.maxHp = s.maxHp;
        if (first) p.hp = p.maxHp;
        else if (diff > 0) p.hp += diff;
        p.hp = Math.min(p.hp, p.maxHp);
      }
      for (const w of this.weapons) w.stats = this.computeWeaponStats(w);
    }

    computeWeaponStats(w) {
      const def = D.WEAPONS[w.id];
      const s = this.stats;
      const b = Object.assign({}, def.base);
      const lv = def.levels || D.DEF_LEVELS;
      let dmgA = 0, cdA = 0, areaA = 0, spdA = 0;
      for (let i = 2; i <= w.level; i++) {
        const d = lv[i - 2] || {};
        if (d.count) b.count += d.count;
        if (d.dmg) dmgA += d.dmg;
        if (d.cd) cdA += d.cd;
        if (d.area) areaA += d.area;
        if (d.speed) spdA += d.speed;
        if (d.bounces) b.bounces += d.bounces;
        if (d.pierce) b.pierce += d.pierce;
      }
      let dmg = b.dmg * (1 + dmgA) * s.might;
      let area = (1 + areaA) * s.area;
      let cd = b.cd * Math.max(0.3, 1 + cdA) * s.cd;
      let count = b.count;
      if (w.evo) {
        dmg *= 1.6; area *= 1.25; cd *= 0.85;
        if (def.kind !== 'aura') count += 2;
      }
      const o = Object.assign({}, b);
      o.dmg = dmg;
      o.area = area;
      o.cd = b.cd > 0 ? Math.max(0.12, cd) : 0;
      o.count = count;
      if (b.range) o.range = b.range * area;
      if (b.size) o.size = b.size * area;
      if (b.blast) o.blast = b.blast * area;
      if (b.pop) o.pop = b.pop * area;
      if (b.dist) o.dist = b.dist * area;
      if (b.life) o.life = b.life * s.duration;
      if (b.dur) o.dur = b.dur * s.duration;
      if (b.speed) o.speed = b.speed * (1 + spdA) * s.projSpeed;
      if (b.hitCd) o.hitCd = b.hitCd * Math.sqrt(s.cd);
      return o;
    }

    /* ------------------------------------------------------------ Waffen / Passive */
    addWeapon(id, level = 1) {
      const w = {
        id, level, slot: this.weapons.length, kind: D.WEAPONS[id].kind,
        cdT: 0.4, pending: 0, shotT: 0, shotIdx: 0, angle: this.rng.range(0, TAU), flip: 1,
        evo: false, stats: null, pos: [], tickT: 0, markT: 0,
      };
      this.weapons.push(w);
      w.stats = this.computeWeaponStats(w);
      return w;
    }
    getWeapon(id) { return this.weapons.find(w => w.id === id); }
    evoAvailable(w) {
      const def = D.WEAPONS[w.id];
      return w.level >= C.WEAPON_MAX && !w.evo && (this.passives[def.evo.passive] || 0) > 0;
    }

    /* ------------------------------------------------------------ Level-Up */
    generateChoices(chest) {
      const s = this.stats;
      const cand = [];
      // Evolutionen haben Vorrang
      for (const w of this.weapons) {
        if (this.evoAvailable(w)) {
          const e = D.WEAPONS[w.id].evo;
          cand.push({ weight: 1000, c: { type: 'evo', id: w.id, icon: D.WEAPONS[w.id].icon, title: e.name, tag: '⭐ EVOLUTION', desc: e.desc + ' (Mehr Schaden, mehr Anzahl, mehr Fläche)' } });
        }
      }
      const partner = new Set(this.weapons.map(w => D.WEAPONS[w.id].evo.passive));
      for (const w of this.weapons) {
        if (w.level < C.WEAPON_MAX && !w.evo) {
          const def = D.WEAPONS[w.id];
          cand.push({ weight: 3, c: { type: 'weapon_up', id: w.id, icon: def.icon, title: def.name, tag: `Level ${w.level + 1}`, desc: D.describeWeaponLevel(w.id, w.level + 1) } });
        }
      }
      if (this.weapons.length < C.MAX_WEAPONS) {
        for (const id of this.unlocked) {
          if (this.getWeapon(id)) continue;
          const def = D.WEAPONS[id];
          cand.push({ weight: 2, c: { type: 'weapon_new', id, icon: def.icon, title: def.name, tag: 'NEUE WAFFE', desc: def.desc } });
        }
      }
      for (const id in this.passives) {
        const def = D.PASSIVES[id], l = this.passives[id];
        if (l < def.max) cand.push({ weight: 2.5 + (partner.has(id) ? 1.5 : 0), c: { type: 'passive_up', id, icon: def.icon, title: def.name, tag: `Level ${l + 1}`, desc: def.desc } });
      }
      if (Object.keys(this.passives).length < C.MAX_PASSIVES) {
        for (const id in D.PASSIVES) {
          if (this.passives[id]) continue;
          const def = D.PASSIVES[id];
          cand.push({ weight: 1.5 + (partner.has(id) ? 2 : 0), c: { type: 'passive_new', id, icon: def.icon, title: def.name, tag: 'NEUES ITEM', desc: def.desc } });
        }
      }
      const want = s.choices + (chest ? 1 : 0);
      const out = [];
      const pool = cand.slice();
      while (out.length < want && pool.length) {
        let total = 0;
        for (const x of pool) total += x.weight;
        let r = this.rng.next() * total, idx = 0;
        for (; idx < pool.length - 1; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
        const pick = pool.splice(idx, 1)[0].c;
        if ((pick.type === 'weapon_up' || pick.type === 'passive_up') && this.rng.chance(s.wonderUp)) {
          pick.wonder = true;
          pick.tag = '🧬 DOPPEL-UPGRADE';
        }
        out.push(pick);
      }
      if (!out.length) {
        out.push({ type: 'heal', icon: '🍗', title: 'Hühnchen', tag: 'BONUS', desc: 'Heilt 50% deiner HP.' });
        out.push({ type: 'shells', icon: '🥚', title: 'Eierschalen', tag: 'BONUS', desc: `+${10 + this.stage * 3} Eierschalen.` });
      }
      return out;
    }

    openLevelUp(kind) {
      this.state = 'levelup';
      this.choiceKind = kind;
      this.choices = this.generateChoices(kind === 'chest');
      this.sfx('levelup');
      if (this.cb.levelup) this.cb.levelup(this.choices, kind);
    }

    applyChoice(c) {
      const times = c.wonder ? 2 : 1;
      switch (c.type) {
        case 'weapon_new': this.addWeapon(c.id, 1); break;
        case 'weapon_up': {
          const w = this.getWeapon(c.id);
          w.level = Math.min(C.WEAPON_MAX, w.level + times);
          break;
        }
        case 'evo': this.getWeapon(c.id).evo = true; break;
        case 'passive_new': this.passives[c.id] = 1; if (c.wonder) this.passives[c.id] = 2; break;
        case 'passive_up': this.passives[c.id] = Math.min(D.PASSIVES[c.id].max, this.passives[c.id] + times); break;
        case 'heal': this.healPlayer(this.player.maxHp * 0.5); break;
        case 'shells': this.collectedShells += 10 + this.stage * 3; break;
      }
      this.recompute();
    }

    /** Spieler wählt Karte i */
    pickChoice(i) {
      if (this.state !== 'levelup') return false;
      const c = this.choices[i];
      if (!c) return false;
      this.applyChoice(c);
      this.finishLevelUp();
      return true;
    }

    skipChoice() {
      if (this.state !== 'levelup') return false;
      this.healPlayer(this.player.maxHp * 0.1);
      this.finishLevelUp();
      return true;
    }

    reroll() {
      if (this.state !== 'levelup' || this.rerollsLeft <= 0) return false;
      this.rerollsLeft--;
      this.choices = this.generateChoices(this.choiceKind === 'chest');
      if (this.cb.levelup) this.cb.levelup(this.choices, this.choiceKind);
      return true;
    }

    finishLevelUp() {
      if (this.choiceKind === 'chest') this.pendingChests = Math.max(0, this.pendingChests - 1);
      else this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
      this.choices = [];
      this.state = 'playing';
      this.checkPending();
    }

    checkPending() {
      if (this.state !== 'playing') return;
      if (this.pendingChests > 0) this.openLevelUp('chest');
      else if (this.pendingLevelUps > 0) this.openLevelUp('level');
    }

    addXp(v) {
      this.xp += v * this.stats.xp;
      let need = this.xpNeed(this.level);
      while (this.xp >= need) {
        this.xp -= need;
        this.level++;
        this.pendingLevelUps++;
        need = this.xpNeed(this.level);
      }
    }

    healPlayer(v) {
      const p = this.player;
      p.hp = Math.min(p.maxHp, p.hp + v);
    }

    /* ------------------------------------------------------------ Hauptupdate */
    update(dt) {
      if (this.state === 'dead') return;
      if (this.state === 'levelup') return;
      this.checkPending();
      if (this.state !== 'playing') return;

      this.time += dt;
      if (!this.boss) this.stageTime += dt;
      this.shake = Math.max(0, this.shake - dt * 3);

      this.updatePlayer(dt);
      this.buildGrid();
      this.updateWeapons(dt);
      this.updatePerks(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateEnemyProjectiles(dt);
      this.updateZones(dt);
      this.updateCompanions(dt);
      this.updatePickups(dt);
      this.processExplosions();
      this.updateSpawner(dt);
      this.updateStage();
      this.updateFx(dt);
      this.compact();
    }

    /* ------------------------------------------------------------ Spieler */
    updatePlayer(dt) {
      const p = this.player, s = this.stats;
      let ix = this.input.x, iy = this.input.y;
      const len = Math.hypot(ix, iy);
      if (len > 1) { ix /= len; iy /= len; }
      let sp = s.speed;
      if (p.slowT > 0) { p.slowT -= dt; sp *= 0.65; }
      const tx = ix * sp, ty = iy * sp;
      if (s.slide) {
        const k = Math.min(1, 3.2 * dt);
        p.vx += (tx - p.vx) * k;
        p.vy += (ty - p.vy) * k;
      } else { p.vx = tx; p.vy = ty; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.moving = len > 0.1;
      if (p.moving) {
        p.face.x = this.input.x / len;
        p.face.y = this.input.y / len;
        p.anim += dt * 9;
      }
      if (p.iframes > 0) p.iframes -= dt;
      if (p.invuln > 0) p.invuln -= dt;
      if (p.flash > 0) p.flash -= dt;
      if (s.regen > 0) this.healPlayer(s.regen * dt);
      if (p.burn > 0) {
        p.burn -= dt; p.burnT -= dt;
        if (p.burnT <= 0) { p.burnT = 0.5; this.hurtPlayer(2 * this.scaling().dmg, { dot: true }); }
      }
    }

    hurtPlayer(amount, o = {}) {
      const p = this.player;
      if (this.state !== 'playing') return;
      if (p.invuln > 0) return;
      if (!o.dot && p.iframes > 0) return;
      const s = this.stats;
      let dmg = Math.max(1, amount * s.dmgTaken - s.armor);
      p.hp -= dmg;
      if (!o.dot) { p.iframes = 0.45; this.shake = Math.min(1, this.shake + 0.25); this.sfx('hurt'); }
      p.flash = 0.12;
      this.addFloater(p.x, p.y - 18, dmg, false, '#ff5a5a');
      if (p.hp <= 0) {
        if (s.revives > 0) {
          s.revives--;
          this.metaStats.revives = Math.max(0, this.metaStats.revives - 1);
          p.hp = p.maxHp * 0.5;
          p.invuln = 2.0;
          this.shockwave(p.x, p.y, 260, 40 * this.stats.might, 600);
          this.toast('Wiederbelebt!');
          this.sfx('revive');
        } else {
          p.hp = 0;
          this.die();
        }
      }
    }

    die() {
      if (this.state === 'dead') return;
      this.state = 'dead';
      const reward = Math.floor((this.collectedShells + (this.stage - 1) * 8 + this.kills * 0.04) * this.stats.shell);
      this.result = {
        stage: this.stage, time: this.time, level: this.level,
        kills: this.kills, bossKills: this.bossKills,
        collected: this.collectedShells, shells: reward,
      };
      this.sfx('die');
      if (this.cb.death) this.cb.death(this.result);
    }

    /* ------------------------------------------------------------ Raster / Abfragen */
    gridBucket(cx, cy) { return ((Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0) & (GRID_BUCKETS - 1); }

    buildGrid() {
      const head = this.gridHead;
      head.fill(-1);
      const en = this.enemies;
      if (this.gridNext.length < en.length + 64) this.gridNext = new Int32Array(en.length * 2 + 64);
      const next = this.gridNext;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e.dead || e.boss) continue;
        const b = this.gridBucket(Math.floor(e.x / GRID_CELL), Math.floor(e.y / GRID_CELL));
        next[i] = head[b];
        head[b] = i;
      }
    }

    /** Ruft fn(e) für alle Gegner im Kreis (inkl. Gegnerradius) auf */
    query(x, y, r, fn) {
      const en = this.enemies, head = this.gridHead, next = this.gridNext;
      const qid = ++this.qid;
      const m = r + 22;
      const x0 = Math.floor((x - m) / GRID_CELL), x1 = Math.floor((x + m) / GRID_CELL);
      const y0 = Math.floor((y - m) / GRID_CELL), y1 = Math.floor((y + m) / GRID_CELL);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          let i = head[this.gridBucket(cx, cy)];
          while (i !== -1) {
            const e = en[i];
            i = next[i];
            if (!e || e.dead || e.q === qid) continue;
            const dx = e.x - x, dy = e.y - y, rr = r + e.r;
            if (dx * dx + dy * dy <= rr * rr) { e.q = qid; fn(e); }
          }
        }
      }
      const b = this.boss;
      if (b && !b.dead && b.q !== qid) {
        const dx = b.x - x, dy = b.y - y, rr = r + b.r;
        if (dx * dx + dy * dy <= rr * rr) { b.q = qid; fn(b); }
      }
    }

    nearestEnemy(x, y, maxR, ex1, ex2) {
      let best = null, bd = maxR * maxR;
      const en = this.enemies;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e.dead || e.id === ex1 || e.id === ex2) continue;
        const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    }

    /** zufälliger Gegner aus den k nächsten */
    randomNearEnemy(x, y, maxR, k = 5) {
      const list = [];
      const en = this.enemies;
      const r2 = maxR * maxR;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e.dead) continue;
        const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
        if (d > r2) continue;
        if (list.length < k) { list.push({ e, d }); list.sort((a, b) => a.d - b.d); }
        else if (d < list[k - 1].d) { list[k - 1] = { e, d }; list.sort((a, b) => a.d - b.d); }
      }
      return list.length ? list[this.rng.int(0, list.length - 1)].e : null;
    }

    /* ------------------------------------------------------------ Gras-Flecken */
    getPatch(cx, cy) {
      const key = cx + ',' + cy;
      let p = this.patchCache.get(key);
      if (p !== undefined) return p;
      const g = this.stats.grass;
      const prob = Math.min(0.9, 0.5 * g);
      const h = hash2(cx, cy, this.worldSeed);
      if (h < prob) {
        p = {
          x: cx * C.CHUNK + hash2(cx, cy, this.worldSeed + 1) * C.CHUNK,
          y: cy * C.CHUNK + hash2(cx, cy, this.worldSeed + 2) * C.CHUNK,
          r: (55 + hash2(cx, cy, this.worldSeed + 3) * 45) * (g > 1 ? 1.2 : 1),
          v: Math.floor(hash2(cx, cy, this.worldSeed + 4) * 3),
        };
      } else p = null;
      if (this.patchCache.size > 600) this.patchCache.clear();
      this.patchCache.set(key, p);
      return p;
    }

    /** Alle Grasflecken in Chunks rund um (x,y) */
    patchesNear(x, y, range = 1) {
      const out = [];
      const cx = Math.floor(x / C.CHUNK), cy = Math.floor(y / C.CHUNK);
      for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
          const p = this.getPatch(cx + i, cy + j);
          if (p) out.push(p);
        }
      }
      return out;
    }

    /* ------------------------------------------------------------ Schaden an Gegnern */
    dmgMult() {
      const p = this.player;
      return p.hp < p.maxHp * 0.4 ? 1 + this.stats.berserk : 1;
    }

    hitEnemy(e, amount, o = {}) {
      if (e.dead) return false;
      const s = this.stats;
      let dmg = amount * this.dmgMult();
      let crit = false;
      if (!o.noCrit && this.rng.next() < s.crit) { dmg *= s.critMul; crit = true; }
      if (e.chill > 0) dmg *= 1.5 * (s.grass > 1 ? 1.2 : 1);
      if (e.vuln > this.time) dmg *= 1.15;
      if (o.vsChill && e.chill > 0) dmg *= 2;
      e.hp -= dmg;
      e.flash = 0.09;
      if (!o.noText) this.addFloater(e.x, e.y - e.r - 4, dmg, crit);
      if (o.kb) {
        let dx = e.x - (o.fx != null ? o.fx : this.player.x), dy = e.y - (o.fy != null ? o.fy : this.player.y);
        const d = Math.hypot(dx, dy) || 1;
        const f = o.kb * (e.boss ? 0.12 : 1);
        e.kx += (dx / d) * f; e.ky += (dy / d) * f;
      }
      if (o.stun && !e.boss) e.stun = Math.max(e.stun, o.stun);
      if (o.slow) { e.slowT = Math.max(e.slowT, o.slowT || 1.5); e.slowF = Math.min(e.slowF, 1 - o.slow); }
      if (o.burn) { e.burn = 2.5; e.burnDps = Math.max(e.burnDps, dmg * 0.35); }
      if (o.vuln) e.vuln = this.time + 3;
      if (e.hp <= 0) { this.killEnemy(e); return true; }
      this.sfx('hit');
      return false;
    }

    /* ------------------------------------------------------------ Gegner erzeugen */
    availableItems() {
      return Object.keys(D.EGGES).filter(k => D.EGGES[k].unlock <= this.stage);
    }

    /** Beutel mischen: jeder neue Egge bekommt einen anderen Gegenstand als der vorherige */
    refillItemBag() {
      const av = this.availableItems();
      this.rng.shuffle(av);
      if (av.length > 1 && av[av.length - 1] === this.lastItem) {
        const t = av[0]; av[0] = av[av.length - 1]; av[av.length - 1] = t;
      }
      this.itemBag = av;
    }

    nextItem() {
      if (!this.itemBag.length) this.refillItemBag();
      const k = this.itemBag.pop();
      this.lastItem = k;
      return k;
    }

    spawnPos(minD = 30, maxD = 90) {
      const a = this.rng.range(0, TAU);
      const d = Math.hypot(this.viewW, this.viewH) / 2 + this.rng.range(minD, maxD);
      return { x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d };
    }

    makeEnemy(typeKey, x, y, o = {}) {
      const def = D.EGGES[typeKey];
      const sc = this.scaling();
      const elite = !!o.elite;
      const mul = elite ? 5 : 1;
      const e = {
        id: this.nextId++, type: typeKey, def, x, y, kx: 0, ky: 0,
        r: def.r * (elite ? 1.3 : 1), scale: def.scale * (elite ? 1.3 : 1),
        hp: def.hp * sc.hp * mul * (o.hpMul || 1), maxHp: 0,
        speed: def.speed * sc.speed * this.rng.range(0.92, 1.08) * (elite ? 1.1 : 1),
        dmg: def.dmg * sc.dmg * (elite ? 1.4 : 1),
        xp: def.xp * sc.xp * (elite ? 6 : 1),
        elite, boss: false, dead: false, state: 'chase',
        stun: 0, slowT: 0, slowF: 1, burn: 0, burnT: 0, burnDps: 0, flash: 0, vuln: 0,
        chill: 0, chillCd: 0, scanT: this.rng.range(0, 0.4), patch: null, seekT: 0,
        stoner: this.rng.chance(0.55), timid: this.rng.chance(this.stats.timid),
        dance: 0, danceF: 1, smoke: 0, buff: 0, q: 0, mowT: 0,
        shootT: this.rng.range(0.5, def.shootCd || 2), dashT: this.rng.range(1, 3), dashing: 0, tele: 0, dx: 0, dy: 0,
        hitT: new Float32Array(8), anim: this.rng.range(0, 10), wob: this.rng.range(0, TAU),
      };
      e.maxHp = e.hp;
      this.enemies.push(e);
      return e;
    }

    spawnRegular(o = {}) {
      const key = o.type || this.nextItem();
      const pos = o.pos || this.spawnPos();
      const elite = o.elite !== undefined ? o.elite : this.rng.chance(this.stats.wonder + (this.stage >= 2 ? 0.003 : 0));
      return this.makeEnemy(key, pos.x, pos.y, { elite });
    }

    spawnBoss() {
      const stage = this.stage, st = stage - 1;
      const mega = stage % C.MEGA_EVERY === 0;
      const items = Object.keys(D.EGGES);
      const item = items[(stage - 1) % items.length];
      const biome = this.biome;
      const base = D.BOSS_NAMES[(Math.floor(stage / C.MEGA_EVERY) + stage) % D.BOSS_NAMES.length];
      const name = mega ? biome.mega : base;
      const pos = this.spawnPos(60, 120);
      const sc = this.scaling();
      const e = this.makeEnemy(item, pos.x, pos.y);
      e.boss = true;
      e.mega = mega;
      e.bossName = name;
      e.elite = false;
      e.r = mega ? 48 : 36;
      e.scale = mega ? 3.6 : 2.6;
      e.hp = 1800 * Math.pow(1.26, st) * (mega ? 3.5 : 1) * this.stats.bossHp;
      e.maxHp = e.hp;
      e.speed = 50 * Math.min(1 + 0.015 * st, 1.4);
      e.dmg = 14 * sc.dmg;
      e.xp = 30 * sc.xp;
      e.stoner = false; e.timid = false;
      const all = ['dash', 'shock', 'summon', 'spray'];
      if (mega) e.patterns = all.slice();
      else {
        const rr = new RNG(this.worldSeed + stage * 7919);
        rr.shuffle(all);
        e.patterns = all.slice(0, 2);
      }
      e.pi = 0; e.bstate = 'move'; e.bt = 2.2; e.bphase = 0; e.wave = 0; e.enraged = false;
      this.boss = e;
      this.sfx('boss');
      if (this.cb.boss) this.cb.boss({ name, mega, stage });
      return e;
    }

    /* ------------------------------------------------------------ Spawner */
    updateSpawner(dt) {
      const st = this.stage, s = this.stats;
      const rate = (1.5 + 0.035 * this.stageTime) * (1 + 0.15 * (st - 1)) * s.enemyCount * (this.boss ? 0.5 : 1);
      this.spawnAcc += rate * dt;
      const cap = Math.min(70 + 28 * st, 380) * Math.min(1.3, s.enemyCount);
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        if (this.enemies.length < cap) this.spawnRegular();
      }
      // Horden-Ringe
      if (st >= 2 && !this.boss) {
        for (const t of [40, 85]) {
          const k = st + ':' + t;
          if (this.stageTime >= t && !this.hordeDone[k]) {
            this.hordeDone[k] = true;
            const n = Math.min(14 + 3 * st, 44);
            const R = Math.hypot(this.viewW, this.viewH) / 2 + 40;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU;
              this.spawnRegular({ pos: { x: this.player.x + Math.cos(a) * R, y: this.player.y + Math.sin(a) * R }, elite: false });
            }
            this.toast('Egge-Horde!');
          }
        }
      }
    }

    updateStage() {
      if (!this.boss && this.stageTime >= C.STAGE_LEN) this.spawnBoss();
    }

    onBossDead(e) {
      this.boss = null;
      this.bossKills++;
      const mega = e.mega;
      // alle normalen Gegner platzen zu XP
      for (const o of this.enemies) {
        if (o.dead || o.boss) continue;
        o.dead = true;
        this.dropGem(o.x, o.y, o.xp);
      }
      this.eprojectiles.length = 0;
      this.pickups.push({ kind: 'chest', x: e.x, y: e.y, v: 1, life: 99999 });
      if (mega) this.pickups.push({ kind: 'chest', x: e.x + 40, y: e.y + 10, v: 1, life: 99999 });
      this.dropShell(e.x - 30, e.y, 12 + this.stage * 4);
      this.healPlayer(this.player.maxHp * 0.3);
      this.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 0, max: 500, t: 0, dur: 0.8, color: '#ffe066' });
      this.stage++;
      this.stageTime = 0;
      this.hordeDone = {};
      this.refillItemBag();
      this.shake = 1;
      this.sfx('bossdead');
      if (this.cb.stage) this.cb.stage({ stage: this.stage, mega, name: this.biome.name });
    }

    /* ------------------------------------------------------------ Gegner-Update */
    updateEnemies(dt) {
      const p = this.player, s = this.stats, en = this.enemies, time = this.time;
      const hpScale = this.scaling();
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e.dead) continue;
        // Timer
        if (e.flash > 0) e.flash -= dt;
        if (e.stun > 0) e.stun -= dt;
        if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
        if (e.burn > 0) {
          e.burn -= dt; e.burnT -= dt;
          if (e.burnT <= 0) { e.burnT = 0.5; if (this.hitEnemy(e, e.burnDps * 0.5, { noCrit: true, noText: this.floaters.length > 20 })) continue; }
        }
        if (e.def.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.def.regen * dt);
        if (e.chillCd > 0) e.chillCd -= dt;
        e.anim += dt;

        let dx = p.x - e.x, dy = p.y - e.y;
        let d = Math.hypot(dx, dy) || 1;

        // zu weit weg -> neu an den Rand setzen (hält die Horde dicht)
        if (!e.boss && d > Math.hypot(this.viewW, this.viewH) * 0.5 + 520) {
          const pos = this.spawnPos(20, 80);
          e.x = pos.x; e.y = pos.y;
          dx = p.x - e.x; dy = p.y - e.y; d = Math.hypot(dx, dy) || 1;
        }
        const nx = dx / d, ny = dy / d;

        let f = e.slowF;
        if (e.dance > time) f *= e.danceF;
        if (e.smoke > time) f *= 0.5;
        if (e.buff > time) f *= 1.25;

        let mx = 0, my = 0;
        if (e.boss) {
          const r = this.bossAI(e, dt, nx, ny, d);
          mx = r.mx; my = r.my;
        } else if (e.stun > 0) {
          // betäubt
        } else if (e.state === 'chill') {
          e.chill -= dt;
          if (e.chill <= 0) { e.state = 'chase'; e.chill = 0; e.chillCd = 9; }
          else if (!this.headless && this.rng.chance(dt * 1.6)) this.puff(e.x, e.y - e.r, '#bfe8b0');
        } else if (e.state === 'seek') {
          e.seekT -= dt;
          const pt = e.patch;
          const pdx = pt.x - e.x, pdy = pt.y - e.y, pd = Math.hypot(pdx, pdy) || 1;
          if (pd < pt.r * 0.55 || e.seekT <= 0) {
            if (pd < pt.r * 0.55) { e.state = 'chill'; e.chill = this.rng.range(1.8, 3.2) * s.grass; }
            else { e.state = 'chase'; e.chillCd = 5; }
          } else { mx = (pdx / pd) * e.speed * f; my = (pdy / pd) * e.speed * f; }
        } else {
          // Gras-Problem: bekiffte Egges suchen Grasflecken auf
          e.scanT -= dt;
          if (e.scanT <= 0) {
            e.scanT = 0.45;
            if (e.stoner && e.chillCd <= 0 && e.def.ai !== 'flee') {
              const list = this.patchesNear(e.x, e.y, 1);
              let best = null, bd = 260 * 260;
              for (const pt of list) {
                const ddx = pt.x - e.x, ddy = pt.y - e.y, dd = ddx * ddx + ddy * ddy;
                if (dd < bd) { bd = dd; best = pt; }
              }
              if (best) { e.state = 'seek'; e.patch = best; e.seekT = 5; }
            }
          }
          if (e.state === 'chase') {
            const ai = e.def.ai;
            if (e.timid && d < 150) { mx = -nx * e.speed * f; my = -ny * e.speed * f; }
            else if (ai === 'chase') {
              const w = Math.sin(e.anim * 2 + e.wob) * 0.25;
              mx = (nx - ny * w) * e.speed * f; my = (ny + nx * w) * e.speed * f;
              if (e.def.aura) this.pipeAura(e);
            } else if (ai === 'shooter') {
              const range = e.def.range;
              if (d > range) { mx = nx * e.speed * f; my = ny * e.speed * f; }
              else if (d < range * 0.7) { mx = -nx * e.speed * 0.6 * f; my = -ny * e.speed * 0.6 * f; }
              e.shootT -= dt;
              if (e.shootT <= 0 && d < range * 1.4) {
                e.shootT = e.def.shootCd * this.rng.range(0.85, 1.2);
                this.eprojectiles.push({ kind: 'flame', x: e.x, y: e.y, vx: nx * 170, vy: ny * 170, r: 7, dmg: 5 * hpScale.dmg, life: 3 });
              }
            } else if (ai === 'dasher') {
              if (e.dashing > 0) {
                e.dashing -= dt;
                mx = e.dx * e.speed * 4.2; my = e.dy * e.speed * 4.2;
                if (!this.headless && this.rng.chance(0.5)) this.puff(e.x, e.y, '#e8e8f0');
              } else if (e.tele > 0) {
                e.tele -= dt;
                if (e.tele <= 0) { e.dashing = 0.5; e.dx = nx; e.dy = ny; }
              } else {
                mx = nx * e.speed * f; my = ny * e.speed * f;
                e.dashT -= dt;
                if (e.dashT <= 0 && d < 330) { e.dashT = this.rng.range(2.4, 3.6); e.tele = 0.4; }
              }
            } else if (ai === 'flee') {
              if (d < 320) { mx = -nx * e.speed * f; my = -ny * e.speed * f; }
              else { mx = Math.cos(e.wob + e.anim * 0.3) * e.speed * 0.3; my = Math.sin(e.wob + e.anim * 0.3) * e.speed * 0.3; }
            }
            if (s.pull && d < 220 && !e.boss) { e.kx += nx * 70 * dt * 6; e.ky += ny * 70 * dt * 6; }
          }
        }

        // Rückstoß
        e.x += (mx + e.kx) * dt;
        e.y += (my + e.ky) * dt;
        const kd = Math.max(0, 1 - 7 * dt);
        e.kx *= kd; e.ky *= kd;

        // Abstoßung zwischen Egges (jede zweite Frame)
        if (!e.boss && ((e.id + Math.floor(time * 60)) & 1) === 0) this.separate(e, dt);

        // Kontaktschaden
        if (e.dmg > 0 && e.state !== 'chill' && e.stun <= 0) {
          const rr = e.r * 0.85 + p.r;
          const px = p.x - e.x, py = p.y - e.y;
          if (px * px + py * py < rr * rr) {
            let dm = e.dmg;
            if (e.boss && e.dashing > 0) dm *= 1.5;
            this.hurtPlayer(dm);
            if (e.type === 'lighter' || e.type === 'vape') { p.burn = Math.max(p.burn, e.type === 'lighter' ? 2 : 0); }
          }
        }
      }
    }

    pipeAura(e) {
      // Pfeifen-Egge: Egges in der Nähe werden schneller
      const t = this.time + 0.3;
      this.query(e.x, e.y, 130, o => { if (o !== e) o.buff = t; });
    }

    separate(e, dt) {
      const x = e.x, y = e.y, r = e.r;
      let pushed = 0;
      const cx = Math.floor(x / GRID_CELL), cy = Math.floor(y / GRID_CELL);
      const en = this.enemies, head = this.gridHead, next = this.gridNext;
      for (let i = -1; i <= 1 && pushed < 4; i++) {
        for (let j = -1; j <= 1 && pushed < 4; j++) {
          let k = head[this.gridBucket(cx + i, cy + j)];
          while (k !== -1 && pushed < 4) {
            const o = en[k];
            k = next[k];
            if (!o || o === e || o.dead) continue;
            const dx = x - o.x, dy = y - o.y;
            const rr = (r + o.r) * 0.75;
            const d2 = dx * dx + dy * dy;
            if (d2 < rr * rr && d2 > 0.0001) {
              const d = Math.sqrt(d2);
              const f = ((rr - d) / rr) * 90 * dt * 2;
              e.x += (dx / d) * f; e.y += (dy / d) * f;
              pushed++;
            }
          }
        }
      }
    }

    /* ------------------------------------------------------------ Boss-KI */
    bossAI(e, dt, nx, ny, d) {
      const hpFrac = e.hp / e.maxHp;
      if (!e.enraged && hpFrac < 0.5) { e.enraged = true; this.toast(e.bossName + ' wird wütend!'); }
      const sp = e.speed * (e.enraged ? 1.25 : 1) * e.slowF * (e.slowT > 0 ? 1 : 1);
      let mx = 0, my = 0;
      const rest = e.enraged ? 1.5 : 2.4;
      if (e.bstate === 'move') {
        mx = nx * sp; my = ny * sp;
        e.bt -= dt;
        if (e.bt <= 0) {
          const pat = e.patterns[e.pi % e.patterns.length];
          e.pi++;
          e.pattern = pat;
          e.bstate = 'tele';
          e.bt = pat === 'dash' ? 0.9 : pat === 'shock' ? 1.0 : 0.7;
          e.tele = e.bt;
          e.teleMax = e.bt;
        }
      } else if (e.bstate === 'tele') {
        e.bt -= dt; e.tele = e.bt;
        if (e.pattern === 'dash') { e.dx = nx; e.dy = ny; }
        if (e.bt <= 0) {
          e.tele = 0;
          if (e.pattern === 'dash') { e.bstate = 'dash'; e.bt = 0.6; e.dashing = 0.6; }
          else if (e.pattern === 'shock') {
            const R = 190;
            this.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 0, max: R, t: 0, dur: 0.4, color: '#ff6a3a' });
            const p = this.player;
            if (Math.hypot(p.x - e.x, p.y - e.y) < R + p.r) {
              this.hurtPlayer(e.dmg * 1.4);
              p.vx += nx * 400; p.vy += ny * 400;
            }
            this.shake = 1;
            this.sfx('shock');
            e.bstate = 'move'; e.bt = rest;
          } else if (e.pattern === 'summon') {
            const n = Math.min(6 + Math.floor(this.stage / 2), 14);
            for (let i = 0; i < n && this.enemies.length < 420; i++) {
              const a = (i / n) * TAU;
              this.spawnRegular({ pos: { x: e.x + Math.cos(a) * (e.r + 30), y: e.y + Math.sin(a) * (e.r + 30) }, elite: false });
            }
            e.bstate = 'move'; e.bt = rest;
          } else if (e.pattern === 'spray') {
            this.bossSpray(e, 0);
            e.bstate = 'spray2'; e.bt = 0.5;
          }
        }
      } else if (e.bstate === 'dash') {
        e.bt -= dt; e.dashing = e.bt;
        mx = e.dx * sp * 8.5; my = e.dy * sp * 8.5;
        if (e.bt <= 0) { e.dashing = 0; e.bstate = 'move'; e.bt = rest; }
      } else if (e.bstate === 'spray2') {
        e.bt -= dt;
        if (e.bt <= 0) { this.bossSpray(e, 0.5); e.bstate = 'move'; e.bt = rest; }
      }
      return { mx, my };
    }

    bossSpray(e, rot) {
      const n = Math.min(14 + Math.floor(this.stage / 2), 30);
      const dm = e.dmg * 0.55;
      const base = this.rng.range(0, TAU) * 0 + rot;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * TAU;
        this.eprojectiles.push({ kind: 'leaf', x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 8, dmg: dm, life: 3.5 });
      }
      this.sfx('shoot');
    }

    /* ------------------------------------------------------------ Tod eines Gegners */
    killEnemy(e, silent) {
      if (e.dead) return;
      e.dead = true;
      this.kills++;
      const def = e.def;
      this.dropGem(e.x, e.y, e.xp);
      if (e.boss) {
        this.onBossDead(e);
        return;
      }
      // Eierschalen
      if (def.shells) this.dropShell(e.x, e.y, def.shells * (e.elite ? 2 : 1));
      else if (e.elite) this.dropShell(e.x, e.y, 5);
      else if (this.rng.chance(0.04)) this.dropShell(e.x, e.y, 1);
      if (!silent) {
        switch (def.death) {
          case 'smoke': this.addZone({ kind: 'smoke', x: e.x, y: e.y, r: 52, life: 3.2, max: 3.2 }); break;
          case 'puddle': this.addZone({ kind: 'puddle', x: e.x, y: e.y, r: 46, life: 5, max: 5 }); break;
          case 'heal': if (this.rng.chance(0.12)) this.pickups.push({ kind: 'heal', x: e.x, y: e.y, v: 18, life: 20 }); break;
          case 'split':
            for (let i = 0; i < 2; i++) {
              const m = this.makeEnemy('papers', e.x + this.rng.range(-8, 8), e.y + this.rng.range(-8, 8), { hpMul: 0.7 });
              m.kx = this.rng.range(-120, 120); m.ky = this.rng.range(-120, 120);
            }
            break;
        }
        if (this.stats.explode > 0 && this.rng.chance(this.stats.explode)) this.explosionQueue.push({ x: e.x, y: e.y });
        if (this.stats.chickens && this.kills % 10 === 0 && this.companions.length < 6) {
          this.companions.push({ a: this.rng.range(0, TAU), x: this.player.x, y: this.player.y, hitT: 0 });
          this.toast('Ein Huhn schließt sich an!');
        }
      }
      if (!this.headless) {
        for (let i = 0; i < 4; i++) this.particle(e.x, e.y, '#f0c8a0');
      }
    }

    processExplosions() {
      let n = 0;
      while (this.explosionQueue.length && n++ < 6) {
        const q = this.explosionQueue.shift();
        this.explodeAt(q.x, q.y, 55, 18 * this.stats.might * (1 + 0.1 * (this.stage - 1)));
      }
      this.explosionQueue.length = Math.min(this.explosionQueue.length, 30);
    }

    explodeAt(x, y, r, dmg, o = {}) {
      this.query(x, y, r, e => this.hitEnemy(e, dmg, { kb: 120, fx: x, fy: y, burn: o.burn, noText: this.floaters.length > 25 }));
      this.fx.push({ kind: 'boom', x, y, r: 0, max: r, t: 0, dur: 0.3, color: o.color || '#ffb347' });
      this.sfx('boom');
    }

    shockwave(x, y, r, dmg, kb) {
      this.query(x, y, r, e => this.hitEnemy(e, dmg, { kb, fx: x, fy: y }));
      this.fx.push({ kind: 'ring', x, y, r: 0, max: r, t: 0, dur: 0.5, color: '#ffffff' });
    }

    /* ------------------------------------------------------------ Drops */
    dropGem(x, y, v) {
      if (this.gems.length >= MAX_GEMS) {
        const g = this.gems[this.rng.int(0, this.gems.length - 1)];
        g.v += v;
        return;
      }
      this.gems.push({ x: x + this.rng.range(-6, 6), y: y + this.rng.range(-6, 6), v, mag: false, spd: 0 });
    }

    dropShell(x, y, v) {
      this.pickups.push({ kind: 'shell', x: x + this.rng.range(-8, 8), y: y + this.rng.range(-8, 8), v, life: 25 });
    }

    addZone(z) {
      let n = 0;
      for (const o of this.zones) if (o.kind === z.kind) n++;
      if (n > 18) {
        const i = this.zones.findIndex(o => o.kind === z.kind);
        if (i >= 0) this.zones.splice(i, 1);
      }
      this.zones.push(z);
    }

    updatePickups(dt) {
      const p = this.player, s = this.stats;
      const pr = s.pickup;
      const pr2 = pr * pr;
      for (let i = this.gems.length - 1; i >= 0; i--) {
        const g = this.gems[i];
        const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
        if (!g.mag && d2 < pr2) g.mag = true;
        if (g.mag) {
          g.spd = Math.min(700, g.spd + 1400 * dt);
          const d = Math.sqrt(d2) || 1;
          g.x += (dx / d) * g.spd * dt; g.y += (dy / d) * g.spd * dt;
          if (d < 14) { this.addXp(g.v); this.sfx('gem'); this.gems.splice(i, 1); }
        }
      }
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const k = this.pickups[i];
        k.life -= dt;
        if (k.life <= 0) { this.pickups.splice(i, 1); continue; }
        const dx = p.x - k.x, dy = p.y - k.y, d2 = dx * dx + dy * dy;
        const range = k.kind === 'chest' ? 30 : pr;
        if (!k.mag && d2 < range * range && k.kind !== 'chest') k.mag = true;
        if (k.mag) {
          const d = Math.sqrt(d2) || 1;
          k.x += (dx / d) * 420 * dt; k.y += (dy / d) * 420 * dt;
        }
        if (d2 < 16 * 16 || (k.kind === 'chest' && d2 < 30 * 30)) {
          if (k.kind === 'shell') { this.collectedShells += k.v; this.sfx('shell'); }
          else if (k.kind === 'heal') { this.healPlayer(k.v); this.sfx('heal'); }
          else if (k.kind === 'chest') { this.pendingChests++; this.sfx('chest'); }
          this.pickups.splice(i, 1);
        }
      }
    }

    /* ------------------------------------------------------------ Zonen */
    updateZones(dt) {
      const p = this.player;
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.life -= dt;
        if (z.kind === 'smoke') {
          const t = this.time + 0.25;
          this.query(z.x, z.y, z.r, e => { e.smoke = t; });
        } else if (z.kind === 'puddle') {
          if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r) p.slowT = Math.max(p.slowT, 0.2);
        } else if (z.kind === 'peel') {
          let hit = false;
          this.query(z.x, z.y, z.r, e => {
            if (hit || e.boss) return;
            hit = true;
            this.hitEnemy(e, z.dmg, { stun: 0.9, noCrit: true });
          });
          if (hit) { this.zones.splice(i, 1); continue; }
        } else if (z.kind === 'spikestrip') {
          z.tickT = (z.tickT || 0) - dt;
          if (z.tickT <= 0) {
            z.tickT = z.hitCd || 0.4;
            this.query(z.x, z.y, z.r, e => {
              this.hitEnemy(e, z.dmg, { kb: 25, noCrit: true });
            });
          }
        } else if (z.kind === 'gravity') {
          z.tickT -= dt;
          const pull = 230 * dt;
          const tick = z.tickT <= 0;
          if (tick) z.tickT = 0.3;
          this.query(z.x, z.y, z.r, e => {
            const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
            if (!e.boss) { const m = Math.min(pull, d); e.x += (dx / d) * m; e.y += (dy / d) * m; }
            if (tick) this.hitEnemy(e, z.dmg * 0.4, { noCrit: true, noText: this.floaters.length > 20 });
          });
          if (z.life <= 0) {
            this.explodeAt(z.x, z.y, z.r * 0.6, z.dmg * 2.2, { color: '#a0a0ff' });
          }
        }
        if (z.life <= 0) this.zones.splice(i, 1);
      }
    }

    /* ------------------------------------------------------------ Perks */
    updatePerks(dt) {
      const p = this.player, s = this.stats;
      if (s.auraDps > 0) {
        this.auraT -= dt;
        if (this.auraT <= 0) {
          this.auraT = 0.5;
          const R = 75 * s.area;
          const dmg = s.auraDps * 0.5 * s.might * (1 + 0.15 * (this.stage - 1));
          this.query(p.x, p.y, R, e => this.hitEnemy(e, dmg, { noCrit: true, noText: true }));
          this.auraFx = 0.5;
        }
      }
      if (s.peels) {
        this.peelT -= dt;
        if (this.peelT <= 0 && (p.moving)) {
          this.peelT = 1.4;
          this.addZone({ kind: 'peel', x: p.x, y: p.y, r: 15, life: 10, max: 10, dmg: 6 * s.might * (1 + 0.1 * (this.stage - 1)) });
        }
      }
    }

    updateCompanions(dt) {
      const p = this.player;
      for (let i = 0; i < this.companions.length; i++) {
        const c = this.companions[i];
        c.a += dt * 2.2;
        const a = c.a + (i / this.companions.length) * TAU;
        const tx = p.x + Math.cos(a) * 58, ty = p.y + Math.sin(a) * 58;
        c.x += (tx - c.x) * Math.min(1, dt * 8);
        c.y += (ty - c.y) * Math.min(1, dt * 8);
        c.hitT -= dt;
        if (c.hitT <= 0) {
          let any = false;
          const dmg = 5 * this.stats.might * (1 + 0.15 * (this.stage - 1));
          this.query(c.x, c.y, 22, e => { any = true; this.hitEnemy(e, dmg, { kb: 60, fx: c.x, fy: c.y, noText: this.floaters.length > 20 }); });
          if (any) c.hitT = 0.45;
        }
      }
    }

    /* ------------------------------------------------------------ Gegner-Projektile */
    updateEnemyProjectiles(dt) {
      const p = this.player;
      for (let i = this.eprojectiles.length - 1; i >= 0; i--) {
        const q = this.eprojectiles[i];
        q.x += q.vx * dt; q.y += q.vy * dt;
        q.life -= dt;
        const dx = p.x - q.x, dy = p.y - q.y, rr = q.r + p.r;
        if (dx * dx + dy * dy < rr * rr) {
          this.hurtPlayer(q.dmg);
          if (q.kind === 'flame') p.burn = Math.max(p.burn, 2);
          q.life = 0;
        }
        if (q.life <= 0) this.eprojectiles.splice(i, 1);
      }
    }

    /* ============================================================ WAFFEN (Polizei-Utilities) */
    updateWeapons(dt) {
      const p = this.player;
      for (const w of this.weapons) {
        const s = w.stats;
        switch (w.kind) {
          case 'orbit': this.updateOrbit(w, dt); break;
          case 'siren': this.updateSiren(w, dt); break;
          case 'drone': this.updateDrone(w, dt); break;
          default: {
            w.cdT -= dt;
            if (w.pending > 0) {
              w.shotT -= dt;
              if (w.shotT <= 0) {
                this.fireWeapon(w, w.shotIdx++);
                w.pending--;
                w.shotT = w.kind === 'spray' ? 0.08 : 0.12;
              }
            } else if (w.cdT <= 0) {
              w.pending = Math.max(1, Math.round(s.count));
              w.shotIdx = 0;
              w.shotT = 0;
              w.cdT = s.cd;
            }
          }
        }
      }
    }

    updateOrbit(w, dt) {
      const p = this.player, s = w.stats;
      w.angle += s.speed * dt;
      const n = Math.max(1, Math.round(s.count));
      w.pos.length = n;
      const time = this.time;
      for (let i = 0; i < n; i++) {
        const a = w.angle + (i / n) * TAU;
        const ox = p.x + Math.cos(a) * s.range, oy = p.y + Math.sin(a) * s.range;
        w.pos[i] = { x: ox, y: oy, a };
        this.query(ox, oy, s.size, e => {
          if (e.hitT[w.slot] > time) return;
          e.hitT[w.slot] = time + s.hitCd;
          this.hitEnemy(e, s.dmg, { kb: s.kb, fx: p.x, fy: p.y });
          if (w.evo) {
            this.shockwave(ox, oy, 50, s.dmg * 0.4, 180);
          }
        });
      }
    }

    updateSiren(w, dt) {
      const p = this.player, s = w.stats;
      const R = s.range;
      w.pulseT = (w.pulseT || 0) - dt;
      if (w.pulseT <= 0) {
        w.pulseT = s.cd;
        w.tickCount = (w.tickCount || 0) + 1;
        const pulseColor = w.tickCount % 2 === 0 ? '#00a2ff' : '#ff2a4b';
        this.fx.push({ kind: 'siren_pulse', x: p.x, y: p.y, r: R, t: 0, dur: 0.35, color: pulseColor });
        this.query(p.x, p.y, R, e => {
          this.hitEnemy(e, s.dmg, { kb: s.kb, fx: p.x, fy: p.y, slow: 0.35, noText: this.floaters.length > 22 });
        });
        this.sfx('siren');
      }
      this.query(p.x, p.y, R, e => { e.sirened = this.time + 0.2; });
    }

    updateDrone(w, dt) {
      const p = this.player, s = w.stats;
      w.angle = (w.angle || 0) + dt * 2.8;
      const droneDist = 65;
      const dx = p.x + Math.cos(w.angle) * droneDist;
      const dy = p.y + Math.sin(w.angle) * droneDist;
      w.pos = [{ x: dx, y: dy, a: w.angle }];

      w.shootT = (w.shootT || 0) - dt;
      if (w.shootT <= 0) {
        w.shootT = s.cd;
        const target = this.nearestEnemy(dx, dy, s.range || 240);
        if (target) {
          const a = Math.atan2(target.y - dy, target.x - dx);
          this.projectiles.push({
            kind: 'drone_laser',
            x: dx, y: dy,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: 4, dmg: s.dmg, life: 0.6, rot: a
          });
          this.sfx('zap');
        }
      }
    }

    aimDir(maxR) {
      const p = this.player;
      const t = this.nearestEnemy(p.x, p.y, maxR);
      if (t) {
        const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1;
        return { x: dx / d, y: dy / d, t };
      }
      return { x: p.face.x, y: p.face.y, t: null };
    }

    fireWeapon(w, idx) {
      const p = this.player, s = w.stats;
      switch (w.kind) {
        case 'taser': {
          const target = this.nearestEnemy(p.x, p.y, s.range || 250);
          if (target) {
            const chainCount = Math.max(2, Math.round(s.chain || 2));
            const hitList = [target];
            let curr = target;
            for (let c = 1; c < chainCount; c++) {
              const next = this.nearestEnemy(curr.x, curr.y, 140, ...hitList.map(h => h.id));
              if (next) {
                hitList.push(next);
                curr = next;
              } else break;
            }
            let prev = { x: p.x, y: p.y };
            for (const h of hitList) {
              this.fx.push({ kind: 'lightning', x1: prev.x, y1: prev.y, x2: h.x, y2: h.y, t: 0, dur: 0.12 });
              this.hitEnemy(h, s.dmg, { stun: s.stun || 0.4, kb: 50, fx: prev.x, fy: prev.y });
              prev = h;
            }
            this.sfx('zap');
          }
          break;
        }
        case 'pistol': {
          const aim = this.aimDir(520);
          const spread = idx > 0 ? this.rng.range(-0.15, 0.15) : 0;
          const a = Math.atan2(aim.y, aim.x) + spread;
          this.fx.push({ kind: 'muzzle', x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, a, t: 0, dur: 0.08 });
          this.projectiles.push({
            kind: 'bullet',
            x: p.x, y: p.y,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size, dmg: s.dmg, life: s.life, pierce: s.pierce,
            hits: [], rot: a, evo: w.evo
          });
          this.sfx('gunshot');
          break;
        }
        case 'spray': {
          const aim = this.aimDir(300);
          const base = Math.atan2(p.face.y, p.face.x);
          const n = 4;
          for (let i = 0; i < n; i++) {
            const a = base + this.rng.range(-0.45, 0.45);
            const spd = s.speed * this.rng.range(0.8, 1.2);
            this.projectiles.push({
              kind: 'spray',
              x: p.x, y: p.y,
              vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
              r: s.size * 0.7, dmg: s.dmg, life: s.life * this.rng.range(0.7, 1.1),
              slow: s.slow, hits: [], rot: a, evo: w.evo
            });
          }
          this.sfx('spray');
          break;
        }
        case 'handcuffs': {
          const aim = this.aimDir(500);
          const a = Math.atan2(aim.y, aim.x) + (idx > 0 ? this.rng.range(-0.4, 0.4) : 0);
          this.projectiles.push({
            kind: 'handcuffs',
            x: p.x, y: p.y,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size, dmg: s.dmg, life: s.life, bounces: s.bounces,
            last: 0, last2: 0, rot: 0, evo: w.evo
          });
          this.sfx('cuffs');
          break;
        }
        case 'watercannon': {
          const aim = this.aimDir(450);
          const a = Math.atan2(aim.y, aim.x) + (idx > 0 ? this.rng.range(-0.25, 0.25) : 0);
          this.projectiles.push({
            kind: 'water',
            x: p.x, y: p.y,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size, dmg: s.dmg, life: s.life, pierce: s.pierce,
            kb: s.kb, hits: [], rot: a, evo: w.evo
          });
          this.sfx('splash');
          break;
        }
        case 'flashbang': {
          const t = this.randomNearEnemy(p.x, p.y, 440, 6);
          let a;
          if (t) a = Math.atan2(t.y - p.y, t.x - p.x) + this.rng.range(-0.1, 0.1);
          else a = this.rng.range(0, TAU);
          this.projectiles.push({
            kind: 'flashbang',
            x: p.x, y: p.y,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size, dmg: s.dmg, blast: s.blast, life: s.life,
            stun: s.stun, rot: a, evo: w.evo
          });
          this.sfx('throw');
          break;
        }
        case 'spikestrip': {
          this.addZone({
            kind: 'spikestrip',
            x: p.x, y: p.y,
            r: s.size, life: s.life, max: s.life,
            dmg: s.dmg, hitCd: s.hitCd
          });
          break;
        }
      }
    }

    /* ------------------------------------------------------------ Spieler-Projektile */
    updateProjectiles(dt) {
      const p = this.player;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const q = this.projectiles[i];
        let remove = false;
        switch (q.kind) {
          case 'bullet': {
            q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
            this.query(q.x, q.y, q.r, e => {
              if (q.pierce < 0 || q.hits.includes(e.id)) return;
              q.hits.push(e.id);
              this.hitEnemy(e, q.dmg, { kb: 80, fx: q.x, fy: q.y });
              q.pierce--;
              if (q.pierce < 0) q.life = 0;
            });
            if (q.life <= 0) remove = true;
            break;
          }
          case 'handcuffs': {
            q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; q.rot += dt * 12;
            let hit = null;
            this.query(q.x, q.y, q.r, e => { if (!hit && e.id !== q.last && e.id !== q.last2) hit = e; });
            if (hit) {
              this.hitEnemy(hit, q.dmg, { kb: 100, fx: q.x, fy: q.y });
              q.last2 = q.last; q.last = hit.id;
              q.bounces--;
              if (q.bounces >= 0) {
                const t = this.nearestEnemy(q.x, q.y, 300, hit.id, q.last2);
                const sp = Math.hypot(q.vx, q.vy);
                if (t) { const dx = t.x - q.x, dy = t.y - q.y, d = Math.hypot(dx, dy) || 1; q.vx = (dx / d) * sp; q.vy = (dy / d) * sp; }
              } else q.life = Math.min(q.life, 0.2);
            }
            if (q.life <= 0) remove = true;
            break;
          }
          case 'spray': {
            q.x += q.vx * dt; q.y += q.vy * dt;
            q.vx *= Math.pow(0.2, dt); q.vy *= Math.pow(0.2, dt);
            q.r += dt * 16;
            q.life -= dt;
            this.query(q.x, q.y, q.r, e => {
              if (q.hits.includes(e.id)) return;
              q.hits.push(e.id);
              this.hitEnemy(e, q.dmg, { slow: q.slow, noCrit: true });
            });
            if (q.life <= 0) remove = true;
            break;
          }
          case 'water': {
            q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
            this.query(q.x, q.y, q.r, e => {
              if (q.pierce < 0 || q.hits.includes(e.id)) return;
              q.hits.push(e.id);
              this.hitEnemy(e, q.dmg, { kb: q.kb, fx: q.x, fy: q.y });
              q.pierce--;
              if (q.pierce < 0) q.life = 0;
            });
            if (q.life <= 0) remove = true;
            break;
          }
          case 'flashbang': {
            q.x += q.vx * dt; q.y += q.vy * dt;
            q.vx *= Math.pow(0.3, dt); q.vy *= Math.pow(0.3, dt);
            q.life -= dt;
            if (q.life <= 0) {
              this.explodeAt(q.x, q.y, q.blast, q.dmg, { stun: q.stun });
              this.fx.push({ kind: 'flash', x: q.x, y: q.y, r: q.blast, t: 0, dur: 0.22 });
              this.sfx('flash');
              if (q.evo) {
                for (let c = 0; c < 4; c++) {
                  const ang = (c / 4) * TAU;
                  this.explodeAt(q.x + Math.cos(ang) * 40, q.y + Math.sin(ang) * 40, q.blast * 0.6, q.dmg * 0.5, { stun: 0.5 });
                }
              }
              remove = true;
            }
            break;
          }
          case 'drone_laser': {
            q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
            this.query(q.x, q.y, q.r, e => {
              if (q.hit) return;
              q.hit = true;
              this.hitEnemy(e, q.dmg, { kb: 40, fx: q.x, fy: q.y });
              q.life = 0;
            });
            if (q.life <= 0) remove = true;
            break;
          }
        }
        if (remove) this.projectiles.splice(i, 1);
      }
    }

    popBubble(q) {
      this.explodeAt(q.x, q.y, q.pop, q.dmg, { color: '#9fe8ff' });
    }

    /* ------------------------------------------------------------ Effekte */
    addFloater(x, y, v, crit, color) {
      if (this.headless) return;
      if (this.floaters.length >= MAX_FLOATERS && !crit) return;
      if (this.floaters.length >= MAX_FLOATERS + 15) return;
      const txt = fmtNum(Math.max(1, Math.round(v))) + (crit ? '!' : '');
      this.floaters.push({ x: x + this.rng.range(-6, 6), y, text: txt, t: 0, crit, color: color || (crit ? '#ff2a4b' : '#ffe600') });
    }

    particle(x, y, color) {
      if (this.headless || this.particles.length >= MAX_PARTICLES) return;
      const a = this.rng.range(0, TAU), sp = this.rng.range(30, 110);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0.5, max: 0.5, color, size: this.rng.range(2, 4) });
    }

    puff(x, y, color) {
      if (this.headless || this.particles.length >= MAX_PARTICLES) return;
      this.particles.push({ x, y, vx: this.rng.range(-8, 8), vy: -this.rng.range(14, 30), life: 0.9, max: 0.9, color, size: this.rng.range(3, 5), puff: true });
    }

    updateFx(dt) {
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.t += dt; f.y -= 36 * dt;
        if (f.t > 0.7) this.floaters.splice(i, 1);
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const q = this.particles[i];
        q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (!q.puff) q.vy += 200 * dt;
        if (q.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.fx.length - 1; i >= 0; i--) {
        const f = this.fx[i];
        f.t += dt;
        if (f.t >= f.dur) this.fx.splice(i, 1);
      }
      if (this.fx.length > 60) this.fx.splice(0, this.fx.length - 60);
    }

    compact() {
      const en = this.enemies;
      let j = 0;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (!e.dead) en[j++] = e;
      }
      en.length = j;
    }

    /* ------------------------------------------------------------ Test-/Debug-Helfer */
    /** Springt zum Boss der aktuellen Stage */
    debugSkipToBoss() { this.stageTime = C.STAGE_LEN; }
  }

  HDE.Game = Game;
})();
