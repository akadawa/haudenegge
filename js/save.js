/* Hau den Egge - Speichersystem (localStorage, Versionierung, Export/Import) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});
  const KEY = () => HDE.data.CONST.SAVE_KEY;
  const VERSION = 1;

  // Speicher: localStorage, sonst im RAM (z. B. private Fenster / Tests)
  const memory = {};
  const memStore = {
    getItem: k => (k in memory ? memory[k] : null),
    setItem: (k, v) => { memory[k] = String(v); },
    removeItem: k => { delete memory[k]; },
  };
  let storage = memStore;
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem('__hde_test', '1');
      globalThis.localStorage.removeItem('__hde_test');
      storage = globalThis.localStorage;
    }
  } catch (e) { storage = memStore; }

  function defaults() {
    return {
      v: VERSION,
      shells: 0,            // aktuelle Währung
      totalShells: 0,       // insgesamt verdient
      bestStage: 0,         // höchste erreichte Stage
      bestTime: 0,          // längster Run (Sekunden)
      bestLevel: 1,
      runs: 0,
      kills: 0,
      bossKills: 0,
      nodes: {},            // Skilltree: id -> Level
      perks: [],            // ausgerüstete Perks (Reihenfolge = Slot)
      perkSeed: (Math.random() * 4294967296) >>> 0,   // macht die Perk-Angebote stabil
      perkRerolls: 0,
      lastWeapon: 'hammer',
      settings: { sound: true, music: true, photo: false, vol: 0.6 },
      created: Date.now(),
    };
  }

  function num(v, d, min = 0) {
    v = Number(v);
    return Number.isFinite(v) ? Math.max(min, v) : d;
  }

  /** Bereinigt einen geladenen Spielstand und migriert alte Versionen. */
  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    const s = d;
    s.shells = Math.floor(num(raw.shells, 0));
    s.totalShells = Math.floor(num(raw.totalShells, s.shells));
    s.bestStage = Math.floor(num(raw.bestStage, 0));
    s.bestTime = num(raw.bestTime, 0);
    s.bestLevel = Math.floor(num(raw.bestLevel, 1, 1));
    s.runs = Math.floor(num(raw.runs, 0));
    s.kills = Math.floor(num(raw.kills, 0));
    s.bossKills = Math.floor(num(raw.bossKills, 0));
    s.created = num(raw.created, Date.now());
    s.perkSeed = Math.floor(num(raw.perkSeed, s.perkSeed));
    s.perkRerolls = Math.floor(num(raw.perkRerolls, 0));
    if (typeof raw.lastWeapon === 'string' && HDE.data.WEAPONS[raw.lastWeapon]) s.lastWeapon = raw.lastWeapon;
    if (raw.nodes && typeof raw.nodes === 'object') {
      for (const id of Object.keys(raw.nodes)) {
        const n = HDE.data.nodeById[id];
        if (!n) continue;
        let l = Math.floor(num(raw.nodes[id], 0));
        if (l > n.max) l = n.max;
        if (l > 0) s.nodes[id] = l;
      }
    }
    if (Array.isArray(raw.perks)) {
      for (const id of raw.perks) {
        if (HDE.data.perkById[id] && !s.perks.includes(id)) s.perks.push(id);
      }
    }
    if (raw.settings && typeof raw.settings === 'object') {
      s.settings.sound = raw.settings.sound !== false;
      s.settings.music = raw.settings.music !== false;
      s.settings.photo = raw.settings.photo === true;
      s.settings.vol = Math.min(1, num(raw.settings.vol, 0.6));
    }
    // Perks dürfen die freigeschalteten Slots nicht überschreiten
    const slots = HDE.Meta ? HDE.Meta.slotsForStage(s.bestStage) : 0;
    if (HDE.Meta && s.perks.length > slots) s.perks.length = slots;
    s.v = VERSION;
    return s;
  }

  const Save = {
    VERSION,
    defaults,
    sanitize,
    data: null,

    load() {
      let raw = null;
      try {
        const txt = storage.getItem(KEY());
        if (txt) raw = JSON.parse(txt);
      } catch (e) { raw = null; }
      this.data = sanitize(raw);
      return this.data;
    },

    save() {
      if (!this.data) return false;
      try {
        storage.setItem(KEY(), JSON.stringify(this.data));
        return true;
      } catch (e) { return false; }
    },

    reset() {
      this.data = defaults();
      this.save();
      return this.data;
    },

    /** Export als kopierbarer Text-Code */
    exportCode() {
      const json = JSON.stringify(this.data);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return 'HDE1:' + b64;
    },

    /** Import eines Codes. Gibt {ok, error} zurück. */
    importCode(code) {
      try {
        code = String(code || '').trim();
        if (!code.startsWith('HDE1:')) return { ok: false, error: 'Ungültiger Code (muss mit HDE1: beginnen).' };
        const json = decodeURIComponent(escape(atob(code.slice(5))));
        const raw = JSON.parse(json);
        if (!raw || typeof raw !== 'object') return { ok: false, error: 'Der Code ist beschädigt.' };
        this.data = sanitize(raw);
        this.save();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'Der Code ist beschädigt.' };
      }
    },
  };

  HDE.Save = Save;
})();
