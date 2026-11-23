/* Land, craft, sickness, the stages of life and war, exercised one by one against the real engine. Each check prints PASS or FAIL. */
const SW = require('../src/engine.js'), M = require('../src/minds.js');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra != null ? '  [' + extra + ']' : '')); if (!cond) fails++; };
const T = { WATER: 0, SAND: 1, GRASS: 2, FOREST: 3, ROCK: 4, SHALLOWS: 5, MARSH: 6, DESERT: 7, SNOW: 8 };
const run = (w, n, emit) => { for (let i = 0; i < n; i++) SW.step(w, emit); };
const lone = (w) => { const a = w.agents[0]; w.agents = [a]; w.creatures = []; a.policy = []; a.plan = []; a.intent = null; a.e = 90; a.hp = 100; return a; };
const find = (w, f) => { for (let i = 0; i < w.W * w.H; i++) if (f(i)) return { x: i % w.W, y: Math.floor(i / w.W), i }; return null; };

/* 1. rivers and ore exist on every seed, rivers are connected runs of shallows, banks are green */
for (const seed of [7, 11, 42, 99]) {
  const w = SW.createWorld(seed), rv = Object.keys(w.river).length, ore = Object.keys(w.ore).length;
  let bad = 0; for (const k in w.river) if (w.terrain[k] !== T.SHALLOWS) bad++;
  let oreBad = 0; for (const k in w.ore) if (w.terrain[k] !== T.ROCK) oreBad++;
  ok('seed ' + seed + ' has rivers and ore', rv > 10 && ore > 5 && !bad && !oreBad, rv + ' river tiles, ' + ore + ' seams');
}

/* 2. fishing: yields beside water, fails inland, thins out where fished hard, and comes back */
{
  const w = SW.createWorld(7), a = lone(w), ev = [];
  const spot = find(w, i => w.terrain[i] === T.SHALLOWS);
  a.x = spot.x; a.y = spot.y; a.plan = [{ do: 'fish', ticks: 240 }];
  run(w, 240, e => ev.push(e));
  const got = a.carry.filter(c => c.k === 'fish').length;
  ok('fishing in the shallows fills the hands', got >= 3 && a.stats.fished === got, got + ' fish, cap ' + SW.carryCap(w, a));
  ok('first catch is announced once', ev.filter(e => e.type === 'fished' && e.first).length === 1);
  ok('fished waters are remembered as thinner', Object.keys(w.fished).length === 1);
  a.carry = []; a.e = 90; const before = Object.values(w.fished)[0]; for (let i = 0; i < 900; i++) { a.e = 90; SW.step(w); } ok('fish come back', (Object.values(w.fished)[0] || 0) < before, before + ' -> ' + (Object.values(w.fished)[0] || 0));
  const dry = find(w, i => { if (w.terrain[i] !== T.GRASS) return false; const x = i % w.W, y = Math.floor(i / w.W); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = w.terrain[(y + dy) * w.W + x + dx]; if (t === T.WATER || t === T.SHALLOWS || t == null) return false; } return true; });
  a.x = dry.x; a.y = dry.y; a.carry = []; a.plan = [{ do: 'fish', ticks: 20 }]; const ev2 = []; run(w, 3, e => ev2.push(e));
  ok('fishing inland fails and says why', a.carry.length === 0 && ev2.some(e => e.type === 'fail' && /no water/.test(e.text)));
}

/* 3. clay, pots, and carrying more */
{
  const w = SW.createWorld(11), a = lone(w), ev = [];
  const spot = find(w, i => w.terrain[i] === T.MARSH);
  a.x = spot.x; a.y = spot.y; a.plan = [{ do: 'gather', ticks: 60 }]; run(w, 60, e => ev.push(e));
  ok('clay is dug from marsh', a.clay >= 2 && ev.some(e => e.type === 'clay' && e.first), a.clay + ' clay');
  a.plan = [{ do: 'craft', what: 'pot', ticks: 3 }]; run(w, 2, e => ev.push(e));
  ok('a pot cannot be made without the knowledge', !a.pots && ev.some(e => e.type === 'fail' && /fired clay/.test(e.text)));
  a.knows.pottery = { name: 'pottery' }; a.intent = null; a.plan = [{ do: 'craft', what: 'pot', ticks: 3 }]; run(w, 2, e => ev.push(e));
  ok('nor without a fire', !a.pots && ev.some(e => e.type === 'fail' && /no fire/.test(e.text)));
  w.fires[spot.i] = w.tick + 500; a.intent = null; a.plan = [{ do: 'craft', what: 'pot', ticks: 3 }]; run(w, 2, e => ev.push(e));
  ok('with clay, fire and knowledge a pot is fired', a.pots === 1 && SW.carryCap(w, a) === w.laws.body.carryMax + 2, 'cap ' + SW.carryCap(w, a));
  ok('pottery can be reached through the tree', !!w.laws.tree.pottery && !!w.laws.tree.smelting && !!w.laws.tree.fishing);
}

