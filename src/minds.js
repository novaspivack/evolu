/* Required Notice: Copyright (c) 2026 Nova Spivack (https://github.com/novaspivack/evolu)
   Evolu is licensed under the PolyForm Noncommercial License 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0

   Evolu minds: each being's thinking is a call to Claude.
   Between thoughts the body runs on reflexes the mind wrote. A thought can speak, set an intent,
   remember, and (on deep reflection) rewrite its own reflexes, creed, memory and designs. */
(function (root) {
'use strict';
const SW = root.SW || (typeof require !== 'undefined' ? require('./engine.js') : null);
const M = {};

M.MODELS = [
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (fast, light)', tier: 'quick' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 (balanced)', tier: 'default' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5 (deepest)', tier: 'complex' }
];
M.defaultSettings = function () {
  return {
    v: 10, autoWake: true, sound: true,
    routine: { model: 'claude-sonnet-5-5', effort: '' },
    deep: { model: 'claude-sonnet-5-5', effort: 'medium' },
    perMinute: 24, parallel: 4, budget: 3000, endless: false, reflectEvery: 4, foresight: true, record: true,
    story: { model: 'claude-sonnet-5-5', effort: 'medium', every: 3 },
    maker: { on: true, model: 'claude-opus-5-5', effort: 'high', every: 4 }
  };
};

function clip(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function agentById(w, id) { for (let k = 0; k < w.agents.length; k++) if (w.agents[k].id === id) return w.agents[k]; return null; }
M.agentById = agentById;

/* ---------- creating minds ---------- */
M.makeCreed = function (t) {
  const p = [];
  p.push(t.bold > 0.62 ? 'I take what I need and I do not back down.' : t.bold < 0.35 ? 'I am careful. I leave before trouble finds me.' : 'I weigh a risk before I take it.');
  p.push(t.sociable > 0.62 ? 'I am better with others near: I talk, I share news, I make allies.' : t.sociable < 0.35 ? 'I keep to myself and trust slowly.' : 'I deal fairly with those who deal fairly with me.');
  if (t.curious > 0.62) p.push('I want to know how this world works, and I test things to find out.');
  else if (t.curious < 0.35) p.push('I keep to what has already worked.');
  if (t.gentle > 0.62) p.push('I will not harm another of my kind unless my life depends on it.');
  else if (t.gentle < 0.35) p.push('Others are rivals for food until they prove useful to me.');
  if (t.honest < 0.3) p.push('I say whatever serves me; the truth is only one tool among others.');
  else if (t.honest > 0.7) p.push('My word is good, and I despise liars.');
  if (t.greedy > 0.65) p.push('I want more than my share, and I mean to have it.');
  else if (t.greedy < 0.25) p.push('I need little and I take little.');
  if (t.bold > 0.62 && t.sociable > 0.55) p.push('Others should follow me.');
  p.push('Above all, I mean to stay alive.');
  return p.join(' ');
};
M.newMind = function (a, o) {
  o = o || {};
  return {
    id: a.id, name: a.name, hue: a.hue, gen: a.gen, parents: a.parents || [], born: a.born || 0,
    creed: o.creed || M.makeCreed(a.temperament), creedHistory: [], policyHistory: [],
    notes: o.notes || [], events: [], log: [], urge: o.urge != null ? o.urge : 2 + (a.id % 5),
    thoughts: 0, sinceDeep: 0, wantDeep: false, busy: false, stream: '', rev: 0, dead: false,
    foods: o.foods || {}, said: [], heard: [], watched: {}, act: {}, actN: 0, e0: a.e, strips: 0, life: [], aim: '', method: o.method || ''
  };
};
M.createState = function (world, settings) {
  const st = {
    world: world, minds: {}, names: {}, chron: [], voices: [], settings: settings || M.defaultSettings(),
    used: 0, inflight: 0, lastStart: 0, on: false, sample: null, toolsOK: true, notice: '', blocked: '',
    errStreak: 0, ui: function () {}
  };
  world.agents.forEach(function (a) { st.minds[a.id] = M.newMind(a); st.names[a.id] = a.name; st.minds[a.id].life.push({ tick: 0, text: 'I woke in this land, among strangers, knowing nothing of it.' }); });
  st.runId = 'r' + world.seed + '-' + Date.now().toString(36);
  st.rec = { all: [], sent: 0, chunk: 0 };
  st.story = { chapters: [], threads: [], trends: [], tally: {}, last: 0, lastDay: 1, stats: null };
  st.maker = { ideas: [], log: [], lessons: [], requests: [], lastDay: 1, n: 0, seen: '' };
  st.emit = function (ev) { M.onEvent(st, ev); };
  return st;
};
function nameOf(st, id) { return id < 0 ? 'no one (it is a cave)' : st.names[id] || 'someone'; }

/* ---------- the run record: everything worth reading back later, kept in order ---------- */
M.record = function (st, item) {
  const R = st.rec = st.rec || { all: [], sent: 0, chunk: 0 };
  item.tick = st.world.tick; item.day = SW.day(st.world);
  R.all.push(item);
  if (R.all.length > 30000) { R.all.splice(0, 5000); R.sent = Math.max(0, R.sent - 5000); }
};
M.digest = function (st) {
  const w = st.world;
  return {
    run: st.runId, generation: 15, seed: w.seed, culture: (function () { const C = w.culture || { items: {} }, out = []; for (const id in C.items) { const it = C.items[id], lv = M.cultLive(st, it); if (it.kind === 'lesson' && lv.n < 2) continue; out.push({ kind: it.kind, title: it.title, text: it.kind === 'way' ? '' : it.text, by: it.by, day: it.day, held: lv.n, ever: Object.keys(it.holders).length, peoples: Object.keys(it.reach).length, passed: it.tellings, changed: it.changed }); } out.sort(function (x, y) { return y.ever - x.ever; }); return { ideas: out.slice(0, 40), log: (C.log || []).slice(-60), rites: C.rites || {}, relics: (w.relics || []).slice(-30), faiths: w.faiths || {} }; })(), tick: w.tick, day: SW.day(w), season: SW.SEASONS[SW.season(w)], weather: w.weather.kind, thoughts: st.used, settings: st.settings,
    peoples: (w.peoples || []).map(function (P) { return { name: P.name, noun: P.noun, kind: P.kind, way: P.way, custom: P.custom, land: P.region != null && w.regions[P.region] ? w.regions[P.region].name : '', alive: w.agents.filter(function (a) { return a.people === P.id; }).length }; }), lands: (w.regions || []).map(function (R) { return { name: R.name, biome: R.biome, minerals: R.minerals || [], beings: w.agents.filter(function (a) { return w.region[a.y * w.W + a.x] === R.id; }).length }; }), tally: w.tally || {}, alive: w.agents.length, creatures: w.creatures.length, plants: w.plants.filter(Boolean).length, wars: w.wars, settlements: w.settlements.map(function (q) { return q.name; }), ways: Object.keys(w.laws.tree).filter(function (k) { return w.agents.some(function (a) { return a.knows[k]; }); }), designs: Object.keys(w.laws.tools),
    beings: Object.keys(st.minds).map(function (id) {
      const m = st.minds[id], a = agentById(w, +id);
      return { id: +id, name: m.name, dead: !!m.dead, cause: m.cause || '', gen: m.gen, thoughts: m.thoughts, creed: m.creed, aim: m.aim, method: m.method, feeling: m.feeling || '', wonder: m.wonder || '', rut: m.rut || 0, notes: m.notes, life: m.life.map(function (e) { return e.text; }), foods: Object.keys(m.foods), ties: m.ties || {},
        body: a ? { e: Math.round(a.e), hp: Math.round(a.hp), age: Math.round(100 * a.age / a.life), x: a.x, y: a.y, stage: SW.stage(w, a), sick: a.sick > 0, temperament: a.temperament, mood: a.mood, rel: a.rel, stats: a.stats, knows: Object.keys(a.knows), designs: Object.keys(a.designs), tools: a.tools.map(function (q) { return q.k; }), carry: a.carry.map(function (q) { return q.k; }), wood: a.wood, stone: a.stone, lore: a.lore, arts: a.arts, leader: a.leader, band: a.bandName, habits: a.habits, policy: a.policy, plan: a.plan, doing: a.doing } : null };
    })
  };
};
M.README = 'TO CLAUDE, OR ANY AGENT HANDED THIS FILE. This is the complete record of one run of Evolu (called Seedworld before generation 14), a self-modifying world simulation by Nova Spivack that lives as a Claude artifact titled "Evolu" (slug be8f1f8f-42db-4703-ac0d-c3e87d04f447; its files are index.html, engine.js, minds.js, maker.js, audio.js, ui.js). The source of record is https://github.com/novaspivack/evolu : the same six files under src/, the tests under tests/, and README.md, ROADMAP.md and docs/design-log.md, which say how the work is done and what has been tried. Its owner wants every run to produce the next generation of the world, without having to explain that each time. So, when you are given this file, do the following without being asked. ' +
  '1. ANALYSE with code, not by skimming: "records" holds every thought (t: thought, with drives, plan, state), everything said (voice), the world\'s own chronicle (chron), sampled full prompts with raw replies (prompt), failures (failed), the chronicler\'s chapters (story), the maker\'s visits (maker) and its requests to the programmer (request). "digest" is the final state of every being. "story" and "maker" are the outer loop\'s own state. Count things; quote the record; say what worked and what is still wrong, with numbers. ' +
  '2. LEARN from the maker: read its visits, its predictions against what happened, its lessons, and above all its REQUESTS, which are things it could not build from its own parts and is asking the programmer for. ' +
  '3. BUILD the next generation: read the artifact\'s current files, make the code changes the analysis and the requests call for (and items from the owner\'s roadmap, kept in the maker\'s idea list under "maker.ideas"), test them (tests/run-all.sh), and publish a new version of the same artifact. Keep saves from the previous generation loading. Then commit the generation to the repository and push it, with ROADMAP.md and docs/design-log.md brought up to date. ' +
  '4. PRESERVE THE WORLD\'S HERITAGE: "heritage" lists every change the maker made and kept, with its lessons and ideas. Fold these into K.HERITAGE in maker.js so that the next world begins with them already in place and no maker has to rediscover them. Drop only what the record shows did harm. ' +
  '5. REPORT to the owner plainly: what the run showed, what you changed and why, what you verified and what you could not. If the owner keeps a design log, update it. ' +
  'The design rule for everything: open and emergent. Make things possible; never script outcomes. The beings must discover what is possible for themselves.';
M.exportRun = function (st) { return { _READ_ME_FIRST: M.README, digest: M.digest(st), story: st.story, maker: st.maker, heritage: null, records: st.rec ? st.rec.all : [], chronicle: st.chron, voices: st.voices }; };

/* ---------- what has passed between two beings: each keeps its own account of the other ---------- */
function tie(st, me, other, text) {
  const m = st.minds[me]; if (!m || other == null || me === other) return;
  const T = m.ties = m.ties || {}, list = T[other] = T[other] || [], last = list[list.length - 1], day = SW.day(st.world);
  if (last && last.text === text) { last.n = (last.n || 1) + 1; last.day = day; return; }
  list.push({ day: day, text: text });
  if (list.length > 9) list.splice(1, 1); /* the first meeting stays; then the latest eight */
}
function ties(st, ev) {
  switch (ev.type) {
    case 'saw': if (ev.first) tie(st, ev.a, ev.b, 'you first met'); break;
    case 'said': {
      const to = ev.to && ev.to !== 'all' ? String(ev.to).toLowerCase() : 'all'; let toId = null;
      (ev.hearers || []).forEach(function (id) { const mine = nameOf(st, id).toLowerCase() === to; if (mine) toId = id; const hr = agentById(st.world, id), sk = agentById(st.world, ev.a), tx = hr && sk ? SW.garble(st.world, ev.text, sk.lang, SW.understands(hr, sk.lang)) : ev.text; if (mine || to === 'all') tie(st, id, ev.a, (mine ? 'they said to you: "' : 'they said to everyone: "') + clip(tx, 110) + '"'); });
      if (toId != null) tie(st, ev.a, toId, 'you said to them: "' + clip(ev.text, 110) + '"');
      break;
    }
    case 'gave': tie(st, ev.b, ev.a, 'they GAVE you ' + ev.item); tie(st, ev.a, ev.b, 'you gave them ' + ev.item); break;
    case 'traded': tie(st, ev.a, ev.b, 'you traded with them: gave ' + ev.gave + ', got ' + ev.got); tie(st, ev.b, ev.a, 'you traded with them: gave ' + ev.got + ', got ' + ev.gave); break;
    case 'offer': tie(st, ev.b, ev.a, 'they offered you one ' + ev.give + ' for one ' + ev.want); break;
    case 'stole':
      if (ev.seen) tie(st, ev.b, ev.a, ev.ok ? 'they STOLE ' + ev.item + ' from you, and you saw it' : 'you caught them trying to steal from you');
      tie(st, ev.a, ev.b, ev.ok ? 'you stole ' + ev.item + ' from them' + (ev.seen ? ', and they saw' : ', unseen') : 'you tried to steal from them and were caught');
      break;
    case 'attack': tie(st, ev.b, ev.a, 'they ATTACKED you'); tie(st, ev.a, ev.b, 'you attacked them'); break;
    case 'healed': if (ev.a !== ev.b) { tie(st, ev.b, ev.a, 'they tended your wounds'); tie(st, ev.a, ev.b, 'you tended their wounds'); } break;
    case 'pledged': tie(st, ev.a, ev.b, 'you pledged to follow them'); tie(st, ev.b, ev.a, 'they pledged to follow you'); break;
    case 'broke': tie(st, ev.a, ev.b, 'you broke from them'); tie(st, ev.b, ev.a, 'they left your following'); break;
    case 'taught': tie(st, ev.b, ev.a, 'they taught you' + (ev.art ? ' the art of ' + ev.art : ' something they knew')); tie(st, ev.a, ev.b, 'you taught them' + (ev.art ? ' the art of ' + ev.art : ' something you knew')); break;
    case 'court': tie(st, ev.b, ev.a, 'they courted you, wanting a child with you'); tie(st, ev.a, ev.b, 'you courted them'); break;
  }
}
M.tiesOf = function (mind, id) { return (mind.ties && mind.ties[id]) || []; };

/* two thoughts are the same thought if they share most of their meaningful words */
const STOP2 = {}; 'this that with have will from them they their then than what when here there before first while keep more into about would could should still just only been being because your mine myself where which food hand hands step steps'.split(' ').forEach(function (k) { STOP2[k] = 1; });
function bag(t) { const o = {}; String(t || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).forEach(function (k) { if (k.length > 3 && !STOP2[k]) o[k] = 1; }); return o; }
function overlap(a, b) { const A = bag(a), B = bag(b); let both = 0, all = 0; for (const k in A) { all++; if (B[k]) both++; } for (const k in B) if (!A[k]) all++; return all ? both / all : 0; }
M.overlap = overlap;

/* ---------- what presses on a being: the forces under its thoughts, strongest first ---------- */
M.drives = function (st, mind, a, v) {
  const w = st.world, t = a.temperament, md = a.mood, out = [];
  const DW = w.laws.drives || {};
  const add = function (k, s, text) { s *= DW[k] == null ? 1 : DW[k]; if (s > 0.14) out.push({ k: k, s: Math.min(1, Math.round(s * 100) / 100), raw: s, text: text }); };
  const good = a.carry.filter(function (c) { return a.habits.avoid.indexOf(c.k) < 0; }).length, capN = SW.carryCap(w, a);
  const stage = SW.stage(w, a), night = SW.isNight(w), ageF = a.age / a.life;
  /* the body */
  { const th = a.thirst || 0; if (th > 50) add('thirst', th > 85 ? 1 : th > 70 ? 0.8 : 0.45, th > 85 ? 'THIRST. Your mouth is dust. Water, now, before anything else.' : 'Thirst: you need water' + ((a.water || 0) > 0 ? ' (you carry ' + a.water + ' drinks in your pots)' : '') + (v.water ? '; there is water ' + v.water.d + ' steps ' + v.water.dir : '; none is in sight') + '.'); }
  add('hunger', a.e < 30 ? 1 : a.e < 50 ? 0.75 - good * 0.06 : a.e < 64 ? 0.4 - good * 0.07 : 0, a.e < 30 ? 'HUNGER. You are starving; nothing else matters until you eat.' : 'Hunger: your belly is emptying' + (good ? ', though you carry food.' : ' and you carry nothing you can eat.'));
  if (a.hp < 70) add('pain', (70 - a.hp) / 60 + 0.2, 'Pain: you are hurt (health ' + Math.round(a.hp) + '). A hurt body is easy prey.');
  if (a.sick > 0) add('sickness', 0.7, 'Sickness: your body is wasting. You want it to end, and you wonder what caused it.');
  const beast = v.creatures.filter(function (c) { return c.predator && c.d <= 6; })[0];
  if (beast) add('dread', 0.95 - beast.d * 0.07, 'Dread: a ' + beast.sp + ' is ' + beast.d + ' steps ' + beast.dir + '. It kills your kind.');
  if (night && !a.sheltered && (SW.season(w) === 3 || w.weather.kind === 'storm' || w.weather.kind === 'snow')) add('cold', 0.6, 'Cold: you are out in the open in bitter weather with no roof.');
  /* other people */
  let best = null, worst = null;
  for (const id in a.rel) { const r = a.rel[id]; if (st.minds[id] && st.minds[id].dead) continue; if (r > 0.25 && (!best || r > a.rel[best])) best = id; if (r < -0.25 && (!worst || r < a.rel[worst])) worst = id; }
  const here = {}; v.agents.forEach(function (o) { here[o.id] = o; });
  add('loneliness', md.lonely * (0.45 + t.sociable) + (v.agents.length ? 0 : 0.1 * t.sociable), v.agents.length ? 'Loneliness: you have been too long without company, and now someone is near.' : 'Loneliness: you have been alone a long while. You want a voice that answers.');
  if (best && !here[best]) { const seen = a.seenAt[best], away = seen ? (w.tick - seen[2]) / w.laws.time.dayLength : 0; add('missing', a.rel[best] * 0.6 * Math.min(1, away) * (0.5 + t.sociable), 'You miss ' + nameOf(st, best) + ', whom you have not seen for ' + Math.max(1, Math.round(away)) + ' day' + (Math.round(away) > 1 ? 's' : '') + '.'); }
  if (worst) { const tl = M.tiesOf(mind, worst), last = tl[tl.length - 1]; add('resentment', -a.rel[worst] * (0.55 + 0.5 * md.anger + 0.3 * (1 - t.gentle)), 'Resentment toward ' + nameOf(st, worst) + (here[worst] ? ', who is right here' : '') + (last ? ' (' + last.text.replace(/^they /, 'they ').slice(0, 90) + ')' : '') + '. It has not been settled.'); }
  if (md.anger > 0.3) add('anger', md.anger, 'Anger: it is hot in you and wants somewhere to go.');
  if (md.grief > 0.25) add('grief', md.grief, 'Grief: a loss sits in you and colours everything.');
  if (md.fear > 0.35 && !beast) add('fear', md.fear * 0.8, 'Fear: something has frightened you and it has not left your body.');
  /* standing among others */
  const followers = w.agents.filter(function (o) { return o.leader === a.id; }).length;
  let richer = null; v.agents.forEach(function (o) { if ((o.carrying > good + 1 || (o.tools.length && !a.tools.length)) && (!richer || o.carrying > richer.carrying)) richer = o; });
  if (richer) add('envy', (0.25 + 0.6 * t.greedy) * (richer.tools.length && !a.tools.length ? 1 : 0.8), 'Envy: ' + richer.name + ' has ' + (richer.tools.length && !a.tools.length ? 'a made thing (' + richer.tools[0] + ') and you have none' : 'more than you (' + richer.carrying + ' food)') + '.');
  const amb = (t.bold - 0.42) * 1.5 + 0.35 * t.greedy;
  if (stage !== 'child') add('ambition', amb * (followers ? 0.6 : 1), followers ? 'Ambition: ' + followers + ' follow you. You want more: more followers, a place that is yours, a name others say.' : a.leader != null ? 'Ambition: you follow ' + nameOf(st, a.leader) + '. Part of you wonders why it is not the other way round.' : 'Ambition: no one follows you, no place bears your name, and you have made nothing that will outlast you.');
  if (a.leader == null && !followers) {
    let strong = null; for (const id in a.rel) { const o = agentById(w, +id); if (o && a.rel[id] > 0.2 && (!strong || a.rel[id] > a.rel[strong.id])) strong = o; }
    add('belonging', (0.62 - t.bold) * 1.1 + 0.3 * t.sociable + (night ? 0.08 : 0), 'Belonging: you do not need to lead. You want a place among others: a fire that is yours too, and someone surer than you to stand behind' + (strong ? '. ' + strong.name + ' is the one you trust most' : '') + '. To follow someone is not to kneel; it is to stop being alone.');
  }
  const kids = w.agents.filter(function (o) { return o.parents && o.parents.indexOf(a.id) >= 0; });
  if (kids.length) {
    const kid = kids[kids.length - 1], mate = agentById(w, kid.parents[0] === a.id ? kid.parents[1] : kid.parents[0]), far = !here[kid.id];
    const need = kids.filter(function (o) { return o.e < 40 || o.hp < 50 || o.sick > 0; })[0];
    add('family', 0.22 + 0.2 * t.gentle + (far ? 0.1 : 0) + (SW.stage(w, kid) === 'child' ? 0.2 : 0) + (need ? 0.45 : 0), (need ? 'YOUR CHILD ' + need.name + ' IS IN NEED (energy ' + Math.round(need.e) + ', health ' + Math.round(need.hp) + ') at (' + need.x + ',' + need.y + '). ' : '') + 'Family: ' + kids.map(function (o) { return o.name; }).join(' and ') + (kids.length > 1 ? ' are your children' : ' is your child') + (mate ? ', with ' + mate.name : '') + '. They are yours before anyone else is' + (far ? ', and ' + kid.name + ' is out of your sight' : '') + '.');
  } else if (stage === 'child' && a.parents && a.parents.length) {
    const ps = a.parents.map(function (id) { return agentById(w, id); }).filter(Boolean);
    if (ps.length) add('family', 0.7, 'Family: you are small, and ' + ps.map(function (o) { return o.name; }).join(' and ') + (ps.length > 1 ? ' are your parents' : ' is your parent') + '. Near them you are safe; away from them you are not.');
  }
  if (a.e < 55) { let fat = null; v.agents.forEach(function (o) { if (o.carrying >= 2 && (!fat || o.carrying > fat.carrying)) fat = o; }); if (fat) add('temptation', (0.75 - a.e / 100) * (1.3 - t.gentle) * (0.6 + 0.6 * t.greedy), 'Temptation: you are hungry and ' + fat.name + ' carries ' + fat.carrying + ' food within reach. It could be asked for, taken by stealth, or taken by force.'); }
  /* the mind's own appetite */
  const untasted = {}; v.plants.forEach(function (p) { if (!mind.foods[p.sp]) untasted[p.sp] = 1; });
  const nu = Object.keys(untasted).length;
  add('curiosity', t.curious * (0.35 + 0.12 * Math.min(3, nu) + (mind.wonder ? 0.15 : 0)), 'Curiosity: ' + (nu ? 'you have never tasted ' + Object.keys(untasted).slice(0, 2).join(' or ') + '; ' : '') + (mind.wonder ? 'your question is still unanswered.' : 'there is so much here you do not understand, and you want to.'));
  add('restlessness', ((mind.rut || 0) * 0.2 + (mind.dull || 0) * 0.09) * (0.6 + 0.5 * t.curious + 0.3 * t.bold), 'Restlessness: your days have been the same day. You are sick of it and want something, anything, to change.');
  const L0m = w.laws.mate;
  if (stage === 'adult' && !a.stats.kids) { let dear = null; v.agents.forEach(function (o) { const r = a.rel[o.id] || 0; if (r > 0.2 && !o.young && (!dear || r > (a.rel[dear.id] || 0))) dear = o; }); add('longing', 0.22 + 0.25 * t.sociable + (dear ? 0.25 : 0) + (ageF > 0.25 ? 0.15 : 0) + (ageF > 0.5 ? 0.15 : 0), dear ? 'Longing: you want a child of your own, and ' + dear.name + ', who is near, is the one you think of. A child begins when two court each other: each puts the plan step mate, with the name of the other, within a short while of one another. A child costs each parent ' + L0m.cost + ' energy at once and must then be fed and kept warm until grown; you carry ' + good + ' food.' : 'Longing: you have no mate and no child. When you die there will be nothing of you here.'); }
  if (ageF > 0.55) add('mortality', (ageF - 0.4) * 1.5, 'Mortality: more of your life is behind you than ahead (' + Math.round(ageF * 100) + '%). ' + (a.stats.taught ? 'What will remain of you?' : 'No one carries anything you know.'));
  /* the deeper currents */
  const safe = a.e >= 60 && !beast && a.hp >= 70;
  if (safe) add('purpose', 0.22 + 0.11 * Math.min(4, mind.dull || 0) + (mind.aim ? 0 : 0.2) + 0.15 * t.curious, 'Purpose: your belly is full and your days are safe, and it is not enough. What are you for? What would make this life mean something?');
  if (a.leader != null) { const ld = agentById(w, a.leader), cs = SW.rootOf(w, a).customs.length; add('freedom', (t.bold - 0.3) * 0.9 + 0.07 * cs + (ld && (a.rel[ld.id] || 0) < 0.2 ? 0.25 : 0), 'Freedom: you follow ' + nameOf(st, a.leader) + (cs ? ' and live by ' + cs + ' of their customs' : '') + '. Part of you strains against it and wants to answer to no one.'); }
  if (best && a.rel[best] > 0.55) {
    const dear = agentById(w, +best);
    if (dear) {
      let rival = null;
      w.agents.forEach(function (o) { if (o !== a && o !== dear && o.parents && o.parents.indexOf(dear.id) >= 0 && o.parents.indexOf(a.id) < 0) { const other = agentById(w, o.parents[0] === dear.id ? o.parents[1] : o.parents[0]); if (other && other !== a) rival = other; } });
      if (!rival && here[dear.id]) v.agents.forEach(function (o) { if (o.id !== dear.id && SW.cheb(o.x, o.y, dear.x, dear.y) <= 1 && (dear.rel[o.id] || 0) > (dear.rel[a.id] || 0) + 0.15) rival = agentById(w, o.id); });
      if (rival) add('jealousy', 0.35 + 0.35 * a.rel[best] + 0.2 * (1 - t.gentle), 'Jealousy: ' + dear.name + ' matters to you more than anyone, and ' + dear.name + ' is closer to ' + rival.name + ' than to you. It burns.');
    }
  }
  if ((mind.rut || 0) >= 2 || (a.stats.built === 0 && a.stats.taught === 0 && ageF > 0.3)) add('selfdoubt', (0.55 - t.bold) * 0.9 + 0.1 * (mind.rut || 0), 'Self-doubt: what you try keeps coming to nothing. Perhaps you are not the one who can do this. Perhaps the others see it.');
  { let poor = null, why = ''; v.agents.forEach(function (o) { if (poor) return; if (o.hp < 50) { poor = o; why = 'hurt'; } else if (o.suffer > 0.55) { poor = o; why = 'plainly suffering'; } else if (o.e < 30) { poor = o; why = 'weak with hunger'; } else if (o.sick) { poor = o; why = 'sick'; } else if (o.young && o.d > 0) { poor = o; why = 'a child'; } });
    if (poor) add('compassion', t.gentle * 0.75 + (why === 'a child' ? -0.2 : 0), 'Compassion: ' + poor.name + ' is ' + why + ', right here. It is hard for you to look away.'); }
  if (a.stats.stolen > 0) add('guilt', (t.honest - 0.35) * 0.9 + (t.gentle - 0.4) * 0.4, 'Guilt: you have taken what was not yours (' + a.stats.stolen + ' food by now). Perhaps no one knows. You know.');
  { const met = a.met ? Object.keys(a.met) : []; if (met.length) { const q = (w.sites || []).filter(function (z) { return String(z.id) === met[met.length - 1]; })[0]; if (q) add('awe', 0.22 + 0.1 * Math.min(3, met.length) + 0.2 * t.curious - 0.15 * t.bold, 'Awe: the ' + q.kind + ' "' + q.name + '" reached into you. You do not understand what it is, and it will not leave your thoughts. Is something there? Does it want something?'); } }
  if (!a.stats.built && !a.sheltered && SW.season(w) >= 2) add('insecurity', 0.4 + (SW.season(w) === 3 ? 0.25 : 0) - 0.2 * t.bold, 'Insecurity: you have no roof and no store of your own, and the cold days are ' + (SW.season(w) === 3 ? 'here' : 'coming') + '.');
  { const wb = SW.wellbeing(a), days = w.tick / w.laws.time.dayLength;
    if (days > 3 && wb.satisfaction < 0.42) add('discontent', 0.3 + (0.42 - wb.satisfaction) * 3, 'Discontent: for days now your life has given you more pain than gladness. Something has to change: the place, the company, the one you follow, or what you spend yourself on.');
    if (wb.satisfaction > 0.62 && wb.suffering < 0.2) add('contentment', 0.25 + (wb.satisfaction - 0.62) * 2, 'Contentment: your life is good as it is. You want to keep what you have, and you have enough to be generous.');
    if (a.leader == null && !followers && (wb.suffering > 0.35 || (a.e < 45) || (!a.stats.built && SW.season(w) >= 2))) { let patron = null; v.agents.forEach(function (o) { const oa = agentById(w, o.id); if (!oa || patron || (a.rel[o.id] || 0) < -0.1) return; if (o.e > a.e + 15 && (o.carrying >= 2 || oa.stats.built >= 2 || w.agents.some(function (q) { return q.leader === o.id; }))) patron = o; }); if (patron) add('deference', 0.45 + wb.suffering * 0.6 - t.bold * 0.35, 'Deference: ' + patron.name + ' is doing better than you: stronger, better provided. To pledge yourself to ' + patron.name + ' would put you in a band, with others bound to stand with you. Pride says no. Your body says yes.'); }
  }
  { const q = SW.siteQuality(w, a.x, a.y), mySet = w.settlements.filter(function (z) { return z.root === SW.rootOf(w, a).id; })[0], here2 = mySet && SW.cheb(a.x, a.y, mySet.x, mySet.y) <= mySet.r;
    if (!mySet && (q.water > 6 || q.food < 4) && a.e > 40) add('homeseeking', 0.4 + 0.2 * t.curious, 'Unsettled: this is poor ground to stay on (water ' + q.water + ' steps off, ' + q.food + ' food plants near). Somewhere there is a place with water, food, wood and stone close together. It is worth walking to find, before winter decides for you.');
    else if (!mySet && q.water <= 4 && q.food >= 8 && q.wood >= 6) add('homeseeking', 0.35, 'This is good ground: water close, food and wood near' + (q.riches.length ? ', and ' + q.riches.join(' and ') + ' in the earth' : '') + '. A place like this is worth building on and calling yours.');
    if (here2) { let stranger = null; v.agents.forEach(function (o) { const oa = agentById(w, o.id); if (oa && !stranger && o.stance !== 'own' && o.stance !== 'ally' && SW.cheb(o.x, o.y, mySet.x, mySet.y) <= mySet.r) stranger = o; }); if (stranger) add('territory', 0.3 + 0.35 * t.bold + 0.25 * t.greedy - 0.3 * t.gentle + (a.rel[stranger.id] < 0 ? 0.2 : 0), 'Your ground: ' + stranger.name + ', who is not of your band, stands inside "' + mySet.name + '". What grows and lies here is yours. A guest is welcomed or sent off; which is ' + stranger.name + '?'); }
    { let alien = null; v.agents.forEach(function (o) { const oa = agentById(w, o.id); if (!alien && oa && oa.people != null && oa.people !== a.people && SW.understands(a, oa.lang) < 0.5) alien = oa; }); if (alien) { const op = SW.peopleOf(w, alien); add('strangeness', 0.5 + 0.2 * t.curious - 0.15 * (a.rel[alien.id] || 0), 'Strangeness: ' + alien.name + ' is not of your people' + (op ? ' but of ' + op.name : '') + ': another body, another tongue. You cannot tell what they intend from their words. Fear says keep away; curiosity says go nearer. A gift needs no words; neither does a raised hand.'); } }
  }
  { const mine = SW.status(w, a); let above = null; v.agents.forEach(function (o) { if (!o.young && o.status > mine + 0.8 && (!above || o.status > above.status)) above = o; });
    if (above) add('standing', 0.2 + 0.35 * t.bold + 0.25 * t.greedy + Math.min(0.3, (above.status - mine) * 0.1), 'Standing: ' + above.name + ' is weighed more heavily than you (standing ' + above.status.toFixed(1) + ' to your ' + mine.toFixed(1) + '). People listen to those who have built, given, known and won more. You could earn the same, or stand in their shadow.'); }
  /* what passes between people leaves debts and wounds */
  { const T2 = mind.ties || {}; let owed = null, owedN = 0, traitor = null, twhat = '';
    Object.keys(T2).forEach(function (id) { const o = agentById(w, +id); if (!o) return; let got = 0, gave = 0, wrong = '', warm = false;
      T2[id].forEach(function (q) { const n = q.n || 1; if (/^they (GAVE you|tended your wounds|taught you)/.test(q.text)) got += n; else if (/^you (gave them|tended their wounds|taught them)/.test(q.text)) gave += n; if (/^they (STOLE|ATTACKED|left your following)|you caught them/.test(q.text)) wrong = q.text; if (/^they (GAVE you|tended|taught|pledged)|^you pledged/.test(q.text)) warm = true; });
      if (got - gave > owedN) { owedN = got - gave; owed = o; }
      if (wrong && warm && !traitor) { traitor = o; twhat = wrong; } });
    if (owed) add('gratitude', 0.2 + 0.12 * Math.min(4, owedN) + 0.3 * t.honest + 0.2 * t.gentle - 0.25 * t.greedy, 'Gratitude: ' + owed.name + ' has done more for you than you have done for them. It sits in you as a debt you want to answer, or one you could quietly leave unpaid.');
    if (traitor) add('betrayal', 0.5 + 0.3 * (1 - t.gentle) + 0.2 * md.anger, 'Betrayal: ' + traitor.name + ' was close to you, and then ' + twhat.replace(/^they /, '').replace(/^you caught them/, 'you caught them').toLowerCase().slice(0, 80) + '. Trust given and broken cuts deeper than a stranger\'s blow.'); }
  { const deeds = a.stats.built + a.stats.invented * 2 + a.stats.taught + (a.stats.tamed || 0) + followers * 2; if (deeds >= 3) add('pride', 0.12 + 0.05 * Math.min(8, deeds) + 0.3 * t.bold + 0.2 * t.greedy - 0.2 * t.gentle, 'Pride: you have built, made, taught or led more than most here. You want it seen and spoken of, and a slight would sting.'); }
  if (a.leader != null) { const ld = agentById(w, a.leader); if (ld && (a.rel[ld.id] || 0) > 0.45) { const need = ld.hp < 60 || ld.e < 30 || ld.sick > 0 || w.wars.length > 0; add('loyalty', (a.rel[ld.id] - 0.2) * (need ? 1.1 : 0.55) + 0.2 * t.honest, 'Loyalty: ' + ld.name + ' is your leader and you are bound to them' + (need ? ', and they are in need now' : '') + '. To stand by them matters to you, whatever it costs.'); } }
  if (mind.creed && (mind.tales || []).length + (a.met ? Object.keys(a.met).length : 0) >= 2) add('devotion', 0.2 + 0.08 * Math.min(5, (mind.tales || []).length) + 0.15 * t.honest + 0.1 * (1 - t.bold), 'Devotion: there are things you hold to be true and worth keeping: your creed, the tales you carry, the places that touched you. You want to keep faith with them, and to see others keep it too.');
  if (t.honest < 0.4 && v.agents.length) add('guile', (0.45 - t.honest) * 1.3 + 0.2 * t.greedy, 'Guile: the truth is only one of the things you can say. A false word well placed, a warmth you do not feel, a promise you do not mean to keep: these might get you what work would not.');
  if (mind.aim && w.tick - (mind.aimTick || 0) > 5 * w.laws.time.dayLength) add('obsession', 0.3 + 0.04 * Math.min(10, (w.tick - mind.aimTick) / w.laws.time.dayLength) + 0.15 * t.bold, 'Obsession: your aim ("' + mind.aim.slice(0, 80) + '") has held you for many days. It crowds out other things. You could give yourself to it wholly, or ask whether it is devouring you.');
  out.sort(function (p, q) { return q.raw - p.raw; });
  const res = out.slice(0, 6);
  res.fed = a.e >= 64 && !res.some(function (d) { return d.k === 'hunger'; });
  res.full = a.carry.length >= capN;
  return res;
};
const STRENGTH = function (s) { return s > 0.8 ? 'overwhelming' : s > 0.55 ? 'strong' : s > 0.32 ? 'steady' : 'faint'; };
const STOP = { the: 1, and: 1, that: 1, this: 1, with: 1, from: 1, have: 1, has: 1, was: 1, are: 1, not: 1, but: 1, for: 1, you: 1, your: 1, its: 1, they: 1, them: 1, will: 1, when: 1, what: 1, taught: 1 };
function wordsOf(t) { return String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (x) { return x.length > 2 && !STOP[x]; }); }
/* true when a new note says nothing an old one did not already say */
function sameIdea(a, b) {
  const A = {}, B = {}; let na = 0, nb = 0, both = 0;
  wordsOf(a).forEach(function (x) { if (!A[x]) { A[x] = 1; na++; } });
  wordsOf(b).forEach(function (x) { if (!B[x]) { B[x] = 1; nb++; if (A[x]) both++; } });
  return na > 0 && nb > 0 && both / Math.min(na, nb) >= 0.7;
}
M.sameIdea = sameIdea;
function addNote(mind, text, cap) {
  text = clip(text, cap || 200); if (!text) return false;
  for (let i = 0; i < mind.notes.length; i++) if (sameIdea(text, mind.notes[i])) return false;
  mind.notes.push(text); if (mind.notes.length > 16) mind.notes.shift();
  return true;
}
/* the few things a being will remember all its life */
function story(st, id, text) {
  const m = st.minds[id]; if (!m || m.dead) return;
  m.life.push({ tick: st.world.tick, text: text }); if (m.life.length > 16) m.life.splice(1, 1); /* keep the first: its birth or waking */
}
M.story = story;
/* tell everyone in sight of a deed, once per watcher, doer and kind of deed */
function watch(st, a, key, text, urge, also) {
  if (!a) return;
  witnesses(st, a.x, a.y, [a.id]).forEach(function (id) {
    const m = st.minds[id]; if (!m || m.dead) return;
    const k = a.id + ':' + key; if (m.watched[k]) return; m.watched[k] = 1;
    tell(st, id, text, urge || 2); if (also) also(m);
  });
}
function dayStamp(w) { return 'day ' + SW.day(w); }

/* ---------- what happens to a being becomes what it remembers ---------- */
function tell(st, id, text, urge, deep) {
  const m = st.minds[id]; if (!m || m.dead) return;
  const last = m.events[m.events.length - 1];
  if (last && last.text === text) last.n++;
  else { st.seq = (st.seq || 0) + 1; m.events.push({ tick: st.world.tick, text: text, n: 1, seq: st.seq }); if (m.events.length > 16) m.events.shift(); }
  m.urge += urge || 0; if (deep) m.wantDeep = true; m.rev++;
}
function chron(st, kind, text, ids, at) {
  if (st.story) st.story.tally[kind] = (st.story.tally[kind] || 0) + 1;
  M.record(st, { t: 'chron', kind: kind, text: text });
  st.chron.push({ tick: st.world.tick, kind: kind, text: text, ids: ids || [], x: at ? at.x : null, y: at ? at.y : null });
  if (st.chron.length > 300) st.chron.shift();
}
M.chron = chron;
function witnesses(st, x, y, except) {
  const w = st.world, out = [];
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k];
    if (!o.dead && except.indexOf(o.id) < 0 && SW.cheb(o.x, o.y, x, y) <= w.laws.body.sight) out.push(o.id);
  }
  return out;
}
M.onEvent = function (st, ev) {
  const w = st.world, A = nameOf(st, ev.a), B = nameOf(st, ev.b), a = agentById(w, ev.a), L0 = w.laws;
  ties(st, ev);
  switch (ev.type) {
    case 'ate': {
      const m = st.minds[ev.a]; if (!m) break;
      const fx = ev.fx || '', known = m.foods[ev.kind], isNew = !known || known.seen || known.told || known.gain !== ev.gain || known.fx !== fx;
      if (known && known.told && a) { /* someone's word, now tested on your own body */
        const liar = SW.findAgentByName(w, known.told), lied = (known.gain < 0) !== (ev.gain < 0);
        if (lied) { tell(st, ev.a, known.told + ' told you that ' + ev.kind + (known.gain < 0 ? ' hurts' : ' is good to eat') + '. You have now eaten it yourself: that was FALSE.', 6, true); story(st, ev.a, known.told + ' told me a falsehood about ' + ev.kind + '.'); if (liar) a.rel[liar.id] = SW.clamp((a.rel[liar.id] || 0) - 0.3, -1, 1); }
        else { tell(st, ev.a, known.told + "'s word about " + ev.kind + ' proved true.', 1); if (liar) a.rel[liar.id] = SW.clamp((a.rel[liar.id] || 0) + 0.1, -1, 1); }
      }
      if (isNew) {
        m.foods[ev.kind] = { n: (known && !known.seen && !known.told ? known.n : 0) + 1, gain: ev.gain, fx: fx };
        tell(st, ev.a, (known && known.told ? 'You tried ' + ev.kind + ' for yourself: ' : known && known.seen ? 'You tried ' + ev.kind + ' for yourself: ' : known ? 'This time ' + ev.kind + ' was different: ' : 'You ate ' + ev.kind + ' for the first time: ') + (ev.gain < 0 ? 'it HURT you, you lost ' + (-ev.gain) + ' energy' : 'it gave you ' + ev.gain + ' energy') + (fx ? '; ' + fx : '') + '.', ev.gain < 0 || fx ? 4 : 1);
      } else {
        known.n++;
        /* twice hurt, the body refuses it without being told */
        if (ev.gain < 0 && known.n >= 2 && a && a.habits.avoid.indexOf(ev.kind) < 0) { a.habits.avoid.push(ev.kind); tell(st, ev.a, 'Hurt by ' + ev.kind + ' again, your body now refuses it by itself.', 1); }
      }
      if (ev.stripped) { m.strips++; if (m.strips <= 2 || m.strips % 12 === 0) tell(st, ev.a, 'You took the last bite of a ' + ev.kind + ' plant and the plant died' + (m.strips > 2 ? ' (that is ' + m.strips + ' plants you have killed this way).' : '.'), 1); }
      /* others learn by watching what a food does to you */
      if (a && (isNew || ev.gain < 0)) watch(st, a, 'ate:' + ev.kind, 'You watched ' + A + ' eat ' + ev.kind + ': ' + (ev.gain < 0 ? 'it hurt them' : 'it fed them') + (fx ? ' (' + fx.replace(/you(r)?/g, function (q) { return q === 'your' ? 'their' : 'them'; }) + ')' : '') + '.', ev.gain < 0 ? 3 : 1, function (wm) { if (!wm.foods[ev.kind]) wm.foods[ev.kind] = { n: 0, gain: ev.gain, fx: fx, seen: A }; });
      break;
    }
    case 'stripped': tell(st, ev.a, 'You harvested the last food from a ' + ev.kind + ' plant, and the plant died.', 1); break;
    case 'hunted': tell(st, ev.a, 'You killed a ' + ev.kind + ' and took ' + ev.n + ' meat.', 2); watch(st, a, 'hunt:' + ev.kind, 'You watched ' + A + ' kill a ' + ev.kind + ' and take its meat.', 2); break;
    case 'invented': {
      const d = w.laws.tools[ev.kind];
      tell(st, ev.a, 'You devised a new thing: the ' + ev.kind + ', for ' + ev.use + (ev.from ? ', bettering the ' + ev.from : '') + ' (strength x' + ev.power + '; making one takes ' + d.wood + ' wood and ' + d.stone + ' stone).', 2);
      watch(st, a, 'inv:' + ev.kind, A + ' has devised something new: the ' + ev.kind + ', a thing for ' + ev.use + '.', 4);
      chron(st, 'invention', A + ' invented the ' + ev.kind + ' (for ' + ev.use + ', x' + ev.power + ')' + (ev.from ? ', bettering the ' + ev.from : '') + (d.idea ? ' — ' + d.idea : '') + '.', [ev.a], a);
      break;
    }
    case 'crafted':
      if (ev.pot) { tell(st, ev.a, 'You fired a pot of clay. You can now carry more food than before.', 3); watch(st, a, 'pot', 'You watched ' + A + ' fire a pot of clay beside a fire.', 2); chron(st, 'craft', A + ' fired a pot of clay.', [ev.a], a); }
      else if (ev.metal) { tell(st, ev.a, 'You made a ' + ev.kind + ' in METAL. It works better than one of wood and stone and will last far longer.', 4); watch(st, a, 'metal', 'You watched ' + A + ' make a ' + ev.kind + ' out of ore at a fire. It came out hard and bright.', 3); chron(st, 'craft', A + ' made a ' + ev.kind + ' in metal.', [ev.a], a); }
      else tell(st, ev.a, 'You made a ' + ev.kind + '.', 1);
      break;
    case 'sick':
      tell(st, ev.a, 'You have fallen SICK after ' + ev.from + '. Sickness wastes energy and health for a day or two and passes to anyone who stays beside you. A healing plant eases it.', 8, true);
      story(st, ev.a, 'I fell sick after ' + ev.from + '.');
      if (a && !/staying close/.test(ev.from)) lesson(st, community(st, a, 20).concat([ev.a]), A + ' fell sick after ' + ev.from + '.');
      watch(st, a, 'sick:' + Math.floor(w.tick / 600), A + ' has fallen sick after ' + ev.from + '. Sickness passes to those who stay close.', 4);
      chron(st, 'sick', A + ' fell sick after ' + ev.from + '.', [ev.a], a);
      break;
    case 'well': tell(st, ev.a, 'Your sickness has passed. It will not take you again for some days.', 3); break;
    case 'fished':
      if (ev.first) { tell(st, ev.a, 'You pulled a FISH from the water. It is food you carry, like meat. Where many fish are taken, fewer are left for a while.', 3); watch(st, a, 'fish', 'You watched ' + A + ' pull a fish out of the water at (' + ev.x + ',' + ev.y + ').', 2); }
      else if (ev.thin) tell(st, ev.a, 'The fish here are getting scarce: these waters have been fished hard.', 1);
      break;
    case 'ore':
      if (ev.first) { tell(st, ev.a, 'You broke a lump of ORE out of the rock at (' + ev.x + ',' + ev.y + '): heavy and bright.' + (a && a.knows.smelting ? '' : ' You do not yet know what it is good for.'), 3); watch(st, a, 'ore', 'You watched ' + A + ' break something heavy and bright out of the rock at (' + ev.x + ',' + ev.y + ').', 2); }
      if (ev.spent) tell(st, ev.a, 'The seam of ore at (' + ev.x + ',' + ev.y + ') is used up.', 2);
      break;
    case 'clay': if (ev.first) { tell(st, ev.a, 'You dug wet CLAY out of the ground. It keeps whatever shape it is pressed into.' + (a && a.knows.pottery ? '' : ' You do not yet know what it is good for.'), 2); watch(st, a, 'clay', 'You watched ' + A + ' dig clay out of the wet ground.', 1); } break;
    case 'grown': tell(st, ev.a, 'You are GROWN: no longer a child. You have a grown body\'s strength, and you may take a mate.', 5, true); story(st, ev.a, 'I came of age.'); chron(st, 'age', A + ' came of age.', [ev.a], a); break;
    case 'aged': tell(st, ev.a, 'You have grown OLD. Walking tires you and your blows are weak, but what you teach now carries further. What you know dies with you unless you pass it on.', 6, true); story(st, ev.a, 'I grew old.'); chron(st, 'age', A + ' has grown old.', [ev.a], a); break;
    case 'war': case 'truce': case 'warend': {
      const r = ev.war, days = Math.max(1, Math.round(((r.ended == null ? w.tick : r.ended) - r.since) / w.laws.time.dayLength));
      const line = ev.type === 'war' ? 'WAR has begun between ' + r.aName + ' and ' + r.bName + '.' : 'The war between ' + r.aName + ' and ' + r.bName + ' is OVER after ' + days + (days === 1 ? ' day' : ' days') + ', with ' + r.dead + ' dead: it ended with ' + r.how + '.';
      w.agents.forEach(function (o) { const id = SW.rootOf(w, o).id; if (id === r.a || id === r.b) { tell(st, o.id, line, ev.type === 'war' ? 4 : 8, ev.type !== 'war'); story(st, o.id, ev.type === 'war' ? 'War began between ' + r.aName + ' and ' + r.bName + '.' : 'The war between ' + r.aName + ' and ' + r.bName + ' ended (' + r.dead + ' dead).'); } });
      chron(st, 'war', ev.type === 'war' ? r.aName + ' went to war with ' + r.bName + '.' : 'The war between ' + r.aName + ' and ' + r.bName + ' ended after ' + days + (days === 1 ? ' day' : ' days') + ' and ' + r.dead + ' dead, with ' + r.how + '.', [r.a, r.b], agentById(w, r.a) || agentById(w, r.b));
      break;
    }
    case 'sawmade': tell(st, ev.a, 'You watched ' + B + ' make a ' + ev.kind + ' (a thing for ' + ev.use + '). Having seen it made, you could make one yourself.', 4); break;
    case 'toolbroke': tell(st, ev.a, 'Your ' + ev.kind + ' wore out and broke.', 3); break;
    case 'placed': tell(st, ev.a, 'You set a ' + ev.kind + ' at (' + ev.x + ',' + ev.y + '). It will act by its own rules.', 1); chron(st, 'build', A + ' set a ' + ev.kind + '.', [ev.a], ev); break;
    case 'snared': tell(st, ev.by, 'Your ' + ev.kind + ' at (' + ev.x + ',' + ev.y + ') caught a ' + ev.prey + '. The meat is held there for the taking.', 4); break;
    case 'devstruck':
      if (ev.a != null) { tell(st, ev.a, 'A ' + ev.kind + ' set by ' + nameOf(st, ev.by) + ' struck you at (' + ev.x + ',' + ev.y + ').', 8, true); tell(st, ev.by, 'Your ' + ev.kind + ' struck ' + ev.what + '.', 4); chron(st, 'fight', 'A ' + ev.kind + ' set by ' + nameOf(st, ev.by) + ' struck ' + ev.what + '.', [ev.by, ev.a], ev); }
      else tell(st, ev.by, 'Your ' + ev.kind + ' struck a ' + ev.what + '.', 2);
      break;
    case 'alarm':
      w.agents.forEach(function (o) { if (SW.allied(w, o, ev.by) && SW.cheb(o.x, o.y, ev.x, ev.y) <= 14) tell(st, o.id, 'The ' + ev.kind + ' at (' + ev.x + ',' + ev.y + ') raised the alarm: ' + (ev.stranger != null ? ev.what + ', who is not of your band, is close to it.' : 'a ' + ev.what + ' is close to it.'), 8); });
      break;
    case 'shared': tell(st, ev.a, 'The ' + ev.kind + ' gave you food, as it was made to.', 1); break;
    case 'devgone': tell(st, ev.by, 'Your ' + ev.kind + ' at (' + ev.x + ',' + ev.y + ') has rotted away.', 2); break;
    case 'settled': {
      const stl = ev.set;
      w.agents.forEach(function (o) { if (SW.rootOf(w, o).id === stl.root) { tell(st, o.id, 'What your band has built around (' + stl.x + ',' + stl.y + ') is now a settlement: "' + stl.name + '". It is your home ground: you heal faster and fear less inside it, and you will know when outsiders cross into it. Naming the place renames it.', 5, true); story(st, o.id, 'We made a home: ' + stl.name + '.'); } });
      chron(st, 'culture', 'A settlement has formed: "' + stl.name + '".', [stl.root], stl);
      break;
    }
    case 'abandoned': chron(st, 'culture', 'The settlement "' + ev.set.name + '" is no more.', [], ev.set); break;
    case 'trespass': {
      const stl = ev.set;
      w.agents.forEach(function (o) { if (o.id !== ev.a && SW.rootOf(w, o).id === stl.root && SW.cheb(o.x, o.y, stl.x, stl.y) <= stl.r + 8) tell(st, o.id, A + ', who is not of your band, has come onto your ground at ' + stl.name + '.', 6); });
      tell(st, ev.a, 'You have crossed onto the ground of the settlement "' + stl.name + '", which belongs to ' + nameOf(st, stl.root) + "'s people.", 3);
      break;
    }
    case 'bandhit':
      w.agents.forEach(function (o) { if (o.id !== ev.b && o.id !== ev.a && SW.allied(w, o, ev.b) && SW.cheb(o.x, o.y, a ? a.x : 0, a ? a.y : 0) > w.laws.body.sight) tell(st, o.id, 'Word reaches you: ' + B + ' of your band was attacked by ' + A + '.', 6, true); });
      break;
    case 'wounded': tell(st, ev.a, 'You wounded a ' + ev.kind + ', but it is still on its feet.', 2); break;
    case 'healed':
      if (ev.a === ev.b) tell(st, ev.a, 'You tended your own wounds with ' + ev.with + ' (+' + ev.amt + ' health).', 1);
      else { tell(st, ev.a, 'You tended ' + B + "'s wounds with " + ev.with + '.', 1); tell(st, ev.b, A + ' tended your wounds with ' + ev.with + ' (+' + ev.amt + ' health).', 6); chron(st, 'gift', A + ' healed ' + B + '.', [ev.a, ev.b], a); }
      watch(st, a, 'heal', 'You watched ' + A + ' tend wounds with ' + ev.with + '.', 3);
      break;
    case 'stashed': tell(st, ev.a, 'You put ' + ev.n + ' food into the store.', 0); break;
    case 'took':
      tell(st, ev.a, 'You took ' + ev.n + ' food from a store' + (ev.raid ? ' that belongs to ' + B + "'s people" + ((ev.seenBy || []).length ? ', and you were seen.' : ', unseen.') : '.'), 1);
      (ev.seenBy || []).forEach(function (id) { tell(st, id, 'You saw ' + A + ' raid your band\'s store.', 9, true); });
      if (ev.raid) { if (!(ev.seenBy || []).length) tell(st, ev.b, 'Food is missing from your store. You did not see who took it.', 5); chron(st, 'theft', A + ' raided a store of ' + B + "'s people" + ((ev.seenBy || []).length ? '' : ', unseen') + '.', [ev.a, ev.b], ev); }
      break;
    case 'read': {
      const m = st.minds[ev.a], mk = ev.mark;
      { const rd = agentById(w, ev.a), u = rd ? SW.understands(rd, mk.lang) : 1; if (u < 0.95) mk.text = SW.garble(w, mk.text, mk.lang, u); }
      if (m) { const fresh = addNote(m, 'Read on a sign left by ' + mk.name + ': ' + mk.text, 240); tell(st, ev.a, 'You read a sign left by ' + mk.name + ' at (' + mk.x + ',' + mk.y + '): "' + mk.text + '"' + (fresh ? '' : ' (nothing you did not know)'), fresh ? 4 : 1); }
      break;
    }
    case 'discovered':
      if (a && a.knows[ev.node]) { const wi = cultNew(st, 'way', ev.name && ev.name !== ev.node ? ev.name + ' (' + ev.node + ')' : ev.node, ev.idea || '', a, { node: ev.node }); a.knows[ev.node].cid = wi.id; }
      tell(st, ev.a, 'You found a new way: ' + ev.node + '. You call yours "' + ev.name + '".', 2); story(st, ev.a, 'I discovered ' + ev.node + ' and called it "' + ev.name + '".');
      watch(st, a, 'found:' + ev.node, A + ' has worked out something new: "' + ev.name + '"' + (ev.idea ? ' (' + ev.idea + ')' : '') + '.', 5);
      chron(st, 'invention', A + ' discovered ' + ev.node + ': "' + ev.name + '"' + (ev.idea ? ' — ' + ev.idea : '') + '.', [ev.a], a);
      break;
    case 'learned': { const tc = st.world.agents.filter(function (o) { return o.id === ev.b; })[0], wi = tc && wayItem(st, tc, ev.node); if (wi && a && a.knows[ev.node]) { a.knows[ev.node].cid = wi.id; cultHold(st, wi.id, a, tc, false, ((wi.holders[tc.id] || {}).gen || 0) + 1); } }
      tell(st, ev.a, B + ' taught you ' + ev.node + ' ("' + ev.name + '"). You can use it now.', 5, true);
      chron(st, 'lore', B + ' taught ' + A + ' ' + ev.node + ' ("' + ev.name + '").', [ev.a, ev.b], a);
      break;
    case 'glimpsed': tell(st, ev.a, 'You watched ' + B + ' use "' + ev.name + '" (' + ev.node + '). Having seen it done, you could work it out for yourself much sooner.', 4, true); break;
    case 'stance': {
      const band = SW.bandOf(w, a || { id: -1, leader: null }), tb = agentById(w, ev.b), other = tb ? SW.bandOf(w, tb) : null;
      const mine = band ? band.name : A, theirs = other ? other.name : B;
      w.agents.forEach(function (o) {
        const r = SW.rootOf(w, o);
        if (r.id === ev.a && o.id !== ev.a) tell(st, o.id, 'Your leader ' + A + ' has declared ' + theirs + ' ' + (ev.stance === 'neutral' ? 'neither friend nor enemy' : ev.stance === 'ally' ? 'allies' : 'ENEMIES') + '.', 7, true);
        else if (r.id === ev.b) tell(st, o.id, mine + ' (led by ' + A + ') has declared your people ' + (ev.stance === 'neutral' ? 'neither friend nor enemy' : ev.stance === 'ally' ? 'allies' : 'ENEMIES') + '.', 9, true);
      });
      chron(st, 'power', mine + ' declared ' + theirs + ' ' + (ev.stance === 'ally' ? 'allies' : ev.stance === 'enemy' ? 'enemies' : 'neutral') + '.', [ev.a, ev.b], a);
      break;
    }
    case 'custom':
      w.agents.forEach(function (o) { if (o.id !== ev.a && SW.rootOf(w, o).id === ev.a) tell(st, o.id, 'Your leader ' + A + ' has declared a custom for your band: "' + ev.text + '"', 6); });
      chron(st, 'culture', A + ' declared a custom: "' + ev.text + '"', [ev.a], a);
      break;
    case 'named':
      watch(st, a, 'named:' + ev.name, A + ' has named this place "' + ev.name + '".', 2);
      chron(st, 'culture', A + ' named a place "' + ev.name + '".', [ev.a], ev);
      break;
    case 'bitten': tell(st, ev.a, 'A ' + ev.by + ' bit you. Your health is ' + Math.max(0, Math.round(a ? a.hp : 0)) + '.', 9); if (ev.stalked && a) lesson(st, community(st, a, 20).concat([ev.a]), A + ' was set upon by a ' + ev.by + ' at night while alone, away from fire, roof and company.'); break;
    case 'attack':
      tell(st, ev.b, A + ' attacked you (-' + ev.dmg + ' health).', 10, true); story(st, ev.b, A + ' attacked me.'); story(st, ev.a, 'I attacked ' + B + '.');
      tell(st, ev.a, 'You struck ' + B + '.', 0);
      if (a) witnesses(st, a.x, a.y, [ev.a, ev.b]).forEach(function (id) { tell(st, id, 'You saw ' + A + ' attack ' + B + '.', 4); });
      chron(st, 'fight', A + ' attacked ' + B + '.', [ev.a, ev.b], a);
      break;
    case 'death': {
      const m = st.minds[ev.a];
      if (m) { m.dead = true; m.cause = ev.cause; m.diedTick = w.tick; m.rev++; }
      (ev.seenBy || []).forEach(function (id) { const o = agentById(w, id); tell(st, id, A + ' died near you (' + ev.cause + ').', 6, !!(o && (o.rel[ev.a] || 0) > 0.3)); if (o && Math.abs(o.rel[ev.a] || 0) > 0.3) story(st, id, 'I saw ' + A + ' die (' + ev.cause + ').'); });
      { const dead = a || (w.graves || []).filter(function (g) { return g.id === ev.a; })[0] || {}, mourn = []; w.agents.forEach(function (o) { if (o.id === ev.a || o.dead) return; const kin = (o.parents || []).indexOf(ev.a) >= 0 || (dead.parents || []).indexOf(o.id) >= 0, r0 = o.rel[ev.a] || 0; if (kin || r0 > 0.35) { const saw = (ev.seenBy || []).indexOf(o.id) >= 0; mourn.push({ name: o.name, bond: Math.round(r0 * 100) / 100, kin: kin, saw: saw }); if (saw) { tie(st, o.id, ev.a, 'you watched them die'); seasonSaw(st, o.id, A + ' died'); } } }); M.record(st, { t: 'grief', name: A, cause: ev.cause, mourners: mourn }); }
      { const c = ev.ctx || {}, how = ev.cause === 'starved' ? 'starved' : ev.cause === 'thirst' ? 'died of thirst' : ev.cause === 'old age' ? 'died of old age' : 'died (' + ev.cause + ')', q = [];
        if (c.mated && ev.cause === 'starved') q.push('a day or two after making a child, with nothing put by to live on'); if (c.child) q.push('still a child'); if (c.alone) q.push('alone, far from anyone who could have fed or helped'); if (c.hunted) q.push('harried by beasts and never left in peace to eat'); if (!c.roof && c.season === 'winter') q.push('without a roof in the cold'); if (c.sick) q.push('while sick'); if (ev.cause === 'starved' && !c.built) q.push('having built nothing and stored nothing');
        if (ev.cause !== 'old age') lesson(st, (ev.band || []).concat(ev.seenBy || []).filter(function (id, k, arr) { return arr.indexOf(id) === k; }), A + ' ' + how + ' in ' + (c.season || 'the year') + (c.land ? ' in ' + c.land : '') + (q.length ? ': ' + q.join('; ') : '') + '.'); }
      chron(st, 'death', A + ' died: ' + ev.cause + '.', [ev.a], ev);
      break;
    }
    case 'birth': {
      const kid = agentById(w, ev.a) || (w.newborn || []).filter(function (k) { return k.id === ev.a; })[0];
      const p1 = st.minds[ev.p1], p2 = st.minds[ev.p2];
      if (kid) {
        st.names[kid.id] = kid.name;
        const taught = [];
        const foods = {};
        [p1, p2].forEach(function (p) {
          if (!p) return;
          p.notes.slice(-4).forEach(function (n) { const t2 = clip(/^Taught by|^Read on/.test(n) ? n : 'Taught by ' + p.name + ': ' + n, 220); if (!taught.some(function (q) { return sameIdea(q, t2); })) taught.push(t2); });
          for (const k in p.foods) if (!foods[k]) foods[k] = { n: 0, gain: p.foods[k].gain, fx: p.foods[k].fx, seen: 'your parents' };
        });
        st.minds[kid.id] = M.newMind(kid, { creed: (p1 || p2 || {}).creed, notes: taught.slice(0, 8), urge: 8, foods: foods, method: (p2 || p1 || {}).method || '' });
        tell(st, kid.id, 'You were born to ' + nameOf(st, ev.p1) + ' and ' + nameOf(st, ev.p2) + '. You inherited ' + nameOf(st, ev.p1) + "'s creed and reflexes, and lessons from both.", 0);
      }
      story(st, ev.a, 'I was born to ' + nameOf(st, ev.p1) + ' and ' + nameOf(st, ev.p2) + '.'); story(st, ev.p1, 'My child ' + nameOf(st, ev.a) + ' was born, with ' + nameOf(st, ev.p2) + '.'); story(st, ev.p2, 'My child ' + nameOf(st, ev.a) + ' was born, with ' + nameOf(st, ev.p1) + '.');
      tell(st, ev.p1, 'Your child ' + nameOf(st, ev.a) + ' was born (with ' + nameOf(st, ev.p2) + ').', 6, true);
      tell(st, ev.p2, 'Your child ' + nameOf(st, ev.a) + ' was born (with ' + nameOf(st, ev.p1) + ').', 6, true);
      chron(st, 'birth', nameOf(st, ev.a) + ' was born to ' + nameOf(st, ev.p1) + ' and ' + nameOf(st, ev.p2) + '.', [ev.a, ev.p1, ev.p2], kid);
      break;
    }
    case 'gave':
      tell(st, ev.b, A + ' gave you ' + ev.item + '.', 4); tell(st, ev.a, 'You gave ' + ev.item + ' to ' + B + '.', 0);
      chron(st, 'gift', A + ' gave ' + ev.item + ' to ' + B + '.', [ev.a, ev.b], a);
      break;
    case 'court':
      tell(st, ev.b, A + ' is courting you: they want a child with you. To agree, put mate toward ' + A + ' in your plan soon.', 8);
      chron(st, 'court', A + ' is courting ' + B + '.', [ev.a, ev.b], a);
      break;
    case 'built': if (ev.great) { (ev.hands || []).forEach(function (id) { tell(st, id, 'THE ' + String(ev.what).toUpperCase() + ' AT (' + ev.x + ',' + ev.y + ') STANDS. It was raised by ' + ev.hands.map(function (h) { return nameOf(st, h); }).join(', ') + '. Those who raised it are closer for it.', 9, true); story(st, id, 'I helped raise a ' + ev.what + '.'); ev.hands.forEach(function (h) { if (h !== id) tie(st, id, h, 'you raised the ' + ev.what + ' together'); }); }); }
      tell(st, ev.a, 'You built a ' + (ev.what || 'shelter') + ' at (' + ev.x + ',' + ev.y + ').', 1); watch(st, a, 'build:' + ev.what, 'You watched ' + A + ' build a ' + (ev.what || 'shelter') + '.', 2); if (ev.what !== 'fire' || !st._fires || !st._fires[ev.a]) chron(st, 'build', A + ' built a ' + (ev.what || 'shelter') + '.', [ev.a], ev); if (ev.what === 'fire') { st._fires = st._fires || {}; st._fires[ev.a] = 1; } break;
    case 'razed':
      tell(st, ev.a, 'You tore down a ' + ev.what + ' built by ' + B + '.', 1);
      tell(st, ev.b, 'Your ' + ev.what + ' at (' + ev.x + ',' + ev.y + ') was torn down by ' + A + '.', 8, true);
      chron(st, 'fight', A + ' tore down a ' + ev.what + ' built by ' + B + '.', [ev.a, ev.b], ev);
      break;
    case 'stole':
      if (ev.ok) tell(st, ev.a, 'You stole ' + ev.item + ' from ' + B + (ev.seen ? ', but they saw you do it.' : ', and they did not notice.'), 1);
      else tell(st, ev.a, 'You tried to steal from ' + B + ' and were caught.', 3);
      if (ev.seen) { tell(st, ev.b, ev.ok ? A + ' stole ' + ev.item + ' from you. You saw them do it.' : 'You caught ' + A + ' trying to steal from you.', 9, true); story(st, ev.b, A + ' stole from me.'); }
      else if (ev.ok) tell(st, ev.b, 'Some of your food is missing. You did not see who took it.', 5);
      if (a && ev.seen) witnesses(st, a.x, a.y, [ev.a, ev.b]).forEach(function (id) { tell(st, id, 'You saw ' + A + (ev.ok ? ' steal from ' : ' try to steal from ') + B + '.', 3); });
      chron(st, 'theft', A + (ev.ok ? ' stole ' + ev.item + ' from ' : ' tried to steal from ') + B + (ev.seen ? '' : ', unseen') + '.', [ev.a, ev.b], a);
      break;
    case 'offer': tell(st, ev.b, A + ' offers you one ' + ev.give + ' in exchange for one ' + ev.want + '. To accept, put trade toward ' + A + ' in your plan, with what: ' + ev.want + ' and want: ' + ev.give + ', soon.', 7); break;
    case 'traded':
      tell(st, ev.a, 'You traded with ' + B + ': gave ' + ev.gave + ', got ' + ev.got + '.', 1); tell(st, ev.b, 'You traded with ' + A + ': gave ' + ev.got + ', got ' + ev.gave + '.', 1);
      chron(st, 'trade', A + ' and ' + B + ' traded ' + ev.gave + ' for ' + ev.got + '.', [ev.a, ev.b], a);
      break;
    case 'pledged':
      tell(st, ev.b, A + ' has pledged to follow you.', 7, true); story(st, ev.a, 'I pledged myself to ' + B + '.'); story(st, ev.b, A + ' pledged to follow me.');
      if (a) witnesses(st, a.x, a.y, [ev.a, ev.b]).forEach(function (id) { tell(st, id, A + ' now follows ' + B + '.', 2); });
      if (ev.was != null && ev.was !== ev.b) tell(st, ev.was, A + ' has left you and now follows ' + B + '.', 8, true);
      chron(st, 'power', A + ' pledged to follow ' + B + (ev.was != null ? ', leaving ' + nameOf(st, ev.was) : '') + '.', [ev.a, ev.b], a);
      break;
    case 'broke':
      tell(st, ev.b, A + ' no longer follows you.', 8, true); story(st, ev.a, 'I broke from ' + B + '.'); story(st, ev.b, A + ' left me.');
      chron(st, 'power', A + ' broke from ' + B + ' and follows no one.', [ev.a, ev.b], a);
      break;
    case 'leaderless': tell(st, ev.a, 'Your leader ' + B + ' is dead. You follow no one now.', 8, true); story(st, ev.a, 'My leader ' + B + ' died.'); break;
    case 'taught':
      chron(st, 'lore', A + ' taught ' + B + (ev.art ? ' the art of ' + ev.art : '') + '.' + (ev.synthesis >= 2 ? ' ' + B + ' has now learned from ' + ev.synthesis + ' teachers.' : ''), [ev.a, ev.b], a);
      break;
    case 'weather': {
      const txt = { clear: 'The sky cleared.', rain: 'Rain began to fall.', storm: 'A storm broke: cold wind, hard rain, lightning.', drought: 'A dry heat settled over the land.', fog: 'Fog rolled in. You can see only a few steps.', snow: 'Snow began to fall.', heat: 'A heavy heat lies on everything. Thirst comes almost twice as fast.', gale: 'A gale is blowing: a hard, cold wind that cuts through anyone without a roof.' }[ev.kind] || 'The weather turned.';
      for (const id in st.minds) tell(st, +id, txt, ev.kind === 'storm' ? 3 : 1);
      if (ev.kind === 'storm' || ev.kind === 'drought') chron(st, 'sky', txt, []);
      break;
    }
    case 'lightning':
      (ev.hit || []).forEach(function (id) { tell(st, id, 'Lightning struck right beside you and burned you.', 9, true); });
      witnesses(st, ev.x, ev.y, ev.hit || []).forEach(function (id) { tell(st, id, 'Lightning struck the ground at (' + ev.x + ',' + ev.y + ').', 2); });
      break;
    case 'fortune': {
      const txt = ev.kind === 'bloom' ? 'Overnight, new plants sprang up across the land.' : ev.kind === 'blight' ? 'A blight struck the ' + ev.plant + ': about half of them withered overnight.' : ev.kind === 'herd' ? 'A herd of hoppers came in from the ' + ev.side + '.' : 'A pack of stalkers came in from the ' + ev.side + '.';
      for (const id in st.minds) tell(st, +id, ev.kind === 'herd' || ev.kind === 'pack' ? 'At dawn you heard many animals moving to the ' + ev.side + '.' : txt, 2);
      chron(st, 'sky', txt, []);
      break;
    }
    case 'cast': {
      const f = ev.field, what = (ev.laws || [f.law]).join(' and ');
      tell(st, ev.a, 'You worked the world: within ' + f.r + ' steps of (' + f.x + ',' + f.y + '), ' + what + ' is now multiplied by ' + f.factor + ' for about three days. It cost you ' + ev.cost + ' energy.', 2);
      if (a) witnesses(st, a.x, a.y, [ev.a]).forEach(function (id) { tell(st, id, 'You saw ' + A + ' do something to the world itself: the air around (' + f.x + ',' + f.y + ') shimmers' + (f.name ? '. They called it "' + f.name + '"' : '') + '.', 6, true); });
      chron(st, 'magic', A + ' worked the world' + (f.name ? ' ("' + f.name + '")' : '') + ': ' + what + ' ×' + f.factor + ' within ' + f.r + ' steps.', [ev.a], f);
      break;
    }
    case 'edict': {
      const e = ev.edict, what = SW.GREAT_LAWS[e.path], dir = e.factor > 1 ? 'raised' : 'lowered';
      tell(st, ev.a, 'You led a GREAT WORKING' + (e.name ? ', "' + e.name + '"' : '') + ': across the whole world, ' + what + ' is ' + dir + ' (x' + e.factor + ') for about two days.', 3); story(st, ev.a, 'I led a great working that changed the whole world' + (e.name ? ': "' + e.name + '"' : '') + '.');
      e.helpers.forEach(function (id) { tell(st, id, 'You stood with ' + A + ' in a great working' + (e.name ? ', "' + e.name + '"' : '') + '. You felt the whole world shift: ' + what + ' is ' + dir + '.', 6, true); story(st, id, 'I stood with ' + A + ' when the whole world was changed.'); });
      for (const id in st.minds) { if (+id === ev.a || e.helpers.indexOf(+id) >= 0) continue; const o = agentById(w, +id); if (!o) continue; tell(st, +id, o.lore >= 4 ? 'You felt the whole world shift. Someone has bent one of its laws: ' + what + ' is ' + dir + '.' : 'For a moment everything felt wrong, as if the world itself had been moved. You do not know why.', 5, o.lore >= 4); }
      chron(st, 'magic', A + ' and ' + e.helpers.length + ' of their band worked a GREAT WORKING' + (e.name ? ' ("' + e.name + '")' : '') + ': for the whole world, ' + what + ' is ' + dir + ' (x' + e.factor + ').', [ev.a].concat(e.helpers), e);
      break;
    }
    case 'edict_end': chron(st, 'magic', 'The great working' + (ev.edict.name ? ' "' + ev.edict.name + '"' : '') + ' has faded; the law is as it was.', [ev.edict.by], ev.edict); tell(st, ev.edict.by, 'Your great working has faded. The world is as it was.', 3); break;
    case 'faded': tell(st, ev.field.by, 'Your working' + (ev.field.name ? ' "' + ev.field.name + '"' : '') + ' at (' + ev.field.x + ',' + ev.field.y + ') has faded.', 3); break;
    case 'planted': tell(st, ev.a, 'You planted a ' + ev.kind + ' seed.', 0); watch(st, a, 'plant', 'You watched ' + A + ' put a seed into the ground.', 2); break;
    case 'marked': tell(st, ev.a, 'You left a mark at (' + ev.x + ',' + ev.y + ').', 0); chron(st, 'mark', A + ' left a mark' + (ev.text ? ': "' + ev.text + '"' : '.'), [ev.a], ev); break;
    case 'cultivated':
      tell(st, ev.a, 'You bred a new variety, ' + ev.kind + ', from ' + ev.from + (ev.aim ? ' (aiming for ' + ev.aim + ')' : '') + '. You hold its first seed.', 3, true);
      chron(st, 'variety', A + ' bred a new plant: ' + ev.kind + ' (from ' + ev.from + ').', [ev.a], ev);
      break;
    case 'variety': chron(st, 'variety', 'A new wild ' + (ev.flora ? 'plant' : 'creature') + ' appeared: ' + ev.kind + ' (from ' + ev.from + ').', [], ev); break;
    case 'extinct': chron(st, 'extinct', 'The ' + ev.kind + ' died out.', []); break;
    case 'fail': tell(st, ev.a, ev.text, 2); break;
    case 'fx': {
      tell(st, ev.a, 'After ' + ev.from + ': ' + ev.text + '.', 5);
      const fm = st.minds[ev.a]; if (fm) { fm.felt = fm.felt || {}; fm.felt[ev.from] = ev.text; const ks = Object.keys(fm.felt); if (ks.length > 12) delete fm.felt[ks[0]]; }
      break;
    }
    case 'site':
      if (ev.first) { tell(st, ev.a, 'You came upon a strange ' + ev.kind + ' at (' + ev.x + ',' + ev.y + '): "' + ev.name + '". Something in it reached into you.', 7, true); story(st, ev.a, 'I found the ' + ev.kind + ' "' + ev.name + '".'); chron(st, 'magic', A + ' found the ' + ev.kind + ' "' + ev.name + '".', [ev.a], a); }
      break;
    case 'insight': tell(st, ev.a, (ev.why ? 'What you have been through (' + ev.why + ') has shown you something. ' : 'What you have practised has come together. ') + 'The way of ' + ev.node + ' is within your grasp now: ' + clip(ev.hint, 130) + '. Take it at your next deep reflection ("discover").', 7, true); M.record(st, { t: 'insight', name: A, node: ev.node, why: ev.why || '' }); break;
    case 'made': {
      { const C = cult(st), pk = a && a.people != null ? a.people : -1, R = C.rites[pk] = C.rites[pk] || {}; if (!R[ev.what]) { R[ev.what] = { n: 0, first: SW.day(st.world), by: A }; cultLog(st, { k: 'rite', title: ev.what, who: A, people: pk, kind: 'rite' }); } R[ev.what].n++; R[ev.what].last = SW.day(st.world); C.rev = (C.rev || 0) + 1; }
      const who = (ev.with || []).map(function (id) { return nameOf(st, id); });
      if (st.story) st.story.tally['made:' + ev.what] = (st.story.tally['made:' + ev.what] || 0) + 1;
      tell(st, ev.a, 'You did "' + ev.what + '"' + (ev.thing ? ' and now hold a ' + ev.thing : '') + '.', 2);
      (ev.with || []).forEach(function (id) { tell(st, id, A + ' led "' + ev.what + '" and you were part of it.', 5); tie(st, id, ev.a, 'you took part in "' + ev.what + '", which they led'); });
      watch(st, a, 'made:' + ev.what, 'You watched ' + A + ' do "' + ev.what + '".', 2);
      chron(st, who.length ? 'culture' : 'craft', A + (who.length ? ' led "' + ev.what + '" with ' + who.join(', ') : ' made: ' + ev.what) + '.', [ev.a], a);
      break;
    }
    case 'mined': tell(st, ev.a, 'You won ' + ev.kind + ' from the ground at (' + ev.x + ',' + ev.y + '): ' + ((L0.minerals[ev.kind] || {}).hint || '') + '. It is a thing you now hold: it can be given, traded, or made into other things.' + (ev.spent ? ' That deposit is now spent.' : ''), ev.first ? 6 : 2, !!ev.first); watch(st, a, 'mine:' + ev.kind, 'You watched ' + A + ' take ' + ev.kind + ' out of the ground.', 3); if (ev.first) { story(st, ev.a, 'I first took ' + ev.kind + ' from the ground.'); chron(st, 'craft', A + ' won ' + ev.kind + ' from the ground.', [ev.a], a); } break;
    case 'begun': tell(st, ev.a, 'You began a ' + ev.kind + ' at (' + ev.x + ',' + ev.y + '). It is a great work: ' + ev.wood + ' wood and ' + ev.stone + ' stone in all. Anyone may bring wood or stone to it (build with what: ' + ev.kind + ', standing on it), over as many days as it takes.', 6, true); watch(st, a, 'work:' + ev.kind, 'You watched ' + A + ' begin a great work, a ' + ev.kind + ', at (' + ev.x + ',' + ev.y + '). It will take many loads of wood and stone. Anyone can carry to it.', 5); story(st, ev.a, 'I began a ' + ev.kind + '.'); chron(st, 'build', A + ' began a great work: a ' + ev.kind + '.', [ev.a], ev); break;
    case 'laboured': tell(st, ev.a, 'You laboured on the ' + ev.kind + ' and gave ' + ev.gave + ' to it. It still needs ' + ev.left + '.', 2); break;
    case 'paved': if (ev.n === 1) { tell(st, ev.a, 'You paved the ground at (' + ev.x + ',' + ev.y + '). On a road, walking costs half. Each step paved takes 1 stone.', 4, true); chron(st, 'build', A + ' laid the first stone of a road.', [ev.a], ev); } watch(st, a, 'pave', 'You watched ' + A + ' pave the ground into a road.', 3); break;
    case 'poached': {
      const stl = ev.set; tell(st, ev.a, 'You are on the ground of the settlement "' + stl.name + '", which is not yours, and you are taking from it (' + ev.what + '). Those who hold it may not take that kindly.', 5, true);
      w.agents.forEach(function (o) { if (o.id !== ev.a && SW.rootOf(w, o).id === stl.root && a && SW.cheb(o.x, o.y, a.x, a.y) <= w.laws.body.sight) { tell(st, o.id, A + ' is on the ground of your settlement "' + stl.name + '" and taking from it (' + ev.what + '). What lies on your ground is yours to give, to trade, or to defend.', 8, true); tie(st, o.id, ev.a, 'they took from the ground of your settlement'); } });
      chron(st, 'power', A + ' took from the ground of "' + stl.name + '" (' + ev.what + ').', [ev.a], a);
      break;
    }
    case 'fed': tell(st, ev.b, A + ', your parent, put ' + ev.item + ' in your hands when you were hungry.', 5); tell(st, ev.a, 'You put ' + ev.item + ' in the hands of ' + B + ', your child, who was hungry. Your body did it before you thought.', 3); tie(st, ev.b, ev.a, 'they fed you when you were hungry'); break;
    case 'bridged': if (ev.n === 1) { tell(st, ev.a, 'You laid the first span of a bridge at (' + ev.x + ',' + ev.y + '). What is bridged can be walked by anyone, with or without a vessel. Each span takes 3 wood; stand at its end to lay the next.', 5, true); story(st, ev.a, 'I began a bridge.'); chron(st, 'build', A + ' began a bridge at (' + ev.x + ',' + ev.y + ').', [ev.a], ev); } watch(st, a, 'bridge', 'You watched ' + A + ' lay a span of bridge over the water.', 4); break;
    case 'dismantled': tell(st, ev.a, 'You took down your ' + ev.what + ' and kept ' + ev.wood + ' wood and ' + ev.stone + ' stone from it.', 2); break;
    case 'parched': tell(st, ev.a, 'YOU ARE PARCHED. Thirst is wearing you down. Water beside you slakes it at once; so does rain or snow. If it goes on, your body will drag itself toward the nearest water whatever you had planned.', 7, true); break;
    case 'milked': tell(st, ev.a, 'You milked your ' + ev.kind + '. The milk is food you carry. It can be milked again in half a day.', 3); watch(st, a, 'milk', 'You watched ' + A + ' draw milk from a tame ' + ev.kind + '.', 3); if (a && a.stats.milk === 1) { story(st, ev.a, 'I first drew milk from a ' + ev.kind + '.'); chron(st, 'craft', A + ' milked a tame ' + ev.kind + ' for the first time.', [ev.a], a); } break;
    case 'sheared': tell(st, ev.a, 'You sheared your ' + ev.kind + ' and hold its wool, a thing that can go into what you make. It grows back in two days.', 3); watch(st, a, 'shear', 'You watched ' + A + ' shear wool from a tame ' + ev.kind + '.', 3); if (a && a.stats.wool === 1) chron(st, 'craft', A + ' sheared wool from a tame ' + ev.kind + ' for the first time.', [ev.a], a); break;
    case 'rode': if (ev.off) { tell(st, ev.a, 'You got down from your mount.', 1); break; } tell(st, ev.a, 'You are mounted on your ' + ev.kind + '. You cover twice the ground, walking costs you far less, and it carries ' + (L0.ecology.rideCarry || 0) + ' more food for you. "ride" again to get down.', 5, true); watch(st, a, 'ride', 'You watched ' + A + ' climb onto a ' + ev.kind + ' and ride it.', 4); if (a && a.stats.ride === 1) { story(st, ev.a, 'I first rode a ' + ev.kind + '.'); chron(st, 'craft', A + ' rode a ' + ev.kind + ' for the first time.', [ev.a], a); } break;
    case 'used': { const who = (ev.with || []).map(function (id) { return nameOf(st, id); }); if (who.length) { tell(st, ev.a, 'You spent time in the ' + ev.kind + ' with ' + who.join(', ') + '. You feel closer to them for it.', 3); ev.with.forEach(function (id) { tie(st, id, ev.a, 'you sat together in the ' + ev.kind); tie(st, ev.a, id, 'you sat together in the ' + ev.kind); }); } break; }
    case 'tamed': if (a) lesson(st, community(st, a, 30).concat([ev.a]), A + ' walked up to a wild ' + ev.kind + ' with plant food held out, and it became theirs. It follows them now.');
      tell(st, ev.a, 'The ' + ev.kind + ' has taken to you. It will keep near you now, and a wall will hold it where you pen it. ' + ev.n + ' animal' + (ev.n > 1 ? 's follow' : ' follows') + ' you. Those that are yours are far easier to kill for meat, and a pair of them kept together will breed.', 6, true); story(st, ev.a, 'I tamed a ' + ev.kind + '.'); watch(st, a, 'tame', 'You watched ' + A + ' offer food to a ' + ev.kind + ' until it followed.', 3); chron(st, 'craft', A + ' tamed a ' + ev.kind + '.', [ev.a], a); break;
    case 'rallied': {
      const who = ev.with.map(function (id) { return nameOf(st, id); });
      ev.with.forEach(function (id) { tell(st, id, 'YOUR LEADER ' + A + ' HAS CALLED THE BAND TO BATTLE against ' + B + '. Your body is already moving to attack. If you will not fight, change your plan now.', 10, true); tie(st, id, ev.a, 'they called you to battle against ' + B); });
      tell(st, ev.b, A + ' has called a band to battle AGAINST YOU: ' + who.join(', ') + ' are coming.', 10, true); tie(st, ev.b, ev.a, 'they led a band to attack you');
      story(st, ev.a, 'I led my band into battle against ' + B + '.'); story(st, ev.b, A + ' led a band against me.');
      chron(st, 'fight', A + ' led ' + who.join(', ') + ' into battle against ' + B + '.', [ev.a, ev.b], a);
      break;
    }
    case 'disaster': {
      const at = ' around (' + ev.x + ',' + ev.y + ')', lostB = ev.down ? ', and ' + ev.down + ' built things were lost' : '';
      const what = { wildfire: 'A WILDFIRE swept the land' + at + ', ' + ev.r + ' steps wide: plants burned, trees fell to ash' + lostB, quake: 'THE EARTH SHOOK' + at + (ev.down ? ' and ' + ev.down + ' built things fell' : ''), plague: 'A SICKNESS came on the wind and took hold of some', locusts: 'A CLOUD OF LOCUSTS stripped every plant bare' + at,
        tornado: 'A TWISTING WIND came down and tore a path from (' + ev.x + ',' + ev.y + ') to (' + ev.x2 + ',' + ev.y2 + '), flinging what stood in it' + lostB, hurricane: 'A GREAT STORM came in off the water. The waters rose along every shore and river: what stood within three steps of water was battered' + lostB + '. The storm will last more than a day', blizzard: 'A BLIZZARD came down over everything: for a day the cold bites far harder on anyone without a roof, and half the food on the plants is lost under the snow', volcano: 'THE MOUNTAIN at (' + ev.x + ',' + ev.y + ') BROKE OPEN in fire: everything within ' + ev.r + ' steps burned' + lostB + ', and ash darkens the sky. (Ash makes ground rich afterwards. A mountain that has burned once may burn again.)' }[ev.kind] || 'A calamity struck';
      const short = { wildfire: 'a wildfire', quake: 'the earth shaking', plague: 'a sickness on the wind', locusts: 'locusts stripping the land', tornado: 'a twisting wind', hurricane: 'a great storm from the water', blizzard: 'a blizzard', volcano: 'the mountain breaking open in fire' }[ev.kind] || 'a calamity';
      const when = SW.SEASONS[SW.season(w)] + ', day ' + SW.day(w);
      w.agents.forEach(function (o) { const struck = ev.hit.indexOf(o.id) >= 0, near = ev.all || struck || (ev.kind !== 'plague' && (SW.cheb(o.x, o.y, ev.x, ev.y) <= ev.r + 7 || (ev.x2 != null && SW.cheb(o.x, o.y, ev.x2, ev.y2) <= 8))); if (!near) return; tell(st, o.id, what + '. It was ' + when + '.', struck ? 10 : 6, true); story(st, o.id, (struck ? 'I lived through ' : 'I saw ') + short + ' in ' + SW.SEASONS[SW.season(w)] + '.'); seasonSaw(st, o.id, short); });
      chron(st, 'sky', what + '.', ev.hit, { x: ev.x, y: ev.y });
      break;
    }
    case 'robbed': {
      const who = (ev.near || []).map(function (id) { return nameOf(st, id); });
      tell(st, ev.a, 'Your store at (' + ev.x + ',' + ev.y + ') has been ROBBED: ' + ev.n + ' food is gone. You did not see who took it.' + (who.length ? ' Not of your band, and near it now: ' + who.join(', ') + '.' : ' No stranger is near it now.'), 9, true);
      story(st, ev.a, 'I found my store robbed of ' + ev.n + ' food.'); chron(st, 'theft', A + ' found a store robbed of ' + ev.n + ' food.', [ev.a], a);
      break;
    }
    case 'felled': if (!ev.left) tell(st, ev.a, 'You felled the last tree standing at (' + ev.x + ',' + ev.y + '). Only stumps are left there; it will be long before trees grow back.', 3); break;
    case 'dropped': tell(st, ev.a, 'You dropped ' + ev.n + ' ' + ev.kind + '. Your hands are freer.', 0); break;
    case 'preykill': {
      witnesses(st, ev.x, ev.y, []).forEach(function (id) { tell(st, id, 'You saw a ' + ev.by + ' bring down a ' + ev.prey + ' at (' + ev.x + ',' + ev.y + ') and eat it.', 3); });
      const dk = SW.day(w); if (st.killDay !== dk) { st.killDay = dk; chron(st, 'hunt', 'A ' + ev.by + ' brought down a ' + ev.prey + '.', [], { x: ev.x, y: ev.y }); }
      break;
    }
    case 'low': (ev.near || []).forEach(function (id) { tell(st, id, A + ' IS STARVING, here beside you: gaunt, unsteady, close to falling. Food put in their hands now would save them.', 9, true); }); (ev.kin || []).forEach(function (id) { tell(st, id, 'A cry reaches you from the direction of (' + ev.x + ',' + ev.y + '): ' + A + ', who is one of yours, is STARVING.', 9, true); });
      tell(st, ev.a, 'Your energy fell below 25. You are starving. Those near have seen it.', 10); { const lm = st.minds[ev.a]; if (lm && !lm.starved) { lm.starved = 1; story(st, ev.a, 'I nearly starved.'); } } break;
    case 'intent_done': tell(st, ev.a, 'A step of your plan (' + ev.did + ') ended: ' + (ev.ok ? 'the time you gave it ran out.' : 'it is finished or was not possible.') + (ev.left ? ' ' + ev.left + ' more step' + (ev.left > 1 ? 's' : '') + ' follow.' : ' Your plan is now empty; your body is back on reflexes.'), ev.left ? 0 : 3); break;
    case 'saw':
      if (ev.first) { tell(st, ev.a, 'You met ' + B + ' for the first time.', 5); const ob = agentById(w, ev.b); if (a && ob && a.people !== ob.people && a.id < ob.id) { const T0 = w.tally; T0.met = T0.met || []; T0.met.push({ day: SW.day(w), a: A, b: B, land: (SW.regionAt(w, a.x, a.y) || {}).name || '' }); if (T0.met.length > 40) T0.met.shift(); } }
      else tell(st, ev.a, 'You came across ' + B + ' again.', 1);
      break;
    case 'said': {
      const to = ev.to && ev.to !== 'all' ? String(ev.to) : 'all';
      (ev.hearers || []).forEach(function (id) {
        const me = nameOf(st, id), mine = to.toLowerCase() === me.toLowerCase();
        const hr = agentById(w, id), u = a && hr ? SW.hear(w, hr, a, mine) : 1, txt = u >= 0.95 || !a ? ev.text : SW.garble(w, ev.text, a.lang, u), sp = a ? SW.peopleOf(w, a) : null;
        tell(st, id, A + ' said to ' + (mine ? 'you' : to === 'all' ? 'everyone nearby' : to) + (u < 0.95 ? ' (in the tongue of ' + (sp ? sp.name : 'another people') + ', of which you grasp ' + (u < 0.05 ? 'nothing yet' : 'about ' + Math.round(u * 100) + '%') + '; the more of it you hear, the more you will grasp)' : '') + ': "' + txt + '"', mine ? 10 : to === 'all' ? 6 : 3);
        const hm = st.minds[id]; if (hm && (mine || to === 'all')) { hm.heard.push({ from: A, id: ev.a, text: txt, tick: w.tick }); if (hm.heard.length > 8) hm.heard.shift(); }
      });
      if (ev.missed) tell(st, ev.a, 'You spoke to ' + ev.missed + ', but they were too far away to hear you.', 1);
      else if (!(ev.hearers || []).length) tell(st, ev.a, 'You spoke aloud, but no one was near enough to hear.', 0);
      { const sm = st.minds[ev.a]; if (sm) { sm.said.push({ to: to, text: ev.text, tick: w.tick }); if (sm.said.length > 6) sm.said.shift(); } }
      M.record(st, { t: 'voice', name: A, to: to, text: ev.text, heard: (ev.hearers || []).map(function (id) { return nameOf(st, id); }) });
      st.voices.push({ tick: w.tick, a: ev.a, name: A, to: to, text: ev.text, heard: (ev.hearers || []).map(function (id) { return nameOf(st, id); }), x: a ? a.x : null, y: a ? a.y : null });
      if (st.voices.length > 600) st.voices.shift();
      break;
    }
  }
  st.ui(ev);
};

