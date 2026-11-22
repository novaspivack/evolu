/* The unknown opens slowly: once a strip has opened anywhere the mist lies thick for a day; strips are narrower and open less often.
   The minds ease off when Claude asks for fewer calls at once, and do not fall asleep. Settings carry across. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const think = (st, a, kind, d) => M.apply(st, st.minds[a.id], kind, Object.assign({ thought: 'x' }, d), {});
const edge = (w, side) => { const V = w.veil; if (side === 'W') { for (let y = 30; y < w.H - 30; y++) { const i = y * w.W + 20; if (V.t[i - 1] != null && [0, 5, 9].indexOf(w.terrain[i]) < 0) return i; } } else { for (let y = 30; y < w.H - 30; y++) { const i = y * w.W + (w.W - 21); if (V.t[i + 1] != null && [0, 5, 9].indexOf(w.terrain[i]) < 0) return i; } } };
const at = (w, o, i) => { o.x = i % w.W; o.y = Math.floor(i / w.W); o.px = o.x; o.py = o.y; };
{ // one strip, then the mist lies thick
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people !== a.people), L = w.laws.explore;
  ok(L.chance === 0.35 && L.depth === 6 && L.restDays === 8 && L.gapDays === 1 && L.pushes === 3, 'the unknown opens less readily: a chance of 0.35, strips six deep, eight days of rest, and a day between any two openings');
  L.chance = 1; at(w, a, edge(w, 'W')); still(a); const veil0 = Object.keys(w.veil.t).length; think(st, a, 'routine', { plan: [{ do: 'venture', ticks: 2 }] }); for (let k = 0; k < 2; k++) { w.creatures = []; SW.step(w, em); }
  const op = ev.find(e => e.type === 'opened'), n1 = veil0 - Object.keys(w.veil.t).length; ok(op && n1 > 100 && n1 <= 9 * 41 && w.lastStrip != null, 'a mind that plans to venture opens a strip: ' + n1 + ' tiles, where Generation 18 opened about 450');
  at(w, b, edge(w, 'E')); still(b); ev.length = 0; const R = SW.rootOf(w, b); think(st, b, 'routine', { plan: [{ do: 'venture', ticks: 2 }] }); for (let k = 0; k < 2; k++) { w.creatures = []; SW.step(w, em); }
  ok(!ev.some(e => e.type === 'opened') && ev.some(e => e.type === 'fail' && /mist lay too thick to enter today/.test(e.text)) && !(R.ex && R.ex.n) && veil0 - Object.keys(w.veil.t).length === n1, 'the same day, on the far side of the world, the mist will not part for another, and that try is not spent');
  for (let k = 0; k < 245; k++) { w.creatures = []; [a, b].forEach(o => { o.e = 90; o.thirst = 0; }); SW.step(w, () => {}); } at(w, b, edge(w, 'E')); still(b); ev.length = 0; think(st, b, 'routine', { plan: [{ do: 'venture', ticks: 2 }] }); for (let k = 0; k < 2; k++) { w.creatures = []; SW.step(w, em); }
  ok(ev.some(e => e.type === 'opened'), 'a day later it parts again');
  const c = w.agents.find(o => o !== a && o !== b); at(w, c, edge(w, 'W')); still(c); ok(SW.edgeNear(w, c) && /opens seldom, never twice in one day anywhere/.test(M.buildPrompt(st, st.minds[c.id], 'routine')), 'and one who stands at the edge is told so');
}
{ // a world carried on from Generation 18 takes the slower laws, unless its maker had changed them
  const snap = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-18.json.gz'))).toString());
  ok(snap.world.laws.explore.chance === 0.5 && snap.world.laws.explore.depth === 10, 'a world saved by Generation 18 holds the old laws of exploring');
  const s2 = JSON.parse(JSON.stringify(snap)); s2.world.laws.explore.restDays = 3; const st = M.restore(s2), E = st.world.laws.explore;
  ok(E.chance === 0.35 && E.depth === 6 && E.gapDays === 1 && E.restDays === 3, 'carried on, it takes the slower ones, and keeps what its maker had set itself');
  for (let i = 0; i < 200; i++) SW.step(st.world, st.emit); ok(st.world.tick === snap.world.tick + 200, 'and it runs');
  s2.settings = Object.assign({}, snap.settings, { v: 11, perMinute: 40, parallel: 6, budget: 7000 }); const st3 = M.restore(JSON.parse(JSON.stringify(s2)));
  ok(st3.settings.v === 12 && st3.settings.parallel === 4 && st3.settings.perMinute === 40 && st3.settings.budget === 7000, 'settings saved by Generation 18 are kept, and six at once becomes four');
  s2.settings.parallel = 3; ok(M.restore(JSON.parse(JSON.stringify(s2))).settings.parallel === 3, 'a number the owner chose is left alone');
}
(async () => { // easing off
  const { w, st } = fresh(7); let calls = 0, refuse = 2; st.settings.perMinute = 6000; st.on = true;
  st.sample = async function () { calls++; if (refuse > 0) { refuse--; const e = new Error('too many sample calls at once from this page'); e.code = 'rate_limited'; throw e; } return { text: JSON.stringify({ thought: 'I am here.', plan: [{ do: 'rest', ticks: 20 }] }) }; };
  const m = st.minds[w.agents[0].id]; await M.think(st, m, 'routine');
  ok(st.on === true && st.par === 3 && st.hold > Date.now() && /fewer thoughts at once\. The minds carry on, 3 at a time/.test(st.notice) && m.urge === 2 && st.inflight === 0, 'when Claude asks for fewer calls at once the minds stay awake, think three at a time, wait a little, and the one refused will ask again');
  const before = calls; M.pump(st); ok(calls === before, 'while waiting, no new thought is begun');
  st.hold = 0; await M.think(st, m, 'routine'); ok(st.par === 2 && st.on, 'a second refusal eases off again');
  st.hold = 0; await M.think(st, m, 'routine'); ok(m.thoughts >= 1 && st.on && m.urge === 0, 'and then thinking carries on');
  refuse = 9; for (let k = 0; k < 3; k++) { st.hold = 0; await M.think(st, m, 'routine'); } ok(st.on === false && /five times in two minutes/.test(st.notice), 'only if it is refused five times in two minutes do the minds sleep');
  { /* the world waits for its minds */
    const q = fresh(11), w2 = q.w, s2 = q.st; s2.on = true; s2.sample = async function () { return { text: '{}' }; }; const ms = w2.agents.map(o => s2.minds[o.id]);
    ok(M.pace(s2) === 1 && ms.every(m => m.lastT === w2.tick), 'at the start no one is overdue and the clock runs free');
    w2.tick += 100; ok(M.pace(s2) === 0.1, 'when every being is overdue for a thought the clock slows to a tenth');
    ms.forEach((m, k) => { if (k % 3) m.lastT = w2.tick; }); const third = M.pace(s2); ok(third > 0.3 && third < 0.6, 'with a third of them overdue it runs at ' + third + ' of its speed');
    ms.forEach((m, k) => { m.lastT = k ? w2.tick : w2.tick - 500; }); ok(M.pace(s2) === 1, 'one being behind does not hold the world back');
    ms.forEach(m => { m.lastT = w2.tick - 500; m.busy = true; }); ok(M.pace(s2) === 1, 'beings who are thinking now are not counted as waiting'); ms.forEach(m => { m.busy = false; });
    s2.settings.wait = false; ok(M.pace(s2) === 1, 'the owner can keep the clock steady'); s2.settings.wait = true; s2.on = false; ok(M.pace(s2) === 1, 'and with the minds asleep the world runs on its reflexes at full speed');
    const d0 = M.defaultSettings(); ok(d0.wait === true && d0.thinkEvery === 90, 'by default the world waits, so that each being thinks about every 90 moments');
    s2.on = true; s2.par = 2; s2.easeT = Date.now() - 200000; s2.hold = 0; s2.lastStart = Date.now(); M.pump(s2); ok(s2.par === 3, 'after three quiet minutes the minds try one more at a time again');
  }
  const e2 = new Error('limit'); e2.code = 'rate_limited'; e2.reason = 'usage_limit'; st.on = true; st.notice = ''; st.sample = async function () { throw e2; }; await M.think(st, m, 'routine'); ok(st.on === false && /usage limit/.test(st.notice), 'a usage limit still puts them to sleep at once');
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
