const SW = require('../src/engine.js');
const T = +(process.argv[2] || 12000);
for (const seed of [7, 11, 42]) {
  const w = SW.createWorld(seed); const t0 = Date.now();
  const c0 = {}; w.terrain.forEach(t => c0[SW.TERRAIN[t]] = (c0[SW.TERRAIN[t]] || 0) + 1);
  const deaths = {}, ev = {}; const rows = [];
  for (let t = 1; t <= T; t++) {
    SW.step(w, e => { ev[e.type] = (ev[e.type] || 0) + 1; if (e.type === 'death') { const k = e.cause.replace(/ by .*/, ''); deaths[k] = (deaths[k] || 0) + 1; } });
    if (t % 3000 === 0) { const c = SW.census(w); const ck = {}; w.creatures.forEach(x => ck[x.sp] = (ck[x.sp] || 0) + 1); rows.push(`${c.agents}a/${c.plants}p/${c.hopper}g/${c.stalker}h k${c.plantKinds}+${c.creatureKinds} ` + JSON.stringify(ck).replace(/"/g, '')); }
  }
  console.log(`seed ${seed} ${JSON.stringify(c0).replace(/"/g, '')}\n  ${rows.join('\n  ')}\n  deaths ${JSON.stringify(deaths)} ms/tick ${((Date.now() - t0) / T).toFixed(3)} variety ${ev.variety} extinct ${ev.extinct}`);
}
const w = SW.createWorld(7); const a = w.agents[0]; let t0 = Date.now(); const f = SW.forecast(w, a.id, SW.instinctPolicy(), 480); console.log('forecast ms', Date.now() - t0, JSON.stringify(f));
