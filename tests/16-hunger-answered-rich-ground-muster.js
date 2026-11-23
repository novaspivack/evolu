/* Generation 22. Hunger that can be answered: an empty body fails slowly and can be fed back; those with food feed their own; the starving go to stores
   and to those who carry food. A body mends in the warm. Rich ground. A call to hunt or gather together. A herd that follows its lead. A gift that answers an offer. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; a.sick = 0; a.hp = 100; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d) => M.apply(st, st.minds[a.id], 'routine', Object.assign({ thought: 'x' }, d), {});
const unveil = w => { const V = w.veil; for (const i in V.t) { w.terrain[i] = V.t[i]; w.fert[i] = V.f[i]; } V.t = {}; V.f = {}; SW.narrowWater(w); };
const fixture = n => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-' + n + '.json.gz'))).toString());
/* a stage: a warm world at noon in spring, nothing falling from the sky, no beasts, a bare lawn 33 wide and 9 deep with no plant within 16 steps, everyone else far away */
const stage = (seed, n) => {
  const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); unveil(w); SW.use(w);
  w.laws.weather.disaster = 0; w.laws.weather.herd = 0; w.laws.weather.pack = 0; w.laws.arrivals.floor = 0; w.creatures = []; w.rich = [];
  const y = Math.round(w.H / 2), x = 100;
  for (let d = -16; d <= 16; d++) for (let dy = -16; dy <= 16; dy++) { const i = SW.idx(w, x + d, y + dy); w.plants[i] = null; if (Math.abs(dy) <= 4) { w.terrain[i] = 2; w.fert[i] = 0.5; w.shelters[i] = 0; w.walls[i] = 0; w.fires[i] = 0; delete w.stores[i]; if (w.lodes) delete w.lodes[i]; } }
  w.agents.forEach(still); w.agents.forEach((o, i) => { o.leader = null; o.parents = []; o.rel = {}; o.stances = {}; o.marks = {}; o.carry = []; o.habits.avoid = []; if (i >= n) at(w, o, (x + 70 + i) % w.W, y); });
  const ev = [], em = e => { ev.push(e); st.emit(e); }, who = w.agents.slice(0, n);
  const run = (k, hold) => { for (let q = 0; q < k; q++) { w.creatures = w.creatures.filter(c => c.keep22); w.weather.kind = 'clear'; w.weather.until = w.tick + 999; w.tick = Math.floor(w.tick / 240) * 240 + 100 + (w.tick % 20); if (hold) hold(); w.agents.forEach(o => { o.thirst = 0; if (who.indexOf(o) < 0) { o.e = 90; } }); SW.step(w, em); } };
  return { w, st, ev, em, x, y, run, who, food: Object.keys(w.laws.plants).find(k => w.laws.plants[k].nutrition > 5 && !(w.laws.plants[k].fx || []).length) };
};

