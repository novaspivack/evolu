/* Generation 30. A world that begins mostly unknown and is found by going to its edge; the pull of the unknown on the hungry, the crowded and
   the ambitious; fifteen new plants with effects of their own. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const T = SW.T, known = w => { let n = 0; for (let i = 0; i < w.terrain.length; i++) if (w.terrain[i] !== T.VOID) n++; return n; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const edgeOf = (w, a) => { /* the nearest ground a walker can reach from which the unknown is two steps off: a search over land, so the way there exists */
  const land = i => { const t = w.terrain[i]; return t !== T.VOID && t !== T.WATER && t !== T.SHALLOWS; }, seen = {}, q = [[a.x, a.y, 0]]; seen[SW.idx(w, a.x, a.y)] = 1;
  for (let h = 0; h < q.length; h++) { const x = q[h][0], y = q[h][1], d = q[h][2]; let edge = false; for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (Y >= 0 && Y < w.H && X >= 0 && X < w.W && w.terrain[SW.idx(w, X, Y)] === T.VOID) { edge = true; break; } } if (edge && d > 3) return { x, y, d };
    for (const dd of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const X = x + dd[0], Y = y + dd[1]; if (Y < 1 || Y >= w.H - 1 || X < 1 || X >= w.W - 1) continue; const i = SW.idx(w, X, Y); if (seen[i] || !land(i)) continue; seen[i] = 1; q.push([X, Y, d + 1]); } } return null; };

