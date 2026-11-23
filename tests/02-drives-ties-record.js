/* Inner drives, ties, going in circles, the run record. PASS/FAIL per check. */
const SW = require('../src/engine.js'), M = require('../src/minds.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x != null ? '  [' + x + ']' : '')); if (!c) fails++; };
const run = (w, n, emit) => { for (let i = 0; i < n; i++) SW.step(w, emit); };
(async () => {
  { /* hands full: the plan is told why, reflexes are not nagged; dropping frees the hands */
    const w = SW.createWorld(7), st = M.createState(w), a = w.agents[0], ev = []; w.creatures = [];
    const emit = e => { ev.push(e); st.emit(e); };
    a.policy = [{ if: [], do: 'harvest' }, { if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90;
    while (a.carry.length < SW.carryCap(w, a)) a.carry.push({ k: 'redcap', n: -5 }); a.habits.avoid = ['redcap'];
    run(w, 5, emit); ok('a reflex harvest with full hands stays quiet', !ev.some(e => e.type === 'fail'));
    a.plan = [{ do: 'harvest', ticks: 20 }]; run(w, 3, emit);
    ok('a planned harvest with full hands says why', ev.some(e => e.type === 'fail' && /HANDS ARE FULL/.test(e.text)));
    a.policy = [{ if: [], do: 'linger' }]; a.intent = null; a.plan = [{ do: 'drop', ticks: 3 }]; run(w, 2, emit);
    ok('drop with no kind throws away what the body refuses', a.carry.length === 0 && ev.some(e => e.type === 'dropped' && e.n === 6));
    a.carry = []; a.carry.push({ k: 'berry', n: 14 }, { k: 'grain', n: 8 }); a.intent = null; a.plan = [{ do: 'drop', what: 'grain', ticks: 3 }]; run(w, 2, emit);
    ok('drop with a kind throws away only that', a.carry.length === 1 && a.carry[0].k === 'berry');
  }
  { /* drives follow the body and the heart */
    const w = SW.createWorld(7), st = M.createState(w), a = w.agents[0], m = st.minds[a.id]; w.creatures = [];
    a.e = 80; while (a.carry.length < SW.carryCap(w, a)) a.carry.push({ k: 'berry', n: 14 });
    let d = M.drives(st, m, a, SW.look(w, a));
    ok('a fed being with full hands is not driven by hunger', d.fed && d.full && !d.some(q => q.k === 'hunger'), d.map(q => q.k + ' ' + q.s).join(', '));
    a.e = 25; a.carry = []; d = M.drives(st, m, a, SW.look(w, a));
    ok('a starving being is driven by hunger above all', d[0].k === 'hunger' && d[0].s === 1 && !d.fed);
    a.e = 80; w.creatures = [SW.newCreature ? null : null].filter(Boolean);
    const other = w.agents.find(o => o !== a); a.rel[other.id] = -0.7; a.mood.anger = 0.6;
    M.onEvent(st, { type: 'attack', a: other.id, b: a.id, dmg: 5 });
    d = M.drives(st, m, a, SW.look(w, a));
    ok('a wrong unanswered becomes resentment, naming who and what', d.some(q => q.k === 'resentment' && q.text.includes(other.name) && /ATTACKED/.test(q.text)), (d.find(q => q.k === 'resentment') || {}).text);
    m.rut = 4; m.dull = 5; d = M.drives(st, m, a, SW.look(w, a));
    ok('sameness becomes restlessness', d.some(q => q.k === 'restlessness'));
    a.age = Math.floor(a.life * 0.96); m.rut = 0; m.dull = 0; d = M.drives(st, m, a, SW.look(w, a));
    ok('age brings mortality to mind', d.some(q => q.k === 'mortality'));
  }
  { /* ties: each keeps its own account of the other, and the prompt shows it when they meet */
    const w = SW.createWorld(7), st = M.createState(w), a = w.agents[0], b = w.agents[1], m = st.minds[a.id]; w.creatures = [];
    b.x = a.x + 1; b.y = a.y;
    SW.speak(w, b, a.name, 'I will leave the berries standing for you.', st.emit);
    SW.speak(w, a, b.name, 'The grain is mine. Take the berries.', st.emit);
    M.onEvent(st, { type: 'gave', a: b.id, b: a.id, item: 'a berry' });
    M.onEvent(st, { type: 'stole', a: b.id, b: a.id, item: 'grain', ok: true, seen: true });
    const tl = M.tiesOf(m, b.id), p = M.buildPrompt(st, m, 'routine');
    ok('speech, gift and theft are all in the account', tl.length === 4 && /said to you/.test(tl[0].text) && /you said to them/.test(tl[1].text) && /GAVE/.test(tl[2].text) && /STOLE/.test(tl[3].text), tl.map(e => e.text.slice(0, 24)).join(' | '));
    ok('the prompt lays out what passed between them', /WHAT HAS PASSED BETWEEN YOU AND THOSE HERE/.test(p) && p.includes('You and ' + b.name + ':') && /they STOLE grain from you/.test(p));
    ok('the other side keeps its own account', M.tiesOf(st.minds[b.id], a.id).some(e => /you stole grain from them/.test(e.text)));
    ok('the prompt carries the new parts', /WHAT PRESSES ON YOU NOW/.test(p) && /THINGS YOU HAVE NEVER DONE/.test(p) && /WAYS YOU SENSE BUT HAVE NOT FOUND/.test(p) && /"feeling":/.test(p) && /"wonder":/.test(p) && /drop \{what/.test(p), p.length + ' chars');
  }
  { /* going in circles is noticed, said, and forces a reflection; the record keeps everything */
    const w = SW.createWorld(7), st = M.createState(w), a = w.agents[0], m = st.minds[a.id]; let n = 0, mode = 'same';
    st.sample = async () => { n++; if (mode === 'bad') return { text: 'no json here' }; return { text: JSON.stringify(mode === 'same' ? { thought: 'Yeba is close with five food so I will fill my hands with berries and grain before anyone else does.', feeling: 'Greedy and wary of Yeba.', plan: [{ do: 'goto', x: 70, y: 30, ticks: 5 }, { do: 'harvest', ticks: 30 }] } : { thought: 'I have been circling the same bushes for days. I want someone at my side, and I am going to find Yeba and ask what she wants from me.', feeling: 'Tired of myself.', wonder: 'Why does Yeba keep her word to me?', aim: 'Win one true ally.', plan: [{ do: 'seek', target: 'agent', ticks: 60 }] }) }; };
    for (let k = 0; k < 4; k++) { for (let i = 0; i < 40; i++) { SW.step(w, st.emit); M.tick(st); } await M.think(st, m, 'routine'); }
    ok('four alike thoughts are a rut and call for reflection', m.rut === 3 && m.wantDeep === true && M.kindFor(st, m) === 'deep', 'rut ' + m.rut);
    ok('the mind is told so', /YOU ARE GOING IN CIRCLES/.test(M.buildPrompt(st, m, 'routine')) && /MUST change now/.test(M.buildPrompt(st, m, 'deep')));
    mode = 'new'; await M.think(st, m, 'deep');
    ok('a different thought ends the rut and leaves a feeling and a question', m.rut === 0 && m.feeling === 'Tired of myself.' && /keep her word/.test(m.wonder) && /A QUESTION YOU ARE CARRYING/.test(M.buildPrompt(st, m, 'routine')));
    mode = 'bad'; await M.think(st, m, 'routine');
    const R = st.rec.all, kinds = {}; R.forEach(r => kinds[r.t] = (kinds[r.t] || 0) + 1);
    ok('the record has thoughts, a full prompt sample, the failure and the chronicle', kinds.thought === 5 && kinds.prompt >= 1 && kinds.failed === 1 && R.every(r => r.tick != null && r.day != null), JSON.stringify(kinds));
    const th = R.filter(r => r.t === 'thought')[4];
    ok('a thought record carries state, plan and drives', th.e != null && th.at && th.plan.length && th.drives.length && th.feeling === 'Tired of myself.', JSON.stringify(th).slice(0, 200));
    const ex = M.exportRun(st), dg = JSON.stringify(ex.digest).length;
    ok('the digest of all beings fits in one document', dg < 200000 && ex.digest.beings.length === w.agents.length && ex.digest.beings[0].body.policy.length > 0, dg + ' bytes');
    const snap = JSON.parse(JSON.stringify(M.snapshot(st))); st.rec.chunk = 7; const snap2 = JSON.parse(JSON.stringify(M.snapshot(st))), st2 = M.restore(snap2);
    ok('the run keeps its identity and chunk count across a reload', st2.runId === st.runId && st2.rec.chunk === 7 && st2.settings.budget === 3000 && st2.settings.v >= 12);
    snap.settings = { routine: { model: 'claude-haiku-5-5', effort: '' }, deep: { model: 'claude-sonnet-5-5', effort: 'medium' }, perMinute: 10, parallel: 2, budget: 90, reflectEvery: 5, foresight: true };
    const st3 = M.restore(snap);
    ok('settings saved before this generation give way to the new defaults', st3.settings.budget === 3000 && st3.settings.perMinute === 40 && st3.settings.routine.model === 'claude-sonnet-5-5');
  }
  { /* beasts hunting beasts is an event, seen by witnesses, chronicled at most once a day */
    const w = SW.createWorld(11), st = M.createState(w); let kills = 0;
    for (let i = 0; i < 1500; i++) SW.step(w, e => { if (e.type === 'preykill') kills++; st.emit(e); });
    const ch = st.chron.filter(c => c.kind === 'hunt' && /^A .* brought down a /.test(c.text)).length;
    ok('predators kill prey and the world records it', kills > 3 && ch >= 1 && ch <= 7, kills + ' kills, ' + ch + ' chronicle entries in ' + SW.day(w) + ' days');
  }
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
})().catch(e => { console.error('CRASH', e.stack); process.exit(1); });