{ // an empty body fails slowly, and can be fed back
  const { w, st, ev, x, y, run, who, food } = stage(7, 1), a = who[0]; at(w, a, x, y); a.e = 0.4;
  run(40, () => { a.e = Math.min(a.e, 0.4); at(w, a, x, y); a.carry = []; });
  ok(!a.dead && w.agents.indexOf(a) >= 0 && a.e === 0 && a.hp < 92 && a.hp > 84 && ev.filter(e => e.type === 'faint').length === 1, 'a body that runs empty does not drop dead: after forty moments it lives, at health ' + a.hp.toFixed(1) + ', and its collapse was marked once');
  ok(/YOUR BODY IS EMPTY/.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'its mind is told its body is empty and what can still save it');
  a.carry = [{ k: food, n: 14 }, { k: food, n: 14 }]; const hp0 = a.hp; run(6, () => { at(w, a, x, y); });
  ok(a.e > 10 && !a.faint && a.hp >= hp0 - 1.5, 'food in its hands brings it back: the body eats by itself and the draining stops (energy ' + a.e.toFixed(0) + ')');
  a.carry = []; a.e = 0.2; let died = -1; for (let k = 0; k < 500 && died < 0; k++) { run(1, () => { a.e = Math.min(a.e, 0.2); a.carry = []; at(w, a, x, y); }); if (w.agents.indexOf(a) < 0 || a.dead) died = k; }
  ok(died > 200 && died < 420 && ev.some(e => e.type === 'death' && e.a === a.id && /starv/.test(e.cause || '')), 'left unfed it dies of hunger, but only after about a day and a quarter (' + died + ' moments)');
  const s2 = stage(7, 1), b = s2.who[0]; at(s2.w, b, s2.x, s2.y); s2.w.laws.body.starveHarm = 100; b.e = 0.1; s2.run(3, () => { b.e = Math.min(b.e, 0.1); });
  ok(s2.w.agents.indexOf(b) < 0 || b.dead, 'the pace is a law (body.starveHarm): set high, hunger kills at once as it used to');
}
{ // those with food feed their own
  const { w, st, ev, x, y, run, who, food } = stage(11, 4), [a, b, c, d] = who; at(w, a, x, y); at(w, b, x + 4, y); at(w, c, x - 5, y + 3); at(w, d, x, y - 4);
  b.parents = [a.id]; a.carry = [{ k: food, n: 14 }, { k: food, n: 14 }, { k: food, n: 14 }]; b.e = 8; c.e = 8; d.e = 90;
  run(8, () => { b.e = Math.min(b.e, 30); at(w, c, x - 5, y + 3); c.e = 8; }); /* the stranger is held where they stand, so they cannot come and beg */
  const su = ev.filter(e => e.type === 'succoured');
  ok(su.length >= 1 && su[0].a === a.id && su[0].b === b.id && b.e > 15 && a.carry.length < 3 && w.tally.succoured >= 1 && b.marks[a.id] && b.marks[a.id].k === 'kindness', 'one who carries food walks to their own child four steps off, who is starving, and feeds them; the child remembers it');
  ok(!su.some(e => e.b === c.id) && c.e <= 8 && a.carry.length >= 1, 'a stranger starving nearby is not fed by reflex under the first law of succour (culture.succour 1): that is left to the mind');
  ok(/saw you starving and put/.test(M.buildPrompt(st, st.minds[b.id], 'routine')), 'the one fed is told who fed them');
  w.laws.culture.succour = 2; a.carry = [{ k: food, n: 14 }, { k: food, n: 14 }]; b.e = 90; c.e = 8; ev.length = 0; run(10);
  ok(ev.some(e => e.type === 'succoured' && e.b === c.id) && c.e > 15, 'under the second (culture.succour 2) anyone who is not an enemy is fed');
  w.laws.culture.succour = 0; a.carry = [{ k: food, n: 14 }]; at(w, a, x, y); at(w, b, x + 2, y); b.e = 8; c.e = 90; ev.length = 0; run(5, () => { b.e = Math.min(b.e, 8); });
  ok(!ev.some(e => e.type === 'succoured') && a.carry.length === 1, 'and with the law set to nothing, no one is fed by reflex');
}
{ // the starving go to one who carries food and beg; they go to a store, any store
  const { w, st, ev, x, y, run, who, food } = stage(13, 3), [a, b, c] = who; at(w, a, x, y); at(w, b, x + 6, y); at(w, c, x, y + 4); c.e = 90;
  a.e = 14; b.carry = [{ k: food, n: 14 }, { k: food, n: 14 }]; b.e = 90;
  run(9, () => { a.e = Math.min(a.e, 14); b.e = 90; });
  const bg = ev.filter(e => e.type === 'begged');
  ok(bg.length === 1 && bg[0].a === a.id && bg[0].b === b.id && w.tally.begged === 1, 'a starving body with empty hands and no food in sight goes to one who carries food, and begs once');
  ok(/begs for food/.test(M.buildPrompt(st, st.minds[b.id], 'routine')), 'the one begged of is told, and told what would save them');
  ok(ev.some(e => e.type === 'succoured' && e.a === b.id && e.b === a.id) && b.carry.length < 2, 'and one who is begged of face to face feeds the beggar, stranger though they are');
  /* a store that is not theirs */
  const s2 = stage(13, 2), [p, q] = s2.who; at(s2.w, p, s2.x, s2.y); at(s2.w, q, s2.x - 12, s2.y + 3); q.e = 90; const si = SW.idx(s2.w, s2.x + 4, s2.y);
  s2.w.stores[si] = { by: q.id, items: [{ k: s2.food, n: 14 }, { k: s2.food, n: 14 }, { k: s2.food, n: 14 }] }; p.e = 20;
  s2.run(4, () => { p.e = Math.min(Math.max(p.e, 13), 20); }); const moved = p.x;
  ok(moved === s2.x && s2.w.stores[si].items.length === 3, 'merely hungry (energy above 12), a body leaves a stranger\'s store alone');
  s2.run(12, () => { if (!p.carry.length) p.e = Math.min(p.e, 10); });
  ok(s2.w.stores[si].items.length < 3 && p.e > 12 && s2.w.tally.storeOut >= 1 && s2.w.tally.storeOutHungry >= 1 && s2.w.stores[si].drawn >= 1, 'at the edge of death it goes to any store in sight and takes from it; what was drawn, and that the hungry drew it, is counted');
  const S = K.stats(s2.st).whatTheStoresHold;
  ok(S.each.length >= 1 && S.each.some(o => o.at[0] === s2.x + 4 && o.keptBy === q.name && o.drawnEver >= 1) && S.foodDrawnFromStoresEver >= 1 && S.ofThatDrawnByTheHungry >= 1, 'the maker sees what each store holds, who keeps it, and how much has been drawn, as it asked: ' + JSON.stringify(S.each[0]));
}
{ // a body mends when half fed, and faster in the warm
  const mend = (e, fire) => { const { w, x, y, run, who } = stage(7, 1), a = who[0]; at(w, a, x, y); a.hp = 40; if (fire) w.fires[SW.idx(w, x + 1, y)] = w.tick + 50000; run(60, () => { a.e = e; a.sheltered = 0; }); return a.hp - 40; };
  const full = mend(80, 0), half = mend(40, 0), low = mend(20, 0), warm = mend(40, 1);
  ok(full > 2.5 && half > full * 0.4 && half < full * 0.62, 'a body mends at full pace when well fed (' + full.toFixed(1) + ' in sixty moments) and at half pace when half fed (' + half.toFixed(1) + '); before, it did not mend at all below energy 50');
  ok(low === 0, 'below a quarter fed it does not mend');
  ok(warm > half * 1.8, 'by a fire it mends twice as fast (' + warm.toFixed(1) + '): the hurt can mend on the snow, if they are warm and fed');
}
{ // rich ground
  const w = SW.createWorld(7), w2 = SW.createWorld(7); SW.use(w);
  const cen = {}; w.agents.forEach(a => { (cen[a.people] = cen[a.people] || []).push(a); });
  const nearAll = Object.keys(cen).every(p => w.rich.some(R => cen[p].some(a => SW.cheb(a.x, a.y, R.x, R.y) <= 12)));
  ok(w.rich.length >= 18 && w.rich.length <= 40 && nearAll && JSON.stringify(w.rich) === JSON.stringify(w2.rich), 'a new world has rich ground: ' + w.rich.length + ' rounds, one within reach of each founding people, the same for the same seed');
  ok(w.rich.every(R => SW.richAt(w, R.x, R.y)) && !SW.richAt(w, (w.rich[0].x + 108) % w.W, 3) && new Set(w.rich.map(R => w.region[SW.idx(w, R.x, R.y)])).size >= 16, 'they lie in nearly every land (' + new Set(w.rich.map(R => w.region[SW.idx(w, R.x, R.y)])).size + ' of ' + w.regions.length + ')');
  /* plants spread faster on it: two bare lawns alike in everything but that one is rich */
  const s = stage(7, 0), W = s.w, y = s.y, xa = s.x - 8, xb = s.x + 8; W.rich = [{ x: xa, y: y, r: 4, name: 'the Test Meadows' }];
  const kind = Object.keys(W.laws.plants).find(k => W.laws.plants[k].nutrition > 4 && !W.laws.plants[k].soil) || s.food;
  for (const cx of [xa, xb]) for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) { const i = SW.idx(W, cx + dx, y + dy); W.terrain[i] = 2; W.fert[i] = 0.6; W.plants[i] = (dx % 3 === 0 && dy % 3 === 0) ? { sp: kind, g: 1, food: 2, age: 10, life: 999999 } : null; }
  const count = cx => { let n = 0; for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) if (W.plants[SW.idx(W, cx + dx, y + dy)]) n++; return n; };
  const n0 = count(xa); s.run(900);
  ok(count(xa) - n0 > (count(xb) - n0) * 1.3 && count(xa) > n0 + 4, 'food plants spread faster on rich ground: from ' + n0 + ' to ' + count(xa) + ' in 900 moments, against ' + count(xb) + ' on a lawn alike in everything else');
  /* a mind is told of it */
  const t = stage(7, 1), a = t.who[0]; at(t.w, a, t.x, t.y); t.w.rich = [{ x: t.x + 9, y: t.y, r: 5, name: 'the Far Meadows' }];
  const pr = M.buildPrompt(t.st, t.st.minds[a.id], 'routine');
  ok(/RICH GROUND: the Far Meadows, its middle at \(109,\d+\), 9 steps E/.test(pr) && /herds gather and breed/.test(pr), 'a being within fifteen steps of rich ground is told where it lies and what it is good for');
  t.w.rich = [{ x: t.x + 40, y: t.y, r: 5, name: 'the Far Meadows' }]; ok(!/RICH GROUND/.test(M.buildPrompt(t.st, t.st.minds[a.id], 'routine')), 'and one far from it is not');
  /* the maker can make it, and sees it */
  t.w.rich = []; const r1 = K.applyOp(t.w, { op: 'event', kind: 'rich', near: a.name, r: 5, name: 'the Gift' }), r2 = K.applyOp(t.w, { op: 'event', kind: 'rich', x: a.x + 8, y: a.y, r: 5 }), r3 = K.applyOp(t.w, { op: 'event', kind: 'rich' });
  ok(r1.ok && t.w.rich.length === 1 && /the Gift/.test(r1.text) && SW.richAt(t.w, a.x + 5, a.y) && r2.ok === false && /within ten steps/.test(r2.why) && r3.ok === false, 'the maker can lay rich ground beside a being (' + r1.text + '), not on top of other rich ground, and not without a place');
  const rs = K.stats(t.st).richGrounds; ok(rs.length === 1 && /the Gift \(\d+,\d+\): \d+ plants bearing, \d+ grazers, \d+ people within 12/.test(rs[0]), 'and reads what stands on each: ' + rs[0]);
  /* more of the grazing herds are on rich ground than their share of the land */
  let on = 0, tot = 0, land = 0, rich = 0; for (const seed of [7, 11, 13]) { const v = SW.createWorld(seed); for (let k = 0; k < 1200; k++) SW.step(v, () => {}); v.creatures.forEach(c => { if (!v.laws.creatures[c.sp].predator && !v.laws.creatures[c.sp].sea) { tot++; if (SW.richAt(v, c.x, c.y)) on++; } }); for (let i = 0; i < v.terrain.length; i++) { const tt = v.terrain[i]; if (tt !== 0 && tt !== 5 && tt !== 4 && tt !== 9) { land++; if (SW.richAt(v, i % v.W, Math.floor(i / v.W))) rich++; } } }
  ok(on / tot > rich / land * 1.1, 'after five days, rich ground is ' + (100 * rich / land).toFixed(0) + '% of the known land and holds ' + (100 * on / tot).toFixed(0) + '% of the grazing animals (three seeds)');
}
{ // a call to hunt or to gather together
  const { w, st, ev, x, y, run, who, food } = stage(11, 5), [a, b, c, d, e] = who; at(w, a, x, y); at(w, b, x + 3, y + 1); at(w, c, x - 3, y); at(w, d, x, y + 3); at(w, e, x + 2, y - 3);
  b.leader = a.id; c.parents = [a.id]; d.parents = [a.id]; /* b follows a; c and d are a's children, c idle and d busy; e is a stranger */
  w.agents.forEach(o => { o.birth = -99999; });
  think(st, d, { plan: [{ do: 'linger', ticks: 200 }] }); run(1);
  const prey = Object.keys(w.laws.creatures).find(k => !w.laws.creatures[k].predator && !w.laws.creatures[k].sea && !w.laws.creatures[k].biomes && (w.laws.creatures[k].tough || 1) <= 1);
  SW.spawn(w, prey, 1); const pc = w.creatures[w.creatures.length - 1]; pc.keep22 = 1; at(w, pc, x + 6, y);
  think(st, a, { plan: [{ do: 'muster', what: 'hunt', ticks: 60 }] }); ev.length = 0; run(1, () => { at(w, pc, x + 6, y); });
  const mu = ev.filter(q => q.type === 'mustered')[0] || { ids: [] };
  ok(mu.what === 'hunt' && mu.ids.indexOf(b.id) >= 0 && mu.ids.indexOf(c.id) >= 0 && mu.ids.indexOf(d.id) < 0 && mu.ids.indexOf(e.id) < 0 && w.tally.musters === 1, 'a call to hunt, planned by a mind, is answered by the caller\'s follower and by an idle child of theirs; not by one who is busy, nor by a stranger');
  ok(b.plan.concat(b.intent ? [b.intent] : []).some(q => q.do === 'hunt' || q.do === 'follow') && a.intent && a.intent.do === 'hunt', 'those who came follow and hunt, and the caller hunts with them');
  ok(/called for others to hunt together, and your body went with them/.test(M.buildPrompt(st, st.minds[b.id], 'routine')) && /and .* came\./.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'those who came are told why their body went; the caller is told who came');
  let killed = false; for (let k = 0; k < 60 && !killed; k++) { run(1); if (pc.dead || w.creatures.indexOf(pc) < 0) killed = true; }
  ok(killed && ev.some(q => q.type === 'hunted'), 'and together they bring the animal down');
  /* gathering, and a call no one hears */
  const s2 = stage(11, 2), [p, q] = s2.who; at(s2.w, p, s2.x, s2.y); at(s2.w, q, s2.x + 2, s2.y); q.leader = p.id; s2.w.agents.forEach(o => { o.birth = -99999; });
  s2.w.plants[SW.idx(s2.w, s2.x + 5, s2.y)] = { sp: s2.food, g: 1, food: 3, age: 10, life: 99999 };
  think(s2.st, p, { plan: [{ do: 'muster', what: 'gather', ticks: 40 }] }); s2.run(1);
  ok(s2.ev.some(o => o.type === 'mustered' && o.what === 'gather' && o.ids[0] === q.id) && q.plan.concat(q.intent ? [q.intent] : []).some(o => o.do === 'harvest') && p.intent.do === 'harvest', 'a call to gather sends them to pick, the caller with them');
  s2.run(14); ok(p.carry.length + q.carry.length >= 2, 'and food is picked');
  const s3 = stage(11, 1), z = s3.who[0]; at(s3.w, z, s3.x, s3.y); think(s3.st, z, { plan: [{ do: 'muster', what: 'hunt', ticks: 10 }] }); s3.run(1);
  ok(s3.ev.some(o => o.type === 'fail' && /none came/.test(o.text)) && /muster \{what: hunt\|gather\}/.test(M.buildPrompt(s3.st, s3.st.minds[z.id], 'routine')), 'one who calls with no one near is told that none came and who answers a call; the act is in the catalogue');
}
{ // a herd follows its lead
  const tame = hf => { const { w, st, x, y, run, who, food } = stage(13, 1), a = who[0]; at(w, a, x, y); w.laws.ecology.tameChance = 50; w.laws.ecology.herdFollow = hf;
    const kind = Object.keys(w.laws.creatures).find(k => !w.laws.creatures[k].predator && !w.laws.creatures[k].sea && !w.laws.creatures[k].biomes && (w.laws.creatures[k].tough || 1) <= 1);
    const herd = []; for (let k = 0; k < 4; k++) { SW.spawn(w, kind, 1); const c = w.creatures[w.creatures.length - 1]; c.keep22 = 1; at(w, c, x + 1 + (k % 2), y + (k > 1 ? 1 : 0)); c.calm = 99; herd.push(c); }
    a.carry = [{ k: food, n: 8 }, { k: food, n: 8 }, { k: food, n: 8 }]; think(st, a, { plan: [{ do: 'tame', ticks: 20 }] });
    for (let k = 0; k < 20 && !herd.some(c => c.owner != null); k++) run(1, () => { herd.forEach((c, i) => { if (c.owner == null) { at(w, c, x + 1 + (i % 2), y + (i > 1 ? 1 : 0)); c.calm = 99; } }); });
    return herd.filter(c => c.owner != null).length; };
  const all = tame(1), one = tame(0);
  ok(all === 4 && one === 1, 'when one of a herd is tamed, its herd-mates within three steps may follow it into keeping (law ecology.herdFollow): all four with the law at 1, one alone with it at 0');
}
{ // a plain gift answers an offer that stands
  const { w, st, ev, x, y, run, who, food } = stage(13, 2), [a, b] = who; at(w, a, x, y); at(w, b, x + 1, y); a.things = { amber: 2 }; b.carry = [{ k: food, n: 8 }, { k: food, n: 8 }]; b.things = {};
  think(st, a, { plan: [{ do: 'trade', name: b.name, what: 'amber', want: 'food', ticks: 10 }] }); run(3, () => { a.e = b.e = 90; });
  ok(/or simply give them one food/.test(M.buildPrompt(st, st.minds[b.id], 'routine')), 'one who is offered a trade is told that simply giving what was asked completes it');
  think(st, a, { plan: [{ do: 'linger', ticks: 100 }] }); run(90, () => { a.e = b.e = 90; at(w, a, x, y); at(w, b, x + 1, y); });
  think(st, b, { plan: [{ do: 'give', name: a.name, what: 'food', ticks: 10 }] }); run(3, () => { a.e = b.e = 90; });
  ok(ev.some(e => e.type === 'traded') && b.things.amber === 1 && a.things.amber === 1 && a.carry.length === 1 && w.tally.trades === 1, 'a plain gift of what was asked, ninety moments later, is a trade done: the amber comes back at once (six such offers went unanswered in the thirteenth run)');
}
{ // the maker's sowing looks farther out; newcomers carry food; raw food; worlds made before
  const { w, st, x, y, who } = stage(7, 1), a = who[0]; at(w, a, x, y);
  for (let d = 11; d <= 15; d++) for (let dy = -3; dy <= 3; dy++) { const i = SW.idx(w, x + d, y + dy); w.terrain[i] = 1; w.fert[i] = 0.6; w.plants[i] = null; } /* sand, eleven steps off; all about the being is grass */
  const sandy = Object.keys(w.laws.plants).find(k => !w.laws.plants[k].biomes && w.laws.plants[k].nutrition > 4); w.laws.plants[sandy].soil = { sand: 1 };
  const r = K.applyOp(w, { op: 'event', kind: 'sow', plant: sandy, n: 8, near: a.name }); let onSand = 0; for (let d = 11; d <= 15; d++) for (let dy = -3; dy <= 3; dy++) if ((w.plants[SW.idx(w, x + d, y + dy)] || {}).sp === sandy) onSand++;
  ok(r.ok && /sown/.test(r.text) && onSand >= 1, 'a sowing beside a being who stands on ground the plant cannot use now looks farther out for ground it can (sand eleven steps away): ' + r.text + ', ' + onSand + ' on the sand');
  const ev2 = []; const n0 = w.agents.length; SW.arrive(w, 3, 0, e => ev2.push(e)); const came = w.agents.slice(n0);
  ok(w.laws.arrivals.food === 5 && came.length === 3 && came.every(o => o.carry.length === 5), 'newcomers arrive carrying five portions of food each (law arrivals.food), as the maker asked');
  ok(w.laws.disease.rawChance === 0.02, 'raw food sickens two times in a hundred, not five');
  let e1 = null, old = null; try { old = M.restore(fixture(21)); for (let i = 0; i < 1200; i++) SW.step(old.world, old.emit); old.world.agents.forEach(o => M.buildPrompt(old, old.minds[o.id], 'deep')); } catch (e) { e1 = e; }
  const ow = old && old.world;
  ok(!e1 && ow && ow.rich && ow.rich.length >= 15 && ow.laws.disease.rawChance === 0.02 && ow.laws.ecology.grazerTarget === 135 && ow.laws.body.starveHarm === 0.3 && ow.laws.body.healWarm === 2 && ow.laws.culture.succour === 1 && ow.agents.length > 0, 'a world saved by Generation 21 loads, gains rich ground (' + (ow && ow.rich ? ow.rich.length : 0) + ' rounds) and the new laws, and runs five days' + (e1 ? ' ' + e1.stack.split('\n').slice(0, 3).join(' | ') : ''));
  let e2 = null, flat = null; try { flat = M.restore(fixture(19)); for (let i = 0; i < 300; i++) SW.step(flat.world, flat.emit); } catch (e) { e2 = e; }
  ok(!e2 && flat && !flat.world.wrap && flat.world.rich && flat.world.rich.length >= 1, 'and so does a flat world made before the globe' + (e2 ? ' ' + e2.message : ''));
  const pr = M.buildPrompt(st, st.minds[a.id], 'deep');
  ok(/MUST be verse/.test(pr) && /" \/ " between the lines/.test(pr) && /rhyming/.test(pr), 'a mind that composes a song or poem is told it must be verse: lines of the same beat that rhyme');
  const H = K.HERITAGE;
  ok(H.ops.length >= 49 && H.lessons.length >= 50 && H.ideas.length >= 27 && H.ops.some(o => o.name === 'rimewort') && H.ops.some(o => o.name === 'snowmallow') && H.ops.some(o => o.key === 'winterGrowth' && o.value === 0.35) && !H.ops.some(o => o.name === 'Steamhollow') && H.ops.some(o => o.op === 'recipe' && o.name === 'roast'), 'the heritage holds what the thirteenth run kept: two winter plants of the snow, a kinder winter, three lessons, seven ideas');
  ok(K.SEED.some(s => /rich ground/.test(s)) && K.SEED.some(s => /muster/.test(s)) && SW.ACTIONS.indexOf('muster') >= 0 && M.digest(st).generation >= 22, 'the maker\'s roadmap names the new things, in Generation 22 and after');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
