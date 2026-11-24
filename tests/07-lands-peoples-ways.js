const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const act = (w, a, step, em, n) => { a.policy = []; a.plan = [step]; a.intent = null; for (let k = 0; k < (n || 2); k++) { a.e = 90; a.thirst = 0; SW.step(w, em); } };
const T = { WATER: 0, GRASS: 2, FOREST: 3, ROCK: 4, SHALLOWS: 5 };
{ // the world
  for (const seed of [7, 11, 42]) {
    const w = SW.createWorld(seed), bio = {}; w.regions.forEach(R => bio[R.biome] = 1); const f = SW.waterField(w); let far = 0; for (let i = 0; i < f.length; i++) if (w.terrain[i] !== 9 && f[i] < 9000 && f[i] > far) far = f[i];
    const seen = new Uint8Array(w.W * w.H), q = [w.agents[0].y * w.W + w.agents[0].x]; seen[q[0]] = 1; while (q.length) { const i = q.pop(), x = i % w.W, y = (i - x) / w.W; for (let d = 0; d < 8; d++) { const nx = x + [0, 1, 1, 1, 0, -1, -1, -1][d], ny = y + [-1, -1, 0, 1, 1, 1, 0, -1][d]; if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue; const j = ny * w.W + nx; if (seen[j] || w.terrain[j] === 0 || w.terrain[j] === 9) continue; seen[j] = 1; q.push(j); } }
    const cut = w.agents.filter(a => !seen[a.y * w.W + a.x]).length, lk = {}; for (const i in w.lodes) lk[w.lodes[i].k] = 1;
    ok(w.W === 216 && w.H === 124 && w.wrap === 1 && w.regions.length >= 9 && Object.keys(bio).length >= 6 && far <= 18 && cut >= 2 && cut <= 13 && Object.keys(lk).length >= 8 && Object.values(w.bkind).filter(k => k === 'cave').length >= 4, 'seed ' + seed + ': ' + w.regions.length + ' lands of ' + Object.keys(bio).length + ' kinds; water at most ' + far + ' steps off; ' + cut + ' of 15 beings live across the sea; ' + Object.keys(lk).length + ' minerals; ' + Object.values(w.bkind).filter(k => k === 'cave').length + ' caves');
    const inHome = w.agents.filter(a => w.region[a.y * w.W + a.x] === w.peoples[a.people].region).length; ok(inHome >= 6, '  its peoples begin in or beside their own lands (' + inHome + ' of 15 within them)');
  }
}
{ // peoples
  const { w, st, ev, em } = fresh(7); const P = w.peoples;
  ok(P.length === 3 && new Set(P.map(p => p.tongue)).size === 3 && new Set(P.map(p => p.kind)).size === 3 && w.agents.length === 15 && [0, 1, 2].every(i => w.agents.filter(a => a.people === i).length === 5), 'three peoples of five, each with its own tongue: ' + P.map(p => p.name + ' (' + p.noun + ')').join(', '));
  const a = w.agents[0], b = w.agents.find(o => o.people !== a.people && o.sex !== a.sex), skin = o => o.look.shapes.filter(s => s.t === 'circle' || s.t === 'ellipse').map(s => s.fill).join();
  ok(skin(a) !== skin(b) && a.tall !== b.tall && a.genes && Object.keys(a.genes).length >= 2 && a.knows[P[a.people].way] && !b.knows[P[a.people].way] === (P[a.people].way !== P[b.people].way), 'they differ in body, in what they are born with and in what they know (' + P[a.people].way + ' / ' + P[b.people].way + ')');
  const g0 = SW.garble(w, 'Come and eat at my fire, friend.', b.lang, 0), g1 = SW.garble(w, 'Come and eat at my fire, friend.', b.lang, 1); ok(g0 !== g1 && !/fire/.test(g0) && g1 === 'Come and eat at my fire, friend.', 'an unknown tongue is noise: "' + g0 + '"');
  still(a); still(b); b.x = a.x + 1; b.y = a.y; st.emit({ type: 'said', a: b.id, to: a.name, text: 'I bring meat for your fire.', hearers: [a.id] });
  const told = st.minds[a.id].events.slice(-1)[0].text; ok(/grasp nothing yet/.test(told) && !/meat/.test(told) && a.tongues[b.lang] > 0, 'speech from another people arrives unintelligible, and hearing it teaches a little');
  ok(/pupil does not yet understand/.test(SW.teachPath(w, b, a, P[b.people].way, em) || ''), 'nothing can be taught across a tongue that is not understood');
  for (let k = 0; k < 30; k++) SW.hear(w, a, b, true); (w.laws.tree[P[b.people].way].needs || []).forEach(k => { a.knows[k] = a.knows[k] || { name: k }; }); /* what that way rests on, the pupil already has */ ok(SW.understands(a, b.lang) >= 0.95 && SW.teachPath(w, b, a, P[b.people].way, em) === '' && a.knows[P[b.people].way], 'enough hearing makes it understood, and then a way can pass between peoples');
  const pr = M.buildPrompt(st, st.minds[a.id], 'routine'); ok(/YOUR PEOPLE: you are of/.test(pr) && /WHERE YOU ARE: the /.test(pr) && /THIS SPOT: water/.test(pr) && /NOT YOUR PEOPLE/.test(pr), 'a being is told its people, its land, what this spot offers, and who is a stranger');
  ok(M.drives(st, st.minds[b.id], b, SW.look(w, b)).length > 0 && (function () { const c = w.agents.find(o => o.people !== a.people && o !== b); c.x = b.x; c.y = b.y + 1; a.tongues = {}; const d = M.drives(st, st.minds[a.id], a, SW.look(w, a)); return d.some(q => q.k === 'strangeness'); })(), 'a stranger whose speech means nothing is felt as strangeness');
  // a child of two peoples
  const m = w.agents.find(o => o.people === a.people && o !== a) || a; const pa = a, pb = b; pb.x = pa.x + 1; pb.y = pa.y; pa.age = pa.life * 0.3; pb.age = pb.life * 0.3; let born = null;
  for (let k = 0; k < 400 && !born; k++) { [pa, pb].forEach(o => { o.e = 95; o.hp = 100; o.thirst = 0; o.mateCd = 0; o.policy = []; }); pb.x = pa.x + 1; pb.y = pa.y; pa.plan = [{ do: 'mate', name: pb.name, ticks: 3 }]; pb.plan = [{ do: 'mate', name: pa.name, ticks: 3 }]; pa.intent = pb.intent = null; SW.step(w, e => { em(e); if (e.type === 'birth') born = e.a; }); }
  const kid = born != null && w.agents.find(o => o.id === born); ok(kid && kid.mixed && kid.tongues[pa.lang] === 1 && kid.tongues[pb.lang] === 1 && kid.genes && Object.keys(kid.genes).length >= 3, 'a child of two peoples carries both tongues and something of both bodies: ' + JSON.stringify(kid && kid.genes));
}
{ // the tree of ways
  const { w, st, ev, em } = fresh(7); const a = w.agents.find(o => !o.knows.tools), TR = w.laws.tree, eras = {}; Object.keys(TR).forEach(k => eras[TR[k].era] = (eras[TR[k].era] || 0) + 1);
  ok(Object.keys(TR).length >= 45 && eras[1] >= 12 && eras[2] >= 10 && eras[3] >= 6 && eras[4] >= 4 && eras[5] >= 3 && Object.keys(TR).every(k => TR[k].needs.every(q => TR[q] && TR[q].era <= TR[k].era)), Object.keys(TR).length + ' ways in five ages, each built on earlier ones: ' + JSON.stringify(eras));
  a.stats.wood = 7; ok(!SW.pathsFor(w, a).open.some(o => o.id === 'tools'), 'seven loads of wood do not yet open the way of tools'); a.stats.wood = 8; ok(SW.pathsFor(w, a).open.some(o => o.id === 'tools'), 'eight do');
  a.knows.tools = a.knows.fire = a.knows.mining = a.knows.smelting = { look: null }; a.lore = 9; a.stats.crafted = 20; a.things = {}; ok(!SW.pathsFor(w, a).open.some(o => o.id === 'bronze'), 'bronze stays closed without tin in the hand'); a.things.tin = 1; ok(SW.pathsFor(w, a).open.some(o => o.id === 'bronze'), 'and opens with it');
  const days = (n, per) => n / per; ok(TR.fire.n >= 16 && TR.masonry.n >= 8 && TR.iron.lore >= 7 && TR.rocketry.lore >= 20, 'the later ways are far: iron needs understanding ' + TR.iron.lore + ', rocketry ' + TR.rocketry.lore + ' (the last run reached about 4.5 in twenty days)');
  ok(Object.keys(w.laws.buildings).every(k => !w.laws.buildings[k].way || TR[w.laws.buildings[k].way]) && Object.keys(w.laws.recipes).every(k => !w.laws.recipes[k].way || TR[w.laws.recipes[k].way]), 'every building and every made thing hangs on a way that exists');
}
{ // deposits, buildings by way, great works, roads
  const { w, st, ev, em } = fresh(7); const a = w.agents[0], b = w.agents[1];
  const li = Object.keys(w.lodes).find(i => !w.laws.minerals[w.lodes[i].k].deep), di = Object.keys(w.lodes).find(i => w.laws.minerals[w.lodes[i].k].deep), at = (o, i) => { o.x = i % w.W; o.y = Math.floor(i / w.W); };
  at(a, +li); const kind = w.lodes[li].k; act(w, a, { do: 'gather', ticks: 20 }, em, 20); ok((a.things[kind] || 0) >= 1 && ev.some(e => e.type === 'mined'), 'a surface deposit (' + kind + ') can be won by hand: ' + a.things[kind] + ' in 20 moments');
  at(a, +di); const dk = w.lodes[di].k; act(w, a, { do: 'gather', ticks: 6 }, em, 6); ok(!a.things[dk] && ev.some(e => e.type === 'fail' && /too deep/.test(e.text)), 'a deep one (' + dk + ') cannot'); a.knows.mining = { look: null }; act(w, a, { do: 'gather', ticks: 30 }, em, 30); ok(a.things[dk] >= 1, 'until the way of mining is known');
  const g = (() => { for (let i = w.W * 10; i < w.terrain.length - w.W * 10; i++) if ([0, 1, 2, 3].every(d => w.terrain[i + d] === 2 && !w.plants[i + d] && !w.shelters[i + d] && !w.lodes[i + d])) return i; })();
  w.creatures = []; w.weather = { kind: 'clear', until: w.tick + 9000 }; /* no beast and no storm to send a builder running */
  at(a, g); a.wood = 20; a.stone = 20; delete a.knows.masonry; act(w, a, { do: 'build', what: 'tower', ticks: 2 }, em); ok(!w.shelters[g] && ev.some(e => e.type === 'fail' && /way of masonry/.test(e.text)), 'a tower cannot be raised without the way of masonry, and the builder is told so');
  a.knows.monuments = { look: null }; a.wood = 2; a.stone = 6; act(w, a, { do: 'build', what: 'statue', ticks: 2 }, em); ok(w.works[g] && w.works[g].stone === 6 && !w.shelters[g] && ev.some(e => e.type === 'begun'), 'a statue is a great work: begun with what one being carries');
  at(b, g); b.wood = 0; b.stone = 6; act(w, b, { do: 'build', what: 'statue', ticks: 2 }, em); const r0 = a.rel[b.id] || 0;
  ok(w.works[g] && w.works[g].stone === 12 && Object.keys(w.works[g].hands).length === 2, 'others carry to it'); a.wood = 0; a.stone = 0; act(w, a, { do: 'build', what: 'statue', ticks: 2 }, em); ok(ev.some(e => e.type === 'fail' && /carry none of what it lacks/.test(e.text)), 'one who brings nothing is told what it still needs'); a.stone = 6; act(w, a, { do: 'build', what: 'statue', ticks: 2 }, em);
  ok(w.shelters[g] === a.id && SW.buildingAt(w, g) === 'statue' && !w.works[g] && ev.some(e => e.type === 'built' && e.great) && (a.rel[b.id] || 0) > r0 && st.chron.some(c => /began a great work/.test(c.text)), 'when the last load arrives it stands, and those who raised it are bound by it');
  at(a, g + 2); a.stone = 3; act(w, a, { do: 'pave', ticks: 2 }, em); ok(w.roads[g + 2] === 4 && a.stone === 3, 'without the way of roads the ground is beaten into a dirt road and no stone is spent (since Generation 29; before, it was refused)'); a.knows.roads = { look: null }; at(a, g + 2); act(w, a, { do: 'pave', ticks: 2 }, em); ok(w.roads[g + 2] === 1 && a.stone === 2, 'with it, a stone lays a step of paved road over the dirt');
  a.knows.wells = { look: null }; at(a, g + 3); a.wood = 5; a.stone = 9; still(a); a.thirst = 60; const f = SW.waterField(w)[g + 3]; act(w, a, { do: 'build', what: 'well', ticks: 2 }, em); a.thirst = 60; still(a); a.thirst = 60; SW.step(w, em); ok(f > 1 && SW.buildingAt(w, g + 3) === 'well' && a.thirst < 5, 'a well gives water where the nearest was ' + f + ' steps away');
}
{ // water and vessels
  const { w, st, ev, em } = fresh(7); const a = w.agents[0]; let sx = -1, sy = 30; for (let y = 20; y < 70 && sx < 0; y++) for (let x = 2; x < w.W - 8; x++) if (w.terrain[y * w.W + x] !== 0 && w.terrain[y * w.W + x] !== 5 && [1, 2, 3, 4, 5, 6, 7].every(d => w.terrain[y * w.W + x + d] === 0) ) { sx = x; sy = y; break; }
  a.x = sx; a.y = sy; act(w, a, { do: 'goto', x: sx + 3, y: sy, ticks: 8 }, em, 8); { let deep = -1, rim = -1; for (let i = 0; i < w.terrain.length && (deep < 0 || rim < 0); i++) if (w.terrain[i] === 0) { if (w.narrow[i]) { if (rim < 0) rim = i; } else if (deep < 0) deep = i; } a.e = 90; a.stage = 'adult'; a.things = {}; ok(deep >= 0 && rim >= 0 && !SW.passable(w, deep % w.W, Math.floor(deep / w.W), a) && SW.passable(w, rim % w.W, Math.floor(rim / w.W), a) && !SW.passable(w, rim % w.W, Math.floor(rim / w.W), Object.assign({}, a, { stage: 'child' })), 'open water cannot be entered on foot; water within two steps of ground can be swum by the grown, not by children'); }
  ok(!w.laws.recipes.raft || !a.knows.rafts, 'the raft is not known at the start'); a.knows.rafts = { look: null }; a.wood = 6; act(w, a, { do: 'make', what: 'raft', ticks: 2 }, em); ok(a.things.raft === 1 && SW.floatOf(w, a) === 2.6, 'the way of rafts and six wood make a raft');
  a.x = sx; a.y = sy; const e0 = 90; act(w, a, { do: 'goto', x: sx + 3, y: sy, ticks: 8 }, em, 8); ok(w.terrain[a.y * w.W + a.x] === 0, 'with a raft the being goes out onto deep water');
  const c0 = SW.carryCap(w, a); a.things.ship = 1; ok(SW.floatOf(w, a) === 0.5 && SW.carryCap(w, a) === c0 + 10, 'a ship is faster and carries ten more while afloat'); a.things = { raft: 1 }; const s1 = SW.strengthOf(w, a); a.things = { warship: 1 }; const s2 = SW.strengthOf(w, a);
  ok(s2 === s1 * 1.5, 'from a warship blows land half again as hard on the water'); a.x = sx; a.y = sy; ok(SW.strengthOf(w, a) === s1, 'and not on land');
}
{ // territory
  const { w, st, ev, em } = fresh(7); const a = w.agents[0], o = w.agents.find(q => q.people !== a.people);
  const g = (() => { for (let i = w.W * 10; i < w.terrain.length - w.W * 10; i++) if ([0, 1, 2].every(d => w.terrain[i + d] === 3 && w.trees[i + d] > 0 && !w.plants[i + d]) && w.terrain[i + w.W] === 2 && !w.plants[i + w.W] && w.terrain[i + w.W + 1] === 2 && !w.plants[i + w.W + 1]) return i; })();
  a.x = (g + w.W) % w.W; a.y = Math.floor((g + w.W) / w.W); a.wood = 9; act(w, a, { do: 'build', what: 'shelter', ticks: 2 }, em); a.x++; act(w, a, { do: 'build', what: 'shelter', ticks: 2 }, em); for (let k = 0; k < 130; k++) { still(a); SW.step(w, em); }
  ok(w.settlements.length === 1, 'two shelters make a settlement'); o.x = g % w.W; o.y = Math.floor(g / w.W); still(a); act(w, o, { do: 'gather', ticks: 40 }, em, 40);
  ok(ev.some(e => e.type === 'poached' && e.a === o.id) && st.minds[a.id].events.some(e => /taking from it/.test(e.text)) && st.chron.some(c => /took from the ground of/.test(c.text)), 'a stranger taking wood inside it is seen, told to its holder, and chronicled');
  o.x = a.x + 1; o.y = a.y; ok(M.drives(st, st.minds[a.id], a, SW.look(w, a)).some(q => q.k === 'territory' || q.k === 'strangeness'), 'the holder feels it');
  const q = SW.siteQuality(w, a.x, a.y); ok(q.water >= 0 && q.wood >= 3 && typeof q.food === 'number', 'a spot can be weighed: ' + JSON.stringify(q));
}
{ // the maker's new levers
  const { w, st } = fresh(7);
  ok(st.maker.heritage.ops.length >= 14, 'the world begins with ' + st.maker.heritage.ops.length + ' things earlier makers added and kept');
  ok(K.applyOp(w, { op: 'good', name: 'skiff', float: 0.8, carry: 2, hint: 'a light boat' }).ok && w.laws.goods.skiff.float === 0.8 && K.applyOp(w, { op: 'recipe', name: 'skiff', way: 'rafts', needs: { wood: 8 }, gives: { thing: 'skiff' }, hint: 'x' }).ok, 'the maker can add a vessel and the way to make it');
  ok(K.applyOp(w, { op: 'mineral', name: 'jade', deep: false, hue: 150, biome: 'woodland', lodes: 3, hint: 'green stone' }).ok && Object.values(w.lodes).filter(l => l.k === 'jade').length >= 1, 'a new mineral with deposits in a kind of land');
  ok(K.applyOp(w, { op: 'way', id: 'astronomy', tree: 'mind', needs: ['calendar'], lore: 9, stat: 'seasons', n: 12, era: 3, hint: 'the sky read' }).ok && w.laws.tree.astronomy.era === 3 && K.applyOp(w, { op: 'building', name: 'lighthouse', wood: 6, stone: 20, way: 'astronomy', sight: 8, hint: 'a light for ships' }).ok && w.laws.buildings.lighthouse.way === 'astronomy', 'a new way in a later age, and a great work that hangs on it');
  ok(K.applyOp(w, { op: 'music', mood: 'solemn' }).ok && w.musicMood === 'solemn' && K.applyOp(w, { op: 'event', kind: 'weather', sky: 'gale', days: 1 }).ok && w.weather.kind === 'gale', 'the mood of the music and the new skies');
  const s = K.stats(st); ok(s.lands.length === w.regions.length && s.peoples.length === 3 && typeof s.timesMade === 'object' && typeof s.metAcrossPeoples === 'number' && s.waysByAge['age 1'], 'the maker sees lands, peoples, tongues, ways by age, and how often each thing was used');
}
{ // saving, and worlds saved before
  const { w, st, em } = fresh(7); for (let i = 0; i < 300; i++) { SW.step(w, em); M.tick(st); } w.roads[500] = 1; w.works[777] = { kind: 'statue', by: w.agents[0].id, wood: 1, stone: 2, hands: {} }; w.agents[0].things.gold = 2;
  const st2 = M.restore(JSON.parse(JSON.stringify(M.snapshot(st)))), w2 = st2.world; ok(w2.regions.length === w.regions.length && w2.veil && Object.keys(w2.veil.t).length === Object.keys(w.veil.t).length && w2.peoples.length === 3 && w2.roads[500] === 1 && w2.works[777].stone === 2 && w2.agents[0].things.gold === 2 && Object.keys(w2.lodes).length > 20 && w2.sea, 'the new world saves and restores whole'); for (let i = 0; i < 200; i++) { SW.step(w2, st2.emit); M.tick(st2); }
  const old = JSON.parse(JSON.stringify(M.snapshot(st))); ['regions', 'region', 'lodes', 'bkind', 'roads', 'works', 'peoples', 'tally', 'sea'].forEach(k => delete old.world[k]); delete old.world.laws.minerals; delete old.world.laws.goods; delete old.world.laws.recipes; old.world.agents.forEach(a => { delete a.things; delete a.tongues; delete a.people; delete a.lang; delete a.genes; });
  const st3 = M.restore(old); let crashed = ''; try { for (let i = 0; i < 300; i++) { SW.step(st3.world, st3.emit); M.tick(st3); } M.buildPrompt(st3, st3.minds[st3.world.agents[0].id], 'deep'); K.stats(st3); } catch (e) { crashed = String(e.stack).slice(0, 300); } ok(!crashed, 'a world saved before this generation still runs' + (crashed ? ': ' + crashed : ''));
}
{ // the long run, on instinct alone
  for (const seed of [7, 11, 42]) { const w = SW.createWorld(seed); const d = {}; for (let k = 0; k < 7200; k++) SW.step(w, e => { if (e.type === 'death') d[e.cause] = (d[e.cause] || 0) + 1; }); ok(w.agents.length >= 7 && w.creatures.length >= 70 && !d.thirst, 'seed ' + seed + ': 30 days without minds: ' + w.agents.length + ' of 12 alive, ' + w.creatures.length + ' animals, deaths ' + JSON.stringify(d)); }
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
