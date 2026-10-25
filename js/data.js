/* Hau den Egge - Spielinhalte (Waffen, Passive, Egges, Perks, Skilltree, Biome) */
(function () {
  const HDE = (globalThis.HDE = globalThis.HDE || {});

  /* ---------------------------------------------------------------- Konstanten */
  const CONST = {
    STAGE_LEN: 120,          // Sekunden bis der Boss einer Stage erscheint
    MEGA_EVERY: 5,           // jede 5. Stage Mega-Boss
    MAX_WEAPONS: 6,
    MAX_PASSIVES: 6,
    WEAPON_MAX: 8,
    CHUNK: 480,              // Chunkgröße für Grasflecken
    VIEW_H: 600,             // sichtbare Welt-Höhe in Einheiten
    SAVE_KEY: 'hau_den_egge_save',
  };

  /* ---------------------------------------------------------------- Basiswerte */
  function baseStats() {
    return {
      maxHp: 100, regen: 0, armor: 0, speed: 150,
      might: 1, cd: 1, area: 1, projSpeed: 1, duration: 1,
      pickup: 70, xp: 1, shell: 1,
      crit: 0.05, critMul: 2,
      revives: 0, rerolls: 1, choices: 3, skips: 1,
      dmgTaken: 1,
      // Welt-Modifikatoren (Perk-Nachteile)
      enemyHp: 1, enemyCount: 1, enemySpeed: 1, bossHp: 1,
      // Perk-Flags
      auraDps: 0, pull: 0, chickens: false, peels: false, slide: false,
      timid: 0, grass: 1, startWeaponLvl: 1,
      // Chaos-Ast
      wonder: 0, wonderUp: 0, explode: 0, berserk: 0, startRandom: 0, startLevel: 0,
    };
  }

  /* ---------------------------------------------------------------- Waffen (Polizei-Utilities & Ordnungsausrüstung) */
  const DEF_LEVELS = [{ count: 1 }, { dmg: 0.25 }, { cd: -0.12 }, { count: 1 }, { area: 0.15 }, { dmg: 0.25 }, { count: 1 }];

  const WEAPONS = {
    baton: {
      name: 'Einsatz-Schlagstock', icon: '🦯', unlock: 0, kind: 'orbit', countLabel: 'Schlagstock',
      desc: 'Kreist um dich und schlägt Egges mit Wucht zurück.',
      base: { dmg: 9, cd: 0, count: 1, speed: 3.0, range: 66, size: 18, hitCd: 0.45, kb: 180 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { area: 0.15 }, { count: 1 }, { dmg: 0.3 }, { speed: 0.15 }, { count: 1 }],
      evo: { passive: 'vest', name: 'Titan-Tonfa', desc: 'Schwere Riot-Tonfa mit Schockwellen bei Treffern.' },
    },
    taser: {
      name: 'Dienst-Taser', icon: '⚡', unlock: 0, kind: 'taser', countLabel: 'Lichtbogen',
      desc: 'Verschießt Elektroschocks, die auf nahe Egges überspringen und sie lähmen.',
      base: { dmg: 13, cd: 1.4, count: 1, chain: 2, range: 250, stun: 0.4 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { chain: 1 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { chain: 2 }],
      evo: { passive: 'battery', name: 'Mega-Taser', desc: 'Dauerhafter Hochvolt-Kettenblitz mit Ketten-Betäubung.' },
    },
    pistol: {
      name: 'Dienstwaffe P99', icon: '🔫', unlock: 0, kind: 'pistol', countLabel: 'Schuss',
      desc: 'Präzise Schüsse in Blickrichtung mit Mündungsfeuer und Durchschlag.',
      base: { dmg: 14, cd: 1.1, count: 1, speed: 520, size: 5, life: 1.2, pierce: 2 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { pierce: 1 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { pierce: 2 }],
      evo: { passive: 'ammo', name: 'SWAT-Karabiner', desc: 'Vollautomatisches Schnellfeuer mit panzerbrechenden Geschossen.' },
    },
    siren: {
      name: 'Blaulicht-Sirene', icon: '🚨', unlock: 2, kind: 'siren', countLabel: 'Schallwelle',
      desc: 'Martinshorn & Blaulicht-Aura: Fügt allen Egges im Umkreis Schaden zu!',
      base: { dmg: 10, cd: 0.8, count: 1, range: 95, kb: 110 },
      levels: [{ area: 0.18 }, { dmg: 0.3 }, { area: 0.18 }, { cd: -0.1 }, { area: 0.18 }, { dmg: 0.3 }, { area: 0.25 }],
      evo: { passive: 'megaphone', name: 'Martinshorn-Schallkanone', desc: 'Gigantischer Schallwellen-Radius mit permanentem Zurückdrängen.' },
    },
    pepperspray: {
      name: 'Einsatz-Pfefferspray', icon: '💨', unlock: 3, kind: 'spray', countLabel: 'Sprühstoß',
      desc: 'Sprüht Reizgas-Wolken vor dich. Verlangsamt und verätzt Egges.',
      base: { dmg: 7, cd: 1.5, count: 1, speed: 180, size: 24, life: 1.0, slow: 0.5 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { area: 0.2 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { area: 0.2 }],
      evo: { passive: 'filter', name: 'CS-Großraumvernebler', desc: '360-Grad Reizgasnebel, der alle Egges im Umkreis erstickt.' },
    },
    handcuffs: {
      name: 'Handschellen-Wurf', icon: '⛓️', unlock: 4, kind: 'handcuffs', countLabel: 'Handschellen',
      desc: 'Fliegende Handschellen prallen ab und fesseln getroffene Egges.',
      base: { dmg: 12, cd: 1.6, count: 1, speed: 340, size: 13, bounces: 3, life: 2.5 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { bounces: 1 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { bounces: 2 }],
      evo: { passive: 'badge', name: 'Massen-Arrest', desc: 'Kettenfesselung, die Scharen von Egges zusammenschließt.' },
    },
    watercannon: {
      name: 'Wasserwerfer', icon: '🌊', unlock: 5, kind: 'watercannon', countLabel: 'Wasserstrahl',
      desc: 'Schießt massive Hochdruck-Wasserschwälle, die Egges weit wegspülen.',
      base: { dmg: 16, cd: 1.8, count: 1, speed: 380, size: 16, life: 1.1, pierce: 3, kb: 320 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { pierce: 1 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { pierce: 2 }],
      evo: { passive: 'pump', name: 'Panzer-Wasserwerfer', desc: 'Gewaltige Flutwelle, die ganze Horden überrollt.' },
    },
    flashbang: {
      name: 'Blendgranate', icon: '💥', unlock: 6, kind: 'flashbang', countLabel: 'Granate',
      desc: 'Detoniert in einem blendenden Lichtblitz mit hohem Flächenschaden.',
      base: { dmg: 22, cd: 2.2, count: 1, speed: 260, size: 10, blast: 80, life: 0.7, stun: 0.8 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { area: 0.2 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { area: 0.2 }],
      evo: { passive: 'holster', name: 'Cluster-Schockbatterie', desc: 'Zerspringt in 4 Sekundär-Blendgranaten für Kettenexplosionen.' },
    },
    drone: {
      name: 'Überwachungsdrohne', icon: '🛸', unlock: 8, kind: 'drone', countLabel: 'Drohne',
      desc: 'Autonome Polizeidrohne, die dich umkreist und Ziele mit Lasern beschießt.',
      base: { dmg: 8, cd: 0.45, count: 1, range: 240, speed: 500 },
      levels: [{ dmg: 0.25 }, { cd: -0.1 }, { count: 1 }, { dmg: 0.25 }, { range: 40 }, { cd: -0.1 }, { count: 1 }],
      evo: { passive: 'radio', name: 'SWAT-Abfangdrohne', desc: 'Schwere Abfangdrohne mit Zwillings-Gatling und Suchscheinwerfer.' },
    },
    spikestrip: {
      name: 'Nagelband', icon: '🚧', unlock: 10, kind: 'spikestrip', countLabel: 'Nagelband',
      desc: 'Legt Stachelbänder auf den Boden, die verfolgende Egges zerfetzen.',
      base: { dmg: 11, cd: 2.4, count: 1, size: 28, life: 6.0, hitCd: 0.4 },
      levels: [{ count: 1 }, { dmg: 0.3 }, { area: 0.2 }, { cd: -0.12 }, { count: 1 }, { dmg: 0.3 }, { count: 1 }],
      evo: { passive: 'boots', name: 'Hochsicherheits-Sperre', desc: 'Elektrifizierte Barrikaden, die Egges aufhalten und grillen.' },
    },
  };

  /* ---------------------------------------------------------------- Passive Items (Polizei-Ausrüstung) */
  const PASSIVES = {
    vest:      { name: 'Schutzweste', icon: '🦺', max: 5, desc: '+20 Max-HP & +1 Rüstung', apply(s, l) { s.maxHp += 20 * l; s.armor += l; } },
    battery:   { name: 'Hochleistungs-Akku', icon: '🔋', max: 5, desc: '-8% Abklingzeit', apply(s, l) { s.cd *= Math.pow(0.92, l); } },
    ammo:      { name: 'Hohlspitz-Munition', icon: '📦', max: 5, desc: '+12% Schaden', apply(s, l) { s.might *= 1 + 0.12 * l; } },
    megaphone: { name: 'Signal-Megafon', icon: '📢', max: 5, desc: '+15% Flächenradius (vergrößert Sirenenkreis & Explosionen)', apply(s, l) { s.area *= 1 + 0.15 * l; } },
    filter:    { name: 'Aktivkohle-Filter', icon: '🤿', max: 5, desc: '+10% Wirkungsdauer & +0.4 HP/Sek', apply(s, l) { s.duration *= 1 + 0.1 * l; s.regen += 0.4 * l; } },
    badge:     { name: 'Dienstmarke', icon: '🛡️', max: 5, desc: '+5% Krit-Chance & +15% Krit-Schaden', apply(s, l) { s.crit += 0.05 * l; s.critMul += 0.15 * l; } },
    pump:      { name: 'Druckpumpe', icon: '🚰', max: 5, desc: '+12% Projektiltempo & +20% Rückstoß', apply(s, l) { s.projSpeed *= 1 + 0.12 * l; s.might *= 1 + 0.04 * l; } },
    holster:   { name: 'Taktik-Koppel', icon: '🪢', max: 5, desc: '+1 Geschoss / Granaten-Menge', apply(s, l) { s.duration *= 1 + 0.05 * l; } },
    radio:     { name: 'Polizeifunk', icon: '📻', max: 5, desc: '+12% XP-Ertrag & +10% Eierschalen', apply(s, l) { s.xp *= 1 + 0.12 * l; s.shell *= 1 + 0.1 * l; } },
    boots:     { name: 'Einsatzstiefel', icon: '🥾', max: 5, desc: '+8% Lauftempo & +20% Einsammelradius', apply(s, l) { s.speed *= 1 + 0.08 * l; s.pickup *= 1 + 0.2 * l; } },
  };

  /* ---------------------------------------------------------------- Egges: jeder spawnt mit einem anderen Kiff-Gegenstand */
  const EGGES = {
    joint:   { name: 'Joint-Egge',     item: 'joint',   unlock: 1, hp: 5,  speed: 58, dmg: 5, xp: 1, r: 11, scale: 1,    ai: 'chase', death: 'smoke',  desc: 'Hinterlässt eine Rauchwolke, die Egges lahmlegt.' },
    papers:  { name: 'Blättchen-Egge', item: 'papers',  unlock: 1, hp: 3,  speed: 98, dmg: 3, xp: 1, r: 9,  scale: 0.85, ai: 'chase', desc: 'Dünn und flink.' },
    leaf:    { name: 'Hanf-Egge',      item: 'leaf',    unlock: 1, hp: 7,  speed: 50, dmg: 4, xp: 1, r: 11, scale: 1,    ai: 'chase', regen: 0.05, death: 'heal', desc: 'Regeneriert. Lässt manchmal ein Hühnchen fallen.' },
    grinder: { name: 'Grinder-Egge',   item: 'grinder', unlock: 2, hp: 12, speed: 50, dmg: 6, xp: 2, r: 12, scale: 1.05, ai: 'chase', death: 'split', desc: 'Zerfällt in zwei Mini-Egges.' },
    bong:    { name: 'Bong-Egge',      item: 'bong',    unlock: 2, hp: 30, speed: 34, dmg: 8, xp: 3, r: 16, scale: 1.4,  ai: 'chase', death: 'puddle', desc: 'Dick und zäh. Hinterlässt rutschiges Bongwasser.' },
    lighter: { name: 'Feuerzeug-Egge', item: 'lighter', unlock: 3, hp: 9,  speed: 42, dmg: 4, xp: 2, r: 11, scale: 1,    ai: 'shooter', range: 190, shootCd: 2.8, desc: 'Schnipst Flammen aus der Ferne.' },
    pipe:    { name: 'Pfeifen-Egge',   item: 'pipe',    unlock: 3, hp: 11, speed: 46, dmg: 4, xp: 2, r: 11, scale: 1,    ai: 'chase', aura: true, desc: 'Macht Egges in der Nähe schneller.' },
    vape:    { name: 'Vape-Egge',      item: 'vape',    unlock: 4, hp: 10, speed: 52, dmg: 6, xp: 2, r: 11, scale: 1,    ai: 'dasher', desc: 'Dasht in Nebelschwaden auf dich zu.' },
    cake:    { name: 'Keks-Egge',      item: 'cake',    unlock: 4, hp: 22, speed: 30, dmg: 6, xp: 6, r: 13, scale: 1.2,  ai: 'chase', shells: 2, desc: 'Space-Cake: langsam, aber dicke XP-Beute.' },
    stash:   { name: 'Dosen-Egge',     item: 'stash',   unlock: 5, hp: 14, speed: 78, dmg: 0, xp: 4, r: 11, scale: 1,    ai: 'flee', shells: 6, desc: 'Rennt mit dem Vorrat weg. Fang sie!' },
  };

  /* ---------------------------------------------------------------- Perks (Ordnungsdienst & Einsatz-Perks, mit Vor- & Nachteil) */
  const PERKS = [
    { id: 'siren_boost', icon: '🚨', name: 'Blaulicht-Einsatz', pro: 'Sirenen- & Wirkungskreis +60% größer & +30% Schaden', con: 'Blaulicht lockt Egges an: +15% mehr Egges', apply(s) { s.area *= 1.6; s.might *= 1.3; s.enemyCount *= 1.15; } },
    { id: 'armor_vest', icon: '🦺', name: 'Riot-Schutzausrüstung', pro: 'Erleidest 35% weniger Schaden', con: 'Schwere Montur: -12% Lauftempo', apply(s) { s.dmgTaken *= 0.65; s.speed *= 0.88; } },
    { id: 'high_voltage', icon: '⚡', name: 'Hochvolt-Überspannung', pro: 'Taser & Elektro springen weiter & +25% Schaden', con: 'Elektrosmog: -15% Max-HP', apply(s) { s.might *= 1.25; s.maxHp *= 0.85; } },
    { id: 'defibrillator', icon: '💓', name: 'Defibrillator-Herz', pro: 'Einmal Wiederbelebung mit 60% HP & Schockwelle', con: 'Bosse haben +25% HP', apply(s) { s.revives += 1; s.bossHp *= 1.25; } },
    { id: 'spikes', icon: '🚧', name: 'Nagelband-Spur', pro: 'Hinterlässt Stacheln: Egges nehmen beim Verfolgen Schaden', con: 'Du schlitterst leicht bei Kurven', apply(s) { s.peels = true; s.slide = true; } },
    { id: 'megaphone_shout', icon: '📢', name: 'Platzverweis', pro: '20% der schwächeren Egges ergreifen panisch die Flucht', con: 'Verstärkung: +20% mehr Egges', apply(s) { s.timid = 0.2; s.enemyCount *= 1.2; } },
    { id: 'patrol_briefing', icon: '📋', name: 'Einsatzbesprechung', pro: '+1 Upgrade-Auswahl bei jedem Level-Up', con: '-15% XP-Gewinn', apply(s) { s.choices += 1; s.xp *= 0.85; } },
    { id: 'coffee_donut', icon: '☕', name: 'Kaffee & Donut Pause', pro: '+20% Angriffsgeschwindigkeit & +0.6 HP/s Regeneration', con: '-20% Max-HP', apply(s) { s.cd *= 0.8; s.regen += 0.6; s.maxHp *= 0.8; } },
    { id: 'cs_gas', icon: '🧪', name: 'CS-Gas-Aura', pro: 'Ständige Reizgas-Aura fügt nahen Egges Dauerschaden zu', con: 'Reizt Augen: -10% Lauftempo', apply(s) { s.auraDps += 8; s.speed *= 0.9; } },
    { id: 'sharpshooter', icon: '🎯', name: 'Präzisionsschütze', pro: '+50% Schaden & +10% Krit-Chance', con: 'Rückstoß: +40% erlittener Schaden', apply(s) { s.might *= 1.5; s.crit += 0.1; s.dmgTaken *= 1.4; } },
    { id: 'evidence_locker', icon: '📦', name: 'Asservaten-Beschlagnahme', pro: '+50% verdiente Eierschalen 🥚', con: 'Egges wehren sich: +15% Egge-HP', apply(s) { s.shell *= 1.5; s.enemyHp *= 1.15; } },
    { id: 'doperazzia', icon: '🌿', name: 'Gras-Razzia', pro: 'Egges im Gras nehmen 3x Schaden (statt 1.5x)', con: 'Mehr Grasflecken, Egges chillen hart', apply(s) { s.grass = 1.8; s.enemyCount *= 1.1; } },
    { id: 'k9_unit', icon: '🐕', name: 'Spürhund-Staffel', pro: 'Spürhund-Begleiter greift Egges an & sammelt Beute', con: '-15% Max-HP', apply(s) { s.chickens = true; s.maxHp *= 0.85; } },
    { id: 'early_shift', icon: '⏰', name: 'Frühschicht-Alarm', pro: 'Startwaffe beginnt sofort auf Level 3', con: '-20% XP-Ertrag', apply(s) { s.startWeaponLvl = 3; s.xp *= 0.8; } },
  ];

  /* ---------------------------------------------------------------- Skilltree (Meta, unendlich) */
  const INF = Infinity;
  const BRANCHES = {
    muskeln: { name: 'Muskeln', icon: '💪', color: '#e8553d' },
    speck:   { name: 'Speck', icon: '🛡️', color: '#e8a93d' },
    glueck:  { name: 'Glück & Kram', icon: '🍀', color: '#4fc760' },
    chaos:   { name: 'Chaos', icon: '🌀', color: '#a858e8' },
  };

  // cost: [Basis, Wachstum] -> floor(Basis * Wachstum^Level)
  const NODES = [
    // Muskeln
    { id: 'm1', br: 'muskeln', name: 'Hammerhände', icon: '✊', max: 5, cost: [12, 1.5], req: null, d: 'Schaden', fmt: l => `+${5 * l}% Schaden`, apply(s, l) { s.might *= 1 + 0.05 * l; } },
    { id: 'm2', br: 'muskeln', name: 'Schnellschläger', icon: '⚡', max: 5, cost: [20, 1.5], req: 'm1', d: 'Abklingzeit', fmt: l => `-${4 * l}% Abklingzeit`, apply(s, l) { s.cd *= Math.pow(0.96, l); } },
    { id: 'm3', br: 'muskeln', name: 'Treffsicher', icon: '🎯', max: 5, cost: [30, 1.55], req: 'm2', d: 'Krit-Chance', fmt: l => `+${3 * l}% Krit-Chance`, apply(s, l) { s.crit += 0.03 * l; } },
    { id: 'm4', br: 'muskeln', name: 'Krit-Wucht', icon: '💥', max: 5, cost: [45, 1.55], req: 'm3', d: 'Krit-Schaden', fmt: l => `+${15 * l}% Krit-Schaden`, apply(s, l) { s.critMul += 0.15 * l; } },
    { id: 'm5', br: 'muskeln', name: 'Wuchtbrumme', icon: '🔆', max: 5, cost: [35, 1.55], req: 'm2', d: 'Fläche', fmt: l => `+${5 * l}% Fläche`, apply(s, l) { s.area *= 1 + 0.05 * l; } },
    { id: 'me', br: 'muskeln', name: 'Ewiger Schaden', icon: '♾️', max: INF, cost: [400, 1.22], req: 'm4', d: 'Schaden', fmt: l => `+${l}% Schaden`, apply(s, l) { s.might *= 1 + 0.01 * l; }, eternal: true },

    // Speck
    { id: 's1', br: 'speck', name: 'Dicker Pulli', icon: '🧥', max: 5, cost: [12, 1.5], req: null, d: 'Max-HP', fmt: l => `+${10 * l} Max-HP`, apply(s, l) { s.maxHp += 10 * l; } },
    { id: 's2', br: 'speck', name: 'Mampfen', icon: '🍖', max: 5, cost: [20, 1.5], req: 's1', d: 'Regeneration', fmt: l => `+${(0.15 * l).toFixed(2)} HP/Sek`, apply(s, l) { s.regen += 0.15 * l; } },
    { id: 's3', br: 'speck', name: 'Dickes Fell', icon: '🦔', max: 3, cost: [60, 2.0], req: 's2', d: 'Rüstung', fmt: l => `-${l} Schaden pro Treffer`, apply(s, l) { s.armor += l; } },
    { id: 's4', br: 'speck', name: 'Stehaufmännchen', icon: '🪆', max: 1, cost: [500, 1], req: 's3', d: 'Wiederbelebung', fmt: l => `+${l} Wiederbelebung`, apply(s, l) { s.revives += l; } },
    { id: 's5', br: 'speck', name: 'Flinke Füße', icon: '👟', max: 5, cost: [30, 1.5], req: 's1', d: 'Lauftempo', fmt: l => `+${3 * l}% Lauftempo`, apply(s, l) { s.speed *= 1 + 0.03 * l; } },
    { id: 'se', br: 'speck', name: 'Ewige Zähigkeit', icon: '♾️', max: INF, cost: [400, 1.22], req: 's4', d: 'Max-HP', fmt: l => `+${2 * l} Max-HP`, apply(s, l) { s.maxHp += 2 * l; }, eternal: true },

    // Glück & Kram
    { id: 'g1', br: 'glueck', name: 'Lernkurve', icon: '📚', max: 5, cost: [12, 1.5], req: null, d: 'XP', fmt: l => `+${5 * l}% XP`, apply(s, l) { s.xp *= 1 + 0.05 * l; } },
    { id: 'g2', br: 'glueck', name: 'Schalen-Sammler', icon: '🥚', max: 5, cost: [20, 1.55], req: 'g1', d: 'Eierschalen', fmt: l => `+${8 * l}% Eierschalen`, apply(s, l) { s.shell *= 1 + 0.08 * l; } },
    { id: 'g3', br: 'glueck', name: 'Magnet-Hose', icon: '🧲', max: 5, cost: [25, 1.5], req: 'g1', d: 'Einsammel-Radius', fmt: l => `+${10 * l}% Radius`, apply(s, l) { s.pickup *= 1 + 0.1 * l; } },
    { id: 'g4', br: 'glueck', name: 'Neu würfeln', icon: '🎲', max: 3, cost: [80, 2.2], req: 'g2', d: 'Rerolls', fmt: l => `+${l} Reroll pro Run`, apply(s, l) { s.rerolls += l; } },
    { id: 'g5', br: 'glueck', name: 'Vorsprung', icon: '🚀', max: 3, cost: [150, 2.5], req: 'g4', d: 'Startlevel', fmt: l => `+${l} Startlevel`, apply(s, l) { s.startLevel += l; } },
    { id: 'ge', br: 'glueck', name: 'Ewiges Glück', icon: '♾️', max: INF, cost: [400, 1.22], req: 'g5', d: 'XP & Schalen', fmt: l => `+${(0.5 * l).toFixed(1)}% XP & Schalen`, apply(s, l) { s.xp *= 1 + 0.005 * l; s.shell *= 1 + 0.005 * l; }, eternal: true },

    // Chaos
    { id: 'c1', br: 'chaos', name: 'Wunder-Egge', icon: '🌟', max: 5, cost: [25, 1.6], req: null, d: 'Goldegge', fmt: l => `+${l}% Goldegge-Chance`, apply(s, l) { s.wonder += 0.01 * l; } },
    { id: 'c2', br: 'chaos', name: 'Chaos-Start', icon: '🎁', max: 1, cost: [300, 1], req: 'c1', d: 'Zufallswaffe', fmt: l => 'Start mit einer Zufallswaffe', apply(s, l) { s.startRandom += l; } },
    { id: 'c3', br: 'chaos', name: 'Wutanfall', icon: '😡', max: 5, cost: [40, 1.55], req: 'c1', d: 'Berserker', fmt: l => `+${8 * l}% Schaden unter 40% HP`, apply(s, l) { s.berserk += 0.08 * l; } },
    { id: 'c4', br: 'chaos', name: 'Mutation', icon: '🧬', max: 5, cost: [60, 1.6], req: 'c3', d: 'Wunder-Upgrade', fmt: l => `${4 * l}% Chance auf Doppel-Upgrade`, apply(s, l) { s.wonderUp += 0.04 * l; } },
    { id: 'c5', br: 'chaos', name: 'Platzende Egges', icon: '🎆', max: 5, cost: [50, 1.6], req: 'c1', d: 'Explosion', fmt: l => `${3 * l}% Chance: Kill explodiert`, apply(s, l) { s.explode += 0.03 * l; } },
    { id: 'ce', br: 'chaos', name: 'Ewiges Chaos', icon: '♾️', max: INF, cost: [400, 1.22], req: 'c4', d: 'Chaos', fmt: l => `+${(0.4 * l).toFixed(1)}% Explosion, +${(0.5 * l).toFixed(1)}% Schaden`, apply(s, l) { s.explode = Math.min(0.6, s.explode + 0.004 * l); s.might *= 1 + 0.005 * l; }, eternal: true },
  ];

  /* ---------------------------------------------------------------- Biome (wiederholen sich zyklisch) */
  const BIOMES = [
    { id: 'jahrmarkt',  name: 'Jahrmarkt',   a: '#7a5a3a', b: '#6d4f33', line: '#5a3f28', mega: 'Mega-Egge vom Jahrmarkt' },
    { id: 'buero',      name: 'Büro',        a: '#8a93a3', b: '#7b8494', line: '#6a7384', mega: 'Mega-Egge der Buchhaltung' },
    { id: 'kueche',     name: 'Küche',       a: '#e0d8c4', b: '#c9c0a8', line: '#b0a68c', mega: 'Mega-Egge der Küche' },
    { id: 'schwimmbad', name: 'Schwimmbad',  a: '#62bcd9', b: '#52a9c8', line: '#4795b2', mega: 'Mega-Egge vom Beckenrand' },
    { id: 'weltraum',   name: 'Weltraum',    a: '#1c1c3c', b: '#242452', line: '#2e2e66', mega: 'Mega-Egge aus dem All' },
    { id: 'hoelle',     name: 'Egge-Hölle',  a: '#4c1616', b: '#5e1d1d', line: '#7a2a1a', mega: 'Mega-Egge der Hölle' },
  ];

  const BOSS_NAMES = ['Der dicke Egge', 'Egge Maximus', 'Eggzilla', 'Großer Egge', 'Egge der Gewaltige', 'Eggor', 'Der Egge-Vater', 'Eggbert der Unfassbare'];

  HDE.data = { CONST, baseStats, WEAPONS, PASSIVES, EGGES, PERKS, NODES, BRANCHES, BIOMES, BOSS_NAMES };

  /* ---------------------------------------------------------------- Hilfen */
  HDE.data.nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));
  HDE.data.perkById = Object.fromEntries(PERKS.map(p => [p.id, p]));

  /** Text für Waffen-Upgrade-Level (2..8) */
  HDE.data.describeWeaponLevel = function (id, level) {
    const w = WEAPONS[id];
    const d = (w.levels || DEF_LEVELS)[level - 2];
    if (!d) return '';
    const out = [];
    if (d.count) out.push(`+${d.count} ${w.countLabel}`);
    if (d.dmg) out.push(`+${Math.round(d.dmg * 100)}% Schaden`);
    if (d.cd) out.push(`${Math.round(d.cd * 100)}% Abklingzeit`);
    if (d.area) out.push(`+${Math.round(d.area * 100)}% Fläche`);
    if (d.speed) out.push(`+${Math.round(d.speed * 100)}% Tempo`);
    if (d.bounces) out.push(`+${d.bounces} Abpraller`);
    if (d.pierce) out.push(`+${d.pierce} Durchschlag`);
    if (d.chain) out.push(`+${d.chain} Ketten-Sprung`);
    if (d.range) out.push(`+${d.range} Reichweite`);
    return out.join(', ');
  };

  HDE.data.DEF_LEVELS = DEF_LEVELS;
})();
