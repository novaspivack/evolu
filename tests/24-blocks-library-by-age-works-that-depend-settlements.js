/* Generation 28. Structures from blocks; a library by age; works that depend on one another; settlements that know of one another.
   And from the eighteenth run: a crossing is news once for each land; why a plan was broken is recorded; an elder is told what only it knows;
   the maker can see crowding hunger by land. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const run = (w, em, n, keep) => { for (let k = 0; k < n; k++) { w.creatures = []; (keep || []).forEach(o => { o.e = Math.max(o.e, 80); o.thirst = 0; o.hp = Math.max(o.hp, 80); }); SW.step(w, em); } };
const T = SW.T, bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]);
const patch = (w, n) => { for (let y = 30; y < w.H - 30; y++) for (let x = 40; x < w.W - 60; x++) { let good = true; for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y))) good = false; if (good) return { x, y }; } return null; };
const way = (a, k) => { a.knows[k] = { name: 'the way of ' + k, idea: 'known', look: null, tick: 0, by: a.id, byName: a.name }; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const apart = (w, keep, g) => w.agents.forEach((o, k) => { still(o); if (keep.indexOf(o) < 0) at(w, o, g.x + 40 + (k % 5) * 3, g.y - 22 + Math.floor(k / 5) * 3); });
const stand = (w, a, x, y, kind) => { const i = SW.idx(w, x, y); w.shelters[i] = a.id; w.bkind[i] = kind; return i; };

(async () => {
  { /* ---- the library by age ---- */
    const bareW = SW.createWorld(7), n0 = Object.keys(bareW.laws.buildings).length, { w, st, ev, em } = fresh(7), B = w.laws.buildings;
    ok(w.ageOpen === 2 && B.landing && B.guesthouse && B.beacon && B.bathhouse && B.roadhouse && !B.lighthouse && !B.station && !B.mast && Object.keys(B).length > n0, 'a world begins with the first two ages of the library open (' + (Object.keys(B).length - n0) + ' structures added to ' + n0 + '), and none of the later ones');
    ok(JSON.stringify(bareW.terrain) === JSON.stringify(w.terrain) && Object.keys(SW.LIBRARY).length >= 5, 'the library is data, by age (' + Object.keys(SW.LIBRARY).join(', ') + '), and opening it moves nothing in the land');
    const hands = k => { const b = B[k], bw = b.wood || 0, bs = b.stone || 0; return (bw <= w.laws.build.woodMax && bs <= w.laws.craft.stoneMax) || bw + bs > 14 || bw > w.laws.build.woodMax || bs > w.laws.craft.stoneMax; };
    const all = []; for (const n in SW.LIBRARY) for (const k in (SW.LIBRARY[n].buildings || {})) all.push(SW.LIBRARY[n].buildings[k]);
    ok(all.length >= 9 && all.every(b => b.way && w.laws.tree[b.way] && b.hint.length > 30) && all.every(b => (b.needs || []).every(k => k === 'store' || SW.defaultLaws().buildings[k] || all.length)), 'every structure in it belongs to a way of the tree and says what it is for (' + all.length + ' structures)');
    way(w.agents[0], 'sailing'); w.eraT = null; const d0 = SW.day(w); while (w.tick % w.laws.time.dayLength !== 3) SW.step(w, em); SW.step(w, em);
    ok(w.ageOpen === 4 && B.lighthouse && B.harbour && B.station && !B.mast && ev.filter(e => e.type === 'ageopen').length === 2, 'when one of them comes to know a way of the third age, the third age opens and the fourth is made ready (lighthouse, harbour, station), and the fifth is not');
    ok(st.chron.some(c => /An age has opened: what the third age builds can now be raised[^.]*lighthouse, harbour/.test(c.text)), 'and the chronicle says so');
    const old = M.restore(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-27.json.gz')))));
    ok(old.world.ageOpen >= 2 && old.world.laws.blocks && old.world.laws.buildings.guesthouse && old.world.laws.build.near === 12, 'a world saved by Generation 27 is given the library of the ages it has reached');
    for (let k = 0; k < 300; k++) { SW.step(old.world, old.emit); M.tick(old); }
    ok(old.world.agents.length > 0 && M.buildPrompt(old, old.minds[old.world.agents[0].id], 'deep').length > 5000 && K.stats(old).settlementsAndStructures && M.digest(old).generation >= 28, 'and runs on');
  }

  { /* ---- works that depend on one another, through the mind ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; apart(w, [a], g); w.creatures = []; at(w, a, g.x, g.y);
    way(a, 'wells'); way(a, 'roads'); way(a, 'customs'); a.wood = 3; a.stone = 6;
    const line = k => (M.buildPrompt(st, st.minds[a.id], 'deep').match(new RegExp('- ' + k + ' [^\\n]*')) || [''])[0];
    ok(/it depends on a well within 12 steps \(none here now\)/.test(line('bathhouse')), 'a mind is told what a structure depends on and that there is none here: ' + line('bathhouse').slice(0, 96));
    think(st, a, { plan: [{ do: 'build', what: 'bathhouse', ticks: 5 }] }); run(w, em, 2, [a]);
    ok(!w.shelters[SW.idx(w, g.x, g.y)] && a.stone === 6 && told(st, a, /A bathhouse depends on other works: it needs a well standing within 12 steps/), 'a bath house planned where no well stands is not raised, nothing is spent, and the mind is told why');
    stand(w, a, g.x + 5, g.y, 'well');
    ok(/\(there is one here\)/.test(line('bathhouse')) && SW.infraLack(w, a, 'bathhouse').length === 0, 'with a well five steps off, it is told there is one here');
    at(w, a, g.x, g.y); think(st, a, { plan: [{ do: 'build', what: 'bathhouse', ticks: 5 }] }); run(w, em, 3, [a]);
    ok(SW.buildingAt(w, SW.idx(w, g.x, g.y)) === 'bathhouse' && a.stone === 0, 'and the same plan now raises it');
    at(w, a, g.x + 2, g.y + 3); a.wood = 5; a.stone = 3;
    think(st, a, { plan: [{ do: 'build', what: 'roadhouse', ticks: 5 }] }); run(w, em, 2, [a]);
    ok(!w.shelters[SW.idx(w, a.x, a.y)] && told(st, a, /A roadhouse must stand beside a paved way/), 'a road house away from any paved way is refused, with the reason');
    w.roads[SW.idx(w, a.x + 1, a.y)] = 1;
    think(st, a, { plan: [{ do: 'build', what: 'roadhouse', ticks: 5 }] }); run(w, em, 3, [a]);
    ok(SW.buildingAt(w, SW.idx(w, a.x, a.y)) === 'roadhouse', 'and beside one it is raised');
    /* a beacon carries a voice */
    const b = w.agents[1]; b.people = a.people; b.lang = a.lang; at(w, a, g.x, g.y + 8); at(w, b, g.x, g.y + 28); const r0 = SW.reach(w, a);
    think(st, a, { say: { text: 'the ice is breaking' } }); const h0 = told(st, b, /the ice is breaking/);
    stand(w, a, a.x + 1, a.y, 'beacon'); const r1 = SW.reach(w, a);
    think(st, a, { say: { text: 'the herd has come back' } }); const h1 = told(st, b, /the herd has come back/);
    ok(r1 === r0 * 2 && !h0 && h1, 'one who speaks beside a beacon is heard twice as far (' + r0 + ' steps to ' + r1 + '): at twenty steps the word is not heard without it and is heard with it');
  }

  { /* ---- structures from blocks ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0], BL = w.laws.blocks; apart(w, [a], g); w.creatures = []; at(w, a, g.x, g.y);
    ok(Object.keys(BL).length >= 12 && ['roof', 'hearth', 'beds', 'benches', 'gathering', 'altar', 'lookout'].every(k => BL[k] && BL[k].hint && (BL[k].wood || BL[k].stone)), 'blocks are data in the laws, each with a cost and what it gives: ' + Object.keys(BL).join(', '));
    const c = SW.compose(w, ['roof', 'beds', 'hearth', 'altar', 'nonsense', 'hearth']);
    ok(c.wood === BL.roof.wood + BL.beds.wood + BL.hearth.wood && c.stone === BL.hearth.stone + BL.altar.stone && c.blocks.length === 4 && c.fx.length === 4, 'blocks put together: costs add (' + c.wood + ' wood, ' + c.stone + ' stone), effects join (' + c.fx.map(f => f.on).join(', ') + '), an unknown or repeated block is left out');
    const r = K.applyOp(w, { op: 'structure', name: 'hospice', blocks: ['roof', 'beds', 'hearth', 'altar'], way: 'medicine', needs: ['store', 'nonsense'], hint: 'where the old are cared for' }), H = w.laws.buildings.hospice;
    ok(r.ok && H && H.wood === c.wood && H.stone === c.stone && H.way === 'medicine' && JSON.stringify(H.needs) === '["store"]' && /where the old are cared for \(a roof/.test(H.hint) && H.blocks.length === 4, 'the maker designs a structure from blocks (op structure): ' + r.text);
    ok(!K.applyOp(w, { op: 'structure', name: 'thing', blocks: ['roof'] }).ok && !K.applyOp(w, { op: 'structure', name: 'hospice', blocks: ['roof', 'beds'] }).ok && !K.applyOp(w, { op: 'structure', name: 'mastthing', blocks: ['mast', 'roof'] }).ok, 'one block is not a structure, a name in use is refused, and a block of an age not yet open cannot be used');
    way(a, 'medicine'); a.wood = 5; a.stone = 3;
    think(st, a, { plan: [{ do: 'build', what: 'hospice', ticks: 5 }] }); run(w, em, 2, [a]);
    ok(!w.shelters[SW.idx(w, g.x, g.y)] && told(st, a, /A hospice depends on other works: it needs a store/), 'a mind that plans the new structure is held to what it depends on');
    w.stores[SW.idx(w, g.x + 3, g.y)] = w.stores[SW.idx(w, g.x + 3, g.y)] || { by: a.id, items: [] };
    at(w, a, g.x, g.y); think(st, a, { plan: [{ do: 'build', what: 'hospice', ticks: 5 }] }); run(w, em, 3, [a]);
    ok(SW.buildingAt(w, SW.idx(w, g.x, g.y)) === 'hospice', 'and raises it, by its plan, once a store stands near');
    const u = K.applyOp(w, r.undo); ok(u.ok && !w.laws.buildings.hospice, 'the maker can take the kind back');
    ok(/"op":"structure"/.test(K.OPS) && /structures are put together from blocks/.test(K.SEED), 'the maker is told of the op and of the blocks, and its roadmap says what Generation 28 added');
  }

  { /* ---- settlements that know of one another ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0]; apart(w, [a], g); w.creatures = [];
    const A = { x: g.x, y: g.y, r: 5, root: a.id, n: 3, age: 1, name: 'Reedhold' }, Bs = { x: g.x + 22, y: g.y, r: 5, root: w.agents[1].id, n: 3, age: 2, name: 'Ironhall' };
    w.settlements = [A, Bs]; stand(w, a, A.x + 1, A.y, 'field'); stand(w, a, A.x, A.y + 1, 'kiln'); stand(w, a, Bs.x, Bs.y + 1, 'forge'); stand(w, a, Bs.x + 1, Bs.y, 'kiln');
    at(w, a, A.x, A.y); think(st, a, {});
    ok(!/OTHER SETTLEMENTS YOU KNOW OF/.test(M.buildPrompt(st, st.minds[a.id], 'deep')) && !(st.minds[a.id].setts || {}).Ironhall, 'a being is not told of a settlement it has never been near (22 steps off, beyond sight)');
    at(w, a, Bs.x - 8, Bs.y); think(st, a, {}); at(w, a, A.x, A.y);
    const pr = M.buildPrompt(st, st.minds[a.id], 'deep'), ln = (pr.match(/- Ironhall[^\n]*/) || [''])[0];
    ok(/OTHER SETTLEMENTS YOU KNOW OF \(you are of Reedhold\)/.test(pr) && /22 steps east/.test(ln) && /it has a forge, which Reedhold has not/.test(ln) && /it has no field, which Reedhold has/.test(ln) && !/kiln/.test(ln) && /no paved way between/.test(ln), 'once it has been near, it is told where the other lies, what it has that its own lacks and lacks that its own has: ' + ln);
    ok(!SW.joinedByRoad(w, A, Bs), 'no paved way joins them');
    for (let x = A.x + 2; x <= Bs.x - 3; x++) w.roads[SW.idx(w, x, A.y)] = 1;
    ok(SW.joinedByRoad(w, A, Bs) && /joined to Reedhold by a paved way/.test((M.buildPrompt(st, st.minds[a.id], 'deep').match(/- Ironhall[^\n]*/) || [''])[0]), 'a paved way laid from one to the other joins them, and the mind is told');
    delete w.roads[SW.idx(w, A.x + 9, A.y)];
    ok(!SW.joinedByRoad(w, A, Bs), 'a gap in it and they are not joined');
    w.roads[SW.idx(w, A.x + 9, A.y)] = 1; const s = K.stats(st).settlementsAndStructures;
    ok(s.settlements.length === 2 && s.settlements[1].kinds.forge === 1 && s.pairsJoinedByAPavedWay[0] === 'Reedhold and Ironhall' && s.agesOpen === 2 && s.blocksOpen.length >= 12, 'the maker reads what stands in each settlement, which pairs a paved way joins, the ages open and the blocks it may use');
    st.minds[a.id].thoughts = 3; const routine = M.buildPrompt(st, st.minds[a.id], 'routine'); st.minds[a.id].thoughts = 4; const r1 = M.buildPrompt(st, st.minds[a.id], 'routine');
    ok(/OTHER SETTLEMENTS/.test(routine) && !/OTHER SETTLEMENTS/.test(r1), 'in ordinary thoughts it is told one time in three, to keep what it is told short');
  }

  { /* ---- from the eighteenth run ---- */
    const { w, st, ev, em } = fresh(7), a = w.agents[0], b = w.agents[1];
    const n = () => st.chron.filter(c => /crossed the water on a vessel/.test(c.text)).length;
    const cross = (x, y) => st.emit({ type: 'crossed', a: a.id, moments: 14, open: 8, x: x, y: y });
    const R0 = SW.regionAt(w, a.x, a.y); let other = null; for (let x = 40; x < w.W - 40 && !other; x += 7) for (let y = 20; y < w.H - 20 && !other; y += 7) { const R = SW.regionAt(w, x, y); if (R && R0 && R.name !== R0.name) other = { x, y }; }
    cross(a.x, a.y); const n1 = n(); cross(a.x, a.y); cross(a.x, a.y); const n2 = n(); cross(other.x, other.y); const n3 = n();
    ok(n1 === 1 && n2 === 1 && n3 === 2, 'a crossing is news the first time one lands in a land, not each time after (three landings in one land: one entry in the chronicle; a fourth in another land: a second). In the eighteenth run two beings going to and fro made 28');
    still(a); a.plan = [{ do: 'linger', ticks: 200 }]; st.minds[a.id].lastT = w.tick - 5; M.tell(st, a.id, 'A stalker has bitten you.', 9);
    ok(M.weightyWhy(st.minds[a.id]) === 'A stalker has bitten you.' && M.ready(st, st.minds[a.id], a), 'what broke into a plan is kept, to be recorded with the thought it brought ("' + M.weightyWhy(st.minds[a.id]) + '")');
    /* an elder is told what only it knows */
    way(a, 'alchemy'); w.agents.forEach(o => { if (o !== a) delete o.knows.alchemy; }); st.emit({ type: 'nearing', a: a.id });
    ok(told(st, a, /OF ALL THE LIVING ONLY YOU KNOW the way of [^.]*alchemy[^.]*\. Taught to no one/), 'an elder who feels death near is told which ways no one else alive knows (alchemy died with its one holder in the seventeenth run)');
    way(b, 'tools'); st.minds[b.id].events = []; const onlyB = Object.keys(b.knows).filter(k => !w.agents.some(o => o !== b && o.knows[k])); st.emit({ type: 'nearing', a: b.id });
    ok(onlyB.length > 0 || !told(st, b, /OF ALL THE LIVING ONLY YOU KNOW/), 'and one whose ways are all held by others is not told so');
    const ln = K.stats(st).landsNow;
    ok(ln.length >= 2 && ln.every(q => q.land && q.beings > 0 && q.medianEnergy > 0 && q.foodBearingNow >= 0 && q.foodPerBeing >= 0) && ln[0].foodPerBeing <= ln[ln.length - 1].foodPerBeing && ln.reduce((s, q) => s + q.beings, 0) === w.agents.filter(o => !o.dead).length, 'the maker reads, for each land, the beings there, their median energy and the food bearing now for each of them, the tightest first (its request of day 74): ' + JSON.stringify(ln[0]));
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
