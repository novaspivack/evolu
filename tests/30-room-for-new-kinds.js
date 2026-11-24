/* Generation 35. Room for new kinds: a world as the page makes it began with more kinds of plant and of animal than the law let arise (48 of 44,
   34 of 30), so since Generation 30 nothing new could arise in the wild or be bred. The law is 60 and 44 there now; a bare world keeps 44 and 30.
   Run with EVOLU_DIR pointed at the generation before, the first, third and fourth groups of checks must fail. */
const DIR = process.env.EVOLU_DIR || '../src';
const SW = require(DIR + '/engine.js'), M = require(DIR + '/minds.js'), K = require(DIR + '/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = { seas: 1, flora: 1, fog: 1, many: 1 };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const kinds = (w, reg) => Object.keys(w.laws[reg]).length;
const alike = w => { let n = 0; for (const reg of ['plants', 'creatures']) { const ks = Object.keys(w.laws[reg]); for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) if (SW.alikeLooks(w.laws[reg][ks[a]].look, w.laws[reg][ks[b]].look)) n++; } return n; };
const think = (st, a, d) => M.apply(st, st.minds[a.id], 'routine', Object.assign({ thought: 'x' }, d), {});

{ /* the law, and what a world begins with */
  const p = fresh(7, PAGE), b = fresh(7), E = p.w.laws.ecology;
  ok(kinds(p.w, 'plants') < E.maxPlantKinds && kinds(p.w, 'creatures') < E.maxCreatureKinds, 'a world as the page makes it begins with room for new kinds: ' + kinds(p.w, 'plants') + ' kinds of plant of ' + E.maxPlantKinds + ', ' + kinds(p.w, 'creatures') + ' of animal of ' + E.maxCreatureKinds);
  ok(E.maxPlantKinds === 60 && E.maxCreatureKinds === 44, 'the law there is 60 kinds of plant and 44 of animal');
  ok(b.w.laws.ecology.maxPlantKinds === 44 && b.w.laws.ecology.maxCreatureKinds === 30, 'a bare world keeps 44 and 30, so every older check runs as it did');
}
{ /* kinds arise in the wild, up to the law and no farther, and none looks like another */
  const f = fresh(7, PAGE), w = f.w, E = w.laws.ecology, p0 = kinds(w, 'plants'), c0 = kinds(w, 'creatures'); w.laws.ecology.wildMutation = 0.05; w.laws.weather.disaster = 0; /* twelve times the rate, so that a day shows what a season would */
  let most = [0, 0], bad = 0; for (let i = 0; i < 720; i++) { SW.step(w, f.em); most = [Math.max(most[0], kinds(w, 'plants')), Math.max(most[1], kinds(w, 'creatures'))]; if (i % 120 === 0) bad += alike(w); }
  const vp = f.ev.filter(e => e.type === 'variety' && e.flora).length, vc = f.ev.filter(e => e.type === 'variety' && !e.flora).length;
  ok(vp >= 3 && vc >= 3, 'new kinds arise by themselves in such a world: ' + vp + ' of plant and ' + vc + ' of animal in three days at a raised rate (none could before)');
  ok(most[0] <= E.maxPlantKinds && most[1] <= E.maxCreatureKinds && most[0] > p0 && most[1] > c0, 'and never more than the law allows: at most ' + most[0] + ' of ' + E.maxPlantKinds + ' and ' + most[1] + ' of ' + E.maxCreatureKinds);
  ok(bad + alike(w) === 0, 'no kind that arose looks like another');
  const born = f.ev.filter(e => e.type === 'variety')[0] || { kind: 'none', from: 'none' }, reg = born.flora ? w.laws.plants : w.laws.creatures; ok(born.kind !== 'none' && (!reg[born.kind] || reg[born.kind].from === born.from), 'each is told with the kind it came from (' + born.kind + ' from ' + born.from + ')');
  const told = f.st.chron.filter(c => c.kind === 'variety').length; ok(told >= 1, 'and is in the chronicle');
  /* one that does not last is told as a wild kind that did not last, not as the loss of a kind of the world */
  const v = f.ev.filter(e => e.type === 'variety' && !e.flora && w.laws.creatures[e.kind])[0]; if (v) w.creatures = w.creatures.filter(c => c.sp !== v.kind); w.laws.ecology.wildMutation = 0;
  const e0 = f.ev.length; for (let i = 0; i < 620 && !f.ev.slice(e0).some(e => e.type === 'extinct' && v && e.kind === v.kind); i++) SW.step(w, f.em);
  const x = f.ev.slice(e0).filter(e => e.type === 'extinct' && v && e.kind === v.kind)[0], line = f.st.chron.filter(c => v && c.text.indexOf('The ' + v.kind + ',') === 0)[0];
  ok(!!x && x.from === v.from && !!line && line.kind === 'variety' && /did not last/.test(line.text), 'a wild kind with none left alive is struck off and told as one that did not last: ' + (line ? line.text : 'not told'));
  const firstLost = f.ev.filter(e => e.type === 'extinct' && !e.from).length, lines = f.st.chron.filter(c => c.kind === 'extinct').length; ok(firstLost === lines, 'the loss of a kind the world began with is still told as that (' + firstLost + ')');
  /* the maker still has room when the wild has filled its own */
  const s = K.stats(f.st).kindsOfPlantAndAnimal; ok(s && s.plants.kinds === kinds(w, 'plants') && s.animals.roomForYouToAdd >= 14 - 0 && s.plants.roomForYouToAdd >= 16, 'the maker is told how many kinds there are and how much room is left (' + JSON.stringify(s.plants) + ')');
  while (kinds(w, 'plants') < E.maxPlantKinds) w.laws.plants['fill' + kinds(w, 'plants')] = JSON.parse(JSON.stringify(w.laws.plants.berry));
  const r = K.applyOp(w, { op: 'plant', name: 'duskbloom', base: 'berry' }); ok(r.ok && w.laws.plants.duskbloom, 'with the wild at its limit the maker can still add a plant of its own');
}
{ /* a being breeds a plant, by a plan through the mind */
  const f = fresh(7, PAGE), w = f.w, st = f.st, a = w.agents[0]; w.creatures = []; w.laws.weather.disaster = 0; a.e = 95; a.thirst = 0; a.seeds = ['berry', 'berry']; a.stats.planted = 40; a.lore = Math.max(a.lore, 3); /* it has grown things long enough to understand them */ const p0 = kinds(w, 'plants');
  think(st, a, { plan: [{ do: 'cultivate', what: 'berry', name: 'sweetberry', ticks: 40 }] });
  for (let i = 0; i < 60 && !f.ev.some(e => e.type === 'cultivated' || (e.type === 'fail' && e.a === a.id)); i++) { SW.step(w, f.em); M.tick(st); w.creatures = []; }
  const done = f.ev.filter(e => e.type === 'cultivated')[0], failed = f.ev.filter(e => e.type === 'fail' && e.a === a.id)[0];
  ok(!!done && kinds(w, 'plants') === p0 + 1 && w.laws.plants[done.kind].byName === a.name && a.seeds.indexOf(done.kind) >= 0, 'one with two seeds of a kind breeds a new plant by a plan: ' + (done ? done.kind + ' from ' + done.from + ', a seed of it in hand' : 'refused: ' + (failed ? failed.text : 'nothing happened')));
  ok(alike(w) === 0, 'and it looks like no other');
}
{ /* a world of the page saved before gets the room when it is opened; one whose law was set by hand is left alone */
  const saved = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-31-fourth-age.json.gz'))).toString('utf8'));
  ok(saved.world.laws.ecology.maxPlantKinds === 44 && saved.world.flora === 1, 'a world of Generation 31 was saved with the old law');
  const st = M.restore(JSON.parse(JSON.stringify(saved))), E = st.world.laws.ecology; ok(E.maxPlantKinds === 60 && E.maxCreatureKinds === 44, 'opened now, it has room: ' + E.maxPlantKinds + ' and ' + E.maxCreatureKinds);
  const again = M.restore(JSON.parse(JSON.stringify(M.snapshot(st)))); again.world.laws.ecology.maxPlantKinds = 52; const third = M.restore(JSON.parse(JSON.stringify(M.snapshot(again)))); ok(third.world.laws.ecology.maxPlantKinds === 52, 'a law set otherwise since is not moved again');
  const bare = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-34.json.gz'))).toString('utf8')), sb = M.restore(bare); ok(sb.world.laws.ecology.maxPlantKinds === 44 && sb.world.laws.ecology.maxCreatureKinds === 30, 'a bare world saved by Generation 34 keeps its law');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
