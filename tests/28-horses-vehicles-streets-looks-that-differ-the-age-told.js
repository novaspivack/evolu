/* Generation 32. Horses and animals that work; vehicles as made things with attributes; nothing built on a road; a town begun old with streets
   that bend, branch and cross, dwellings of its age and works near what they need; no two kinds of plant or animal alike; a mind told its age
   and what it holds; a named thing of the heritage placed once. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const T = SW.T, bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]) && !w.roads[i];
const patch = (w, n) => { for (let y = 30; y < w.H - 30; y++) for (let x = 40; x < w.W - 60; x++) { let good = true; for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y))) good = false; if (good) return { x, y }; } return null; };
const way = (a, k) => { a.knows[k] = { name: 'the way of ' + k, idea: 'known', look: null, tick: 0, by: a.id, byName: a.name }; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const clearAround = (w, x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const i = SW.idx(w, x + dx, y + dy); if (SW.inb(w, x + dx, y + dy)) w.plants[i] = null; } };
const horseBy = (w, a, x, y, tame) => { const c = { id: 90000 + w.creatures.length, sp: 'horse', x, y, px: x, py: y, e: 90, age: 900, life: 9000, size: 1, quick: 1, sea: 0 }; if (tame) { c.owner = SW.rootOf(w, a).id; c.keeper = a.id; a.stats.tamed = (a.stats.tamed || 0) + 1; } w.creatures.push(c); return c; };

(async () => {
  { /* ---- every kind looks itself ---- */
    const w = SW.createWorld(7, { seas: 1, flora: 1 }); let pairs = 0, kinds = 0;
    ['plants', 'creatures'].forEach(t => { const P = w.laws[t], ks = Object.keys(P); kinds += ks.length; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (SW.alikeLooks(P[ks[i]].look, P[ks[j]].look)) pairs++; });
    ok(kinds > 60 && pairs === 0, 'in a new world no two kinds of plant and no two kinds of animal look alike (' + kinds + ' kinds, ' + pairs + ' pairs alike)');
    const st = M.createState(w); SW.use(w); const before = Object.keys(w.laws.plants).length;
    const r = K.applyOp(w, { op: 'plant', name: 'twinberry', base: 'berry', nutrition: 6, maxFood: 3, form: w.laws.plants.berry.form });
    w.laws.plants.copyberry = JSON.parse(JSON.stringify(w.laws.plants.berry)); const n = SW.distinctLooks(w);
    ok(r.ok && Object.keys(w.laws.plants).length === before + 2 && n >= 1 && !SW.alikeLooks(w.laws.plants.berry.look, w.laws.plants.copyberry.look) && !SW.alikeLooks(w.laws.plants.berry.look, w.laws.plants.twinberry.look), 'a kind the maker makes from another, and one copied outright, are told apart from it: drawn again, recoloured or marked');
    const a1 = { shapes: [{ t: 'circle', fill: '#2f6b3a' }, { t: 'ring', fill: '#d8324a' }] }, a2 = { shapes: [{ t: 'circle', fill: '#345f2e' }, { t: 'ring', fill: '#dd3c57' }] }, a3 = { shapes: [{ t: 'circle', fill: '#345f2e' }, { t: 'ring', fill: '#3c6add' }] };
    ok(SW.alikeLooks(a1, a2) && !SW.alikeLooks(a1, a3), 'two bushes with red berries count as alike; the same bush with blue berries does not');
    const plain = SW.createWorld(7); ok(!plain.laws.creatures.horse && Object.keys(plain.laws.creatures).length === Object.keys(SW.defaultLaws().creatures).length, 'a world begun without the new plants has no horse and its kinds are as they were');
  }

  { /* ---- the horse: gentle, ridden by one who knows herding ---- */
    const { w, st, ev, em } = fresh(11, { flora: 1 }), g = patch(w, 8), a = w.agents[0], b = w.agents[1]; w.creatures = []; w.agents.forEach((o, k) => { still(o); if (o !== a && o !== b) at(w, o, g.x + 40 + k, g.y - 20); });
    const H = w.laws.creatures.horse; ok(H && H.ride && H.draft && H.gentle && !H.gore && w.laws.creatures.plainsox.draft === 1, 'the horse is a kind of the world: it bears a rider, it draws, it is gentle; the plains ox draws too');
    at(w, a, g.x + 1, g.y); at(w, b, g.x + 1, g.y + 14); clearAround(w, g.x + 1, g.y, 3); way(a, 'herding'); const c = horseBy(w, a, g.x + 2, g.y, true);
    think(st, a, { plan: [{ do: 'ride', ticks: 3 }] }); for (let k = 0; k < 2; k++) { a.e = 90; SW.step(w, em); }
    ok(a.mount === c.id && !a.knows.riding && told(st, a, /mounted on your horse/) && w.tally.rides === 1, 'one who knows herding and has tamed a horse mounts it by a plan, without the way of riding');
    { const s1 = SW.strengthOf(w, a); a.mount = null; const s0 = SW.strengthOf(w, a); a.mount = c.id; ok(s0 === 1 && s1 === w.laws.ecology.rideFight && s1 > 1, 'and in the saddle is stronger in a fight (' + s0 + ' on foot, ' + s1 + ' mounted)'); }
    const { w: w2, st: st2, em: em2 } = fresh(11, { flora: 1 }), a2 = w2.agents[0]; w2.creatures = []; w2.agents.forEach(o => still(o)); at(w2, a2, g.x + 1, g.y); way(a2, 'herding');
    const ox = { id: 91000, sp: 'plainsox', x: g.x + 2, y: g.y, px: g.x + 2, py: g.y, e: 90, age: 900, life: 9000, size: 1, quick: 1, sea: 0, owner: SW.rootOf(w2, a2).id, keeper: a2.id }; w2.creatures.push(ox); a2.stats.tamed = 1;
    think(st2, a2, { plan: [{ do: 'ride', ticks: 3 }] }); for (let k = 0; k < 2; k++) { a2.e = 90; SW.step(w2, em2); }
    ok(!a2.mount && told(st2, a2, /way of riding[\s\S]*A horse is gentler/), 'an ox is not gentle: the same one is refused, and told that a horse would bear them');
    /* mounted, twice the ground */
    const run = (mounted) => { const f = fresh(11, { flora: 1 }), w3 = f.w, x = w3.agents[0]; w3.creatures = []; w3.agents.forEach(o => { still(o); if (o !== x) at(w3, o, g.x + 40, g.y - 20); }); for (let d = 0; d < 8; d++) w3.roads[SW.idx(w3, g.x + d, g.y)] = 4; at(w3, x, g.x, g.y); way(x, 'herding'); if (mounted) { const hc = horseBy(w3, x, g.x, g.y, true); x.mount = hc.id; } think(f.st, x, { plan: [{ do: 'goto', x: g.x + 7, y: g.y, ticks: 20 }] }); let n = 0; while (x.x !== g.x + 7 && n < 30) { x.e = 90; w3.creatures = w3.creatures.filter(q => q.sp === 'horse'); SW.step(w3, f.em); n++; } return { n, there: x.x === g.x + 7 && x.y === g.y }; };
    const foot = run(false), rid = run(true);
    ok(foot.there && rid.there && rid.n * 2 <= foot.n + 1 && rid.n < foot.n, 'mounted, one covers seven steps of road in ' + rid.n + ' moments where it takes ' + foot.n + ' on foot, and arrives');
  }

  { /* ---- animals that carry and draw; vehicles as made things ---- */
    const { w, st, ev, em } = fresh(11, { flora: 1 }), g = patch(w, 8), a = w.agents[0]; w.creatures = []; w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, g.x + 40 + k, g.y - 20); });
    at(w, a, g.x + 1, g.y); way(a, 'herding'); way(a, 'wheel'); way(a, 'farming'); const L = w.laws;
    ok(L.recipes.plough && L.recipes.wagon && L.goods.wagon.draft === 1 && L.goods.plough.plough < 1 && !L.recipes.truck, 'the second age of the library gives the plough and the wagon; the truck is not yet in the world');
    const c0 = SW.capacity ? SW.capacity(w, a) : null, cap = () => SW.capacity(w, a);
    ok(typeof SW.capacity === 'function' && c0 > 0, 'what one can carry is asked of the world (' + c0 + ' with bare hands)');
    const c = horseBy(w, a, g.x + 2, g.y, true), c1 = cap(); ok(c1 === c0 + L.ecology.packCarry, 'a horse of one\'s own walking beside one carries for them: ' + c0 + ' becomes ' + c1);
    a.things = { cart: 1 }; a.wood = 6; think(st, a, { plan: [{ do: 'make', what: 'wagon', ticks: 4 }] }); for (let k = 0; k < 3; k++) { a.e = 90; at(w, c, g.x + 2, g.y); SW.step(w, em); }
    ok(a.things.wagon === 1 && cap() === c0 + L.ecology.packCarry + 10, 'a wagon made from a cart by a plan: with the horse to draw it one carries 10 more (' + cap() + ')');
    at(w, c, g.x + 30, g.y); c.keeper = null; c.owner = null; ok(cap() === c0, 'with no animal to draw it the wagon carries nothing (' + cap() + ')');
    const pr = M.buildPrompt(st, st.minds[a.id], 'routine'); ok(/wagon \((?:[^)]*)needs a horse or an ox of yours walking with you/.test(pr), 'and its holder is told so: the wagon needs a horse or an ox walking with them');
    /* the later vehicles come with their age */
    a.knows.oil = {}; w.ageOpen = 0; w.eraT = null; SW.openAges(w);
    ok(L.recipes.truck && L.goods.truck.road === 1 && L.goods.truck.speed === 1 && L.goods.motorcar.speed === 1 && L.goods.tractor.plough < 0.5 && L.goods.steamwagon && L.goods.tractionengine.plough === 0.5 && L.goods.armouredcar.fight === 2, 'when the fifth age is near, the engines, the motor car, the truck, the tractor and the armoured car are in the world as data with attributes');
    a.things = { truck: 1 }; const off = cap(); w.roads[SW.idx(w, a.x, a.y)] = 1; const on = cap(); w.roads[SW.idx(w, a.x, a.y)] = 3; const track = cap();
    ok(off === c0 && on === c0 + 20 && track === c0, 'a truck carries 20 more on a made road and nothing off it or on a worn track (' + off + ', ' + on + ', ' + track + ')');
    const run = (thing) => { const f = fresh(11, { flora: 1 }), w3 = f.w, x = w3.agents[0]; w3.creatures = []; w3.agents.forEach(o => { still(o); if (o !== x) at(w3, o, g.x + 40, g.y - 20); }); x.knows.oil = {}; w3.ageOpen = 0; w3.eraT = null; SW.openAges(w3); for (let d = 0; d < 8; d++) w3.roads[SW.idx(w3, g.x + d, g.y)] = 1; at(w3, x, g.x, g.y); if (thing) x.things = { [thing]: 1 }; think(f.st, x, { plan: [{ do: 'goto', x: g.x + 7, y: g.y, ticks: 20 }] }); let n = 0; while (x.x !== g.x + 7 && n < 30) { x.e = 90; w3.creatures = []; SW.step(w3, f.em); n++; } return { n, there: x.x === g.x + 7 && x.y === g.y, drove: w3.tally.drove || 0 }; };
    const foot = run(null), car = run('motorcar'), trac = run('tractor');
    ok(foot.there && car.there && car.n < foot.n && car.n * 2 <= foot.n + 1 && car.drove > 0 && trac.n === foot.n, 'in a motor car one covers seven steps of made road in ' + car.n + ' moments, on foot in ' + foot.n + '; a tractor is no faster (' + trac.n + ')');
    const g1 = K.applyOp(w, { op: 'good', name: 'handcar', speed: true, road: true, carry: 3, hint: 'a small car pushed along a road' }), g2 = K.applyOp(w, { op: 'good', name: 'nothing', hint: 'x' });
    ok(g1.ok && L.goods.handcar.speed === 1 && L.goods.handcar.road === 1 && L.goods.handcar.land === 1 && !g2.ok, 'the maker can make a vehicle of its own with speed, road and carry; a made thing that does nothing is refused');
    const cr = K.applyOp(w, { op: 'creature', name: 'draybeast', base: 'plainsox', gives: { draft: true, gentle: true, ride: true }, n: 2 });
    ok(cr.ok && L.creatures.draybeast.draft === 1 && L.creatures.draybeast.gentle === 1, 'and an animal of its own that draws and is gentle');
  }

  { /* ---- a plough, a draft animal and an engine make a tended field yield sooner ---- */
    const yieldIn = (setup) => { const f = fresh(11, { flora: 1 }), w = f.w, g = patch(w, 8), a = w.agents[0]; w.creatures = []; w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, g.x + 40 + k, g.y - 20); }); a.knows.oil = {}; w.ageOpen = 0; w.eraT = null; SW.openAges(w); way(a, 'farming'); way(a, 'herding'); const sj = SW.idx(w, g.x + 3, g.y + 1); w.stores[sj] = { by: a.id, items: [] };
      const i = SW.idx(w, g.x + 2, g.y); w.shelters[i] = a.id; w.bkind[i] = 'field'; w.laws.buildings.field.yields.seasons = null; at(w, a, g.x + 2, g.y); setup(w, a, g); let first = 0;
      think(f.st, a, { plan: [{ do: 'tend', what: 'field', ticks: 400 }] });
      for (let k = 0; k < 480; k++) { w.stores[sj].items.length = 0; a.e = 90; a.thirst = 0; at(w, a, g.x + 2, g.y); w.creatures = w.creatures.filter(q => q.sp === 'horse'); w.creatures.forEach(q => at(w, q, g.x + 3, g.y)); SW.step(w, f.em); first = (w.tally.yielded || {}).field || 0; }
      return first; };
    const bare0 = yieldIn(() => {}), plough = yieldIn((w, a) => { a.things = { plough: 1 }; }), horse = yieldIn((w, a, g) => { horseBy(w, a, g.x + 3, g.y, true); }), both = yieldIn((w, a, g) => { a.things = { plough: 1 }; horseBy(w, a, g.x + 3, g.y, true); }), tractor = yieldIn((w, a) => { a.things = { tractor: 1 }; });
    ok(bare0 >= 5 && plough > bare0 && horse > plough && both > horse && tractor > both, 'a field tended two days gives ' + bare0 + ' measures of grain by hand, ' + plough + ' with a plough, ' + horse + ' with a horse of the holder near, ' + both + ' with both, ' + tractor + ' with a tractor');
  }

  { /* ---- nothing is raised on a road ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; w.creatures = []; w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, g.x + 40 + k, g.y - 20); });
    const i = SW.idx(w, g.x + 2, g.y); w.roads[i] = 4; at(w, a, g.x + 2, g.y); a.wood = 6; a.stone = 6; think(st, a, { plan: [{ do: 'build', what: 'shelter', ticks: 4 }] }); for (let k = 0; k < 3; k++) { a.e = 90; at(w, a, g.x + 2, g.y); SW.step(w, em); }
    ok(!w.shelters[i] && told(st, a, /nothing is raised on a road/) && w.tally.roadRefused >= 1, 'a plan to build on a dirt road is refused and its maker told why');
    a.wood = 6; a.stone = 6; way(a, 'masonry'); still(a); at(w, a, g.x + 2, g.y); think(st, a, { plan: [{ do: 'build', what: 'wall', ticks: 4 }] }); for (let k = 0; k < 4 && !w.walls[i]; k++) { a.e = 90; at(w, a, g.x + 2, g.y); SW.step(w, em); }
    ok(!!w.walls[i], 'a wall may be raised on a road, to bar it'); w.walls[i] = 0;
    w.roads[i] = 3; a.wood = 6; a.stone = 6; still(a); at(w, a, g.x + 2, g.y); think(st, a, { plan: [{ do: 'build', what: 'shelter', ticks: 4 }] }); for (let k = 0; k < 4 && !w.shelters[i]; k++) { a.e = 90; at(w, a, g.x + 2, g.y); SW.step(w, em); }
    ok(w.shelters[i] === a.id, 'on a worn track, which is not a road, the same plan raises the shelter');
    still(a); at(w, a, g.x + 2, g.y); const r0 = w.roads[i]; think(st, a, { plan: [{ do: 'pave', ticks: 3 }] }); for (let k = 0; k < 3; k++) { a.e = 90; at(w, a, g.x + 2, g.y); SW.step(w, em); }
    ok(w.roads[i] === r0 && told(st, a, /a road does not run through what is built/), 'and a road is not made through what is built: a plan to pave where the shelter stands is refused and its maker told why');
  }

  { /* ---- a town begun old: streets, plots, dwellings of the age, works near what they need ---- */
    const town = (age, seed) => { const f = fresh(seed || 7, { seas: 1, flora: 1, fog: 1 }), w = f.w; SW.beginAt(w, age); M.backfill(f.st, age); return f; };
    const look = (w) => { const kinds = {}, onRoad = []; for (const i in w.bkind) if (w.shelters[i] > 0) { kinds[w.bkind[i]] = (kinds[w.bkind[i]] || 0) + 1; if (w.roads[i]) onRoad.push(w.bkind[i]); } for (const i in w.stores) if (w.stores[i] && w.roads[i]) onRoad.push('store'); const grades = {}; for (const i in w.roads) grades[w.roads[i]] = (grades[w.roads[i]] || 0) + 1; return { kinds, onRoad, grades }; };
    const f2 = town(2), f4 = town(4), f5 = town(5), l2 = look(f2.w), l4 = look(f4.w), l5 = look(f5.w);
    ok(l2.onRoad.length === 0 && l4.onRoad.length === 0 && l5.onRoad.length === 0, 'in towns begun in the second, fourth and fifth ages nothing stands on a street');
    ok(l2.grades[4] > 25 && !l2.grades[1] && l4.grades[1] > 70 && l5.grades[1] > l2.grades[4], 'the streets of the second age are dirt (' + l2.grades[4] + ' tiles); of the fourth and fifth, paved (' + l4.grades[1] + ', ' + l5.grades[1] + ')');
    /* streets as they are drawn: a tile is joined straight to the four beside it, and aslant only where there is no squared way round */
    const made = (w, x, y) => { const X = SW.wrapX(w, x); return SW.inb(w, X, y) && !!w.roads[SW.idx(w, X, y)] && w.roads[SW.idx(w, X, y)] !== 3; };
    const links = (w, x, y) => { const o = []; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { if (made(w, x + d[0], y + d[1])) o.push(d); }); [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => { if (made(w, x + d[0], y + d[1]) && !made(w, x + d[0], y) && !made(w, x, y + d[1])) o.push(d); }); return o; };
    const shape = (w) => { let junction = 0, bend = 0, slant = 0, square = 0, n = 0; const comp = {}; let comps = 0; const tiles = Object.keys(w.roads).filter(k => w.roads[k] !== 3).map(Number);
      tiles.forEach(i => { n++; const x = i % w.W, y = Math.floor(i / w.W), L = links(w, x, y); if (L.length >= 3) junction++; else if (L.length === 2 && (L[0][0] + L[1][0] !== 0 || L[0][1] + L[1][1] !== 0)) bend++; if (L.some(d => d[0] && d[1])) slant++; if (made(w, x + 1, y) && made(w, x, y + 1) && made(w, x + 1, y + 1)) square++; });
      tiles.forEach(i => { if (comp[i]) return; comps++; const q = [i]; comp[i] = comps; while (q.length) { const c = q.pop(), x = c % w.W, y = Math.floor(c / w.W); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = SW.wrapX(w, x + dx), Y = y + dy; if (!SW.inb(w, X, Y)) continue; const j = SW.idx(w, X, Y); if (w.roads[j] && w.roads[j] !== 3 && !comp[j]) { comp[j] = comps; q.push(j); } } } });
      return { tiles: n, junction, bend, slant, square, networks: comps }; };
    const s2 = shape(f2.w), s4 = shape(f4.w), s5 = shape(f5.w), towns = w => (w.settlements || []).length;
    ok(s2.junction >= 6 && s2.bend >= 12 && s2.slant >= 12 && s4.junction > s2.junction && s4.bend > s2.bend && s4.slant > s2.slant, 'the streets branch, bend and run aslant, and more so in a later age (second age: ' + JSON.stringify(s2) + '; fourth: ' + JSON.stringify(s4) + ')');
    ok(s2.square === 0 && s4.square === 0 && s5.square === 0, 'a street is one tile wide everywhere: no four street tiles make a square in any of the three');
    ok(s2.networks <= towns(f2.w) + 1 && s4.networks <= towns(f4.w) + 2 && s5.networks <= towns(f5.w) + 2, 'the streets of a town join into one network (second age: ' + s2.networks + ' networks for ' + towns(f2.w) + ' towns; fourth: ' + s4.networks + ' for ' + towns(f4.w) + '; fifth: ' + s5.networks + ' for ' + towns(f5.w) + '; water wider than a bridge can part one)');
    const lone = w => { const out = []; for (const k in w.bkind) { const i = +k; if (!(w.shelters[i] > 0) || w.bkind[i] === 'field') continue; const x = i % w.W, y = Math.floor(i / w.W); let by = false; for (let dy = -1; dy <= 1 && !by; dy++) for (let dx = -1; dx <= 1 && !by; dx++) if ((dx || dy) && made(w, x + dx, y + dy)) by = true; if (!by) out.push(w.bkind[i]); } return out; };
    ok(lone(f2.w).length === 0 && lone(f4.w).length === 0 && lone(f5.w).length === 0, 'every building of the three towns has a street beside it, so a path can be drawn from its door' + (lone(f4.w).length ? ' (without: ' + lone(f4.w).slice(0, 5).join(', ') + ')' : ''));
    { const br = w => Object.keys(w.roads).filter(k => w.roads[k] === 2).every(k => w.terrain[k] === T.WATER || w.terrain[k] === T.SHALLOWS), dry = w => Object.keys(w.roads).filter(k => w.roads[k] === 1 || w.roads[k] === 4).every(k => w.terrain[k] !== T.WATER && w.terrain[k] !== T.SHALLOWS && w.terrain[k] !== T.VOID);
      ok(br(f2.w) && br(f4.w) && br(f5.w) && dry(f2.w) && dry(f4.w) && dry(f5.w), 'where a street meets narrow water it is a bridge, and no street lies on water or on the unknown'); }
    ok(l2.kinds.house > 6 && !l2.kinds.rowhouse && l4.kinds.rowhouse > 6 && !l4.kinds.house && l5.kinds.tenement > 6 && !l5.kinds.rowhouse, 'the dwellings are of their age: houses in the second, row houses in the fourth, tenements and apartments in the fifth');
    const only4 = Object.keys(l4.kinds).filter(k => !l2.kinds[k]), only5 = Object.keys(l5.kinds).filter(k => !l4.kinds[k]);
    ok(only4.length >= 12 && only5.length >= 4 && ['foundry', 'parliament', 'castle'].every(k => l4.kinds[k]) && ['refinery', 'powerhouse', 'mast'].every(k => l5.kinds[k]), 'a town of the fourth age holds ' + only4.length + ' kinds the second has none of (' + only4.slice(0, 8).join(', ') + '...), the fifth ' + only5.length + ' more (' + only5.join(', ') + ')');
    /* every work stands within reach of what it needs */
    const lacks = []; { const w = f4.w, B = w.laws.buildings, near = w.laws.build.near; SW.use(w); for (const k in w.bkind) { const i = +k; if (!(w.shelters[i] > 0)) continue; const b = B[w.bkind[i]]; if (!b || !b.needs) continue; const x = i % w.W, y = Math.floor(i / w.W); b.needs.forEach(n => { if (n === 'field' || n === 'store') return; let found = false; for (const k2 in w.bkind) { const j = +k2; if (w.shelters[j] > 0 && (w.bkind[j] === n || SW.isOfLine(w, w.bkind[j], n)) && SW.cheb(x, y, j % w.W, Math.floor(j / w.W)) <= near) { found = true; break; } } if (!found) lacks.push(w.bkind[i] + ' lacks ' + n); }); } }
    ok(lacks.length === 0, 'in the town of the fourth age every work stands within reach of each work it needs' + (lacks.length ? ' (' + lacks.slice(0, 4).join('; ') + ')' : ''));
    const known = (w) => { let n = 0; for (let i = 0; i < w.terrain.length; i++) if (w.terrain[i] !== T.VOID) n++; return n; };
    ok(known(f4.w) > known(f2.w) && known(f2.w) > known(fresh(7, { seas: 1, flora: 1, fog: 1 }).w), 'a people of a later age knows more of the land about it (' + known(f2.w) + ' tiles in the second age, ' + known(f4.w) + ' in the fourth)');
    const fields = (w) => { let far = 0, all = 0; const S = w.settlements || []; for (const k in w.bkind) if (w.bkind[k] === 'field' && w.shelters[k] > 0) all++; return all; };
    ok(fields(f4.w) > fields(f2.w) && f4.w.tally.cleared > 0, 'more fields lie about the later town (' + fields(f2.w) + ', ' + fields(f4.w) + '), and the wood about it was felled (' + f4.w.tally.cleared + ' trees)');
    /* animals and vehicles in hand; what a mind is told */
    const v4 = f4.w.tally.vehicles || {}, v5 = f5.w.tally.vehicles || {}, kept = f4.w.creatures.filter(c => c.sp === 'horse' && c.keeper != null).length;
    ok(v4.wagon > 0 && v4.steamwagon > 0 && v4.tractionengine > 0 && !v4.truck && v5.truck > 0 && v5.motorcar > 0 && v5.tractor > 0 && kept >= 3, 'the fourth age has wagons and steam in hand, the fifth trucks, motor cars and tractors; ' + kept + ' horses are kept');
    const a = f4.w.agents[1], pr = M.buildPrompt(f4.st, f4.st.minds[a.id], 'routine');
    ok(/YOUR AGE: you live in an age of steam, engines, factories, printing and science/.test(pr) && /WHAT YOU HOLD\. /.test(pr) && /among your people you are the one of the /.test(pr) && /Streets run through the town/.test(pr), 'a mind of the fourth age is told its age, what it keeps, what it is among its people, and that streets run through the town');
    const a1 = fresh(7, { seas: 1, flora: 1, fog: 1 }), p1 = M.buildPrompt(a1.st, a1.st.minds[a1.w.agents[0].id], 'routine'); ok(!/YOUR AGE:/.test(p1), 'a mind of the first age is told nothing of an age');
    const s = K.stats(f5.st).horsesVehiclesAndStreets; ok(s && s.horsesAlive >= 3 && s.vehiclesAndPloughsHeld.truck > 0 && s.roadTilesByGrade.paved > 100 && s.animalsThatDrawKeptAndWalkingWithSomeone >= 3 && /horsesVehiclesAndStreets/.test(K.SEED), 'the maker sees horses, vehicles and streets in its figures (' + s.horsesAlive + ' horses, ' + JSON.stringify(s.vehiclesAndPloughsHeld) + ') and is told of them');
    /* the town runs */
    const w = f4.w; let died = 0; for (let k = 0; k < 480; k++) SW.step(w, e => { if (e.type === 'death') died++; f4.em(e); });
    ok(w.agents.length >= 12 && died <= 3, 'the town of the fourth age runs two days on instinct: ' + w.agents.length + ' alive, ' + died + ' died');
  }

  { /* ---- horses in a new world; a named thing of the heritage placed once ---- */
    const f = fresh(7, { seas: 1, flora: 1, fog: 1 }), w = f.w, hs = w.creatures.filter(c => c.sp === 'horse');
    ok(hs.length >= 6 && hs.every(c => w.terrain[SW.idx(w, c.x, c.y)] !== T.VOID && w.terrain[SW.idx(w, c.x, c.y)] !== T.WATER), 'a new world has herds of horses on known ground near its peoples (' + hs.length + ')');
    const a = SW.createWorld(7, { seas: 1, flora: 1, fog: 1 }), b = SW.createWorld(7, { seas: 1, flora: 1, fog: 1 }); ok(JSON.stringify(a.creatures) === JSON.stringify(b.creatures) && a.rng === b.rng, 'and the same seed gives the same horses in the same places');
    const p0 = SW.createWorld(7), sig = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'plain-world-seed-7-generation-31.json'), 'utf8')), h = x => require('crypto').createHash('sha256').update(JSON.stringify(x)).digest('hex');
    ok(h(Array.from(p0.terrain)) === sig.terrain && h(p0.agents.map(q => [q.x, q.y])) === sig.agents && p0.creatures.length === sig.creatures && p0.rng === sig.rng && p0.plants.filter(Boolean).length === sig.plants && Object.keys(p0.laws.creatures).length === sig.kinds, 'a world begun without options is as the generation before made it: the same land, founders, animals, plants and stream of chance (a record kept from Generation 31)');
    const site = K.HERITAGE.ops.filter(o => o.op === 'site')[0], g = fresh(7); const n0 = (g.w.sites || []).filter(s => s.name === site.name).length;
    const w2 = SW.createWorld(7), st2 = M.createState(w2); K.inherit(st2, { ops: [JSON.parse(JSON.stringify(site)), JSON.parse(JSON.stringify(site))], lessons: [], ideas: [] }); const n1 = (w2.sites || []).filter(s => s.name === site.name).length;
    ok(site && n0 === 1 && n1 === 1, 'a place of power named in the heritage and again in what the browser kept is placed once (' + site.name + ': ' + n1 + ')');
  }
  { /* ---- a world of the generation before, carried on ---- */
    const saved = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-31-fourth-age.json.gz'))).toString('utf8')); /* made by Generation 31 as the page makes a world, begun in the fourth age, one day in */
    const st2 = M.restore(saved), w2 = st2.world; SW.use(w2); const P = w2.laws.plants, ks = Object.keys(P); let pairs = 0; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (SW.alikeLooks(P[ks[i]].look, P[ks[j]].look)) pairs++;
    let died = 0; for (let i = 0; i < 480; i++) { SW.step(w2, e => { if (e.type === 'death') died++; st2.emit(e); }); M.tick(st2); }
    const pr = M.buildPrompt(st2, st2.minds[w2.agents[0].id], 'routine');
    ok(w2.agents.length >= 13 && pairs === 0 && w2.laws.creatures.horse && w2.laws.recipes.plough && w2.laws.recipes.steamwagon && w2.laws.buildings.rowhouse && w2.laws.goods.wagon && /YOUR AGE: you live in an age of steam/.test(pr), 'a fourth-age world made and saved by Generation 31 opens and runs two days (' + w2.agents.length + ' alive): its plants are told apart, the horse is a kind in it, the plough, the steam wagon and the row house are in its laws, and its minds are told their age');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