(async () => {
  { /* ---- the land as it is known ---- */
    const plain = SW.createWorld(7), whole = SW.createWorld(7, { seas: 1, flora: 1 }), fog = SW.createWorld(7, { seas: 1, flora: 1, fog: 1 });
    ok(!plain.fog && !plain.flora && JSON.stringify(plain.terrain) === JSON.stringify(SW.createWorld(7).terrain) && !plain.laws.plants.pinenut, 'a world begun without the options is as it always was for its seed, with none of the new plants');
    const kw = known(whole), kf = known(fog);
    ok(fog.fog === 1 && kf < kw * 0.6 && kf > 2500 && fog.agents.every(a => fog.terrain[SW.idx(fog, a.x, a.y)] !== T.VOID), 'a world begun mostly unknown knows ' + kf + ' tiles where the same world knows ' + kw + ' (' + Math.round(100 * kf / kw) + '%), and every founder stands on known land');
    const R = fog.laws.explore.start; SW.use(fog); const far = []; for (let i = 0; i < fog.terrain.length; i++) if (fog.terrain[i] !== T.VOID) { const x = i % fog.W, y = (i - x) / fog.W; let d = 99; fog.agents.forEach(a => { d = Math.min(d, SW.cheb(a.x, a.y, x, y)); }); if (d > R) far.push(i); }
    ok(far.length === 0 && !fog.creatures.some(c => fog.terrain[SW.idx(fog, c.x, c.y)] === T.VOID) && !fog.plants.some((p, i) => p && fog.terrain[i] === T.VOID), 'what is known lies within explore.start (' + R + ') steps of a founder; nothing lives in the unknown');
    ok(Object.keys(fog.veil.t).length > kw - kf - 10 && fog.creatures.length < whole.creatures.length, 'the rest is kept, as the rim always was, to be found (' + Object.keys(fog.veil.t).length + ' tiles; ' + fog.creatures.length + ' animals stand in the known land where ' + whole.creatures.length + ' stood in the whole)');
  }

  { /* ---- going to the edge with a purpose ---- */
    const { w, st, ev, em } = fresh(7, { seas: 1, flora: 1, fog: 1 }), a = w.agents[0]; w.agents.forEach(o => still(o)); w.creatures = [];
    const k0 = known(w); for (let k = 0; k < 120; k++) { w.creatures = []; w.agents.forEach(o => { o.e = 90; o.thirst = 0; o.plan = []; o.intent = null; }); SW.step(w, em); }
    ok(known(w) === k0, 'the fed and idle, at home, bring nothing into the known (120 moments: ' + k0 + ' tiles before and after)');
    const eg = edgeOf(w, a); think(st, a, { plan: [{ do: 'goto', x: eg.x, y: eg.y, ticks: 240 }] });
    let arrived = false; for (let k = 0; k < 200 && !arrived; k++) { w.creatures = []; w.agents.forEach(o => { o.e = 90; o.thirst = 0; if (o !== a) { o.plan = []; o.intent = null; } }); SW.step(w, em); arrived = a.x === eg.x && a.y === eg.y; }
    const k1 = known(w);
    ok(arrived && k1 > k0 + 4 && a.stats.seen > 4 && w.tally.landSeen === a.stats.seen && k1 - k0 >= a.stats.seen, 'one sent to the edge by its mind\'s plan arrives, and what it can see from there (explore.see ' + w.laws.explore.see + ') becomes known: ' + a.stats.seen + ' tiles seen by it (' + (k1 - k0) + ' more known in all, with the caves and ground that came with them)');
    ok(!ev.some(e => e.type === 'opened'), 'that is sight, not a push: no strip was opened and nothing was found in it');
    /* hunger looks too, even with no plan */
    const B = fresh(7, { seas: 1, flora: 1, fog: 1 }), b = B.w.agents[0]; B.w.agents.forEach(o => still(o)); const eb = edgeOf(B.w, b); at(B.w, b, eb.x, eb.y); const kb = known(B.w);
    b.e = 90; B.w.creatures = []; SW.step(B.w, B.em); SW.step(B.w, B.em); const fed = known(B.w); b.e = 30; b.plan = []; b.intent = null; SW.step(B.w, B.em); SW.step(B.w, B.em);
    ok(fed === kb && known(B.w) > kb, 'standing at the edge with no plan, the fed see nothing new and the hungry do (' + kb + ', ' + fed + ', then ' + known(B.w) + ')');
    /* the pull of the unknown */
    const pull = set => { const C = fresh(7, { seas: 1, flora: 1, fog: 1 }), c = C.w.agents[0]; C.w.agents.forEach((o, k) => { still(o); if (o !== c) at(C.w, o, o.x, o.y); }); c.temperament.curious = 0.5; c.temperament.bold = 0.5; c.temperament.greedy = 0.3; c.e = 90; C.st.minds[c.id].aim = null; set(C, c); const d = M.drives(C.st, C.st.minds[c.id], c, SW.look(C.w, c)).filter(q => q.k === 'beyond')[0]; return d || { raw: 0, text: '' }; };
    const base = pull(() => {}), lean = pull((C, c) => { c.e = 35; }), packed = pull((C, c) => { C.w.agents.slice(1, 8).forEach((o, k) => at(C.w, o, c.x + 1 + (k % 3), c.y + 1 + Math.floor(k / 3))); }), aims = pull((C, c) => { C.st.minds[c.id].aim = { text: 'to be the great merchant who trades between far lands' }; });
    ok(base.raw > 0 && /the known world ends \d+ steps to the (north|south|east|west)/.test(base.text), 'in a world mostly unknown the edge pulls even from out of sight, and the mind is told which way it lies: ' + base.text.slice(0, 96));
    ok(lean.raw > base.raw + 0.15 && /Food is thin where you are/.test(lean.text) && packed.raw > base.raw + 0.1 && /Your ground is crowded/.test(packed.text) && aims.raw > base.raw + 0.15 && /what you have set yourself to/.test(aims.text), 'it pulls harder on the hungry (' + lean.raw.toFixed(2) + '), the crowded (' + packed.raw.toFixed(2) + ') and one whose aim is trade or renown (' + aims.raw.toFixed(2) + ') than on another (' + base.raw.toFixed(2) + '), and each is told why');
    const s = K.stats(st).landKnownAndWhatGrows;
    ok(s.worldBeganMostlyUnknown && s.tilesBroughtIntoTheKnownByThoseWhoWentToItsEdge === a.stats.seen && s.tilesStillUnknown > 5000 && K.applyOp(w, { op: 'law', group: 'explore', key: 'see', value: 4 }).ok, 'the maker reads how much is known and how much was found on foot, and can turn explore.see');
    const snap = JSON.parse(JSON.stringify(M.snapshot(st))), back = M.restore(snap); ok(back.world.fog === 1 && known(back.world) === k1 && Object.keys(back.world.veil.t).length === Object.keys(w.veil.t).length, 'a world mostly unknown is saved and loaded as it is');
  }

  { /* ---- what grows ---- */
    const F = SW.FLORA, ks = Object.keys(F), w = SW.createWorld(7, { seas: 1, flora: 1 }), grow = {}; w.plants.forEach(p => { if (p && F[p.sp]) grow[p.sp] = (grow[p.sp] || 0) + 1; });
    ok(ks.length >= 15 && ks.every(k => F[k].soil && F[k].biomes && F[k].form && F[k].nutrition != null), 'fifteen new plants are data, each with its ground, its country and its look: ' + ks.join(', '));
    ok(Object.keys(grow).length >= 12, Object.keys(grow).length + ' of them grow in a world of seed 7 (' + Object.keys(grow).map(k => k + ' ' + grow[k]).join(', ') + ')');
    const bio = k => { const c = {}; w.plants.forEach((p, i) => { if (p && p.sp === k) { const b = w.regions[w.region[i]].biome; c[b] = (c[b] || 0) + 1; } }); return c; };
    const pf = bio('palmfruit'), bc = bio('barrelcactus'), inOwn = (c, own) => { let a = 0, t = 0; for (const k in c) { t += c[k]; if (own.indexOf(k) >= 0) a += c[k]; } return t ? a / t : 1; };
    ok(inOwn(pf, ['rainforest']) > 0.8 && inOwn(bc, ['desert']) > 0.8, 'each keeps to its own country: palm fruit in the rainforest ' + JSON.stringify(pf) + ', barrel cactus in the desert ' + JSON.stringify(bc));
    const eat = (k, set) => { const E = fresh(7, { seas: 1, flora: 1 }), a = E.w.agents[0]; E.w.agents.forEach(o => still(o)); E.w.creatures = []; a.e = 50; a.hp = 60; a.thirst = 50; a.sick = 0; a.habits.avoid = []; if (set) set(a); a.carry = [{ k: k, n: 1, t: E.w.tick }];
      think(E.st, a, { plan: [{ do: 'eat', ticks: 3 }] }); for (let q = 0; q < 2; q++) { E.w.creatures = []; SW.step(E.w, E.em); } return { a, w: E.w, ate: E.ev.some(e => e.type === 'ate' && e.a === a.id), ev: E.ev }; };
    const heal = eat('elderberry'), bad = eat('nightberry'), strong = eat('heartroot'), wet = eat('barrelcactus'), quick = eat('brightcap');
    ok(heal.ate && heal.a.hp > 66 && bad.ate && bad.a.hp < 50 && bad.a.sick > 0, 'eaten by a mind\'s plan: elderberry mends (health 60 to ' + Math.round(heal.a.hp) + '), nightberry harms and sickens (60 to ' + Math.round(bad.a.hp) + ', sick)');
    const boonOf = (r, k) => (r.a.boons || []).some(b => b.on === k || b.k === k) || JSON.stringify(r.a.boons || r.a.boon || {}).indexOf(k) >= 0;
    ok(strong.ate && boonOf(strong, 'strength') && quick.ate && boonOf(quick, 'learning') && wet.ate && wet.a.thirst < 30, 'heartroot lends strength and brightcap quickness of mind for a while; barrel cactus slakes thirst (50 to ' + Math.round(wet.a.thirst) + ')');
    ok(/Fifteen new plants grow/.test(K.SEED) && K.stats(M.createState(w)).landKnownAndWhatGrows.plantsOfTheNewKindsGrowing.pinenut > 0, 'the maker is told of them and can count them');
  }

  { /* ---- a world saved by Generation 29 ---- */
    const old = M.restore(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-29.json.gz'))))), w = old.world; SW.use(w); const k0 = known(w);
    for (let k = 0; k < 300; k++) { SW.step(w, old.emit); M.tick(old); }
    ok(!w.fog && !w.flora && w.laws.explore.see === 3 && known(w) === k0 && w.agents.length > 0 && M.digest(old).generation >= 30 && M.buildPrompt(old, old.minds[w.agents[0].id], 'deep').length > 5000, 'a world saved by Generation 29 keeps the land it knew and its own plants, is given the new laws, and runs on');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
