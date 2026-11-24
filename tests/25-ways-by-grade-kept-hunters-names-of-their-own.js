/* Generation 29. Ways on the ground by grade (tracks worn by feet, dirt roads, paved roads) and beings that keep to them; a tamed hunter that helps
   the hunt, keeps beasts off and must be fed; settlements with names of their own; the maker's own blocks; and from the first run of a new
   world: what no longer breaks into a plan, where animals come in. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const T = SW.T, bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]);
const patch = (w, n, rows) => { for (let y = 30; y < w.H - 30; y++) for (let x = 40; x < w.W - 60; x++) { let good = true; for (let r = 0; r < (rows || 1) && good; r++) for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y + r))) good = false; if (good) return { x, y }; } return null; };
const way = (a, k) => { a.knows[k] = { name: 'the way of ' + k, idea: 'known', look: null, tick: 0, by: a.id, byName: a.name }; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const apart = (w, keep, g) => w.agents.forEach((o, k) => { still(o); if (keep.indexOf(o) < 0) at(w, o, g.x + 40 + (k % 5) * 3, g.y - 22 + Math.floor(k / 5) * 3); });
const walk = (w, st, em, a, x, y, n) => { think(st, a, { plan: [{ do: 'goto', x: x, y: y, ticks: 240 }] }); for (let k = 0; k < (n || 60) && !(a.x === x && a.y === y); k++) { w.creatures = []; a.e = 90; a.thirst = 0; a.hp = 100; SW.step(w, em); } return a.x === x && a.y === y; };

(async () => {
  { /* ---- tracks worn by feet ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; apart(w, [a], g); w.creatures = []; at(w, a, g.x, g.y);
    const at0 = w.laws.build.trackAt, tracks = () => Object.keys(w.roads).filter(i => w.roads[i] === 3); let trips = 0, there = true;
    ok(at0 === 10 && tracks().length === 0, 'at first there is no way on the ground');
    while (!tracks().length && trips < 60 && there) { there = walk(w, st, em, a, trips % 2 ? g.x : g.x + 7, g.y); trips++; }
    const mid = +tracks()[0];
    ok(there && w.roads[mid] === 3 && SW.roadGrade(w, mid) === 'track' && trips >= at0 - 1 && trips <= at0 * 2 + 2, 'walked ' + trips + ' times by a mind\'s plans (arriving each time), the ground between wears into a track (build.trackAt ' + at0 + ')');
    const e0 = a.e; at(w, a, g.x, g.y); a.e = 90; const c1 = (() => { const x0 = a.e; walk(w, st, em, a, g.x + 7, g.y); return x0; })();
    ok(w.tally.tracks >= 1 && K.stats(st).waysOnTheGroundAndKeptHunters.tilesOfTrackWornByFeet >= 1, 'the maker can count the tracks');
    for (let d = 0; d < 9; d++) { w.tick += w.laws.time.dayLength - (w.tick % w.laws.time.dayLength) + 5 - 1; at(w, a, g.x + 30, g.y + 10); still(a); w.creatures = []; SW.step(w, em); }
    ok(!w.roads[mid], 'left unwalked for nine days, the track fades');
  }

  { /* ---- dirt roads and paved roads, through the mind ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; apart(w, [a], g); w.creatures = []; at(w, a, g.x, g.y); a.stone = 0; delete a.knows.roads;
    const here = () => SW.idx(w, a.x, a.y), e0 = a.e;
    think(st, a, { plan: [{ do: 'pave', ticks: 3 }] }); w.creatures = []; SW.step(w, em);
    ok(w.roads[SW.idx(w, g.x, g.y)] === 4 && told(st, a, /You beat the ground[^.]*into a dirt road/) && a.stats.paved === 1, 'one who knows nothing of roads and carries no stone can beat a dirt road by its plan: it costs effort (' + w.laws.build.dirtCost + ') and nothing else');
    at(w, a, g.x, g.y); st.minds[a.id].events = []; think(st, a, { plan: [{ do: 'pave', ticks: 3 }] }); w.creatures = []; SW.step(w, em);
    ok(told(st, a, /A dirt road already runs here\. To lay stone on it takes the way of roads and 1 stone/), 'on a dirt road it is told what stone would take');
    way(a, 'roads'); a.stone = 2; at(w, a, g.x, g.y); think(st, a, { plan: [{ do: 'pave', ticks: 3 }] }); w.creatures = []; SW.step(w, em);
    ok(w.roads[SW.idx(w, g.x, g.y)] === 1 && a.stone === 1, 'with the way of roads and a stone the dirt road is paved');
    /* the cost of a step by grade */
    const cost = grade => { const B = fresh(11), b = B.w.agents[0], g2 = patch(B.w, 8); apart(B.w, [b], g2); B.w.creatures = []; for (let x = g2.x + 1; x <= g2.x + 7; x++) { if (grade) B.w.roads[SW.idx(B.w, x, g2.y)] = grade; } at(B.w, b, g2.x, g2.y); b.e = 90;
      think(B.st, b, { plan: [{ do: 'goto', x: g2.x + 7, y: g2.y, ticks: 60 }] }); let spent = 0; for (let k = 0; k < 30 && b.x !== g2.x + 7; k++) { B.w.creatures = []; const e = b.e; b.thirst = 0; SW.step(B.w, B.em); spent += Math.max(0, e - b.e); } return b.x === g2.x + 7 ? spent : NaN; };
    const open = cost(0), track = cost(3), dirt = cost(4), paved = cost(1);
    ok(open > track && track > dirt && dirt > paved && paved > 0, 'seven steps cost less by the grade of the way: open ground ' + open.toFixed(2) + ', track ' + track.toFixed(2) + ', dirt road ' + dirt.toFixed(2) + ', paved ' + paved.toFixed(2) + ' (each arrived)');
    /* one finding its way keeps to the road where it is no longer */
    const follow = roads => { const B = fresh(11), b = B.w.agents[0], g2 = patch(B.w, 8); apart(B.w, [b], g2); B.w.creatures = []; if (roads) for (let x = g2.x; x <= g2.x + 7; x++) B.w.roads[SW.idx(B.w, x, g2.y)] = 1;
      at(B.w, b, g2.x, g2.y); think(B.st, b, { plan: [{ do: 'goto', x: g2.x + 7, y: g2.y, ticks: 60 }] }); let on = 0, steps = 0; for (let k = 0; k < 30 && !(b.x === g2.x + 7 && b.y === g2.y); k++) { B.w.creatures = []; b.e = 90; b.thirst = 0; SW.step(B.w, B.em); steps++; if (b.y === g2.y) on++; } return { on, steps, there: b.x === g2.x + 7 && b.y === g2.y }; };
    const f0 = follow(false), f1 = follow(true);
    ok(f0.there && f1.there && f1.steps <= f0.steps && f1.on === f1.steps && f0.on < f0.steps, 'one finding its way keeps to a road where it costs no more steps: with a road along the straight line every one of its ' + f1.steps + ' steps is on it; without one it bows off the line (' + f0.on + ' of ' + f0.steps + ' steps on it). Both arrive');
    ok(/pave \(work the ground you stand on into a way/.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'minds are told that anyone can beat a dirt road, and what each grade saves');
    const A = { x: g.x, y: g.y, r: 2, root: a.id, n: 2, age: 1, name: 'Aa' }, Bs = { x: g.x + 12, y: g.y, r: 2, root: a.id, n: 2, age: 1, name: 'Bb' };
    const lay = gr => { for (let x = g.x; x <= g.x + 12; x++) w.roads[SW.idx(w, x, g.y)] = gr; return SW.joinedByRoad(w, A, Bs); };
    ok(!lay(3) && lay(4) && lay(1), 'two settlements are joined by a dirt road or a paved one, not by a track');
  }

  { /* ---- a kept hunter ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; apart(w, [a], g); w.creatures = []; at(w, a, g.x, g.y);
    const dog = SW.newCreature(w, 'dog', g.x + 1, g.y, { e: 40 }); dog.owner = a.id; dog.keeper = a.id; w.creatures = [dog];
    ok(SW.houndsOf(w, a) === 1, 'a tamed dog walking with its keeper counts as its kept hunter');
    dog.pen = 5; const penned = SW.houndsOf(w, a); dog.pen = null; at(w, dog, g.x + 9, g.y); const far = SW.houndsOf(w, a); at(w, dog, g.x + 1, g.y);
    ok(penned === 0 && far === 0, 'not when it is penned, nor when it is nine steps off');
    const day = () => { w.tick += w.laws.time.dayLength - (w.tick % w.laws.time.dayLength) + 9 - 1; at(w, a, g.x, g.y); at(w, dog, g.x + 1, g.y); still(a); const keep = w.creatures; SW.step(w, em); w.creatures = keep.filter(c => !c.dead); };
    a.carry = [{ k: 'berry', n: 1, t: w.tick }, { k: 'meat', n: 1, t: w.tick }]; day();
    ok(a.carry.length === 1 && a.carry[0].k === 'berry' && w.tally.scraps === 1 && told(st, a, /Your dog ate one meat from your hands/), 'once a day it takes one food from its keeper\'s hands, meat first, and the keeper is told');
    a.carry = []; day(); const hungry = told(st, a, /YOUR DOG IS HUNGRY/); a.carry = []; day(); a.carry = []; day();
    ok(hungry && dog.keeper == null && dog.owner == null && w.tally.houndsLeft === 1 && told(st, a, /Your dog has left you: 3 days with nothing from your hands/), 'unfed, the keeper is warned; after ecology.scrapDays (' + w.laws.ecology.scrapDays + ') days with nothing it leaves and is wild again');
    /* the hunt is surer with it: a control in the same check */
    const hunt = hounds => { let kills = 0; for (let s = 1; s <= 40; s++) { const B = fresh(100 + s), b = B.w.agents[0], g2 = patch(B.w, 8); if (!g2) continue; apart(B.w, [b], g2); at(B.w, b, g2.x, g2.y); B.w.laws.ecology.houndHunt = 0.4;
        const prey = SW.newCreature(B.w, 'hopper', g2.x + 1, g2.y, { e: 30 }); prey.calm = 999; B.w.creatures = [prey]; if (hounds) { const d = SW.newCreature(B.w, 'dog', g2.x, g2.y + 1, { e: 40 }); d.owner = b.id; d.keeper = b.id; d.calm = 999; B.w.creatures.push(d); }
        think(B.st, b, { plan: [{ do: 'hunt', ticks: 6 }] }); for (let k = 0; k < 2; k++) { b.e = 90; SW.step(B.w, B.em); } if (B.ev.some(e => e.type === 'hunted' && e.a === b.id)) kills++; } return kills; };
    const h0 = hunt(false), h1 = hunt(true);
    ok(h1 > h0, 'with a dog at heel the same hunt, planned by a mind in forty worlds, kills more often (' + h1 + ' of 40 against ' + h0 + ' without)');
    ok(K.stats(st).waysOnTheGroundAndKeptHunters.keptHuntersThatLeftUnfed === 1 && K.applyOp(w, { op: 'law', group: 'ecology', key: 'houndHunt', value: 0.6 }).ok && K.applyOp(w, { op: 'law', group: 'build', key: 'trackAt', value: 14 }).ok, 'the maker reads it and can turn ecology.houndHunt and build.trackAt');
  }

  { /* ---- settlements with names of their own; the maker's blocks; what no longer breaks a plan ---- */
    const snap = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-28.json.gz')))), old = M.restore(snap), w = old.world; SW.use(w);
    const a = w.agents[0], g = patch(w, 8); w.agents.forEach(o => still(o));
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(d => { const i = SW.idx(w, g.x + d[0], g.y + d[1]); w.shelters[i] = a.id; w.bkind[i] = 'hall'; }); w.places.push({ x: g.x, y: g.y, name: a.name + "'s Hall", by: a.id, tick: w.tick });
    at(w, a, g.x, g.y + 2); for (let k = 0; k < 300; k++) { w.creatures = []; w.agents.forEach(o => { o.e = 90; o.thirst = 0; }); SW.step(w, old.emit); }
    const S = (w.settlements || []).filter(q => SW.cheb(q.x, q.y, g.x, g.y) <= q.r + 2)[0];
    ok(S && S.name && S.name !== a.name + "'s Hall" && !w.places.some(pl => pl.name === S.name), 'a settlement around a place named "' + a.name + "'s Hall\" takes a name of its own: \"" + (S && S.name) + '" (the same words stood twice on the map)');
    const n1 = S && S.name; for (let k = 0; k < 300; k++) { w.creatures = []; w.agents.forEach(o => { o.e = 90; o.thirst = 0; }); SW.step(w, old.emit); }
    const S2 = (w.settlements || []).filter(q => SW.cheb(q.x, q.y, g.x, g.y) <= q.r + 2)[0];
    ok(S2 && S2.name === n1, 'and keeps it');
    ok(w.laws.build.trackAt === 10 && w.laws.ecology.houndHunt === 0.4 && M.digest(old).generation >= 29, 'a world saved by Generation 28 is given the new laws and runs on');
    const r = K.applyOp(w, { op: 'block', name: 'loom', wood: 3, craft: 0.4, hint: 'a loom' }), r2 = K.applyOp(w, { op: 'structure', name: 'weavery', blocks: ['roof', 'loom'] });
    ok(r.ok && r2.ok && w.laws.buildings.weavery.craft === 0.4 && !K.applyOp(w, { op: 'block', name: 'empty', wood: 1 }).ok && !K.applyOp(w, { op: 'block', name: 'free', wood: 0, stone: 0, craft: 0.3 }).ok, 'the maker makes a block of its own and builds a structure from it; a block that gives nothing, or costs nothing, is refused');
    const m = old.minds[a.id]; m.lastT = w.tick - 5; a.plan = [{ do: 'linger', ticks: 200 }]; m.weightyT = -1;
    old.emit({ type: 'insight', a: a.id, node: 'pottery', hint: 'shaping clay', why: '' });
    ok(!M.ready(old, m, a) && told(old, a, /is within your grasp now/), 'an insight is told and no longer breaks into a plan (in the first run of the new world it broke into more than any other thing)');
    M.tell(old, a.id, 'A stalker has bitten you.', 9); ok(M.ready(old, m, a), 'a bite still does');
    ok(/It needs no shared tongue/.test(M.buildPrompt(old, m, 'routine')), 'minds are told that a trade can be offered to a stranger without a shared tongue (the maker asked)');
    ok(/"op":"block"/.test(K.OPS) && /ways on the ground have grades/.test(K.SEED) && K.HERITAGE.ops.some(o => o.op === 'structure' && o.name === 'emberhall'), 'the maker is told of the block op and of the ways; the first structure a maker designed from blocks, the ember hall, is in the heritage');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
