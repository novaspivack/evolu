/* Generation 26. A community advances together: a way is a band's when two of its members hold it; then any of them may raise its buildings, a better
   building may be raised in place of the one it grows out of, and when it stands the whole band learns the way. And whatever takes more than two hands
   hold is made over time, by loads: before, a forge, a well, a mill, an infirmary, a barracks, a boat and every ship could never be made. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d) => M.apply(st, st.minds[a.id], 'routine', Object.assign({ thought: 'x' }, d), {});
const run = (w, em, n, keep) => { for (let k = 0; k < n; k++) { w.creatures = []; (keep || []).forEach(o => { o.e = Math.max(o.e, 80); o.thirst = 0; o.hp = Math.max(o.hp, 80); }); SW.step(w, em); } };
const T = SW.T, bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]);
const patch = (w, n) => { for (let y = 30; y < w.H - 30; y++) for (let x = 20; x < w.W - 40; x++) { let good = true; for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y))) good = false; if (good) return { x, y }; } return null; };
const way = (a, k, from) => { a.knows[k] = { name: 'the way of ' + k, idea: 'known', look: null, tick: 0, by: (from || a).id, byName: (from || a).name }; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));

(async () => {
  { /* ---- what could never be raised ---- */
    const { w, st, ev, em } = fresh(11), L = w.laws, B = L.buildings, hands = k => (B[k].wood || 0) <= L.build.woodMax && (B[k].stone || 0) <= L.craft.stoneMax;
    const never = Object.keys(B).filter(k => !hands(k) && (B[k].wood || 0) + (B[k].stone || 0) <= 14);
    ok(L.build.woodMax === 6 && L.craft.stoneMax === 6 && never.indexOf('forge') >= 0 && never.indexOf('well') >= 0 && never.length >= 5, 'the fault: hands hold six wood and six stone, and ' + never.length + ' kinds of building (' + never.join(', ') + ') ask for more of one at once without being great works, so none could ever be raised');
    const a = w.agents[0], g = patch(w, 8); w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, g.x + 30 + k, g.y - 20); }); w.creatures = [];
    way(a, 'smelting'); a.wood = 4; a.stone = 6; at(w, a, g.x, g.y);
    think(st, a, { plan: [{ do: 'build', what: 'forge', ticks: 5 }] }); run(w, em, 3, [a]);
    const i = SW.idx(w, g.x, g.y);
    ok(!w.shelters[i] && w.works[i] && w.works[i].kind === 'forge' && w.works[i].wood === 4 && w.works[i].stone === 6 && told(st, a, /laboured on the forge/), 'a forge is now begun with what the builder carries and stands as a work under way (4 wood and 6 stone of 4 and 8)');
    a.stone = 2; think(st, a, { plan: [{ do: 'build', what: 'forge', ticks: 5 }] }); run(w, em, 3, [a]);
    ok(SW.buildingAt(w, i) === 'forge' && w.shelters[i] === a.id && !w.works[i] && w.tally.built.forge === 1, 'and stands when the last two stone are brought');
    /* a boat of ten wood, made over time by two */
    const b = w.agents[1]; way(a, 'boats'); way(b, 'boats'); at(w, a, g.x + 3, g.y); at(w, b, g.x + 4, g.y);
    a.wood = 6; a.tools.push({ k: Object.keys(L.tools).find(k => L.tools[k].use === 'build') || 'x', left: 50 }); const hasTool = a.tools.some(q => L.tools[q.k] && L.tools[q.k].use === 'build');
    if (!hasTool) { L.tools.testadze = { use: 'build', power: 1.2, wood: 1, stone: 1 }; a.tools = [{ k: 'testadze', left: 50 }]; }
    b.tools = a.tools.map(q => Object.assign({}, q)); a.things = {}; b.things = {};
    ok(SW.tooBig(w, 'boat') && !SW.tooBig(w, 'raft') && /takes more than hands hold/.test(M.buildPrompt(st, st.minds[a.id], 'routine').split('THINGS THAT CAN BE MADE')[1] || ''), 'a boat takes ten wood, more than hands hold, and its maker is told it is made over time');
    think(st, a, { plan: [{ do: 'make', what: 'boat', ticks: 5 }] }); run(w, em, 3, [a, b]);
    const mi = SW.idx(w, g.x + 3, g.y);
    ok(w.makings && w.makings[mi] && w.makings[mi].kind === 'boat' && w.makings[mi].wood === 6 && !a.things.boat && a.wood === 0 && told(st, a, /It still needs 4 wood/), 'the first six wood lay it down where the maker stands, and it is told four more are needed');
    at(w, b, g.x + 3, g.y); b.wood = 5; think(st, b, { plan: [{ do: 'make', what: 'boat', ticks: 5 }] }); run(w, em, 3, [a, b]);
    ok(b.things.boat === 1 && b.wood === 1 && !w.makings[mi] && w.tally.madeOverTime === 1 && SW.floatOf(w, b) > 0, 'another of them brings the rest to the same spot and the boat is made (it takes only the four still wanted)');
  }
  { /* ---- knowledge held in common ---- */
    const { w, st, ev, em } = fresh(11), L = w.laws, a = w.agents[0], peers = w.agents.filter(o => o.people === a.people && o !== a), b = peers[0], c = peers[1], d = w.agents.find(o => o.people !== a.people), g = patch(w, 8);
    w.creatures = []; w.agents.forEach((o, k) => { still(o); o.leader = null; if ([a, b, c].indexOf(o) < 0) at(w, o, g.x + 30 + k, g.y - 20); }); b.leader = a.id; c.leader = a.id;
    [a, b, c, d].forEach(o => { delete o.knows.masonry; }); at(w, a, g.x, g.y); at(w, b, g.x + 1, g.y + 1); at(w, c, g.x + 2, g.y);
    ok(L.culture.commonAt === 2 && SW.bandMembers(w, a).length === 3 && !SW.heldInCommon(w, a, 'masonry'), 'a band of three, none of whom knows masonry');
    c.wood = 4; c.stone = 4; think(st, c, { plan: [{ do: 'build', what: 'tower', ticks: 5 }] }); run(w, em, 3, [a, b, c]);
    ok(!w.shelters[SW.idx(w, g.x + 2, g.y)] && told(st, c, /you do not know how\. It belongs to the way of masonry, and fewer than 2 of your band hold it/), 'one who does not know the way cannot raise its building, and is told that fewer than two of the band hold it');
    way(a, 'masonry'); think(st, c, { plan: [{ do: 'build', what: 'tower', ticks: 5 }] }); run(w, em, 3, [a, b, c]);
    ok(!w.shelters[SW.idx(w, g.x + 2, g.y)] && !SW.heldInCommon(w, c, 'masonry'), 'with one of the band holding it, still not');
    way(b, 'masonry', a);
    const pr = M.buildPrompt(st, st.minds[c.id], 'deep');
    ok(SW.heldInCommon(w, c, 'masonry') && SW.commonWays(w, c).indexOf('masonry') >= 0 && /WAYS YOUR BAND HOLDS IN COMMON[^\n]*masonry[^\n]*Of these you do not yet know: [^\n]*masonry/.test(pr) && /- tower \([^\n]*your band holds its way, you do not yet/.test(pr), 'when two hold it the way is the band\'s: the third is told so, and is shown the tower among what it may raise');
    at(w, c, g.x + 2, g.y); /* placed again: a body between plans may drift a step */ think(st, c, { plan: [{ do: 'build', what: 'tower', ticks: 5 }] }); run(w, em, 3, [a, b, c]);
    const ti = SW.idx(w, g.x + 2, g.y);
    ok(SW.buildingAt(w, ti) === 'tower' && w.shelters[ti] === c.id, 'and the third, who does not know masonry, raises the tower');
    ok(c.knows.masonry && c.knows.masonry.from === 'tower' && w.tally.commonLearned === 1 && told(st, c, /YOU NOW KNOW THE WAY OF MASONRY/) && st.chron.some(q => /the way of masonry became known to all of/.test(q.text)), 'when it stands, the one who lacked the way has it, and the chronicle says the band learned it');
    ok(!d.knows.masonry, 'one who is not of the band learns nothing by it');
    /* a way only one holds is not spread by a building */
    const { w: w2, st: st2, em: em2 } = fresh(11), p = w2.agents[0], q = w2.agents.filter(o => o.people === p.people && o !== p)[0]; w2.creatures = []; w2.agents.forEach((o, k) => { still(o); o.leader = null; if (o !== p && o !== q) at(w2, o, g.x + 30 + k, g.y - 20); }); q.leader = p.id;
    delete q.knows.masonry; way(p, 'masonry'); at(w2, p, g.x, g.y); at(w2, q, g.x + 1, g.y + 1); p.wood = 4; p.stone = 4;
    think(st2, p, { plan: [{ do: 'build', what: 'tower', ticks: 5 }] }); run(w2, em2, 3, [p, q]);
    ok(SW.buildingAt(w2, SW.idx(w2, g.x, g.y)) === 'tower' && !q.knows.masonry && !w2.tally.commonLearned, 'a building raised by the only one who knows its way teaches no one: it takes two');
  }
  { /* ---- a better building in place of the one it grows out of ---- */
    const { w, st, ev, em } = fresh(11), L = w.laws, B = L.buildings, a = w.agents[0], b = w.agents.filter(o => o.people === a.people && o !== a)[0], s = w.agents.find(o => o.people !== a.people), g = patch(w, 8);
    w.creatures = []; w.agents.forEach((o, k) => { still(o); o.leader = null; if (o !== a && o !== b && o !== s) at(w, o, g.x + 30 + k, g.y - 20); }); b.leader = a.id;
    const lines = Object.keys(B).filter(k => B[k].from).map(k => B[k].from + ' > ' + k);
    ok(B.forge.from === 'workshop' && B.factory.from === 'forge' && B.hall.from === 'shelter' && B.longhall && B.longhall.from === 'hall' && B.temple.from === 'shrine' && lines.length >= 8, 'kinds of building have lines of descent: ' + lines.join(', '));
    ok(B.forge.craft > B.workshop.craft && JSON.stringify(B.forge.fx) === JSON.stringify(B.workshop.fx) && B.factory.craft > B.forge.craft && SW.isOfLine(w, 'factory', 'workshop') && !SW.isOfLine(w, 'workshop', 'forge'), 'the better building gives all the older one gave and more (a forge keeps a workshop\'s learning and makes tools last longer), and serves wherever the older kind is asked for');
    way(a, 'tools'); way(a, 'smelting'); way(b, 'smelting', a); at(w, a, g.x, g.y); at(w, b, g.x + 1, g.y + 1); at(w, s, g.x + 2, g.y + 2); a.wood = 5; a.stone = 2;
    think(st, a, { plan: [{ do: 'build', what: 'workshop', ticks: 5 }] }); run(w, em, 3, [a, b, s]);
    const i = SW.idx(w, g.x, g.y); ok(SW.buildingAt(w, i) === 'workshop', 'a workshop stands');
    const pr = M.buildPrompt(st, st.minds[a.id], 'routine');
    ok(/YOU STAND IN A WORKSHOP of yours\. It can be raised into something better where it stands[^\n]*forge \(build \{what: forge\} here: 2 wood, 7 stone\)/.test(pr), 'standing in it, its holder is told it can become a forge here, and what that takes (half the workshop is used again: 2 wood and 7 stone for 4 and 8)');
    /* seven stone is more than hands hold: it is brought in two loads, and the workshop stands until the forge is done */
    a.wood = 2; a.stone = 6; think(st, a, { plan: [{ do: 'build', what: 'forge', ticks: 5 }] }); run(w, em, 3, [a, b, s]);
    ok(SW.buildingAt(w, i) === 'workshop' && w.works[i] && w.works[i].kind === 'forge' && w.works[i].inPlace === 'workshop' && w.works[i].stone === 6 && told(st, a, /It still needs 0 wood and 1 stone/), 'what takes more than hands hold is brought in loads: after the first, the workshop still stands and serves, and one stone is wanted');
    at(w, b, g.x, g.y); b.stone = 3; b.wood = 0; think(st, b, { plan: [{ do: 'build', what: 'forge', ticks: 5 }] }); run(w, em, 3, [a, b, s]);
    ok(SW.buildingAt(w, i) === 'forge' && w.shelters[i] === a.id && !w.works[i] && b.stone === 2 && w.tally.raisedInPlace === 1 && ev.some(e => e.type === 'built' && e.what === 'forge' && e.replaced === 'workshop'), 'another of the band brings the last stone and the forge stands in the workshop\'s place, held by the workshop\'s holder');
    at(w, b, g.x + 1, g.y + 1);
    /* a hall in place of a plain roof, by one of the band, not by a stranger */
    at(w, a, g.x + 4, g.y); a.wood = 3; think(st, a, { plan: [{ do: 'build', what: 'shelter', ticks: 5 }] }); run(w, em, 3, [a, b, s]);
    const hi = SW.idx(w, g.x + 4, g.y); ok(w.shelters[hi] === a.id && !SW.buildingAt(w, hi), 'a plain roof stands');
    at(w, s, g.x + 4, g.y); s.wood = 6; s.stone = 2; think(st, s, { plan: [{ do: 'build', what: 'hall', ticks: 5 }] }); run(w, em, 3, [a, b, s]);
    ok(!SW.buildingAt(w, hi) && told(st, s, /it is not yours or your band's/), 'a stranger cannot raise a hall in place of another\'s roof');
    at(w, s, g.x + 2, g.y + 2); at(w, b, g.x + 4, g.y); b.wood = 5; b.stone = 2; think(st, b, { plan: [{ do: 'build', what: 'hall', ticks: 5 }] }); run(w, em, 3, [a, b, s]);
    ok(SW.buildingAt(w, hi) === 'hall' && w.shelters[hi] === a.id && b.wood === 0 && b.stone === 0 && w.tally.raisedInPlace === 2 && ev.some(e => e.type === 'built' && e.what === 'hall' && e.replaced === 'shelter'), 'one of the band raises a hall in place of it for 5 wood and 2 stone where a new hall takes 6 and 2; the roof\'s holder holds the hall');
    /* a recipe that asks for the older kind is served by the newer */
    w.bkind[i] = 'forge'; at(w, a, g.x, g.y);
    ok(SW.lacks(w, a, 'musket').every(t => !/forge/.test(t)) && (w.bkind[i] = 'factory') && SW.lacks(w, a, 'musket').every(t => !/forge/.test(t)) && (w.bkind[i] = 'workshop') && SW.lacks(w, a, 'musket').some(t => /in or beside a forge/.test(t)), 'what must be made at a forge can be made at a factory, and not at a workshop');
  }
  { /* ---- the age of a settlement, the maker, and worlds carried on ---- */
    const { w, st, ev, em } = fresh(11), a = w.agents[0], g = patch(w, 8); w.creatures = []; w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, g.x + 30 + k, g.y - 20); });
    [0, 2, 4].forEach(dx => { w.shelters[SW.idx(w, g.x + dx, g.y)] = a.id; }); SW.findSettlements(w, em);
    const s1 = w.settlements.find(q => q.root === SW.rootOf(w, a).id); w.bkind[SW.idx(w, g.x + 2, g.y)] = 'forge'; SW.findSettlements(w, em);
    const s2 = w.settlements.find(q => q.root === SW.rootOf(w, a).id);
    ok(s1 && s1.age === 1 && s2 && s2.age === 2 && s2.id === s1.id, 'a settlement has the age of the latest way among its buildings: one of plain roofs is of the first age, and with a forge of the second');
    const cs = K.stats(st).communities;
    ok(cs && cs.settlementsByAge['age 2'] === 1 && typeof cs.waysLearnedWhenABuildingWasRaised === 'number' && Array.isArray(cs.bands) && K.SEED.some(q => /culture\.commonAt/.test(q)), 'the maker reads settlements by age, what each band holds in common, and what was learned and raised; its notes name the law');
    const r = K.applyOp(w, { op: 'building', name: 'granary', from: 'hall', wood: 6, stone: 4, hint: 'a great store-house' }), r2 = K.applyOp(w, { op: 'building', name: 'oddity', from: 'nosuchkind', wood: 2, stone: 2, hint: 'x' });
    ok(r.ok && w.laws.buildings.granary.from === 'hall' && r2.ok && w.laws.buildings.oddity.from === undefined && SW.isOfLine(w, 'granary', 'hall'), 'the maker can give a new building the kind it grows out of (a line that does not exist is left off)');
    const snap = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-25.json.gz'))).toString()), had = snap.world.laws.buildings.forge.from, old = M.restore(snap); SW.use(old.world);
    ok(had === undefined && old.world.laws.buildings.forge.from === 'workshop' && old.world.laws.buildings.longhall.from === 'hall' && old.world.laws.culture.commonAt === 2 && old.world.laws.build.reuse === 0.5, 'a world saved by the generation before is carried on with the lines of descent and the new laws');
    for (let k = 0; k < 300; k++) { SW.step(old.world, old.emit); M.tick(old); }
    ok(old.world.agents.length > 0 && M.buildPrompt(old, old.minds[old.world.agents[0].id], 'deep').length > 5000 && K.stats(old).communities, 'and runs on');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