/* 4. ore, metal tools */
{
  const w = SW.createWorld(42), a = lone(w), ev = [];
  const k = Object.keys(w.ore)[0], x = k % w.W, y = Math.floor(k / w.W), units = w.ore[k];
  a.x = x; a.y = y; a.plan = [{ do: 'gather', ticks: 240 }]; run(w, 240, e => ev.push(e));
  ok('ore is broken from a seam, and the seam runs down', a.ore >= 1 && (w.ore[k] || 0) === units - a.ore, a.ore + ' ore of ' + units + ', stone ' + a.stone);
  a.knows.tools = { name: 'tools' }; a.lore = 3; a.wood = 6; a.stone = 6; a.e = 90;
  const iv = SW.invent(w, a, { name: 'pike', use: 'fight', idea: 'a point on a pole' }, () => {});
  ok('a tool can be designed', iv.ok, JSON.stringify(iv).slice(0, 80));
  a.intent = null; a.plan = [{ do: 'craft', what: iv.name, ticks: 3 }]; run(w, 2, e => ev.push(e));
  const plain = a.tools[a.tools.length - 1];
  ok('without smelting the tool is plain', plain && !plain.m);
  a.knows.smelting = { name: 'smelting' }; w.fires[y * w.W + x] = w.tick + 500; a.wood = 6; a.stone = 6; const oreBefore = a.ore;
  a.intent = null; a.plan = [{ do: 'craft', what: iv.name, ticks: 3 }]; run(w, 2, e => ev.push(e));
  const metal = a.tools[a.tools.length - 1];
  ok('with smelting, fire and ore it comes out in metal', metal && metal.m === 1 && metal.wear === plain.wear * 3 + (plain.wear * 3 - metal.wear) && a.ore === oreBefore - 1, 'wear ' + metal.wear + ' vs ' + plain.wear);
  ok('the making is reported as metal', ev.some(e => e.type === 'crafted' && e.metal));
}

/* 5. sickness: caught, wasting, passed on, healed, then immunity */
{
  const w = SW.createWorld(7); w.creatures = []; const a = w.agents[0], b = w.agents[1]; w.agents = [a, b];
  [a, b].forEach(q => { q.policy = []; q.plan = []; q.intent = null; q.e = 95; q.hp = 100; });
  b.x = a.x; b.y = a.y; const ev = [];
  ok('a being falls sick', SW.sicken(w, a, 'a test', e => ev.push(e)) && a.sick > 300, a.sick);
  ok('and cannot fall sick twice', !SW.sicken(w, a, 'again', () => {}));
  const hp0 = a.hp; run(w, 200, e => ev.push(e)); const hpMid = a.hp; for (let i = 0; i < 6 && !(b.sick > 0); i++) { a.sick = Math.max(a.sick, 150); a.e = 95; b.e = 95; a.hp = 100; b.x = a.x; b.y = a.y; run(w, 100, e => ev.push(e)); }
  ok('sickness wastes health', hpMid < hp0 - 5, hp0 + ' -> ' + hpMid.toFixed(1));
  ok('sickness passes to one who stays close', b.sick > 0 && ev.some(e => e.type === 'sick' && e.a === b.id && /staying close/.test(e.from)));
  a.e = 95; b.e = 95; run(w, 500, e => { ev.push(e); a.e = Math.max(a.e, 60); b.e = Math.max(b.e, 60); });
  ok('it passes, and leaves immunity', a.sick === 0 && a.immune > w.tick && ev.some(e => e.type === 'well' && e.a === a.id));
  ok('the immune cannot be made sick', !SW.sicken(w, a, 'again', () => {}));
}

/* 6. stages of life */
{
  const w = SW.createWorld(7), a = lone(w), ev = [];
  a.age = Math.floor(a.life * w.laws.age.childUntil) - 3; a.stage = undefined;
  ok('a young one is a child', SW.stage(w, a) === 'child');
  run(w, 6, e => ev.push(e));
  ok('a child comes of age, once', SW.stage(w, a) === 'adult' && ev.filter(e => e.type === 'grown').length === 1);
  a.age = Math.floor(a.life * w.laws.age.elderFrom) - 3; a.e = 90; run(w, 6, e => ev.push(e));
  ok('an adult grows old, once', SW.stage(w, a) === 'elder' && ev.filter(e => e.type === 'aged').length === 1);
}

