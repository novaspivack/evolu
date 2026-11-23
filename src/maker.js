/* Required Notice: Copyright (c) 2026 Nova Spivack (https://github.com/novaspivack/evolu)
   Evolu is licensed under the PolyForm Noncommercial License 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0

   Evolu's outer loop. Two roles stand outside the world and watch it.
   The CHRONICLER turns the record into the story of the world: chapters, threads, trends.
   The MAKER reads the story and the numbers, keeps a notebook of ideas and experiments, and changes the world itself
   while it runs: its laws, its plants and animals, what foods and places do, what can be made and done, the ways of knowledge.
   Every change is checked against bounds, tried first on a copy of the world, written down with a prediction, and
   reviewed at the maker's next visit, when it is kept or undone. What the maker cannot do with these parts it asks
   the programmer for, in writing. Neither role ever tells the beings anything: they must find it. */
(function (root) {
'use strict';
const SW = root.SW || require('./engine.js'), M = root.SWM || require('./minds.js');
const K = {};
function clip(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function word(s, n) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 16); }
function num(v, lo, hi, d) { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
function med(a) { if (!a.length) return 0; const b = a.slice().sort(function (p, q) { return p - q; }); return b[Math.floor(b.length / 2)]; }
function ask(st, cfg, prompt) {
  const model = M.MODELS.filter(function (m) { return m.id === cfg.model; })[0], opts = { cache: false, modelTier: model ? model.tier : 'default' };
  if (model) opts.model = model.id; if (cfg.effort) opts.effort = cfg.effort;
  return st.sample(prompt, opts).then(function (res) { const text = String((res && res.text) || ''); if (res && res.truncated) K.cut = (K.cut || 0) + 1; const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b <= a) throw { code: 'invalid_json', text: text }; return JSON.parse(text.slice(a, b + 1)); });
}

/* ---------- the numbers ---------- */
K.stats = function (st) {
  SW.use(st.world);
  const w = st.world, ags = w.agents, T = st.story.tally, rels = [], bands = {}, ways = {}, kinds = {};
  ags.forEach(function (a) { for (const id in a.rel) rels.push(a.rel[id]); const r = SW.rootOf(w, a); if (r !== a || ags.some(function (o) { return o.leader === a.id; })) bands[r.id] = (bands[r.id] || 0) + 1; for (const k in a.knows) ways[k] = (ways[k] || 0) + 1; });
  w.creatures.forEach(function (c) { kinds[c.sp] = (kinds[c.sp] || 0) + 1; });
  const dead = Object.keys(st.minds).map(function (id) { return st.minds[id]; }).filter(function (m) { return m.dead; });
  const T2 = st.rec ? st.rec.all.filter(function (r) { return r.t === 'thought'; }).slice(-120) : [];
  return {
    day: SW.day(w), season: SW.SEASONS[SW.season(w)], alive: ags.length, children: ags.filter(function (a) { return SW.stage(w, a) === 'child'; }).length, elders: ags.filter(function (a) { return SW.stage(w, a) === 'elder'; }).length,
    everBorn: Math.max(Object.keys(st.minds).length, ((w.tally || {}).lived || 0) + ((w.tally || {}).founders || 0)), deaths: Math.max(dead.length, (w.tally || {}).died || 0), deathCauses: (function () { const o = dead.reduce(function (o2, m) { const c = m.cause || 'unknown'; o2[c] = (o2[c] || 0) + 1; return o2; }, {}), T2 = (w.tally || {}).deaths || {}; for (const c in T2) o[c] = Math.max(o[c] || 0, T2[c]); return o; })(),
    women: ags.filter(function (a) { return a.sex === 'f'; }).length, men: ags.filter(function (a) { return a.sex === 'm'; }).length, births: (w.tally || {}).births || 0, landOpenedBeyondTheEdge: w.opened || 0, unknownLandLeft: w.veil ? Object.keys(w.veil.t).length : 0, depositsSpentAndWaiting: (w.spent || []).length,
    lands: (w.regions || []).map(function (R) { return R.name + ' [' + R.biome + ']: ' + ags.filter(function (a) { return w.region[a.y * w.W + a.x] === R.id; }).length + ' beings' + (R.minerals && R.minerals.length ? ', holds ' + R.minerals.join('/') : ''); }),
    peoples: (w.peoples || []).map(function (P) { const mine = ags.filter(function (a) { return a.people === P.id; }); return P.name + ' (' + P.noun + '): ' + mine.length + ' alive, ' + mine.filter(function (a) { return a.mixed; }).length + ' of mixed birth; understand other tongues: ' + (Math.round(100 * med(mine.map(function (a) { let m = 0; for (const k in (a.tongues || {})) if (+k !== a.lang) m = Math.max(m, a.tongues[k]); return m; }))) || 0) + '% (median best)'; }),
    metAcrossPeoples: ags.reduce(function (n, a) { return n + ags.filter(function (o) { return o.people !== a.people && a.seen && a.seen[o.id]; }).length; }, 0) / 2,
    waysByAge: (function () { const o = {}; ags.forEach(function (a) { for (const k in a.knows) { const e = 'age ' + ((w.laws.tree[k] || {}).era || 1); o[e] = o[e] || {}; o[e][k] = (o[e][k] || 0) + 1; } }); return o; })(),
    timesMade: w.tally ? w.tally.made : {}, timesEaten: w.tally ? w.tally.eaten : {}, timesBuilt: w.tally ? w.tally.built : {}, madeThingsGiven: (w.tally && w.tally.given) || {},
    leadersWithNoFollowers: ags.filter(function (a) { return a.leader == null && (a.bandName || a.stats.led === 0) && !ags.some(function (o) { return o.leader === a.id; }) && (a.bandName || '').length > 0; }).map(function (a) { return a.name; }),
    greatWorksUnderWay: Object.keys(w.works || {}).map(function (i) { const W0 = w.works[i], B = w.laws.buildings[W0.kind] || {}; return W0.kind + ' (' + (W0.wood + W0.stone) + ' of ' + ((B.wood || 0) + (B.stone || 0)) + ' brought, ' + Object.keys(W0.hands).length + ' hands)'; }),
    deposits: (function () { const o = {}; for (const i in (w.lodes || {})) o[w.lodes[i].k] = (o[w.lodes[i].k] || 0) + 1; return o; })(), thingsHeld: (function () { const o = {}; ags.forEach(function (a) { for (const k in (a.things || {})) if (a.things[k] > 0) o[k] = (o[k] || 0) + a.things[k]; }); return o; })(), roadsPaved: Object.keys(w.roads || {}).length,
    camps: (function () { const cs = (w.settlements || []).map(function (z) { const r0 = M.agentById(w, z.root), P = r0 && SW.peopleOf(w, r0); return { name: z.name, at: [z.x, z.y], people: P ? P.name : '?', land: (SW.regionAt(w, z.x, z.y) || {}).name || '' }; }); (w.peoples || []).forEach(function (P) { const mem = ags.filter(function (a) { return a.people === P.id; }); if (mem.length) cs.push({ name: 'centre of ' + P.name, at: [Math.round(mem.reduce(function (n, a) { return n + a.x; }, 0) / mem.length), Math.round(mem.reduce(function (n, a) { return n + a.y; }, 0) / mem.length)], people: P.name }); }); return cs; })(),
    stepsBetweenPeoples: (function () { const o = {}, P = w.peoples || []; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { let d = 999; ags.forEach(function (a) { if (a.people !== P[i].id) return; ags.forEach(function (b) { if (b.people === P[j].id) d = Math.min(d, SW.cheb(a.x, a.y, b.x, b.y)); }); }); o[P[i].name + ' / ' + P[j].name] = d; } return o; })(),
    landsVisited: ags.map(function (a) { return a.name + ' ' + Object.keys(a.lands || {}).length; }).join(', '),
    acrossPeoples: { firstMeetings: ((w.tally && w.tally.met) || []).slice(-12).map(function (q) { return 'day ' + q.day + ': ' + q.a + ' and ' + q.b + ' in ' + q.land; }), giftsAcross: (w.tally && w.tally.crossGifts) || 0, actsTogetherAcross: (w.tally && w.tally.crossActs) || 0 },
    toolsUsedInTheField: (w.tally && w.tally.toolUse) || {},
    standing: ags.map(function (a) { return { name: a.name, standing: SW.status(w, a), knownAs: SW.roleOf(w, a) || '', followers: ags.filter(function (o) { return o.leader === a.id; }).length }; }).sort(function (p, q) { return q.standing - p.standing; }),
    pledgesRefused: (w.tally && w.tally.pledgesRefused) || [], buildingsOfTheDeadClaimed: (w.tally && w.tally.claimed) || 0, emptyBuildingsOfTheDead: (function () { let n = 0; for (let i = 0; i < w.shelters.length; i++) if (w.shelters[i] > 0 && !SW.isAlive(w, w.shelters[i])) n++; return n; })(), newcomersSoFar: ags.filter(function (a) { return a.arrived != null; }).length,
    lessonsLearnedFromOthers: (w.tally && w.tally.lessons) || 0, talesHeld: Object.keys(st.minds).reduce(function (n, id) { return n + ((st.minds[id].tales || []).length); }, 0),
    tellingsByTheFire: ags.reduce(function (n, a) { return n + (a.stats.told || 0); }, 0), huntsMadeTogether: ags.reduce(function (n, a) { return n + (a.stats.huntedWith || 0); }, 0), grudgesHeld: ags.reduce(function (n, a) { return n + Object.keys(a.marks || {}).filter(function (k) { return a.marks[k].k === 'grudge'; }).length; }, 0), kindnessesRemembered: ags.reduce(function (n, a) { return n + Object.keys(a.marks || {}).filter(function (k) { return a.marks[k].k === 'kindness'; }).length; }, 0),
    hardshipsPressing: (function () { const o = {}; (w.peoples || []).forEach(function (p, i) { const t = {}; let n = 0; w.agents.forEach(function (a) { if (a.people !== i) return; n++; for (const k in (a.press || {})) t[k] = (t[k] || 0) + a.press[k]; }); const top = Object.keys(t).sort(function (x, y) { return t[y] - t[x]; }).slice(0, 4).map(function (k) { return k + ' ' + (Math.round(t[k] / Math.max(1, n) * 10) / 10); }); o[p.name] = top.join(', ') || 'none'; }); return o; })(),
    waysWithinReach: (function () { const o = {}; w.agents.forEach(function (a) { const pf = SW.pathsFor(w, a); pf.open.forEach(function (q) { o[q.id] = (o[q.id] || '') + a.name + ' (open' + (q.why ? ', by ' + q.why : '') + ') '; }); pf.near.slice(0, 2).forEach(function (q) { if ((o[q.id] || '').length < 90) o[q.id] = (o[q.id] || '') + a.name + ' (needs ' + q.missing.slice(0, 70) + ') '; }); }); return o; })(),
    culture: (function () { const C = w.culture || { items: {}, log: [], rites: {} }, kinds = {}, held = []; for (const id in C.items) { const it = C.items[id], lv = M.cultLive(st, it); if (!lv.n) continue; kinds[it.kind] = (kinds[it.kind] || 0) + 1; if (it.kind !== 'way' && it.kind !== 'lesson') held.push({ kind: it.kind, title: it.title, by: it.by, heldBy: lv.n, peoples: Object.keys(lv.p).length, retellings: it.tellings, changed: it.changed }); }
      held.sort(function (x, y) { return y.heldBy - x.heldBy; }); const F = w.faiths || {};
      return { ideasAliveByKind: kinds, mostHeld: held.slice(0, 8), teachings: Object.keys(F).filter(function (k) { return F[k].n > 0; }).map(function (k) { return F[k].name + ' (' + F[k].n + ')'; }), ideasThatCrossedBetweenPeoples: w.tally.crossIdeas || 0, prizedThingsMade: (w.relics || []).length, prizedThingsGivenOn: (w.relics || []).filter(function (r) { return r.passes.length; }).length, sharedActsByPeople: (function () { const o = {}; for (const pk in (C.rites || {})) { const p = (w.peoples || [])[pk]; o[p ? p.name : 'others'] = Object.keys(C.rites[pk]).map(function (k) { return k + ' x' + C.rites[pk][k].n; }).join(', '); } return o; })() }; })(),
    ageOfTheWorld: SW.eraOf(w), powerOfTheOldWorkings: SW.magicFactor(w), pastureWorn: Object.keys(w.worn || {}).length,
    thirstHighest: Math.round(Math.max.apply(null, ags.map(function (a) { return a.thirst || 0; }).concat([0]))), wellbeing: { sufferingMedian: Math.round(100 * med(ags.map(function (a) { return a.suffer || 0; }))) / 100, happinessMedian: Math.round(100 * med(ags.map(function (a) { return a.happy == null ? 0.4 : a.happy; }))) / 100, satisfactionMedian: Math.round(100 * med(ags.map(function (a) { return a.sat == null ? 0.5 : a.sat; }))) / 100 }, buildingsByKind: (function () { const o = {}, bk = st.world.bkind || {}; Object.keys(bk).forEach(function (i) { if (st.world.shelters[i]) o[bk[i]] = (o[bk[i]] || 0) + 1; }); return o; })(), mounted: ags.filter(function (a) { return a.mount; }).length,
    energyMedian: Math.round(med(ags.map(function (a) { return a.e; }))), healthLowest: Math.round(Math.min.apply(null, ags.map(function (a) { return a.hp; }).concat([100]))), sick: ags.filter(function (a) { return a.sick > 0; }).length,
    bonds: rels.length, bondsWarm: rels.filter(function (r) { return r > 0.5; }).length, bondsHostile: rels.filter(function (r) { return r < -0.2; }).length,
    bands: Object.keys(bands).map(function (id) { const l = M.agentById(w, +id); return (l ? (l.bandName || l.name + "'s") : '?') + ' (' + bands[id] + ')'; }), following: ags.filter(function (a) { return a.leader != null; }).length,
    settlements: w.settlements.length, warsOpen: w.wars.filter(function (q) { return q.ended == null; }).length, warsEver: w.wars.length,
    shelters: w.shelters.filter(Boolean).length, walls: w.walls.filter(Boolean).length, stores: w.stores.filter(Boolean).length, sites: (w.sites || []).length,
    waysKnown: ways, designs: Object.keys(w.laws.tools).length, loreHighest: Math.max.apply(null, ags.map(function (a) { return a.lore; }).concat([0])), withArts: ags.filter(function (a) { return a.arts.length; }).length,
    plants: w.plants.filter(Boolean).length, foodStanding: Math.round(w.plants.reduce(function (s, p) { return s + (p ? Math.floor(p.food) : 0); }, 0)), creatures: kinds,
    events: { gifts: T.gift || 0, trades: T.trade || 0, thefts: T.theft || 0, fights: T.fight || 0, teachings: T.lore || 0, pledgesAndStances: T.power || 0, births: Math.max(0, (T.birth || 0) - 1), courtings: T.court || 0, sickness: T.sick || 0, inventions: T.invention || 0, building: T.build || 0, ritesAndNames: T.culture || 0, magic: T.magic || 0, killsByPredators: T.hunt || 0, loreGainedBy: st.world.loreBy || {}, written: st.world.marks.filter(function (m) { return m.sign; }).length, animalsTamed: st.world.creatures.filter(function (c) { return c.owner != null; }).length, battlesCalled: st.world.agents.reduce(function (n, q) { return n + (q.stats.rallied || 0); }, 0), animalsKilledByPeople: Object.keys(st.minds).reduce(function (n, id) { const q = M.agentById(w, +id); return n + (q ? q.stats.hunted : 0); }, 0), wars: T.war || 0 },
    made: Object.keys(T).filter(function (k) { return k.indexOf('made:') === 0; }).reduce(function (o, k) { o[k.slice(5)] = T[k]; return o; }, {}), mixesFelt: st.world.agents.reduce(function (n, q) { return n + (q.stats.mixed || 0); }, 0), treesStanding: (w.trees || []).reduce(function (n, v) { return n + v; }, 0), tilesCleared: (w.trees || []).filter(function (v, i) { return w.terrain[i] === 3 && v === 0; }).length,
    minds: { thoughts: st.total || st.used, circling: T2.length ? Math.round(100 * T2.filter(function (r) { return r.rut >= 2; }).length / T2.length) : 0 }
  };
};
function people(st, full) {
  const w = st.world;
  return w.agents.map(function (a) {
    const m = st.minds[a.id] || {}, par = (a.parents || []).map(function (id) { return st.names[id]; }).filter(Boolean), kids = w.agents.filter(function (o) { return o.parents && o.parents.indexOf(a.id) >= 0; }).map(function (o) { return o.name; });
    const rel = Object.keys(a.rel).sort(function (p, q) { return Math.abs(a.rel[q]) - Math.abs(a.rel[p]); }).slice(0, 3).map(function (id) { const tl = M.tiesOf(m, id), last = tl[tl.length - 1]; return (st.names[id] || '?') + ' ' + (a.rel[id] > 0 ? '+' : '') + a.rel[id].toFixed(1) + (full && last ? ' (' + clip(last.text, 60) + ')' : ''); });
    return '- ' + a.name + ' (' + SW.stage(w, a) + ', gen ' + a.gen + (par.length ? ', child of ' + par.join(' and ') : '') + (kids.length ? ', parent of ' + kids.join(', ') : '') + (a.leader != null ? ', follows ' + st.names[a.leader] : '') + (a.bandName ? ', leads "' + a.bandName + '"' : '') + ', of ' + ((w.peoples[a.people] || {}).name || 'no people') + ', in ' + ((w.regions[w.region[a.y * w.W + a.x]] || {}).name || 'the land') + ' at (' + a.x + ',' + a.y + ')' + (a.arrived != null ? ', a newcomer' : '') + '; knows ' + (Object.keys(a.knows).join(', ') || 'no ways') + '; energy ' + Math.round(a.e) + ', health ' + Math.round(a.hp) + ')' +
      (m.aim ? ' Aim: ' + clip(m.aim, 110) + '.' : '') + (m.feeling ? ' Feels: ' + clip(m.feeling, 90) + '.' : '') + (rel.length ? ' Bonds: ' + rel.join('; ') + '.' : '') + (full && m.tales && m.tales.length ? ' Tales: ' + m.tales.map(function (q) { return '"' + q.title + '"'; }).join(', ') + '.' : '');
  }).join('\n');
}

/* ---------- the chronicler ---------- */
K.tell = async function (st) {
  const w = st.world, S = st.story, d = w.laws.time.dayLength;
  if (K.busy || !st.sample) return null; K.busy = 'story'; st.used++;
  try {
    const since = st.chron.filter(function (c) { return c.tick > S.last && c.kind !== 'story' && c.kind !== 'maker'; }).slice(-140).map(function (c) { return 'day ' + (Math.floor(c.tick / d) + 1) + ' [' + c.kind + '] ' + c.text; });
    const vs = st.voices.filter(function (v) { return v.tick > S.last; }), step = Math.max(1, Math.ceil(vs.length / 28));
    const said = vs.filter(function (v, i) { return i % step === 0; }).map(function (v) { return 'day ' + (Math.floor(v.tick / d) + 1) + ' ' + v.name + ' to ' + v.to + ': "' + clip(v.text, 150) + '"'; });
    const th = st.rec ? st.rec.all.filter(function (r) { return r.t === 'thought' && r.tick > S.last && r.kind === 'deep'; }).slice(-12).map(function (r) { return 'day ' + r.day + ' ' + r.name + ' reflected: ' + clip(r.thought, 260); }) : [];
    const now = K.stats(st), last = S.chapters[S.chapters.length - 1];
    const prompt = 'You are the chronicler of a small simulated world called Evolu. Beings live there, each with a mind of its own. You stand outside it. From the record below, write the next chapter of its history, for a reader who wants to understand what is really going on: who these people are to one another, what they are making, what is changing, what is coming.\n' +
      'Rules: use only what the record shows; never invent an event, a motive or a quotation. Name people. Prefer what was done over what was said. Say plainly when nothing much happened. Plain prose, past tense, no headings inside the chapter, no flourish.\n\n' +
      (S.chapters.length ? 'CHAPTERS SO FAR: ' + S.chapters.map(function (c) { return c.n + '. "' + c.title + '" (days ' + c.day0 + '-' + c.day1 + ')'; }).join('; ') + '\nTHE LAST CHAPTER, for continuity:\n' + last.text + '\n\nTHREADS YOU WERE FOLLOWING:\n' + S.threads.map(function (t) { return '- ' + t.name + ' [' + t.kind + ']: ' + t.text; }).join('\n') + '\n\n' : 'This is the first chapter.\n\n') +
      'THIS CHAPTER COVERS day ' + (Math.floor(S.last / d) + 1) + ' to day ' + now.day + ' (' + now.season + ').\n\nWHAT HAPPENED (the world\'s own record):\n' + (since.join('\n') || '- nothing was recorded') +
      '\n\nSOME OF WHAT WAS SAID ALOUD:\n' + (said.join('\n') || '- nothing') + '\n\nSOME OF WHAT THEY THOUGHT WHEN THEY LOOKED BACK ON THEIR LIVES:\n' + (th.join('\n') || '- nothing') +
      '\n\nTHE PEOPLE NOW:\n' + people(st, true) + '\n\nTHE NUMBERS NOW: ' + JSON.stringify(now) + (S.stats ? '\nTHE NUMBERS AT THE LAST CHAPTER: ' + JSON.stringify(S.stats) : '') +
      '\n\nReply with ONLY one JSON object: {"title": "a short title for this chapter", "text": "the chapter, 180 to 320 words", "threads": [up to 8 running threads, each {"name": "short name", "kind": "family" or "band" or "rivalry" or "person" or "craft" or "belief" or "land", "text": "where this thread stands now, one or two sentences"}], "trends": [up to 6 short lines, each one thing that is rising, falling or missing, with a number where the numbers give one]}';
    const r = await ask(st, st.settings.story, prompt);
    const ch = { n: S.chapters.length + 1, day0: Math.floor(S.last / d) + 1, day1: now.day, title: clip(r.title || 'Untitled', 80), text: String(r.text || '').slice(0, 6000) };
    S.chapters.push(ch); if (S.chapters.length > 40) S.chapters.shift();
    S.threads = (Array.isArray(r.threads) ? r.threads : []).slice(0, 8).map(function (t) { return { name: clip(t && t.name, 40), kind: word(t && t.kind, 10) || 'thread', text: clip(t && t.text, 600) }; }).filter(function (t) { return t.name && t.text; });
    S.trends = (Array.isArray(r.trends) ? r.trends : []).slice(0, 6).map(function (t) { return clip(t, 320); }).filter(Boolean);
    S.stats = JSON.parse(JSON.stringify(now)); S.last = w.tick; S.lastDay = now.day; S.rev = (S.rev || 0) + 1;
    M.record(st, { t: 'story', n: ch.n, title: ch.title, text: ch.text, threads: S.threads, trends: S.trends, stats: now });
    st.ui({ type: 'story', chapter: ch });
    return ch;
  } catch (e) { S.lastDay = SW.day(w); K.error = 'The chronicler could not write (' + ((e && e.code) || (e && e.message) || 'failed') + ').'; M.record(st, { t: 'failed', name: 'chronicler', code: (e && e.code) || 'error', raw: e && e.text ? String(e.text).slice(0, 800) : '' }); return null; }
  finally { K.busy = ''; }
};

/* ---------- what the maker may do, each with its bounds ---------- */
const LAW_GROUPS = ['time', 'body', 'land', 'weather', 'mood', 'home', 'magic', 'fight', 'mate', 'build', 'craft', 'ecology', 'age', 'water', 'disease', 'drives', 'status', 'discovery', 'culture', 'arrivals', 'explore'];
const LAW_FIXED = { 'time.dayLength': 1, 'time.seasonDays': 1, 'ecology.maxPlantKinds': 1, 'ecology.maxCreatureKinds': 1 };
const TERRAINS = ['sand', 'grass', 'forest', 'rock', 'marsh', 'desert', 'snow'];
const STATS = ['bites', 'kills', 'gifts', 'planted', 'built', 'bred', 'stolen', 'trades', 'wood', 'marks', 'taught', 'hunted', 'healed', 'led', 'invented', 'crafted', 'fished', 'ore', 'clay', 'made', 'mixed', 'tamed', 'mined', 'seasons', 'raised', 'paved', 'milk', 'wool', 'ride', 'kids'];
K.OPS = 'Each change is one of these. Anything out of bounds is clipped or refused. Name every new animal and plant with a new word that sounds like an animal or a plant and cannot be mistaken for a material, a tool or any other kind of thing.\n' +
  '{"op":"law","group":one of ' + LAW_GROUPS.join('|') + ',"key":an existing number in that group,"value":number} — retunes a law; one step may move it to no less than half and no more than double what it is.\n' +
  '{"op":"plant","name":"a new one-word name","base":an existing plant to copy,"nutrition":-10..30,"maxFood":1..6,"hardy":0 or 1,"form":{"form":one of ' + SW.PLANT_PARTS.form.join('|') + ',"hue":0..360 for its fruit or flower} (optional; how it looks. Left out, its look is composed from its name, so every kind looks different),"soil":{terrain:0..1,...} over ' + TERRAINS.join('|') + ',"fx":[effects],"sow":5..40} — a new kind of plant or herb, sown across ground that suits it. Beings are told nothing; they find out by eating it.\n' +
  '{"op":"creature","name":"a new one-word name","base":an existing animal to copy,"set":{any numeric attribute of the base: new value, within 0.4x to 2.5x of the base\'s},"form":{"build":' + SW.BEAST_PARTS.build.join('|') + ',"head":' + SW.BEAST_PARTS.head.join('|') + ',"tail":' + SW.BEAST_PARTS.tail.join('|') + ',"pattern":' + SW.BEAST_PARTS.pattern.join('|') + ',"hue":0..360} (optional; how it looks, composed from these parts. Give it the look its nature suggests),"n":2..12} — a new kind of animal, arriving from the edge of the land.\n' +
  '{"op":"mix","name":"what you call it","of":[plantA, plantB],"within":20..240,"fx":[effects]} — what happens to a being that eats those two within that many moments of each other.\n' +
  '{"op":"site","name":"its name","kind":spirit|spring|grove|stone|ruin|lair,"on":a terrain, or "land":the name of a land or a kind of land, or "near":the name of a settlement or a being (it is placed three to six steps away), or "x","y" for an exact spot,"r":1..3,"cool":120..2400,"fx":[effects]} — a rare place of power somewhere on that terrain; whoever comes within r steps is touched by it, then not again for cool moments. Its fx may help or harm.\n' +
  '{"op":"way","id":"oneword","tree":craft|life|mind|society,"needs":[ids of existing ways],"era":1..6,"lore":0..25,"stat":one of ' + STATS.join('|') + ',"n":1..80,"has":{a mineral: 1..6} (optional: must be held),"spur":{a hardship: 0..1.5} (optional: which hardships bring it closer),"hint":"what it is, one sentence"} — a new way of knowledge that beings can sense and, with enough of that practice and lore, discover at a deep reflection.\n' +
  '{"op":"recipe","name":"what it is called","way":id of the way that unlocks it, or null for anyone,"needs":{"wood":0..6,"stone":0..6,"ore":0..4,"clay":0..4,"food":a plant name, or meat, or fish, or any (any carried food),"foodN":1..3,"thing":name,"thingN":1..3,"at":a kind of building the doer must be in or beside,"tool":a tool use (' + SW.TOOL_USES.join('|') + '; the doer must carry such a tool, and the work wears it),"fire":true,"water":true,"night":true,"on":terrain,"beings":0..4 others within two steps},"gives":{"thing":"name of a thing the maker then holds","n":1..3,"fx":[effects on the one who does it],"fxAll":[effects on everyone within two steps, which makes it a ceremony]},"hint":"one sentence a being reads about it"} — something that can be made or done. Things can be held, given and required by other recipes. Whenever something with fxAll is done, the doer and each one present also grow a little warmer toward each other (+0.1 each way), so ceremonies already build bonds.\n' +
  '{"op":"event","kind":"newcomers","n":2..5,"people":name of a people (optional; otherwise the one with fewest living)} — a small band comes into the land from beyond its edge, unrelated by blood to those already there. The world also does this by itself when the living fall below arrivals.floor. Use it when a people is too few or too closely related to have children.\n' +
  '{"op":"event","kind":"herd","creature":existing animal,"n":2..10} or {"op":"event","kind":"sow","plant":existing plant,"n":5..40,"near":a being (optional) or "x","y" (optional) or "land":name of a land (optional)} or {"op":"event","kind":one of ' + SW.DISASTERS.join('|') + ',"x","y" optional} or {"op":"event","kind":"weather","sky":' + SW.SKIES.join('|') + ',"days":0.25..3} (a calamity or a turn of the sky; calamities also come by themselves, rarely, at the rate of the law weather.disaster per day. Use one seldom, and only when the world has grown too easy).\n' +
  '{"op":"building","name":one new word,"wood":1..12,"stone":0..12,"fx":[effects on one who spends time in it, once a day],"bond":0..0.1 (how much closer those gathered in it grow),"sight":0..8 (extra sight from it),"craft":0..1.5 (how much longer tools made beside it last),"hint":"what the beings are told it is"}: a new KIND OF BUILDING the beings may then raise; recipes can require it with needs.at (a kiln, a mill, a smithy, a temple). A creature op may carry "gives":{"milk":true,"wool":true,"ride":true} for a grazing animal that yields these once tamed.\n' +
  '{"op":"good","name":"one word","carry":1..20,"float":0.2..3 (the cost of a step on deep water with it; lower is faster),"fight":1..2.5,"land":true (works only on land),"hint":"what it is"}: a made thing that helps while held: a vessel, a vehicle, a weapon of war. Give it a recipe ("gives":{"thing":its name}) so it can be made.\n' +
  '{"op":"mineral","name":"one word","deep":true|false,"hue":0..360,"biome":one of ' + Object.keys(SW.BIOMES).join('|') + ',"lodes":1..6,"hint":"what it is"}: a new thing in the ground, with deposits in that kind of land. {"op":"lode","mineral":existing,"biome":optional,"n":1..6} or with "x","y": more deposits of one that exists.\n' +
  '{"op":"music","mood":calm|bright|solemn|tense|strange|festive}: the mood of the music the owner hears.\n' +
  '{"op":"spur","way":id of an existing way,"spur":{a hardship: 0..1.5, up to four}} — which hardships sharpen beings toward that way. The hardships are: ' + Object.keys(SW.PRESSURES).join(', ') + '. A being pressed by them needs less understanding and less practice to come to the way (laws discovery.needBoost, discovery.kinBoost, discovery.floor). Ways are not found by chance: each needs the ways before it, understanding, and practice; need, having watched it done, and knowing neighbouring ways all lower what it takes.\n' +
  'A way may carry "era" and "has"; a building may carry "way" (the way that must be known to raise it) and "water":true (a well); a building whose wood and stone together exceed 14 is a GREAT WORK raised by many hands over many days.\n' +
  'The law group "status" sets what earns standing (wealth, deeds, knowledge, children, works, followers, giving, renown), how much shame costs, and "leadNeeds": the standing one must have before anyone will pledge to them.\n' +
  'The law group "drives" sets how loudly each inner drive speaks in every being (1 as written, 0 silent, at most double per step): this is your lever on what the beings want.\n' +
  'An effect is {"on":one of ' + SW.FX_NOW.join('|') + ',"by":number} (at once: energy -60..60, health -40..40, lore -1..1, feelings -1..1, sick 1 causes and -1 cures) or {"on":one of ' + SW.FX_BOON.join('|') + ',"times":0.4..2.5,"for":20..720} (a boon or burden that lasts; a day is 240 moments).';
K.applyOp = function (w, op) {
  const L = w.laws, kind = op && op.op;
  if (kind === 'law') {
    const g = String(op.group), k = String(op.key);
    if (LAW_GROUPS.indexOf(g) < 0 || !L[g] || typeof L[g][k] !== 'number' || LAW_FIXED[g + '.' + k]) return { ok: false, why: 'no such tunable law: ' + g + '.' + k };
    const cur = L[g][k], v = cur === 0 ? num(op.value, 0, 0.05, 0) : cur > 0 ? num(op.value, cur * 0.5, cur * 2, cur) : cur;
    if (v === cur) return { ok: false, why: g + '.' + k + ' unchanged' };
    L[g][k] = Math.round(v * 10000) / 10000;
    return { ok: true, text: 'law ' + g + '.' + k + ': ' + cur + ' → ' + L[g][k], undo: { op: 'law!', group: g, key: k, value: cur } };
  }
  if (kind === 'plant') {
    const name = word(op.name, 14).replace(/ /g, ''), base = L.plants[String(op.base)];
    if (!name || !base) return { ok: false, why: 'a plant needs a name and an existing base' }; if (L.plants[name]) return { ok: false, why: 'a plant called ' + name + ' already exists' }; if (Object.keys(L.plants).length >= 44) return { ok: false, why: 'there are already too many kinds of plant' };
    const d = JSON.parse(JSON.stringify(base)); ['heal', 'hurt', 'lore', 'joy', 'anger', 'calm', 'by', 'byName'].forEach(function (k) { delete d[k]; });
    d.from = String(op.base); d.maker = 1; d.nutrition = Math.round(num(op.nutrition, -10, 30, base.nutrition)); d.maxFood = Math.round(num(op.maxFood, 1, 6, base.maxFood)); if (op.hardy != null) d.hardy = op.hardy ? 1 : 0;
    if (op.soil && typeof op.soil === 'object') { const so = {}; TERRAINS.forEach(function (t) { if (op.soil[t] != null) so[t] = num(op.soil[t], 0, 1, 0); }); if (Object.keys(so).length) d.soil = so; }
    d.fx = SW.sanitizeFx(op.fx); d.look = SW.genPlant(name, op.form);
    L.plants[name] = d; const n = SW.sow(w, name, Math.round(num(op.sow, 5, 40, 14)));
    return { ok: true, text: 'new plant ' + name + ' (from ' + d.from + ', food ' + d.nutrition + (d.fx.length ? ', with effects' : '') + '), ' + n + ' sown', undo: { op: 'plant!', name: name } };
  }
  if (kind === 'creature') {
    const name = word(op.name, 14).replace(/ /g, ''), base = L.creatures[String(op.base)];
    if (!name || !base) return { ok: false, why: 'an animal needs a name and an existing base' }; if (L.creatures[name]) return { ok: false, why: 'an animal called ' + name + ' already exists' }; if (Object.keys(L.creatures).length >= 44) return { ok: false, why: 'there are already too many kinds of animal' };
    const d = JSON.parse(JSON.stringify(base)); d.from = String(op.base); d.root = base.root || String(op.base); d.maker = 1;
    for (const k in (op.set || {})) if (typeof base[k] === 'number' && base[k] > 0 && k !== 'predator') d[k] = Math.round(num(op.set[k], base[k] * 0.4, base[k] * 2.5, base[k]) * 1000) / 1000;
    if (!d.predator) ['milk', 'wool', 'ride'].forEach(function (k) { if (op.gives && op.gives[k] != null) { if (op.gives[k]) d[k] = 1; else delete d[k]; } });
    d.look = SW.genBeast(name, !!d.predator, op.form);
    L.creatures[name] = d; const n = SW.spawn(w, name, Math.round(num(op.n, 2, 12, 5)));
    return { ok: true, text: 'new animal ' + name + ' (from ' + d.from + '), ' + n + ' arrived', undo: { op: 'creature!', name: name } };
  }
  if (kind === 'building') {
    const name = word(op.name, 14).replace(/ /g, '').toLowerCase(); L.buildings = L.buildings || {};
    if (!name || ['shelter', 'wall', 'store', 'fire'].indexOf(name) >= 0 || L.buildings[name]) return { ok: false, why: 'a building kind needs a new name of its own' }; if (Object.keys(L.buildings).length >= 48) return { ok: false, why: 'there are already too many kinds of building' };
    const B = { wood: Math.round(num(op.wood, 0, 40, 4)), stone: Math.round(num(op.stone, 0, 80, 2)), fx: SW.sanitizeFx(op.fx), hint: clip(op.hint, 160), maker: 1 };
    if (op.way && L.tree[String(op.way)]) B.way = String(op.way); if (op.water) B.water = 1;
    if (op.bond != null) B.bond = num(op.bond, 0, 0.1, 0.03); if (op.sight != null) B.sight = Math.round(num(op.sight, 0, 8, 3)); if (op.craft != null) B.craft = num(op.craft, 0, 1.5, 0.5);
    L.buildings[name] = B; return { ok: true, text: 'new kind of building: ' + name + ' (' + B.wood + ' wood, ' + B.stone + ' stone)', undo: { op: 'building!', name: name } };
  }
  if (kind === 'good') {
    const name = word(op.name, 16).toLowerCase(); L.goods = L.goods || {};
    if (!name || L.goods[name]) return { ok: false, why: 'a made thing of use needs a new name' }; if (Object.keys(L.goods).length >= 40) return { ok: false, why: 'there are already too many such things' };
    const G = { hint: clip(op.hint, 140), maker: 1 }; if (op.carry != null) G.carry = Math.round(num(op.carry, 1, 20, 2)); if (op.float != null) G.float = num(op.float, 0.2, 3, 1); if (op.fight != null) G.fight = num(op.fight, 1, 2.5, 1.2); if (op.land) G.land = 1;
    if (G.carry == null && G.float == null && G.fight == null) return { ok: false, why: 'it must carry, float or fight' };
    L.goods[name] = G; return { ok: true, text: 'new useful thing: ' + name + (G.float ? ' (crosses water)' : '') + (G.carry ? ' (carries ' + G.carry + ' more)' : '') + (G.fight ? ' (blows x' + G.fight + ')' : '') + '. It needs a recipe that gives it.', undo: { op: 'good!', name: name } };
  }
  if (kind === 'good!') { if (L.goods) delete L.goods[op.name]; return { ok: true, text: 'thing "' + op.name + '" removed' }; }
  if (kind === 'mineral') {
    const name = word(op.name, 14).replace(/ /g, '').toLowerCase(); if (!name || L.minerals[name] || Object.keys(L.minerals).length >= 30) return { ok: false, why: 'a mineral needs a new name' };
    L.minerals[name] = { deep: op.deep ? 1 : 0, hue: Math.round(num(op.hue, 0, 360, 200)), hint: clip(op.hint, 120), maker: 1 };
    const r0 = K.applyOp(w, { op: 'lode', mineral: name, biome: op.biome, n: op.lodes || 3 }); return { ok: true, text: 'new mineral ' + name + (op.deep ? ' (deep)' : '') + '; ' + (r0.ok ? r0.text : 'no deposits placed'), undo: { op: 'mineral!', name: name } };
  }
  if (kind === 'mineral!') { delete L.minerals[op.name]; for (const i in w.lodes) if (w.lodes[i].k === op.name) delete w.lodes[i]; return { ok: true, text: 'mineral "' + op.name + '" removed' }; }
  if (kind === 'lode') {
    const k = String(op.mineral); if (!L.minerals[k]) return { ok: false, why: 'no such mineral: ' + k }; const want = Math.round(num(op.n, 1, 6, 2)); let made = 0; const at = [];
    if (op.x != null && op.y != null) { const i = SW.idx(w, Math.round(num(op.x, 0, w.W - 1, 0)), Math.round(num(op.y, 0, w.H - 1, 0))); if (w.terrain[i] !== 0 && w.terrain[i] !== 5) { w.lodes[i] = { k: k, n: 10 + Math.floor(Math.random() * 10) }; made = 1; at.push(i); } }
    else for (let t = 0; t < 2000 && made < want; t++) { const i = Math.floor(Math.random() * w.W * w.H), tt = w.terrain[i]; if (tt === 0 || tt === 5 || w.lodes[i] || w.shelters[i]) continue; if (op.biome && w.regions.length > 1 && w.regions[w.region[i]].biome !== String(op.biome)) continue; if (L.minerals[k].deep && tt !== 4 && t < 1400) continue; w.lodes[i] = { k: k, n: 10 + Math.floor(Math.random() * 12) }; made++; at.push(i); }
    return made ? { ok: true, text: made + ' deposit' + (made > 1 ? 's' : '') + ' of ' + k + (op.biome ? ' in ' + op.biome + ' country' : ''), undo: { op: 'lode!', at: at } } : { ok: false, why: 'no ground found for it' };
  }
  if (kind === 'lode!') { (op.at || []).forEach(function (i) { delete w.lodes[i]; }); return { ok: true, text: 'deposits removed' }; }
  if (kind === 'music') { const m = ['calm', 'bright', 'solemn', 'tense', 'strange', 'festive'].indexOf(String(op.mood)); if (m < 0) return { ok: false, why: 'no such mood' }; const was = w.musicMood || 'calm'; w.musicMood = String(op.mood); return { ok: true, text: 'the music of the world turned ' + op.mood, undo: { op: 'music', mood: was } }; }
  if (kind === 'building!') { if (L.buildings) delete L.buildings[op.name]; return { ok: true, text: 'building kind "' + op.name + '" removed' }; }
  if (kind === 'mix') {
    const of = Array.isArray(op.of) ? op.of.map(String) : [], fx = SW.sanitizeFx(op.fx), name = clip(op.name, 40); L.mixes = L.mixes || [];
    if (of.length !== 2 || of[0] === of[1] || !L.plants[of[0]] || !L.plants[of[1]] || !fx.length || L.mixes.length >= 24) return { ok: false, why: 'a mix needs two different existing plants and at least one effect' };
    L.mixes.push({ name: name, of: of, within: Math.round(num(op.within, 20, 240, 60)), fx: fx });
    return { ok: true, text: 'mix "' + name + '": ' + of.join(' + '), undo: { op: 'mix!', name: name } };
  }
  if (kind === 'site') {
    const on = TERRAINS.indexOf(String(op.on)), fx = SW.sanitizeFx(op.fx); w.sites = w.sites || [];
    if (w.sites.length >= 18) { const old = w.sites.filter(function (q) { return q.maker && !(q.found && q.found.length) && !q.visits; })[0]; if (old) w.sites.splice(w.sites.indexOf(old), 1); } /* a place no one ever found gives way to a new one */
    if (!fx.length || w.sites.length >= 18) return { ok: false, why: 'a site needs an effect, and there can be at most 18' };
    let at = null; if (op.x != null && op.y != null) { const px = Math.round(num(op.x, 0, w.W - 1, 0)), py = Math.round(num(op.y, 0, w.H - 1, 0)), pi = py * w.W + px; if (w.terrain[pi] !== 0 && !w.shelters[pi] && !w.walls[pi]) at = pi; }
    if (at == null && op.near) { const stl = (w.settlements || []).filter(function (z) { return String(z.name).toLowerCase() === String(op.near).toLowerCase(); })[0] || null, who = stl ? null : SW.findAgentByName(w, String(op.near)), cx = stl ? stl.x : who ? who.x : null, cy = stl ? stl.y : who ? who.y : null; if (cx != null) for (let t = 0; t < 200 && at == null; t++) { const x = cx + Math.floor(SW.rnd(w) * 13) - 6, y = cy + Math.floor(SW.rnd(w) * 13) - 6; if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue; const i = y * w.W + x, d = Math.max(Math.abs(x - cx), Math.abs(y - cy)); if (d >= 3 && w.terrain[i] !== 0 && w.terrain[i] !== 5 && !w.shelters[i] && !w.walls[i]) at = i; } }
    if (at == null && op.land && w.regions.length > 1) { const R = w.regions.filter(function (z) { return z.name.toLowerCase() === String(op.land).toLowerCase() || z.biome === String(op.land).toLowerCase(); })[0]; if (R) for (let t = 0; t < 600 && at == null; t++) { const i = Math.floor(SW.rnd(w) * w.W * w.H); if (w.region[i] === R.id && w.terrain[i] !== 0 && w.terrain[i] !== 5 && !w.shelters[i] && !w.walls[i]) at = i; } }
    for (let t = 0; t < 400 && at == null; t++) { const i = Math.floor(SW.rnd(w) * w.W * w.H); if (SW.TERRAIN[w.terrain[i]] === (on < 0 ? 'forest' : TERRAINS[on]) && !w.shelters[i] && !w.walls[i]) at = i; }
    if (at == null) return { ok: false, why: 'no such ground' };
    const q = { id: w.nextId++, name: clip(op.name, 40) || 'a strange place', kind: ['spirit', 'spring', 'grove', 'stone', 'ruin', 'lair'].indexOf(String(op.kind)) >= 0 ? String(op.kind) : 'place', x: at % w.W, y: Math.floor(at / w.W), r: Math.round(num(op.r, 1, 3, 1)), cool: Math.round(num(op.cool, 120, 2400, 480)), fx: fx, born: w.tick };
    w.sites.push(q);
    return { ok: true, text: q.kind + ' "' + q.name + '" at (' + q.x + ',' + q.y + ')', undo: { op: 'site!', id: q.id } };
  }
  if (kind === 'spur') { /* which hardships sharpen beings toward an existing way */
    const id = String(op.way || op.id || ''), n = L.tree[id]; if (!n || !op.spur || typeof op.spur !== 'object') return { ok: false, why: 'no such way, or no spur given' };
    const before = n.spur ? JSON.parse(JSON.stringify(n.spur)) : null, sp = {}; Object.keys(op.spur).slice(0, 4).forEach(function (k) { if (SW.PRESSURES[k]) sp[k] = num(op.spur[k], 0, 1.5, 0.5); });
    if (!Object.keys(sp).length) return { ok: false, why: 'spur must name hardships among: ' + Object.keys(SW.PRESSURES).join(', ') };
    n.spur = sp; return { ok: true, text: 'the way of ' + id + ' is now sharpened by ' + Object.keys(sp).map(function (k) { return k + ' x' + sp[k]; }).join(', '), undo: { op: 'spur!', id: id, spur: before } };
  }
  if (kind === 'spur!') { const n = L.tree[op.id]; if (n) { if (op.spur) n.spur = op.spur; else delete n.spur; } return { ok: true, text: 'spur restored' }; }
  if (kind === 'way') {
    const id = word(op.id, 14).replace(/ /g, ''), needs = (Array.isArray(op.needs) ? op.needs : []).map(String).filter(function (k) { return L.tree[k]; }).slice(0, 3);
    if (!id || L.tree[id] || STATS.indexOf(String(op.stat)) < 0 || Object.keys(L.tree).length >= 90) return { ok: false, why: 'bad way id or practice, or too many ways' };
    L.tree[id] = { tree: ['craft', 'life', 'mind', 'society'].indexOf(String(op.tree)) >= 0 ? String(op.tree) : 'craft', era: Math.round(num(op.era, 1, 6, 1 + Math.max.apply(null, needs.map(function (k) { return (L.tree[k].era || 1) - 1; }).concat([0])))), needs: needs, lore: num(op.lore, 0, 25, 1), stat: String(op.stat), n: Math.round(num(op.n, 1, 80, 4)), hint: clip(op.hint, 170), maker: 1 };
    if (op.spur && typeof op.spur === 'object') { const sp = {}; Object.keys(op.spur).slice(0, 4).forEach(function (k) { if (SW.PRESSURES[k]) sp[k] = num(op.spur[k], 0, 1.5, 0.5); }); if (Object.keys(sp).length) L.tree[id].spur = sp; }
    if (op.has && typeof op.has === 'object') { const has = {}; Object.keys(op.has).slice(0, 2).forEach(function (k) { if (L.minerals[k] || k === 'wool') has[k] = Math.round(num(op.has[k], 1, 6, 1)); }); if (Object.keys(has).length) L.tree[id].has = has; }
    return { ok: true, text: 'new way ' + id + ' (after ' + (needs.join(', ') || 'nothing') + '; ' + L.tree[id].stat + ' x' + L.tree[id].n + ')', undo: { op: 'way!', id: id } };
  }
  if (kind === 'recipe') {
    const name = word(op.name, 24); L.recipes = L.recipes || {};
    if (!name) return { ok: false, why: 'a recipe needs a name' }; if (L.recipes[name]) return { ok: false, why: 'something called "' + name + '" can already be made' }; if (op.way && !L.tree[String(op.way)]) return { ok: false, why: 'no such way: ' + op.way }; if (Object.keys(L.recipes).length >= 90) return { ok: false, why: 'there are already too many recipes' };
    const N = op.needs || {}, G = op.gives || {}, needs = {}, gives = {};
    ['wood', 'stone'].forEach(function (k) { const v = Math.round(num(N[k], 0, 6, 0)); if (v) needs[k] = v; }); ['ore', 'clay'].forEach(function (k) { const v = Math.round(num(N[k], 0, 4, 0)); if (v) needs[k] = v; });
    if (N.food && (L.plants[String(N.food)] || N.food === 'meat' || N.food === 'fish' || N.food === 'any')) { needs.food = String(N.food); needs.foodN = Math.round(num(N.foodN, 1, 3, 1)); }
    if (N.thing) { needs.thing = word(N.thing, 24); needs.thingN = Math.round(num(N.thingN, 1, 3, 1)); }
    ['fire', 'water', 'night'].forEach(function (k) { if (N[k]) needs[k] = true; }); if (SW.TOOL_USES.indexOf(String(N.tool)) >= 0) needs.tool = String(N.tool); if (N.at && L.buildings && L.buildings[String(N.at)]) needs.at = String(N.at); if (TERRAINS.indexOf(String(N.on)) >= 0) needs.on = String(N.on); { const b = Math.round(num(N.beings, 0, 4, 0)); if (b) needs.beings = b; }
    if (G.thing) { gives.thing = word(G.thing, 24); gives.n = Math.round(num(G.n, 1, 3, 1)); } { const f = SW.sanitizeFx(G.fx), fa = SW.sanitizeFx(G.fxAll); if (f.length) gives.fx = f; if (fa.length) gives.fxAll = fa; }
    if (!gives.thing && !gives.fx && !gives.fxAll) return { ok: false, why: 'a recipe must give a thing or have an effect' };
    L.recipes[name] = { way: op.way ? String(op.way) : null, needs: needs, gives: gives, hint: clip(op.hint, 170), maker: 1 };
    return { ok: true, text: 'recipe "' + name + '"' + (op.way ? ' (unlocked by ' + op.way + ')' : ''), undo: { op: 'recipe!', name: name } };
  }
  if (kind === 'event') {
    if (op.kind === 'newcomers') { const P = (w.peoples || []).filter(function (q) { return q.name === String(op.people) || q.name === 'the ' + String(op.people); })[0] || null, made = SW.arrive(w, Math.round(num(op.n, 2, 5, 3)), P); return made.length ? { ok: true, text: made.length + ' newcomers' + (P ? ' of ' + P.name : '') + ' came into the land: ' + made.map(function (a) { return a.name; }).join(', ') } : { ok: false, why: 'no room for newcomers' }; }
    if (op.kind === 'herd' && L.creatures[String(op.creature)]) { const n = SW.spawn(w, String(op.creature), Math.round(num(op.n, 2, 10, 5))); return { ok: true, text: n + ' ' + op.creature + ' came in from the edge', undo: null }; }
    if (op.kind === 'sow' && L.plants[String(op.plant)]) { let at = null; const who = op.near ? SW.findAgentByName(w, String(op.near)) : null, R = op.land ? (w.regions || []).filter(function (q) { return q.name === String(op.land); })[0] : null; if (who) at = { x: who.x, y: who.y, r: 6 }; else if (op.x != null && op.y != null) at = { x: Math.round(num(op.x, 0, w.W - 1, 0)), y: Math.round(num(op.y, 0, w.H - 1, 0)), r: 6 }; else if (R) at = { x: Math.round(R.x), y: Math.round(R.y), r: 14 };
      const n = SW.sow(w, String(op.plant), Math.round(num(op.n, 5, 40, 12)), at); return { ok: true, text: n + ' ' + op.plant + ' sown', undo: null }; }
    if (SW.DISASTERS.indexOf(String(op.kind)) >= 0) { const r = SW.disaster(w, String(op.kind), K.emit || function () {}, op.x != null ? Math.round(num(op.x, 0, w.W - 1, 0)) : null, op.y != null ? Math.round(num(op.y, 0, w.H - 1, 0)) : null); return { ok: true, text: 'a ' + r.kind + ' at (' + r.x + ',' + r.y + ')', undo: null }; }
    if (op.kind === 'weather' && SW.SKIES.indexOf(String(op.sky)) >= 0) { w.weather = { kind: String(op.sky), until: w.tick + Math.round(num(op.days, 0.25, 3, 1) * w.laws.time.dayLength) }; return { ok: true, text: 'the sky turned to ' + op.sky, undo: null }; }
    return { ok: false, why: 'unknown event' };
  }
  /* undoing */
  if (kind === 'law!') { L[op.group][op.key] = op.value; return { ok: true, text: 'law ' + op.group + '.' + op.key + ' put back to ' + op.value }; }
  if (kind === 'plant!') { const d = L.plants[op.name]; if (d) { d.seedRate = 0; d.regrow = 0; d.retired = 1; } return { ok: true, text: 'plant ' + op.name + ' will die out' }; }
  if (kind === 'creature!') { const d = L.creatures[op.name]; if (d) { d.breedChance = 0; d.migrate = 0; d.minPop = 0; d.retired = 1; } return { ok: true, text: 'animal ' + op.name + ' will die out' }; }
  if (kind === 'mix!') { L.mixes = (L.mixes || []).filter(function (m) { return m.name !== op.name; }); return { ok: true, text: 'mix "' + op.name + '" removed' }; }
  if (kind === 'site!') { w.sites = (w.sites || []).filter(function (q) { return q.id !== op.id; }); return { ok: true, text: 'site removed' }; }
  if (kind === 'way!') { if (!w.agents.some(function (a) { return a.knows[op.id]; })) delete L.tree[op.id]; return { ok: true, text: 'way ' + op.id + ' closed' }; }
  if (kind === 'recipe!') { if (L.recipes) delete L.recipes[op.name]; return { ok: true, text: 'recipe "' + op.name + '" removed' }; }
  return { ok: false, why: 'unknown kind of change: ' + kind };
};
/* a change is first lived through on a copy of the world, beside an untouched copy */
K.trial = function (w, ops, ticks) {
  ticks = ticks || 360;
  try {
    const A = SW.clone(w), B = SW.clone(w), noop = function () {}, done = [];
    ops.forEach(function (op) { const r = K.applyOp(B, op); done.push(r); });
    if (!done.some(function (r) { return r.ok; })) return { ok: false, why: done.map(function (r) { return r.why; }).join('; ') };
    for (let i = 0; i < ticks; i++) { SW.step(A, noop); SW.step(B, noop); }
    const a0 = A.agents.length, a1 = B.agents.length, c0 = A.creatures.length, c1 = B.creatures.length;
    if (a1 < a0 - Math.max(1, Math.floor(a0 * 0.25))) return { ok: false, why: 'in the trial, ' + (a0 - a1) + ' more beings died than without the change' };
    if (c0 > 8 && c1 < c0 * 0.4) return { ok: false, why: 'in the trial, the animals collapsed (' + c1 + ' against ' + c0 + ')' };
    return { ok: true, alive: [a0, a1], creatures: [c0, c1] };
  } catch (e) { return { ok: false, why: 'the trial world broke: ' + ((e && e.message) || e) }; }
};

/* ---------- the maker ---------- */
K.SEED = [
  '[NOW: built, to be watched and tuned] standing: earned by wealth, deeds, knowledge, children, works, followers, giving and renown, lost through shame; needed before anyone will follow; special things add to it',
  '[NOW] songs, poems and tales about people and about how the world came to be: kept, told aloud, changing a little in each mouth; bards who carry them',
  '[NOW] a community learning from what befalls its own: a death and how it came, a sickness and its cause, a thing that worked',
  '[NOW] everything that is used wears and regrows by what is around it: pasture, forest, deposits; great deposits that last',
  '[NOW] bridges; weapons for one hand and for a siege (bow, shield, armour, ram, catapult, guns); defence',
  '[NOW] the old workings of the world weakening as the ages of knowledge advance',
  '[NOW] the known world ends in mist and can be pushed back: one who stands at the edge can venture in, and a wide strip of new land may open, continuing the rivers, shores and kinds of ground it joins, with rich deposits and a herd; a band has three tries and then must wait, and once any strip has opened the mist parts for no one for a day, so that the known world grows slowly (laws explore.*, among them gapDays)',
  '[NOW] the world is a globe: east joins west, and it ends at two poles of ice that are different countries (white bears, wolves, caribou and mammoths in the north; penguins, seals and stormbirds in the south; whales and orcas in both seas). Between them lie three climates: the ice, cold all year; the lands with seasons; and a warm belt of rainforest and desert with no winter. Each kind of country has its own plants, animals and people, and both people and animals are drawn back to their own (law drives.homeland)',
  '[NOW] the dog, easily won with food, which stands with its keeper in the hunt and draws a sled over snow; the igloo, raised on snow from nothing; the canoe and the kayak',
  '[NEXT] rain and flood as the weather of the warm belt; a day that goes round the world',
  '[NOW] women and men: a child comes of one of each; twins are a girl and a boy; children come sooner when both parents are well fed and well (mate.plentyCooldown); a grown body can swim narrow water; plants grow faster in spring, rain and at harvest; animals breed by season and by their numbers, and herds return from the rim when few (ecology.grazerTarget, ecology.herdReturn); deposits refill slowly (ecology.lodeRegrow)',
  '[NOW] peoples that last: newcomers who come into the land when the living are few (law arrivals.*, event newcomers), twins (mate.twinChance), longer lives, a milder lean season; what the dead built stands empty and can be claimed by anyone, to begin a home or add to a band\'s; elders moved to hand on what only they know',
  '[NOW] necessity as the mother of invention: what beings suffer (hunger, the lean season, cold, thirst, sickness, beasts, deaths, water they cannot cross, strife, storm, strange speech) sharpens them toward the ways that answer it; knowing neighbouring ways helps; you can set which hardships spur which way (op spur) and how strongly need counts (laws discovery.*)',
  '[NOW] culture as something that can be read and followed: every tale, song, poem, myth, teaching, saying, lesson and way is an idea with an origin, holders and a path of spread; teachings that can be begun, heard, taken up and given up; talismans and carved figures; your statistics show which ideas are held most and which have crossed between peoples',
  '[NEXT] objects of culture with real benefits and trade value beyond the first talismans and carvings: special gems, named relics that gather a history; secret manuscripts holding spells, knowledge or cures',
  '[NEXT] religious figures, sages with followers, cults, schools of thought and religions that form and compete, some of the light and some of the dark; benefits, secrets, abilities and costs for those who belong, in some cases sacrifice; shrines, temples and churches that members pay toward',
  '[NEXT] tribute and taxes for the common good: stores, works, defence; guilds and secret societies that give benefit and take dues',
  '[NEXT] schools for children and the young, later universities: skills learned faster than alone',
  '[NEXT] trade between lands and across water; ports; colonies as a named act; diplomats, spies, saboteurs; alliances open and secret',
  '[NEXT] kinds of rule: councils and votes, shared holding, private holding, rule by the armed',
  '[NOW] what is not forgotten: a blow or a theft that is seen leaves a grudge that holds a bond down until three gifts mend it or long time passes; a gift in need leaves a kindness that holds it up (laws culture.grudgeDays, kindDays, mendGifts); hunting together (fight.packBonus) and skill that grows with each hunt; telling by a fire, which makes tales; a roof that brings children sooner (mate.roofCooldown)',
  '[NEXT] grudges from defeat or a stolen mate; compensation greater than gifts; peacemakers and peace ceremonies; hard feelings rarer inside a family or band than across them, and arising from conflict, wealth, history or charisma',
  '[NEXT] rivalry for mates; heroes whose deeds spread as lore, to whom tribute is paid and whom the ambitious challenge; duels in which the winner takes most of what the loser holds',
  '[NEXT] fighting, hunting and defending together as learned skills; calling for help and answering it',
  '[NEXT] talents: skill in a way drawing one on along its line; learning what a way demands through dreams, visions from herbs or a shaman\'s prophecy, and quests to gather what it needs',
  '[NEXT] bandits in new lands; stranger settlements friendly or hostile, with things to trade; farms and flocks as a settlement\'s steady food',
  '[LATER] monsters that wander in rarely and can be killed only by a band together; their capture, taming and breeding from guarded eggs that others will try to steal',
  '[NEXT] later callings that come with standing and ways: alchemists, scholars, scientists',
  '[LATER: ages three and four] siege warfare and defensive works; weapons of war that are carried to a siege',
  '[LATER] what is built must be kept up or it decays; taking down old buildings to raise new ones; concrete and metal as building stuffs carried from where they are won',
  '[LATER] crowding brings troubles; religion, care for the poor, clean water, public works, places for play, music, dance and art, and the handling of waste ease them; places of buying and selling; healers, pharmacies, hospitals',
  '[LATER] places of invention that quicken discovery; revolutions in knowledge that give great advantage to those who take them up, while others hold out or follow',
  '[LATER] the sciences as knowledge in their own right, in generations: biology, chemistry, physics, then the second and third of each',
  '[FAR: ages five and six] sources of power in order: coal, oil and gas, falling water, wind, the atom, the sun, fusion, the ground of things; each needing what must be found: oil fields, uranium, copper, silicon, rare earths, carbon, diamond',
  '[FAR] speech at a distance in order: marks, smoke, birds, radio, telephone, the joined machines, the machine in the hand; reckoning machines need factories to make them',
  '[FAR] machines that fly: balloons, propellers, jets, for carrying and for war; land vehicles for war',
  '[FAR] the buildings of a great city: dwellings for many, high towers, offices, halls of rule, guards and fire-watch, water and power works and the lines that carry power, barracks and camps of war, markets, harbours, airfields, stations, factories, plants that remake waste',
  '[FAR] new materials far down the tree: plastics, silicon, rare earths',
  '[FAR] the knowledge of what makes a body: changing animals and oneself',
  '[FAR] weapons beyond guns',
  '[LAST] a spaceport: ships that come and go, goods and strange devices from other worlds, visitors who need their own air and live beside the port; their devices do what nothing else does (power, food, healing, terrible weapons, things not understood) and are worth much for being rare',
  'tribal bonds and family bonds, and the pull between them; mating within a people versus between peoples',
  'more kinds of animals at several levels of predator and prey; riding and working animals',
  'many herbs and plants that heal, harm, change attributes or behaviour; plants that open the mind',
  'spirits of places, good and ill, rarely found; mythical animals, monsters and places that help or harm',
  'shamans who heal or affect crops, weather, animals and people; celebrations and ceremonies; crime and punishment; secret knowledge and shared knowledge',
  'professions and castes; salt, caves, mills and kilns; sieges; promises and debts; rituals with force',
  'a world rich to look at and to hear, that changes as it ages'
];
/* What the makers of earlier worlds added and kept, and what they learned. A new world begins with these already in it.
   This list is curated from real runs; each world also hands its own kept changes to the next one started in the same browser. */
K.HERITAGE = {
  ops: [
    { op: 'mix', name: 'clearsight', of: ['dreamcap', 'sunleaf'], within: 120, fx: [{ on: 'lore', by: 0.5 }, { on: 'joy', by: 0.2 }, { on: 'health', by: 4 }] },
    { op: 'recipe', name: 'firecircle', way: null, needs: { wood: 1, fire: true, beings: 2 }, gives: { thing: 'ember', n: 1, fx: [{ on: 'lore', by: 0.1 }], fxAll: [{ on: 'joy', by: 0.2 }, { on: 'lonely', by: -0.3 }] }, hint: 'Feed a fire with others gathered close, and share its warmth and talk.' },
    { op: 'site', name: 'Warmwell', kind: 'spring', on: 'marsh', r: 2, cool: 480, fx: [{ on: 'health', by: 10 }, { on: 'warmth', times: 1.3, for: 240 }] },
    { op: 'recipe', name: 'hidewrap', way: 'tools', needs: { food: 'meat', foodN: 2 }, gives: { thing: 'hidewrap', n: 1, fx: [{ on: 'warmth', times: 1.6, for: 720 }] }, hint: 'The hides of two kills, scraped with a tool and wrapped about the body, keep the cold out for days.' },
    { op: 'recipe', name: 'cairn', way: null, needs: { stone: 3, beings: 1 }, gives: { thing: 'cairnstone', n: 1, fxAll: [{ on: 'grief', by: -0.3 }, { on: 'lonely', by: -0.2 }, { on: 'joy', by: 0.1 }] }, hint: 'Stones piled together for one who is gone, with another standing beside you, ease grief and bind the living.' },
    { op: 'recipe', name: 'feast', way: null, needs: { food: 'any', foodN: 2, fire: true, beings: 1 }, gives: { fx: [{ on: 'joy', by: 0.3 }], fxAll: [{ on: 'joy', by: 0.3 }, { on: 'lonely', by: -0.3 }, { on: 'warmth', times: 1.2, for: 240 }] }, hint: 'Share food beside a fire with another, and all who sit near are gladdened and warmed for a day.' },
    { op: 'site', name: 'Old Stone', kind: 'stone', on: 'rock', r: 2, cool: 1200, fx: [{ on: 'lore', by: 0.5 }, { on: 'fear', by: 0.2 }] },
    { op: 'creature', name: 'elk', base: 'hornback', set: { tough: 1.5, gore: 9, meat: 5, speed: 0.5, breedChance: 0.0022 }, form: { build: 'tall', head: 'antlers', tail: 'stub', pattern: 'belly', hue: 28 }, n: 8 },
    { op: 'recipe', name: 'roast', way: 'fire', needs: { food: 'meat', foodN: 2, fire: true, beings: 1 }, gives: { fxAll: [{ on: 'joy', by: 0.3 }, { on: 'lonely', by: -0.3 }, { on: 'energy', by: 12 }] }, hint: 'Roast two portions of meat over a fire and share it with whoever stands near; all who eat are fed and warmed toward one another.' },
    { op: 'law', group: 'fight', key: 'noticeChance', value: 0.9 },
    { op: 'plant', name: 'gorsemint', base: 'sunleaf', nutrition: 4, maxFood: 3, hardy: 1, form: { form: 'flower', hue: 30 }, soil: { grass: 0.6, forest: 0.4 }, fx: [{ on: 'warmth', times: 1.6, for: 480 }, { on: 'appetite', times: 1.3, for: 480 }], sow: 30 },
    { op: 'recipe', name: 'sharing', way: null, needs: { food: 'any', foodN: 2, beings: 1 }, gives: { fxAll: [{ on: 'energy', by: 8 }, { on: 'joy', by: 0.15 }] }, hint: 'Lay out two foods for whoever stands beside you, and all eat together.' },
    { op: 'recipe', name: 'watchfire', way: 'fire', needs: { wood: 2, fire: true, beings: 1 }, gives: { fxAll: [{ on: 'fear', by: -0.3 }, { on: 'warmth', times: 1.3, for: 240 }] }, hint: 'Feed your fire high with two wood while others sit close, and everyone beside it feels warmer and braver against the dark.' },
    { op: 'recipe', name: 'ironward', way: 'smelting', needs: { ore: 1, fire: true }, gives: { thing: 'ironward', n: 1, fx: [{ on: 'toughness', times: 1.3, for: 480 }, { on: 'fear', by: -0.15 }] }, hint: 'Beat smelted metal in a fire into a ward that can be worn or given; its bearer stands harder against teeth and claws.' },
    { op: 'law', group: 'drives', key: 'belonging', value: 1.5 }, { op: 'law', group: 'drives', key: 'curiosity', value: 1.4 }, { op: 'law', group: 'drives', key: 'compassion', value: 1.4 }, { op: 'law', group: 'drives', key: 'hunger', value: 1.3 }, { op: 'law', group: 'body', key: 'sight', value: 11 }, { op: 'law', group: 'mate', key: 'minEnergy', value: 68 },
    { op: 'recipe', name: 'amberknot', way: null, needs: { thing: 'amber', thingN: 1, beings: 1 }, gives: { thing: 'amberknot', n: 1, fxAll: [{ on: 'joy', by: 0.15 }, { on: 'lonely', by: -0.15 }] }, hint: 'Bind a piece of amber on a cord while another stands beside you; it is a small bright thing to keep, or to give.' },
    { op: 'site', name: 'Reedmother', kind: 'grove', on: 'marsh', r: 3, cool: 960, fx: [{ on: 'lore', by: 0.4 }, { on: 'joy', by: 0.2 }, { on: 'fear', by: -0.1 }] },
    { op: 'creature', name: 'nibbet', base: 'hopper', set: { breedChance: 0.004, speed: 0.75, meat: 2 }, form: { build: 'small', head: 'longears', tail: 'stub', pattern: 'belly', hue: 32 }, n: 14 },
    { op: 'creature', name: 'yarrok', base: 'hornback', set: { gore: 6, tough: 2, meat: 4, breedChance: 0.002 }, form: { build: 'stocky', head: 'curved', tail: 'stub', pattern: 'none', hue: 40 }, gives: { wool: true }, n: 10 },
    { op: 'recipe', name: 'bead', way: 'pottery', needs: { clay: 1, fire: true }, gives: { thing: 'bead', n: 2, fx: [{ on: 'joy', by: 0.1 }] }, hint: 'Shape a little clay and harden it in the fire into small bright beads that can be worn, kept or given.' },
    /* kept by the maker of the seventh and eighth runs (one world, days 1 to 41) */
    {"op": "recipe", "name": "fangcharm", "way": "tools", "needs": {"food": "meat", "foodN": 1, "tool": "hunt"}, "gives": {"thing": "fangcharm", "n": 1, "fx": [{"on": "joy", "by": 0.1}]}, "hint": "From a kill, string a fang into a charm you can keep or give away."},
    {"op": "building", "name": "longhall", "wood": 6, "stone": 4, "fx": [{"on": "joy", "by": 0.1}, {"on": "warmth", "times": 1.3, "for": 240}], "bond": 0.05, "sight": 0, "craft": 0, "hint": "A great roofed hall of wood and stone where many can gather, rest warm through the cold, and grow close to one another."},
    {"op": "recipe", "name": "hallwelcome", "way": null, "needs": {"food": "any", "foodN": 2, "at": "longhall", "beings": 1}, "gives": {"fxAll": [{"on": "fear", "by": -0.2}, {"on": "lonely", "by": -0.2}, {"on": "joy", "by": 0.15}]}, "hint": "Share food with a guest under a hall's roof; beneath it, fear and loneliness ease for all who sit together."},
    {"op": "law", "group": "drives", "key": "family", "value": 1.5},
    {"op": "law", "group": "water", "key": "fishChance", "value": 0.14},
    {"op": "law", "group": "weather", "key": "herd", "value": 0.08},
    {"op": "site", "name": "Kinmire", "kind": "grove", "land": "the Yenoss Fens", "r": 2, "cool": 720, "fx": [{"on": "lonely", "by": -0.3}, {"on": "lore", "by": 0.3}, {"on": "joy", "by": 0.1}]},
    {"op": "law", "group": "status", "key": "leadNeeds", "value": 1},
    {"op": "recipe", "name": "nightsong", "way": null, "needs": {"fire": true, "night": true, "beings": 1}, "gives": {"fxAll": [{"on": "joy", "by": 0.15}, {"on": "lonely", "by": -0.2}, {"on": "lore", "by": 0.1}]}, "hint": "Sit by a fire after dark with someone near and sing or speak of what has been; the night feels less empty for all who hear."},
    {"op": "plant", "name": "kelbulb", "base": "mudroot", "nutrition": 14, "maxFood": 3, "hardy": 1, "form": {"form": "reed", "hue": 40}, "soil": {"marsh": 0.8, "forest": 0.4, "snow": 0.3, "grass": 0.2}, "sow": 30},
    {"op": "law", "group": "body", "key": "hearing", "value": 13},
    {"op": "law", "group": "drives", "key": "mortality", "value": 1.4},
    {"op": "spur", "way": "storage", "spur": {"turning": 1, "cold": 1.2, "hunger": 1, "famine": 1.5}},
    {"op": "creature", "name": "murrock", "base": "yarrok", "set": {"speed": 0.3, "maxEnergy": 110, "gore": 3, "breedChance": 0.0025}, "form": {"build": "stocky", "head": "curved", "tail": "bushy", "pattern": "none", "hue": 38}, "gives": {"wool": true}, "n": 8},
    {"op": "recipe", "name": "emberfish", "way": "fishing", "needs": {"food": "fish", "foodN": 1, "fire": true}, "gives": {"fx": [{"on": "energy", "by": 14}, {"on": "health", "by": 6}, {"on": "sick", "by": -1}]}, "hint": "Fish laid over the fire before eating keeps the belly sound and the body strong."},
    {"op": "law", "group": "status", "key": "giving", "value": 1.3},
    {"op": "law", "group": "status", "key": "works", "value": 1.5},
    {"op": "spur", "way": "lorekeeping", "spur": {"loss": 1.2, "strangers": 0.8, "cold": 0.4}},
    {"op": "law", "group": "weather", "key": "blight", "value": 0.03},
    {"op": "law", "group": "drives", "key": "loneliness", "value": 1.3}
  ],
  lessons: ['People build bonds, settlements and shared stores on their own through gifts and teaching, faster than any lever. A ceremony that needs three together will not happen until bands grow, so ask for small groups.',
    'A first winter tests stores, not bodies. People answer scarcity by building shelters and fires and drawing kin closer, not by stealing, trading or fighting. Pressure alone does not create contact between camps; something must make crossing to another camp worthwhile.',
    'Places that touch passers-by with lore are found and used at once if they lie near where people live; far ones go unfound for weeks.',
    'New prey can steady the ecology without changing behaviour. Behaviour changes when a lever ties into something people already want, such as gifts, marks or kin, not merely when a new resource exists.',
    'A theft nobody sees has no consequence. Wrongs need to leave a trace before they can be answered.',
    'Acts that need only what people already carry and one companion (sharing: food plus one other) are used within days. Acts that need a tool in hand plus a specific item, or that must be done at a particular building, go unused.',
    'A building that matches a leader\'s stated aim gets raised quickly (four halls in four days). A roof alone gives others no reason to come: following stayed at 3 through seven halls.',
    'Drives move behaviour faster than buildings or recipes: raising family and belonging brought births and bands within days, raising curiosity and sight brought the first meetings between peoples.',
    'Every drive that pushes toward an act needs a matching check on whether the act can be survived: a strong wish for children with a low energy floor turned births into deaths.',
    'Changing the odds of an act people never choose changes nothing. A lever must reach what beings want or see.',
    'Real need opens contact between peoples sooner than tokens made for giving: the first gift across peoples went to a sick neighbour, and understanding rose after it.',
    'Deaths in plenty came from isolation and wandering, harried by beasts, not from scarcity. Compassion moves those who see need; it does not send them looking for need they cannot see.',
    'Inventions come in a burst once the first appears and spread by example inside one tongue, not across tongues. Tools are made far more often than they are used.',
    "This is the first visit: the world is in plenty and calm, so the first levers should be pulls toward gathering and discovery, not new dangers. Winter is near and will supply the danger.",
    "People built bonds, a settlement and a shared store on their own through gifts and teaching, faster than any lever I pulled. A recipe that needs 3 beings together will not fire until bands grow, so ceremony levers should ask for small grou\u2026",
    "The first winter tested stores, not bodies. People answered scarcity by building stores and shelters and by drawing their kin closer, not by stealing, trading or fighting. Pressure alone will not create contact between camps; something mus\u2026",
    "Sites that touch passers-by with lore are used at once, but recipes that need a specific carried food (feast: 2 berry) go unused. Levers work best when they match what people already hold and do.",
    "New prey can stabilise the ecology without changing behaviour. Elk held the grazer count, but people hunt only by chance. Behaviour changes when a lever ties into something people already want, such as gifts, marks or kin, not merely when \u2026",
    "Recipes that need only things people already carry and one companion ('sharing': food plus one other) are used within days, while recipes that need a tool in hand plus a specific item (fangcharm) go unused even among active hunters.",
    "A recipe gated on being at a building goes unused even when the building exists and the act's ingredients are common (sharing done 10 times, hallwelcome 0). Before adding more place-bound acts, confirm that people actually gather at the place and that the building counts as the kind the recipe names.",
    "Raising the family and belonging drives to 1.5 coincided with three births and four bands within five days, where earlier worlds saw no child in twenty days of plenty. Drives move behaviour faster than buildings or recipes.",
    "Raising curiosity (to 1.4) and sight (to 9) coincided with the first two cross-people meetings and wanderers entering two empty lands within four days. The places of power, 20 or more steps from anyone, were still not found, so wandering widens contact but does not yet reach fixed distant points.",
    "Inventions came in a burst once the first one appeared (4 to 18 in three days, mostly within one people), and none crossed between peoples. Knowledge spreads by example inside a tongue, not across it. A held token (amberknot) gets made but is not given; making something is easier than finding someone to give it to.",
    "Words began to cross between peoples (0% to 3%) through meetings and a gift born of need for a sick neighbour, while the made token (amberknot) still sits unused. Real need opens contact sooner than objects made for giving.",
    "Changing the odds of an act people never choose does not change behaviour. The fishing chance rose by half and fish eaten stayed flat, so levers must reach what beings want or see, not only what succeeds.",
    "A strong family drive with a low energy floor turns births into deaths: a mating pair with no food spent its reserves on a child and all three starved within a day. Every drive that pushes toward an act needs a matching check on whether that act can be survived.",
    "Raising compassion coincided with gifts rising and food crossing bands, but only to those standing close to givers. Compassion moves people who see need; it does not send them looking for need they cannot see.",
    "By day 5 the standing needed to lead (1.2) was above almost every ambitious being except Bruwen. Halls built with no one able to pledge to their builders showed that the threshold, not the lack of buildings, was holding back a second band.",
    "Lowering the standing needed to lead brought a third band within four days. It formed between two people already courting and raising a child, not around either hall-builder, so pledges follow existing bonds, and halls alone do not draw followers.",
    "Winter, not isolation, killed this time. A chief with three followers starved as surely as a loner, because sharing needs carried food and winter takes it all at once. Bands protect only when someone holds a store, so survival across seasons needs foresight acts or hardy fallbacks, not more bonds.",
    "A hardy plant and summer plenty came too late for a death at the end of spring. Food in the world is not food in the mouth: what killed Arri was the distance between a call for help and the one who answered it.",
    "Louder hearing and a louder sense of mortality brought more gifts, new crafts and a child, but did not stop a leader from starving while she founded her Ground. Drives that raise ambition and foresight do not by themselves turn into carried food. Standing-seeking acts compete with gathering, and the helper who hears a call still arrives with nothing to give.",
    "Spurring a way by hardship brought knowers quickly (storage 0 to 2 within one winter), but knowing did not lead to doing: the store is still unbuilt. A spur opens the door to knowledge, not to practice.",
    "One lonely person living among another people crossed the language wall in four days, which no token or site managed in twenty. Contact deepens through shared daily life at a hearth, not through single meetings.",
    "A status lever lifts whoever already does the act. Raising the worth of giving raised the giver (Tanna) and widened the gap for leaders who cannot give, so to help a stuck leader I must reward something they already do, not something they lack the means to do.",
    "Spurring storage by famine made the knowledge arrive exactly when there was nothing to store. A way meant for foresight must be sharpened by the signs that come before the hardship, such as the first cold, and not by the hardship itself.",
    "Easing blight let food recover fast, and the next death came from a predator to the weakest elder rather than from hunger. Once scarcity lifts, danger falls on whoever is most frail, so with so few people every remaining life now carries the world's future.",
    "A louder loneliness moved the one being whose aim already pointed toward others, and within four days it brought a meeting between peoples that had stayed apart for over forty days. A drive works when it amplifies a want a being already holds.",
    "Easing predators and winter hunger together brought the first winter with no deaths, even though food standing fell by more than half. Nobody starved because the hungry were near someone who could feed them, so in the lean season, closeness counts for more than total food.",
    "A band cannot form if the would-be follower stands higher than the would-be leader, even when the two are courting and bonded. The shape of who outranks whom decides which bands are possible, not only bonds or standing above a threshold.",
    "When the centres of two peoples drew within a few steps of each other, a dozen first meetings came in four days and understanding of other tongues rose from nothing. Contact grows from overlapping ranges and many brief meetings, not from any single crafted thing or site.",
    "Sowing works when it is placed where the needy actually stand. The first sapcane missed the thirsty, the second reached them, and thirst fell from 66 to 0. Where food goes matters as much as how much goes.",
    "Lowering the mating threshold brought a birth, but to the pair whose courtship was already ripe, not to the pair expected. Like a drive, a looser law opens a door only for those already standing at it.",
    "Hunger deaths amid plenty are failures of delivery, not of supply: each one who starved was too far from anyone for help to reach in time. Hearing farther, keeping people near each other, or a way to send food ahead saves more lives than more food.",
    "A count that reads the same at every visit is more likely a fault in the instrument than a fact about the world. Ask the programmer before reasoning from it (the food counts once looked frozen for twelve days because the earlier numbers were not kept as a copy)."],
  ideas: ['Places of power as anchors that people compete over and settle around; a contested place between two camps could create contact that scarcity alone never did.',
    'Death should leave a trace: the place where someone fell could become a site that touches visitors with grief or lore, a seed for ancestor belief.',
    'Leaders without followers are a lasting tension. Give them acts that cost something and visibly benefit others, rather than handing out followers.',
    'Beads, charms and wards are seeds for currency and status: if they circulate, a later recipe could require them.',
    'Watch whether noticed thefts or takings from settled ground lead to a custom against taking, which would be the first law born from a crime.',
    'Fear of predators is the strongest shared feeling. A leader who can visibly lessen it for others may be the natural route to the first band of three or more.',
    'First contact between peoples who cannot understand each other: watch whether gifts come before words, and whether a made thing given across peoples opens trade.',
    'Each land holds what the others lack. A recipe or a way that needs a thing from another people\'s land would make crossing worthwhile.',
    'The sea divides the world. Whoever first makes a raft meets a people that has never seen them.',
    'Children change every drive. If a first birth comes, watch whether the family drive pulls people toward one camp.',
    'A resource held by one people and wanted by another (salt for keeping meat, shell for stringing, wool for cloaks) is the natural seed of trade: watch which crosses first.',
    'A woolly grazer is the link between weaving and herding: watch whether the first taming comes from weavers or from hunters who spare an animal.',
    'Care for the sick and hungry may be the real road across the wall of language, and those who give across it the first translators.',
    'A recipe that wears a tool might pull tools out of the hand and into the field.',
    "A song at the fire may be the first shared culture. If nightsong or telling becomes a habit in one band, a singer could carry it to another camp, and a song of the band could become part of who they are.",
    "Graves as shared ground: if a resting place is visited by two peoples, shared grief may become the first ground both hold sacred, and a seed for ancestor rites.",
    "A hardy food that persists in winter is a fallback, not a store. Watch whether people remember where it grows and return when the cold comes: the first knowledge of place tied to a season."]
};
K.legacy = function (st) {
  const Mk = st.maker, H = Mk.heritage || { ops: [], lessons: [], ideas: [] }, ops = H.ops.slice(), lessons = H.lessons.slice(), ideas = H.ideas.slice();
  Mk.log.forEach(function (e) { if (e.id > 0 && e.verdict !== 'undone') (e.raw || []).forEach(function (op) { if (op && op.op !== 'event') ops.push(op); }); });
  Mk.lessons.forEach(function (t) { if (t.indexOf('from earlier worlds') !== 0) lessons.push(t.replace(/^day \d+: /, '')); });
  Mk.ideas.forEach(function (q) { if (q.by === 'maker' && q.status === 'open' && !q.old) ideas.push(q.text); });
  const uniq = function (list, key) { const seen = {}, out = []; for (let i = list.length - 1; i >= 0; i--) { const k = key(list[i]); if (seen[k]) continue; seen[k] = 1; out.unshift(list[i]); } return out; };
  return { ops: uniq(ops, function (o) { return o.op === 'law' ? 'law:' + o.group + '.' + o.key : o.op === 'spur' ? 'spur:' + o.way : o.op === 'music' ? 'music' : o.op + ':' + (o.name || o.id || JSON.stringify(o)); }).slice(-60), lessons: uniq(lessons, function (t) { return t; }).slice(-24), ideas: uniq(ideas, function (t) { return t; }).slice(-24) };
};
K.inherit = function (st, legacy) {
  const Mk = ensure(st), w = st.world, done = [], kept = [], seen = {};
  const H = { ops: K.HERITAGE.ops.concat((legacy && legacy.ops) || []), lessons: K.HERITAGE.lessons.concat((legacy && legacy.lessons) || []), ideas: K.HERITAGE.ideas.concat((legacy && legacy.ideas) || []) };
  { const u = function (list) { const seen = {}; return list.filter(function (t) { const k = String(t).slice(0, 70).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }; H.lessons = u(H.lessons); H.ideas = u(H.ideas); }
  const uniq = function (list) { return list.filter(function (t) { const k = String(t).slice(0, 60); if (seen[k]) return false; seen[k] = 1; return true; }); };
  H.ops.forEach(function (op0) { const op = JSON.parse(JSON.stringify(op0)); delete op.x; delete op.y; const r = K.applyOp(w, op); if (r.ok) { done.push(r.text); kept.push(op); } });
  H.lessons = uniq(H.lessons); H.ideas = uniq(H.ideas);
  H.lessons.forEach(function (t) { Mk.lessons.push('from earlier worlds: ' + t); });
  H.ideas.forEach(function (t) { Mk.ideas.push({ text: t, by: 'maker', status: 'open', day: 0, old: 1 }); });
  Mk.heritage = { ops: kept, lessons: H.lessons, ideas: H.ideas };
  if (done.length) Mk.log.push({ id: 0, day: 1, tick: 0, seen: 'This world began with what the makers of earlier worlds added and kept.', predict: '', ops: done, undo: [], refused: [], raw: [], verdict: 'kept' });
  Mk.rev = (Mk.rev || 0) + 1;
  return done;
};
function ensure(st) { const Mk = st.maker; if (!Mk.ideas.length) K.SEED.forEach(function (t) { Mk.ideas.push({ text: t, by: 'owner', status: 'open' }); }); return Mk; }
K.make = async function (st) {
  const w = st.world, L = w.laws, Mk = ensure(st), S = st.story;
  if (K.busy || !st.sample) return null; K.busy = 'maker'; st.used++;
  try {
    const now = K.stats(st), pend = Mk.log.filter(function (e) { return e.verdict === 'pending'; });
    const laws = LAW_GROUPS.map(function (g) { return g + ': ' + Object.keys(L[g] || {}).filter(function (k) { return typeof L[g][k] === 'number'; }).map(function (k) { return k + '=' + L[g][k]; }).join(', '); }).join('\n');
    const fxT = function (fx) { return (fx || []).map(function (f) { return f.on + (f.times ? ' x' + f.times + '/' + f.for : (f.by > 0 ? ' +' : ' ') + f.by); }).join(', '); };
    const plants = Object.keys(L.plants).filter(function (k) { return !L.plants[k].retired; }).map(function (k) { const d = L.plants[k], old = [d.heal ? 'heals ' + d.heal : '', d.hurt ? 'hurts ' + d.hurt : '', d.lore ? 'lore +' + d.lore : '', d.joy ? 'joy' : '', d.anger ? 'rage' : '', d.calm ? 'calm' : ''].filter(Boolean).join(', '); return k + ' (food ' + d.nutrition + (old ? '; ' + old : '') + (d.fx && d.fx.length ? '; ' + fxT(d.fx) : '') + '; grows on ' + Object.keys(d.soil || {}).join('/') + ')'; }).join('; ');
    const beasts = Object.keys(L.creatures).filter(function (k) { return !L.creatures[k].retired; }).map(function (k) { const d = L.creatures[k]; return k + ' (' + (d.predator ? 'hunter' : 'grazer') + ', ' + (now.creatures[k] || 0) + ' alive; ' + ['speed', 'maxEnergy', 'tough', 'bite', 'gore', 'meat', 'killChance', 'range', 'breedChance'].filter(function (q) { return typeof d[q] === 'number'; }).map(function (q) { return q + ' ' + d[q]; }).join(', ') + ')'; }).join('; ');
    const prompt = 'You are the MAKER of Evolu: the designer who stands outside a small living world and improves it while it runs. Beings in it have minds of their own (other models). You never speak to them and never tell them anything. You change what is POSSIBLE in their world and then watch what they do with it.\n' +
      'YOU ARE, FIRST OF ALL, BENEVOLENT. Your first care is that the peoples live, are fed through the lean season, have children and grow in number. When you see hunger, deaths, a people shrinking toward its end, or lives too hard to leave room for anything else, answer THAT before anything else, with the levers that reach it: how food grows and withers (time.winterGrowth, time.winterWither, ecology.bounty, weather.blight), sown food, herds, fish, what spurs foresight, the drives, newcomers. Do not make a hard world harder to see what happens. You may, rarely, answer cruelty among them with a hardship, but never one that kills. A world that is too easy teaches nothing, so do not flood it either: aim for lives in which most survive each winter and numbers rise slowly. If the living are fewer than about twenty, bring newcomers (event newcomers): a world with too few people cannot find mates, bands or trade.\n' +
      'What you are for: a world that grows more interesting, more varied, more surprising and more alive over time, and stays in balance. Danger and scarcity matter as much as plenty: with nothing to lose, nothing happens. Open the door; do not walk them through it. Never script an outcome.\n' +
      'How you work: like a careful experimenter. Look at the story and the numbers. Judge your earlier changes against what you predicted. Then make AT MOST THREE changes, small enough to tell what each did. Each visit costs the world\'s owner real money, so make it count; it is fine to change nothing.\n\n' +
      'THE STORY SO FAR:\n' + (S.chapters.length ? S.chapters.slice(-2).map(function (c) { return 'Chapter ' + c.n + ', "' + c.title + '" (days ' + c.day0 + '-' + c.day1 + '): ' + c.text; }).join('\n\n') + '\nThreads: ' + S.threads.map(function (t) { return t.name + ' [' + t.kind + ']: ' + t.text; }).join(' | ') + '\nTrends: ' + S.trends.join(' | ') : 'No chapter has been written yet.') +
      '\n\nTHE PEOPLE NOW:\n' + people(st, false) + '\n\nTHE NUMBERS NOW: ' + JSON.stringify(now) + (Mk.stats ? '\nTHE NUMBERS AT YOUR LAST VISIT (day ' + Mk.stats.day + '): ' + JSON.stringify(Mk.stats) : '') +
      '\n\nTHE WORLD\'S PARTS\nLaws (group: key=value):\n' + laws + '\nPlants: ' + plants + '\nAnimals: ' + beasts + '\nWays of knowledge: ' + Object.keys(L.tree).map(function (k) { const d = L.tree[k]; return k + ' [' + d.tree + '; after ' + (d.needs.join(',') || '-') + '; lore ' + d.lore + '; ' + d.stat + ' x' + d.n + '; known by ' + (now.waysKnown[k] || 0) + ']'; }).join('; ') +
      '\nGraves (where the dead fell): ' + (w.graves.slice(-8).map(function (g) { return g.name + ' at (' + g.x + ',' + g.y + '), ' + g.cause; }).join('; ') || 'none') +
      '\nMixes: ' + ((L.mixes || []).map(function (m) { return '"' + m.name + '" ' + m.of.join('+') + ' → ' + fxT(m.fx); }).join('; ') || 'none') + '\nPlaces of power: ' + ((w.sites || []).map(function (q) { return q.kind + ' "' + q.name + '" (' + fxT(q.fx) + '; found by ' + w.agents.filter(function (a) { return a.met && a.met[q.id] != null; }).length + '; nearest being ' + Math.min.apply(null, w.agents.map(function (a) { return SW.cheb(a.x, a.y, q.x, q.y); }).concat([999])) + ' steps away)'; }).join('; ') || 'none') +
      '\nThings that can be made or done: ' + (Object.keys(L.recipes || {}).map(function (k) { const r = L.recipes[k]; return '"' + k + '" (way ' + (r.way || 'none') + '; needs ' + M.needsText(r.needs) + '; done ' + w.agents.reduce(function (s, a) { return s + ((a.things && a.things[r.gives.thing]) || 0); }, 0) + ' held)'; }).join('; ') || 'none') +
      '\n\nYOUR NOTEBOOK\nIdeas (the owner\'s roadmap first, in the order the owner wants it: work with what is marked NOW, prepare what is marked NEXT, and let LATER, FAR and LAST wait until the peoples reach those ages. For those, say in a request what you would need; do not force them early. Then your own):\n' + Mk.ideas.map(function (q, i) { return (i + 1) + '. [' + q.status + (q.by === 'maker' ? ', yours' : '') + '] ' + q.text; }).join('\n') +
      '\nYour changes so far:\n' + (Mk.log.slice(-10).map(function (e) { return '#' + e.id + ' day ' + e.day + ' [' + e.verdict + '] ' + (e.ops.join('; ') || 'no change') + (e.refused.length ? ' (refused: ' + e.refused.join('; ') + ')' : '') + '. You predicted: ' + e.predict + (e.why ? ' On review you wrote: ' + e.why : ''); }).join('\n') || 'none yet') + (pend.length ? '\nThose marked pending must be reviewed now: keep or undo each.' : '') +
      '\nLessons you wrote down: ' + (Mk.lessons.slice(-10).join(' | ') || 'none yet') +
      '\n\nWHAT YOU CAN CHANGE\n' + K.OPS + '\nIf what the world needs cannot be built from these parts, say so in "requests": a plain description for the programmer of what is needed and why, from what you observed. The programmer reads these.\n\n' +
      'Reply with ONLY one JSON object: {"seen": "2 to 4 sentences: what is happening in the world and what it lacks", "review": [for each pending change {"id": number, "keep": true or false, "why": "what the numbers or the story show"}], "changes": [0 to 3 changes], "predict": "what you expect to see by your next visit, in terms that can be checked", "ideas": {"add": ["new ideas of your own"], "done": [numbers of ideas now largely in place], "drop": [numbers]}, "lesson": null or "one thing you learned about this world or about changing it", "requests": [0 to 2 requests to the programmer]}';
    K.emit = st.emit;
    const r = await ask(st, st.settings.maker, prompt);
    const out = { id: ++Mk.n, day: now.day, tick: w.tick, seen: clip(r.seen, 1800), predict: clip(r.predict, 1800), ops: [], undo: [], refused: [], raw: [], verdict: 'pending' };
    (Array.isArray(r.review) ? r.review : []).forEach(function (v) { const e = Mk.log.filter(function (q) { return q.id === Number(v && v.id) && q.verdict === 'pending'; })[0]; if (!e) return; e.verdict = v.keep === false ? 'undone' : 'kept'; e.why = clip(v.why, 900); if (v.keep === false) e.undo.forEach(function (u) { if (u) K.applyOp(w, u); }); });
    Mk.log.forEach(function (e) { if (e.verdict === 'pending') e.verdict = 'kept'; });
    const ops = (Array.isArray(r.changes) ? r.changes : []).filter(function (o) { return o && typeof o === 'object'; }).slice(0, 3);
    if (ops.length) {
      const t = K.trial(w, ops);
      if (!t.ok) out.refused.push('all changes refused: ' + t.why);
      else ops.forEach(function (op) { const a = K.applyOp(w, op); if (a.ok) { out.ops.push(a.text); out.undo.push(a.undo); out.raw.push(op); } else out.refused.push(a.why); });
    }
    if (!out.ops.length) out.verdict = 'nothing';
    Mk.log.push(out); if (Mk.log.length > 60) Mk.log.shift();
    const I = r.ideas || {};
    (Array.isArray(I.done) ? I.done : []).forEach(function (n) { const q = Mk.ideas[Number(n) - 1]; if (q) q.status = 'done'; }); (Array.isArray(I.drop) ? I.drop : []).forEach(function (n) { const q = Mk.ideas[Number(n) - 1]; if (q && q.by === 'maker') q.status = 'dropped'; });
    (Array.isArray(I.add) ? I.add : []).slice(0, 4).forEach(function (t) { if (t && Mk.ideas.length < 80) Mk.ideas.push({ text: clip(t, 500), by: 'maker', status: 'open', day: now.day }); });
    if (r.lesson) { Mk.lessons.push('day ' + now.day + ': ' + clip(r.lesson, 700)); if (Mk.lessons.length > 30) Mk.lessons.shift(); }
    (Array.isArray(r.requests) ? r.requests : []).slice(0, 2).forEach(function (t) { if (t) { Mk.requests.push({ day: now.day, text: clip(t, 1800) }); M.record(st, { t: 'request', text: clip(t, 1800) }); } });
    Mk.stats = JSON.parse(JSON.stringify(now)); /* a copy: the tallies inside are live objects, and a kept reference made every count look frozen between visits */ Mk.lastDay = now.day; Mk.seen = out.seen; Mk.rev = (Mk.rev || 0) + 1;
    M.record(st, { t: 'maker', id: out.id, seen: out.seen, changes: out.ops, refused: out.refused, predict: out.predict, reviewed: Mk.log.filter(function (e) { return e.why; }).slice(-3).map(function (e) { return '#' + e.id + ' ' + e.verdict + ': ' + e.why; }), lesson: r.lesson || '', ideasAdded: (I.add || []).slice(0, 4), raw: ops });
    if (out.ops.length) M.chron(st, 'maker', 'The world changed: ' + out.ops.join('; ') + '.', []);
    st.ui({ type: 'maker', entry: out });
    return out;
  } catch (e) { Mk.lastDay = SW.day(w); K.error = 'The maker could not finish its visit (' + ((e && e.code) || (e && e.message) || 'failed') + ').'; M.record(st, { t: 'failed', name: 'maker', code: (e && e.code) || 'error', raw: e && e.text ? String(e.text).slice(0, 800) : String((e && e.message) || '') }); return null; }
  finally { K.busy = ''; }
};
/* when each of them is due */
K.tick = function (st) {
  if (!st.on || !st.sample || st.blocked || K.busy || st.used >= st.settings.budget) return;
  const day = SW.day(st.world), S = st.settings;
  if (day - st.story.lastDay >= S.story.every) K.tell(st);
  else if (S.maker.on && st.story.chapters.length && day - st.maker.lastDay >= S.maker.every) K.make(st);
};
K.ensure = ensure;
if (typeof module !== 'undefined' && module.exports) module.exports = K; else root.SWK = K;
})(typeof window !== 'undefined' ? window : globalThis);
