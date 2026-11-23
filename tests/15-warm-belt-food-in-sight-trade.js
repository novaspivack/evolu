/* Generation 21. A warm belt about the equator of a round world, whatever the country: no snow, no cold season, and rain in the season others call winter.
   Food in sight: a mind is shown the nearest plant that BEARS, and eat and harvest walk to it. Trade of anything that can be held, on an offer that stands a day.
   What the maker asked for after the twelfth run: hardships in words, and a sowing that says why it took no root. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, kind, d) => M.apply(st, st.minds[a.id], kind, Object.assign({ thought: 'x' }, d), {});
const unveil = w => { const V = w.veil; for (const i in V.t) { w.terrain[i] = V.t[i]; w.fert[i] = V.f[i]; } V.t = {}; V.f = {}; SW.narrowWater(w); };
const fixture = n => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-' + n + '.json.gz'))).toString());
/* a strip of bare grass, 17 wide and 3 deep, about (x, y) */
const lawn = (w, x, y) => { for (let d = -8; d <= 8; d++) for (let dy = -1; dy <= 1; dy++) { const i = SW.idx(w, x + d, y + dy); w.terrain[i] = 2; w.fert[i] = 1; w.plants[i] = null; w.shelters[i] = 0; w.walls[i] = 0; w.fires[i] = 0; if (w.lodes) delete w.lodes[i]; } };
const calm = w => { w.laws.weather.disaster = 0; w.laws.weather.herd = 0; w.laws.weather.pack = 0; w.creatures = []; }; /* nothing falls from the sky and nothing comes hunting while a check stands still */
const winter = w => { w.tick = 9 * w.laws.time.dayLength + 60; };
const coolOf = (w, x0, want, y) => { for (let x = x0; x < x0 + w.W; x++) { const R = SW.regionAt(w, x % w.W, y); if (R && !R.polar && ['rainforest', 'desert'].indexOf(R.biome) < 0 === want) return x % w.W; } return -1; };