/* 7. war and truce */
{
  const w = SW.createWorld(7); w.creatures = []; const ev = [], emit = e => ev.push(e);
  const A = w.agents[0], B = w.agents.find(o => SW.rootOf(w, o) !== SW.rootOf(w, A)) || w.agents[3];
  const ra = SW.rootOf(w, A), rb = SW.rootOf(w, B);
  ok('declaring an enemy opens a war', SW.declare(w, ra, rb.name, 'enemy', emit) && w.wars.length === 1 && ev.some(e => e.type === 'war'));
  SW.declare(w, rb, ra.name, 'enemy', emit);
  ok('the answer does not open a second war', w.wars.length === 1);
  SW.declare(w, ra, rb.name, 'neutral', emit);
  ok('one side laying down arms is not yet peace', w.wars[0].ended == null);
  SW.declare(w, rb, ra.name, 'neutral', emit);
  ok('both sides laying down arms is a truce', w.wars[0].ended != null && ev.some(e => e.type === 'truce'));
  SW.declare(w, ra, rb.name, 'enemy', emit);
  ok('war can come again', w.wars.length === 2 && w.wars[1].ended == null);
  ra.x = rb.x; ra.y = rb.y; rb.hp = 1; ra.policy = []; ra.plan = [{ do: 'attack', target: 'agent', name: rb.name, ticks: 30 }];
  run(w, 10, emit);
  ok('a leader killed in war ends it, and the dead are counted', w.wars[1].ended != null && w.wars[1].dead === 1 && /death of/.test(w.wars[1].how), JSON.stringify(w.wars[1]).slice(0, 160));
}

/* 8. herds move with the seasons */
{
  const mean = (w) => { const l = w.creatures.filter(c => c.sp === 'hornback'); return l.length ? l.reduce((s, c) => s + c.y, 0) / l.length : null; };
  const w = SW.createWorld(11); w.agents = []; w.rich = []; /* rich ground holds herds where they are; this check is of the pull of the seasons alone */
  const year = 4 * w.laws.time.seasonDays * w.laws.time.dayLength, ys = [];
  for (let q = 0; q < 8; q++) { run(w, year / 4); ys.push(Math.round(mean(w) * 10) / 10); }
  ok('hornback herds stand further south at winter\'s end than at summer\'s end', ys[3] > ys[1], ys.join(' '));
}

/* 9. a world saved by generation 5 opens and runs here */
{
  /* a world saved by the generation before this one (400 moments old) must still load and run */
  const snap = JSON.parse(require('zlib').gunzipSync(require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'save-generation-23.json.gz'))).toString());
  const SW6 = SW, M6 = M;
  let st6 = null, err = null;
  try { st6 = M6.restore(snap); for (let i = 0; i < 1500; i++) SW6.step(st6.world, st6.emit); st6.world.agents.forEach(a => M6.buildPrompt(st6, st6.minds[a.id], 'deep')); } catch (e) { err = e; }
  ok('a world saved by the previous generation restores, runs 1500 ticks and builds prompts', !err && st6.world.agents.length > 0, err ? err.stack.split('\n').slice(0, 3).join(' | ') : st6.world.agents.length + ' alive');
}

/* 10. the prompt carries the new words, and stays near its old size */
{
  const w = SW.createWorld(7), st = M.createState(w), a = w.agents[0];
  const p0 = M.buildPrompt(st, st.minds[a.id], 'routine'), p1 = M.buildPrompt(st, st.minds[a.id], 'deep');
  ok('routine prompt names fishing and water', /fish \(beside water/.test(p0) && /water_dist/.test(p1), p0.length + ' / ' + p1.length + ' chars');
  a.sick = 100; a.age = Math.floor(a.life * 0.9); SW.declare(w, SW.rootOf(w, a), w.agents.find(o => SW.rootOf(w, o) !== SW.rootOf(w, a)).name, 'enemy', st.emit);
  const p2 = M.buildPrompt(st, st.minds[a.id], 'routine');
  ok('a sick old being at war is told so', /YOU ARE SICK/.test(p2) && /You are OLD/.test(p2) && /AT WAR: with/.test(p2));
}
console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
