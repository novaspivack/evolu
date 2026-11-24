/* Generation 34. The many: people beyond those who think, as households under laws of the same kind as bodies; groups of them that think once a
   day and speak as "we"; persons who speak to them, give to them, are backed and opposed by them; one of the many rising to be a person. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, age, opts) => { const w = SW.createWorld(seed, Object.assign({ seas: 1, flora: 1, fog: 1, many: 1 }, opts || {})), st = M.createState(w); K.inherit(st, null); SW.use(w); if (age > 1) { SW.beginAt(w, age); M.backfill(st, age); } const ev = [], e0 = st.emit; st.emit = e => { ev.push(e); e0(e); }; return { w, st, ev, em: st.emit }; }; /* every event, whoever sends it, is kept */
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const day = (w, em, n) => { for (let k = 0; k < (n || 1); k++) SW.manyDay(w, em); };
const groupOf = (w, cls, sid) => w.groups.filter(g => !g.gone && g.cls === cls && (sid == null || g.sid === sid))[0];

(async () => {
  { /* ---- a world without the option is as it was; a world with it is peopled when begun old ---- */
    const p = SW.createWorld(7), q = SW.createWorld(7, { seas: 1, flora: 1, fog: 1 }); ok(!p.many && !p.laws.many && !q.many && !q.laws.many, 'a world begun without the option has no many and no laws of the many');
    const f1 = fresh(7, 1); ok(f1.w.many && f1.w.laws.many.persons === 40 && SW.manyTotal(f1.w) === 0, 'a world begun young with the option has the laws and, as yet, no households: every one of its ' + f1.w.agents.length + ' people is a person');
    const f2 = fresh(7, 2), f5 = fresh(7, 5), n2 = SW.manyTotal(f2.w), n5 = SW.manyTotal(f5.w);
    ok(n2 > 60 && n5 > n2 * 4 && f5.w.agents.length <= 16, 'a world begun in the second age has ' + n2 + ' of the many in its houses; one begun in the fifth has ' + n5 + ' in its tenements, beside ' + f5.w.agents.length + ' persons');
    const B = (f, S) => SW.manyBrief(f.w, S), S5 = f5.w.settlements[0], b5 = B(f5, S5); ok(b5.people > 150 && b5.people <= b5.rooms && b5.households >= 20, 'in ' + S5.name + ' ' + b5.people + ' people live in ' + b5.households + ' households under roofs that have room for ' + b5.rooms);
    const a = SW.createWorld(7, { seas: 1, flora: 1, fog: 1, many: 1 }), b = SW.createWorld(7, { seas: 1, flora: 1, fog: 1, many: 1 }); SW.beginAt(a, 4); SW.beginAt(b, 4); ok(JSON.stringify(a.many.hh) === JSON.stringify(b.many.hh) && a.rng === b.rng, 'the same seed peoples the same houses with the same numbers');
  }

  { /* ---- the day of the many: land, work, eating, birth and death ---- */
    const f = fresh(7, 5), w = f.w, S = w.settlements[0]; w.laws.weather.disaster = 0; const n0 = SW.manyTotal(w);
    day(w, f.em, 1); const P = w.many.places[S.id], onLand = w.many.hh.filter(h => h.sid === S.id && h.work === 'land').reduce((s, h) => s + h.n, 0), all = w.many.hh.filter(h => h.sid === S.id).reduce((s, h) => s + h.n, 0);
    ok(P && P.made > 0 && P.need === P.need && onLand > 0 && onLand < all * 0.5, 'in the fifth age ' + onLand + ' of ' + all + ' in ' + S.name + ' work the land and feed the rest, who work at its works (the land gave ' + P.made + ' days of bread for ' + P.need + ' people)');
    const f2 = fresh(7, 2), w2 = f2.w, S2 = w2.settlements[0]; day(w2, f2.em, 1); const l2 = w2.many.hh.filter(h => h.sid === S2.id && h.work === 'land').reduce((s, h) => s + h.n, 0), a2 = w2.many.hh.filter(h => h.sid === S2.id).reduce((s, h) => s + h.n, 0);
    ok(l2 / a2 > onLand / all + 0.2, 'in the second age far more of them must work the land (' + l2 + ' of ' + a2 + '): the tools of an age decide how many one pair of hands can feed');
    for (let d = 0; d < 24; d++) { w.tick += w.laws.time.dayLength; day(w, f.em, 1); } const n1 = SW.manyTotal(w), T = w.tally;
    ok(n1 > n0 && T.manyBorn > T.manyDied && T.manyDied > 0 && !(T.manyStarved > n0 * 0.02), 'over two years of the world, fed and housed, the many grow from ' + n0 + ' to ' + n1 + ' (' + T.manyBorn + ' born, ' + T.manyDied + ' died, ' + (T.manyStarved || 0) + ' of hunger)');
    ok(T.tithed > 0 && Object.keys(w.stores).some(i => w.stores[i] && w.stores[i].items.some(q => q.k === 'grain')), 'a little of what they have over goes into the stores, where persons eat (' + T.tithed + ' of grain)');
    /* hunger: the land is taken away */
    const g = fresh(7, 4), wg = g.w, Sg = wg.settlements[0]; wg.laws.many.landYield = 0.01; const m0 = wg.many.hh.filter(h => h.sid === Sg.id).reduce((s, h) => s + h.n, 0); for (let d = 0; d < 14; d++) { wg.tick += wg.laws.time.dayLength; day(wg, g.em, 1); }
    const m1 = wg.many.hh.filter(h => h.sid === Sg.id).reduce((s, h) => s + h.n, 0), hunger = g.ev.filter(e => e.type === 'manyhunger').length, left = g.ev.filter(e => e.type === 'manyleft').length;
    ok(hunger >= 1 && wg.tally.manyStarved > 0 && left >= 1 && m1 < m0 * 0.8, 'where the land gives almost nothing, hunger comes (' + hunger + ' times told), some starve (' + wg.tally.manyStarved + '), some leave (' + left + ' households), and the place shrinks from ' + m0 + ' to ' + m1);
    ok(g.st.chron.some(c => c.kind === 'manyhunger') && wg.agents.some(a => told(g.st, a, /ARE GOING HUNGRY/)), 'the hunger is chronicled and the persons of the place are told of it');
  }

  { /* ---- the many raise dwellings and carry their streets on when they outgrow their roofs ---- */
    const f = fresh(7, 3), w = f.w, S = w.settlements[0]; w.laws.many.birth = 0.2; const homes0 = Object.keys(w.bkind).filter(i => w.bkind[i] === 'townhouse' && w.shelters[i] > 0).length, roads0 = Object.keys(w.roads).length;
    for (let d = 0; d < 20; d++) { w.tick += w.laws.time.dayLength; day(w, f.em, 1); SW.findSettlements(w, () => {}); }
    const homes1 = Object.keys(w.bkind).filter(i => w.bkind[i] === 'townhouse' && w.shelters[i] > 0).length, built = f.ev.filter(e => e.type === 'manybuilt'), onRoad = built.filter(e => w.roads[SW.idx(w, e.x, e.y)]).length, lone = built.filter(e => { let by = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = SW.idx(w, SW.wrapX(w, e.x + dx), e.y + dy); if ((dx || dy) && w.roads[j] && w.roads[j] !== 3) by = true; } return !by; }).length;
    ok(built.length >= 8 && homes1 >= homes0 + 8 && onRoad === 0 && lone === 0 && built.every(e => SW.agentById ? true : true), 'growing fast, the many raise ' + built.length + ' town houses of their age in twenty days, each beside a street and none on one');
    ok(Object.keys(w.roads).length >= roads0 && built.every(e => w.shelters[SW.idx(w, e.x, e.y)] === e.owner && w.agents.some(a => a.id === e.owner)), 'each stands in the name of a living person of the place' + (Object.keys(w.roads).length > roads0 ? ', and the streets were carried on by ' + (Object.keys(w.roads).length - roads0) + ' tiles' : ''));
  }

  { /* ---- groups: who they are, and what a group can do ---- */
    const f = fresh(7, 5), w = f.w, st = f.st, S = w.settlements[0]; day(w, f.em, 1); const gs = SW.groupsOf(w, S), land = groupOf(w, 'land', S.id), makers = groupOf(w, 'makers', S.id);
    ok(gs.length >= 3 && land && makers && /^the Farmers of /.test(land.name) && /^the Hands of /.test(makers.name) && gs.every(g => g.n >= w.laws.many.groupAt), S.name + ' has ' + gs.length + ' groups: ' + gs.map(g => g.name + ' (' + g.n + ')').join(', '));
    ok(f.ev.filter(e => e.type === 'groupformed').length >= gs.length && st.chron.some(c => c.kind === 'groupformed'), 'each is told of and chronicled when it comes to be');
    const a = w.agents.filter(o => SW.cheb(o.x, o.y, S.x, S.y) <= S.r + 4)[0], s0 = (a.stat = null, SW.status(w, a));
    /* a group thinks: the reply is taken up through the same door as a real one */
    const pr = M.groupPrompt(st, land); ok(/^You are not one person\. You are the Farmers of /.test(pr) && /speaking with one voice/.test(pr) && /HOW YOU FARE/.test(pr) && pr.indexOf(a.name) > 0 && /"do": null or "work" or "withhold" or "give" or "leave"/.test(pr) && pr.length < 5000, 'a group is told what it is, how it fares, who of the named live among it and what it can do, in ' + pr.length + ' characters');
    M.groupApply(st, land, { thought: 'We feed this place.', feeling: 'proud', say: { to: a.name, text: 'We who work the land ask a fair share of the stores.' }, stance: { [a.name]: 'back' }, note: 'asked ' + a.name + ' for a share' }, {});
    a.stat = null; const s1 = SW.status(w, a);
    ok(land.stance[a.id] === 1 && Math.abs(s1 - s0 - w.laws.many.backing * land.n) < 0.02 && told(st, a, /BACK YOU/), 'backed by ' + land.name + ', ' + a.name + ' is told so and stands higher by their numbers (' + s0 + ' to ' + s1 + ')');
    ok(told(st, a, /say TO YOU: "We who work the land ask a fair share/) && st.voices.some(v => v.g === land.id) && land.mind.journal.length === 1 && land.mind.last && land.mind.thoughts === 1, 'what the group says to a person is told to that person, is kept among the voices, and the group keeps its note');
    M.groupApply(st, land, { thought: 'They did not answer.', stance: { [a.name]: 'oppose' }, do: 'withhold' }, {}); a.stat = null; const s2 = SW.status(w, a);
    ok(land.stance[a.id] === -1 && s2 < s0 && land.withhold && told(st, a, /OPPOSE YOU/) && told(st, a, /HAVE LAID DOWN THEIR WORK/), 'opposed, ' + a.name + ' stands lower than before (' + s2 + '); and the work laid down is told to the persons of the place');
    /* the land group withholding: the rest go hungry */
    for (let d = 0; d < 9; d++) { w.tick += w.laws.time.dayLength; day(w, f.em, 1); } const hungry = SW.manyBrief(w, S).hungry, share = g => { const hh = w.many.hh.filter(h => h.g === g.id); return hh.filter(h => h.hungry > 0).reduce((s, h) => s + h.n, 0) / Math.max(1, hh.reduce((s, h) => s + h.n, 0)); }, others = SW.groupsOf(w, S).filter(g => g !== land), worst = Math.max.apply(null, others.map(share));
    ok(hungry > 30 && worst > 0.3 && share(land) < worst * 0.5, 'while those of the land keep what they grow, ' + hungry + ' of the place go hungry: ' + Math.round(worst * 100) + ' in a hundred of the hardest hit group, ' + Math.round(share(land) * 100) + ' of those on the land');
    M.groupApply(st, land, { thought: 'Enough.', do: 'work' }, {}); for (let d = 0; d < 6; d++) { w.tick += w.laws.time.dayLength; day(w, f.em, 1); }
    ok(!land.withhold && SW.manyBrief(w, S).hungry < hungry * 0.5 && f.ev.some(e => e.type === 'resumed'), 'when they take up their work again the hunger passes (' + SW.manyBrief(w, S).hungry + ' hungry)');
    /* a works group withholding: its works stand idle */
    const mk = groupOf(w, 'makers', S.id); M.groupApply(st, mk, { thought: 'No more.', do: 'withhold' }, {}); const idle = Object.keys(w.idle || {}).length, at = +Object.keys(w.idle)[0];
    ok(mk.withhold && idle >= 1 && SW.manyClass(w.bkind[at]) === 'makers', 'when ' + mk.name + ' lay down their work, ' + idle + ' works of their kind stand idle');
    M.groupApply(st, mk, { thought: 'Back.', do: 'work' }, {}); ok(Object.keys(w.idle || {}).length === 0, 'and are worked again when they take it up');
    /* giving */
    const b = w.agents.filter(o => o !== a && SW.cheb(o.x, o.y, S.x, S.y) <= S.r + 4)[0], had = b.carry.length + Object.keys(w.stores).filter(i => w.stores[i] && w.stores[i].by === b.id).reduce((s, i) => s + w.stores[i].items.length, 0);
    M.groupApply(st, land, { thought: 'A gift.', do: 'give', to: b.name }, {}); const has = b.carry.length + Object.keys(w.stores).filter(i => w.stores[i] && w.stores[i].by === b.id).reduce((s, i) => s + w.stores[i].items.length, 0);
    ok(has > had && told(st, b, /gave you \d+ of grain/), 'a group gives of what it has over to a person: ' + b.name + ' has ' + (has - had) + ' more of grain');
    const n0 = land.n; M.groupApply(st, land, { thought: 'We go.', do: 'leave' }, {}); ok(land.n < n0 && f.ev.some(e => e.type === 'manyleft' && e.g === land.id), 'a group may leave: a third of ' + land.name + ' go (' + n0 + ' to ' + land.n + ')');
  }

  { /* ---- persons and the many, through the mind ---- */
    const f = fresh(7, 5), w = f.w, st = f.st, S = w.settlements[0]; day(w, f.em, 1); const land = groupOf(w, 'land', S.id), a = w.agents.filter(o => SW.cheb(o.x, o.y, S.x, S.y) <= S.r + 2)[0]; w.agents.forEach(still); w.creatures = [];
    const pr = M.buildPrompt(st, st.minds[a.id], 'routine'), i = pr.indexOf('THE MANY OF ' + S.name.toUpperCase());
    ok(i > 0 && pr.indexOf(land.name, i) > i && /You may speak to a group \(say, with to: its name\)/.test(pr) && /plan step give, with name: its name/.test(pr), 'a person in ' + S.name + ' is told of the many about them, their groups by name and number, and how to speak and give to one');
    think(st, a, { say: { to: land.name, text: 'People of the fields, what do you need of me?' } });
    ok(land.mind.heard.some(h => h.direct && h.from === a.name && /what do you need/.test(h.text)) && land.mind.urge >= 6 && M.groupDue(st) === land, 'what a person says to a group by its name is heard by it as said to it, and it is next to think');
    const other = groupOf(w, 'makers', S.id); ok(other.mind.heard.some(h => !h.direct && h.from === a.name), 'the other groups of the place hear it too, as said in their hearing');
    const gp = M.groupPrompt(st, land); ok(/said TO YOU: "People of the fields, what do you need of me\?"/.test(gp), 'and the group is told it when it thinks');
    /* giving food to a group by a plan */
    const pool0 = w.many.places[S.id].pool; a.carry = [{ k: 'grain', n: 8 }, { k: 'grain', n: 8 }, { k: 'grain', n: 8 }]; a.x = S.x; a.y = S.y; a.px = a.x; a.py = a.y; think(st, a, { plan: [{ do: 'give', name: land.name, what: 'food', ticks: 20 }] }); for (let k = 0; k < 12 && a.carry.length; k++) { a.e = 90; SW.step(w, f.em); }
    ok(a.carry.length === 0 && w.many.places[S.id].pool >= pool0 + 2.9 && land.mind.heard.some(h => h.gift === 3) && told(st, a, /You gave 3 of food to/), 'a plan to give food to a group by name puts it into what the place holds in common, and the group knows who gave');
    /* the pump: a group that is due thinks, through the same path as a real call */
    let asked = ''; st.sample = async p => { asked = p; return { text: JSON.stringify({ thought: 'We thank them.', feeling: 'glad', say: { to: a.name, text: 'We thank you for the bread.' }, stance: { [a.name]: 'back' }, do: null, note: a.name + ' fed us' }) }; };
    const due = M.groupDue(st), before = st.used; await M.groupThink(st, due);
    ok(due === land && /^You are not one person/.test(asked) && st.used === before + 1 && land.stance[a.id] === 1 && land.mind.heard.length === 0 && /fed us/.test(land.mind.journal[land.mind.journal.length - 1].text) && told(st, a, /say TO YOU: "We thank you for the bread\."/) && st.inflight === 0, 'the group thinks through a call like any mind: it is counted, its answer is taken up, what it heard is cleared and its note kept');
    let n = 0; for (let k = 0; k < 6; k++) { land.mind.urge = 9; land.mind.tick = -1e9; const d = M.groupDue(st); if (d === land) { await M.groupThink(st, land); n++; } } ok(n <= 2, 'however often it is spoken to, a group thinks at most three times in a day (' + (n + 1) + ')');
    st.sample = async () => { throw { code: 'rate_limited' }; }; st.on = true; land.mind.dayOf = -1; land.mind.urge = 9; land.mind.tick = -1e9; await M.groupThink(st, land); ok(!land.mind.busy && st.inflight === 0 && st.on === true, 'a call that is refused leaves the group free to think again and does not put the minds to sleep');
  }

  { /* ---- births past the number of persons; one of the many rises; the watcher chooses ---- */
    const f = fresh(7, 1), w = f.w, st = f.st; w.laws.many.persons = w.agents.length; w.creatures = []; w.laws.weather.disaster = 0;
    const a = w.agents.filter(o => o.sex === 'f')[0], b = w.agents.filter(o => o.sex === 'm' && o.people === a.people)[0]; [a, b].forEach(o => { still(o); o.age = Math.round(o.life * 0.3); o.mateCd = 0; }); b.x = a.x + 1; b.y = a.y; b.px = b.x; b.py = b.y; a.rel[b.id] = 0.9; b.rel[a.id] = 0.9;
    const n0 = w.agents.length; think(st, a, { plan: [{ do: 'mate', name: b.name, ticks: 40 }] }); think(st, b, { plan: [{ do: 'mate', name: a.name, ticks: 40 }] }); for (let k = 0; k < 60 && !SW.manyTotal(w); k++) { [a, b].forEach(o => { o.e = 95; o.hp = 100; }); SW.step(w, f.em); }
    ok(SW.manyTotal(w) >= 1 && w.agents.length + (w.newborn || []).length === n0 && told(st, a, /the child grows up among the many/), 'when every place among the persons is taken, a child born to two of them is one of the many (' + SW.manyTotal(w) + '), and its mother is told');
    const h = w.many.hh[0]; h.n = 6; const riser = SW.rise(w, h, f.em, true), m = riser && st.minds[riser.id];
    ok(riser && h.n === 5 && m && riser.people === a.people && riser.fromMany.hh === h.id && Object.keys(riser.knows).length >= 1 && m.events.some(e => /YOU HAVE COME OUT FROM THE MANY/.test(e.text)) && m.life.some(l => /one of the many/.test(l.text)) && st.chron.some(c => c.kind === 'rose'), 'one of the many who is chosen becomes a person: a body of their people, some of its ways, a mind told where it came from, and a line in the chronicle (' + (riser && riser.name) + ')');
    const pr = M.buildPrompt(st, m, 'routine'); ok(/YOU HAVE COME OUT FROM THE MANY/.test(pr), 'and its first thought begins from that');
    /* a place left empty is filled */
    const g = fresh(7, 4), wg = g.w; day(wg, g.em, 1); const seats = wg.many.seats, p0 = wg.agents.length; ok(seats === p0, 'the places among the persons are as many as there have been at once (' + seats + ')');
    const dead = wg.agents.pop(); let rose = 0; for (let d = 0; d < 12 && !rose; d++) { wg.tick += wg.laws.time.dayLength; day(wg, g.em, 1); rose = g.ev.filter(e => e.type === 'rose').length; }
    ok(rose === 1 && wg.agents.length === p0 && g.st.minds[wg.agents[wg.agents.length - 1].id], 'when a person is gone, one of the many comes forward within days and takes the place, with a mind (' + wg.agents[wg.agents.length - 1].name + ')');
    for (let d = 0; d < 10; d++) { wg.tick += wg.laws.time.dayLength; day(wg, g.em, 1); } ok(g.ev.filter(e => e.type === 'rose').length === 1 && wg.agents.length === p0, 'and no more rise while every place is taken');
  }

  { /* ---- kept, restored, carried on; the maker ---- */
    const f = fresh(7, 5), w = f.w, st = f.st; day(w, f.em, 2); const land = w.groups[0]; M.groupApply(st, land, { thought: 'x', say: { to: 'all', text: 'We are here.' }, note: 'first day' }, {}); land.mind.busy = true;
    const st2 = M.restore(JSON.parse(JSON.stringify(M.snapshot(st)))), w2 = st2.world; ok(SW.manyTotal(w2) === SW.manyTotal(w) && w2.groups.length === w.groups.length && w2.groups[0].mind.journal[0].text === 'first day' && w2.groups[0].mind.busy === false && w2.laws.many.persons === 40, 'the many, their groups and what a group has noted are saved and restored with the world, and a group caught in mid-thought is free again');
    for (let k = 0; k < 300; k++) { SW.step(w2, st2.emit); M.tick(st2); } ok(SW.manyTotal(w2) > 0, 'and the restored world runs on');
    const s = K.stats(st).theManyAndTheirGroups; ok(s.theMany === SW.manyTotal(w) && s.groups.length >= 3 && s.lawsYouCanTune['many.birth'] === 0.03 && Object.keys(s.byPlace).length >= 1 && /theManyAndTheirGroups/.test(K.SEED), 'the maker sees the many, place by place and group by group, and is told of them');
    const r = K.applyOp(w, { op: 'law', group: 'many', key: 'tithe', value: 0.12 }); ok(r.ok && w.laws.many.tithe === 0.12, 'and can tune their laws');
    const d = M.digest(st); ok(d.many && d.many.people === SW.manyTotal(w) && d.many.groups.length === w.groups.length && d.many.groups[0].journal.length === 1, 'the record of a run carries the many and what each group thought');
    const saved = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-31-fourth-age.json.gz'))).toString('utf8')), st3 = M.restore(saved), w3 = st3.world;
    ok(w3.laws.many && SW.manyTotal(w3) >= 10 && w3.many.hh.every(h => w3.shelters[h.home] > 0), 'a fourth-age world saved by Generation 31 gains the many when it is opened: ' + SW.manyTotal(w3) + ' people in the shelters it already had (its towns had no houses of their age yet)');
    let died = 0; for (let k = 0; k < 480; k++) { SW.step(w3, e => { if (e.type === 'death') died++; st3.emit(e); }); M.tick(st3); } ok(w3.agents.length >= 13 && SW.manyTotal(w3) >= 10, 'and runs two days with them (' + w3.agents.length + ' persons, ' + SW.manyTotal(w3) + ' of the many)');
  }
  { /* the accounts of the many close: everyone is born, dies, leaves the world, moves or rises, and is counted once */
    for (const [seed, age, lean, held] of [[19, 4, 0.02, 0], [7, 5, 0, 0], [7, 5, 0, 1]]) { const f = fresh(seed, age), w = f.w; if (lean) w.laws.many.landYield = lean; if (held) { SW.manyDay(w, f.em); SW.groupDo(w, groupOf(w, 'land'), { do: 'withhold' }, f.em); } const n0 = SW.manyTotal(w), T0 = Object.assign({}, w.tally); let bad = 0;
      for (let k = 0; k < 25; k++) { SW.manyDay(w, f.em); w.many.hh.forEach(h => { if (!(h.n > 0) || !(h.food >= 0) || !(h.mood >= 0 && h.mood <= 1) || h.n !== Math.floor(h.n)) bad++; }); }
      const T = w.tally, d = k => (T[k] || 0) - (T0[k] || 0), want = n0 + d('manyBorn') - d('manyDied') - (d('manyLeft') - d('manyMoved')) - d('rose');
      ok(want === SW.manyTotal(w) && bad === 0 && (!lean || (d('manyLeft') > 0 && d('manyStarved') > 0)) && (!held || d('manyMoved') > 0), (lean ? 'on starved land' : held ? 'where those of the land of one place keep what they grow' : 'on good land') + ' the accounts of the many close over 25 days: ' + n0 + ' + ' + d('manyBorn') + ' born - ' + d('manyDied') + ' died - ' + (d('manyLeft') - d('manyMoved')) + ' gone from the world (' + d('manyMoved') + ' more only moved) = ' + SW.manyTotal(w) + ', every household whole and none below nothing'); }
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