{ // the warm belt
  const { w, st } = fresh(7); unveil(w); SW.use(w); const mid = Math.round((w.H - 1) / 2), half = w.laws.climate.belt * w.H;
  let all = true, n = 0; for (let x = 0; x < w.W; x++) for (let y = Math.ceil(mid - half + 4.5); y <= Math.floor(mid + half - 4.5); y++) { n++; if (SW.climate(w, x, y) !== 1) all = false; }
  ok(w.laws.climate.belt === 0.11 && w.laws.climate.rains === 1 && all && n > 216 * 15, 'about the equator the world is warm all the way round, in every country: ' + n + ' tiles, none of them cold');
  const xc = coolOf(w, 0, true, mid), bio = SW.regionAt(w, xc, mid).biome;
  ok(xc >= 0 && SW.climate(w, xc, mid) === 1, 'a country that is neither rainforest nor desert is warm where the equator crosses it (' + bio + ')');
  let far = -1; for (let y = Math.floor(mid - half - 7); y > 16 && far < 0; y--) { const R = SW.regionAt(w, xc, y); if (R && !R.polar && ['rainforest', 'desert'].indexOf(R.biome) < 0) far = y; }
  ok(far > 0 && SW.climate(w, xc, far) === 0, 'and the same kind of country far from the equator keeps its winter');
  ok(SW.climate(w, 10, 2) === 2 && SW.climate(w, 10, w.H - 3) === 2, 'the ice at either end is still ice');
  let joins = true; for (let y = 0; y < w.H; y++) if (Math.abs(SW.climate(w, 0, y) === 1 ? 1 : 0) !== (SW.climate(w, w.W, y) === 1 ? 1 : 0)) joins = false;
  ok(joins && SW.climate(w, -1, mid) === SW.climate(w, w.W - 1, mid), 'the belt meets itself where the world comes round');
  /* the sky over one place */
  w.weather.kind = 'snow'; ok(SW.skyAt(w, xc, mid) === 'rain' && SW.skyAt(w, xc, far) === 'snow', 'when snow falls on the world it falls as rain in the warm belt');
  w.weather.kind = 'rain'; ok(SW.skyAt(w, 10, 2) === 'snow' && SW.skyAt(w, xc, far) === 'rain', 'and rain falls as snow on the ice');
  winter(w); w.weather.kind = 'clear'; ok(SW.season(w) === 3 && SW.skyAt(w, xc, mid) === 'rain' && SW.skyAt(w, xc, far) === 'clear', 'the cold season is a season of rain in the warm belt, under a sky that is clear elsewhere');
  w.weather.kind = 'storm'; ok(SW.skyAt(w, xc, mid) === 'storm', 'a storm is a storm everywhere');
  w.weather.kind = 'clear'; w.laws.climate.rains = 0; ok(SW.skyAt(w, xc, mid) === 'clear', 'with the law of the rains set to nothing, the warm winter is dry'); w.laws.climate.rains = 1;
  /* a body in the open: winter costs less in the belt */
  calm(w); lawn(w, xc, mid); lawn(w, xc, far); const a = w.agents[0], b = w.agents[1]; w.agents.forEach(still); w.agents.forEach((o, i) => { if (i > 1) at(w, o, (xc + 40 + i) % w.W, mid); });
  at(w, a, xc, mid); at(w, b, xc, far); a.sheltered = b.sheltered = 0;
  for (let k = 0; k < 30; k++) { w.creatures = []; w.weather.kind = 'clear'; w.weather.until = w.tick + 999; a.thirst = b.thirst = 0; a.sick = b.sick = 0; at(w, a, xc, mid); at(w, b, xc, far); SW.step(w, st.emit); }
  ok(a.e > b.e + 0.5 && SW.cheb(a.x, a.y, xc, mid) <= 1 && SW.cheb(b.x, b.y, xc, far) <= 1, 'thirty moments of winter in the open cost a body less in the warm belt (' + a.e.toFixed(1) + ') than outside it (' + b.e.toFixed(1) + ')');
  const pr = M.buildPrompt(st, st.minds[a.id], 'routine'), pb = M.buildPrompt(st, st.minds[b.id], 'routine');
  ok(/season of rains/.test(pr) && /no winter/.test(pr) && !/season of rains/.test(pb), 'the one in the belt is told there is no winter here and that this is the season of rains; the other is not');
  ok(/, rain\b/.test(pr.split('\n').find(l => /^NOW: /.test(l)) || '') || /rain/.test(pr.split('\n').find(l => /^NOW: /.test(l)) || ''), 'and is told that it rains where it stands');
  /* plants: in the season of rains the belt grows; outside it winter holds growth back */
  const kind = Object.keys(w.laws.plants).find(k => { const s = w.laws.plants[k]; return s.nutrition > 4 && !s.biomes && !s.hardy; }) || Object.keys(w.laws.plants)[0];
  const ia = SW.idx(w, xc + 3, mid), ib = SW.idx(w, xc + 3, far); w.plants[ia] = { sp: kind, g: 1, food: 0, age: 10, life: 99999 }; w.plants[ib] = { sp: kind, g: 1, food: 0, age: 10, life: 99999 };
  for (let k = 0; k < 160; k++) { w.creatures = []; w.weather.kind = 'clear'; w.weather.until = w.tick + 999; w.agents.forEach(o => { o.e = 90; o.thirst = 0; }); SW.step(w, st.emit); if (SW.season(w) !== 3) break; }
  ok(w.plants[ia] && w.plants[ib] && w.plants[ia].food > w.plants[ib].food * 1.5 && w.plants[ia].food > 0.2, 'a plant in the belt fills in the rains (' + w.plants[ia].food.toFixed(2) + ' food) while its like outside waits out the winter (' + w.plants[ib].food.toFixed(2) + ')');
  /* the maker holds the lever */
  const r = K.applyOp(w, { op: 'law', group: 'climate', key: 'belt', value: 0.2 });
  ok(r.ok && w.laws.climate.belt === 0.2 && SW.climate(w, xc, far) === (Math.abs(far - (w.H - 1) / 2) <= 0.2 * w.H - 4 ? 1 : SW.climate(w, xc, far)) && SW.climate(w, xc, Math.round(mid - 0.2 * w.H + 5)) === 1, 'the maker can widen the belt (law climate.belt), and the climate follows at once');
  w.laws.climate.belt = 0; ok(SW.climate(w, xc, mid) === 0, 'and with no belt, only the warm countries are warm');
}
{ // worlds made before
  let e1 = null, e2 = null, flat = null, round = null;
  try { flat = M.restore(fixture(19)); for (let i = 0; i < 300; i++) SW.step(flat.world, flat.emit); } catch (e) { e1 = e; }
  const fw = flat && flat.world; let anyBelt = false; if (fw) { const mid = Math.round(fw.H / 2); for (let x = 0; x < fw.W; x++) { const R = SW.regionAt(fw, x, mid); if (R && ['rainforest', 'desert'].indexOf(R.biome) < 0 && SW.climate(fw, x, mid) === 1) anyBelt = true; } }
  ok(!e1 && fw && !fw.wrap && !anyBelt && fw.laws.climate && fw.laws.trade.window === 240, 'a flat world made before Generation 20 loads and runs, learns the new laws, and has no belt: it has no equator' + (e1 ? ' ' + e1.message : ''));
  try { round = M.restore(fixture(20)); for (let i = 0; i < 1500; i++) SW.step(round.world, round.emit); round.world.agents.forEach(a => M.buildPrompt(round, round.minds[a.id], 'deep')); } catch (e) { e2 = e; }
  const rw = round && round.world; SW.use(rw);
  ok(!e2 && rw && rw.wrap === 1 && rw.agents.length > 0 && rw.laws.climate.belt === 0.11 && SW.climate(rw, coolOf(rw, 0, true, Math.round(rw.H / 2)), Math.round((rw.H - 1) / 2)) === 1, 'a round world saved by Generation 20 loads, runs 1500 moments, builds prompts, and gains the warm belt' + (e2 ? ' ' + e2.stack.split('\n').slice(0, 3).join(' | ') : ''));
}
{ // food in sight
  const { w, st, ev, em } = fresh(11); unveil(w); SW.use(w); calm(w); const y = Math.round(w.H / 2), x = 100; lawn(w, x, y);
  const a = w.agents[0]; w.agents.forEach(still); w.agents.forEach((o, i) => { if (i > 0) at(w, o, (x + 60 + i) % w.W, y); }); at(w, a, x, y); a.carry = []; a.habits.avoid = [];
  const kinds = Object.keys(w.laws.plants).filter(k => w.laws.plants[k].nutrition > 4 && !(w.laws.plants[k].fx || []).length), A = kinds[0], B = kinds[1], C = kinds[2];
  const lay = () => { for (let d = -16; d <= 16; d++) for (let dy = -16; dy <= 16; dy++) w.plants[SW.idx(w, x + d, y + dy)] = null;
    w.plants[SW.idx(w, x + 2, y)] = { sp: A, g: 0.4, food: 0, age: 10, life: 99999 };   /* young, near */
    w.plants[SW.idx(w, x - 1, y)] = { sp: B, g: 0.5, food: 0, age: 10, life: 99999 };   /* young, nearer */
    w.plants[SW.idx(w, x + 5, y)] = { sp: B, g: 1, food: 3, age: 10, life: 99999 };     /* bearing, farther */
    w.plants[SW.idx(w, x - 7, y)] = { sp: C, g: 1, food: 3, age: 10, life: 99999 }; };  /* bearing, farthest */
  lay();
  const pr = M.buildPrompt(st, st.minds[a.id], 'routine'), see = pr.split('\n');
  const lb = see.find(l => l.indexOf('- ' + B + ': ') === 0) || '', ln = see.find(l => /NOTHING TO EAT/.test(l)) || '';
  ok(lb.indexOf('1 bearing food in sight; nearest at (' + (x + 5) + ',' + y + ')') > 0 && /1 more with nothing on them yet/.test(lb), 'a mind is shown the nearest plant of a kind that BEARS, not the nearest of the kind: ' + lb);
  ok(ln.indexOf(A + ' (') > 0 && ln.indexOf(B + ' (') < 0 && /feeds no one/.test(ln), 'and a kind with nothing on it anywhere in sight is named as nothing to eat: ' + ln);
  ok(/harvest \{what\?: plant kind\}/.test(pr) && /walks to the nearest plant in sight that/.test(pr), 'the catalogue says that eat and harvest walk to food');
  /* harvest walks past the young one to the one that bears */
  think(st, a, 'routine', { plan: [{ do: 'harvest', ticks: 30 }] }); let stood = 0, where = -1;
  for (let k = 0; k < 14; k++) { w.creatures = []; a.e = 90; a.thirst = 0; SW.step(w, em); if (a.x === x + 2 && a.y === y && !a.carry.length) stood++; if (a.carry.length && where < 0) where = a.x; }
  ok(a.carry.length > 0 && a.carry[0].k === B && where === x + 5 && stood <= 1 && !ev.some(e => e.type === 'fail' && e.a === a.id), 'told only to harvest, a body walks past the young plant to the one that bears and picks it (' + a.carry.length + ' picked, the first ' + (a.carry[0] || {}).k + ')');
  /* a kind asked for by name */
  at(w, a, x, y); a.carry = []; lay(); think(st, a, 'routine', { plan: [{ do: 'harvest', what: C, ticks: 30 }] });
  where = -1; for (let k = 0; k < 11; k++) { w.creatures = []; a.e = 90; a.thirst = 0; SW.step(w, em); if (a.carry.length && where < 0) where = a.x; }
  ok(a.carry.length > 0 && a.carry.every(q => q.k === C) && where === x - 7, 'asked for one kind, it goes to that kind though another bears nearer');
  /* eat with empty hands walks to food */
  at(w, a, x, y); a.carry = []; lay(); a.e = 40; const b0 = a.stats.bites; think(st, a, 'routine', { plan: [{ do: 'eat', ticks: 20 }] }); let top = 0;
  for (let k = 0; k < 8; k++) { w.creatures = []; a.thirst = 0; SW.step(w, em); top = Math.max(top, a.e); }
  ok(a.stats.bites > b0 && top > 40 && a.x === x + 5, 'told only to eat, with empty hands, a body walks to the nearest plant that bears and eats there');
  /* nothing bears: the reason is told */
  lay(); for (let d = -9; d <= 9; d++) for (let dy = -9; dy <= 9; dy++) { const q = w.plants[SW.idx(w, x + d, y + dy)]; if (q) { q.g = 0.4; q.food = 0; } }
  at(w, a, x + 2, y); a.carry = []; a.e = 80; ev.length = 0; think(st, a, 'routine', { plan: [{ do: 'harvest', ticks: 10 }, { do: 'eat', ticks: 10 }] });
  for (let k = 0; k < 4; k++) { w.creatures = []; a.thirst = 0; SW.step(w, em); }
  const f = ev.filter(e => e.type === 'fail' && e.a === a.id).map(e => e.text);
  ok(f.some(t => /harvest/.test(t) && t.indexOf('the ' + A + ' where you stand bears nothing yet') > 0 && /young plant feeds no one/.test(t)) && f.some(t => /meant to eat/.test(t) && /nothing within your sight bears food/.test(t)), 'when nothing in sight bears, harvest and eat each say so and why: ' + (f[0] || '').slice(0, 90));
  /* instinct is as it was: a body with no plan does not take the new road */
  const w2 = SW.createWorld(11), w3 = SW.createWorld(11);
  for (let i = 0; i < 400; i++) { SW.step(w2, () => {}); SW.step(w3, () => {}); }
  ok(w2.agents.length === w3.agents.length && w2.agents.every((o, i) => o.x === w3.agents[i].x && o.y === w3.agents[i].y && o.e === w3.agents[i].e) && w2.plants.filter(Boolean).length === w3.plants.filter(Boolean).length, 'the world is still the same world for a seed: two of one seed agree after 400 moments, belt and all');
}
{ // trade
  const { w, st, ev, em } = fresh(13); unveil(w); SW.use(w); calm(w); const y = Math.round(w.H / 2), x = 100; lawn(w, x, y);
  const a = w.agents[0], b = w.agents[1]; w.agents.forEach(still); w.agents.forEach((o, i) => { if (i > 1) at(w, o, (x + 60 + i) % w.W, y); }); at(w, a, x, y); at(w, b, x + 1, y);
  const food = Object.keys(w.laws.plants).find(k => w.laws.plants[k].nutrition > 5); a.things = { amber: 2 }; a.carry = []; b.carry = [{ k: food, n: 8 }, { k: food, n: 8 }]; b.things = {};
  const run = n => { for (let k = 0; k < n; k++) { w.creatures = []; a.e = b.e = 90; a.thirst = b.thirst = 0; SW.step(w, em); } };
  think(st, a, 'routine', { plan: [{ do: 'trade', name: b.name, what: 'amber', want: 'food', ticks: 10 }] }); run(3);
  const off = ev.filter(e => e.type === 'offer');
  ok(off.length === 1 && off[0].give === 'amber' && off[0].want === 'food' && w.tally.offers === 1 && a.things.amber === 2, 'a thing held, such as amber, can be offered for food: the offer is made once and nothing moves yet');
  const pb = M.buildPrompt(st, st.minds[b.id], 'routine');
  ok(pb.indexOf(a.name + ' offers you one amber in exchange for one food') > 0 && /The offer stands for a day/.test(pb) && /trade \{name, what: one thing you give, want: one thing you want\}/.test(pb), 'the other is told of the offer, how to accept it and how long it stands');
  run(120); /* longer than the eighty moments an offer used to stand, and longer than the time between two thoughts */
  at(w, a, x, y); at(w, b, x + 1, y); think(st, b, 'routine', { plan: [{ do: 'trade', name: a.name, what: 'food', want: 'amber', ticks: 10 }] }); run(3);
  const tr = ev.filter(e => e.type === 'traded');
  ok(tr.length === 1 && a.things.amber === 1 && b.things.amber === 1 && a.carry.length === 1 && b.carry.length === 1 && w.tally.trades === 1 && a.stats.trades === 1 && b.stats.trades === 1, 'answered 120 moments later, the trade is done: one amber for one food, and it is counted');
  ok(K.stats(st).events.offersOfTradeMade === 1 && K.stats(st).events.tradesDone === 1, 'the maker sees offers made and trades done');
  /* an offer lapses */
  w.laws.trade.window = 50; ev.length = 0; think(st, a, 'routine', { plan: [{ do: 'trade', name: b.name, what: 'amber', want: 'food', ticks: 5 }] }); run(3); think(st, a, 'routine', { plan: [{ do: 'linger', ticks: 200 }] }); run(70); at(w, a, x, y); at(w, b, x + 1, y);
  think(st, b, 'routine', { plan: [{ do: 'trade', name: a.name, what: 'food', want: 'amber', ticks: 3 }] }); run(2);
  ok(!ev.some(e => e.type === 'traded') && ev.filter(e => e.type === 'offer').length === 2 && a.things.amber === 1, 'after the time the law gives (trade.window), an old offer no longer stands: the answer is a new offer');
  /* nothing to give */
  ev.length = 0; a.things = {}; think(st, a, 'routine', { plan: [{ do: 'trade', name: b.name, what: 'amber', want: 'food', ticks: 5 }] }); run(2);
  ok(ev.some(e => e.type === 'fail' && e.a === a.id && /you hold none/.test(e.text)), 'one who offers what they do not hold is told so');
  /* stone for wood: the plain goods */
  w.laws.trade.window = 240; a.stone = 2; b.wood = 2; a.wood = 0; b.stone = 0; ev.length = 0;
  think(st, a, 'routine', { plan: [{ do: 'trade', name: b.name, what: 'stone', want: 'wood', ticks: 5 }] }); think(st, b, 'routine', { plan: [{ do: 'trade', name: a.name, what: 'wood', want: 'stone', ticks: 5 }] }); run(3);
  ok(ev.some(e => e.type === 'traded') && a.wood === 1 && a.stone === 1 && b.wood === 1 && b.stone === 1, 'stone goes for wood the same way');
}
{ // what the maker asked for
  const { w, st } = fresh(7); SW.use(w); const a = w.agents[0]; w.agents.forEach(o => { o.press = {}; }); a.press = { water: 5, thirst: 2 };
  const hp = K.stats(st).hardshipsPressing[w.peoples[a.people].name];
  ok(/water you could not cross \d/.test(hp) && /thirst \d/.test(hp) && !/(^|, )water \d/.test(hp), 'the maker reads hardships in words: "' + hp + '"');
  const r = K.applyOp(w, { op: 'event', kind: 'sow', plant: 'icekelp', n: 12, x: a.x, y: a.y });
  ok(r.ok === false && /no icekelp could take root there/.test(r.why) && /grows only on sand/.test(r.why), 'a sowing that takes no root is not called done: ' + r.why);
  const food = Object.keys(w.laws.plants).find(k => !w.laws.plants[k].soil && w.laws.plants[k].nutrition > 4), r2 = food ? K.applyOp(w, { op: 'event', kind: 'sow', plant: food, n: 8, near: a.name }) : { ok: true, text: '8 sown' };
  ok(r2.ok && /sown/.test(r2.text), 'and one that does is: ' + r2.text);
  const H = K.HERITAGE;
  ok(H.ops.length === 46 && H.lessons.length === 47 && H.ideas.length === 20 && H.ops.some(o => o.op === 'spur' && o.way === 'fire' && o.spur.sickness === 0.8) && H.ops.some(o => o.op === 'recipe' && o.name === 'roast') && !H.ops.some(o => o.name === "Tlama's Rest"), 'the heritage holds what the twelfth run kept: the fire spur, two lessons, three ideas; a grave for one who never lived in a new world is left behind');
  ok(K.SEED.some(s => /climate\.belt/.test(s)) && K.SEED.some(s => /trade\.window/.test(s)), 'the maker\'s roadmap names the new levers');
  ok(SW.ACTIONS.indexOf('trade') >= 0 && SW.ACTIONS.indexOf('harvest') >= 0 && M.digest(st).generation === 21, 'this is Generation 21');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
