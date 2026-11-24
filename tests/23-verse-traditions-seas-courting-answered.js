/* Generation 27. What the seventeenth run showed, and what was asked for:
   (1) courting is answered: a child no longer needs two minds to plan the same thing at the same moment;
   (2) a crossing of water is an event, and one who holds a vessel is told what lies across;
   (3) the final state of a long world is sent in parts (it was 1.07 MB against a limit of 256 KiB);
   (4) the practice of a band counts for each member, labour on a great work counts as building, how a way was come by is kept;
   (5) signals and alchemy do something;
   (6) verse is asked for on its occasions, in a form, and is carried, heard and kept; one stands at the head of each chapter;
   (7) every people has a tradition that is told to it, weights its drives, says whose word carries, and gives an offering its measure;
   (8) worlds begun with seas have an ocean across the known land, a greater one beyond with islands, and great lakes;
   (9) a world saved by Generation 26 is carried on. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = (seed, opts) => { const w = SW.createWorld(seed, opts), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, d, kind) => M.apply(st, st.minds[a.id], kind || 'routine', Object.assign({ thought: 'x' }, d), {});
const run = (w, em, n, keep) => { for (let k = 0; k < n; k++) { w.creatures = []; (keep || []).forEach(o => { o.e = Math.max(o.e, 80); o.thirst = 0; o.hp = Math.max(o.hp, 80); }); SW.step(w, em); } };
const T = SW.T, bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]);
const patch = (w, n) => { for (let y = 30; y < w.H - 30; y++) for (let x = 40; x < w.W - 60; x++) { let good = true; for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y))) good = false; if (good) return { x, y }; } return null; };
const way = (a, k, from) => { a.knows[k] = { name: 'the way of ' + k, idea: 'known', look: null, tick: 0, by: (from || a).id, byName: (from || a).name }; };
const told = (st, a, re) => st.minds[a.id].events.some(e => re.test(e.text));
const apart = (w, keep, g) => w.agents.forEach((o, k) => { still(o); if (keep.indexOf(o) < 0) at(w, o, g.x + 40 + (k % 5) * 3, g.y - 22 + Math.floor(k / 5) * 3); });
const grown = (w, a, sex) => { a.age = a.life * 0.4; a.sex = sex; a.mateCd = 0; a.e = 95; a.hp = 100; a.sick = 0; };

(async () => {
  { /* ---- (1) courting is answered ---- */
    const pair = (answer) => { const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0], b = w.agents[1]; apart(w, [a, b], g); w.creatures = [];
      w.laws.mate.answer = answer; grown(w, a, 'm'); grown(w, b, 'f'); at(w, a, g.x, g.y); at(w, b, g.x + 1, g.y); a.rel[b.id] = 0.6; b.rel[a.id] = 0.6; a.parents = []; b.parents = [];
      think(st, a, { plan: [{ do: 'mate', name: b.name, ticks: 60 }] }); const n0 = w.agents.length + (w.newborn || []).length;
      for (let k = 0; k < 60; k++) { w.creatures = []; [a, b].forEach(o => { o.e = 95; o.thirst = 0; }); b.plan = []; b.intent = null; SW.step(w, em); }
      return { w, st, ev, a, b, born: ev.filter(e => e.type === 'birth').length, n0 }; };
    const off = pair(0), on = pair(0.3);
    ok(off.born === 0 && off.ev.some(e => e.type === 'court') && !off.ev.some(e => e.type === 'answered'), 'the fault: one mind plans to mate with one who is warm toward it and stands beside it, the other mind plans nothing, and no child comes (mate.answer 0: ' + off.ev.filter(e => e.type === 'court').length + ' courtings, 0 births)');
    ok(on.ev.some(e => e.type === 'answered' && e.a === on.b.id && e.b === on.a.id) && on.w.tally.answered >= 1, 'now the one courted, being warm toward the one who courts (0.6 against mate.answer 0.3), answers');
    ok(on.born >= 1, 'and a child comes of it, with only one mind having planned (' + on.born + ' birth)');
    ok(told(on.st, on.b, /courted you and, warm toward them as you are, you answered/), 'the one who answered is told so');
    const cold = (() => { const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0], b = w.agents[1]; apart(w, [a, b], g); grown(w, a, 'm'); grown(w, b, 'f'); at(w, a, g.x, g.y); at(w, b, g.x + 1, g.y); a.rel[b.id] = 0.6; b.rel[a.id] = 0.1;
      think(st, a, { plan: [{ do: 'mate', name: b.name, ticks: 60 }] }); for (let k = 0; k < 60; k++) { w.creatures = []; [a, b].forEach(o => { o.e = 95; o.thirst = 0; }); b.plan = []; b.intent = null; SW.step(w, em); } return ev; })();
    ok(!cold.some(e => e.type === 'answered') && !cold.some(e => e.type === 'birth'), 'one who is not warm toward the one who courts (0.1) does not answer, and no child comes: it is not forced');
    const tryPair = (set) => { const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0], b = w.agents[1]; apart(w, [a, b], g); grown(w, a, 'm'); grown(w, b, 'f'); at(w, a, g.x, g.y); at(w, b, g.x + 1, g.y); a.rel[b.id] = 0.6; b.rel[a.id] = 0.9; a.parents = []; b.parents = []; set(w, a, b);
      think(st, a, { plan: [{ do: 'mate', name: b.name, ticks: 60 }] }); for (let k = 0; k < 60; k++) { w.creatures = []; [a, b].forEach(o => { o.e = 95; o.thirst = 0; }); b.plan = []; b.intent = null; SW.step(w, em); } return { ev, st, a, b }; };
    const young = tryPair((w, a, b) => { b.age = b.life * 0.05; }), kin = tryPair((w, a, b) => { b.parents = [a.id]; }), same = tryPair((w, a, b) => { b.sex = 'm'; });
    ok(!young.ev.some(e => e.type === 'answered' || e.type === 'birth') && !(young.st.minds[young.a.id].verseDone || {})['love:' + young.b.name], 'a child, however warm toward the one who courts, does not answer, and no love song is asked');
    ok(!kin.ev.some(e => e.type === 'answered' || e.type === 'birth') && !same.ev.some(e => e.type === 'answered' || e.type === 'birth'), 'nor do close kin, nor two of whom no child can come: the answering comes after every bar the world already had');
    const v = (on.st.minds[on.a.id].verse || []).concat([]), lv = on.st.minds[on.a.id].verseDone || {};
    ok(lv['love:' + on.b.name] === 1, 'and the one whose courting was answered is asked for a love song for ' + on.b.name);
    ok(K.stats(on.st).courtingAndCrossing.timesCourtingWasAnswered >= 1 && K.stats(on.st).courtingAndCrossing.birthsEver >= 1, 'the maker reads how often courting was answered and how many were born');
  }

  { /* ---- (2) a crossing is an event; one with a vessel is told what lies across ---- */
    const { w, st, ev, em } = fresh(7, { seas: 1 }), A = w.seas.plan.oceans[0], a = w.agents[0];
    const open = (x, y) => w.terrain[SW.idx(w, x, y)] === T.WATER && !(w.narrow && w.narrow[SW.idx(w, x, y)]), land = (x, y) => { const t = w.terrain[SW.idx(w, x, y)]; return t !== T.WATER && t !== T.SHALLOWS && t !== T.VOID; };
    let row = null; for (let y = 40; y < w.H - 40 && !row; y++) { let x0 = A.x; while (x0 > A.x - 30 && !land(x0, y)) x0--; let x1 = A.x; while (x1 < A.x + 30 && !land(x1, y)) x1++; let n = 0; for (let x = x0 + 1; x < x1; x++) if (open(x, y)) n++; if (land(x0, y) && land(x1, y) && n >= 4 && x1 - x0 <= 30) row = { y, x0, x1, n }; }
    ok(!!row, 'a world with seas has open water between two shores of its ocean (row ' + (row && row.y) + ': ' + (row && row.n) + ' tiles no one can swim, shore to shore ' + (row && (row.x1 - row.x0)) + ' steps)');
    w.agents.forEach((o, k) => { still(o); if (o !== a) at(w, o, row.x0 - 30 - (k % 4) * 2, row.y - 6 + Math.floor(k / 4) * 2); }); w.creatures = [];
    at(w, a, row.x0, row.y); a.things = { raft: 1 }; way(a, 'rafts');
    const pr = M.buildPrompt(st, st.minds[a.id], 'routine'), vl = (pr.match(/YOU HOLD A VESSEL[^\n]*/) || [''])[0];
    ok(/to the east[^.;]*steps of water \(\d+ of them open water that cannot be swum\) and then land/.test(vl), 'one who holds a vessel at the shore is told what lies over the water: ' + vl.slice(0, 230));
    think(st, a, { plan: [{ do: 'goto', x: row.x1, y: row.y, ticks: 240 }] });
    let wentOpen = false; for (let k = 0; k < 240 && !(a.x === row.x1 && a.y === row.y); k++) { w.creatures = []; a.e = 90; a.thirst = 0; a.hp = 100; SW.step(w, em); if (open(a.x, a.y)) wentOpen = true; }
    const cr = ev.filter(e => e.type === 'crossed' && e.a === a.id)[0];
    ok(a.x === row.x1 && a.y === row.y && wentOpen, 'sent across by its mind, it arrives on the far shore, having been on open water');
    ok(cr && cr.open && cr.moments > 3 && w.tally.crossings === 1 && a.stats.crossed === 1, 'the crossing is recorded as an event (' + (cr && cr.moments) + ' moments afloat, over open water), in the tally and on the one who crossed');
    ok(told(st, a, /You crossed the water on your vessel and came ashore/) && K.stats(st).courtingAndCrossing.crossingsOfWaterOnAVessel === 1 && K.stats(st).courtingAndCrossing.worldHasSeas === true, 'it is told so, and the maker can count crossings');
    ok((st.minds[a.id].verse || []).some(q => q.k === 'deed' && /crossing the water/.test(q.about)), 'and a song of the deed is asked for');
    /* without a vessel the same plan does not arrive */
    const B = fresh(7, { seas: 1 }), b = B.w.agents[0]; B.w.agents.forEach((o, k) => { still(o); if (o !== b) at(B.w, o, row.x0 - 30 - (k % 4) * 2, row.y - 6 + Math.floor(k / 4) * 2); }); at(B.w, b, row.x0, row.y); b.things = {};
    think(B.st, b, { plan: [{ do: 'goto', x: row.x1, y: row.y, ticks: 240 }] }); for (let k = 0; k < 240; k++) { B.w.creatures = []; b.e = 90; b.thirst = 0; b.hp = 100; SW.step(B.w, B.em); }
    ok(!(b.x === row.x1 && b.y === row.y) && !B.ev.some(e => e.type === 'crossed'), 'one without a vessel, given the same plan, does not cross: the ocean is a real barrier');
  }

  { /* ---- (3) the final state in parts ---- */
    const { w, st } = fresh(5); const d = M.digest(st), whole = JSON.stringify(d).length;
    const P = M.parts(d, 9000), sizes = [JSON.stringify(P.head).length].concat(P.parts.map(q => JSON.stringify(q).length));
    const names = new Set(); P.parts.forEach(q => (q.beings || []).forEach(b => names.add(b.name)));
    ok(whole > 30000 && P.parts.length >= 2 && Math.max.apply(null, P.parts.map(q => JSON.stringify(q).length)) <= 9000, 'a state of ' + whole + ' characters is cut into a head and ' + P.parts.length + ' parts, none above the limit asked (' + sizes.join(', ') + ')');
    ok(names.size === d.beings.length, 'every being is in one part or another (' + names.size + ' of ' + d.beings.length + ')');
    ok(P.head.parts === P.parts.length || (P.head.digest && P.head.digest.parts === P.parts.length) || JSON.stringify(P.head).indexOf('"parts"') >= 0, 'and the head says how many parts there are');
    ok(d.culture.verse && Array.isArray(d.culture.verses) && d.culture.traditions.length === w.peoples.length && d.beings[0].body.came && typeof d.beings[0].body.came === 'object', 'the state now carries the verse, the tradition of each people, and how each being came by each way');
  }

  { /* ---- (4) band practice, labour as building, how a way was come by ---- */
    const { w, st, ev, em } = fresh(11), a = w.agents[0], b = w.agents[1], N = w.laws.tree.riding;
    w.agents.forEach(o => { o.leader = null; }); b.leader = a.id; way(a, 'herding'); a.lore = 9; a.stats.tamed = 0; b.stats.tamed = 6;
    const seen = () => { const p = SW.pathsFor(w, a), q = p.open.concat(p.near).filter(o => o.id === 'riding')[0]; return q ? JSON.stringify(q) : ''; };
    w.laws.culture.bandPractice = 0; const none = seen(); w.laws.culture.bandPractice = 0.5; const half = seen();
    ok(none !== half && N.stat === 'tamed' && N.n === 4, 'the practice of a band counts toward a way for each member: one who has tamed nothing, whose band mate has tamed six, stands differently before riding (asks ' + N.n + ' tamed) with culture.bandPractice at 0.5 than at 0');
    ok(/taming animals: 0 of 4/.test(none) && /taming animals: 3 of 4/.test(half), 'at 0 it has 0 of 4; at 0.5, three of the six its band mate tamed count, and it is told 3 of 4');
    ok(N.n === 4 && w.laws.tree.currency.n === 6 && K.stats(st).reachOfRidingAndCurrency.riding.asksFor === 4 && K.stats(st).reachOfRidingAndCurrency.riding.mostByOneLiving === 6, 'the thresholds for riding (4 tamed) and currency (6 trades) are as they were, and the maker now reads how near anyone is');
    /* labour */
    const g = patch(w, 8), c = w.agents[2]; apart(w, [c], g); at(w, c, g.x, g.y); way(c, 'smelting'); c.wood = 4; c.stone = 6; c.stats.built = 0; c.stats.raised = 0;
    think(st, c, { plan: [{ do: 'build', what: 'forge', ticks: 5 }] }); run(w, em, 3, [c]);
    const i = SW.idx(w, g.x, g.y);
    ok(w.works[i] && !w.shelters[i] && c.stats.built >= 1, 'labour on a work counts as building: ten loads carried to a forge not yet standing count ' + c.stats.built + ' toward the builder\'s practice (it counted nothing before)');
    /* how */
    const hows = {}; w.agents.forEach(o => { for (const k in o.knows) hows[o.knows[k].how || '?'] = (hows[o.knows[k].how || '?'] || 0) + 1; });
    ok(hows.people > 0, 'how a way was come by is recorded: the old way of each people is marked so (' + JSON.stringify(hows) + ')');
    const dg = M.digest(st).beings.filter(q => q.name === w.agents[3].name)[0];
    ok(dg && dg.body.came && Object.keys(dg.body.came).length === dg.body.knows.length, 'and the final state lists it for every way of every being');
  }

  { /* ---- (5) signals and alchemy do something ---- */
    const { w, st, ev, em } = fresh(11), g = patch(w, 8), a = w.agents[0], b = w.agents[1]; apart(w, [a, b], g); w.creatures = [];
    b.people = a.people; b.lang = a.lang; at(w, a, g.x, g.y); at(w, b, g.x, g.y + 20);
    const h = w.laws.body.hearing, r0 = SW.reach(w, a);
    think(st, a, { say: { text: 'the herd is by the river' } }); const heard0 = told(st, b, /the herd is by the river/);
    way(a, 'signals'); const r1 = SW.reach(w, a);
    think(st, a, { say: { text: 'the herd has gone north' } }); const heard1 = told(st, b, /the herd has gone north/);
    ok(r0 === h && r1 === Math.round(h * w.laws.culture.signalReach) && r1 > 20, 'signals: one who knows them is heard at ' + r1 + ' steps where another is heard at ' + r0);
    ok(!heard0 && heard1, 'through the mind: at twenty steps a word is not heard, and from one who knows signals it is');
    ok(/you know signals: your word[^.]*carry 33 steps/.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'and the one who knows them is told so');
    const R = w.laws.recipes, al = Object.keys(R).filter(k => R[k].way === 'alchemy');
    ok(al.indexOf('tonic') >= 0 && al.indexOf('wakefire') >= 0, 'alchemy: two things are made by it (' + al.join(', ') + '); before, nothing was');
    const c = w.agents[2]; at(w, c, g.x + 4, g.y); way(c, 'alchemy'); way(c, 'fire'); c.hp = 40; c.sick = 200; c.carry = [{ k: 'berry', n: 1 }, { k: 'berry', n: 1 }].map(q => Object.assign({ t: w.tick }, q)); w.fires[SW.idx(w, g.x + 5, g.y)] = 400;
    const lack = SW.lacks(w, c, R.tonic, 'tonic');
    think(st, c, { plan: [{ do: 'make', what: 'tonic', ticks: 10 }] }); for (let k = 0; k < 4; k++) { w.creatures = []; c.e = 90; c.thirst = 0; SW.step(w, em); }
    ok(ev.some(e => e.type === 'made' && e.what === 'tonic') && c.hp >= 70 && !(c.sick > 0), 'a tonic, made by a mind\'s plan from two foods beside a fire, mends 35 and breaks a sickness (health 40 to ' + Math.round(c.hp) + ', sick no more)' + (lack && lack.length ? ' [lacked: ' + JSON.stringify(lack) + ']' : ''));
  }

  { /* ---- (6) verse ---- */
    const { w, st, ev, em } = fresh(7), g = patch(w, 8), a = w.agents[0], b = w.agents[1], c = w.agents[2]; apart(w, [a, b, c], g); w.creatures = [];
    [b, c].forEach(o => { o.people = a.people; o.lang = a.lang; }); at(w, a, g.x, g.y); at(w, b, g.x + 2, g.y); at(w, c, g.x + 3, g.y); b.rel[a.id] = 0.8; c.rel[a.id] = 0.4;
    const F = w.laws.verse.forms;
    ok(Object.keys(F).length >= 10 && F.deathpoem && F.lament && F.lovesong && F.ballad && F.lullaby && Object.keys(F).every(k => F[k].how.length > 30), 'forms of verse are data in the laws: ' + Object.keys(F).join(', '));
    const before = M.buildPrompt(st, st.minds[a.id], 'routine');
    ok(!/IS ASKED OF YOU NOW/.test(before) && !/"tale": \{"title"/.test(before.slice(before.lastIndexOf('Reply with ONLY'))), 'the fault: in an ordinary thought nothing asks for verse, and the reply has no place for a tale');
    a.age = a.life * (w.laws.verse.near + 0.01); a.nearing = 0; a.e = 90; SW.step(w, em);
    ok(ev.some(e => e.type === 'nearing' && e.a === a.id) && a.nearing === 1, 'an elder past ' + w.laws.verse.near + ' of its life feels its death near (once)');
    const pr = M.buildPrompt(st, st.minds[a.id], 'routine'), tail = pr.slice(pr.lastIndexOf('Reply with ONLY'));
    ok(/A VERSE IS ASKED OF YOU NOW, before anything else\. You are old and you feel your death near/.test(pr) && /ITS FORM is the death poem: three short lines, unrhymed/.test(pr) && /"tale": \{"title"/.test(tail) && /do not leave it out/.test(tail), 'its next thought, of whatever kind, is asked for a death poem in its form, and the reply has the place for it');
    ok(st.minds[a.id].weightyT === w.tick - 1 || st.minds[a.id].weightyT === w.tick, 'the asking is weighty: it breaks into a plan');
    think(st, a, { tale: { title: 'Last frost', kind: 'poem', text: 'Frost on the reed bed / all I kept I gave away / the river goes on' } });
    const it = Object.values(w.culture.items).filter(q => q.occasion === 'dying')[0];
    ok(a.deathPoem && a.deathPoem.text.indexOf('/ all I kept') > 0 && it && it.kind === 'poem' && it.form === 'deathpoem' && (st.minds[a.id].verse || []).length === 0, 'the verse given is kept as its death poem, in the culture as a poem of that occasion and form, and the asking is done');
    ok((st.minds[b.id].tales || []).some(q => q.title === 'Last frost' && q.from === a.name) && told(st, b, /spoke a death poem aloud, and you heard it: Frost on the reed bed/), 'it is spoken aloud: those in earshot who understand the tongue now carry it');
    ok(w.culture.verse.asked.dying === 1 && w.culture.verse.made.dying === 1 && st.log === st.log, 'asked and made are counted');
    /* death: the lament falls to the closest */
    st.emit({ type: 'death', a: a.id, cause: 'old age', seenBy: [b.id, c.id], band: [b.id, c.id], ctx: {} });
    const vb = (st.minds[b.id].verse || [])[0];
    ok(vb && vb.k === 'elegy' && vb.about === a.name && vb.form === 'lament' && !(st.minds[c.id].verse || []).some(q => q.k === 'elegy'), 'when it dies, the lament is asked of the one who was closest (bond 0.8), not of one less close (0.4)');
    ok(/of all the living you were closest/.test(vb.ask) && /left this death poem: "Frost on the reed bed/.test(vb.ask) && /lived \d+ days/.test(vb.ask), 'and that one is told of the life it is to sing: ' + vb.ask.slice(vb.ask.indexOf('Of their life'), vb.ask.indexOf('Of their life') + 150));
    /* asked and never given lapses after three thoughts */
    for (let k = 0; k < 3; k++) think(st, b, {});
    ok((st.minds[b.id].verse || []).length === 0 && w.culture.verse.lapsed.elegy === 1, 'a verse asked for and not given in three thoughts lapses, and is counted as never given');
    /* myths: once for each people */
    w.tick = w.laws.time.dayLength * 2 + 11; M.tick(st);
    const asked = Object.keys(w.culture.mythAsked || {}).length, living = new Set(w.agents.filter(o => !o.dead).map(o => o.people)).size;
    ok(asked === living && w.culture.verse.asked.myth === living, 'once for each people (' + living + ') the one who knows most is asked for the myth of how they came to be');
    const mm = w.agents.filter(o => (st.minds[o.id].verse || []).some(q => q.k === 'myth'))[0], mp = M.buildPrompt(st, st.minds[mm.id], 'routine');
    ok(/A MYTH IS ASKED OF YOU NOW/.test(mp) && /Tell it plainly, as by a fire, not in verse/.test(mp) && /Your people hold to the /.test(mp), 'a myth is asked in prose, out of the tradition of the people');
    think(st, mm, { tale: { title: 'How the reeds were made', kind: 'myth', text: 'Before the people there was only water, and the Heron stood in it.' } });
    ok(Object.values(w.culture.items).some(q => q.kind === 'myth' && q.occasion === 'myth' && q.people === mm.people), 'and what is given is the myth of that people');
    w.tick += w.laws.time.dayLength; M.tick(st);
    ok(w.culture.verse.asked.myth === living, 'a people that has its myth is not asked again');
    /* the epigraph */
    const e1 = K.epigraph(st, 1, 5), e2 = K.epigraph(st, 40, 50);
    ok(e1.epi && e1.epi.occasion === 'dying' && e1.epi.by === a.name && e1.made.length >= 2, 'at the head of a chapter stands a verse made in its days, the death poem before the myth (' + e1.made.length + ' made in the span are set before the chronicler)');
    ok(e2.epi && e2.epi.kind === 'tradition' && e2.epi.text.length > 40 && e2.made.length === 0, 'where none was made, a line of the tradition of the most numerous people stands there; nothing is invented');
    ok(K.stats(st).verseAndTraditions.versesMadeByOccasion.dying === 1 && K.stats(st).verseAndTraditions.askedButNeverGiven.elegy === 1, 'the maker reads what was asked, made and never given');
  }

  { /* ---- (7) traditions ---- */
    const { w, st, ev, em } = fresh(7), TR = w.laws.traditions;
    ok(Object.keys(TR).length >= 9 && ['spirits', 'ancestors', 'angrysky', 'warring', 'guardian', 'openhand', 'innerpath', 'mother', 'father'].every(k => TR[k] && TR[k].holds.length > 60 && TR[k].drives), 'traditions are data in the laws: ' + Object.keys(TR).join(', '));
    ok(w.peoples.every(P => TR[P.tradition]) && JSON.stringify(w.peoples.map(P => P.tradition)) === JSON.stringify(SW.createWorld(7).peoples.map(P => P.tradition)), 'every people is given one when it comes into being, the same for the same seed (' + w.peoples.map(P => P.name + ': ' + P.tradition).join('; ') + ')');
    const seen = new Set(); for (let s = 1; s <= 30; s++) SW.createWorld(s).peoples.forEach(P => seen.add(P.tradition));
    ok(seen.size >= 7, 'across thirty seeds ' + seen.size + ' of the nine are held by someone: worlds differ in their faiths');
    const a = w.agents[0], P = w.peoples[a.people], pr = M.buildPrompt(st, st.minds[a.id], 'routine');
    ok(pr.indexOf('THE TRADITION OF YOUR PEOPLE is ' + TR[P.tradition].name + ': ' + TR[P.tradition].holds) > 0 && /you may keep it, doubt it, or come to hold something else/.test(pr), 'each mind is told the tradition of its people, and that it may doubt it');
    /* drives */
    P.tradition = 'angrysky'; a.mood.fear = 0.5; const d1 = M.drives(st, st.minds[a.id], a, SW.look(w, a)).filter(q => q.k === 'fear')[0];
    P.tradition = 'warring'; const d2 = M.drives(st, st.minds[a.id], a, SW.look(w, a)).filter(q => q.k === 'fear')[0];
    ok(d1 && d2 && d1.raw > d2.raw * 1.5, 'a tradition weights what presses on its people: the same fear presses ' + (d1 && d1.raw.toFixed(2)) + ' on one under the angry sky and ' + (d2 && d2.raw.toFixed(2)) + ' on one of the warring gods');
    /* whose word carries */
    P.tradition = 'mother'; const b = w.agents.filter(o => o.people === a.people && o !== a)[0]; a.sex = 'f'; b.sex = 'f'; a.stats.kids = 2; b.stats.kids = 0;
    a.stat = null; const s1 = SW.status(w, a); a.stats.kids = 0; a.stat = null; const s0 = SW.status(w, a); a.stats.kids = 2; a.stat = null;
    ok(SW.ofTheOrder(w, a) && !SW.ofTheOrder(w, b) && s1 - s0 >= w.laws.culture.orderStanding - 1e-9, 'it says whose word carries: among a people of the Mother, a mother stands ' + (s1 - s0).toFixed(2) + ' higher than she would with no child (culture.orderStanding ' + w.laws.culture.orderStanding + ' and what children give anyone)');
    ok(/Among you the word of a mother carries furthest\. You are one of these\./.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'and she is told so');
    /* an offering, through the mind */
    const g = patch(w, 8); apart(w, [a, b], g); w.creatures = []; at(w, a, g.x, g.y); at(w, b, g.x + 2, g.y); P.tradition = 'angrysky';
    a.carry = [{ k: 'berry', n: 1, t: w.tick }]; a.mood.fear = 0.8; a.mood.grief = 0.5; b.rel[a.id] = 0.1;
    think(st, a, { plan: [{ do: 'offer', ticks: 3 }] }); run(w, em, 2, [a]);
    ok(a.carry.length === 1 && told(st, a, /no fire within two steps and no shrine beside you/), 'an offering asked for where there is no fire or shrine fails, and the mind is told why');
    w.fires[SW.idx(w, g.x + 1, g.y)] = 400; a.mood.fear = 0.8; a.mood.grief = 0.5; const f0 = a.mood.fear;
    think(st, a, { plan: [{ do: 'offer', ticks: 3 }] }); run(w, em, 2, [a]);
    const calm = w.laws.culture.offerCalm * TR.angrysky.offering;
    ok(a.carry.length === 0 && ev.some(e => e.type === 'offered' && e.a === a.id) && f0 - a.mood.fear > calm * 0.6 && a.stats.offered === 1 && w.tally.offerings === 1, 'by a fire, a mind\'s plan step offer gives up the food: it is gone, and fear is eased by the measure of the tradition (0.8 to ' + a.mood.fear.toFixed(2) + ' under the angry sky, measure ' + TR.angrysky.offering + ')');
    ok(b.rel[a.id] > 0.1 + 0.05, 'and one of the same tradition who saw it thinks better of the giver (0.10 to ' + b.rel[a.id].toFixed(2) + ')');
    ok(/offer \{what\?: a food you carry\}/.test(M.buildPrompt(st, st.minds[a.id], 'routine')) && SW.ACTIONS.indexOf('offer') >= 0, 'the act is in the list every mind is given');
    /* the maker's levers */
    const r = K.applyOp(w, { op: 'tradition', name: 'tidefolk', title: 'the Tide', holds: 'All things come and go with the water, and what is taken at the ebb is given back at the flood.', order: 'elders', drives: { curiosity: 1.4, bogus: 3, fear: 9 }, verse: 'chant', people: P.name });
    ok(r.ok && P.tradition === 'tidefolk' && w.laws.traditions.tidefolk.drives.curiosity === 1.4 && w.laws.traditions.tidefolk.drives.fear === 1.5 && w.laws.traditions.tidefolk.drives.bogus == null, 'the maker can add a tradition and give it to a people; what is out of bounds is clipped or dropped');
    const u = K.applyOp(w, r.undo); ok(u.ok && P.tradition === 'angrysky' && !w.laws.traditions.tidefolk, 'and take it back, leaving the people with what they held');
    const f = K.applyOp(w, { op: 'verseform', name: 'round', lines: 3, how: 'three lines, the last the first said again' }), l1 = K.applyOp(w, { op: 'law', group: 'verse', key: 'near', value: 0.8 }), l2 = K.applyOp(w, { op: 'law', group: 'mate', key: 'answer', value: 0.4 }), l3 = K.applyOp(w, { op: 'law', group: 'culture', key: 'signalReach', value: 3 });
    ok(f.ok && w.laws.verse.forms.round && l1.ok && w.laws.verse.near === 0.8 && l2.ok && w.laws.mate.answer === 0.4 && l3.ok && w.laws.culture.signalReach === 3, 'it can add a form of verse and turn verse.near, mate.answer and culture.signalReach');
    ok(/"op":"tradition"/.test(K.OPS) && /"op":"verseform"/.test(K.OPS) && /verse is asked for by name on its occasions/.test(K.SEED) && /every people has a tradition/.test(K.SEED), 'the maker is told of both ops, and its roadmap says what Generation 27 added');
  }

  { /* ---- (8) seas ---- */
    const plain = SW.createWorld(7), sea = SW.createWorld(7, { seas: 1 });
    const tg = (w, i) => w.terrain[i] === T.VOID ? w.veil.t[i] : w.terrain[i];
    ok(!plain.seas && JSON.stringify(plain.terrain) === JSON.stringify(SW.createWorld(7).terrain), 'a world begun without seas is as it always was for its seed');
    ok(JSON.stringify(plain.regions.map(R => [R.name, R.x, R.y])) === JSON.stringify(sea.regions.map(R => [R.name, R.x, R.y])), 'the seas are laid by a chance of their own: the lands, their names and their hearts are those the seed gives without them');
    const count = w => { let open = 0, land = 0; for (let i = 0; i < w.W * w.H; i++) { if (w.terrain[i] === T.VOID) continue; if (w.terrain[i] === T.WATER && !(w.narrow && w.narrow[i])) open++; else if (w.terrain[i] !== T.WATER && w.terrain[i] !== T.SHALLOWS) land++; } return { open, land }; };
    const cp = count(plain), cs = count(sea);
    ok(cs.open > 700 && cp.open < 300 && cs.land > cp.land * 0.75, 'in the known land, water that only a vessel can cross: ' + cp.open + ' tiles without seas, ' + cs.open + ' with; the land left is ' + Math.round(100 * cs.land / cp.land) + '% of what it was');
    const O = sea.seas.plan.oceans, far = O[1];
    ok(O.length === 2 && far.isles.length === 2 && sea.seas.plan.lakes.length === 2, 'an ocean across the known land, a greater one beyond (half-width ' + far.half + ' against ' + O[0].half + ') with two islands, and two great lakes');
    SW.use(sea); const isle = I => { let n = 0; for (let y = I.y - 12; y <= I.y + 12; y++) for (let x = I.x - 12; x <= I.x + 12; x++) { if (y < 0 || y >= sea.H) continue; const t = tg(sea, SW.idx(sea, x, y)); if (t !== T.WATER && t !== T.SHALLOWS && Math.hypot(x - I.x, y - I.y) <= I.r + 2) n++; } return n; };
    const sizes = far.isles.map(isle);
    ok(sizes.every(n => n >= 90), 'the islands are large enough to live on: ' + sizes.join(' and ') + ' tiles of land (a founding band holds about thirty)');
    let both = 0; const seeds = [3, 7, 11, 42, 99, 5614]; seeds.forEach(s => { const w = SW.createWorld(s, { seas: 1 }); SW.use(w); const A = w.seas.plan.oceans[0], side = {}; w.agents.forEach(a => { side[SW.wdx(a.x - A.x) < 0 ? 'w' : 'e'] = 1; }); if (side.w && side.e) both++; });
    ok(both >= 4, 'in ' + both + ' of ' + seeds.length + ' seeds the founding peoples begin on both sides of the ocean, so meeting takes a crossing or the long way over the ice');
    const { w, st, em } = fresh(42, { seas: 1 }); const n0 = w.agents.length; for (let k = 0; k < 400; k++) { SW.step(w, em); M.tick(st); }
    ok(w.agents.filter(a => !a.dead).length >= n0 - 3 && M.buildPrompt(st, st.minds[w.agents[0].id], 'deep').length > 5000, 'a world with seas runs on (' + w.agents.filter(a => !a.dead).length + ' of ' + n0 + ' alive after 400 moments on instinct)');
    const snap = JSON.parse(JSON.stringify(M.snapshot(st))), back = M.restore(snap); ok(back.world.seas && back.world.seas.plan.oceans.length === 2 && JSON.stringify(back.world.terrain) === JSON.stringify(w.terrain), 'and is saved and loaded with its seas');
  }

  { /* ---- (9) a world saved by Generation 26 is carried on ---- */
    const snap = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-26.json.gz'))));
    const had = !!(snap.world.laws.traditions || snap.world.laws.verse || (snap.world.peoples[0] || {}).tradition);
    const old = M.restore(snap), w = old.world; SW.use(w);
    ok(!had && w.laws.traditions && w.laws.verse && w.peoples.every(P => w.laws.traditions[P.tradition]), 'a world saved by Generation 26 is given the traditions and the forms of verse, and each of its peoples a tradition (' + w.peoples.map(P => P.tradition).join(', ') + ')');
    ok(w.laws.mate.answer === 0.3 && w.laws.culture.bandPractice === 0.5 && w.laws.culture.signalReach === 2.5 && w.laws.recipes.tonic && !w.seas, 'and the new laws and recipes; it has no seas, and its land is as it was');
    const a = w.agents[0]; a.age = a.life * 0.95; a.nearing = 0;
    for (let k = 0; k < 300; k++) { SW.step(w, old.emit); M.tick(old); }
    const pr = M.buildPrompt(old, old.minds[a.id], 'routine');
    ok(w.agents.length > 0 && (/A VERSE IS ASKED OF YOU NOW/.test(pr) || a.dead) && /THE TRADITION OF YOUR PEOPLE/.test(M.buildPrompt(old, old.minds[w.agents.filter(o => !o.dead)[0].id], 'routine')) && K.stats(old).verseAndTraditions, 'it runs on, its elders are asked for their death poems and its minds are told their traditions');
    ok(M.digest(old).generation >= 27, 'and what it records says which generation ran it');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