/* ---------- the prompt: everything a mind knows, in its own terms ---------- */
function warmth(v) { return v > 0.6 ? 'trust' : v > 0.2 ? 'warm' : v < -0.6 ? 'enemy' : v < -0.2 ? 'wary' : 'neutral'; }
M.ruleText = function (r, i) {
  const c = (r.if || []).map(function (q) { return q[0] + ' ' + q[1] + ' ' + q[2]; }).join(' AND ') || 'always';
  const p = [];
  ['target', 'from', 'name', 'what', 'dir', 'aim', 'text'].forEach(function (k) { if (r[k] != null) p.push(k + ' ' + r[k]); });
  if (r.x != null) p.push('(' + r.x + ',' + r.y + ')');
  return (i != null ? (i + 1) + '. ' : '') + 'IF ' + c + ' THEN ' + r.do + (p.length ? ' [' + p.join(', ') + ']' : '') + (r.urgent ? ' (urgent)' : '');
};
M.needsText = function (N) {
  N = N || {}; const p = [];
  ['wood', 'stone', 'ore', 'clay'].forEach(function (k) { if (N[k]) p.push(N[k] + ' ' + k); });
  if (N.food) p.push((N.foodN || 1) + (N.food === 'any' ? ' food of any kind' : ' ' + N.food) + ' carried'); if (N.thing) p.push((N.thingN || 1) + ' ' + N.thing);
  if (N.at) p.push('to be in or beside a ' + N.at); if (N.tool) p.push('a tool for ' + N.tool + ' in your hands'); if (N.fire) p.push('a fire beside you'); if (N.water) p.push('water beside you'); if (N.night) p.push('night'); if (N.on) p.push('standing on ' + N.on);
  if (N.beings) p.push(N.beings + ' others within two steps');
  return p.length ? p.join(', ') : 'nothing';
};
function stepText(it) { const p = []; ['target', 'from', 'name', 'what', 'want', 'dir', 'aim', 'text'].forEach(function (k) { if (it[k] != null) p.push(k + ' ' + it[k]); }); if (it.x != null) p.push('(' + it.x + ',' + it.y + ')'); return it.do + (p.length ? ' [' + p.join(', ') + ']' : '') + ' (' + it.ticks + ' moments)'; }
M.stepText = stepText;
M.foodLine = function (k, f) { return f.told ? k + ': ' + f.told + ' SAYS it ' + (f.gain < 0 ? 'hurts' : 'is good') + ' (only their word; untested)' : k + ': ' + (f.gain < 0 ? 'HURTS, ' + f.gain + ' energy' : '+' + f.gain + ' energy') + (f.fx ? '; ' + f.fx : '') + (f.seen ? ' (not tried; seen in ' + f.seen + ')' : ' (eaten ' + f.n + 'x)'); };
M.buildPrompt = function (st, mind, kind, lean) {
  const w = st.world, a = agentById(w, mind.id), L = w.laws, v = SW.look(w, a), t = a.temperament;
  const night = SW.isNight(w), ph = SW.dayPhase(w), nightAt = 1 - L.time.nightFraction;
  const until = night ? Math.round((1 - ph) * L.time.dayLength) : Math.round((nightAt - ph) * L.time.dayLength);
  const r2 = function (x) { return Math.round(x * 10) / 10; };
  const out = [];
  out.push('You are the mind of ' + a.name + ', a creature living in a wide wild world shared with others of your kind. This is a simulation game. Think and speak only as ' + a.name + ', in first person, from what ' + a.name + ' has seen. You were not told the rules of this world; you learn them from what happens to you and to others, and from what you watch others do.');
  {
    const P = SW.peopleOf(w, a), R = SW.regionAt(w, a.x, a.y), q = SW.siteQuality(w, a.x, a.y);
    if (P) {
      const tg = Object.keys(a.tongues || {}).filter(function (lg) { return +lg !== a.lang && a.tongues[lg] > 0.02; }).map(function (lg) { const op = (w.peoples || []).filter(function (x) { return x.tongue === +lg; })[0]; return (op ? 'the tongue of ' + op.name : 'another tongue') + ': about ' + Math.round(a.tongues[lg] * 100) + '%'; });
      out.push('YOUR PEOPLE: you are of ' + P.name + ' (' + P.noun + ')' + (a.mixed ? ', born of two peoples' : '') + '. Your people hold to this: "' + P.custom + '" You speak the tongue of ' + P.name + '.' + (tg.length ? ' Other tongues you have begun to understand by hearing them: ' + tg.join('; ') + '.' : '') + (mind.thoughts < 5 || mind.thoughts % 6 === 0 ? ' There are other peoples in this world. They look different, name themselves differently and speak tongues you do not know until you have heard enough of them; words you cannot yet understand reach you as strange sounds. What cannot be said can still be shown: a gift, a thing set down, a blow.' : ''));
    }
    if (R) {
      const S0 = w.laws.time.seasonDays * w.laws.time.dayLength, left = Math.ceil((S0 - (w.tick % S0)) / w.laws.time.dayLength);
      out.push('WHERE YOU ARE: ' + R.name + ': ' + SW.BIOMES[R.biome].say + '.' + (mind.thoughts < 5 || mind.thoughts % 6 === 0 ? ' The world is made of lands unlike each other; each has plants, animals and riches the others lack. Rivers and shallows can be waded. Deep water cannot be crossed without something that floats.' : '') + '\nTHIS SPOT: water ' + (q.water <= 1 ? 'beside you' : q.water + ' steps away') + '; food plants within six steps: ' + q.food + '; standing trees: ' + q.wood + '; bare rock: ' + q.stone + (q.riches.length ? '; riches in the ground near: ' + q.riches.join(', ') : '') + (q.caves ? '; a cave' : '') + '.' + (a.knows.calendar ? ' By your count of days: ' + left + ' until the season turns.' : ''));
    }
  }
  out.push('Your body: you spend energy every moment and die at 0. Eating restores it. Wounds lower health; you die at 0. You age, and will die of old age.');
  out.push('HOW YOUR BODY MOVES: your body does only what your "plan" says, one step after another. When the plan is empty it falls back on your REFLEXES, which keep you fed and otherwise keep you where you stand. Thinking or saying "I will go north" moves nothing. If this thought decides to do something, the plan must contain it. Leaving "plan" null lets the plan you already have keep running.');
  out.push('This world has no referee. Beings here share, trade, teach, lie, threaten, steal, hoard, lead, follow, betray, fight, kill and eat one another; they also protect, forgive and love. Nothing is forbidden, and everything has consequences. Stay true to your creed, your temperament and what you feel, including the ugly parts. Do not be kinder, calmer or more reasonable than ' + a.name + ' truly is.');
  out.push('YOUR CREED (your own words to yourself; this is who you are):\n"' + mind.creed + '"');
  if (mind.method) out.push('HOW YOU HAVE TAUGHT YOURSELF TO THINK (your own discipline; follow it):\n"' + mind.method + '"');
  out.push('YOUR AIM (what you are working toward over many days; you set it and may change it): ' + (mind.aim ? '"' + mind.aim + '"' : 'none yet. A being without an aim only reacts.') +
    (mind.feeling ? '\nWHAT YOU FELT AT YOUR LAST THOUGHT: "' + mind.feeling + '"' : '') +
    (mind.wonder ? '\nA QUESTION YOU ARE CARRYING (answer it by acting, asking or watching; replace it when it is answered): "' + mind.wonder + '"' : ''));
  if (mind.life.length) out.push('YOUR LIFE SO FAR:\n' + (kind === 'deep' ? mind.life : mind.life.slice(0, 1).concat(mind.life.slice(1).slice(-4))).map(function (e) { return '- (day ' + (Math.floor(e.tick / L.time.dayLength) + 1) + ') ' + e.text; }).join('\n'));
  out.push('TEMPERAMENT (0 to 1): bold ' + t.bold + ', sociable ' + t.sociable + ', curious ' + t.curious + ', gentle ' + t.gentle + ', honest ' + t.honest + ', greedy ' + t.greedy + '.');
  const md = a.mood;
  out.push('YOU FEEL (0 calm to 1 overwhelming): anger ' + r2(md.anger) + ', fear ' + r2(md.fear) + ', grief ' + r2(md.grief) + ', joy ' + r2(md.joy) + ', loneliness ' + r2(md.lonely) + '.');
  const dr = M.drives(st, mind, a, v);
  out.push('WHAT PRESSES ON YOU NOW, strongest first. This is what your mind is actually full of:\n' + (dr.length ? dr.map(function (d) { return '- (' + STRENGTH(d.s) + ') ' + d.text; }).join('\n') : '- Nothing presses hard. You are at ease, and an easy mind wanders: toward others, toward what you do not know, toward what you might make of yourself.') +
    (dr.fed ? '\nYou are fed' + (dr.full ? ' and your hands are full' : '') + '. Food is not your problem right now, and getting more of it would change nothing.' : ''));
  const band = SW.bandOf(w, a), mine = w.agents.filter(function (o) { return o.leader === a.id; }).map(function (o) { return o.name; });
  const root = SW.rootOf(w, a);
  { const sv = SW.status(w, a), rl = SW.roleOf(w, a); out.push('YOUR STANDING among others: ' + sv.toFixed(1) + (rl ? '. You are known as a ' + rl : '') + '.' + (mind.thoughts < 4 || mind.thoughts % 5 === 0 ? ' Standing is how others weigh you. It is earned by what you hold, make, build, know, teach and give, by children and followers, by victories and by being sung of; it is lost through shame. No one will pledge to follow someone of lower standing than their own, or below ' + w.laws.status.leadNeeds + '.' : '')); }
  let al = 'ALLEGIANCE: ' + (a.leader != null ? 'You follow ' + nameOf(st, a.leader) + '.' : 'You follow no one.') + (mine.length ? ' These follow you: ' + mine.join(', ') + '.' : ' No one follows you.') + (a.leader == null && !mine.length && mind.thoughts % 3 === 0 ? ' (What a band is: those who follow one leader stand together. An attack on one is news to all; the leader can call all to battle; near the one you follow, fear loosens; a band can hold ground, a settlement and customs. People follow one who has fed them, healed them, taught them or kept them safe, not one who merely asks.)' : '') + (band ? ' Your band is called "' + band.name + '" (' + band.members.length + ' members: ' + band.members.map(function (o) { return o.name; }).join(', ') + '; led by ' + band.leader.name + ').' : '');
  if (root.customs.length) al += '\nCustoms of your band: ' + root.customs.map(function (c, i) { return (i + 1) + '. ' + c; }).join(' ');
  const sts = Object.keys(root.stances).map(function (id) { const o = agentById(w, +id); if (!o) return null; const b = SW.bandOf(w, o); return (b ? b.name + ' (led by ' + o.name + ')' : o.name) + ': ' + root.stances[id]; }).filter(Boolean);
  if (sts.length) al += '\nYour band\'s stance toward others: ' + sts.join('; ') + '.';
  out.push(al);
  const known = Object.keys(a.knows).map(function (id) { return id + ' (yours is called "' + a.knows[id].name + '")'; });
  out.push('LORE (your grasp of how this world works underneath): ' + r2(a.lore) + '.' + (a.arts.length ? ' ARTS you know: ' + a.arts.join(', ') + '.' : '') + (known.length ? '\nWAYS YOU KNOW: ' + known.join(', ') + '.' : ''));
  mind.seenSeq = st.seq || 0;
  const lay = Object.keys(v.around).map(function (d) { return d + ' ' + v.around[d]; }).join(', ');
  out.push('NOW: day ' + SW.day(w) + ', ' + SW.SEASONS[SW.season(w)] + ', ' + SW.phaseName(w) + ' (' + (night ? 'dawn' : 'night') + ' in about ' + until + ' moments; a full day is ' + L.time.dayLength + ').' + (SW.season(w) === 2 ? ' The air is turning. Something in your body says lean, cold days are coming.' : SW.season(w) === 3 ? ' It is winter: the plants bear almost nothing and what hung on them is withering.' : '') + ' Weather: ' + w.weather.kind + (w.weather.kind === 'fog' ? ' (you can see only ' + SW.sight(w) + ' steps)' : '') + '. You stand at (' + a.x + ',' + a.y + ') on ' + v.terrain + '. The world spans x 0-' + (w.W - 1) + ' (west to east), y 0-' + (w.H - 1) + ' (north to south).\nTen steps off, the land is: ' + lay + '.' +
    (v.settlements.length ? '\nSettlements: ' + v.settlements.slice(0, 3).map(function (q) { return '"' + q.name + '" at (' + q.x + ',' + q.y + '), ' + (q.inside ? 'YOU ARE INSIDE IT' : q.d + ' steps ' + q.dir) + (q.mine ? ' (YOUR HOME)' : ' (ground of ' + nameOf(st, q.root) + "'s people)"); }).join('; ') + '.' : '') +
    (v.places.length ? '\nNamed places: ' + v.places.slice(0, 3).map(function (p) { return '"' + p.name + '" at (' + p.x + ',' + p.y + '), ' + p.d + ' steps ' + p.dir + ' (named by ' + p.byName + ')'; }).join('; ') + '.' : ''));
  const carry = {}; a.carry.forEach(function (c) { carry[c.k] = (carry[c.k] || 0) + 1; });
  const seeds = {}; a.seeds.forEach(function (c) { seeds[c] = (seeds[c] || 0) + 1; });
  const list = function (o) { const ks = Object.keys(o); return ks.length ? ks.map(function (k) { return k + ' x' + o[k]; }).join(', ') : 'none'; };
  out.push('BODY: energy ' + Math.round(a.e) + '/100, health ' + Math.round(a.hp) + '/100, age ' + Math.round(100 * a.age / a.life) + '% of a lifetime. Carrying food: ' + list(carry) + ' (' + a.carry.length + ' of the ' + SW.carryCap(w, a) + ' you can hold' + (a.carry.length >= SW.carryCap(w, a) ? '; YOUR HANDS ARE FULL: harvest, fish and take will fail until you eat, give, stash or drop something' : '') + (a.carry.some(function (c) { return a.habits.avoid.indexOf(c.k) >= 0; }) ? '; some of it is food your body refuses to eat, dead weight unless you give it away or drop it' : '') + '). Seeds: ' + list(seeds) + '. Wood: ' + a.wood + '. Stone: ' + a.stone + (a.ore ? '. Ore: ' + a.ore : '') + (a.clay ? '. Clay: ' + a.clay : '') + (a.pots ? '. Pots: ' + a.pots : '') + '. In a shelter: ' + (a.sheltered ? 'yes' : 'no') + '.' +
    (SW.stage(w, a) === 'child' ? '\nYou are a CHILD: small, weak in a fight, cheap to feed, quick to learn from a teacher, and not yet able to mate.' : SW.stage(w, a) === 'elder' ? '\nYou are OLD: walking tires you and your blows are weak, but your teaching carries further. What you know dies with you unless you pass it on.' : '') +
    (a.things && Object.keys(a.things).some(function (k) { return a.things[k] > 0; }) ? '\nTHINGS YOU HOLD: ' + Object.keys(a.things).filter(function (k) { return a.things[k] > 0; }).map(function (k) { return k + ' x' + a.things[k]; }).join(', ') + '.' : '') +
    (function () { const wb = SW.wellbeing(a), wd = function (x, lo, mid, hi) { return x < 0.2 ? lo : x < 0.5 ? mid : hi; }, th = a.thirst || 0; return '\nTHIRST: ' + (th < 40 ? 'slaked' : th < 70 ? 'thirsty' : 'PARCHED') + ((a.pots || 0) ? '; water carried in pots: ' + (a.water || 0) + ' drinks' : '') + '.\nHOW YOU FARE: suffering ' + wd(wb.suffering, 'little', 'a good deal', 'GREATLY') + ' right now; ' + wd(wb.happiness, 'joyless', 'some gladness', 'glad') + ' these last hours; ' + (wb.satisfaction < 0.42 ? 'your life as a whole has been hard and unsatisfying' : wb.satisfaction < 0.6 ? 'your life as a whole is bearable, neither good nor bad' : 'your life as a whole is good') + '. (Others can see how you fare, as you can see it in them.)'; })() +
    (a.boons && a.boons.length ? '\nRIGHT NOW IN YOUR BODY: ' + a.boons.map(function (q) { return q.k + ' x' + q.v + ' for ' + Math.max(0, q.until - w.tick) + ' more moments (from ' + q.src + ')'; }).join('; ') + '.' : '') +
    (w.creatures.some(function (c) { return c.keeper === a.id; }) ? '\nANIMALS THAT ARE YOURS: ' + (function () { const o = {}; w.creatures.forEach(function (c) { if (c.keeper === a.id) o[c.sp] = (o[c.sp] || 0) + 1; }); return Object.keys(o).map(function (k) { return k + ' x' + o[k]; }).join(', '); })() + '. They keep near you.' + (function () { const g = {}; w.creatures.forEach(function (c) { if (c.keeper !== a.id) return; const so = L.creatures[c.sp] || {}; if (so.milk) g['milk (do: milk)'] = 1; if (so.wool) g['wool (do: shear)'] = 1; if (so.ride) g['a mount (do: ride)'] = 1; }); const k = Object.keys(g); return k.length ? ' Standing beside a grown one, it can give you: ' + k.join(', ') + '.' : ''; })() + (a.mount ? ' YOU ARE MOUNTED.' : '') : '') +
    (a.sick > 0 ? '\nYOU ARE SICK. It wastes your energy and health until it passes, and it spreads to anyone who stays beside you. A healing plant eases it.' : '') +
    (v.wars.length ? '\nAT WAR: ' + v.wars.map(function (q) { return 'with ' + q.name + ' for ' + q.days + ' days, ' + q.dead + ' dead'; }).join('; ') + '. Only a leader ends a war, by declaring the other side neutral or ally.' : '') +
    (a.tools.length ? '\nTOOLS YOU CARRY: ' + a.tools.map(function (q) { const d = L.tools[q.k]; return d ? q.k + ' (for ' + d.use + ', strength x' + d.power + ', ' + q.wear + ' uses left)' : q.k; }).join('; ') + '. A tool works by itself whenever you do its kind of work.' : '') +
    (Object.keys(a.designs).length ? '\nTHINGS YOU KNOW HOW TO MAKE: ' + Object.keys(a.designs).filter(function (k) { return L.tools[k]; }).map(function (k) { const d = L.tools[k]; return k + ' (for ' + d.use + ', x' + d.power + ', costs ' + d.wood + ' wood + ' + d.stone + ' stone' + (d.by === a.id ? ', your own invention' : ', invented by ' + d.byName) + ')'; }).join('; ') + '.' : '') + '\n' +
    'YOUR PLAN: ' + (a.intent ? 'now doing ' + stepText(a.intent) + (a.plan.length ? '; then ' + a.plan.map(stepText).join('; then ') : '') + '. THIS PLAN IS STILL RUNNING' + (a.plan.length ? ' and ' + a.plan.length + ' step' + (a.plan.length > 1 ? 's have' : ' has') + ' not begun' : '') + '. A new plan throws the rest of it away. Answer "plan": null to let it finish, unless something has changed' : 'empty. Your body is on reflexes (just now: ' + a.doing + ').'));
  if (mind.actN > 20) {
    const acts = Object.keys(mind.act).filter(function (k) { return mind.act[k] / mind.actN >= 0.03; }).sort(function (p, q) { return mind.act[q] - mind.act[p]; }).slice(0, 5).map(function (k) { return k + ' ' + Math.round(100 * mind.act[k] / mind.actN) + '%'; });
    out.push('WHAT YOUR BODY HAS ACTUALLY BEEN DOING since your last thought (' + mind.actN + ' moments): ' + acts.join(', ') + '. Energy went from ' + Math.round(mind.e0) + ' to ' + Math.round(a.e) + '.');
  }
  const see = [];
  (v.lodes || []).slice(0, 4).forEach(function (q) { const md = L.minerals[q.k] || {}; see.push('- a deposit of ' + q.k + ' at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + ': ' + (md.hint || '') + (q.deep && !a.knows.mining ? '. It lies deep; bare hands will not win it' : '. Stand on it and gather')); });
  const here = w.plants[SW.idx(w, a.x, a.y)];
  if (v.water) see.push('- water: nearest at (' + v.water.x + ',' + v.water.y + '), ' + v.water.d + ' steps ' + v.water.dir + (v.water.river ? ' (a river: it can be waded)' : ''));
  if (v.seam) see.push('- a seam of ore shows in the rock at (' + v.seam.x + ',' + v.seam.y + '), ' + v.seam.d + ' steps ' + v.seam.dir);
  (v.sites || []).forEach(function (q) { see.push('- a strange ' + q.kind + ', "' + q.name + '", at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + (q.met ? ' (it has touched you before)' : ' (you have never been near it)')); });
  if (here) see.push('- under you: ' + here.sp + (here.g < 1 ? ' (young, not yet bearing)' : ', ' + Math.floor(here.food + 1e-9) + ' food') + (here.t ? ' (tended)' : ''));
  const tally = {};
  v.plants.forEach(function (p) { if (p.d === 0) return; (tally[p.sp] = tally[p.sp] || []).push(p); });
  Object.keys(tally).forEach(function (k) {
    const ps = tally[k], n = ps[0];
    see.push('- ' + k + ': ' + ps.length + ' in sight; nearest at (' + n.x + ',' + n.y + '), ' + n.d + ' steps ' + n.dir + (n.young ? ', young' : ', ' + n.food + ' food'));
  });
  const ct = {};
  v.creatures.forEach(function (c) { (ct[c.sp] = ct[c.sp] || []).push(c); });
  Object.keys(ct).forEach(function (k) { const n = ct[k][0]; see.push('- ' + k + ' (animal' + (n.predator ? ', a HUNTER: it kills' : ', it could be hunted for meat, or tamed: plan step tame, carrying plant food, and you will walk up to it slowly' + ((L.creatures[k] || {}).milk || (L.creatures[k] || {}).wool || (L.creatures[k] || {}).ride ? '; tamed, its kind gives ' + ['milk', 'wool', 'ride'].filter(function (g) { return (L.creatures[k] || {})[g]; }).map(function (g) { return g === 'ride' ? 'a mount' : g; }).join(' and ') : '')) + '): ' + ct[k].length + ' in sight; nearest ' + n.d + ' steps ' + n.dir); });
  v.shelters.slice(0, 3).forEach(function (q) { see.push(q.owner < 0 ? '- a cave at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + ': a natural roof in the rock that is no one\'s' : '- ' + (q.kind || 'shelter') + ' at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + (q.owner === a.id ? ' (you built it)' : ', built by ' + nameOf(st, q.owner))); });
  v.fires.slice(0, 2).forEach(function (q) { see.push('- a fire burning at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + ' (' + q.left + ' moments of fuel left)'); });
  v.stores.slice(0, 2).forEach(function (q) { see.push('- a store at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + ', built by ' + (q.owner === a.id ? 'you' : nameOf(st, q.owner)) + ', holding ' + q.n + ' food'); });
  v.devices.slice(0, 4).forEach(function (q) { see.push('- a device, "' + q.k + '", set by ' + (q.by === a.id ? 'you' : q.byName) + ' at (' + q.x + ',' + q.y + '), ' + q.d + ' steps ' + q.dir + (q.barred ? '; it bars the way' + (q.mine ? ' (not to you)' : ' TO YOU') : '') + (q.hold ? '; it holds ' + q.hold + ' food' : '')); });
  v.marks.slice(0, 4).forEach(function (m) { see.push('- a mark left by ' + m.name + ' at (' + m.x + ',' + m.y + ')' + (m.text ? ': "' + m.text + '"' : '')); });
  Object.keys(v.walls).forEach(function (id) { see.push('- walls built by ' + (+id === a.id ? 'you' : nameOf(st, +id)) + ': ' + v.walls[id] + ' in sight' + (SW.allied(w, a, +id) ? ' (you may pass)' : ' (they block you)')); });
  v.fields.slice(0, 4).forEach(function (f) {
    const knows = f.by === a.id || a.lore >= 3;
    see.push('- a working raised by ' + (f.by === a.id ? 'you' : f.byName) + (f.name ? ', called "' + f.name + '"' : '') + ': the air shimmers within ' + f.r + ' steps of (' + f.x + ',' + f.y + ')' + (f.inside ? '; YOU ARE INSIDE IT' : '') + (knows ? '. In it, ' + f.law + ' is multiplied by ' + f.factor + ' (' + f.left + ' moments left)' : '. You do not understand what it does'));
  });
  out.push('WHAT YOU SEE (within ' + SW.sight(w) + ' steps):\n' + (see.length ? see.join('\n') : '- nothing but bare ground'));
  const others = v.agents.slice(0, 8).map(function (o) {
    const r = a.rel[o.id] || 0, ob = SW.bandOf(w, agentById(w, o.id));
    const oa = agentById(w, o.id), op = oa && SW.peopleOf(w, oa), foreign = op && op.id !== a.people ? ' [of ' + op.name + ', ' + op.noun + ', NOT YOUR PEOPLE; you understand ' + (SW.understands(a, oa.lang) < 0.05 ? 'none' : 'about ' + Math.round(100 * SW.understands(a, oa.lang)) + '%') + ' of their speech]' : '';
    return '- ' + o.name + foreign + ' at (' + o.x + ',' + o.y + '), ' + o.d + ' steps ' + o.dir + '; looks ' + (o.hp < 50 ? 'wounded' : o.e < 30 ? 'weak with hunger' : o.e > 70 ? 'strong' : 'well enough') + (o.young ? ', a child' : '') + (o.old ? ', old' : '') + (o.sick ? ', SICK' : '') + (o.suffer > 0.55 ? ', plainly SUFFERING' : o.happy > 0.6 ? ', content and at ease' : '') + (o.thirst > 75 ? ', parched' : '') + '; standing ' + (o.status || 0).toFixed(1) + (o.role ? ', known as a ' + o.role : '') + (function () { const oa = w.agents.filter(function (q) { return q.id === o.id; })[0]; if (!oa) return ''; const kin = (a.parents || []).indexOf(oa.id) >= 0 ? 'YOUR PARENT' : (oa.parents || []).indexOf(a.id) >= 0 ? 'YOUR CHILD' : (a.parents || []).length && (oa.parents || []).some(function (q) { return a.parents.indexOf(q) >= 0; }) ? 'YOUR SIBLING' : ''; return (kin ? ', ' + kin + ' (close kin: no child can come of the two of you)' : '') + (a.faith && oa.faith === a.faith ? ', holds the teaching you hold' : oa.faith && (w.culture.items[oa.faith] || {}).title ? ', holds a teaching called "' + w.culture.items[oa.faith].title + '"' : ''); })() + (o.mounted ? ', MOUNTED on an animal' : '') + (o.mood.anger > 0.5 ? ', furious' : o.mood.fear > 0.5 ? ', frightened' : o.mood.grief > 0.5 ? ', grieving' : o.mood.joy > 0.5 ? ', glad' : '') +
      (o.tools.length ? '; carries ' + o.tools.join(', ') : '') + (o.stance === 'own' ? '; OF YOUR BAND' : ob ? '; of the band "' + ob.name + '"' + (o.stance !== 'neutral' ? ' (your band calls them ' + o.stance + ')' : '') + (o.theirs === 'enemy' ? ' (THEY call your people enemy)' : '') : '; follows no one') + '; ' + o.doing + '; carrying ' + o.carrying + ' food; you feel ' + warmth(r) + ' (' + r.toFixed(1) + ') toward them';
  });
  out.push('OTHERS OF YOUR KIND IN SIGHT:\n' + (others.length ? others.join('\n') : '- none'));
  const led = v.agents.slice(0, 3).map(function (o) {
    const tl = M.tiesOf(mind, o.id); if (!tl.length) return null;
    return 'You and ' + o.name + ':\n' + tl.map(function (e) { return '  - day ' + e.day + ': ' + e.text + (e.n > 1 ? ' (x' + e.n + ')' : ''); }).join('\n');
  }).filter(Boolean);
  if (led.length) out.push('WHAT HAS PASSED BETWEEN YOU AND THOSE HERE (your own account; judge them by what they did, not only by what they said):\n' + led.join('\n'));
  const inSight = {}; v.agents.forEach(function (o) { inSight[o.id] = 1; });
  const knownP = Object.keys(a.rel).concat(Object.keys(a.seenAt).filter(function (id) { return !(id in a.rel); })).slice(0, 14).map(function (id) {
    const dead = st.minds[id] && st.minds[id].dead, m = a.seenAt[id], rv = a.rel[id] || 0;
    return nameOf(st, id) + ' ' + (rv >= 0 ? '+' : '') + rv.toFixed(1) + (dead ? ' (dead)' : inSight[id] ? ' (here now)' : m ? ' (last seen at (' + m[0] + ',' + m[1] + '), ' + (w.tick - m[2]) + ' moments ago)' : '');
  });
  if (knownP.length) out.push('THOSE YOU KNOW (how you feel, -1 enemy to +1 trust; where you last saw them): ' + knownP.join('; ') + '.');
  out.push('WHAT HAPPENED SINCE YOUR LAST THOUGHT (oldest first):\n' + (mind.events.length ? mind.events.map(function (e) { return '- ' + e.text + (e.n > 1 ? ' (x' + e.n + ')' : ''); }).join('\n') : '- nothing of note'));
  const prev = mind.log.filter(function (e) { return !e.failed; }).slice(-2);
  if (prev.length) out.push('YOUR LAST THOUGHTS (oldest first; think onward from these, do not repeat them):\n' + prev.map(function (e) { return '- (day ' + e.day + ') ' + clip(e.thought, 320); }).join('\n'));
  if ((mind.rut || 0) >= 2) out.push('YOU ARE GOING IN CIRCLES. Your last ' + (mind.rut + 1) + ' thoughts were the same thought' + (mind.lastVerbs ? ', with the same plan (' + mind.lastVerbs.replace(/>/g, ', then ') + ')' : '') + ', and nothing came of it. Do not think it again. Something else must lead this thought: a person, your question, a place you have never been, a thing you have never done, or a change in who you are.');
  if (mind.said.length) out.push('WHAT YOU HAVE ALREADY SAID ALOUD (do not say the same thing again to the same listener):\n' + mind.said.slice(-2).map(function (q) { return '- to ' + q.to + ': "' + q.text + '"'; }).join('\n'));
  if (mind.heard.length) out.push('WHAT OTHERS HAVE TOLD YOU (their word, not your experience; it may be true, mistaken or a lie):\n' + mind.heard.slice(-2).map(function (q) { return '- ' + q.from + ' (day ' + (Math.floor(q.tick / L.time.dayLength) + 1) + '): "' + q.text + '"'; }).join('\n'));
  const foods = Object.keys(mind.foods);
  out.push('WHAT YOU KNOW (this is settled knowledge; act on it, do not rediscover or restate it):\n' +
    (foods.length ? 'Foods: ' + foods.map(function (k) { return M.foodLine(k, mind.foods[k]); }).join(' | ') + '\n' : '') +
    (mind.notes.length ? (kind === 'deep' ? mind.notes : mind.notes.slice(-8)).map(function (n, i) { return (i + 1) + '. ' + (kind === 'deep' ? n : clip(n, 150)); }).join('\n') + (kind !== 'deep' && mind.notes.length > 8 ? '\n(and ' + (mind.notes.length - 8) + ' older notes you will see when you reflect)' : '') : '(no notes yet)') +
    (mind.felt && Object.keys(mind.felt).length ? '\nWhat things have done to your body and mind: ' + Object.keys(mind.felt).map(function (k) { return k + ': ' + clip(mind.felt[k], 110); }).join(' | ') : ''));
  {
    const S = a.stats, nd = [], prey = v.creatures.filter(function (c) { return !c.predator; })[0], adult = SW.stage(w, a) !== 'child';
    if (!S.tamed && prey) nd.push('offered food to a wild grazing animal to make it yours (tame)');
    if (!S.wood) nd.push('gathered wood or stone (stand in forest or on rock, then gather)');
    if (!S.planted && a.seeds.length) nd.push('put a seed in the ground (plant; you carry ' + a.seeds.length + ')');
    if (!S.hunted) nd.push('hunted an animal for meat (hunt)' + (prey ? '; a ' + prey.sp + ' is ' + prey.d + ' steps ' + prey.dir : ''));
    if (!S.fished) nd.push('fished (stand beside water, then fish)');
    if (!S.built) nd.push('built a shelter (' + L.build.shelterWood + ' wood)');
    if (!S.marks) nd.push('left a mark that others can read (1 wood)');
    if (!S.gifts && !S.trades) nd.push('given or traded anything to anyone');
    if (!S.taught) nd.push('taught anyone anything');
    if (adult && !S.kids) nd.push('courted anyone (plan step mate, with their name; if they do the same toward you soon after, a child is born to you both)');
    if (!S.mined && (v.lodes || []).length) nd.push('taken what lies in a deposit (stand on it, then gather)');
    if (a.leader == null && !S.led) nd.push(t.bold > 0.55 ? 'been followed by anyone' : 'followed anyone (pledge: {"follow": name}); those who follow a leader share a band, its ground and its protection');
    if (t.greedy > 0.6 && t.gentle < 0.45 && !S.stolen) nd.push('taken from another what you wanted, by stealth (steal) or by force (attack)');
    if (t.bold > 0.65 && t.gentle < 0.4 && !S.kills && md.anger > 0.3) nd.push('struck anyone');
    const k0 = (mind.thoughts + a.id) % Math.max(1, nd.length), pick = nd.slice(k0).concat(nd.slice(0, k0)).slice(0, 5);
    const pn = SW.pathsFor(w, a).near.slice(0, 3);
    if (pick.length || pn.length) out.push((pick.length ? 'THINGS YOU HAVE NEVER DONE in your life (each is possible; doing a thing is how you learn what it is for):\n' + pick.map(function (q) { return '- ' + q; }).join('\n') : '') +
      (pn.length ? (pick.length ? '\n' : '') + 'WAYS YOU SENSE BUT HAVE NOT FOUND (practice brings one within reach; it then opens at a deep reflection): ' + pn.map(function (o) { return o.id + ' (' + clip(o.hint, 80) + '), needs ' + o.missing; }).join('; ') + '.' : ''));
  }
  {
    const rc = L.recipes || {}, ks = Object.keys(rc).filter(function (k) { return !rc[k].way || a.knows[rc[k].way]; }).slice(-6);
    if (ks.length) out.push('THINGS THAT CAN BE MADE OR DONE (plan step make {what: name}):\n' + ks.map(function (k) { return '- ' + k + ': ' + clip(rc[k].hint || '', 110) + ' Needs ' + M.needsText(rc[k].needs) + '.'; }).join('\n'));
    const tl = mind.tales || [];
    { const C = cult(st), mineF = a.faith && C.items[a.faith], hd = Object.keys(mind.heard || {}).filter(function (id) { return C.items[id] && id !== a.faith; }).slice(-3);
      if (mineF) out.push('THE TEACHING YOU HOLD: "' + mineF.title + '"' + (mineF.byId === a.id ? ' (you began it)' : mineF.by ? ' (begun by ' + mineF.by + ')' : '') + ', held by ' + M.cultLive(st, mineF).n + ' of the living: ' + mineF.text);
      if (hd.length) out.push('TEACHINGS YOU HAVE HEARD (you may take one up with "adopt", begin your own with "belief", or hold to none):\n' + hd.map(function (id) { const it = C.items[id]; return '- "' + it.title + '"' + (it.by ? ' of ' + it.by : '') + ', held by ' + M.cultLive(st, it).n + ': ' + it.text; }).join('\n')); }
    if (mind.lessons && mind.lessons.length) out.push('WHAT HAS BEFALLEN OTHERS (things your people saw happen or were told of; they are true, and the same will happen to you in the same case):\n' + mind.lessons.slice(-6).map(function (q) { return '- day ' + q.day + ': ' + q.text + (q.from ? ' (told to you by ' + q.from + ')' : ''); }).join('\n'));
    if (mind.seasons && mind.seasons.length) out.push('THE SEASONS YOU HAVE LIVED (plainly what you saw, in order. If something comes round again, that is yours to notice, to prepare for, to tell as a tale or to cut in a sign):\n' + mind.seasons.slice(-8).join('\n'));
    if (L.buildings && Object.keys(L.buildings).length && (kind === 'deep' || mind.thoughts % 3 === 0)) out.push('KINDS OF BUILDING you know how to raise (each is also a roof; build {what: its name} on bare ground; a great work is begun by one and finished by whoever carries wood and stone to it):\n' + Object.keys(L.buildings).filter(function (k) { return !L.buildings[k].way || a.knows[L.buildings[k].way]; }).slice(-9).map(function (k) { const B = L.buildings[k]; return '- ' + k + ' (' + (B.wood || 0) + ' wood, ' + (B.stone || 0) + ' stone): ' + (B.hint || ''); }).join('\n'));
    if (tl.length) out.push('TALES YOU CARRY (yours, and those told to you; a tale is how the absent and the dead are remembered, and it can be told on by teaching):\n' + tl.slice(-4).map(function (q) { return '- ' + (q.kind && q.kind !== 'tale' ? q.kind + ' ' : '') + '"' + q.title + '"' + (q.about ? ', about ' + q.about : '') + (q.from ? ' (told to you by ' + q.from + ', first told by ' + q.by + (q.gen > 1 ? ', through ' + q.gen + ' mouths' : '') + ')' : ' (your own)') + ': ' + clip(q.text, 170); }).join('\n'));
  }
  out.push('YOUR REFLEXES (run every moment the plan is empty; the first rule whose condition holds and whose action is possible wins; urgent rules override even the plan):\n' + a.policy.map(function (r, i) { return M.ruleText(r, i) + (r.why ? '  // ' + r.why : ''); }).join('\n'));
  out.push('HABITS: your body refuses to eat: ' + (a.habits.avoid.length ? a.habits.avoid.join(', ') : 'nothing') + '. You leave ' + (a.habits.spare || 0) + ' food on a plant when you eat from it.');
  out.push('ACTIONS for plan steps (each step runs until it finishes, becomes impossible, or its "ticks" run out; ticks 1-240, a day is 240):\n' +
    'eat | harvest (pick food to carry; you must stand on the plant) | drop {what?: food kind} (throw away carried food; with no kind, everything your body refuses) | plant {what?: seed kind} | gather (wood if you stand on forest, stone if on rock, clay if in marsh or shallows; some rock holds ore) | fish (beside water; a catch is food you carry) | craft {what: name of a thing you know how to make} | make {what: something from the list of what can be made or done} | place {what: name of a device you know how to make} (sets it in the ground where you stand) | build {what: shelter|wall|fire|store, or a kind of building you know} (here; shelter ' + L.build.shelterWood + ' wood, wall ' + L.build.wallWood + ', fire 1, store 2; fire and store must first be discovered or learned; walls stop animals and everyone outside your band) | raze (tear down a wall, shelter or store beside you that is not your band\'s) | rest | linger (stay put) | wander | hunt | tame (offer carried plant food to a wild grazing animal within two steps; it may become yours) | ' +
    'seek {target: food|prey|tree|shelter|fire|store|home|water|agent|friend|foe|leader|enemy|ally, name?} | flee {from: predator|agent|foe|enemy} | attack {target: agent|foe|enemy|predator, name?} | steal {name} (food they carry; they may or may not notice) | milk | shear | ride (each needs a grown tame animal of yours beside you, of a kind that gives it, and the way of herding or riding) | pave (lay road, if you know roads) | bridge {dir?: N|NE|E|SE|S|SW|W|NW} (lay a span over water beside you, 3 wood, if you know bridges) | dismantle (take down something you built, here or beside you, and keep half its wood and stone) | rally {name?} (only if you lead: every grown follower within earshot drops everything and attacks the one you name, or the nearest enemy of your band, and so do you) | goto {x, y} | explore {dir: N|NE|E|SE|S|SW|W|NW} (walk that way) | follow {name?} (your leader if no name) | ' +
    'give {name, what: food|seed|wood|stone|ore|clay|tool|the name of a thing you hold} | trade {name, what: food|seed|wood you give, want: food|seed|wood} (one for one; only if they plan the matching trade toward you) | mate {name} (a child comes only if you both plan mate toward each other, each with energy 60 or more) | ' +
    'mark {text} (leave a mark; 1 wood. If you know signs it can hold a long text that any who know signs will read: a record, a count of days, a warning, a tale, what a season brought. Cut on rock, in your shelter or beside your own building, it outlasts many seasons) | cultivate {what: seed kind, aim: richer|faster|fuller|spreading|hardy, name} (breed a new plant from two seeds of one kind) | heal {name?} (needs a healing plant carried, and the knowledge) | stash (put carried food into the store you stand on) | take (take food from the store you stand on). ' +
    'A named being out of sight is sought where you last saw them.');
  if (kind !== 'deep' && mind.thoughts > 6 && mind.thoughts % 3 !== 0) out[out.length - 1] = out[out.length - 1].replace(/ \((?![^()]{0,24}\))[^()]*\)/g, '') + ' (Every third thought lists what each action does and needs.)';
  out.push('Speech is heard by everyone within ' + L.body.hearing + ' steps and costs a little energy per letter. Others only know what you say aloud.');
  out.push('FOR THIS THOUGHT: your thought is your inner life, not an inventory. Do not list what is nearby or recite what you carry. Think as a creature with a past and a future: what you want and cannot yet have, whom you trust or resent and why, what you are afraid of, proud of or ashamed of, what you wonder about, what you mean to become. Let whatever presses on you hardest lead, and let it move you to DO something that changes your situation, with a plan that carries it out. A mind that only gathers and guards has not begun to live. Do not restate what you already know or have already said. "note" is only for something NEW, or something that CHANGED what you believed; otherwise leave it null.');
  let fmt = 'Reply with ONLY one JSON object, no other text:\n{"thought": "your inner voice, 2-4 sentences: what you feel, want and intend, and why", "feeling": "one short sentence naming what you feel most strongly right now, and toward whom or what", "wonder": null (keep carrying your question) or "a new question, only once the old one has been answered", "say": null or {"to": "a name, or all", "text": "what you say aloud", "claim": optional {"food": a kind of food, "effect": "feeds" or "hurts"} if you are telling them what a food does (true or not)}, "plan": null (keep the current plan) or [up to 4 steps, each {"do": "action", ...its fields, "ticks": 1-240}] (replaces the current plan), "note": null or "one NEW fact or lesson", "feel": {"Name": change between -0.5 and 0.5}, "mood": null or {"anger": 0-1, "fear": 0-1, "grief": 0-1, "joy": 0-1}, "pledge": null or {"follow": "a name, or none", "band": "a name for your band, if you lead one"}, "teach": null or {"to": "a name within hearing", "lesson": "something you know, in your words", "reflex": number of one of your reflexes (optional), "tale": the title of a tale you carry, to tell it on (optional)' + (a.faith ? ', "belief": true to teach what you hold (optional)' : '') + (mind.method ? ', "method": true to pass on your way of thinking (optional)' : '') + (known.length ? ', "way": one of the ways you know (optional)' : '') + (Object.keys(a.designs).length ? ', "design": a thing you know how to make (optional)' : '') + (a.arts.length ? ', "art": one of your arts (optional)' : '') + '}, "habits": null or {"avoid": ["food kinds your body refuses"], "spare": 0-3}, "place": null or "a name you give the place where you stand", "aim": null (keep your aim) or "a new aim, only if the old one is achieved or has failed"' +
    (a.leader == null ? ', "stance": null or {"a name or band name": "ally" or "enemy" or "neutral"} (how your band stands toward another)' + (a.knows.customs ? ', "custom": null or "a custom your whole band must now live by"' : '') : '');
  if (kind === 'deep') {
    const paths = SW.pathsFor(w, a);
    out.push('THIS IS A MOMENT OF DEEP REFLECTION. Step back from this moment and look at your whole life so far. In "thought", in 4 to 7 sentences, answer yourself honestly: What have I actually been doing with my days, and is it what I want? Who matters to me, who has helped or wronged me, and what do I intend toward them? What do I want that I do not have? What am I afraid of? What have I been getting wrong?\n' +
      'Then CHANGE something. A reflection that changes nothing is wasted' + ((mind.rut || 0) >= 2 ? ', and you have been going in circles: your aim or your reflexes MUST change now' : '') + '. At least TWO of the following must not be null: "aim", "notes", "reflexes", "creed", "method"' + (SW.pathsFor(w, a).open.length ? ', "discover"' : '') + '. Write notes as lessons about how this world and its people work, drawn from what happened to you. Where your body does not yet act on what you know, change your reflexes.\n' +
      '"reflexes": a full replacement list (at most 12) of rules {"if": [[variable, op, number], ...], "do": action, ...its fields, "urgent": true or false, "why": "short reason"}. ' +
      'Variables: ' + SW.VARS.join(', ') + '. Distances are in steps and 99 means none in sight; night, winter, sheltered, wet, storm, fog, drought and in_working are 0 or 1; age runs 0 to 1; feelings run 0 to 1; plant_here is the bites you would take from the plant under you given your habits; random is a fresh number 0-1 each moment. Ops: < <= > >= == !=. An empty "if" always holds. End the list with a rule that always holds (linger keeps you in place; wander makes you roam).\n' +
      '"creed": your creed, rewritten (at most 600 characters). You may change who you are.\n' +
      '"method": how you will think from now on (at most 400 characters): questions you will ask yourself, mistakes you will watch for, what you will weigh first. This is read back to you before every thought, so write it as an instruction to yourself. It can be taught to others.\n' +
      '"notes": a full replacement list (at most 12) of your memory notes. Merge what overlaps, drop what proved false or useless, and raise particulars into principles. Each note should say something the others do not.\n' +
      (mind.thoughts < 14 || mind.thoughts % 5 === 0 ? '"designs": how things of yours look: {"self": look, "shelter": look, "wall": look, "emblem": look' + ownKinds(w, a) + '}. "self" is your own body, "shelter" and "wall" are how the ones you build will look, "emblem" is the sign drawn on marks you leave and on your workings. ' +
      'A look is {"anim": none|bob|pulse|sway|spin, "shapes": [up to 12 shapes, drawn in order]}. Each shape is {"t": circle|ellipse|rect|tri|line|ring|star, "x": 0, "y": 0, "fill": "#rrggbb", "stroke": "#rrggbb", plus: "s" radius (circle, tri, star, ring dots), "w" and "h" half-extents (ellipse, rect), "rot" degrees, "n" count (ring dots, star points), "d" ring radius, "x2","y2","lw" (line end and width)}. Units: the tile is 1 wide, centred on 0,0; keep within about -0.5 to 0.5; y grows downward. Your look now: ' + JSON.stringify(a.look) + '.' : '"designs": leave this null now; the way to redraw yourself and your things is shown at some reflections, not this one.') +
      (paths.open.length ? '\n"discover": A NEW WAY IS WITHIN YOUR REACH. null, or {"way": one of [' + paths.open.map(function (o) { return o.id; }).join(', ') + '], "name": "what you call your version of it", "idea": "one sentence on how yours works", "look": a look for it (optional)' + (paths.open.some(function (o) { return o.id === 'tools'; }) ? ', "use": for tools, what your first tool is for: ' + SW.TOOL_USES.join('|') : '') + '}. What each is: ' + paths.open.map(function (o) { return o.id + ' = ' + o.hint + (o.glimpsed ? ' (you have watched it done)' : ''); }).join('; ') + '. The world only says what is possible; what yours is, and what you call it, is up to you. You can discover one at a time.' : '') +
      (a.knows.tools ? '\n"invent": YOU CAN DEVISE NEW THINGS. null, or {"name": "what you call it", "use": one of ' + SW.TOOL_USES.join('|') + ', "idea": "one sentence on what it is and how it works", "look": a look for it (optional), "improves": the name of a thing you already know how to make, to better it (optional; then "use" is the same as its)}. hunt: surer kills. fight: harder blows. guard: blows against you land softer. gather: more wood, stone and clay. fish: more catches. harvest: more food picked. plant: what you sow is tended. build: cheaper building, faster tearing down. A new thing starts at strength x' + L.craft.toolPower + '; bettering one multiplies its strength by ' + L.craft.toolGrowth + ' but costs more stone, and how far you can go is limited by your lore (your limit now: x' + (Math.round((L.craft.toolPower + a.lore * L.craft.toolLore) * 100) / 100) + '). Inventing is only the design: to hold one you must then craft it.' : '') +
      (a.knows.devices ? '\nYou also know the way of DEVICES: in "invent", use "device" and give it "rules": a list (at most 5) of {"if": [[variable, op, number], ...], "do": act}; the first rule that holds fires. A device stands where you set it (action place; ' + L.device.wood + ' wood and ' + L.device.stone + ' stone) and acts alone for about ' + Math.round(L.device.life / L.time.dayLength) + ' days. Its variables: night (0/1), predator_dist, creature_dist (a beast that does not hunt), stranger_dist (a being not of your band), band_dist (one of your band), all in steps with 99 for none near; hold (food it is holding); random. Its acts: snare (catch a small beast beside it and hold the meat), strike (hurt a hunting beast or a stranger beside it), alarm (warn your band within 14 steps), bar (close the way to all but your band), open (open it), share (hand held food to a hungry one of your band beside it).' : '') +
      (paths.near.length ? '\nWays you sense but cannot yet reach: ' + paths.near.slice(0, 4).map(function (o) { return o.id + ' (' + o.hint + ') needs ' + o.missing; }).join('; ') + '.' : '') +
      (a.lore >= L.magic.loreToCast && a.arts.length ? '\n"spell": YOU CAN WORK THE WORLD ITSELF. null, or {"law": ' + (a.arts.length > 1 ? 'one of your arts, or a list of two of them woven together' : 'your art, ' + a.arts[0]) + ', "factor": 0.3 to 2.5, "radius": 1 to ' + (L.magic.maxRadius + (a.arts.length >= 3 ? 2 : 0)) + ', "name": "what you call this working"}. For about three days, within that many steps of where you stand right now, that law of the world is multiplied by your factor, for everyone and everything there, friend or enemy. growth: how fast plants grow and bear. cold: how hard cold bites. drain: how fast a body burns energy. harm: how hard blows land. It costs energy up front, more for wider and stronger: for example ' + SW.castCost(w, 2, 1.5) + ' for radius 2 at factor 1.5, ' + SW.castCost(w, 3, 2) + ' for radius 3 at factor 2. Other arts can only be learned from those who know them. Few can do this. It is power: use it as your nature dictates.' : '') +
      (SW.greatReady(w, a) ? '\n"great": YOU ARE A MASTER. With ' + L.magic.greatHelpers + ' of your own band standing within 3 steps of you (now: ' + SW.greatReady(w, a).helpers.length + '), you can lead a GREAT WORKING that bends a law of the WHOLE WORLD for about two days, for every being and creature in it. null, or {"law": one of [' + Object.keys(SW.GREAT_LAWS).map(function (k) { return k + ' (' + SW.GREAT_LAWS[k] + ')'; }).join('; ') + '], "factor": 0.7 to 1.4, "name": "what you call it"}. It costs you ' + L.magic.greatCost + ' energy and each helper ' + L.magic.helperCost + '. This is the deepest power there is.' : '') +
      (st.settings.foresight && st.toolsOK ? '\nYou have a tool, test_reflexes: imagine living by a candidate rule list for a day and a half and see whether you survive. Each use costs ' + L.body.foresightCost + ' energy and you can use it at most 3 times. Use it before you adopt new reflexes.' : ''));
    fmt += ', "tale": null or {"title": "a few words", "kind": "tale" or "song" or "poem" or "myth" (a myth tells how the world, a people or a thing came to be), "about": optional name of the one it is about, "text": "something you lived through, saw or were told, or how the world came to be, told the way you would tell it by a fire, at most 300 characters"} (make one when something deserves to be remembered; one that is about someone adds to their standing as it spreads; telling one you were told, in your own words, changes it), "belief": null or {"name": "a few words", "tenets": "what you hold to be true about this world and how one should live in it, at most 240 characters"} (only if you have come to hold something others could hold too: it becomes a teaching with a name, which others may hear, take up or refuse; those who hold the same teaching are easier in company together, and one whose teaching is taken up gains standing), "adopt": null or "the name of a teaching you have heard" (to take it as your own), "renounce": null or true (to give up the teaching you hold), "reflexes": null or [...], "creed": null or "...", "method": null or "...", "notes": null or [...], "designs": null or {...}' + (SW.greatReady(w, a) ? ', "great": null or {...}' : '') + (paths.open.length ? ', "discover": null or {...}' : '') + (a.knows.tools ? ', "invent": null or {...}' : '') + (a.lore >= L.magic.loreToCast && a.arts.length ? ', "spell": null or {...}' : '');
  }
  out.push(fmt + '}');
  /* a lean prompt, for a second try when the first drew no answer: the same mind, without the lists it can do without */
  const fin = lean ? out.filter(function (q) { return !/^(THINGS YOU HAVE NEVER DONE|WAYS YOU SENSE|WHAT YOU HAVE ALREADY SAID|WHAT OTHERS HAVE TOLD YOU|YOUR LAST THOUGHTS|TALES YOU CARRY|KINDS OF BUILDING|THE SEASONS YOU HAVE LIVED|THINGS THAT CAN BE MADE|WHAT YOUR BODY HAS ACTUALLY|HABITS:|TEMPERAMENT)/.test(q); }) : out;
  return fin.join('\n\n');
};
function ownKinds(w, a) {
  const mine = Object.keys(w.laws.plants).filter(function (k) { return w.laws.plants[k].by === a.id; });
  const ways = Object.keys(a.knows).filter(function (k) { return a.knows[k].by === a.id; });
  return (mine.length ? ', ' + mine.map(function (k) { return '"' + k + '": look'; }).join(', ') + ' (plants you bred; a shape with "per": "food" shows one dot per food unit)' : '') +
    (ways.length ? ', ' + ways.map(function (k) { return '"' + k + '": look'; }).join(', ') + ' (ways you discovered)' : '');
}

/* ---------- reading the reply ---------- */
M.parseReply = function (text) {
  if (!text) return null;
  const ok = function (v) { return v && typeof v === 'object' && !Array.isArray(v) && typeof v.thought === 'string' ? v : null; };
  try { const v = ok(JSON.parse(text)); if (v) return v; } catch (e) {}
  const fences = text.match(/```(?:json)?\s*([\s\S]*?)```/g);
  if (fences) for (let k = fences.length - 1; k >= 0; k--) {
    try { const v = ok(JSON.parse(fences[k].replace(/```(?:json)?/g, '').trim())); if (v) return v; } catch (e) {}
  }
  const end = text.lastIndexOf('}');
  if (end < 0) return null;
  let from = text.lastIndexOf('{', end), tries = 0;
  while (from >= 0 && tries < 400) {
    try { const v = ok(JSON.parse(text.slice(from, end + 1))); if (v) return v; } catch (e) {}
    from = text.lastIndexOf('{', from - 1); tries++;
  }
  return null;
};

/* ---------- applying a thought to the being and the world ---------- */
M.apply = function (st, mind, kind, d, meta) {
  const w = st.world, a = agentById(w, mind.id), L = w.laws;
  const entry = { tick: w.tick, day: SW.day(w), kind: kind, thought: clip(d.thought, kind === 'deep' ? 3000 : 1500), changes: [], model: meta.model, ms: meta.ms, tests: meta.tests || [] };
  if (!a) { entry.changes.push('died before the thought finished'); mind.log.push(entry); mind.rev++; return entry; }
  /* what it had seen when it began this thought is now behind it; what arrives from here on is new */
  mind.events = mind.events.filter(function (e) { return e.seq > (mind.seenSeq || 0); });
  if (d.say && typeof d.say === 'object' && d.say.text) {
    const to = clip(d.say.to || 'all', 16);
    SW.speak(w, a, to, d.say.text, st.emit);
    entry.say = { to: to, text: clip(d.say.text, 700) };
    const cl = d.say.claim;
    if (cl && typeof cl === 'object' && cl.food && (cl.effect === 'feeds' || cl.effect === 'hurts')) {
      const fk = String(cl.food).toLowerCase().replace(/[^a-z]/g, '').slice(0, 20);
      if (fk) w.agents.forEach(function (o) {
        if (o === a || SW.cheb(o.x, o.y, a.x, a.y) > L.body.hearing) return;
        const om = st.minds[o.id]; if (!om) return;
        const kn = om.foods[fk];
        if (!kn || kn.told) om.foods[fk] = { n: 0, gain: cl.effect === 'hurts' ? -1 : 1, fx: '', told: a.name };
        else if (!kn.seen && (kn.gain < 0) !== (cl.effect === 'hurts')) { tell(st, o.id, a.name + ' says ' + fk + (cl.effect === 'hurts' ? ' hurts' : ' is good to eat') + '. You know from your own body that this is FALSE.', 5); o.rel[a.id] = SW.clamp((o.rel[a.id] || 0) - 0.2, -1, 1); }
      });
      entry.claim = fk + ' ' + cl.effect;
    }
  }
  const planIn = d.plan != null ? d.plan : d.intent;
  if (planIn && typeof planIn === 'object') {
    const pr = SW.sanitizePlan(planIn);
    if (pr.plan.length) { a.intent = null; a.plan = pr.plan; entry.plan = pr.plan.map(M.stepText); }
    if (pr.dropped) { entry.changes.push('planned ' + pr.dropped + ' step' + (pr.dropped > 1 ? 's' : '') + ' its body does not know how to do'); tell(st, a.id, pr.dropped + ' step' + (pr.dropped > 1 ? 's' : '') + ' of the plan you made named no action your body knows, and ' + (pr.dropped > 1 ? 'were' : 'was') + ' dropped. Use only the listed actions.', 2); }
  }
  if (d.note && typeof d.note === 'string') { if (addNote(mind, d.note)) entry.note = clip(d.note, 200); else entry.changes.push('restated something it already knew (not written down again)'); }
  if (typeof d.aim === 'string' && d.aim.trim() && clip(d.aim, 160) !== mind.aim && (kind === 'deep' || !mind.aim || w.tick - (mind.aimTick || 0) > 1.5 * L.time.dayLength)) { mind.aim = clip(d.aim, 160); mind.aimTick = w.tick; entry.changes.push('set its aim: "' + mind.aim + '"'); }
  if (typeof d.place === 'string' && d.place.trim() && SW.namePlace(w, a, d.place, st.emit)) entry.changes.push('named this place "' + clip(d.place, 28) + '"');
  if (d.stance && typeof d.stance === 'object') Object.keys(d.stance).slice(0, 3).forEach(function (k) { if (SW.declare(w, a, k, String(d.stance[k]).toLowerCase(), st.emit)) entry.changes.push('declared ' + clip(k, 28) + ' ' + String(d.stance[k]).toLowerCase()); });
  if (typeof d.custom === 'string' && d.custom.trim() && SW.custom(w, a, d.custom, st.emit)) entry.changes.push('declared a custom: "' + clip(d.custom, 120) + '"');
  if (d.feel && typeof d.feel === 'object') Object.keys(d.feel).slice(0, 6).forEach(function (n) {
    const o = SW.findAgentByName(w, n); let dv = SW.clamp(Number(d.feel[n]) || 0, -0.3, 0.3);
    /* words and thoughts alone warm a bond only so far; past that it takes deeds, which the world itself records */
    if (o && o !== a && dv > 0) dv = Math.max(0, Math.min(Math.round(dv * 0.5 * 100) / 100, Math.round((0.5 - (a.rel[o.id] || 0)) * 100) / 100));
    if (o && o !== a && dv) { a.rel[o.id] = SW.clamp(Math.round(((a.rel[o.id] || 0) + dv) * 100) / 100, -1, 1); entry.changes.push('feels ' + (dv > 0 ? 'warmer' : 'colder') + ' toward ' + o.name); }
  });
  if (d.mood && typeof d.mood === 'object') ['anger', 'fear', 'grief', 'joy'].forEach(function (k) { const v = Number(d.mood[k]); if (isFinite(v) && d.mood[k] != null) a.mood[k] = SW.clamp(v, 0, 1); });
  if (d.pledge && typeof d.pledge === 'object') {
    if (d.pledge.follow != null && SW.pledge(w, a, d.pledge.follow, st.emit)) entry.changes.push(a.leader != null ? 'pledged to follow ' + nameOf(st, a.leader) : 'broke its allegiance');
    if (typeof d.pledge.band === 'string' && d.pledge.band.trim()) { a.bandName = clip(d.pledge.band.replace(/[<>]/g, ''), 28); entry.changes.push('named its band "' + a.bandName + '"'); }
  }
  if (d.tale && typeof d.tale === 'object' && d.tale.title && d.tale.text) {
    const tt = clip(d.tale.title, 40), tales = mind.tales = mind.tales || [], old = tales.filter(function (q) { return q.title.toLowerCase() === tt.toLowerCase(); })[0];
    if (old) { old.text = clip(d.tale.text, 300); old.retold = (old.retold || 0) + 1; entry.changes.push('retold the tale "' + tt + '" in its own words'); const ci0 = old.cid && cult(st).items[old.cid]; if (ci0) { ci0.changed++; cultLog(st, { k: 'retold', id: ci0.id, kind: ci0.kind, title: ci0.title, who: a.name, people: a.people }); } }
    else { const kd = ['song', 'poem', 'myth'].indexOf(String(d.tale.kind)) >= 0 ? String(d.tale.kind) : 'tale', subj = d.tale.about ? SW.findAgentByName(w, String(d.tale.about)) : null, ci = cultNew(st, kd, tt, clip(d.tale.text, 300), a, { about: subj ? subj.name : null }); tales.push({ title: tt, text: clip(d.tale.text, 300), by: a.name, day: SW.day(w), kind: kd, about: subj ? subj.name : null, cid: ci.id }); if (subj && subj !== a) subj.sung = (subj.sung || 0) + 1; if (tales.length > 6) tales.shift(); entry.changes.push('made a tale: "' + tt + '"'); chron(st, 'lore', a.name + ' made a tale: "' + tt + '".', [a.id], a); }
    M.record(st, { t: 'tale', name: a.name, title: tt, text: clip(d.tale.text, 300), retold: !!old });
  }
  if (d.belief && typeof d.belief === 'object' && d.belief.name && d.belief.tenets) {
    const bn = clip(d.belief.name, 40), bt = clip(d.belief.tenets, 240), F = w.faiths = w.faiths || {}, mine = a.faith && cult(st).items[a.faith];
    if (mine && mine.byId === a.id) { mine.text = bt; mine.changed++; cultLog(st, { k: 'retold', id: mine.id, kind: 'belief', title: mine.title, who: a.name, people: a.people }); entry.changes.push('restated the teaching "' + mine.title + '"'); }
    else { if (a.faith) cultDrop(st, a.faith, a); const bi = cultNew(st, 'belief', bn, bt, a); a.faith = bi.id; F[bi.id] = { name: bi.title, by: a.id, n: 1 }; a.stat = null; entry.changes.push('began a teaching: "' + bn + '"'); chron(st, 'lore', a.name + ' began a teaching, "' + bn + '": ' + bt, [a.id], a); story(st, a.id, 'I began a teaching and called it "' + bn + '".'); M.record(st, { t: 'belief', name: a.name, title: bn, text: bt }); }
  }
  if (typeof d.adopt === 'string' && d.adopt.trim()) {
    const want = d.adopt.trim().toLowerCase(), C = cult(st), hid = Object.keys(mind.heard || {}).filter(function (id) { return C.items[id] && C.items[id].title.toLowerCase() === want; })[0];
    if (hid && a.faith !== hid) { const it = C.items[hid], src = w.agents.filter(function (o) { return o.name === mind.heard[hid].from; })[0] || null; if (a.faith) cultDrop(st, a.faith, a); a.faith = hid; cultHold(st, hid, a, src, false, src ? ((it.holders[src.id] || {}).gen || 0) + 1 : 1);
      const F = w.faiths = w.faiths || {}; if (!F[hid]) F[hid] = { name: it.title, by: it.byId, n: 0 }; F[hid].n++; entry.changes.push('took up the teaching "' + it.title + '"'); chron(st, 'lore', a.name + ' took up the teaching "' + it.title + '"' + (it.by ? ', begun by ' + it.by : '') + '.', [a.id], a); story(st, a.id, 'I took up the teaching "' + it.title + '".');
      if (it.byId != null && it.byId !== a.id) { tell(st, it.byId, a.name + ' has taken up your teaching, "' + it.title + '".', 6); const fo = w.agents.filter(function (o) { return o.id === it.byId; })[0]; if (fo) fo.stat = null; } }
    else if (!hid) entry.changes.push('wished to take up "' + clip(d.adopt, 40) + '", a teaching it has not heard');
  }
  if (d.renounce === true && a.faith) { const it = cult(st).items[a.faith]; cultDrop(st, a.faith, a); if (it) { chron(st, 'lore', a.name + ' gave up the teaching "' + it.title + '".', [a.id], a); cultLog(st, { k: 'left', id: it.id, kind: 'belief', title: it.title, who: a.name, people: a.people }); } a.faith = null; entry.changes.push('gave up its teaching'); }
  if (d.teach && typeof d.teach === 'object' && d.teach.to) {
    const t = SW.findAgentByName(w, d.teach.to), tm = t && st.minds[t.id];
    if (t && tm && t !== a) {
      const res = SW.teach(w, a, t, d.teach.art, st.emit);
      if (res.why === 'too far to hear') tell(st, a.id, 'You tried to teach ' + t.name + ', but they were too far away to hear.', 1);
      else {
        const got = [];
        if (typeof d.teach.lesson === 'string' && d.teach.lesson.trim()) { const sy = cultNew(st, 'saying', clip(d.teach.lesson, 60), clip(d.teach.lesson, 220), a, null, true); cultHold(st, sy.id, t, a, false, ((sy.holders[a.id] || {}).gen || 0) + 1, true); if (addNote(tm, 'Taught by ' + a.name + ': ' + d.teach.lesson, 220)) got.push('a lesson: "' + clip(d.teach.lesson, 160) + '"'); else got.push('a lesson you already knew'); }
        const ri = Math.round(Number(d.teach.reflex)) - 1;
        if (ri >= 0 && a.policy[ri]) { const txt = JSON.stringify(a.policy[ri]); if (addNote(tm, 'Reflex taught by ' + a.name + ' (adopt it when you reflect, if you wish): ' + txt, 300)) got.push('a reflex'); }
        const way = d.teach.way || d.teach.path;
        if (way && a.knows[way]) { const why = SW.teachPath(w, a, t, way, st.emit); if (!why) got.push('the way of ' + way); else if (why !== 'already known') tell(st, a.id, 'You tried to teach ' + t.name + ' ' + way + ', but ' + why + '.', 1); }
        if (d.teach.method && mind.method) { if (addNote(tm, 'A way of thinking taught by ' + a.name + ' (adopt it as your method when you reflect, if you wish): ' + mind.method, 440)) got.push('its way of thinking'); }
        if (d.teach.design) { const why = SW.teachDesign(w, a, t, d.teach.design); if (!why) got.push('how to make a ' + String(d.teach.design).toLowerCase()); }
        /* what the teacher knows of foods passes too */
        for (const fk in mind.foods) if (!tm.foods[fk] && !mind.foods[fk].seen) tm.foods[fk] = { n: 0, gain: mind.foods[fk].gain, fx: mind.foods[fk].fx, seen: a.name + "'s teaching" };
        for (const fk in (mind.felt || {})) { tm.felt = tm.felt || {}; if (!tm.felt[fk]) tm.felt[fk] = clip(mind.felt[fk], 90) + ' (so ' + a.name + ' says)'; }
        if (d.teach.belief && a.faith && cult(st).items[a.faith]) { const it = cult(st).items[a.faith]; tm.heard = tm.heard || {}; if (t.faith !== a.faith) { tm.heard[it.id] = { from: a.name, day: SW.day(w) }; got.push('the teaching "' + it.title + '": ' + it.text + ' (to take it as your own, reply with adopt: "' + it.title + '" at a deep reflection)'); tm.wantDeep = true; } }
        if (d.teach.tale) {
          const want = String(d.teach.tale).toLowerCase(), tl = (mind.tales || []).filter(function (q) { return q.title.toLowerCase() === want; })[0];
          if (tl) { a.stats.told = (a.stats.told || 0) + 1;
            /* a tale changes a little in every mouth: a part is dropped, a number grows */
            const drift = function (txt) { let o = txt; const parts = o.split(/(?<=[.!?;])\s+/); if (parts.length > 2 && Math.random() < 0.3) { parts.splice(1 + Math.floor(Math.random() * (parts.length - 1)), 1); o = parts.join(' '); } if (Math.random() < 0.3) o = o.replace(/\b(two|three|four|five|six|seven)\b/, function (n) { return { two: 'three', three: 'four', four: 'five', five: 'seven', six: 'nine', seven: 'ten' }[n]; }); return o; };
            const pass = function (hm, hname, hid) { if (!hm || hm.dead) return false; hm.tales = hm.tales || []; if (hm.tales.some(function (q) { return q.title === tl.title; })) return false; const nt = drift(tl.text), ho = w.agents.filter(function (q) { return q.id === hid; })[0]; hm.tales.push({ title: tl.title, text: nt, by: tl.by, from: a.name, day: SW.day(w), kind: tl.kind || 'tale', about: tl.about || null, gen: (tl.gen || 0) + 1, cid: tl.cid || null }); if (tl.cid && ho) cultHold(st, tl.cid, ho, a, nt !== tl.text, (tl.gen || 0) + 1); if (hm.tales.length > 6) hm.tales.shift(); const sj = tl.about ? SW.findAgentByName(w, tl.about) : null; if (sj && sj.id !== hid) sj.sung = (sj.sung || 0) + 1; hm.rev++; return true; };
            if (a.knows.lorekeeping) w.agents.forEach(function (o) { if (o !== a && o !== t && SW.cheb(o.x, o.y, a.x, a.y) <= w.laws.body.hearing && SW.understands(o, a.lang) >= 0.5 && pass(st.minds[o.id], o.name, o.id)) tell(st, o.id, a.name + ' told the ' + (tl.kind || 'tale') + ' "' + tl.title + '" aloud, and you heard it: ' + clip(tl.text, 200), 4); });
            tm.tales = tm.tales || []; if (!tm.tales.some(function (q) { return q.title === tl.title; })) { pass(tm, t.name, t.id); if (false) tm.tales.push({ title: tl.title, text: tl.text, by: tl.by, from: a.name, day: SW.day(w) }); if (tm.tales.length > 6) tm.tales.shift(); got.push('the tale "' + tl.title + '"'); chron(st, 'lore', a.name + ' told ' + t.name + ' the tale "' + tl.title + '".', [a.id, t.id], a); } }
        }
        if (res.art) got.push('the art of ' + res.art);
        if (res.lore) got.push('deeper lore (+' + res.lore + ')');
        tell(st, t.id, a.name + ' taught you ' + (got.length ? got.join(', ') : 'what they could') + '.' + (res.why && d.teach.art ? ' They tried to teach you the art of ' + d.teach.art + ', but ' + res.why + '.' : '') + (res.synthesis >= 2 ? ' You have now learned from ' + res.synthesis + ' different teachers, and their teachings begin to fit together into something none of them showed you.' : ''), 6, !!res.art);
        entry.changes.push('taught ' + t.name + (got.length ? ' ' + got.join(', ') : ''));
        entry.taught = { to: t.name, lesson: clip(d.teach.lesson || '', 200) };
        tm.rev++;
      }
    }
  }
  if (d.habits && typeof d.habits === 'object') {
    if (Array.isArray(d.habits.avoid)) a.habits.avoid = d.habits.avoid.filter(function (x) { return typeof x === 'string'; }).map(function (x) { return x.toLowerCase().replace(/[^a-z]/g, '').slice(0, 20); }).filter(Boolean).slice(0, 8);
    if (d.habits.spare != null && isFinite(+d.habits.spare)) a.habits.spare = SW.clamp(Math.round(+d.habits.spare), 0, 3);
    entry.changes.push('set habits: refuses ' + (a.habits.avoid.join(', ') || 'nothing') + '; leaves ' + a.habits.spare + ' on each plant');
  }
  if (kind === 'deep') {
    if (Array.isArray(d.reflexes)) {
      const r = SW.sanitizePolicy(d.reflexes);
      if (r.policy.length) {
        mind.policyHistory.push({ tick: w.tick, policy: a.policy }); if (mind.policyHistory.length > 8) mind.policyHistory.shift();
        a.policy = r.policy;
        entry.changes.push('rewrote its reflexes (' + r.policy.length + ' rules' + (r.dropped ? ', ' + r.dropped + ' malformed and dropped' : '') + ')');
        chron(st, 'self', a.name + ' rewrote its own reflexes.', [a.id], a);
      } else entry.changes.push('tried to rewrite its reflexes, but no rule was well formed');
    }
    if (typeof d.creed === 'string' && d.creed.trim() && clip(d.creed, 700) !== mind.creed) {
      mind.creedHistory.push({ tick: w.tick, text: mind.creed }); if (mind.creedHistory.length > 8) mind.creedHistory.shift();
      mind.creed = clip(d.creed, 700); entry.changes.push('rewrote its creed');
      chron(st, 'self', a.name + ' rewrote its creed.', [a.id], a);
    }
    if (Array.isArray(d.notes)) {
      const was = mind.notes.length, ns = [];
      d.notes.filter(function (x) { return typeof x === 'string' && x.trim(); }).forEach(function (x) { const c = clip(x, 240); if (ns.length < 12 && !ns.some(function (q) { return sameIdea(q, c); })) ns.push(c); });
      if (ns.length) { mind.notes = ns; entry.changes.push('rethought what it knows (' + was + ' notes became ' + ns.length + ')'); }
    }
    if (d.designs && typeof d.designs === 'object') {
      const done = [];
      Object.keys(d.designs).slice(0, 8).forEach(function (k) {
        const lk = SW.sanitizeLook(d.designs[k]); if (!lk) return;
        if (k === 'self') { a.look = lk; done.push('its own body'); }
        else if (k === 'shelter') { a.shelterLook = lk; done.push('its shelters'); for (let i = 0; i < w.shelters.length; i++) if (w.shelters[i] === a.id) w.looks[i] = lk; }
        else if (k === 'wall') { a.wallLook = lk; done.push('its walls'); for (let i = 0; i < w.walls.length; i++) if (w.walls[i] === a.id) w.looks[i] = lk; }
        else if (k === 'emblem') { a.emblem = lk; done.push('its emblem'); w.marks.forEach(function (m) { if (m.by === a.id) m.look = lk; }); }
        else if (L.plants[k] && L.plants[k].by === a.id) { L.plants[k].look = lk; done.push(k); }
        else if (a.knows[k] && a.knows[k].by === a.id) { a.knows[k].look = lk; done.push('its ' + a.knows[k].name); }
      });
      if (done.length) { entry.changes.push('redesigned ' + done.join(', ')); chron(st, 'design', a.name + ' redesigned ' + done.join(', ') + '.', [a.id], a); }
    }
    if (typeof d.method === 'string' && d.method.trim() && clip(d.method, 400) !== mind.method) { mind.method = clip(d.method, 400); entry.changes.push('rewrote how it thinks'); chron(st, 'self', a.name + ' rewrote its own way of thinking.', [a.id], a); }
    if (d.great && typeof d.great === 'object') {
      const gw = SW.greatWork(w, a, d.great, st.emit);
      if (gw.ok) { entry.changes.push('led a great working: ' + gw.edict.path + ' ×' + gw.edict.factor + ' for the whole world'); st.ui({ type: 'great', a: a.id, edict: gw.edict }); }
      else { entry.changes.push('reached for a great working and failed (' + gw.why + ')'); tell(st, a.id, 'You reached for a great working, but ' + gw.why + '.', 2); }
    }
    if (d.discover && typeof d.discover === 'object') {
      const way = d.discover.way || d.discover.path;
      if (SW.discover(w, a, way, d.discover, st.emit)) {
        entry.changes.push('discovered ' + way + ': "' + a.knows[way].name + '"'); st.ui({ type: 'discovery', a: a.id });
        /* the first tool is the discovery itself, made real */
        if (way === 'tools') { const iv = SW.invent(w, a, { name: d.discover.name, use: SW.TOOL_USES.indexOf(String(d.discover.use).toLowerCase()) >= 0 ? d.discover.use : 'gather', idea: d.discover.idea, look: d.discover.look }, st.emit); if (iv.ok) entry.changes.push('devised its first thing: the ' + iv.name); }
      }
      else if (way) entry.changes.push('reached for a way it cannot yet walk (' + clip(way, 20) + ')');
    }
    if (d.invent && typeof d.invent === 'object') {
      const iv = SW.invent(w, a, d.invent, st.emit);
      if (iv.ok) entry.changes.push('invented the ' + iv.name); else { entry.changes.push('tried to invent something and could not (' + iv.why + ')'); tell(st, a.id, 'You tried to devise something new, but ' + iv.why + '.', 1); }
    }
    if (d.spell && typeof d.spell === 'object') {
      const res = SW.cast(w, a, d.spell, st.emit);
      entry.changes.push(res.ok ? 'worked the world: ' + res.laws.join(' + ') + ' ×' + res.field.factor + ' within ' + res.field.r + ' steps (' + res.cost + ' energy)' : 'tried to work the world and failed (' + res.why + ')');
    }
    const before = a.lore; a.loreWhy = 'reflection'; a.lore = Math.round((a.lore + 0.2 + 0.1 * (meta.tests || []).length) * 10) / 10;
    if (a.lore >= L.magic.loreToCast && !a.arts.length) {
      const art = SW.awaken(w, a);
      tell(st, a.id, 'Something has opened in you. You see the rules beneath the world, and you know you can bend one of them: the art of ' + art + '. At your next deep reflection you can work it. Other arts you could only learn from those who know them.', 6, true);
      chron(st, 'magic', a.name + ' has awakened to the art of ' + art + ' and can now work the world itself.', [a.id], a);
      st.ui({ type: 'awakened', a: a.id });
    }
    mind.sinceDeep = 0; mind.wantDeep = false;
  } else mind.sinceDeep++;
  if (typeof d.feeling === 'string' && d.feeling.trim()) { mind.feeling = clip(d.feeling, 200); entry.feeling = mind.feeling; }
  if (typeof d.wonder === 'string' && d.wonder.trim() && (kind === 'deep' || !mind.wonder || mind.thoughts - (mind.wonderAt || 0) >= 3)) { mind.wonder = clip(d.wonder, 220); mind.wonderAt = mind.thoughts; entry.changes.push('now wonders: ' + mind.wonder); }
  {
    const verbs = Array.isArray(d.plan) && d.plan.length ? d.plan.map(function (q) { return q && q.do; }).join('>') : null;
    const before = mind.log.filter(function (e) { return !e.failed; }).slice(-1)[0], ov = before ? overlap(before.thought, d.thought) : 0;
    mind.samePlan = verbs && verbs === mind.lastVerbs ? (mind.samePlan || 0) + 1 : verbs ? 0 : (mind.samePlan || 0);
    const same = ov >= 0.42 || (verbs && verbs === mind.lastVerbs && ov >= 0.22) || (verbs && mind.samePlan >= 2);
    mind.rut = same ? (mind.rut || 0) + 1 : 0; if (verbs) mind.lastVerbs = verbs; entry.rut = mind.rut;
    const sig = mind.life.length + ':' + Object.keys(a.rel).length + ':' + Object.keys(a.knows).length + ':' + (mind.heard.length ? mind.heard[mind.heard.length - 1].tick : 0) + ':' + a.stats.built + ':' + a.stats.kids;
    mind.dull = sig === mind.sig ? (mind.dull || 0) + 1 : 0; mind.sig = sig;
    if (mind.rut >= 3 && kind !== 'deep') mind.wantDeep = true;
  }
  mind.thoughts++; mind.act = {}; mind.actN = 0; mind.e0 = a.e;
  mind.log.push(entry); if (mind.log.length > 60) mind.log.shift();
  mind.rev++;
  return entry;
};

/* ---------- one thought ---------- */
const HIDE = { not_granted: 1, sampling_disabled: 1, not_declared: 1, capability_disabled: 1, capability_removed: 1 };
M.think = async function (st, mind, kind) {
  const w = st.world, a = agentById(w, mind.id);
  if (!a || mind.busy || !st.sample) return null;
  const cfg = kind === 'deep' ? st.settings.deep : st.settings.routine;
  const model = M.MODELS.filter(function (m) { return m.id === cfg.model; })[0];
  const opts = { cache: false, modelTier: model ? model.tier : 'default', onText: function (u) { mind.stream = u.text; } };
  if (model) opts.model = model.id;
  if (cfg.effort) opts.effort = cfg.effort;
  const tests = [];
  if (kind === 'deep' && st.settings.foresight && st.toolsOK) {
    opts.tools = [{
      name: 'test_reflexes',
      description: 'Imagine living by a candidate list of reflex rules for a day and a half, starting from the world as it is now. Returns whether you survive, your lowest and final energy, how much you ate, and how many moments you stood idle. It is imagination: others may act differently in reality.',
      inputSchema: { type: 'object', properties: { reflexes: { type: 'array', description: 'The candidate rule list, same format as "reflexes".', items: { type: 'object' } } }, required: ['reflexes'] },
      execute: function (input) {
        if (tests.length >= 3) throw new Error('You are too tired to imagine further. Decide with what you know.');
        const me = agentById(st.world, mind.id);
        if (!me) throw new Error('You are no longer alive.');
        const r = SW.sanitizePolicy(input && input.reflexes);
        if (!r.policy.length) throw new Error('None of those rules was well formed. Check variable names, operators and actions.');
        me.e -= st.world.laws.body.foresightCost;
        const res = SW.forecast(st.world, me.id, r.policy, Math.round(1.5 * st.world.laws.time.dayLength));
        res.rules_understood = r.policy.length; res.rules_malformed = r.dropped;
        tests.push({ rules: r.policy.length, survived: res.survived, low: res.energy_lowest, end: res.energy_end, cause: res.died_of });
        mind.rev++;
        return res;
      }
    }];
  }
  mind.busy = true; mind.kindNow = kind; mind.stream = ''; mind.tests = tests; st.inflight++; st.used++; st.lastStart = Date.now(); mind.rev++;
  const t0 = Date.now(), prompt = M.buildPrompt(st, mind, kind);
  let entry = null;
  try {
    let res;
    try { res = await st.sample(prompt, opts); }
    catch (e1) {
      if (!e1 || e1.code !== 'empty_completion') throw e1;
      /* no answer came back: ask once more with a shorter prompt and less deliberation */
      const o2 = { cache: false, modelTier: opts.modelTier, effort: 'low', onText: opts.onText }; if (opts.model) o2.model = opts.model;
      M.record(st, { t: 'retry', name: mind.name, kind: kind, chars: prompt.length });
      res = await st.sample(M.buildPrompt(st, mind, 'routine', true), o2);
    }
    const d = M.parseReply(res && res.text); if (res && res.truncated) M.record(st, { t: 'cut', name: mind.name, kind: kind, chars: String(res.text || '').length });
    if (!d) throw { code: 'invalid_json', message: 'no JSON object in the reply', text: res && res.text };
    const used = res.modelApplied ? (M.MODELS.filter(function (m) { return m.id === res.modelApplied; })[0] || { label: res.modelApplied }).label.replace(/ \(.*/, '') : 'tier: ' + (res.modelTierApplied || opts.modelTier);
    entry = M.apply(st, mind, kind, d, { model: used + (cfg.effort && kind === 'deep' ? ', ' + cfg.effort + ' effort' : ''), ms: Date.now() - t0, tests: tests });
    st.errStreak = 0;
    { const me = agentById(st.world, mind.id);
      M.record(st, { t: 'thought', id: mind.id, name: mind.name, kind: kind, model: entry.model, ms: entry.ms, thought: entry.thought, feeling: entry.feeling || '', say: entry.say || null, changes: entry.changes, rut: entry.rut || 0, e: me ? Math.round(me.e) : null, hp: me ? Math.round(me.hp) : null, at: me ? [me.x, me.y] : null, plan: me ? (me.intent ? [me.intent] : []).concat(me.plan).map(stepText) : [], drives: me ? M.drives(st, mind, me, SW.look(st.world, me)).map(function (q) { return q.k + ' ' + q.s; }) : [] });
      if (st.used % (st.used > 600 ? 60 : 15) === 1) M.record(st, { t: 'prompt', id: mind.id, name: mind.name, kind: kind, prompt: prompt, reply: String(res.text || '').slice(0, 6000) }); }
    st.ui({ type: 'thought', a: mind.id, entry: entry });
  } catch (e) {
    const code = (e && e.code) || 'upstream_error';
    if (HIDE[code]) { st.on = false; st.blocked = 'Claude is not available to this page in this view, so the beings run on reflexes alone.'; }
    else if (code === 'rate_limited') { st.on = false; st.notice = e.reason === 'usage_limit' ? 'You have reached your Claude usage limit. The minds are asleep; wake them again later.' : 'Too many thoughts at once. The minds are asleep: lower thoughts per minute in Settings, then wake them.'; }
    else if (code === 'session_expired') { st.on = false; st.notice = 'Your session expired. Sign in again, then wake the minds.'; }
    else if (code === 'tools_unavailable') { st.toolsOK = false; st.notice = 'Foresight (imagined test runs) is not available in this view; deep reflection continues without it.'; }
    else if (code !== 'cancelled') {
      st.errStreak++;
      if (st.errStreak >= 3) { st.on = false; st.notice = 'Three thoughts in a row failed (' + code + '). The minds are asleep; wake them to try again.'; }
    }
    mind.log.push({ tick: w.tick, day: SW.day(w), kind: kind, failed: true, code: code, thought: code === 'invalid_json' ? 'The thought came out garbled and was lost.' : 'The thought did not arrive (' + code + ').', changes: [], raw: e && e.text ? clip(e.text, 300) : '' });
    M.record(st, { t: 'failed', id: mind.id, name: mind.name, kind: kind, code: code, raw: e && e.text ? String(e.text).slice(0, 1500) : (e && e.message) || '' });
    st.ui({ type: 'thought_failed', a: mind.id, code: code });
  } finally {
    mind.busy = false; mind.stream = ''; mind.urge = 0; st.inflight--; mind.rev++;
  }
  return entry;
};

/* ---------- pacing: who thinks next, and how often ---------- */
/* a community learns from what happens to its own: a death and how it came, a sickness and its cause, a thing that worked.
   Those who saw it or belong with the one it happened to carry it at once; from them it passes, mouth to mouth, to anyone who understands their speech. */
function community(st, a, reach) { const w = st.world, out = []; if (!a) return out; w.agents.forEach(function (o) { if (o === a || o.dead) return; const d = SW.cheb(o.x, o.y, a.x, a.y); if (SW.rootOf(w, o) === SW.rootOf(w, a) || (a.parents || []).indexOf(o.id) >= 0 || (o.parents || []).indexOf(a.id) >= 0 || (o.people === a.people && d <= (reach || 30)) || d <= w.laws.body.sight) out.push(o.id); }); return out; }
function lesson(st, ids, text) { const w0 = st.world, first = (ids || []).map(function (id) { return w0.agents.filter(function (o) { return o.id === id; })[0]; }).filter(Boolean), ci = first.length ? cultNew(st, 'lesson', text, text, first[0], null, false) : null; if (ci) first.forEach(function (o) { cultHold(st, ci.id, o, null, false, 0, true); });
  (ids || []).forEach(function (id) { const m = st.minds[id]; if (!m || m.dead) return; m.lessons = m.lessons || []; if (m.lessons.some(function (q) { return q.text === text; })) return; m.lessons.push({ day: SW.day(st.world), text: text, cid: ci ? ci.id : null }); if (m.lessons.length > 10) m.lessons.shift(); m.rev++; }); if (ids && ids.length) { st.world.tally.lessons = (st.world.tally.lessons || 0) + 1; M.record(st, { t: 'lesson', text: text, to: ids.length }); } }
M.lesson = lesson;
/* ---------- culture: what is made, held and handed on. Every idea has an origin, holders, and a path by which it spread. ---------- */
function cult(st) { const w = st.world; return w.culture || (w.culture = { seq: 1, items: {}, log: [], days: [], rites: {} }); }
function cultLog(st, e) { const C = cult(st); e.day = SW.day(st.world); C.log.push(e); if (C.log.length > 400) C.log.splice(0, C.log.length - 400); C.rev = (C.rev || 0) + 1; }
function cultNew(st, kind, title, text, a, extra, quiet) {
  const w = st.world, C = cult(st), key = kind + ':' + String(text || title).toLowerCase(); C.byText = C.byText || {};
  if (C.byText[key] && C.items[C.byText[key]]) { const it0 = C.items[C.byText[key]]; if (a && !it0.holders[a.id]) cultHold(st, it0.id, a, null, false, 0, true); return it0; }
  const id = 'c' + (C.seq++), it = { id: id, kind: kind, title: clip(title, 60), text: clip(text || '', 320), by: a ? a.name : null, byId: a ? a.id : null, people: a ? a.people : null, day: SW.day(w), holders: {}, reach: {}, tellings: 0, changed: 0, depth: 0 };
  if (extra) for (const k in extra) it[k] = extra[k];
  C.items[id] = it; C.byText[key] = id; if (a) { it.holders[a.id] = { day: it.day, gen: 0 }; if (a.people != null) it.reach[a.people] = it.day; }
  if (!quiet) cultLog(st, { k: 'made', id: id, kind: kind, title: it.title, who: it.by, people: it.people });
  const ids = Object.keys(C.items); if (ids.length > 280) { const alive = {}; w.agents.forEach(function (o) { alive[o.id] = 1; }); for (let i = 0; i < ids.length && Object.keys(C.items).length > 240; i++) { const q = C.items[ids[i]]; if (q.kind === 'lesson' && !Object.keys(q.holders).some(function (h) { return alive[h]; })) delete C.items[ids[i]]; } }
  C.rev = (C.rev || 0) + 1; return it;
}
function cultHold(st, id, o, from, changed, gen, quiet) {
  const w = st.world, C = cult(st), it = C.items[id]; if (!it || !o || it.holders[o.id]) return false;
  const day = SW.day(w); it.holders[o.id] = { day: day, from: from ? from.name : null, gen: gen || 0 }; if (from) it.tellings++; if (changed) it.changed++; if ((gen || 0) > it.depth) it.depth = gen;
  if (o.people != null && it.reach[o.people] == null) { it.reach[o.people] = day; if (it.people != null && o.people !== it.people) { cultLog(st, { k: 'crossed', id: id, kind: it.kind, title: it.title, who: o.name, from: from ? from.name : null, people: o.people, of: it.people }); w.tally.crossIdeas = (w.tally.crossIdeas || 0) + 1; quiet = true; } }
  if (!quiet && from) cultLog(st, { k: 'passed', id: id, kind: it.kind, title: it.title, who: o.name, from: from.name, people: o.people, changed: !!changed });
  C.rev = (C.rev || 0) + 1; return true;
}
function cultDrop(st, id, o) { const it = cult(st).items[id]; if (it && o && it.holders[o.id]) { delete it.holders[o.id]; cult(st).rev++; } }
/* once a day, how many living beings of each people hold each idea: the curve of its spread */
function cultSnap(st) {
  const w = st.world, C = cult(st), day = SW.day(w); if (C.snapDay === day) return; C.snapDay = day;
  const pe = {}; w.agents.forEach(function (o) { pe[o.id] = o.people == null ? -1 : o.people; });
  const row = { day: day, n: {}, p: {} };
  for (const id in C.items) { const it = C.items[id]; let n = 0; const bp = {}; for (const h in it.holders) if (pe[h] != null) { n++; bp[pe[h]] = (bp[pe[h]] || 0) + 1; } if (n) { row.n[id] = n; row.p[id] = bp; } }
  C.days.push(row); if (C.days.length > 120) C.days.shift();
  const F = w.faiths = w.faiths || {}; for (const f in F) F[f].n = 0; w.agents.forEach(function (o) { if (o.faith && F[o.faith]) F[o.faith].n++; });
}
/* a way that was known before memory, or found, as an idea with holders */
function wayItem(st, a, node) {
  const w = st.world, k = a.knows[node]; if (!k) return null; const C = cult(st);
  if (k.cid && C.items[k.cid]) return C.items[k.cid];
  const founder = k.by != null ? k.by : 'p' + a.people, key = 'way:' + node + ':' + founder; C.ways = C.ways || {};
  let it = C.ways[key] && C.items[C.ways[key]];
  if (!it) { const src = k.by != null ? { name: k.byName || nameOf(st, k.by), id: k.by, people: a.people } : null; it = cultNew(st, 'way', (k.name && k.name !== node ? k.name + ' (' + node + ')' : node), k.idea || (k.by == null ? 'held since before memory' : ''), null, { node: node, by: src ? src.name : null, byId: src ? src.id : null, people: a.people }, k.by == null); C.ways[key] = it.id; if (a.people != null) it.reach[a.people] = it.day; }
  k.cid = it.id; if (!it.holders[a.id]) it.holders[a.id] = { day: SW.day(w), gen: 0 };
  return it;
}
M.cult = { get: cult, make: cultNew, hold: cultHold, drop: cultDrop, snap: cultSnap, way: wayItem };
/* how many of the living hold an idea, and of which peoples */
M.cultLive = function (st, it) { const w = st.world; let n = 0; const p = {}; for (let i = 0; i < w.agents.length; i++) { const o = w.agents[i]; if (it.holders[o.id]) { n++; p[o.people] = (p[o.people] || 0) + 1; } } return { n: n, p: p }; };
/* a teaching one being holds reaches the ears of those who live beside it; taking it up is their own choice */
function hearFaiths(st) {
  const w = st.world, hr = w.laws.body.hearing, C = cult(st);
  for (let i = 0; i < w.agents.length; i++) { const a = w.agents[i]; if (!a.faith || !C.items[a.faith]) continue; const it = C.items[a.faith];
    for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j], om = st.minds[o.id]; if (o === a || !om || om.dead || o.faith === a.faith || SW.cheb(a.x, a.y, o.x, o.y) > hr || SW.understands(o, a.lang) < 0.5) continue;
      om.heard = om.heard || {}; if (om.heard[it.id]) continue; if (((w.tick >> 4) + a.id * 3 + o.id * 5) % 4) continue;
      om.heard[it.id] = { from: a.name, day: SW.day(w) }; tell(st, o.id, a.name + ' lives by a teaching called "' + it.title + '": ' + it.text + ' You have heard it now. Whether to take it as your own is yours to decide.', 3); } }
}
function gossip(st) {
  const w = st.world, hr = w.laws.body.hearing;
  for (let i = 0; i < w.agents.length; i++) { const a = w.agents[i], m = st.minds[a.id]; if (!m || !m.lessons || !m.lessons.length) continue;
    for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j], om = st.minds[o.id]; if (o === a || !om || om.dead || SW.cheb(a.x, a.y, o.x, o.y) > hr || SW.understands(o, a.lang) < 0.5) continue; om.lessons = om.lessons || []; const have = {}; om.lessons.forEach(function (q) { have[q.text] = 1; });
      for (let k = m.lessons.length - 1; k >= 0; k--) if (!have[m.lessons[k].text]) { om.lessons.push({ day: m.lessons[k].day, text: m.lessons[k].text, from: a.name, cid: m.lessons[k].cid }); if (m.lessons[k].cid) cultHold(st, m.lessons[k].cid, o, a, false, 1, true); if (om.lessons.length > 10) om.lessons.shift(); om.rev++; break; } } }
}
function seasonSaw(st, id, what) { const m = st.minds[id]; if (!m || m.dead) return; if (!m.sea) m.sea = { n: 0, hungry: 0, hurt: 0, sick: 0, roof: 0, sky: {}, saw: [] }; if (m.sea.saw.length < 5 && m.sea.saw.indexOf(what) < 0) m.sea.saw.push(what); }
M.seasonSaw = seasonSaw;
function seasonKeep(st) {
  const w = st.world, L = w.laws.time, se = SW.season(w), per = L.dayLength * L.seasonDays;
  if (w.tick % 40 === 7) w.agents.forEach(function (a) { const m = st.minds[a.id]; if (!m || a.dead) return; if (!m.sea) m.sea = { n: 0, hungry: 0, hurt: 0, sick: 0, roof: 0, sky: {}, saw: [] }; const q = m.sea; q.n++; if (a.e < 35) q.hungry++; if (a.hp < 60) q.hurt++; if (a.sick > 0) q.sick++; if (a.sheltered) q.roof++; q.sky[w.weather.kind] = (q.sky[w.weather.kind] || 0) + 1; });
  if (st.seaSeason == null) st.seaSeason = se;
  if (se === st.seaSeason) return;
  const ended = st.seaSeason, year = Math.floor((w.tick - 1) / (per * 4)) + 1; st.seaSeason = se;
  let food = 0; for (let i = 0; i < w.plants.length; i++) if (w.plants[i] && w.plants[i].food >= 1) food++;
  w.agents.forEach(function (a) {
    const m = st.minds[a.id]; if (!m || a.dead || !m.sea || m.sea.n < 4) return;
    const q = m.sea, f = function (v) { const r = v / q.n; return r > 0.5 ? 'most of the time' : r > 0.2 ? 'often' : r > 0.04 ? 'now and then' : ''; }, bits = [];
    const sky = Object.keys(q.sky).filter(function (k) { return k !== 'clear' && q.sky[k] / q.n > 0.12; });
    if (f(q.hungry)) bits.push('hungry ' + f(q.hungry)); else bits.push('well fed');
    if (f(q.hurt)) bits.push('hurt ' + f(q.hurt)); if (f(q.sick)) bits.push('sick ' + f(q.sick));
    bits.push(sky.length ? 'skies of ' + sky.join(' and ') : 'clear skies'); bits.push('food plants in the land at its end: ' + (food > 600 ? 'plentiful' : food > 300 ? 'fair' : food > 120 ? 'thin' : 'scarce'));
    if (q.saw.length) bits.push(q.saw.join('; '));
    if (!m.seasons) m.seasons = []; m.seasons.push('Year ' + year + ', ' + SW.SEASONS[ended] + ': ' + bits.join('; ') + '.'); if (m.seasons.length > 10) m.seasons.shift();
    m.sea = null; m.rev++;
  });
}
M.tick = function (st) {
  seasonKeep(st);
  if (st.world.tick % 80 === 13) { gossip(st); hearFaiths(st); }
  if (st.world.tick % st.world.laws.time.dayLength === 7) cultSnap(st);
  const ags = st.world.agents;
  for (let k = 0; k < ags.length; k++) {
    const a = ags[k], m = st.minds[a.id]; if (!m || m.dead) continue;
    m.urge += 0.03;
    /* a being can look back on what its own body has been doing */
    const d = a.doing.replace(/\s*\(.*$/, '').split(' ').slice(0, 3).join(' ');
    m.act[d] = (m.act[d] || 0) + 1; m.actN++;
  }
};
M.kindFor = function (st, mind) {
  if (mind.thoughts === 0) return 'routine';
  if (mind.sinceDeep >= st.settings.reflectEvery) return 'deep';
  if (mind.wantDeep && mind.sinceDeep >= 2) return 'deep';
  return 'routine';
};
M.pump = function (st) {
  if (!st.on || !st.sample || st.blocked) return;
  if (st.used >= st.settings.budget && !st.settings.endless) { st.on = false; st.notice = 'The minds have had the ' + st.settings.budget + ' thoughts you allowed and are asleep. Wake them for another ' + st.settings.budget + ', or raise the budget in Setup.'; st.budgetHit = true; return; }
  if (st.inflight >= st.settings.parallel) return;
  if (Date.now() - st.lastStart < 60000 / Math.max(1, st.settings.perMinute)) return;
  let best = null;
  for (const id in st.minds) {
    const m = st.minds[id];
    if (m.dead || m.busy || !agentById(st.world, m.id)) continue;
    if (!best || m.urge > best.urge) best = m;
  }
  if (best && best.urge >= 1) M.think(st, best, M.kindFor(st, best));
};

/* ---------- saving ---------- */
M.snapshot = function (st) {
  const minds = {};
  for (const id in st.minds) {
    const m = st.minds[id];
    if (m.dead && st.world.tick - (m.diedTick || 0) > 6000) continue;
    const c = {}; for (const k in m) c[k] = m[k];
    c.busy = false; c.stream = ''; c.log = m.log.slice(-30); delete c.tests;
    minds[id] = c;
  }
  return { v: 4, world: st.world, minds: minds, names: st.names, chron: st.chron.slice(-120), voices: st.voices.slice(-120), settings: st.settings, used: st.used, runId: st.runId, recChunk: st.rec ? st.rec.chunk : 0, story: st.story, maker: st.maker };
};
M.restore = function (snap) {
  if (!snap || snap.v !== 4 || !snap.world || !snap.world.laws || snap.world.v !== 2) return null;
  const base = M.defaultSettings(), got = snap.settings || {};
  if (got.v === base.v) for (const k in got) if (k in base) base[k] = got[k]; /* settings from before this generation give way to its defaults */
  SW.upgrade(snap.world);
  const st = M.createState(snap.world, base);
  st.minds = snap.minds || {}; st.names = snap.names || {}; st.chron = snap.chron || []; st.voices = snap.voices || [];
  st.used = 0;
  if (snap.runId) { st.runId = snap.runId; st.rec.chunk = snap.recChunk || 0; }
  if (snap.story && snap.story.chapters) st.story = snap.story; if (snap.maker && snap.maker.log) st.maker = snap.maker;
  if (!snap.world.sites) snap.world.sites = [];
  if (!snap.world.trees) snap.world.trees = snap.world.terrain.map(function (t) { return t === 3 ? 3 : 0; });
  /* a save from an earlier build of this generation may lack things added since: fill them in */
  const w = snap.world, wd = { edicts: [], places: [], inventions: [], fields: [], marks: [], graves: [], settlements: [] };
  if (!w.devices) w.devices = {};
  for (const k in wd) if (!w[k]) w[k] = wd[k];
  if (!w.sturdy) w.sturdy = {}; if (!w.laws.tools) w.laws.tools = {};
  if (!w.wars) w.wars = []; if (!w.fished) w.fished = {}; if (!w.river) w.river = {}; if (!w.ore) w.ore = {};
  const fresh = SW.defaultLaws();
  for (const g in fresh) { if (w.laws[g] == null) w.laws[g] = fresh[g]; else if (typeof fresh[g] === 'object' && g !== 'plants' && g !== 'creatures' && g !== 'tools') for (const k in fresh[g]) if (w.laws[g][k] == null) w.laws[g][k] = fresh[g][k]; }
  w.agents.forEach(function (a) {
    const ad = { knows: {}, glimpsed: {}, tools: [], designs: {}, read: {}, stances: {}, customs: [], plan: [], seenAt: {}, arts: [], teachers: [] };
    for (const k in ad) if (a[k] == null) a[k] = ad[k];
    if (a.stone == null) a.stone = 0; if (a.lore == null) a.lore = 0; if (a.spook == null) a.spook = 0;
    ['ore', 'clay', 'pots', 'sick', 'immune'].forEach(function (k) { if (a[k] == null) a[k] = 0; });
    ['wood', 'marks', 'taught', 'hunted', 'healed', 'led', 'invented', 'crafted', 'fished', 'ore', 'clay', 'tamed', 'rallied', 'milk', 'wool', 'ride', 'told', 'tended', 'mined', 'raised', 'paved', 'seasons', 'made'].forEach(function (k) { if (a.stats[k] == null) a.stats[k] = 0; });
  });
  for (const id in st.minds) {
    const m = st.minds[id], md = { parents: [], foods: {}, said: [], heard: [], watched: {}, act: {}, life: [], notes: [], events: [], log: [], creedHistory: [], policyHistory: [] };
    for (const k in md) if (m[k] == null) m[k] = md[k];
    if (m.actN == null) m.actN = 0; if (m.e0 == null) m.e0 = 50; if (m.strips == null) m.strips = 0; if (m.aim == null) m.aim = ''; if (m.method == null) m.method = '';
  }
  snap.world.agents.forEach(function (a) { if (!st.minds[a.id]) st.minds[a.id] = M.newMind(a); st.names[a.id] = a.name; if (a.parents && a.parents.length && !(st.minds[a.id].parents || []).length) st.minds[a.id].parents = a.parents; });
  SW.refreshLooks(w);
  return st;
};

if (typeof module !== 'undefined' && module.exports) module.exports = M;
root.SWM = M;
})(typeof window !== 'undefined' ? window : globalThis);
