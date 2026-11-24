/* Generation 31. The library to the sixth age; works that clear the ground and works that foul it; a world begun at a later age with its
   settlements, ways and history; the old tradition pressing less in the later ages. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const T = SW.T, bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]);
const patch = (w, n) => { for (let y = 30; y < w.H - 30; y++) for (let x = 40; x < w.W - 60; x++) { let good = true; for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y))) good = false; if (good) return { x, y }; } return null; };
const way = (a, k) => { a.knows[k] = { name: 'the way of ' + k, idea: 'known', look: null, tick: 0, by: a.id, byName: a.name }; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const stand = (w, a, x, y, kind) => { const i = SW.idx(w, x, y); w.shelters[i] = a.id; w.bkind[i] = kind; return i; };

(async () => {
  { /* ---- the library to the sixth age ---- */
    const L = SW.LIBRARY, tree = SW.defaultLaws().tree, base = SW.defaultLaws().buildings, all = {}; for (const n in L) for (const k in L[n].buildings) all[k] = Object.assign({ age: +n }, L[n].buildings[k]);
    const ks = Object.keys(all), byAge = n => ks.filter(k => all[k].age === n);
    ok(ks.length >= 34 && byAge(3).length >= 9 && byAge(4).length >= 7 && byAge(5).length >= 7 && byAge(6).length >= 3, 'the library holds ' + ks.length + ' structures: ' + [1, 2, 3, 4, 5, 6].map(n => byAge(n).length + ' of age ' + n).join(', '));
    ok(ks.every(k => all[k].way && tree[all[k].way] && (tree[all[k].way].era || 1) <= all[k].age + 0 && all[k].hint && all[k].hint.length > 30), 'each belongs to a way of the tree no later than its own age, and says what it is for');
    const known = k => k === 'store' || base[k] || all[k];
    ok(ks.every(k => (all[k].needs || []).every(known) && (!all[k].from || all[k].from === 'shelter' || known(all[k].from))), 'everything a structure depends on, and everything it is raised in place of, exists');
    ok(['castle', 'keep', 'townhall', 'foundry', 'tenement', 'gasworks', 'parliament', 'bank', 'refinery', 'apartments', 'office', 'ministry', 'datacentre'].every(k => all[k]), 'among them a keep and a castle, a town hall and a parliament, a foundry and tenements, a gas works and a refinery, apartments, offices, a ministry and a data centre');
    const reach = k => { const seen = {}; let cur = [k], depth = 0; while (cur.length && depth < 8) { const nx = []; cur.forEach(q => (((all[q] || base[q] || {}).needs) || []).forEach(n => { if (!seen[n]) { seen[n] = 1; nx.push(n); } })); cur = nx; depth++; } return Object.keys(seen); };
    ok(reach('ministry').indexOf('powerhouse') >= 0 && reach('castle').indexOf('well') >= 0, 'works depend on works that depend on others: a ministry needs a mast, which needs a power house (' + reach('ministry').join(', ') + ')');
  }

  { /* ---- works that clear the ground, and works that foul it ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, g.x + 40 + k, g.y - 20); }); w.creatures = []; SW.beginAt(w, 1);
    w.ageOpen = 0; w.agents[1].knows.steam = {}; w.eraT = null; SW.openAges(w); const B = w.laws.buildings;
    ok(B.foundry && B.foundry.fouls === 3 && B.foundry.clears === 2 && B.keep && B.keep.clears === 2, 'when the fourth age is near, its structures are open in the world, with what they do to the land');
    at(w, a, g.x + 2, g.y); way(a, 'steam'); stand(w, a, g.x + 2, g.y, 'forge');
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const i = SW.idx(w, g.x + 2 + dx, g.y + dy); if ((dx || dy) && !w.plants[i] && w.terrain[i] !== T.WATER) w.plants[i] = { sp: 'berry', g: 1, food: 2, age: 0, life: 9000, s: 1 }; }
    const near = () => { let n = 0; for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (w.plants[SW.idx(w, g.x + 2 + dx, g.y + dy)]) n++; return n; }, p0 = near();
    for (let load = 0; load < 8 && SW.buildingAt(w, SW.idx(w, g.x + 2, g.y)) !== 'foundry'; load++) { at(w, a, g.x + 2, g.y); a.wood = 6; a.stone = 6; think(st, a, { plan: [{ do: 'build', what: 'foundry', ticks: 5 }] }); for (let k = 0; k < 3; k++) { w.creatures = []; a.e = 90; a.thirst = 0; SW.step(w, em); } }
    ok(SW.buildingAt(w, SW.idx(w, g.x + 2, g.y)) === 'foundry' && p0 > 8 && near() === 0 && w.tally.cleared >= p0, 'a foundry raised in loads by a mind\'s plans, in place of a forge, clears the ground two steps about it (' + p0 + ' plants stood there, none after)');
    const pi = SW.idx(w, g.x + 5, g.y), pj = SW.idx(w, g.x + 9, g.y); w.plants[pi] = { sp: 'berry', g: 1, food: 2, age: 0, life: 9000, s: 1 }; w.plants[pj] = { sp: 'berry', g: 1, food: 2, age: 0, life: 9000, s: 1 };
    at(w, a, g.x + 4, g.y); still(a); a.hp = 100; const b = w.agents[1]; at(w, b, g.x + 9, g.y + 1); b.hp = 100; still(b);
    w.tick += w.laws.time.dayLength - (w.tick % w.laws.time.dayLength) + 13 - 1; const keepP = [w.plants[pi], w.plants[pj]]; w.creatures = []; SW.step(w, em);
    ok(keepP[0].food === 1 && keepP[0].g < 1 && keepP[1].food >= 2 && a.hp <= 98.5 && b.hp > 99 && told(st, a, /The smoke and waste of the foundry lie on you/) && !told(st, b, /smoke and waste/), 'once a day its smoke sets back the plants within three steps and takes a little health from one who stands in it; beyond three steps neither');
    const s = K.stats(st).agesAndTheLand;
    ok(s.worksThatFoulTheirSurroundings.foundry === 1 && s.timesSomeoneStoodInSmoke >= 1 && s.plantsSetBackBySmoke >= 1 && s.treesAndPlantsClearedForGreatWorks >= p0, 'the maker reads what fouls, how often someone stood in smoke, and what was cleared');
  }

  { /* ---- a world begun at a later age ---- */
    const plain = fresh(7, { seas: 1, flora: 1, fog: 1 }), A = fresh(7, { seas: 1, flora: 1, fog: 1 }), w = A.w, st = A.st, n = SW.beginAt(w, 4); M.backfill(st, 4);
    ok(SW.beginAt(plain.w, 1) === 0 && !plain.w.startAge && JSON.stringify(plain.w.bkind || {}) === '{}' || Object.keys(plain.w.bkind || {}).every(i => plain.w.shelters[i] === -1), 'begun at the beginning, nothing is added');
    const T2 = w.laws.tree, a = w.agents[0], eraOfWays = k => T2[k].era || 1, kn = Object.keys(a.knows);
    ok(w.startAge === 4 && SW.eraOf(w) === 4 && w.ageOpen === 5 && kn.filter(k => eraOfWays(k) < 4).length === Object.keys(T2).filter(k => eraOfWays(k) < 4).length && kn.some(k => eraOfWays(k) === 4) && !kn.some(k => eraOfWays(k) > 4), 'begun in the fourth age, a founder knows every way of the first three ages (' + kn.filter(k => eraOfWays(k) < 4).length + '), some of the fourth (' + kn.filter(k => eraOfWays(k) === 4).length + ') and none later; the library is open to the fifth');
    const S = w.settlements || [], peoples = new Set(w.agents.map(o => o.people)).size;
    ok(S.filter(q => q.n >= 20 && q.age >= 3 && q.name).length === peoples, 'each people stands in one settlement of the age (' + S.map(q => q.name + ': ' + q.n + ' buildings, age ' + q.age).join('; ') + ')');
    const lacks = []; for (const i in w.bkind) { if (!w.shelters[i] || w.shelters[i] === -1) continue; const k = w.bkind[i], B = w.laws.buildings[k]; if (!B || !B.needs) continue; const x = +i % w.W, y = (+i - x) / w.W, fake = { x, y }; if (SW.infraLack(w, fake, k).length) lacks.push(k); }
    ok(lacks.length === 0, 'every work that depends on another stands within reach of it (' + Object.keys(w.bkind).length + ' buildings checked)');
    ok(w.agents.every(o => o.leader == null || w.agents.some(q => q.id === o.leader)) && w.agents.filter(o => o.leader == null).length === peoples, 'each people has one it follows');
    const ch = st.story.chapters[0];
    ok(ch && ch.made === 'world' && /begins in its fourth age, the age of steam and industry/.test(ch.text) && /set down by the world itself/.test(ch.text) && w.peoples.every(P => ch.text.indexOf(P.name) >= 0), 'its history begins with a page set down by the world, marked as such, naming each people, its land, its tradition and its settlement');
    ok(w.agents.every(o => (st.minds[o.id].tales || []).some(t => /^The founding of /.test(t.title))) && told(st, a, /YOUR WORLD IS OLD\. Your people/), 'every mind carries the tale of its people\'s founding and is told where it stands');
    const pr = M.buildPrompt(st, st.minds[a.id], 'routine'), pd = M.buildPrompt(st, st.minds[a.id], 'deep');
    ok(pr.length < 32000 && pd.length < 42000 && /In your age much that it once explained is explained by measure and trial/.test(pr), 'its prompts stay in bounds with ' + kn.length + ' ways known (' + pr.length + ' characters for an ordinary thought, ' + pd.length + ' for a deep one), and the mind is told how its age holds the old tradition');
    /* the tradition presses less */
    const drive = era => { const C = fresh(7), c = C.w.agents[0]; C.w.peoples[c.people].tradition = 'angrysky'; c.mood.fear = 0.5; if (era >= 4) { way(c, 'science'); C.w.eraT = null; } const d = M.drives(C.st, C.st.minds[c.id], c, SW.look(C.w, c)).filter(q => q.k === 'fear')[0]; return d ? d.raw : 0; };
    const d1 = drive(1), d4 = drive(4);
    ok(d1 > d4 && d4 > 0, 'the same fear under the same tradition presses ' + d1.toFixed(2) + ' in the first age and ' + d4.toFixed(2) + ' in the fourth');
    let deaths = 0; for (let k = 0; k < 720; k++) { SW.step(w, e => { if (e.type === 'death') deaths++; st.emit(e); }); M.tick(st); }
    ok(w.agents.filter(o => !o.dead).length >= 12 && K.stats(st).agesAndTheLand.worldBeganInAge === 4 && K.stats(st).settlementsAndStructures.settlements.length >= peoples, 'it runs on for three days as any world does (' + w.agents.filter(o => !o.dead).length + ' alive, ' + deaths + ' deaths), and the maker reads the age it began in');
    const back = M.restore(JSON.parse(JSON.stringify(M.snapshot(st)))); ok(back.world.startAge === 4 && back.story.chapters[0].made === 'world' && Object.keys(back.world.bkind).length === Object.keys(w.bkind).length, 'and is saved and loaded with its history');
    for (const age of [2, 3, 5, 6]) { const C = fresh(11, { seas: 1, flora: 1, fog: 1 }), nn = SW.beginAt(C.w, age); M.backfill(C.st, age); for (let k = 0; k < 240; k++) SW.step(C.w, C.em); ok(nn > 30 && SW.eraOf(C.w) === age && C.w.agents.filter(o => !o.dead).length >= 13 && C.st.story.chapters[0].made === 'world', 'a world begun in age ' + age + ': ' + nn + ' works stand, its most advanced way is of that age, and it runs a day (' + C.w.agents.filter(o => !o.dead).length + ' alive)'); }
  }

  { /* ---- a world saved by Generation 30 ---- */
    const old = M.restore(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-30.json.gz'))))), w = old.world; SW.use(w);
    for (let k = 0; k < 300; k++) { SW.step(w, old.emit); M.tick(old); }
    ok(!w.startAge && w.agents.length > 0 && M.digest(old).generation >= 31 && K.stats(old).agesAndTheLand.worldBeganInAge === 1 && /the library now runs to the sixth age/.test(K.SEED), 'a world saved by Generation 30 runs on as it was, and the maker is told of the later ages');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
