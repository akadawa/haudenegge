const { load } = require('./harness');
const HDE = load();
const { Game, Save, data: D } = HDE;

function ok(c, msg) { if (!c) throw new Error(msg || 'Condition failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`); }

console.log('Testing Level 30+ Gems, Scaling and Anti-Camping...');

// 1. Level 30 Gem dropping test
const g = new Game(Save.defaults(), { seed: 42, headless: false });
g.level = 30;
g.stage = 4;
g.stageTime = 60;

// Fill gems array with 250 distant gems
for (let i = 0; i < 250; i++) {
  g.gems.push({ x: 1000 + i, y: 1000 + i, v: 1, mag: false, spd: 0 });
}
eq(g.gems.length, 250, 'Filled 250 gems');

// Kill enemy right next to player at (10, 10)
const gemCountBefore = g.gems.length;
const e = g.makeEnemy('joint', 10, 10);
g.hitEnemy(e, 9999);

// Verify a gem was dropped right next to player
const localGem = g.gems.find(gm => Math.hypot(gm.x - 10, gm.y - 10) < 15);
ok(localGem, 'Gems continue to drop right next to player at level 30 even with 250+ gems on map!');
ok(g.gems.length <= 250, 'Distant gems were pruned so total count does not explode');

// 2. Difficulty Scaling at Level 30 vs Level 1
const sc1 = (new Game(Save.defaults(), { seed: 1 })).scaling();
const sc30 = g.scaling();

console.log(`Scaling Level 1, Stage 1: HP=${sc1.hp.toFixed(1)}, DMG=${sc1.dmg.toFixed(2)}, SPD=${sc1.speed.toFixed(2)}`);
console.log(`Scaling Level 30, Stage 4: HP=${sc30.hp.toFixed(1)}, DMG=${sc30.dmg.toFixed(2)}, SPD=${sc30.speed.toFixed(2)}`);

ok(sc30.hp > sc1.hp * 10, `Level 30 Stage 4 HP is ${sc30.hp / sc1.hp}x higher! (expected > 10x)`);
ok(sc30.dmg > sc1.dmg * 1.5, `Level 30 Stage 4 DMG is ${sc30.dmg / sc1.dmg}x higher!`);

// 3. Boss HP scaling at Stage 4, Level 30
const boss = g.spawnBoss();
console.log(`Stage 4 Level 30 Boss HP: ${boss.hp} (MaxHP: ${boss.maxHp})`);
ok(boss.hp > 8000, `Boss HP is suitably epic for Level 30 Stage 4 (${boss.hp})`);

// 4. Anti-Camping Test
g.player.x = 0;
g.player.y = 0;
g.input.x = 0;
g.input.y = 0;
// Spawn 8 enemies
for (let i = 0; i < 8; i++) g.makeEnemy('papers', 100 + i * 10, 100);

const initialHp = g.player.hp;
// Simulate standing still for 3.6 seconds
for (let i = 0; i < 60 * 3.6; i++) {
  g.update(1 / 60);
}
ok(g.player.hp < initialHp, `Anti-camping mortar dealt damage to standing player! (HP went from ${initialHp} to ${g.player.hp})`);
ok(g.zones.some(z => z.kind === 'puddle'), 'Anti-camping mortar left burning hazard on ground!');

// 5. Test new floor pickups (magnet, bomb, coffee)
g.enemies = [];
g.player.hp = 100;
g.pickups.push({ kind: 'magnet', x: 0, y: 0, v: 1, life: 10 });
g.update(1 / 60);
ok(g.gems.every(gm => gm.mag), 'Magnet vacuumed ALL gems on map!');

g.pickups.push({ kind: 'coffee', x: 0, y: 0, v: 1, life: 10 });
g.update(1 / 60);
ok(g.coffeeBoost > 0, 'Coffee boost active!');

console.log('✓ All Level 30, Scaling, and Anti-Camping tests PASSED!');
