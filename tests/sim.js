// Balance-Simulation:  node tests/sim.js [Szenario] [Läufe]
// Zeigt, wie weit ein einfacher Bot mit verschiedenen Meta-Ständen kommt.
const { load, makeBot } = require('./harness');
const HDE = load();
const { Meta, Save, Game } = HDE;

const scenarios = {
  neu:     () => Save.defaults(),
  fruehe:  () => Object.assign(Save.defaults(), { bestStage: 3, nodes: { m1: 3, m2: 2, s1: 3, s2: 2, g1: 3 } }),
  mittel:  () => Object.assign(Save.defaults(), { bestStage: 9, perks: ['armor_vest', 'coffee_donut'], nodes: { m1: 5, m2: 5, m3: 5, m4: 3, m5: 3, s1: 5, s2: 5, s3: 2, s5: 5, g1: 5, g2: 5, g3: 5, g4: 2, c1: 5, c3: 3, c5: 3 } }),
  stark:   () => Object.assign(Save.defaults(), { bestStage: 30, perks: ['armor_vest', 'coffee_donut', 'sharpshooter', 'k9_unit'], nodes: { m1: 5, m2: 5, m3: 5, m4: 5, m5: 5, s1: 5, s2: 5, s3: 3, s4: 1, s5: 5, g1: 5, g2: 5, g3: 5, g4: 3, g5: 3, c1: 5, c2: 1, c3: 5, c4: 5, c5: 5, me: 40, se: 40, ge: 20, ce: 20 } }),
};

const which = process.argv[2] ? [process.argv[2]] : Object.keys(scenarios);
const runs = parseInt(process.argv[3] || '6', 10);
const maxMinutes = parseInt(process.argv[4] || '30', 10);

for (const name of which) {
  const stages = [], times = [], levels = [], kills = [], shells = [];
  const t0 = Date.now();
  for (let i = 0; i < runs; i++) {
    const save = scenarios[name]();
    const g = new Game(save, { seed: 500 + i, headless: true });
    const bot = makeBot(g, 'greedy');
    for (let k = 0; k < 60 * 60 * maxMinutes && g.state !== 'dead'; k++) {
      if (g.state === 'levelup') bot.choose();
      if (k % 6 === 0) bot.steer();
      g.update(1 / 60);
    }
    if (g.state !== 'dead') g.die();
    stages.push(g.stage); times.push(g.time / 60); levels.push(g.level); kills.push(g.kills); shells.push(g.result.shells);
  }
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length);
  console.log(`${name.padEnd(8)} Stage Ø${avg(stages).toFixed(1)} [${Math.min(...stages)}-${Math.max(...stages)}]  Zeit Ø${avg(times).toFixed(1)} min  Level Ø${avg(levels).toFixed(0)}  Kills Ø${avg(kills).toFixed(0)}  Schalen Ø${avg(shells).toFixed(0)}   (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
