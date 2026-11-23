/* Generation 25. (1) What a being knows how to make is all before it, the most useful first: before, it saw the last six recipes added to the world,
   and in fourteen runs no one was told a raft could be made. (2) ... */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); SW.use(w); const ev = []; w.laws.weather.disaster = 0; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
const still = a => { a.policy = [{ if: [], do: 'linger' }]; a.plan = []; a.intent = null; a.e = 90; a.thirst = 0; };
const at = (w, o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; };
const think = (st, a, kind, d) => M.apply(st, st.minds[a.id], kind, Object.assign({ thought: 'x' }, d), {});
const run = (w, em, n, keep) => { for (let k = 0; k < n; k++) { w.creatures = []; (keep || []).forEach(o => { o.e = Math.max(o.e, 80); o.thirst = 0; o.hp = Math.max(o.hp, 80); }); SW.step(w, em); } };
const section = (p, head) => { const i = p.indexOf(head); return i < 0 ? '' : p.slice(i, p.indexOf('\n\n', i)); };
const T = SW.T;

(async () => {
  { /* ---- what can be made ---- */
    const { w, st, ev, em } = fresh(7), a = w.agents[0], m = st.minds[a.id], rc = w.laws.recipes, all = Object.keys(rc);
    a.knows = { rafts: 1, tools: 1, weaving: 1, fire: 1 }; a.wood = 6; a.things = {}; a.mk = {}; a.press = a.press || {}; a.press.water = 1.2;
    const known = all.filter(k => !rc[k].way || a.knows[rc[k].way]), old = known.slice(-6);
    ok(all.length >= 45 && known.length > 12 && old.indexOf('raft') < 0, 'the fault: of ' + known.length + ' things this being knows how to make it was shown the last six added to the world (' + old.join(', ') + '), and the raft is not among them');
    const mk = M.makeable(st, a), sec = section(M.buildPrompt(st, m, 'routine'), 'THINGS THAT CAN BE MADE OR DONE');
    ok(mk.full.length === 8 && mk.full[0].k === 'raft' && mk.full.concat(mk.more.map(k => ({ k }))).length === known.length && known.every(k => mk.full.some(q => q.k === k) || mk.more.indexOf(k) >= 0), 'now every one of the ' + known.length + ' is before it: eight in full, the raft first for one on whom water presses, the rest by name');
    ok(/- raft: [^\n]*Needs 6 wood\. YOU HAVE ALL IT NEEDS NOW\./.test(sec) && /- kayak: [^\n]*You lack: 2 meat carried\./.test(sec) && /You also know how to make: [^\n]*cloak/.test(sec) && sec.length < 2600, 'its mind is told what each needs and what it lacks for it this moment (' + sec.length + ' characters)');
    const none = Object.assign({}, a.knows); a.knows = {}; const few = M.makeable(st, a); a.knows = none;
    ok(few.full.every(q => !rc[q.k].way) && few.full.length + few.more.length === all.filter(k => !rc[k].way).length, 'one who knows no way is shown only what needs none');
    /* a mind that says make, build or craft a raft gets a raft */
    still(a); w.creatures = []; a.wood = 6;
    think(st, a, 'routine', { plan: [{ do: 'make', what: 'raft', ticks: 10 }] }); run(w, em, 3, [a]);
    ok(a.things.raft === 1 && a.wood === 0 && a.mk.raft === 1 && SW.floatOf(w, a) > 0 && ev.some(e => e.type === 'made' && e.what === 'raft'), 'a plan step make raft, written by a mind, makes a raft of six wood');
    const b = w.agents[1]; b.knows.rafts = 1; b.wood = 6; b.things = {}; still(b); const roofs = w.tally.built && w.tally.built.shelter || 0, sh = w.shelters.filter(Boolean).length;
    think(st, b, 'routine', { plan: [{ do: 'build', what: 'raft', ticks: 10 }] }); run(w, em, 3, [a, b]);
    ok(b.things.raft === 1 && w.shelters.filter(Boolean).length === sh, '"build raft" makes a raft too (before, it raised a shelter)');
    const c = w.agents[2]; c.knows.weaving = 1; c.wood = 2; c.things = {}; still(c);
    think(st, c, 'routine', { plan: [{ do: 'craft', what: 'basket', ticks: 10 }] }); run(w, em, 3, [a, b, c]);
    ok(c.things.basket === 1, 'and "craft basket" makes a basket');
    const d = w.agents[3]; d.knows.rafts = 1; d.wood = 2; d.things = {}; still(d);
    think(st, d, 'routine', { plan: [{ do: 'make', what: 'raft', ticks: 10 }] }); run(w, em, 3, [a, b, c, d]);
    ok(!d.things.raft && st.minds[d.id].events.some(e => /You tried "raft", but it needs 6 wood \(you have 2\)/.test(e.text)), 'one without the wood is told what is missing');
    /* what it has made and holds falls back, so the list moves on */
    const again = M.makeable(st, a);
    ok(again.full[0].k !== 'raft' && again.full.concat(again.more.map(k => ({ k }))).some(q => q.k === 'raft'), 'with a raft in hand the raft no longer leads the list, and is still on it');
    /* and the raft carries it over deep water */
    /* open water: most water lies within two steps of a shore or of shallows and can be swum; the heart of a lake cannot. Send one with a raft and
       one without to the middle of the widest heart there is. */
    const tt = (x, y) => w.terrain[SW.idx(w, x, y)], deep = (x, y) => tt(x, y) === T.WATER && !(w.narrow && w.narrow[SW.idx(w, x, y)]), wet = (x, y) => tt(x, y) === T.WATER || tt(x, y) === T.SHALLOWS;
    let spot = null;
    for (let y = 20; y < w.H - 20; y++) for (let x = 12; x < w.W - 40; x++) {
      if (!deep(x, y) || deep(x - 1, y)) continue; let n = 0; while (deep(x + n, y)) n++;
      let x0 = x - 1; while (x0 > x - 9 && wet(x0, y)) x0--;
      if (!wet(x0, y) && tt(x0, y) !== T.VOID && tt(x0, y) !== T.ROCK && (!spot || n > spot.n)) spot = { x0, y, n, tx: x + Math.floor(n / 2) };
    }
    if (spot) {
      at(w, a, spot.x0, spot.y); still(a); think(st, a, 'routine', { plan: [{ do: 'goto', x: spot.tx, y: spot.y, ticks: 200 }] });
      let got = false; for (let k = 0; k < 200 && !got; k++) { run(w, em, 1, [a]); got = a.x === spot.tx && a.y === spot.y; }
      ok(got && deep(a.x, a.y), 'with the raft it goes out to the middle of the heart of a lake (open water ' + spot.n + ' tiles across, which no one can swim)');
      const e = w.agents[4]; e.things = {}; at(w, e, spot.x0, spot.y); still(e); think(st, e, 'routine', { plan: [{ do: 'goto', x: spot.tx, y: spot.y, ticks: 150 }] });
      let out = 0, swum = 0; for (let k = 0; k < 150; k++) { run(w, em, 1, [a, e]); if (deep(e.x, e.y)) out++; if (tt(e.x, e.y) === T.WATER) swum++; }
      ok(out === 0, 'and one without a vessel never comes onto open water, though it swims the edge (' + swum + ' moments in the water)');
    } else ok(false, 'no open water was found in this world: the check did not run');
  }
  { /* ---- a being in the middle of a plan waits for it ---- */
    const { w, st, ev, em } = fresh(7); w.creatures = []; const a = w.agents[0], b = w.agents[1], m = st.minds[a.id], mb = st.minds[b.id];
    const quiet = o => { o.policy = [{ if: [], do: 'linger' }]; o.e = 95; o.thirst = 0; o.hp = 100; };
    const idle = n => { for (let k = 0; k < n; k++) { w.creatures = []; w.agents.forEach(quiet); SW.step(w, () => {}); M.tick(st); } }; /* the world goes on, and nothing is told to anyone */
    ok(st.settings.planWait === 180 && st.settings.v >= 13 && M.WEIGHTY === 3, 'a new setting: a being in the middle of a plan waits for it, up to 180 moments');
    think(st, a, 'routine', { plan: [{ do: 'linger', ticks: 300 }] }); m.urge = 0; b.plan = []; b.intent = null; mb.urge = 0;
    idle(40);
    ok(M.planLeft(a) >= 150 && !M.ready(st, m, a) && M.ready(st, mb, b), "after 40 quiet moments one with no plan is waiting to think, and one with " + M.planLeft(a) + " moments of plan still ahead is not");
    idle(100); const at140 = M.ready(st, m, a); idle(45);
    ok(!at140 && M.ready(st, m, a), 'left alone, the one with a plan comes to think after about 180 moments (not at 140, and by 185)');
    /* something weighty brings a thought at once; small things only bring it nearer */
    think(st, a, 'routine', { plan: [{ do: 'linger', ticks: 300 }] }); m.urge = 0; idle(5);
    M.tell(st, a.id, 'The sky cleared.', 1); const small = M.ready(st, m, a);
    M.tell(st, a.id, 'You harvested the last food from a berry plant, and the plant died.', 1); const two = M.ready(st, m, a);
    M.tell(st, a.id, 'Zichi said to you: "Come north with me."', 4);
    ok(!small && !two && M.ready(st, m, a), 'a small thing does not break into a plan, nor do two; being spoken to does');
    /* a plan that runs out brings a thought at once */
    think(st, a, 'routine', { plan: [{ do: 'linger', ticks: 6 }] }); m.urge = 0; for (let k = 0; k < 8; k++) { w.creatures = []; w.agents.forEach(quiet); SW.step(w, em); M.tick(st); }
    ok(M.planLeft(a) === 0 && M.ready(st, m, a) && m.events.some(e => /Your plan is now empty/.test(e.text)), 'when the plan runs out the being is waiting to think again at once');
    /* the clock of the world waits only for those who are waiting */
    st.on = true; st.sample = async () => ({ text: '{}' }); w.agents.forEach(o => { const q = st.minds[o.id]; q.lastT = w.tick - 200; q.urge = 1.2; o.intent = { do: 'linger', ticks: 250 }; o.plan = []; });
    const waitingForNone = M.pace(st); w.agents.forEach(o => { o.intent = null; o.plan = []; }); const waitingForAll = M.pace(st);
    ok(waitingForNone === 1 && waitingForAll < 0.2, 'the clock does not slow for beings who are in the middle of their plans (pace ' + waitingForNone + '), and slows as before for those whose plans have run out (' + waitingForAll + ')');
    /* turned off, it is as it was */
    st.settings.planWait = 0; think(st, a, 'routine', { plan: [{ do: 'linger', ticks: 300 }] }); m.urge = 0; idle(36);
    ok(M.ready(st, m, a) && /YOUR THOUGHTS COME about once every|YOUR PLAN:/.test(M.buildPrompt(st, m, 'routine')) && !/YOUR NEXT THOUGHT comes when your plan has run out/.test(M.buildPrompt(st, m, 'routine')), 'with the setting at 0 a being thinks on the clock alone, as before');
    st.settings.planWait = 180; const pr = M.buildPrompt(st, m, 'routine');
    ok(/YOUR NEXT THOUGHT comes when your plan has run out, or sooner if something happens that matters[^\n]*not for up to 180 moments/.test(pr), 'its mind is told when its next thought will come, and to plan as far as it can see');
    /* what brought each thought is in the record of the run */
    st.sample = async () => ({ text: JSON.stringify({ thought: 'I go on.', plan: null }) }); a.intent = { do: 'linger', ticks: 120 }; a.plan = [{ do: 'eat', ticks: 10 }]; m.urge = 3.4; m.busy = false;
    await M.think(st, m, 'routine'); const rec = st.rec.all.filter(r => r.t === 'thought').pop();
    ok(rec && rec.came && rec.came.left === 130 && rec.came.urge === 3.4, 'the record says of each thought how much plan was still ahead and how strong the wish was: ' + JSON.stringify(rec && rec.came));
    /* a world saved before carries its settings across */
    const snap = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-24.json.gz'))).toString()), had = !!snap.world.laws.buildings.pen, old = M.restore(snap);
    ok(old && old.settings.planWait === 180 && old.settings.v >= 13 && old.settings.thinkEvery === snap.settings.thinkEvery && old.settings.budget === snap.settings.budget, 'settings saved by the generation before are kept, and the new one takes its default');
    const oL = old.world.laws; SW.use(old.world);
    ok(!had && oL.buildings.pen && oL.buildings.weir.yields && oL.buildings.field.yields && oL.ecology.penReach === 3 && oL.ecology.seaReturn > 0 && oL.home.larder === 35 && M.makeable(old, old.world.agents[0]).full.length > 0 && SW.lacks(old.world, old.world.agents[0], 'raft') !== null, 'a world saved by the generation before is carried on with the pen, the weir, the field and the new laws');
    for (let k = 0; k < 300; k++) { SW.step(old.world, old.emit); M.tick(old); }
    ok(old.world.agents.length > 0 && K.stats(old).herdsFieldsAndVessels.animalsKept >= 0, 'and it runs on, and the maker can read its herds, fields and vessels');
  }
  /* helpers for the rest: bare ground, and a step of the world that keeps only the animals a check has placed */
  const bare = (w, i) => w.terrain[i] === T.GRASS && !w.plants[i] && !w.shelters[i] && !w.walls[i] && !w.stores[i] && !(w.lodes && w.lodes[i]);
  const patch = (w, n) => { for (let y = 30; y < w.H - 30; y++) for (let x = 20; x < w.W - 40; x++) { let good = true; for (let dy = -2; dy <= 2 && good; dy++) for (let dx = -2; dx < n + 2 && good; dx++) { const t = w.terrain[SW.idx(w, x + dx, y + dy)]; if (t === T.WATER || t === T.SHALLOWS || t === T.VOID || t === T.ROCK) good = false; } for (let d = 0; d < n && good; d++) if (!bare(w, SW.idx(w, x + d, y))) good = false; if (good) return { x, y }; } return null; };
  const beast = (w, kind, x, y, o) => { const c = SW.newCreature(w, kind, x, y, Object.assign({ age: w.laws.creatures[kind].matureAge + 10 }, o || {})); c.e = w.laws.creatures[kind].maxEnergy * 0.9; w.creatures.push(c); return c; };
  const go = (w, em, st, n, keepA, calm) => { for (let k = 0; k < n; k++) { w.creatures = w.creatures.filter(c => !c.dead && c.mine); w.creatures.forEach(c => { if (calm) c.e = Math.max(c.e, w.laws.creatures[c.sp].maxEnergy * 0.8); }); (keepA || []).forEach(o => { o.e = Math.max(o.e, 80); o.thirst = 0; o.hp = Math.max(o.hp, 80); }); SW.step(w, em); w.creatures.forEach(c => { if (c.owner != null || c.pen != null) c.mine = 1; }); } };
  const grazer = w => Object.keys(w.laws.creatures).find(k => { const q = w.laws.creatures[k]; return !q.predator && !q.sea && !q.retired && (q.tough || 1) <= 1 && (!q.home || q.home.indexOf('grass') >= 0); });

  { /* ---- a pen for a herd ---- */
    const { w, st, ev, em } = fresh(11); w.creatures = []; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0;
    const a = w.agents[0], b = w.agents[1], g = patch(w, 8), kind = grazer(w), others = w.agents.slice(2); others.forEach((o, k) => { still(o); at(w, o, g.x + 30 + k, g.y - 20); });
    ok(!!g && !!kind && w.laws.buildings.pen && w.laws.buildings.pen.way === 'herding' && SW.ACTIONS.indexOf('pen') >= 0 && SW.ACTIONS.indexOf('drive') >= 0, 'a pen is a kind of building of the way of herding, and pen and drive are acts a body knows');
    a.knows.herding = 1; a.wood = 20; still(a); still(b); at(w, a, g.x, g.y); at(w, b, g.x + 30, g.y - 22);
    think(st, a, 'routine', { plan: [{ do: 'build', what: 'pen', ticks: 5 }] }); go(w, em, st, 4, [a, b]);
    const pi = SW.idx(w, g.x, g.y);
    ok(SW.buildingAt(w, pi) === 'pen' && w.shelters[pi] === a.id && a.wood === 15, 'one who knows herding raises a pen of five wood');
    const c1 = beast(w, kind, g.x + 1, g.y + 1, { }), c2 = beast(w, kind, g.x + 2, g.y, { }), c3 = beast(w, kind, g.x + 1, g.y - 1, { }); [c1, c2, c3].forEach(c => { c.owner = a.id; c.keeper = a.id; c.mine = 1; });
    think(st, a, 'routine', { plan: [{ do: 'pen', ticks: 5 }] }); go(w, em, st, 3, [a, b], true);
    ok(c1.pen === pi && c2.pen === pi && w.tally.penned === 3 && st.minds[a.id].events.some(e => /You put 3 /.test(e.text)), 'with its three kept animals beside it, the plan step pen shuts them in, and its mind is told what that means');
    c3.pen = null; /* one is left loose, to see the difference */
    /* the keeper walks seven steps along the open ground (a kept animal follows by the straight way, so the way is kept clear) */
    w.laws.ecology.penReach = 1; think(st, a, 'routine', { plan: [{ do: 'goto', x: g.x + 7, y: g.y, ticks: 30 }] }); go(w, em, st, 30, [a, b], true); still(a); go(w, em, st, 60, [a, b], true);
    const far = o => SW.cheb(o.x, o.y, g.x, g.y), toKeeper = o => SW.cheb(o.x, o.y, a.x, a.y);
    ok(far(a) === 7 && far(c1) <= 2 && far(c2) <= 2 && toKeeper(c1) >= 5 && toKeeper(c3) <= 5 && far(c3) >= 3, 'the keeper walks seven steps off: the two in the pen stay by it (' + far(c1) + ' and ' + far(c2) + ' from the pen), and the one left loose has followed (' + toKeeper(c3) + ' from the keeper)');
    w.laws.ecology.penReach = 3;
    /* the herd outlives its keeper: whoever holds the pen keeps it */
    w.shelters[pi] = b.id; go(w, em, st, 3, [a, b], true);
    ok(c1.keeper === b.id && c1.pen === pi, 'when the pen passes to another, so does the herd in it');
    w.agents = w.agents.filter(o => o !== a); go(w, em, st, 5, [b], true);
    ok(c1.pen === pi && c1.owner != null && c3.owner == null, 'when the first keeper is gone, the loose animal goes wild and the penned ones are still kept');
    /* a pair kept together breeds; the young are born in the pen */
    const before = w.creatures.length; w.laws.ecology.penBreed = 400; c1.e = c2.e = 1e4; go(w, em, st, 400, [b], true);
    const young = w.creatures.filter(c => c !== c1 && c !== c2 && c !== c3 && c.pen === pi);
    ok(young.length >= 1 && young.every(c => c.owner != null), 'a pair kept together in the pen breeds, and the young are of the pen (' + young.length + ' born)');
    /* hunger: with nothing to graze within reach, an animal breaks out */
    w.laws.ecology.penBreed = 0; for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const i = SW.idx(w, g.x + dx, g.y + dy); w.plants[i] = null; }
    const R = w.laws.ecology.penReach; let out = 0; for (let k = 0; k < 80 && !out; k++) { w.creatures.forEach(c => { if (c.pen === pi) c.e = w.laws.creatures[c.sp].maxEnergy * 0.2; }); for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) w.plants[SW.idx(w, g.x + dx, g.y + dy)] = null; go(w, em, st, 1, [b], false); out = ev.filter(e => e.type === 'strayed').length; }
    ok(out >= 1 && st.minds[b.id].events.some(e => /broke out of the pen/.test(e.text)), 'an animal that finds nothing to eat within reach of the pen for long breaks out, and its keeper is told why');
  }
  { /* ---- a wild herd driven to the pen ---- */
    const { w, st, ev, em } = fresh(11); w.creatures = []; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0;
    const a = w.agents[0], g = patch(w, 8), kind = grazer(w), pi = SW.idx(w, g.x, g.y); w.agents.slice(1).forEach((o, k) => { still(o); at(w, o, g.x + 30 + k, g.y - 22); });
    still(a); at(w, a, g.x + 9, g.y); const herd = [beast(w, kind, g.x + 7, g.y), beast(w, kind, g.x + 7, g.y + 1), beast(w, kind, g.x + 6, g.y), beast(w, kind, g.x + 6, g.y - 1)]; herd.forEach(c => { c.mine = 1; });
    think(st, a, 'routine', { plan: [{ do: 'drive', ticks: 30 }] }); go(w, em, st, 2, [a], true);
    ok(st.minds[a.id].events.some(e => /You do not yet know how to drive a herd/.test(e.text)), 'one who does not know herding is told so');
    a.knows.herding = 1; think(st, a, 'routine', { plan: [{ do: 'drive', ticks: 30 }] }); go(w, em, st, 2, [a], true);
    ok(st.minds[a.id].events.some(e => /neither you nor your band holds a pen/.test(e.text)), 'with no pen to drive them to, it is told to build one');
    w.shelters[pi] = a.id; w.bkind[pi] = 'pen';
    herd.forEach((c, k) => { at(w, c, g.x + 7 - (k % 2), g.y + (k > 1 ? 1 : 0)); }); at(w, a, g.x + 9, g.y);
    think(st, a, 'routine', { plan: [{ do: 'drive', ticks: 120 }] }); go(w, em, st, 120, [a], true);
    const kept = herd.filter(c => c.pen === pi && c.owner != null).length;
    ok(kept >= 3 && w.tally.driven === kept && st.minds[a.id].events.some(e => /You drove \d+ wild/.test(e.text)) && st.chron.some(c => /drove \d+ wild .* into a pen/.test(c.text)), 'the plan step drive moves the wild herd to the pen, and those that reach it are kept (' + kept + ' of 4)');
    /* against a herd left alone */
    const { w: w2, st: st2, em: em2 } = fresh(11); w2.creatures = []; w2.laws.ecology.herd = 0; w2.laws.ecology.pack = 0; const a2 = w2.agents[0]; w2.agents.slice(1).forEach((o, k) => { still(o); at(w2, o, g.x + 30 + k, g.y - 22); });
    a2.knows.herding = 1; still(a2); at(w2, a2, g.x + 9, g.y); w2.shelters[pi] = a2.id; w2.bkind[pi] = 'pen'; const h2 = [beast(w2, kind, g.x + 7, g.y), beast(w2, kind, g.x + 6, g.y), beast(w2, kind, g.x + 7, g.y + 1), beast(w2, kind, g.x + 6, g.y + 1)]; h2.forEach(c => { c.mine = 1; });
    go(w2, em2, st2, 120, [a2], true);
    ok(h2.every(c => c.pen == null && c.owner == null), 'a herd no one drives is not kept, though the pen stands beside it');
  }
  { /* ---- works that yield, and the larder ---- */
    const { w, st, ev, em } = fresh(11); w.creatures = []; w.laws.ecology.herd = 0; w.laws.ecology.pack = 0;
    const a = w.agents[0], b = w.agents[1], c = w.agents.find(o => o.people !== a.people) || w.agents[2];
    /* bare ground at the edge of water, with more bare ground three steps inland for a store */
    let spot = null; const wet = (x, y) => { const t = w.terrain[SW.idx(w, x, y)]; return t === T.WATER || t === T.SHALLOWS; };
    for (let y = 30; y < w.H - 30 && !spot; y++) for (let x = 20; x < w.W - 40 && !spot; x++) { if (!bare(w, SW.idx(w, x, y)) || !(wet(x + 1, y) || wet(x - 1, y) || wet(x, y + 1) || wet(x, y - 1))) continue; for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-3, -3], [3, 3]]) if (!spot && bare(w, SW.idx(w, x + dx, y + dy)) && !wet(x + dx, y + dy)) spot = { x, y, sx: x + dx, sy: y + dy }; }
    const dry = patch(w, 8);
    ok(!!spot && !!dry && w.laws.buildings.weir.yields.food === 'fish' && w.laws.buildings.field.yields.food === 'grain' && SW.ACTIONS.indexOf('tend') >= 0, 'a weir and a field are kinds of building that yield, and tend is an act a body knows');
    w.agents.forEach((o, k) => { still(o); if (o !== a && o !== b && o !== c) at(w, o, dry.x + 20 + k, dry.y - 20); });
    a.knows.fishing = 1; a.knows.farming = 1; a.knows.storage = 1; a.wood = 30; a.stone = 10; a.carry = []; at(w, a, dry.x, dry.y);
    think(st, a, 'routine', { plan: [{ do: 'build', what: 'weir', ticks: 5 }] }); go(w, em, st, 3, [a]);
    ok(SW.buildingAt(w, SW.idx(w, dry.x, dry.y)) !== 'weir' && st.minds[a.id].events.some(e => /A weir must stand at the edge of water/.test(e.text)), 'a weir cannot be raised away from water, and the builder is told why');
    at(w, a, spot.x, spot.y); think(st, a, 'routine', { plan: [{ do: 'build', what: 'weir', ticks: 5 }] }); go(w, em, st, 3, [a]);
    const wi = SW.idx(w, spot.x, spot.y);
    ok(SW.buildingAt(w, wi) === 'weir' && w.shelters[wi] === a.id, 'at the edge of water one who knows fishing raises a weir of four wood');
    go(w, em, st, 200, [a]);
    ok(!w.tended && !(w.tally.yielded && w.tally.yielded.weir), 'a weir no one tends gives nothing');
    /* tended, with no store near: it keeps a little, for whoever tends it next */
    at(w, a, spot.x, spot.y); think(st, a, 'routine', { plan: [{ do: 'tend', ticks: 5 }] }); go(w, em, st, 2, [a]);
    ok(w.tended && w.tended[wi] && a.stats.tended === 1 && st.minds[a.id].events.some(e => /You tended the weir/.test(e.text)), 'the plan step tend, written by a mind, tends it');
    for (let k = 0; k < 9; k++) { go(w, em, st, 70, [a]); w.tended[wi].at = w.tick; }
    ok(w.tended[wi].has === w.laws.buildings.weir.yields.holds && w.tally.yielded.weir === 6, 'with no store near it keeps its catch at the weir, and no more than six');
    at(w, a, spot.x, spot.y); think(st, a, 'routine', { plan: [{ do: 'tend', ticks: 5 }] }); go(w, em, st, 2, [a]);
    ok(a.carry.filter(q => q.k === 'fish').length >= 4 && w.tended[wi].has < 6, 'and the one who tends it next takes what it kept (' + a.carry.filter(q => q.k === 'fish').length + ' fish in hand)');
    /* with a store of its holder within eight steps, the catch goes there */
    a.carry = []; at(w, a, spot.sx, spot.sy); think(st, a, 'routine', { plan: [{ do: 'build', what: 'store', ticks: 5 }] }); go(w, em, st, 3, [a]);
    const si = SW.idx(w, spot.sx, spot.sy); w.tended[wi].has = 0; w.tended[wi].at = w.tick; const y0 = w.tally.yielded.weir;
    for (let k = 0; k < 4; k++) { go(w, em, st, 70, [a]); w.tended[wi].at = w.tick; }
    const inStore = w.stores[si] ? w.stores[si].items.filter(q => q.k === 'fish').length : -1;
    ok(w.stores[si] && w.stores[si].by === a.id && inStore >= 3 && inStore === w.tally.yielded.weir - y0 && w.tended[wi].has === 0, 'with a store of its holder within eight steps, the catch is laid there (' + inStore + ' fish in the store after 280 moments)');
    /* left untended for two days it stops */
    const y1 = w.tally.yielded.weir; go(w, em, st, 700, [a]);
    ok(w.tally.yielded.weir - y1 <= 8 && w.tick - w.tended[wi].at > 480, 'left untended it gives for two days more and then stops (' + (w.tally.yielded.weir - y1) + ' more fish in 700 moments, where tended it would have given 11)');
    /* the larder: one's own eat from it when hungry, a stranger only when starving */
    w.stores[si].items = []; for (let k = 0; k < 10; k++) w.stores[si].items.push({ k: 'fish', n: w.laws.water.fishFood });
    b.leader = a.id; const near = (o, dx) => { at(w, o, spot.sx + dx, spot.sy); o.carry = []; o.plan = []; o.intent = null; o.policy = [{ if: [], do: 'linger' }]; };
    near(b, 1); near(c, -1); b.e = 30; c.e = 30; c.leader = null; a.e = 90;
    for (let k = 0; k < 6; k++) { w.creatures = []; SW.step(w, em); b.thirst = 0; c.thirst = 0; }
    const bTook = 10 - w.stores[si].items.length;
    ok(bTook >= 1 && c.carry.length === 0 && c.e < 31, 'one of the keeper\'s band, hungry at 30, eats from the store as from a larder; a stranger at 30 does not (' + bTook + ' taken)');
    near(c, -1); c.e = 10; for (let k = 0; k < 6; k++) { w.creatures = []; SW.step(w, em); c.thirst = 0; }
    ok(w.stores[si].items.length < 10 - bTook || c.e > 12, 'starving, the stranger takes too, as before');
    /* a field gives grain in summer and autumn */
    const { w: w3, st: st3, ev: ev3, em: em3 } = fresh(11); w3.creatures = []; const f = w3.agents[0]; w3.agents.forEach((o, k) => { still(o); if (o !== f) at(w3, o, dry.x + 20 + k, dry.y - 20); });
    f.knows.farming = 1; f.knows.storage = 1; f.wood = 20; f.stone = 10; f.carry = []; at(w3, f, dry.x, dry.y); const D = w3.laws.time.dayLength, SD = w3.laws.time.seasonDays;
    think(st3, f, 'routine', { plan: [{ do: 'build', what: 'field', ticks: 5 }] }); go(w3, em3, st3, 3, [f]);
    at(w3, f, dry.x + 2, dry.y); think(st3, f, 'routine', { plan: [{ do: 'build', what: 'store', ticks: 5 }] }); go(w3, em3, st3, 3, [f]);
    const fi = SW.idx(w3, dry.x, dry.y), fs2 = SW.idx(w3, dry.x + 2, dry.y);
    at(w3, f, dry.x + 1, dry.y); w3.tick = D * SD + 20; /* summer */ think(st3, f, 'routine', { plan: [{ do: 'tend', ticks: 5 }] }); go(w3, em3, st3, 2, [f]);
    for (let k = 0; k < 4; k++) { go(w3, em3, st3, 80, [f]); w3.tended[fi].at = w3.tick; }
    const grain = w3.stores[fs2] ? w3.stores[fs2].items.filter(q => q.k === 'grain').length : -1;
    w3.tick = D * SD * 3 + 20; /* winter */ w3.tended[fi].at = w3.tick; const yw = w3.tally.yielded.field; for (let k = 0; k < 4; k++) { go(w3, em3, st3, 80, [f]); w3.tended[fi].at = w3.tick; }
    ok(SW.buildingAt(w3, fi) === 'field' && SW.season(w3) === 3 && grain >= 3 && w3.tally.yielded.field === yw, 'a tended field lays grain in its holder\'s store through summer (' + grain + ' in 320 moments) and nothing in winter');
  }
  { /* ---- the sea gives back ---- */
    const { w, st, ev, em } = fresh(11); const sea = k => w.laws.creatures[k] && w.laws.creatures[k].sea, count = () => w.creatures.filter(c => !c.dead && sea(c.sp)).length;
    w.creatures = w.creatures.filter(c => !sea(c.sp)); w.agents.forEach(still);
    w.laws.ecology.seaReturn = 0; for (let k = 0; k < 300; k++) SW.step(w, em);
    const none = count(); w.laws.ecology.seaReturn = 0.2; for (let k = 0; k < 300; k++) SW.step(w, em);
    const back = w.creatures.filter(c => !c.dead && sea(c.sp));
    ok(none === 0 && back.length >= 1 && back.every(c => { const t = w.terrain[SW.idx(w, c.x, c.y)]; return t === T.WATER || t === T.SHALLOWS; }) && w.tally.seaReturned >= 1 && ev.some(e => e.type === 'herdcame' && e.sea) && st.chron.some(c => /came in again from the open sea/.test(c.text)), 'with every creature of the sea gone, none comes back while the law is at nothing, and ' + back.length + ' come in on the water once it is not');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
