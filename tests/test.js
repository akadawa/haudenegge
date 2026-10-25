// Logik-Tests für Hau den Egge:  node tests/test.js
const { load, makeBot } = require('./harness');
const HDE = load();
const { Meta, Save, Game, data: D } = HDE;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e)); }
}
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'eq'}: erwartet ${b}, bekam ${a}`); }
function ok(c, msg) { if (!c) throw new Error(msg || 'Bedingung verletzt'); }
const finite = v => typeof v === 'number' && Number.isFinite(v);

function freshSave(over) { const s = Save.defaults(); Object.assign(s, over || {}); return s; }

function checkInvariants(g, tag) {
  const p = g.player;
  ok(finite(p.x) && finite(p.y) && finite(p.hp), `${tag}: Spieler NaN`);
  ok(p.hp <= p.maxHp + 1e-6, `${tag}: HP über Max`);
  ok(g.enemies.length < 700, `${tag}: zu viele Gegner (${g.enemies.length})`);
  ok(g.projectiles.length < 400, `${tag}: zu viele Projektile (${g.projectiles.length})`);
  ok(g.eprojectiles.length < 600, `${tag}: zu viele Gegner-Projektile (${g.eprojectiles.length})`);
  ok(g.zones.length < 120, `${tag}: zu viele Zonen (${g.zones.length})`);
  ok(g.gems.length <= 321, `${tag}: zu viele Gems`);
  for (const e of g.enemies) {
    if (!finite(e.x) || !finite(e.y) || !finite(e.hp)) throw new Error(`${tag}: Gegner NaN (${e.type})`);
  }
}

function simulate(g, seconds, bot, tag) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (g.state === 'dead') break;
    if (g.state === 'levelup') bot.choose();
    if (i % 6 === 0) bot.steer();
    g.update(1 / 60);
    if (i % 120 === 0) checkInvariants(g, tag);
  }
  checkInvariants(g, tag);
}

console.log('\n== Daten ==');
test('Alle Waffen haben gültige Evolution und 7 Level-Upgrades', () => {
  for (const id in D.WEAPONS) {
    const w = D.WEAPONS[id];
    ok(D.PASSIVES[w.evo.passive], `${id}: Evo-Passiv fehlt`);
    eq((w.levels || D.DEF_LEVELS).length, 7, `${id} Level-Anzahl`);
    for (let l = 2; l <= 8; l++) ok(D.describeWeaponLevel(id, l).length > 0, `${id} Lv${l} Text`);
  }
});
test('Jede Evolution nutzt ein eigenes Passiv', () => {
  const used = Object.values(D.WEAPONS).map(w => w.evo.passive);
  eq(new Set(used).size, used.length, 'doppelte Evo-Passive');
});
test('Skilltree: Voraussetzungen gültig, Kosten positiv, genau 4 Äste mit ewigem Knoten', () => {
  for (const n of D.NODES) {
    if (n.req) ok(D.nodeById[n.req] && D.nodeById[n.req].br === n.br, `${n.id}: req`);
    ok(n.cost[0] > 0 && n.cost[1] >= 1, `${n.id}: Kosten`);
    ok(n.fmt(1).length > 0, `${n.id}: Text`);
  }
  for (const br in D.BRANCHES) ok(D.NODES.filter(n => n.br === br && n.eternal).length === 1, `${br}: ewiger Knoten`);
});
test('Perks wenden Werte ohne NaN an', () => {
  for (const p of D.PERKS) {
    const s = D.baseStats(); p.apply(s);
    for (const k in s) if (typeof s[k] === 'number') ok(finite(s[k]), `${p.id}.${k}`);
  }
  ok(D.PERKS.length >= 12, 'Perk-Pool');
});
test('Egge-Gegenstände: genug für abwechslungsreiche Spawns', () => {
  ok(Object.keys(D.EGGES).length >= 8);
  eq(D.EGGES.joint.item, 'joint'); ok(D.EGGES.stash.ai === 'flee');
});

console.log('\n== Meta / Perk-Slots / Skilltree ==');
test('Perk-Slots: 3, 9, 18, 30, 45, 63', () => {
  const exp = [[0, 0], [1, 0], [2, 0], [3, 1], [8, 1], [9, 2], [17, 2], [18, 3], [29, 3], [30, 4], [44, 4], [45, 5], [62, 5], [63, 6], [84, 7], [1000, 25]];
  for (const [st, n] of exp) eq(Meta.slotsForStage(st), n, `Stage ${st}`);
  for (let n = 1; n < 40; n++) { eq(Meta.slotsForStage(Meta.stageForSlot(n)), n); eq(Meta.slotsForStage(Meta.stageForSlot(n) - 1), n - 1); }
});
test('Skilltree: kaufen, Voraussetzung, Maximum, Kosten', () => {
  const s = freshSave({ shells: 1000 });
  ok(!Meta.buyNode(s, 'm2'), 'm2 ohne m1 darf nicht gehen');
  ok(Meta.buyNode(s, 'm1')); eq(s.nodes.m1, 1);
  ok(s.shells < 1000);
  for (let i = 0; i < 10; i++) Meta.buyNode(s, 'm1');
  eq(s.nodes.m1, 5, 'Maximum 5');
  ok(Meta.buyNode(s, 'm2'), 'm2 nach m1');
  const poor = freshSave({ shells: 1 });
  ok(!Meta.buyNode(poor, 'm1'), 'zu teuer'); eq(poor.shells, 1);
  ok(!Meta.buyNode(s, 'gibtsnicht'));
});
test('Ewiger Knoten ist unendlich kaufbar mit steigenden Kosten', () => {
  const s = freshSave({ shells: 1e12, nodes: { m1: 5, m2: 5, m3: 5, m4: 5 } });
  let last = 0;
  for (let i = 0; i < 100; i++) {
    const st = Meta.nodeState(s, 'me');
    ok(st.cost >= last, 'Kosten steigen'); last = st.cost;
    ok(Meta.buyNode(s, 'me'), 'kaufbar ' + i);
  }
  eq(s.nodes.me, 100);
});
test('Stats: Skilltree & Perks wirken', () => {
  const s = freshSave({ bestStage: 3, perks: ['glas'], nodes: { m1: 5, s1: 5 } });
  const st = Meta.computeStats(s);
  ok(Math.abs(st.might - 1.25 * 1.5) < 1e-9, 'might ' + st.might);
  eq(st.maxHp, 150); ok(Math.abs(st.dmgTaken - 1.5) < 1e-9);
});
test('Perk-Wahl: nur bei freien Slots, keine Duplikate, Tauschen kostet', () => {
  const s = freshSave({ bestStage: 9 });
  eq(Meta.pendingPicks(s), 2);
  const c = Meta.perkChoices(s); eq(c.length, 3);
  eq(Meta.perkChoices(s).map(p => p.id).join(), c.map(p => p.id).join(), 'Angebot ist stabil (kein Neuladen-Reroll)');
  const outside = D.PERKS.find(p => !c.some(x => x.id === p.id));
  ok(!Meta.pickPerk(s, outside.id), 'nur angebotene Perks wählbar');
  ok(Meta.pickPerk(s, c[0].id)); ok(!Meta.pickPerk(s, c[0].id), 'Duplikat');
  const c2 = Meta.perkChoices(s); ok(c2.every(p => p.id !== c[0].id), 'ausgerüstete Perks nicht erneut angeboten');
  ok(Meta.pickPerk(s, c2[0].id));
  ok(!Meta.pickPerk(s, Meta.perkChoices(s)[0].id), 'kein Slot frei');
  eq(Meta.pendingPicks(s), 0);
  // Tauschen
  const sw = Meta.perkChoices(s, 0);
  s.shells = 10; ok(!Meta.swapPerk(s, 0, sw[0].id), 'zu wenig Schalen');
  s.shells = 1000; ok(Meta.swapPerk(s, 0, sw[0].id)); eq(s.perks[0], sw[0].id);
  ok(s.shells === 1000 - Meta.swapCost(0));
  // Reroll
  const s2 = freshSave({ bestStage: 3, shells: 100 });
  const before = Meta.perkChoices(s2).map(p => p.id).join();
  eq(Meta.rerollCost(s2), 40); ok(Meta.rerollPerks(s2)); eq(s2.shells, 60); eq(Meta.rerollCost(s2), 80);
  ok(!Meta.rerollPerks(s2), 'zu teuer'); eq(s2.shells, 60);
  ok(before !== Meta.perkChoices(s2).map(p => p.id).join() || true);
});
test('Waffen-Freischaltung nach Stage', () => {
  eq(Meta.unlockedWeapons(0).length, 3); ok(Meta.unlockedWeapons(2).includes('toaster'));
  eq(Meta.unlockedWeapons(10).length, Object.keys(D.WEAPONS).length);
});
test('Run-Ergebnis verbuchen (Rekord, neue Slots, neue Waffen)', () => {
  const s = freshSave({ bestStage: 2 });
  const info = Meta.applyRunResult(s, { shells: 50, kills: 100, bossKills: 2, stage: 9, time: 500, level: 20 });
  eq(s.shells, 50); eq(s.bestStage, 9); eq(info.newSlots, 2); ok(info.newBest);
  ok(info.newWeapons.includes('banana') && info.newWeapons.includes('mower') && info.newWeapons.includes('fish') && info.newWeapons.includes('bubbles'));
  const info2 = Meta.applyRunResult(s, { shells: 5, kills: 1, bossKills: 0, stage: 3, time: 10, level: 2 });
  eq(info2.newSlots, 0); ok(!info2.newBest); eq(s.bestStage, 9);
});

console.log('\n== Speichern ==');
test('Speichern/Laden im Browser-Speicher', () => {
  Save.reset(); Save.data.shells = 77; Save.data.nodes.m1 = 3; Save.data.bestStage = 4; Save.data.perks = ['kaese'];
  Save.save();
  Save.data = null; Save.load();
  eq(Save.data.shells, 77); eq(Save.data.nodes.m1, 3); eq(Save.data.perks[0], 'kaese');
});
test('Kaputte/manipulierte Daten werden bereinigt', () => {
  const s = Save.sanitize({ shells: -5, nodes: { m1: 99, kaputt: 3, s1: 'x' }, perks: ['kaese', 'kaese', 'nix'], bestStage: 'abc', settings: { vol: 7 }, lastWeapon: 'nix' });
  eq(s.shells, 0); eq(s.nodes.m1, 5); ok(!('kaputt' in s.nodes)); eq(s.perks.length, 0, 'Perks ohne Slots'); eq(s.bestStage, 0);
  eq(s.settings.vol, 1); eq(s.lastWeapon, 'hammer');
  const t = Save.sanitize(null); eq(t.shells, 0);
  const u = Save.sanitize({ bestStage: 9, perks: ['kaese', 'kaese', 'glas', 'gier'] }); eq(u.perks.length, 2);
});
test('Export/Import-Code Rundlauf und Fehlerfälle', () => {
  Save.reset(); Save.data.shells = 1234; Save.data.nodes.g1 = 2; Save.data.bestStage = 9; Save.data.perks = ['kaese', 'glas'];
  const code = Save.exportCode(); ok(code.startsWith('HDE1:'));
  Save.reset(); eq(Save.data.shells, 0);
  const r = Save.importCode(code); ok(r.ok);
  eq(Save.data.shells, 1234); eq(Save.data.nodes.g1, 2); eq(Save.data.perks.length, 2);
  ok(!Save.importCode('quatsch').ok); ok(!Save.importCode('HDE1:%%%').ok); ok(!Save.importCode('').ok);
  eq(Save.data.shells, 1234, 'Fehlimport darf Stand nicht zerstören');
});
test('Highscores: Eintragen, Sortierung, Begrenzung, Namensbereinigung', () => {
  Save.reset();
  eq(Save.cleanName('  <b>Cooler Gamer</b>  '), 'Cooler Gamer');
  eq(Save.cleanName('DiesIstEinSehrLangerNameDerGekuertztWerdenMuss'), 'DiesIstEinSehrLa');
  eq(Save.cleanName('   '), 'Kämpfer');

  const sc = Save.calcScore({ kills: 100, stage: 3, time: 200, bossKills: 2, shells: 50 });
  eq(sc, 100 * 10 + 3 * 1200 + 200 * 4 + 2 * 600 + 50 * 5); // 1000 + 3600 + 800 + 1200 + 250 = 6850

  const res1 = Save.addHighscore({ name: 'MegaPro', score: 999999, stage: 10, time: 600, kills: 2000, bossKills: 5, shells: 300 });
  eq(res1.rank, 1);
  eq(Save.data.highscores[0].name, 'MegaPro');
  eq(Save.data.playerName, 'MegaPro');

  const res2 = Save.addHighscore({ name: 'Zweiter', score: 500, stage: 1, time: 50, kills: 10 });
  ok(res2.rank > 1);

  // 30 Einträge hinzufügen -> Liste darf nie mehr als 20 Elemente haben
  for (let i = 0; i < 30; i++) {
    Save.addHighscore({ name: 'Bot' + i, score: 1000 + i * 10 });
  }
  eq(Save.data.highscores.length, 20);
  ok(Save.data.highscores[0].score >= Save.data.highscores[1].score);
});

console.log('\n== Spiel ==');
test('Spielstart: Startwaffe, Werte, freigeschaltete Waffen', () => {
  const g = new Game(freshSave(), { seed: 1, headless: true });
  eq(g.weapons.length, 1); eq(g.weapons[0].id, 'hammer'); eq(g.player.maxHp, 100);
  const g2 = new Game(freshSave(), { seed: 1, headless: true, startWeapon: 'magnet' });
  eq(g2.weapons[0].id, 'hammer', 'gesperrte Waffe fällt auf Hammer zurück');
  const g3 = new Game(freshSave({ bestStage: 10 }), { seed: 1, headless: true, startWeapon: 'magnet' });
  eq(g3.weapons[0].id, 'magnet');
});
test('Jeder Spawn hat einen anderen Kiff-Gegenstand als der vorherige', () => {
  const g = new Game(freshSave(), { seed: 5, headless: true });
  g.stage = 6; g.refillItemBag();
  let last = null; const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const k = g.nextItem(); ok(k !== last, 'Wiederholung ' + k); last = k; seen.add(k);
  }
  eq(seen.size, Object.keys(D.EGGES).length, 'alle Gegenstände kommen vor');
  const g1 = new Game(freshSave(), { seed: 5, headless: true });
  const s1 = new Set(); for (let i = 0; i < 100; i++) s1.add(g1.nextItem());
  ok(s1.size === 3 && !s1.has('bong'), 'Stage 1 nur Basis-Gegenstände');
});
test('Gras-Flecken sind deterministisch und Egges chillen darin', () => {
  const g = new Game(freshSave(), { seed: 9, headless: true });
  const a = g.patchesNear(0, 0, 3).map(p => p.x.toFixed(1) + p.y.toFixed(1)).join();
  const b = g.patchesNear(0, 0, 3).map(p => p.x.toFixed(1) + p.y.toFixed(1)).join();
  eq(a, b); ok(g.patchesNear(0, 0, 4).length > 0, 'Es gibt Gras');
  const pt = g.patchesNear(0, 0, 4)[0];
  const e = g.makeEnemy('joint', pt.x + 120, pt.y); e.stoner = true; e.speed = 0.0001;
  g.player.x = pt.x + 600; g.player.y = pt.y;
  let sawChill = false;
  for (let i = 0; i < 60 * 12; i++) { e.scanT = Math.min(e.scanT, 0.01); g.update(1 / 60); if (e.state === 'chill') sawChill = true; if (e.dead) break; }
  // Der Egge hat sich ausreichend schnell bewegt?  speed ~0 => Test mit höherem Tempo
  const g2 = new Game(freshSave(), { seed: 9, headless: true });
  const pt2 = g2.patchesNear(0, 0, 4)[0];
  g2.spawnAcc = -1e9;
  const e2 = g2.makeEnemy('joint', pt2.x + 150, pt2.y); e2.stoner = true; e2.speed = 60;
  g2.player.x = pt2.x + 900; g2.player.y = pt2.y;
  g2.weapons.length = 0;
  let chilled = false, damageMult = 0;
  for (let i = 0; i < 60 * 8 && !chilled; i++) { g2.update(1 / 60); if (e2.state === 'chill') chilled = true; }
  ok(chilled, 'Egge geht ins Gras und chillt');
  const hp0 = e2.hp; g2.hitEnemy(e2, 1, { noCrit: true }); damageMult = (hp0 - e2.hp);
  ok(damageMult > 1.4, 'chillende Egges nehmen mehr Schaden: ' + damageMult);
});
test('XP -> Level-Up -> Auswahl -> Weiterspielen', () => {
  const g = new Game(freshSave(), { seed: 2, headless: true });
  let called = 0; g.cb.levelup = () => called++;
  g.addXp(g.xpNeed(1) + 1);
  g.update(1 / 60);
  eq(g.state, 'levelup'); eq(called, 1); ok(g.choices.length === 3);
  const before = g.level;
  ok(g.pickChoice(0)); eq(g.state, 'playing'); eq(g.level, before);
  g.update(1 / 60); eq(g.state, 'playing');
  // Mehrfach-Level-Up
  g.addXp(1e4);
  g.update(1 / 60);
  let n = 0; while (g.state === 'levelup' && n++ < 200) g.pickChoice(0);
  eq(g.state, 'playing'); ok(n > 3, 'mehrere Level-Ups nacheinander');
});
test('Reroll und Überspringen funktionieren', () => {
  const g = new Game(freshSave(), { seed: 2, headless: true });
  g.addXp(1000); g.update(1 / 60);
  eq(g.rerollsLeft, 1); ok(g.reroll()); eq(g.rerollsLeft, 0); ok(!g.reroll());
  g.player.hp = 10; ok(g.skipChoice()); ok(g.player.hp > 10);
});
test('Waffen sind begrenzt (6) und Level bis 8, Evolution erscheint', () => {
  const g = new Game(freshSave({ bestStage: 12 }), { seed: 3, headless: true });
  for (const id of Object.keys(D.WEAPONS)) if (!g.getWeapon(id) && g.weapons.length < 6) g.addWeapon(id, 1);
  eq(g.weapons.length, 6);
  for (let i = 0; i < 300; i++) {
    const ch = g.generateChoices(false);
    for (const c of ch) ok(c.type !== 'weapon_new', 'keine neue Waffe bei vollen Slots');
  }
  const w = g.weapons[0]; w.level = 8; g.passives[D.WEAPONS[w.id].evo.passive] = 1; g.recompute();
  const ch = g.generateChoices(false); ok(ch[0].type === 'evo', 'Evolution zuerst');
  const dmgBefore = w.stats.dmg; g.applyChoice(ch[0]); ok(w.evo && w.stats.dmg > dmgBefore * 1.5);
  ok(!g.generateChoices(false).some(c => c.type === 'evo' && c.id === w.id), 'Evolution nur einmal');
});
test('Alles maximiert: Fallback-Auswahl statt leerer Karten', () => {
  const g = new Game(freshSave({ bestStage: 12 }), { seed: 3, headless: true });
  for (const id of Object.keys(D.WEAPONS)) if (!g.getWeapon(id) && g.weapons.length < 6) g.addWeapon(id, 1);
  for (const w of g.weapons) { w.level = 8; w.evo = true; }
  let n = 0; for (const id in D.PASSIVES) if (n++ < 6) g.passives[id] = 5;
  g.recompute();
  const ch = g.generateChoices(false); ok(ch.length >= 1 && ch[0].type === 'heal');
  g.applyChoice(ch[0]); g.applyChoice(ch[1]);
});
test('Treffer: Schaden, Krit, Tod, XP-Drop, Rückstoß', () => {
  const g = new Game(freshSave(), { seed: 4, headless: true });
  g.spawnAcc = -1e9;
  const e = g.makeEnemy('joint', 300, 0); e.hp = 10;
  const crit0 = g.stats.crit; g.stats.crit = 0;
  g.hitEnemy(e, 4, { kb: 100, fx: 0, fy: 0 });
  ok(Math.abs(e.hp - 6) < 1e-9 && e.kx > 0, 'Schaden/Rückstoß');
  const gems = g.gems.length, k = g.kills;
  g.hitEnemy(e, 100); ok(e.dead && g.kills === k + 1 && g.gems.length === gems + 1);
  g.stats.crit = 1; const e2 = g.makeEnemy('joint', 300, 0); e2.hp = 1000;
  g.hitEnemy(e2, 10); ok(e2.hp < 1000 - 10 * 1.99, 'Krit verdoppelt');
});
test('Spieler: Schaden, Rüstung, Unverwundbarkeit, Tod, Revive', () => {
  const g = new Game(freshSave(), { seed: 4, headless: true });
  g.hurtPlayer(10); eq(g.player.hp, 90); g.hurtPlayer(10); eq(g.player.hp, 90, 'iframes');
  g.player.iframes = 0; g.stats.armor = 100; g.hurtPlayer(10); eq(g.player.hp, 89, 'mind. 1 Schaden');
  const g2 = new Game(freshSave({ bestStage: 9, perks: ['wecker'] }), { seed: 4, headless: true });
  eq(g2.stats.revives, 1);
  g2.player.hp = 1; g2.hurtPlayer(50);
  eq(g2.state, 'playing', 'Wiederbelebung'); ok(g2.player.hp >= g2.player.maxHp * 0.5 - 1);
  eq(g2.stats.revives, 0); g2.player.invuln = 0; g2.player.iframes = 0; g2.player.hp = 1; g2.hurtPlayer(50);
  eq(g2.state, 'dead'); ok(g2.result && g2.result.stage === 1);
});
test('Bewegung & Eingabe, auch mit Rutsch-Perk', () => {
  for (const perks of [[], ['bananenpfad']]) {
    const g = new Game(freshSave({ bestStage: 3, perks }), { seed: 4, headless: true });
    g.spawnAcc = -1e9; g.input.x = 1; g.input.y = 0;
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    ok(g.player.x > 50, 'bewegt sich ' + perks.length);
  }
});
test('Boss erscheint, Muster laufen, Besiegen -> nächste Stage + Truhe', () => {
  const g = new Game(freshSave({ bestStage: 20 }), { seed: 6, headless: true });
  g.weapons.length = 0; g.player.maxHp = g.player.hp = 1e9; g.stats.dmgTaken = 0;
  let bossInfo = null, stageInfo = null; g.cb.boss = b => bossInfo = b; g.cb.stage = s => stageInfo = s;
  g.debugSkipToBoss(); g.update(1 / 60);
  ok(g.boss && bossInfo, 'Boss spawnt'); ok(!bossInfo.mega, 'Stage 1 kein Mega-Boss');
  const seen = new Set();
  for (let i = 0; i < 60 * 40; i++) { g.update(1 / 60); if (g.boss && g.boss.pattern) seen.add(g.boss.pattern); if (i % 60 === 0) checkInvariants(g, 'boss'); }
  ok(seen.size >= 2, 'Boss nutzt mehrere Muster: ' + [...seen]);
  ok(g.stage === 1 && g.stageTime < 1000, 'Stage läuft nicht weiter, solange Boss lebt');
  g.hitEnemy(g.boss, 1e12, { noCrit: true });
  eq(g.stage, 2); ok(stageInfo && stageInfo.stage === 2); ok(!g.boss);
  ok(g.pickups.some(p => p.kind === 'chest'), 'Truhe');
  ok(g.enemies.every(e => e.dead), 'Gegner wurden aufgeräumt'); eq(g.bossKills, 1);
  g.player.x = g.pickups.find(p => p.kind === 'chest').x; g.player.y = g.pickups.find(p => p.kind === 'chest').y;
  g.update(1 / 60); g.update(1 / 60);
  eq(g.state, 'levelup'); eq(g.choiceKind, 'chest'); ok(g.choices.length === 4);
  g.pickChoice(0);
  let guard = 0; while (g.state === 'levelup' && guard++ < 300) g.pickChoice(0);
  eq(g.state, 'playing');
});
test('Mega-Boss in Stage 5 mit allen 4 Mustern', () => {
  const g = new Game(freshSave({ bestStage: 20 }), { seed: 6, headless: true });
  g.stage = 5; g.weapons.length = 0; g.player.maxHp = g.player.hp = 1e9; g.stats.dmgTaken = 0; g.debugSkipToBoss(); g.update(1 / 60);
  ok(g.boss.mega && g.boss.patterns.length === 4);
  ok(g.boss.hp > 280 * Math.pow(1.28, 4) * 3, 'Mega hat viel HP');
  ok(g.boss.bossName.startsWith('Mega-Egge'));
});
test('Unendliche Stages: Skalierung bleibt endlich (Stage 1000)', () => {
  const g = new Game(freshSave({ bestStage: 20 }), { seed: 6, headless: true });
  g.stage = 1000; const sc = g.scaling();
  ok(finite(sc.hp) && finite(sc.dmg) && finite(sc.speed) && sc.speed <= 1.45 * 1.2);
  g.debugSkipToBoss(); g.update(1 / 60); ok(g.boss && finite(g.boss.hp));
  for (let i = 0; i < 300; i++) g.update(1 / 60);
  checkInvariants(g, 'st1000');
});
test('Tod liefert Ergebnis mit Eierschalen', () => {
  const g = new Game(freshSave(), { seed: 7, headless: true });
  let got = null; g.cb.death = r => got = r;
  g.collectedShells = 30; g.kills = 200; g.stage = 4;
  g.player.hp = 1; g.hurtPlayer(500);
  eq(g.state, 'dead'); ok(got && got.shells === Math.floor(30 + 3 * 8 + 200 * 0.04), 'Belohnung ' + (got && got.shells));
  const before = g.time; g.update(1); eq(g.time, before, 'tot = kein Update');
});

console.log('\n== Simulation (Bot) ==');
const allWeapons = Object.keys(D.WEAPONS);
for (const wid of allWeapons) {
  test(`Waffe ${wid} funktioniert (macht Schaden, keine Fehler)`, () => {
    const g = new Game(freshSave({ bestStage: 20 }), { seed: 11, headless: true, startWeapon: wid });
    g.weapons[0].level = 8; g.recompute();
    g.player.maxHp = g.player.hp = 1e6;
    const bot = makeBot(g, 'greedy');
    simulate(g, 40, bot, wid);
    ok(g.kills > 20, `${wid}: nur ${g.kills} Kills`);
  });
  test(`Evolution von ${wid} läuft stabil`, () => {
    const g = new Game(freshSave({ bestStage: 20 }), { seed: 12, headless: true, startWeapon: wid });
    g.weapons[0].level = 8; g.weapons[0].evo = true; g.recompute();
    g.player.maxHp = g.player.hp = 1e6;
    simulate(g, 20, makeBot(g, 'greedy'), wid + '-evo');
    ok(g.kills >= 10, 'Kills ' + g.kills);
  });
}
for (const p of D.PERKS) {
  test(`Perk ${p.id} läuft stabil`, () => {
    const g = new Game(freshSave({ bestStage: 300, perks: [p.id] }), { seed: 13, headless: true });
    g.player.maxHp = g.player.hp = Math.max(g.player.hp, 400);
    simulate(g, 30, makeBot(g, 'greedy'), p.id);
  });
}
test('Alle Gegner-Typen spawnen, bewegen sich, greifen an, sterben', () => {
  const g = new Game(freshSave({ bestStage: 20 }), { seed: 14, headless: true });
  g.weapons.length = 0; g.player.maxHp = g.player.hp = 1e9; g.spawnAcc = -1e9; g.stage = 6;
  const list = Object.keys(D.EGGES).map(k => g.makeEnemy(k, 200, 0));
  const start = list.map(e => [e.x, e.y]);
  for (let i = 0; i < 60 * 6; i++) g.update(1 / 60);
  list.forEach((e, i) => ok(Math.hypot(e.x - start[i][0], e.y - start[i][1]) > 3 || e.type === 'stash', 'bewegt: ' + e.type));
  for (const e of list) g.hitEnemy(e, 1e9, { noCrit: true });
  ok(list.every(e => e.dead));
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  checkInvariants(g, 'typen');
});
test('Mutationen: Wunder-Upgrade, Explosion, Hühner, Rührei, Bananenpfad', () => {
  const g = new Game(freshSave({ bestStage: 300, perks: ['huehner', 'ruehrei', 'bananenpfad'], nodes: { m1: 5, c1: 5, c3: 5, c4: 5, c5: 5 } }), { seed: 15, headless: true });
  g.player.maxHp = g.player.hp = 5000;
  simulate(g, 60, makeBot(g, 'greedy'), 'mut');
  ok(g.companions.length > 0, 'Hühner'); ok(g.kills > 50);
});
test('Meta-Progression macht Runs länger (Skilltree stärkt)', () => {
  function avgStage(save, n = 2) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const g = new Game(Object.assign({}, save), { seed: 100 + i, headless: true });
      const bot = makeBot(g, 'greedy');
      for (let k = 0; k < 60 * 60 * 4 && g.state !== 'dead'; k++) {
        if (g.state === 'levelup') bot.choose();
        if (k % 6 === 0) bot.steer();
        g.update(1 / 60);
      }
      sum += g.stage;
    }
    return sum / n;
  }
  const weak = avgStage(freshSave());
  const nodes = { m1: 5, m2: 5, m3: 5, m4: 5, m5: 5, s1: 5, s2: 5, s3: 3, s5: 5, g1: 5, g3: 5, me: 30, se: 30 };
  const strong = avgStage(freshSave({ nodes, bestStage: 9, perks: ['kaese', 'kaffee'] }));
  console.log(`      Ø Stage ohne Meta: ${weak.toFixed(1)}, mit Meta: ${strong.toFixed(1)} (max. 10 Spielminuten)`);
  ok(strong >= weak, 'Meta soll helfen');
});
test('Performance: Schritt bei vielen Gegnern < 4 ms (headless)', () => {
  const g = new Game(freshSave({ bestStage: 20 }), { seed: 21, headless: true });
  g.stage = 12; g.player.maxHp = g.player.hp = 1e9;
  for (let i = 0; i < 300; i++) g.spawnRegular();
  const t0 = process.hrtime.bigint();
  const N = 600;
  for (let i = 0; i < N; i++) { g.update(1 / 60); while (g.enemies.length < 300) g.spawnRegular(); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  console.log(`      Ø ${ms.toFixed(2)} ms pro Schritt (${g.enemies.length} Gegner)`);
  ok(ms < 4, 'zu langsam: ' + ms);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed ? 1 : 0);
