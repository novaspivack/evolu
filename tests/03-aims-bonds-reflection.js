const SW = require('../src/engine.js'), M = require('../src/minds.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x != null ? '  [' + x + ']' : '')); if (!c) fails++; };
(async () => {
  { const w = SW.createWorld(7), st = M.createState(w), a = w.agents[0], b = w.agents[1], m = st.minds[a.id]; w.creatures = []; b.x = a.x + 1; b.y = a.y; let reply = {};
    st.sample = async () => ({ text: JSON.stringify(reply) });
    const think = async (kind) => { for (let i = 0; i < 30; i++) { SW.step(w, st.emit); M.tick(st); } a.e = 80; return M.think(st, m, kind || 'routine'); };
    reply = { thought: 'First I want a roof.', aim: 'Build a roof.', wonder: 'Who is Yeba?', feel: { [b.name]: 0.5 } }; await think();
    const r1 = a.rel[b.id];
    for (let k = 0; k < 8; k++) { reply = { thought: 'Thought number ' + k + ' about something else entirely ' + 'xyz'.repeat(k), aim: 'Aim ' + k, wonder: 'Question ' + k + '?', feel: { [b.name]: 0.5 } }; await think(); }
    ok('words alone warm a bond only to +0.5', r1 <= 0.16 && Math.abs(a.rel[b.id] - 0.5) < 0.01, r1 + ' then ' + a.rel[b.id]);
    ok('an aim holds through everyday thoughts', m.aim === 'Build a roof.', m.aim);
    ok('a question is carried for at least three thoughts', /Question [258]\?/.test(m.wonder) || m.wonder === 'Question 2?' || m.wonder === 'Question 5?', m.wonder);
    reply = { thought: 'Looking back, I want something different now.', aim: 'Win a follower.', feel: { [b.name]: -0.3 } }; const before = a.rel[b.id]; await think('deep');
    ok('deep reflection may change the aim, and coldness lands in full', m.aim === 'Win a follower.' && Math.abs(a.rel[b.id] - (before - 0.3)) < 0.02, before + ' -> ' + a.rel[b.id]);
    const lore0 = a.lore; reply = { thought: 'Reflecting again on my days here and what I owe.' }; await think('deep');
    ok('a reflection adds a fifth of a point of lore', Math.abs(a.lore - lore0 - 0.2) < 0.01, lore0 + ' -> ' + a.lore);
    m.rut = 0; m.lastVerbs = null; m.samePlan = 0;
    const texts = ['The ore seam is close and I will break ore now.', 'My son waits by the fire while I think about Naya far away.', 'Rain again. Nali eats well and it galls me deeply today.', 'A stalker prowls west; I keep my spear and my temper.'];
    for (let k = 0; k < 4; k++) { reply = { thought: texts[k], plan: [{ do: 'goto', x: a.x, y: a.y, ticks: 3 }, { do: 'gather', ticks: 5 }] }; await think(); }
    ok('the same plan four times is a loop even when the words differ', m.rut >= 2 && /YOU ARE GOING IN CIRCLES/.test(M.buildPrompt(st, m, 'routine')), 'rut ' + m.rut);
    a.plan = [{ do: 'linger', ticks: 50 }, { do: 'rest', ticks: 50 }]; a.intent = { do: 'linger', ticks: 40 };
    ok('a running plan is shown as running', /THIS PLAN IS STILL RUNNING and 2 steps have not begun/.test(M.buildPrompt(st, m, 'routine')));
  }
  { const w = SW.createWorld(7), st = M.createState(w); w.creatures = [];
    const meek = w.agents[0], bold = w.agents[1]; meek.temperament.bold = 0.2; meek.temperament.sociable = 0.7; meek.temperament.greedy = 0.2; bold.temperament.bold = 0.9; bold.temperament.greedy = 0.6;
    const dm = M.drives(st, st.minds[meek.id], meek, SW.look(w, meek)), db = M.drives(st, st.minds[bold.id], bold, SW.look(w, bold));
    ok('the meek want to belong, not to lead', dm.some(q => q.k === 'belonging') && !dm.some(q => q.k === 'ambition'), dm.map(q => q.k + ' ' + q.s).join(', '));
    ok('the bold want to lead, not to belong', db.some(q => q.k === 'ambition') && !db.some(q => q.k === 'belonging'), db.map(q => q.k + ' ' + q.s).join(', '));
    const kid = SW.settle ? null : null; const child = w.agents[2]; child.parents = [meek.id, bold.id]; child.age = 5;
    const df = M.drives(st, st.minds[meek.id], meek, SW.look(w, meek)), dc = M.drives(st, st.minds[child.id], child, SW.look(w, child));
    ok('a parent is pulled by family, naming child and mate', df.some(q => q.k === 'family' && q.text.includes(child.name) && q.text.includes(bold.name)), (df.find(q => q.k === 'family') || {}).text);
    ok('a child is pulled toward its parents', dc.some(q => q.k === 'family' && /your parents/.test(q.text)));
    meek.e = 40; meek.carry = []; bold.x = meek.x + 1; bold.y = meek.y; bold.carry = [{ k: 'berry', n: 14 }, { k: 'berry', n: 14 }, { k: 'berry', n: 14 }]; meek.temperament.gentle = 0.2; meek.temperament.greedy = 0.8;
    ok('hunger beside another\'s food is temptation', M.drives(st, st.minds[meek.id], meek, SW.look(w, meek)).some(q => q.k === 'temptation'));
  }
  { /* a lone sleeper in the open at night is stalked; company, a roof or a fire protects */
    const trial = (setup) => { let bites = 0; for (const seed of [7, 11, 42]) { const w = SW.createWorld(seed); const a = w.agents[0]; w.agents = [a]; a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null;
        w.creatures = w.creatures.filter(c => w.laws.creatures[c.sp].predator).slice(0, 1); const c = w.creatures[0]; c.x = a.x + 3; c.y = a.y; c.e = 10; setup(w, a);
        const hx = a.x, hy = a.y; while (!SW.isNight(w)) { a.e = 90; a.hp = 100; a.x = hx; a.y = hy; a.spook = 0; c.x = (hx + 40) % w.W; c.y = hy; c.e = 60; SW.step(w); } c.x = hx + 3; c.y = hy;
        for (let i = 0; i < 40; i++) { a.e = 90; a.x = hx; a.y = hy; a.spook = 0; c.e = 10; setup(w, a); /* a storm may have taken the roof or the fire: put it back */ if (SW.cheb(c.x, c.y, hx, hy) > 4) { c.x = hx + 3; c.y = hy; } SW.step(w, e => { if (e.type === 'bitten' && e.stalked) bites++; }); if (!w.agents.length) break; } } return bites; };
    const open = trial(() => {}), roof = trial((w, a) => { w.shelters[SW.idx(w, a.x, a.y)] = a.id; }), fire = trial((w, a) => { w.fires[SW.idx(w, a.x, a.y)] = w.tick + 9999; });
    ok('alone in the open at night: stalked and bitten', open >= 3, open + ' bites');
    ok('under a roof: left alone', roof === 0, roof + ' bites');
    ok('beside a fire: left alone', fire === 0, fire + ' bites');
  }
  { const w = SW.createWorld(7), a = w.agents[0]; w.shelters[SW.idx(w, a.x, a.y)] = a.id; w.stores[SW.idx(w, a.x + 1, a.y)] = { by: a.id, items: [] }; SW.findSettlements(w);
    ok('a roof and a store side by side already make a home', w.settlements.length === 1, w.settlements.map(q => q.name).join());
    const b = w.agents[1]; a.rel[b.id] = 0.8; w.agents = [a]; a.seenAt[b.id] = [0, 0, -9999]; for (let i = 0; i < 245; i++) { a.e = 90; SW.step(w); }
    ok('a bond not kept up fades a little each day', a.rel[b.id] < 0.8 && a.rel[b.id] > 0.6, a.rel[b.id]); }
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
})().catch(e => { console.error('CRASH', e.stack); process.exit(1); });
