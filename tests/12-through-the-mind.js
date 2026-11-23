/* What a mind is offered must be what its body can do: every act is checked through the mind's own path, not by calling the engine directly.
   Then: claiming and naming, telling by the fire, hunting together, pledges between the close, a roof and children, grudges and kindness, people added by hand. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const grass = (w, n) => { for (let i = w.W * 30; i < w.terrain.length - w.W * 30; i++) { let good = true; for (let d = 0; d < n; d++) if (w.terrain[i + d] !== 2 || w.plants[i + d] || w.shelters[i + d] || w.lodes[i + d]) good = false; if (good && i % w.W > 30 && i % w.W < w.W - 40) return i; } };
const at = (w, o, i) => { o.x = i % w.W; o.y = Math.floor(i / w.W); o.px = o.x; o.py = o.y; };
const think = (st, a, kind, d) => M.apply(st, st.minds[a.id], kind, Object.assign({ thought: 'x' }, d), {});
const run = (w, em, n, keep) => { for (let k = 0; k < n; k++) { w.creatures = []; (keep || []).forEach(o => { o.e = Math.max(o.e, 80); o.thirst = 0; }); SW.step(w, em); } };
{ // every act a mind is told of is an act its body accepts
  const { w, st } = fresh(7); const a = w.agents[0], pr = M.buildPrompt(st, st.minds[a.id], 'deep') + M.buildPrompt(st, st.minds[a.id], 'routine');
  const cat = pr.split('\n').find(l => / \| /.test(l) && /dismantle \(/.test(l)) || '', names = cat.split(' | ').map(q => (q.trim().match(/([a-z]+)\s*(\{|\(|$)/) || [])[1]).filter(Boolean);
  const missing = names.filter(n => SW.ACTIONS.indexOf(n) < 0); ok(names.length >= 25 && missing.length === 0, names.length + ' acts are offered to a mind and its body accepts every one' + (missing.length ? ' EXCEPT ' + missing.join(', ') : ''));
  ['claim', 'venture', 'tell', 'bridge', 'dismantle', 'tame', 'hunt'].forEach(n => { think(st, a, 'routine', { plan: [{ do: n, ticks: 5 }] }); ok(a.plan.length === 1 && a.plan[0].do === n, 'a plan step "' + n + '" written by a mind reaches its body'); });
}
{ // claiming, through the mind
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people !== a.people), g = grass(w, 8); at(w, a, g); a.wood = 40; a.stone = 40; still(b); at(w, b, g + 6);
  think(st, a, 'routine', { plan: [{ do: 'build', what: 'shelter', ticks: 3 }] }); run(w, em, 4, [a, b]); at(w, a, g + 2); think(st, a, 'routine', { plan: [{ do: 'build', what: 'shelter', ticks: 3 }] }); run(w, em, 4, [a, b]);
  ok(w.shelters[g] === a.id && w.shelters[g + 2] === a.id, 'a being raises two roofs');
  w.agents = w.agents.filter(o => o !== a); at(w, b, g + 6); think(st, b, 'routine', { plan: [{ do: 'claim', name: 'Kenna Hold', ticks: 30 }] }); run(w, em, 12, [b]);
  ok(w.shelters[g] === b.id && w.shelters[g + 2] === b.id && w.places.some(p => p.name === 'Kenna Hold' && p.by === b.id) && st.minds[b.id].events.some(e => /It is yours now, and it is called "Kenna Hold"/.test(e.text)) && w.tally.claimed === 2, 'after it dies, another plans to claim them, walks there, holds both, and names the place');
}
{ // telling by the fire
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people === a.people && o !== a), g = grass(w, 5); at(w, a, g); at(w, b, g + 1); still(b); w.fires[g + 2] = w.tick + 5000;
  M.lesson(st, [a.id], 'Kragar starved alone in winter, an old man with no store.'); for (let k = 0; k < 3; k++) { think(st, a, 'routine', { plan: [{ do: 'tell', ticks: 3 }] }); run(w, em, 3, [a, b]); w.fires[g + 2] = w.tick + 5000; at(w, a, g); at(w, b, g + 1); }
  const C = w.culture, it = Object.values(C.items).find(q => q.kind === 'tale'); ok(a.stats.told === 3 && it && /Kragar starved/.test(it.text) && it.holders[b.id] && (st.minds[b.id].tales || []).some(q => q.cid === it.id), 'one who tells by a fire makes a tale of what befell, and those who hear it carry it');
  a.lore = Math.max(a.lore, 1.2); ok(SW.pathsFor(w, a).open.some(o => o.id === 'lorekeeping') || a.knows.lorekeeping, 'three tellings bring lorekeeping within reach');
}
{ // hunting together, and skill
  const { w, st, ev, em } = fresh(7); const a = w.agents[0], b = w.agents.find(o => o.people === a.people && o !== a), g = grass(w, 5); const sp = Object.keys(w.laws.creatures).find(k => !w.laws.creatures[k].predator && (w.laws.creatures[k].tough || 1) >= 2) || 'hornback'; let kills = [0, 0];
  [0, 1].forEach(j => { for (let n = 0; n < 250; n++) { const c = { id: w.nextId++, sp: sp, x: 0, y: 0, e: 60, age: 900, size: 1, quick: 1, owner: null }; at(w, a, g); c.x = a.x + 1; c.y = a.y; w.creatures = [c]; at(w, b, j ? g + w.W : g + 40); still(b); a.rel[b.id] = 0.8; a.stats.hunted = 0; a.hp = 100; a.carry = []; a.policy = []; a.plan = [{ do: 'hunt', ticks: 1 }]; a.intent = null; a.e = 90; a.thirst = 0; SW.step(w, em); if (c.wounds) kills[j]++; } });
  ok(kills[0] > 10 && kills[1] > kills[0] * 1.4, 'two together bring down what one cannot: a blow lands ' + kills[0] + ' times of 250 alone, ' + kills[1] + ' with one of your own beside you');
  ok(w.laws.fight.packBonus === 0.8 && /with one of your own beside you a kill is far likelier/.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'and a being is told so');
}
{ // the close, a roof, and what is not forgotten
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people === a.people && o.sex !== a.sex), c = w.agents.find(o => o.people === a.people && o !== a && o !== b), g = grass(w, 6); [a, b, c].forEach((o, i) => { at(w, o, g + i); still(o); });
  a.stats.built = 30; a.stats.gifts = 30; a.stat = null; b.stat = null; a.rel[b.id] = 0.2; ok(!SW.pledge(w, a, b.name, em), 'one of high standing will not pledge to one of low standing who is a stranger'); a.rel[b.id] = 0.8; ok(SW.pledge(w, a, b.name, em) && a.leader === b.id, 'but will, to one it is warm toward');
  a.leader = null; const mate = (roof) => { let cd = -1; for (let k = 0; k < 80 && cd < 0; k++) { w.creatures = []; [a, b].forEach(o => { o.e = 78; o.hp = 70; o.thirst = 0; o.mateCd = 0; o.policy = []; o.intent = null; }); at(w, a, g); at(w, b, roof ? g : g + 1); if (roof) w.shelters[g] = a.id; a.plan = [{ do: 'mate', name: b.name, ticks: 3 }]; b.plan = [{ do: 'mate', name: a.name, ticks: 3 }]; SW.step(w, e => { em(e); if (e.type === 'birth' && cd < 0) cd = a.mateCd; }); } return cd; };
  const open = mate(false), roof = mate(true); ok(open > 0 && roof > 0 && roof < open * 0.85, 'a child conceived under a roof is followed sooner by another (wait ' + roof + ' against ' + open + ' in the open)');
  w.shelters[g] = 0; at(w, a, g); at(w, c, g + 1); still(a); still(c); c.rel[a.id] = 0.6; think(st, a, 'routine', { plan: [{ do: 'attack', target: 'agent', name: c.name, ticks: 1 }] }); run(w, em, 1, [a]); c.hp = 100; c.rel[a.id] = 0.9; run(w, em, 90, [a, c]);
  ok(c.marks && c.marks[a.id] && c.marks[a.id].k === 'grudge' && c.rel[a.id] <= -0.4 && /WHAT YOU DO NOT FORGET:\n- .* struck you on day \d+: a grudge/.test(M.buildPrompt(st, st.minds[c.id], 'routine')), 'a blow is not forgotten: the bond is held down however it is warmed (' + c.rel[a.id] + ')');
  for (let k = 0; k < 3; k++) { a.carry = [{ k: 'berry', n: 14 }]; at(w, a, g); at(w, c, g + 1); c.e = 80; think(st, a, 'routine', { plan: [{ do: 'give', name: c.name, ticks: 2 }] }); run(w, em, 2, [a]); }
  ok(!(c.marks || {})[a.id] && ev.some(e => e.type === 'mended') && c.rel[a.id] >= 0, 'three gifts from the one who struck mend it');
  b.e = 30; a.carry = [{ k: 'berry', n: 14 }]; at(w, a, g); at(w, b, g + 1); b.policy = [{ if: [], do: 'linger' }]; b.plan = []; think(st, a, 'routine', { plan: [{ do: 'give', name: b.name, ticks: 2 }] }); for (let k = 0; k < 2; k++) { w.creatures = []; SW.step(w, em); } b.rel[a.id] = -0.2; b.e = 80; run(w, em, 50, [a, b]);
  ok(b.marks && b.marks[a.id] && b.marks[a.id].k === 'kindness' && b.rel[a.id] >= 0.4, 'and a gift in need is not forgotten either: the bond is held up (' + b.rel[a.id] + ')');
}
{ // people added by hand; the sick; a world carried on
  const { w, st, ev, em } = fresh(7); const n0 = w.agents.length, made = SW.addPeople(w, 7); SW.step(w, em); ok(made.length === 7 && w.agents.length >= n0 + 7 - 1 && made.every(o => st.minds[o.id]) && new Set(made.map(o => o.people)).size >= 1 && st.chron.filter(c => /came into the land/.test(c.text)).length === 2, 'seven people can be added by hand: they come as a band of four and a band of three, each with a mind');
  const a = w.agents[0]; st.emit({ type: 'sick', a: a.id, from: 'eating raw fish' }); ok((st.minds[a.id].lessons || []).some(q => /raw fish\. Eaten within a step of a fire/.test(q.text)), 'one who sickens on raw fish learns the remedy with the cause');
  const snap = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-18.json.gz'))).toString()); snap.world.laws.arrivals.floor = 10; snap.world.tuned2 = 0; const st2 = M.restore(snap); ok(st2.world.laws.arrivals.floor === 14 && SW.ACTIONS.indexOf('claim') >= 0, 'a world carried on takes the higher floor for newcomers');
  ok(/fewer than about twenty, bring newcomers/.test(K.make.toString()) && w.laws.arrivals.floor === 14, 'the maker is told to bring people when they are few, and the world does so below fourteen');
}
{ // what courting needs, said; a hall; beasts and company; the maker's own numbers; hunger pointed at food
  const { w, st, ev, em } = fresh(11); w.creatures = []; const a = w.agents[0], b = w.agents.find(o => o.people === a.people && o.sex !== a.sex), g = grass(w, 6);
  const pair = (prep) => { [a, b].forEach(o => { o.e = 80; o.hp = 80; o.thirst = 0; o.mateCd = 0; o.policy = [{ if: [], do: 'linger' }]; o.plan = []; o.intent = null; o.court = null; o.whyT = -999; }); at(w, a, g); at(w, b, g + 1); prep && prep(); };
  pair(); const n0 = w.agents.length; think(st, a, 'routine', { plan: [{ do: 'mate', name: b.name, ticks: 2 }] }); run(w, em, 3, [a, b]); for (let k = 0; k < 150; k++) { w.creatures = []; a.e = b.e = 80; a.thirst = b.thirst = 0; SW.step(w, em); } at(w, a, g); at(w, b, g + 1); think(st, b, 'routine', { plan: [{ do: 'mate', name: a.name, ticks: 2 }] }); for (let k = 0; k < 3; k++) { w.creatures = []; SW.step(w, em); }
  ok(w.agents.length + (w.newborn || []).length > n0 && w.laws.mate.courtWindow === 240, 'courting holds for a day: one who answers 150 moments later still makes a child');
  pair(() => { b.e = 40; }); ev.length = 0; a.plan = [{ do: 'mate', name: b.name, ticks: 3 }]; a.intent = null; b.plan = [{ do: 'mate', name: a.name, ticks: 3 }]; for (let k = 0; k < 3; k++) { w.creatures = []; b.e = 40; SW.step(w, em); }
  ok(ev.some(e => e.type === 'fail' && /court each other, but no child comes yet: .* is too thin/.test(e.text)), 'when both are willing and no child comes, each is told why: ' + ((ev.find(e => e.type === 'fail' && /court each other/.test(e.text)) || {}).text || '').slice(0, 110));
  pair(() => { a.mateCd = 500; }); ev.length = 0; a.plan = [{ do: 'mate', name: b.name, ticks: 3 }]; a.intent = null; b.plan = [{ do: 'mate', name: a.name, ticks: 3 }]; for (let k = 0; k < 3; k++) { w.creatures = []; SW.step(w, em); }
  ok(ev.some(e => e.type === 'fail' && /not ready for another child for about 2\.5 days|not ready for another child for about 2 days/.test(e.text)), 'and how long the wait is');
  const wait = (kind) => { let cd = -1; for (let t = 0; t < 60 && cd < 0; t++) { pair(); w.shelters[g] = kind ? a.id : 0; w.bkind = w.bkind || {}; if (kind) w.bkind[g] = kind; else delete w.bkind[g]; at(w, b, kind ? g : g + 1); a.plan = [{ do: 'mate', name: b.name, ticks: 3 }]; b.plan = [{ do: 'mate', name: a.name, ticks: 3 }]; for (let k = 0; k < 3 && cd < 0; k++) { w.creatures = []; SW.step(w, e => { em(e); if (e.type === 'birth' && cd < 0) cd = a.mateCd; }); } } return cd; };
  const open = wait(null), roof = wait('shelter'), hall = wait('hall'); ok(hall > 0 && hall < roof && roof < open, 'a hall brings the next child sooner than a roof, and a roof sooner than open ground (wait ' + hall + ', ' + roof + ', ' + open + ')');
  w.shelters[g] = 0; w.agents = w.agents.filter(o => o === a || o === b); /* the children just born would be company */
  // a beast that is not starving leaves two together alone, and takes one alone
  const beast = Object.keys(w.laws.creatures).find(k => w.laws.creatures[k].predator && w.laws.creatures[k].agentHunger), bs = w.laws.creatures[beast]; const bitten = (together) => { let n = 0; for (let t = 0; t < 40; t++) { w.tick = Math.floor(w.tick / 240) * 240 + 60; [a, b].forEach(still); at(w, a, g); at(w, b, together ? g + 1 : g + 30); a.hp = b.hp = 100; const c = { id: w.nextId++, sp: beast, x: a.x, y: a.y + 1, e: bs.agentHunger * 0.8, age: 900, size: 1, quick: 1, owner: null }; w.creatures = [c]; SW.step(w, e => { if (e.type === 'bitten' && e.a === a.id) n++; }); } return n; };
  const alone = bitten(false), two = bitten(true); ok(alone > 10 && two === 0, 'a hungry beast bites one who stands alone (' + alone + ' of 40) and will not come at two who stand together (' + two + ')');
  let kA = 0, kT = 0; [0, 1].forEach(j => { for (let t = 0; t < 200; t++) { [a, b].forEach(still); at(w, a, g); at(w, b, j ? g + w.W : g + 30); a.rel[b.id] = 0.8; a.hp = 100; const c = { id: w.nextId++, sp: beast, x: a.x + 1, y: a.y, e: 80, age: 900, size: 1, quick: 1, owner: null, wounds: 0 }; w.creatures = [c]; a.policy = []; a.plan = [{ do: 'attack', target: 'predator', ticks: 1 }]; a.intent = null; SW.step(w, em); if (c.wounds || c.dead) j ? kT++ : kA++; } });
  ok(kT > kA * 1.4, 'and two together wound a beast far oftener than one (' + kT + ' against ' + kA + ' of 200)');
  // a kill shared
  { const sp = Object.keys(w.laws.creatures).find(k => !w.laws.creatures[k].predator && (w.laws.creatures[k].tough || 1) === 1); let shared = false; for (let t = 0; t < 60 && !shared; t++) { [a, b].forEach(still); at(w, a, g); at(w, b, g + w.W); a.carry = []; b.carry = []; a.rel[b.id] = 0.8; const c = { id: w.nextId++, sp: sp, x: a.x + 1, y: a.y, e: 60, age: 900, size: 1, quick: 1, owner: null }; w.creatures = [c]; a.policy = []; a.plan = [{ do: 'hunt', ticks: 1 }]; a.intent = null; SW.step(w, em); shared = c.dead && b.carry.some(q => q.k === 'meat'); }
    ok(shared && a.stats.huntedWith >= 1 && st.chron.some(c => / brought down a .* together\./.test(c.text)) && st.minds[b.id].events.some(e => /a share of the meat is yours/.test(e.text)), 'one who stands in a hunt takes a share of the kill, and it is told'); }
  // hunger names what is near
  { [a, b].forEach(still); at(w, a, g); a.e = 40; a.carry = []; const sp = Object.keys(w.laws.creatures).find(k => !w.laws.creatures[k].predator); w.creatures = [{ id: w.nextId++, sp: sp, x: a.x + 3, y: a.y, e: 60, age: 900, size: 1, quick: 1, owner: null }]; const pr = M.buildPrompt(st, st.minds[a.id], 'routine');
    ok(new RegExp('Hunger: your belly is emptying and you carry nothing you can eat\\.[^\\n]* A ' + sp + ' is 3 steps E: it can be hunted for meat \\(plan step hunt\\)').test(pr), 'a hungry being with empty hands is told what food and what animal is near'); }
  // the maker's last-visit numbers are a copy
  { const s1 = K.stats(st); const kept = JSON.parse(JSON.stringify(s1)); w.tally.eaten.berry = (w.tally.eaten.berry || 0) + 5; ok(/Mk\.stats = JSON\.parse\(JSON\.stringify\(now\)\)/.test(K.make.toString()) && K.stats(st).timesEaten.berry === (kept.timesEaten.berry || 0) + 5 && typeof s1.grudgesHeld === 'number' && typeof s1.huntsMadeTogether === 'number' && typeof s1.tellingsByTheFire === 'number', 'the maker keeps a copy of the numbers at each visit, so a count that moved shows as moved; and it can see tellings, hunts together, grudges and kindnesses'); }
  // gathering grows with practice
  { let one = 0, two2 = 0; [0, 300].forEach(pk => { for (let t = 0; t < 200; t++) { still(a); at(w, a, g + 3); w.creatures = []; const k = Object.keys(w.laws.plants).find(q => w.laws.plants[q].nutrition > 5); w.plants[g + 3] = { sp: k, g: 1, food: 3, age: 10 }; a.carry = []; a.things = {}; a.stats.picked = pk; a.policy = []; a.plan = [{ do: 'harvest', ticks: 1 }]; a.intent = null; SW.step(w, em); if (a.carry.length >= 2) pk ? two2++ : one++; } }); w.plants[g + 3] = null;
    ok(two2 > one + 40, 'a practised gatherer picks two at once far oftener (' + two2 + ' against ' + one + ' of 200)'); }
}
{ // the pace of thought, and plans long enough to last until the next one
  const { w, st } = fresh(7); const a = w.agents[0], m = st.minds[a.id];
  think(st, a, 'routine', { plan: [{ do: 'rest', ticks: 10 }] }); w.tick += 90; think(st, a, 'routine', { plan: null }); w.tick += 110; think(st, a, 'routine', { plan: null });
  ok(m.gap === 100 && /YOUR NEXT THOUGHT comes when your plan has run out[^\n]*Lately your thoughts have come about every 100 moments\. So plan as far as you can see \(up to 5 steps/.test(M.buildPrompt(st, m, 'routine')), 'a mind is told how often its thoughts come, so that a plan can last until the next one');
  think(st, a, 'routine', { plan: [1, 2, 3, 4, 5, 6].map(() => ({ do: 'rest', ticks: 20 })) }); ok(a.plan.length + (a.intent ? 1 : 0) === 5, 'and a plan may hold five steps');
  const d = M.defaultSettings(); ok(d.v >= 12 && d.perMinute === 40 && d.parallel === 4, 'by default forty thoughts a minute, four at once');
  const snap = JSON.parse(JSON.stringify(M.snapshot(st))); snap.settings = Object.assign({}, snap.settings, { v: 10, perMinute: 24, parallel: 4, budget: 9000, sound: false }); const st2 = M.restore(snap);
  ok(st2.settings.v >= 12 && st2.settings.perMinute === 40 && st2.settings.parallel === 4 && st2.settings.budget === 9000 && st2.settings.sound === false, 'settings saved by Generation 17 are kept, and its pace moves to the new one where it had not been changed');
  snap.settings = Object.assign({}, snap.settings, { v: 10, perMinute: 12, parallel: 2 }); const st3 = M.restore(snap); ok(st3.settings.perMinute === 12 && st3.settings.parallel === 2, 'a pace the owner chose is left alone');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
