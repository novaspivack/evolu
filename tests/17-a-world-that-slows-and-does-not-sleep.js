/* Generation 23. When Claude asks for a slower pace, nothing is switched off: fewer thoughts at a time, fewer a minute, a pause that grows, and the clock
   of the world slows to wait. At the worst, only the beings in view go on thinking. The maker and the chronicler try again within minutes.
   In the fourteenth run five refusals in two minutes put every mind to sleep, and the world ran eighteen days on reflexes before anyone saw. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); st.on = true; return { w, st }; };
const refuse = reason => { const e = new Error('sampling too often'); e.code = 'rate_limited'; if (reason) e.reason = reason; return e; };
const reply = JSON.stringify({ thought: 'I will stay by the water.', feeling: 'calm', plan: [{ do: 'linger', ticks: 30 }] });

(async () => {
  { // a refused thought eases the pace and never sleeps the minds
    const { w, st } = fresh(7); let calls = 0; st.sample = async () => { calls++; throw refuse(); };
    const m = st.minds[w.agents[0].id];
    for (let k = 0; k < 12; k++) await M.think(st, m, 'routine');
    const e = M.eased(st);
    ok(st.on === true && calls === 12, 'twelve thoughts refused one after another, and the minds are still awake (five used to put them all to sleep)');
    ok(e.par === 1 && e.rate === M.PACE_FLOOR && st.hold > Date.now() && st.settings.parallel === 4 && st.settings.perMinute === 40, 'the pace has eased to one thought at a time and ' + M.PACE_FLOOR + ' a minute, with a pause before the next; the settings Nova chose are untouched');
    ok(m.urge >= 1 && !m.busy && st.inflight === 0, 'the being whose thought was refused is first in line to think again');
    ok(/Nothing has been switched off|carry on/.test(st.notice || ''), 'the notice says what is happening and that nothing is switched off: ' + (st.notice || '').slice(0, 80));
  }
  { // step by step: each refusal takes one from the number at once and three tenths from the pace
    const { st } = fresh(7); const t0 = 1e12; st.inView = () => true;
    M.ease(st, t0); const a = [st.par, st.rate, st.hold - t0];
    M.ease(st, t0 + 1000); const b = [st.par, st.rate, st.hold - t0 - 1000];
    ok(a[0] === 3 && a[1] === 28 && a[2] === 10000 && b[0] === 2 && b[1] === 19.6 && b[2] === 20000 && !st.narrow, 'first refusal: 3 at a time, 28 a minute, a pause of ten seconds; second: 2 at a time, 19.6 a minute, twenty seconds');
    for (let k = 0; k < 6; k++) M.ease(st, t0 + 2000 + k * 1000);
    ok(st.par === 1 && st.rate === M.PACE_FLOOR && st.hold - (t0 + 7000) <= 120000 && st.narrow === true, 'refused even at one at a time and the slowest pace, the minds narrow to those in view; the pause never grows past two minutes');
    /* recovery */
    const t1 = t0 + 7000; M.recover(st, t1 + 60000); const still = [st.par, st.rate, st.narrow];
    M.recover(st, t1 + 121000); const up1 = [st.par, st.rate, st.narrow];
    ok(still[0] === 1 && still[1] === M.PACE_FLOOR && still[2] === true && up1[0] === 2 && up1[1] === 7.5 && up1[2] === true, 'a quiet minute changes nothing; after two, one more at a time and a quarter faster');
    let t = t1 + 121000, steps = 0; while ((st.rate || st.par || st.narrow) && steps < 40) { t += 121000; M.recover(st, t); steps++; if (st.rate >= 20 && st.narrow) break; }
    ok(!st.narrow && !st.rate && !st.par && steps <= 12, 'left alone it climbs back by itself: everyone thinks again once the pace is back to half, and after ' + steps + ' more quiet spells it is whole (' + Math.round(steps * 2) + ' minutes)');
    M.ease(st, t + 5000); M.recover(st, t + 60000); ok(st.par === 3 && st.rate === 28, 'and a new refusal eases it again from the top');
  }
  { // while narrowed, only those in view are given thoughts, and the clock waits only for them
    const { w, st } = fresh(11); const seen = w.agents[0], unseen = w.agents.slice(1); st.inView = a => a === seen; const asked = [];
    st.sample = async p => { asked.push(p); return { text: reply }; };
    w.agents.forEach(a => { const m = st.minds[a.id]; m.urge = 3; m.lastT = w.tick - 500; });
    st.narrow = true; st.rate = M.PACE_FLOOR; st.par = 1; st.easeT = Date.now(); st.lastStart = 0;
    const pc = M.pace(st);
    M.pump(st); await new Promise(r => setTimeout(r, 30)); st.lastStart = 0; M.pump(st); await new Promise(r => setTimeout(r, 30));
    const thought = w.agents.filter(a => st.minds[a.id].urge < 3).map(a => a.name);
    ok(thought.length === 1 && thought[0] === seen.name && unseen.every(a => st.minds[a.id].urge === 3), 'narrowed, the one being in view is given a thought and the fourteen out of view are not, however much they want one');
    st.minds[seen.id].lastT = w.tick; const p2 = M.pace(st); st.narrow = false; const p3 = M.pace(st);
    ok(pc < 0.5 && p2 === 1 && p3 < 0.5, 'and the clock waits for the one in view, not for those who are asleep (pace ' + pc + ' while it is late, ' + p2 + ' once it has thought; ' + p3 + ' when all are counted again)');
    st.lastStart = 0; st.hold = 0; M.pump(st); await new Promise(r => setTimeout(r, 30));
    ok(unseen.some(a => st.minds[a.id].urge < 3), 'widened again, those out of view think');
    /* the pace itself is kept: no second thought within the gap the eased pace allows */
    const n0 = asked.length; st.rate = 6; st.lastStart = Date.now(); M.pump(st); M.pump(st); await new Promise(r => setTimeout(r, 30));
    ok(asked.length === n0, 'at six a minute no thought starts within ten seconds of the last');
    st.hold = Date.now() + 5000; st.lastStart = 0; M.pump(st); await new Promise(r => setTimeout(r, 30)); ok(asked.length === n0, 'and none starts during the pause after a refusal');
  }
  { // a real limit on the account still stops the minds, and says so; a passing fault upstream pauses and tries again
    const { w, st } = fresh(7); st.sample = async () => { throw refuse('usage_limit'); }; await M.think(st, st.minds[w.agents[0].id], 'routine');
    ok(st.on === false && /usage limit/.test(st.notice), 'the usage limit of the account is not a matter of pace: the minds stop and the notice says why');
    const s2 = fresh(7); s2.st.sample = async () => { const e = new Error('boom'); e.code = 'upstream_error'; throw e; };
    for (let k = 0; k < 4; k++) await M.think(s2.st, s2.st.minds[s2.w.agents[0].id], 'routine');
    ok(s2.st.on === true && s2.st.hold > Date.now() + 30000 && /pause/.test(s2.st.notice), 'four faults upstream in a row: the minds pause a minute and try again (three used to put them to sleep)');
    for (let k = 0; k < 6; k++) await M.think(s2.st, s2.st.minds[s2.w.agents[0].id], 'routine');
    ok(s2.st.on === false, 'ten in a row and they do sleep: something is truly wrong');
  }
  { // the maker and the chronicler try again soon
    const { w, st } = fresh(7); st.story.chapters.push({ n: 1, title: 'x', text: 'x', day0: 1, day1: 1 }); st.story.lastDay = SW.day(w); st.maker.lastDay = SW.day(w) - st.settings.maker.every;
    let n = 0; st.sample = async () => { n++; throw refuse(); };
    const day0 = st.maker.lastDay; await K.make(st);
    ok(n === 1 && st.maker.lastDay === day0 && st.maker.retryAt > Date.now() + 50000 && st.maker.retryAt < Date.now() + 70000 && /try again in 1 min/.test(K.error), 'a refused visit of the maker is not put off four days: it tries again in a minute (' + K.error + ')');
    ok(M.eased(st).par === 3 && st.on, 'and its refusal eases the pace of the minds, to make room');
    K.tick(st); await new Promise(r => setTimeout(r, 20)); ok(n === 1, 'it does not try before its minute is up, nor during the pause');
    st.maker.retryAt = 0; st.hold = 0; K.tick(st); await new Promise(r => setTimeout(r, 30)); ok(n === 2 && st.maker.fails === 2 && /2 min/.test(K.error), 'then it tries, and after a second refusal waits two minutes');
    for (let k = 0; k < 4; k++) { st.maker.retryAt = 0; st.hold = 0; await K.make(st); }
    ok(st.maker.fails === 0 && st.maker.lastDay === SW.day(w) - st.settings.maker.every + 1 && /tomorrow/.test(K.error), 'after five refusals in a row it leaves it until tomorrow, not until the next visit is due');
    const good = JSON.stringify({ seen: 'All is well.', predict: 'Nothing changes.', changes: [], review: [] }); st.sample = async () => ({ text: good }); st.maker.lastDay = SW.day(w) - 9; st.hold = 0;
    await K.make(st); ok(st.maker.lastDay === SW.day(w) && !K.error && !st.maker.retryAt && st.outerBusy === false, 'a visit that gets through clears the fault');
    /* the chronicler */
    st.sample = async () => { throw refuse(); }; const sd = st.story.lastDay = SW.day(w) - st.settings.story.every; await K.tell(st);
    ok(st.story.lastDay === sd && st.story.retryAt > Date.now() && /The chronicler was refused/.test(K.error), 'the chronicler does the same');
    /* one place is kept for them while they work */
    const s3 = fresh(7); let live = 0, peak = 0; s3.st.sample = async () => { live++; peak = Math.max(peak, live); await new Promise(r => setTimeout(r, 40)); live--; return { text: reply }; };
    s3.w.agents.forEach(a => { s3.st.minds[a.id].urge = 3; }); s3.st.outerBusy = true;
    for (let k = 0; k < 8; k++) { s3.st.lastStart = 0; M.pump(s3.st); } await new Promise(r => setTimeout(r, 120));
    ok(peak === 3, 'while the maker or the chronicler is at work the minds think three at a time, not four');
  }
  { // what the maker asked for after the fourteenth run
    const { w, st } = fresh(7); SW.use(w); const a = w.agents[0], b = w.agents[1];
    w.graves.push({ id: 999, name: 'Xaiel', x: a.x, y: a.y, tick: 3 * 240 + 10, cause: 'starved', hue: 1 });
    const S0 = K.stats(st);
    ok(S0.deathsOfLate.some(t => /^Xaiel, day 4, starved, at \(\d+,\d+\) in /.test(t)), 'the maker reads each death of late with its day, cause and place: ' + S0.deathsOfLate.slice(-1)[0]);
    const food = Object.keys(w.laws.plants).find(k => w.laws.plants[k].nutrition > 5), i = SW.idx(w, a.x, a.y); w.stores[i] = { by: b.id, items: [{ k: food, n: 8 }, { k: food, n: 8 }] }; a.carry = []; a.plan = []; a.intent = null;
    M.apply(st, st.minds[a.id], 'routine', { thought: 'x', plan: [{ do: 'take', ticks: 3 }] }, {}); for (let k = 0; k < 2; k++) SW.step(w, st.emit);
    const so = K.stats(st).whatTheStoresHold.each.filter(o => o.at[0] === i % w.W && o.at[1] === Math.floor(i / w.W))[0] || {};
    ok(so.drawnBy && so.drawnBy[a.name] >= 1, 'and for each store, who has drawn from it and how much: ' + JSON.stringify(so.drawnBy));
    w.rich = []; /* the founding rounds lie close by; this check is of two the maker lays itself */
    const r1 = K.applyOp(w, { op: 'event', kind: 'rich', near: a.name, r: 5, name: 'the First' }); st.maker.lastDay = SW.day(w) - 9;
    st.sample = async () => ({ text: JSON.stringify({ seen: 's', predict: 'p', changes: [{ op: 'event', kind: 'rich', near: a.name, r: 5, name: 'the Second' }, { op: 'law', group: 'climate', key: 'belt', value: 0.12 }], review: [] }) });
    const out = await K.make(st);
    ok(r1.ok && out && out.refused.length === 1 && /^your change 1 \(event rich the Second\): rich ground already lies/.test(out.refused[0]) && out.ops.length === 1, 'a refusal names the change it refuses: ' + (out && out.refused[0]));
    const rg = K.stats(st).richGrounds.filter(t => /the First/.test(t))[0] || '';
    ok(/\d+ food plants standing, \d+ of them bearing now/.test(rg), 'rich ground is read by what stands on it and by what bears, so ground picked bare is not taken for ground never made: ' + rg);
    ok(typeof K.stats(st).toolsOfTheirOwnDesignMade === 'string', 'tools of a being\'s own design are counted apart from the things of the recipes');
    /* one who knows rafts and has been stopped by water is reminded what the way is for */
    a.knows.rafts = 1; a.press = { water: 3 }; a.things = {}; const p1 = M.buildPrompt(st, st.minds[a.id], 'routine'); a.things = { raft: 1 }; const p2 = M.buildPrompt(st, st.minds[a.id], 'routine'); a.things = {}; a.knows.rafts = 0; const p3 = M.buildPrompt(st, st.minds[a.id], 'routine');
    ok(/Deep water has stopped you more than once, and you know the way of rafts\. make \{what: raft\}/.test(p1) && !/Deep water has stopped you/.test(p2) && !/Deep water has stopped you/.test(p3), 'a being stopped by water who knows rafts and holds no vessel is told what a raft needs and does; one who holds a raft, or does not know the way, is not');
    ok(K.HERITAGE.ops.some(o => o.group === 'mate' && o.key === 'minEnergy' && o.value === 64) && K.HERITAGE.lessons.length >= 54 && K.HERITAGE.ideas.length >= 34 && K.SEED.some(s => /never puts the minds to sleep/.test(s)) && M.digest(st).generation >= 23, 'the heritage and the roadmap hold what the fourteenth run kept, in Generation 23 and after');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
