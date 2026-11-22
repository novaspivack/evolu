const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const land = (w, t, far) => { const f = SW.waterField(w); let best = -1; for (let i = 0; i < w.terrain.length; i++) if ((t == null ? w.terrain[i] !== 0 && w.terrain[i] !== 5 : w.terrain[i] === t) && (best < 0 || (far ? f[i] > f[best] : false))) best = i; return { i: best, x: best % w.W, y: Math.floor(best / w.W), d: f[best] }; };
{ // thirst
  const { w, st, ev, em } = fresh(7); const a = w.agents[0], far = land(w, null, true); a.x = far.x; a.y = far.y; a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.thirst = 0; w.weather = { kind: 'clear', until: 1e9 };
  let reached = -1; for (let k = 0; k < 700 && reached < 0; k++) { a.e = 90; w.weather = { kind: 'clear', until: 1e9 }; SW.step(w, em); if (ev.some(e => e.type === 'drank' && e.a === a.id)) reached = k; }
  ok(far.d >= 8 && ev.some(e => e.type === 'parched' && e.a === a.id) && reached > 0 && a.thirst < 5, 'a being ' + far.d + ' steps from water grows parched, walks there by itself and drinks (after ' + reached + ' moments)');
  ok(st.minds[a.id].events.some(e => /PARCHED/.test(e.text)), 'it is told it is parched');
  const b = w.agents[1], f2 = land(w, null, true); b.x = f2.x; b.y = f2.y; b.pots = 1; b.water = 3; b.thirst = 61; b.policy = [{ if: [], do: 'linger' }]; b.plan = []; w.weather = { kind: 'clear', until: 1e9 }; SW.step(w, em); ok(b.water === 2 && b.thirst < 20, 'a pot of water is drunk from away from the bank');
  const c = w.agents[2]; c.x = f2.x; c.y = f2.y; c.thirst = 100; c.hp = 0.05; c.policy = []; c.plan = []; for (let k = 0; k < 3; k++) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) w.walls[(c.y + dy) * w.W + c.x + dx] = 9999; w.weather = { kind: 'clear', until: 1e9 }; SW.step(w, em); } ok(ev.some(e => e.type === 'death' && e.a === c.id && e.cause === 'thirst'), 'thirst can kill one who cannot reach water');
  const m = st.minds[w.agents[0].id]; w.agents[0].thirst = 80; ok(M.drives(st, m, w.agents[0], SW.look(w, w.agents[0])).some(q => q.k === 'thirst') && /THIRST: PARCHED/.test(M.buildPrompt(st, m, 'routine')), 'thirst is a drive and is in the prompt');
}
{ // wellbeing
  const { w, st, ev, em } = fresh(11); w.creatures = []; const a = w.agents[0], b = w.agents[1]; a.policy = [{ if: [], do: 'linger' }]; b.policy = [{ if: [], do: 'linger' }]; b.x = a.x + 1; b.y = a.y; a.rel[b.id] = 0.6; b.rel[a.id] = 0.6;
  for (let k = 0; k < 200; k++) { a.e = 12; a.hp = 30; b.e = 90; b.hp = 100; b.mood.fear = 0; b.x = a.x + 1; b.y = a.y; SW.step(w, em); } b.x = a.x + 1; b.y = a.y;
  const wa = SW.wellbeing(a), wb = SW.wellbeing(b); ok(wa.suffering > 0.6 && wa.suffering > wb.suffering + 0.3 && wa.happiness < wb.happiness, 'the starving and hurt suffer (' + wa.suffering.toFixed(2) + ' against ' + wb.suffering.toFixed(2) + ')');
  ok(b.mood.grief > 0.04, 'a friend beside them takes on grief (' + b.mood.grief.toFixed(2) + ')');
  const pr = M.buildPrompt(st, st.minds[b.id], 'routine'); ok(/HOW YOU FARE/.test(pr) && /plainly SUFFERING/.test(pr), 'each sees how it fares, and sees suffering in another');
  ok(M.drives(st, st.minds[b.id], b, SW.look(w, b)).some(q => q.k === 'compassion'), 'and is moved by it');
  a.sat = 0.3; w.tick += 2000; ok(M.drives(st, st.minds[a.id], a, SW.look(w, a)).some(q => q.k === 'discontent' || q.k === 'hunger'), 'long dissatisfaction speaks as discontent');
  ok(K.stats(st).wellbeing.sufferingMedian >= 0, 'the maker sees the medians: ' + JSON.stringify(K.stats(st).wellbeing));
}
{ // calamities
  const { w, st, ev, em } = fresh(7); const i = w.terrain.findIndex(t => t === 2), x = i % w.W, y = Math.floor(i / w.W); const a = w.agents[0];
  for (let k = 0; k < 9; k++) w.shelters[i + (k % 3) - 1 + (Math.floor(k / 3) - 1) * w.W] = a.id; a.x = x; a.y = y; const hp0 = a.hp;
  let r = SW.disaster(w, 'tornado', em, x, y); ok(r.down > 0 && a.hp < hp0, 'a tornado tears down buildings and throws people (' + r.down + ' down)');
  const p0 = w.plants.filter(p => p && p.food > 0).reduce((s, p) => s + p.food, 0); r = SW.disaster(w, 'blizzard', em); const p1 = w.plants.filter(p => p && p.food > 0).reduce((s, p) => s + p.food, 0);
  ok(w.weather.kind === 'snow' && w.blizzard > w.tick && p1 < p0 * 0.8, 'a blizzard brings snow, a day of hard cold, and buries food (' + Math.round(p0) + '→' + Math.round(p1) + ')');
  const b = w.agents[1], c = w.agents[2]; b.policy = c.policy = [{ if: [], do: 'linger' }]; b.plan = c.plan = []; b.e = c.e = 80; const e0 = b.e; SW.step(w, em); const lostB = e0 - b.e; w.blizzard = 0; b.e = 80; SW.step(w, em); ok(lostB > (80 - b.e) * 1.5, 'the blizzard drains an unsheltered body faster (' + lostB.toFixed(2) + ' against ' + (80 - b.e).toFixed(2) + ' a moment)');
  const f = SW.waterField(w); let ci = -1; for (let k = 0; k < f.length; k++) if (f[k] === 2 && w.terrain[k] === 2) { ci = k; break; } let fell = 0; for (let k = 0; k < 10 && !fell; k++) { w.shelters[ci] = a.id; fell = SW.disaster(w, 'hurricane', em).down; } ok(fell > 0 && w.weather.kind === 'storm', 'a hurricane batters what stands near water and brings a long storm');
  r = SW.disaster(w, 'volcano', em); const v1 = { x: w.volcano.x, y: w.volcano.y }; const r2 = SW.disaster(w, 'volcano', em); ok(w.terrain[v1.y * w.W + v1.x] === 4 && r2.x === v1.x && r2.y === v1.y, 'a volcano is a mountain that burns again in the same place (' + v1.x + ',' + v1.y + ')');
  ok(st.chron.some(q => /TWISTING WIND/.test(q.text)) && st.chron.some(q => /BLIZZARD/.test(q.text)) && st.chron.some(q => /MOUNTAIN/.test(q.text)), 'all are chronicled'); ok(SW.DISASTERS.every(k => K.applyOp(w, { op: 'event', kind: k }).ok), 'the maker can send any of the eight');
  const seen = {}; const w2 = SW.createWorld(5); for (let k = 0; k < 400; k++) { w2.tick = k * 97; seen[SW.pickDisaster(w2)] = 1; } ok(Object.keys(seen).length === 8, 'all eight come by themselves across the seasons: ' + Object.keys(seen).join(', '));
}
{ // buildings with uses
  const { w, st, ev, em } = fresh(7); const a = w.agents[0], b = w.agents[1]; const g = (() => { for (let i = w.W * 5; i < w.terrain.length; i++) if (w.terrain[i] === 2 && w.terrain[i + 1] === 2 && w.terrain[i + 2] === 2 && !w.plants[i] && !w.plants[i + 1] && !w.plants[i + 2] && !w.shelters[i]) return i; })();
  const put = (o, i) => { o.x = i % w.W; o.y = Math.floor(i / w.W); o.policy = []; o.plan = []; o.intent = null; o.e = 90; };
  put(a, g); a.wood = 2; a.stone = 0; a.plan = [{ do: 'build', what: 'hall', ticks: 2 }]; SW.step(w, em); ok(!w.shelters[g] && ev.some(e => e.type === 'fail' && /takes 6 wood and 2 stone/.test(e.text)), 'a hall cannot be raised without its materials, and says what it takes');
  a.wood = 20; a.stone = 20; a.plan = [{ do: 'build', what: 'hall', ticks: 2 }]; a.intent = null; SW.step(w, em); ok(w.shelters[g] === a.id && SW.buildingAt(w, g) === 'hall', 'a hall is raised');
  put(b, g + 1); const r0 = a.rel[b.id] || 0; a.policy = [{ if: [], do: 'linger' }]; b.policy = [{ if: [], do: 'linger' }]; a.used = {}; SW.step(w, em); ok((a.rel[b.id] || 0) > r0 && ev.some(e => e.type === 'used' && e.kind === 'hall'), 'those gathered in a hall grow closer');
  put(a, g + 2); a.knows.masonry = { look: null }; a.plan = [{ do: 'build', what: 'tower', ticks: 2 }]; a.intent = null; a.wood = 20; a.stone = 20; const s0 = SW.look(w, a).plants.length; SW.step(w, em); a.policy = [{ if: [], do: 'linger' }]; let far = 0; const v = SW.look(w, a); v.plants.forEach(p => { if (p.d > far) far = p.d; }); ok(SW.buildingAt(w, g + 2) === 'tower' && far > SW.sight(w), 'from a tower one sees farther (' + far + ' steps against ' + SW.sight(w) + ')');
  ok(K.applyOp(w, { op: 'building', name: 'smokehouse', wood: 2, stone: 6, craft: 1, hint: 'a house for smoking meat' }).ok && w.laws.buildings.smokehouse && K.applyOp(w, { op: 'recipe', name: 'smoked meat', way: null, needs: { clay: 1, at: 'smokehouse' }, gives: { thing: 'jar' }, hint: 'x' }).ok && w.laws.recipes['smoked meat'].needs.at === 'smokehouse', 'the maker can add a kind of building and a recipe that needs it');
  ok(/KINDS OF BUILDING/.test(M.buildPrompt(st, st.minds[a.id], 'deep')) && /- smokehouse \(2 wood, 6 stone\)/.test(M.buildPrompt(st, st.minds[a.id], 'deep')), 'beings are told the kinds they can build');
  w.laws.tools.axe = { use: 'gather', power: 1.5, wear: 10, wood: 1, stone: 1, by: a.id }; a.designs.axe = 1; a.knows.tools = a.knows.tools || { look: null };
}
{ // milk, wool, riding
  const { w, st, ev, em } = fresh(7); const a = w.agents[0]; a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.knows.herding = { look: null }; a.knows.riding = { look: null }; w.creatures = w.creatures.filter(c => !w.laws.creatures[c.sp].predator);
  const hb = w.creatures.find(c => c.sp === 'hornback'), hp = w.creatures.find(c => c.sp === 'hopper'); [hb, hp].forEach(c => { c.owner = a.id; c.keeper = a.id; c.age = 5000; c.e = 60; c.x = a.x; c.y = a.y; }); hp.age = 1000;
  const doit = what => { a.plan = [{ do: what, ticks: 2 }]; a.intent = null; a.e = 90; hb.x = hp.x = a.x; hb.y = hp.y = a.y; SW.step(w, em); };
  a.carry = []; doit('milk'); ok(a.carry.some(q => q.k === 'milk') && ev.some(e => e.type === 'milked'), 'a tame hornback gives milk'); const e0 = 50; a.e = e0; a.policy = []; a.plan = [{ do: 'eat', ticks: 2 }]; a.intent = null; SW.step(w, em); ok(a.e > e0 + 5, 'milk feeds'); a.policy = [{ if: [], do: 'linger' }];
  a.carry = []; doit('milk'); ok(!a.carry.some(q => q.k === 'milk'), 'it cannot be milked again at once');
  doit('shear'); ok((a.things || {}).wool === 1, 'a tame hopper gives wool');
  doit('ride'); ok(a.mount === hb.id && SW.carryCap(w, a) > w.laws.body.carryMax, 'a hornback can be ridden, and carries more');
  const x0 = a.x, tx = a.x > 48 ? a.x - 30 : a.x + 30; a.policy = []; a.plan = [{ do: 'goto', x: tx, y: a.y, ticks: 10 }]; a.intent = null; a.thirst = 0; for (let k = 0; k < 10; k++) { a.e = 90; a.thirst = 0; SW.step(w, em); } const ridden = Math.abs(a.x - x0);
  ok(ridden >= 14 && SW.cheb(hb.x, hb.y, a.x, a.y) <= 2, 'mounted, ten moments cover ' + ridden + ' steps, and the mount goes with its rider');
  ok(/MOUNTED/.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'the rider is told');
  ok(K.applyOp(w, { op: 'creature', name: 'woolox', base: 'hornback', gives: { wool: true, milk: true, ride: false }, n: 3 }).ok && w.laws.creatures.woolox.wool === 1 && !w.laws.creatures.woolox.ride, 'the maker can make an animal that gives wool or milk');
}
{ // sites teach once; winter
  const { w, st, ev, em } = fresh(7); const q = w.sites.find(z => (z.fx || []).some(f => f.on === 'lore')); const a = w.agents[0]; if (q) { a.x = q.x; a.y = q.y; a.policy = [{ if: [], do: 'linger' }]; a.plan = []; for (let k = 0; k < 20; k++) { a.e = 90; SW.step(w, em); } const l1 = a.lore; a.met[q.id] = -1e6; for (let k = 0; k < 20; k++) { a.e = 90; SW.step(w, em); } ok(l1 > 0 && a.lore === l1, 'a place of power teaches only at the first meeting (' + l1 + ')'); } else ok(true, 'no lore site in this world');
  for (const seed of [7, 11, 42]) { const w2 = SW.createWorld(seed); const d = {}; for (let k = 0; k < 7200; k++) SW.step(w2, e => { if (e.type === 'death') d[e.cause] = (d[e.cause] || 0) + 1; }); ok(w2.agents.length >= 3 && !d.thirst, 'seed ' + seed + ': 30 days without minds, ' + w2.agents.length + ' alive, deaths ' + JSON.stringify(d)); }
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
