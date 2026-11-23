const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const act = (w, a, step, em, n) => { a.policy = []; a.plan = [step]; a.intent = null; for (let k = 0; k < (n || 2); k++) { if (a.e > 30) a.e = 90; a.thirst = 0; SW.step(w, em); } };
const grass = (w, n) => { for (let i = w.W * 12; i < w.terrain.length - w.W * 12; i++) { let good = true; for (let d = 0; d < n; d++) if (w.terrain[i + d] !== 2 || w.plants[i + d] || w.shelters[i + d] || w.lodes[i + d]) good = false; if (good) return i; } };
const at = (w, o, i) => { o.x = i % w.W; o.y = Math.floor(i / w.W); o.px = o.x; o.py = o.y; };
const fresh0 = a => { a.stat = null; };
{ // standing and leadership
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents[1], g = grass(w, 4); at(w, a, g); at(w, b, g + 1); still(a); still(b);
  const s0 = SW.status(w, a); a.stats.built = 10; a.stats.gifts = 10; a.stats.kids = 2; a.things['amber charm'] = 1; a.sung = 3; fresh0(a); const s1 = SW.status(w, a);
  ok(s0 < 0.8 && s1 > s0 + 1.5, 'standing is earned by building, giving, children, prized things and being sung of (' + s0 + ' → ' + s1 + ')');
  a.shame = 1.5; fresh0(a); const s2 = SW.status(w, a); ok(s2 < s1 - 1, 'and lost through shame (' + s2 + ')'); a.shame = 0; fresh0(a);
  const lowly = w.agents[2]; at(w, lowly, g + 2); ok(!SW.pledge(w, a, lowly.name, em) && ev.some(e => e.type === 'fail' && /would not bend/.test(e.text)), 'no one pledges to someone of lower standing than their own');
  ok(SW.pledge(w, b, a.name, em) && b.leader === a.id, 'one of low standing can pledge to one who has earned it');
  for (let k = 0; k < 8; k++) SW.step(w, em); a.shame = 0; for (let k = 0; k < 5; k++) { a.shame = 2; } a.stat = null; const shamed = SW.status(w, a); for (let k = 0; k < 480; k++) { still(a); still(b); still(lowly); SW.step(w, em); } ok(a.shame < 2 && a.shame > 0, 'shame fades with the days (' + a.shame + ')');
  a.stats.told = 4; ok(SW.roleOf(w, a) !== null && (function () { const c = w.agents[3]; c.stats.told = 4; return SW.roleOf(w, c) === 'bard'; })(), 'one who has told tales to others is known as a bard; ' + a.name + ' is known as a ' + SW.roleOf(w, a));
  at(w, a, g); at(w, b, g + 1); const pr = M.buildPrompt(st, st.minds[b.id], 'routine'); ok(/YOUR STANDING among others/.test(pr) && /; standing \d/.test(pr), 'each is told its standing and sees the standing of others');
}
{ // kin, childhood, instincts
  const { w, st, ev, em } = fresh(7); w.creatures = []; const pa = w.agents[0], pb = w.agents[1], g = grass(w, 5);
  ok(w.agents.every(a => SW.stage(w, a) === 'adult'), 'founders are adults');
  at(w, pa, g); at(w, pb, g + 1); let born = null; for (let k = 0; k < 60 && born == null; k++) { [pa, pb].forEach(o => { o.e = 95; o.thirst = 0; o.mateCd = 0; o.policy = []; o.intent = null; }); pa.plan = [{ do: 'mate', name: pb.name, ticks: 3 }]; pb.plan = [{ do: 'mate', name: pa.name, ticks: 3 }]; SW.step(w, e => { em(e); if (e.type === 'birth') born = e.a; }); }
  const kid = w.agents.find(o => o.id === born); ok(kid && SW.stage(w, kid) === 'child', 'a child is born'); kid.age = kid.life * 0.3; kid.x = pa.x; kid.y = pa.y + 1; const n0 = w.agents.length;
  for (let k = 0; k < 40; k++) { [pa, kid].forEach(o => { o.e = 95; o.thirst = 0; o.mateCd = 0; o.policy = []; o.intent = null; }); pa.plan = [{ do: 'mate', name: kid.name, ticks: 3 }]; kid.plan = [{ do: 'mate', name: pa.name, ticks: 3 }]; SW.step(w, em); }
  ok(w.agents.length === n0 && ev.some(e => e.type === 'fail' && /close kin/.test(e.text)), 'parent and grown child cannot have a child together, and are told why');
  kid.age = 10; still(pa); pa.carry = [{ k: 'berry', n: 14 }, { k: 'berry', n: 14 }]; kid.carry = []; kid.policy = [{ if: [], do: 'linger' }]; kid.plan = []; kid.e = 30; kid.x = pa.x + 1; kid.y = pa.y; for (let k = 0; k < 40 && !ev.some(e => e.type === 'fed'); k++) { w.creatures = []; pa.e = 90; kid.e = Math.min(kid.e, 30); kid.x = pa.x + 1; kid.y = pa.y; if (k === 39) console.log('   debug', pa.carry.length, kid.carry.length, kid.e, SW.stage(w, pa), SW.stage(w, kid), JSON.stringify(kid.parents), pa.id, pa.doing, kid.doing); SW.step(w, em); }
  ok(ev.some(e => e.type === 'fed' && e.a === pa.id && e.b === kid.id), 'a parent with food in hand feeds its hungry child without being told to');
  const s = w.agents[2]; at(w, s, g + 3); s.carry = [{ k: 'berry', n: 14 }]; s.e = 15; s.policy = []; s.plan = [{ do: 'goto', x: s.x + 20, y: s.y, ticks: 50 }]; s.intent = null; SW.step(w, em); ok(s.e > 20 && s.carry.length === 0, 'a starving body eats what it carries whatever the plan says');
  s.e = 12; s.carry = [{ k: 'berry', n: 14 }]; s.thirst = 90; const sx = s.x, sy = s.y; SW.step(w, em); ok(s.e > 20, 'and hunger comes before thirst');
  const h = w.agents[3], near = w.agents[4]; at(w, h, g + 4); near.x = h.x + 2; near.y = h.y; still(near); h.policy = []; h.plan = []; h.carry = []; h.e = 26; h.lowFlag = false; for (let k = 0; k < 30 && !ev.some(e => e.type === 'low' && e.a === h.id); k++) { near.e = 90; SW.step(w, em); }
  ok(ev.some(e => e.type === 'low' && e.a === h.id && e.near.indexOf(near.id) >= 0) && st.minds[near.id].events.some(e => /IS STARVING/.test(e.text)), 'the starving are seen by those beside them');
}
{ // tongues, taming, what is worn
  const { w, st, ev, em } = fresh(7); w.laws.ecology.seaReturn = 0; w.creatures = w.creatures.filter(c => !w.laws.creatures[c.sp].predator); const a = w.agents[0], b = w.agents.find(o => o.people !== a.people), g = grass(w, 5); at(w, a, g); at(w, b, g + 1); still(a); still(b);
  a.things.flint = 1; const u0 = SW.understands(b, a.lang); act(w, a, { do: 'give', name: b.name, what: 'flint', ticks: 3 }, em, 3); ok(b.things.flint === 1 && SW.understands(b, a.lang) > u0 + 0.05 && w.tally.crossGifts >= 1, 'a gift across peoples teaches each a little of the other tongue (' + u0 + ' → ' + SW.understands(b, a.lang) + ')');
  const u1 = SW.understands(a, b.lang); for (let k = 0; k < 400; k++) { still(a); still(b); at(w, b, g + 3); at(w, a, g); SW.step(w, em); } ok(SW.understands(a, b.lang) > u1 + 0.05, 'living in sight of each other teaches more (' + u1 + ' → ' + SW.understands(a, b.lang) + ')');
  const c = w.creatures.find(q => q.sp === 'hornback') || w.creatures.find(q => !w.laws.creatures[q.sp].predator); c.x = a.x + 6; c.y = a.y; c.e = 60; c.owner = null; w.creatures = [c]; w.agents.forEach(o => { if (o !== a) { o.x = (a.x + 60) % w.W; o.policy = [{ if: [], do: 'linger' }]; o.plan = []; } }); a.carry = [{ k: 'berry', n: 14 }, { k: 'berry', n: 14 }, { k: 'berry', n: 14 }, { k: 'berry', n: 14 }]; let d0 = SW.cheb(a.x, a.y, c.x, c.y); a.policy = []; a.plan = [{ do: 'tame', ticks: 20 }]; a.intent = null; for (let k = 0; k < 4; k++) { a.e = 90; a.thirst = 0; c.e = 60; SW.step(w, em); }
  ok(SW.cheb(a.x, a.y, c.x, c.y) < d0 && /with food held out/.test(a.doing), 'to tame, a being walks up to the animal with food held out (' + d0 + ' steps → ' + SW.cheb(a.x, a.y, c.x, c.y) + ')');
  still(a); a.things.cloak = 1; for (let k = 0; k < 20; k++) SW.step(w, em); ok(a.worn && a.worn.warmth === 1.6 && SW.boon(a, 'warmth') >= 1.6, 'a cloak held keeps the cold out all the time');
  ok(w.laws.goods.armour.boons.toughness > 1 && w.laws.goods.bow.fight > 1 && w.laws.goods.ram.raze === 3 && w.laws.recipes.bow.way === 'archery' && w.laws.tree.archery && w.laws.tree.armour && w.laws.tree.siegecraft && w.laws.tree.firearms, 'weapons for the hand and for the siege hang on their ways');
  at(w, b, g + 1); at(w, a, g); still(b); b.hp = 100; b.things = {}; b.worn = null; a.rel[b.id] = -1; let dmg1 = 0, dmg2 = 0; for (let k = 0; k < 30; k++) { b.hp = 100; act(w, a, { do: 'attack', target: 'agent', name: b.name, ticks: 1 }, em, 1); dmg1 += 100 - b.hp; at(w, b, g + 1); at(w, a, g); } b.things = { armour: 1 }; for (let k = 0; k < 20; k++) { still(b); at(w, b, g + 1); at(w, a, g); still(a); SW.step(w, em); } for (let k = 0; k < 30; k++) { b.hp = 100; act(w, a, { do: 'attack', target: 'agent', name: b.name, ticks: 1 }, em, 1); dmg2 += 100 - b.hp; at(w, b, g + 1); at(w, a, g); }
  ok(dmg1 > 0 && dmg2 < dmg1 * 0.8, 'armour is felt: thirty blows did ' + Math.round(dmg1) + ' to the bare and ' + Math.round(dmg2) + ' to the armoured');
}
{ // bridges and taking down
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents[1]; let bank = -1; for (let y = 20; y < 70 && bank < 0; y++) for (let x = 4; x < w.W - 8; x++) { const i = y * w.W + x; if (w.terrain[i] !== 0 && w.terrain[i] !== 5 && w.terrain[i + 1] === 0 && w.terrain[i + 2] === 0) { bank = i; break; } }
  at(w, a, bank); a.wood = 9; act(w, a, { do: 'bridge', dir: 'E', ticks: 2 }, em); ok(!w.roads[bank + 1] && ev.some(e => e.type === 'fail' && /do not know how to span/.test(e.text)), 'a bridge needs the way of bridges');
  a.knows.bridges = { look: null }; act(w, a, { do: 'bridge', dir: 'E', ticks: 2 }, em); ok(w.roads[bank + 1] === 2 && a.wood === 6, 'with it, three wood lay a span over deep water');
  at(w, b, bank); b.things = {}; act(w, b, { do: 'goto', x: (bank % w.W) + 1, y: Math.floor(bank / w.W), ticks: 4 }, em, 4); ok(b.x === (bank % w.W) + 1 && w.terrain[b.y * w.W + b.x] === 0, 'and one with no vessel can walk out on it');
  const g = grass(w, 2); at(w, a, g); a.wood = 20; a.stone = 20; act(w, a, { do: 'build', what: 'hall', ticks: 2 }, em); const w0 = a.wood, s0 = a.stone; act(w, a, { do: 'dismantle', ticks: 2 }, em); ok(!w.shelters[g] && a.wood === w0 + 3 && a.stone === s0 + 1, 'what one built can be taken down for half its wood and stone');
}
{ // the old workings weaken; the land wears and mends; deep deposits
  const { w, st, ev, em } = fresh(7); const f0 = SW.magicFactor(w), c0 = SW.castCost(w, 3, 2); w.agents[0].knows.science = { look: null }; w.eraT = null; const f1 = SW.magicFactor(w), c1 = SW.castCost(w, 3, 2);
  ok(f0 === 1 && f1 < 0.6 && c1 > c0 * 1.5, 'where the fourth age of knowledge is reached, working the world costs far more (' + c0 + ' → ' + c1 + ')');
  const c = w.creatures.find(q => !w.laws.creatures[q.sp].predator), s = w.laws.creatures[c.sp]; let pi = -1; for (let i = 0; i < w.plants.length; i++) { const p = w.plants[i]; if (p && w.laws.plants[p.sp].nutrition > 0 && w.fert[i] > 0.4) { pi = i; break; } } w.creatures = [c]; const fert0 = w.fert[pi];
  for (let k = 0; k < 60; k++) { c.x = pi % w.W; c.y = Math.floor(pi / w.W); c.e = 5; w.plants[pi].food = 5; w.plants[pi].g = 1; SW.step(w, em); } const fert1 = w.fert[pi]; w.creatures = []; for (let k = 0; k < 2400; k++) SW.step(w, em);
  ok(fert1 < fert0 - 0.05 && w.fert[pi] > fert1, 'grazed ground wears (' + fert0 + ' → ' + fert1 + ') and mends when left (' + w.fert[pi] + ')');
  const big = Object.values(w.lodes).filter(l => l.n >= 400).length, hid = Object.values(w.lodes).filter(l => l.k === 'oil' || l.k === 'uranium').length; ok(big >= 6 && hid >= 1, big + ' great deposits that will not soon give out; ' + hid + ' of oil or uranium lie hidden until the sciences can see them');
  const oi = Object.keys(w.lodes).find(i => w.lodes[i].k === 'oil' || w.lodes[i].k === 'uranium'), a = w.agents[1]; a.x = oi % w.W; a.y = Math.floor(oi / w.W); ok(!SW.look(w, a).lodes.some(l => l.k === 'oil' || l.k === 'uranium'), 'one without the sciences does not see them'); a.knows.science = { look: null }; ok(SW.look(w, a).lodes.some(l => l.k === 'oil' || l.k === 'uranium'), 'one with them does');
  const T = w.laws.tree, bad = []; Object.keys(T).forEach(k => T[k].needs.forEach(q => { if (!T[q] || T[q].era > T[k].era) bad.push(k); })); ok(Object.keys(T).length >= 68 && !bad.length && T.physics && T.chemistry && T.biology && T.atomics && T.quantum && T.nuclear.needs.indexOf('atomics') >= 0, Object.keys(T).length + ' ways in six ages, with the sciences in generations beneath the far ones');
}
{ // a community learns
  const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents[1], c = w.agents[2], g = grass(w, 3); at(w, a, g); at(w, b, g + 1); still(b); a.mateT = w.tick; a.policy = []; a.plan = []; a.carry = []; a.e = 0.2; w.plants[g] = null;
  w.laws.culture.succour = 0; /* no one feeds them, and the body is already failing: an empty body no longer dies at once */
  for (let k = 0; k < 10 && !ev.some(e => e.type === 'death'); k++) { a.e = Math.min(a.e, 0.05); a.hp = Math.min(a.hp, 0.2); a.carry = []; SW.step(w, em); }
  const ls = (st.minds[b.id].lessons || []).map(q => q.text).join(' | '); ok(/starved/.test(ls) && /after making a child/.test(ls), 'a death and how it came is learned by the community: ' + ls.slice(0, 170));
  ok(/WHAT HAS BEFALLEN OTHERS/.test(M.buildPrompt(st, st.minds[b.id], 'routine')), 'and stands in their minds');
  const far = w.agents.find(o => o.people === b.people && o !== b && !(st.minds[o.id].lessons || []).length) || c; st.minds[far.id].lessons = []; at(w, far, g + 2); far.lang = b.lang; for (let k = 0; k < 170; k++) { still(b); still(far); at(w, far, g + 2); at(w, b, g + 1); SW.step(w, em); M.tick(st); }
  ok((st.minds[far.id].lessons || []).some(q => /starved/.test(q.text) && q.from === b.name), 'it passes by word of mouth to one who was not there');
  const m = st.minds[b.id]; m.tales = [{ title: 'The Long Winter', text: 'Three of us went north. Two came back. The snow kept one.', by: b.name, day: 1, kind: 'song', about: c.name }]; const sung0 = c.sung || 0;
  const d = w.agents.find(o => o.people === b.people && o !== b && o !== far) || far; at(w, b, g + 1); at(w, far, g + 2); at(w, d, g); d.lang = b.lang; st.minds[far.id].tales = []; st.minds[d.id].tales = []; m.tales = [];
  M.apply(st, m, 'deep', { thought: 'x', tale: { title: 'The Long Winter', kind: 'song', about: c.name, text: 'Three of us went north. Two came back. The snow kept one. We sing it so no one goes north alone.' } }, {});
  ok(m.tales.length === 1 && m.tales[0].kind === 'song' && m.tales[0].about === c.name && (c.sung || 0) === sung0 + 1, 'a song can be made about someone, and adds to their renown');
  b.knows.lorekeeping = { look: null }; M.apply(st, m, 'routine', { thought: 'x', teach: { to: far.name, tale: 'The Long Winter' } }, {});
  const got = (st.minds[far.id].tales || [])[0], over = (st.minds[d.id].tales || [])[0];
  ok(got && got.gen === 1 && got.kind === 'song' && got.from === b.name && b.stats.told === 1 && over && (c.sung || 0) >= sung0 + 2, 'told by one who keeps lore, it reaches the one it is told to and everyone in earshot, and its subject is sung of more widely (' + c.sung + ')');
  let changed = 0; for (let k = 0; k < 40; k++) { st.minds[far.id].tales = []; st.minds[d.id].tales = []; M.apply(st, m, 'routine', { thought: 'x', teach: { to: far.name, tale: 'The Long Winter' } }, {}); if ((st.minds[far.id].tales[0] || {}).text !== m.tales[0].text) changed++; }
  ok(changed > 5 && changed < 36, 'a tale changes in some mouths and not in others (' + changed + ' of 40 tellings differed)');
}
{ // the maker
  const { w, st, em } = fresh(7); const ideas = st.maker.ideas.length ? st.maker.ideas : (K.ensure(st), st.maker.ideas);
  ok(ideas.filter(q => /^\[NOW/.test(q.text)).length >= 5 && ideas.filter(q => /^\[NEXT/.test(q.text)).length >= 5 && ideas.filter(q => /^\[FAR|^\[LAST|^\[LATER/.test(q.text)).length >= 8, 'the roadmap is in the maker\'s notebook in order: ' + ideas.filter(q => /^\[/.test(q.text)).length + ' sequenced items');
  ok(st.maker.heritage.ops.length >= 22, 'the world begins with ' + st.maker.heritage.ops.length + ' changes that earlier makers kept (yarrok: ' + !!w.laws.creatures.yarrok + ', wool ' + (w.laws.creatures.yarrok || {}).wool + ')');
  const R = w.regions[2]; const r1 = K.applyOp(w, { op: 'site', name: 'Test Spring', kind: 'spring', land: R.name, r: 2, fx: [{ on: 'joy', by: 0.2 }] }); const q1 = w.sites.find(z => z.name === 'Test Spring'); ok(r1.ok && w.region[q1.y * w.W + q1.x] === R.id, 'a place of power can be put in a named land');
  const a = w.agents[0]; const r2 = K.applyOp(w, { op: 'site', name: 'Near Stone', kind: 'stone', near: a.name, r: 2, fx: [{ on: 'joy', by: 0.2 }] }); const q2 = w.sites.find(z => z.name === 'Near Stone'); ok(r2.ok && SW.cheb(q2.x, q2.y, a.x, a.y) <= 6 && SW.cheb(q2.x, q2.y, a.x, a.y) >= 3, 'or a few steps from someone');
  ok(K.applyOp(w, { op: 'law', group: 'status', key: 'leadNeeds', value: 0.8 }).ok && w.laws.status.leadNeeds === 0.8, 'the maker can tune what standing takes');
  for (let i = 0; i < 100; i++) { SW.step(w, em); M.tick(st); } const s = K.stats(st); ok(s.camps.length >= 3 && Object.keys(s.stepsBetweenPeoples).length === 3 && s.standing.length && typeof s.landsVisited === 'string' && s.acrossPeoples && s.ageOfTheWorld === 1 && s.powerOfTheOldWorkings === 1, 'it sees where each people is, how far apart, who stands highest, who has wandered, and what crossed between peoples');
  ok(st.settings.budget === 3000 && st.settings.endless === false && st.settings.autoWake === true, 'the budget is 3,000 thoughts, with a setting to keep thinking past it');
}
{ // the long run on instinct
  for (const seed of [7, 11, 42]) { const w = SW.createWorld(seed); const d = {}; for (let k = 0; k < 7200; k++) SW.step(w, e => { if (e.type === 'death') d[e.cause] = (d[e.cause] || 0) + 1; }); ok(w.agents.length >= 7 && w.creatures.length >= 60, 'seed ' + seed + ': 30 days without minds: ' + w.agents.length + ' of 12 alive, ' + w.creatures.length + ' animals, deaths ' + JSON.stringify(d)); }
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
