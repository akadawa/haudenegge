const { load, makeBot } = require('./harness');
const HDE = load();
const { Game, Save } = HDE;
const g = new Game(Save.defaults(), { seed: 501, headless: true });
const bot = makeBot(g, 'greedy');
let lastStage = 1, bossStart = 0, minute = 0;
for (let k = 0; k < 60 * 60 * 15 && g.state !== 'dead'; k++) {
  if (g.state === 'levelup') bot.choose();
  if (k % 6 === 0) bot.steer();
  const hadBoss = !!g.boss;
  g.update(1 / 60);
  if (!hadBoss && g.boss) { bossStart = g.time; console.log(`t=${g.time.toFixed(0)}s Boss Stage ${g.stage} erscheint HP=${g.boss.hp.toFixed(0)} lvl=${g.level} enemies=${g.enemies.length} hp=${g.player.hp.toFixed(0)}/${g.player.maxHp} weapons=${g.weapons.map(w => w.id + w.level + (w.evo ? '*' : '')).join(',')}`); }
  if (g.stage !== lastStage) { console.log(`t=${g.time.toFixed(0)}s Stage ${lastStage} -> ${g.stage} (Boss-Kampf ${(g.time - bossStart).toFixed(0)}s) kills=${g.kills} lvl=${g.level}`); lastStage = g.stage; }
  if (g.time > minute * 60 + 60) { minute++; console.log(`  ${minute}min: stage ${g.stage} lvl ${g.level} hp ${g.player.hp.toFixed(0)}/${g.player.maxHp} enemies ${g.enemies.length} passives=${JSON.stringify(g.passives)}`); }
}
console.log('Ende', g.state, 'Stage', g.stage, 'Zeit', g.time.toFixed(0), 'Level', g.level);
