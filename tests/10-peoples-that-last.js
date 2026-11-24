/* Peoples that last: twins, newcomers, what the dead built, a starving body's last resorts, foresight before winter, an elder's legacy. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const act = (w, a, step, em, n) => { a.policy = []; a.plan = [step]; a.intent = null; for (let k = 0; k < (n || 2); k++) { if (a.e > 30) a.e = 90; a.thirst = 0; SW.step(w, em); } };
const grass = (w, n) => { for (let i = w.W * 12; i < w.terrain.length - w.W * 12; i++) { let good = true; for (let d = 0; d < n; d++) if (w.terrain[i + d] !== 2 || w.plants[i + d] || w.shelters[i + d] || w.lodes[i + d]) good = false; if (good) return i; } };
const at = (w, o, i) => { o.x = i % w.W; o.y = Math.floor(i / w.W); o.px = o.x; o.py = o.y; };
{ // children
  const { w, st, ev, em } = fresh(7); w.creatures = []; ok(w.agents.length === 15 && SW.defaultLaws().body.lifespan === 19200 && w.laws.body.lifespan >= 19200 && w.laws.mate.twinChance === 0.2 && w.agents.filter(a => a.sex === 'f').length >= 6 && w.agents.filter(a => a.sex === 'm').length >= 6, 'a world begins with fifteen, five to a people; a life is 80 days by the law as made (the maker has since lengthened it); one birth in five is of twins');
  const pa = w.agents[0], pb = w.agents.find(o => o.people === pa.people && o.sex !== pa.sex), g = grass(w, 5); at(w, pa, g); at(w, pb, g + 1); w.laws.mate.twinChance = 1; let born = [];
  for (let k = 0; k < 60 && !born.length; k++) { w.creatures = []; [pa, pb].forEach(o => { o.e = 95; o.thirst = 0; o.mateCd = 0; o.policy = []; o.intent = null; }); pa.plan = [{ do: 'mate', name: pb.name, ticks: 3 }]; pb.plan = [{ do: 'mate', name: pa.name, ticks: 3 }]; SW.step(w, e => { em(e); if (e.type === 'birth') born.push(e.a); }); }
  ok(born.length === 2 && w.agents.find(o => o.id === born[0]).sex === 'f' && w.agents.find(o => o.id === born[1]).sex === 'm' && st.minds[born[0]] && st.minds[born[1]] && pa.stats.kids === 2 && pa.mateCd > 400, 'twins are a girl and a boy, each with a mind of its own (' + born.length + ' born; the parents can have another in ' + (w.laws.mate.cooldown / 240).toFixed(1) + ' days)');
}
{ // newcomers
  const { w, st, ev, em } = fresh(7); w.creatures = []; const lost = w.peoples[2], gone = w.agents.filter(a => a.people === lost.id || a.people === 1 && w.agents.indexOf(a) % 2); w.agents = w.agents.filter(a => gone.indexOf(a) < 0); const n0 = w.agents.length;
  for (let k = 0; k < 240 * 3 && !ev.some(e => e.type === 'arrived'); k++) { w.creatures = []; w.agents.forEach(still); SW.step(w, em); }
  const ar = ev.find(e => e.type === 'arrived'), nw = ar ? ar.ids.map(id => w.agents.find(a => a.id === id)) : [];
  ok(n0 < w.laws.arrivals.floor && ar && nw.length === 4 && nw.filter(a => a.sex === 'f').length === 2 && nw.every(a => a && a.people === lost.id && st.minds[a.id] && a.carry.length >= 3 && !(a.parents || []).length) && st.chron.some(c => /came into the land from beyond its edge/.test(c.text)), 'when the living are few (' + n0 + '), a band of four, two women and two men, of the people with none left comes into the land: ' + nw.map(a => a && a.name).join(', '));
  const t1 = w.tick; let second = null; for (let k = 0; k < 240 * 6 && !second; k++) { w.creatures = []; w.agents.forEach(still); SW.step(w, e => { em(e); if (e.type === 'arrived' && w.tick > t1) second = w.tick; }); }
  ok(w.agents.length < w.laws.arrivals.floor ? second && second - t1 >= 240 * 3 : true, 'another band follows only after some days, and none once the living are enough (' + w.agents.length + ' alive)');
  const r = K.applyOp(w, { op: 'event', kind: 'newcomers', n: 2, people: w.peoples[0].name }); SW.step(w, em); ok(r.ok && /newcomers/.test(K.OPS) && K.applyOp(w, { op: 'law', group: 'arrivals', key: 'floor', value: 12 }).ok, 'the maker can call newcomers, and set the floor: ' + r.text);
}
{ // what the dead built
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people !== a.people), g = grass(w, 8); at(w, a, g); a.wood = 40; a.stone = 40; a.knows.storage = { look: null };
  act(w, a, { do: 'build', what: 'shelter', ticks: 2 }, em); at(w, a, g + 1); act(w, a, { do: 'build', what: 'store', ticks: 2 }, em); a.carry = [{ k: 'berry', n: 14 }, { k: 'berry', n: 14 }]; act(w, a, { do: 'stash', ticks: 2 }, em); at(w, a, g + 2); act(w, a, { do: 'build', what: 'shelter', ticks: 2 }, em);
  ok(w.shelters[g] === a.id && w.stores[g + 1] && w.stores[g + 1].items.length === 2 && w.shelters[g + 2] === a.id, 'one being raises two roofs and a filled store');
  w.agents = w.agents.filter(o => o !== a); at(w, b, g + 5); still(b); SW.step(w, em);
  const pr = M.buildPrompt(st, st.minds[b.id], 'routine'); ok(/AN EMPTY SHELTER stands at/.test(pr) && /claim \{name\?\} \(take over an empty building/.test(M.buildPrompt(st, st.minds[b.id], 'deep') + pr), 'after it dies, another who comes near sees an empty building that belongs to no one');
  act(w, b, { do: 'claim', ticks: 12 }, em, 8); const cl = ev.find(e => e.type === 'claimed');
  ok(cl && cl.n === 3 && w.shelters[g] === b.id && w.shelters[g + 2] === b.id && w.stores[g + 1].by === b.id && b.stats.claimed === 3 && st.chron.some(c => /took over what the dead had left/.test(c.text)), 'it walks there and claims it, and holds every roof and the store around it (' + JSON.stringify(cl && cl.kinds) + ')');
  ev.length = 0; act(w, b, { do: 'claim', ticks: 2 }, em); ok(ev.some(e => e.type === 'fail' && /only what the dead (raised|left)|already yours/.test(e.text)), 'what the living hold cannot be claimed');
  b.carry = []; b.policy = []; b.plan = [{ do: 'goto', x: b.x + 30, y: b.y, ticks: 60 }]; b.intent = null; at(w, b, g + 3); b.e = 15; for (let k = 0; k < 6; k++) SW.step(w, em);
  ok(b.e > 20 && w.stores[g + 1].items.length < 2, 'starving, a body goes to its own store and eats from it, whatever its plan (energy 15 → ' + Math.round(b.e) + ')');
}
{ // a starving body follows its nose
  const { w, st, ev, em } = fresh(11); w.creatures = []; const a = w.agents[0], g = grass(w, 6); at(w, a, g); const R = w.laws.body.sight + 3;
  let fi = -1; for (let i = 0; i < w.plants.length; i++) { const q = w.plants[i]; if (!q) continue; const x = i % w.W, y = Math.floor(i / w.W), d = Math.max(Math.abs(x - a.x), Math.abs(y - a.y)); if (d <= 26) { if (d >= R + 4 && d <= 24 && fi < 0 && w.laws.plants[q.sp].nutrition > 3 && w.terrain[i] !== 0) { fi = i; q.food = 9; q.g = 1; } else w.plants[i] = null; } }
  const d0 = Math.max(Math.abs(fi % w.W - a.x), Math.abs(Math.floor(fi / w.W) - a.y)); a.carry = []; a.policy = []; a.plan = []; a.intent = null; a.habits.avoid = []; let seen = '';
  for (let k = 0; k < 260 && (a.stats.bites || 0) === 0; k++) { a.e = Math.min(a.e, 15); a.thirst = 0; w.creatures = []; SW.step(w, em); if (/smell of food/.test(a.doing)) seen = a.doing; }
  { const d1 = Math.max(Math.abs(fi % w.W - a.x), Math.abs(Math.floor(fi / w.W) - a.y)); ok(fi >= 0 && d0 > w.laws.body.sight && seen && ((a.stats.bites || 0) > 0 || d1 < d0 - 6), 'with nothing to eat in sight, a starving body follows its nose toward food ' + d0 + ' steps off (now ' + d1 + ' away' + ((a.stats.bites || 0) ? ', and has eaten' : '') + ')'); }
}
{ // foresight before the lean season
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents.find(o => !o.knows.storage), g = grass(w, 4); at(w, a, g); for (const k in a.knows) if (k !== 'tools') delete a.knows[k]; a.knows.tools = { look: null }; a.lore = 1.2; a.stats.built = 2; a.press = {};
  delete w.laws.tree.storage.spur; ok(!SW.pathsFor(w, a).open.some(o => o.id === 'storage'), 'in spring, storage is not yet within reach of one who has built twice');
  w.tick = w.laws.time.dayLength * w.laws.time.seasonDays * 2 + 1; for (let k = 0; k < 300; k++) { w.creatures = []; still(a); a.e = 90; SW.step(w, em); }
  const o = SW.pathsFor(w, a).open.find(q => q.id === 'storage'); ok(SW.season(w) === 2 && a.press.turning > 0.9 && o && o.why === 'the year turning toward the lean season', 'in autumn everyone feels the year turning (' + a.press.turning.toFixed(2) + '), and that alone brings storage within reach before the hunger comes');
  ok(w.laws.time.winterWither === 0.0025 && (w.laws.time.winterGrowth === 0.25 || w.laws.time.winterGrowth === 0.35) && w.laws.ecology.seeding === 0.75, 'winter withers standing food more slowly than it did, and plants seed at three quarters of their full rate whatever the bounty');
}
{ // an elder's legacy, and the cry
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people === a.people && o !== a), g = grass(w, 4); at(w, a, g); at(w, b, g + 1); still(a); still(b);
  a.age = Math.floor(a.life * 0.85); a.knows.medicine = { look: null }; w.agents.forEach(o => { if (o !== a) delete o.knows.medicine; });
  const lk = SW.look(w, a), dr = M.drives(st, st.minds[a.id], a, lk.vars || (lk.S && lk.S.vars) || lk) || [], lg = dr.find(q => /Legacy/.test(JSON.stringify(q))); ok(lg && /medicine/.test(JSON.stringify(lg)), 'an elder who alone knows a way feels it: ' + JSON.stringify(lg || dr[0]).slice(0, 150));
  const c = w.agents.find(o => o !== a && o !== b); c.parents = [a.id]; at(w, c, g + 3 + w.W * 20); c.policy = []; c.plan = []; c.carry = []; c.e = 26; c.lowFlag = false; for (let k = 0; k < 40 && !ev.some(e => e.type === 'low' && e.a === c.id); k++) { still(a); w.creatures = []; SW.step(w, em); }
  ok(st.minds[a.id].events.some(e => /carry food, or gather it on the way/.test(e.text)), 'kin who hear a starving cry are told that empty hands save no one');
  const s = K.stats(st); ok(s.standing.length === w.agents.length && typeof s.standing[0].followers === 'number' && Array.isArray(s.pledgesRefused) && typeof s.emptyBuildingsOfTheDead === 'number' && typeof s.newcomersSoFar === 'number', 'the maker sees every being\'s standing, each refused pledge with its reason, the empty buildings of the dead and the newcomers');
  const low = w.agents.find(o => ![a, b, c].includes(o)); at(w, low, g + 2); still(low); a.stats.built = 0; b.stat = null; a.stat = null; b.stats.built = 30; b.stats.gifts = 30; ev.length = 0; SW.pledge(w, b, a.name, em); ok(w.tally.pledgesRefused && w.tally.pledgesRefused.length === 1 && w.tally.pledgesRefused[0].who === b.name, 'a pledge refused for want of standing is kept, with both standings');
}
{ // forty days on instinct
  for (const seed of [7, 11, 42]) { const w = SW.createWorld(seed); const d = {}; let arr = 0; for (let k = 0; k < 240 * 40; k++) SW.step(w, e => { if (e.type === 'death') { const c = e.cause.replace(/ by a .*/, ' by a beast'); d[c] = (d[c] || 0) + 1; } if (e.type === 'arrived') arr += e.ids.length; }); ok(w.agents.length >= 9 && w.creatures.length >= 50, 'seed ' + seed + ': 40 days without minds: ' + w.agents.length + ' alive of 15 founders and ' + arr + ' newcomers, deaths ' + JSON.stringify(d)); }
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
