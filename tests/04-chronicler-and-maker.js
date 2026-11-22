const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x != null ? '  [' + x + ']' : '')); if (!c) fails++; };
(async () => {
  const w = SW.createWorld(7), st = M.createState(w); let reply = {}, prompts = [];
  st.sample = async (p, o) => { prompts.push({ p, o }); return { text: 'Here you go:\n' + JSON.stringify(reply) }; };
  st.ui = () => {}; st.on = true;
  for (let i = 0; i < 800; i++) { SW.step(w, st.emit); M.tick(st); }
  SW.speak(w, w.agents[0], w.agents[1].name, 'The grain is mine.', st.emit);
  /* chronicler */
  reply = { title: 'Three bands wake', text: 'They woke and ate. ' + 'More happened. '.repeat(20), threads: [{ name: 'Brukel and Yeba', kind: 'rivalry', text: 'Brukel claimed the grain.' }, { bad: 1 }], trends: ['No one has built anything (0 shelters).'] };
  const ch = await K.tell(st);
  ok('the chronicler writes a chapter with threads and trends', ch && st.story.chapters.length === 1 && st.story.threads.length === 1 && st.story.trends.length === 1 && st.story.last === w.tick, ch && ch.title);
  ok('its prompt carries the record, the people and the numbers', /WHAT HAPPENED/.test(prompts[0].p) && /THE PEOPLE NOW/.test(prompts[0].p) && /The grain is mine/.test(prompts[0].p) && /"alive":15/.test(prompts[0].p) && prompts[0].o.model === 'claude-sonnet-5-5', prompts[0].p.length + ' chars');
  const s0 = K.stats(st); ok('the numbers are computed', s0.alive === 15 && s0.plants > 100 && typeof s0.events.gifts === 'number' && s0.energyMedian > 0, JSON.stringify(s0).length + ' bytes');
  /* each kind of change, with bounds */
  const L = w.laws, t = (op) => K.applyOp(w, op);
  const a1 = t({ op: 'law', group: 'body', key: 'baseDrain', value: 99 }); ok('a law moves at most to double', a1.ok && L.body.baseDrain === 0.17, a1.text);
  t(a1.undo); ok('and can be put back', L.body.baseDrain === 0.085);
  ok('fixed or unknown laws are refused', !t({ op: 'law', group: 'time', key: 'dayLength', value: 10 }).ok && !t({ op: 'law', group: 'nope', key: 'x', value: 1 }).ok && !t({ op: 'law', group: 'body', key: 'nope', value: 1 }).ok);
  const a2 = t({ op: 'plant', name: 'Moon Wort!', base: 'sunleaf', nutrition: 3, soil: { forest: 1, bogus: 9 }, fx: [{ on: 'vigor', times: 9, for: 99999 }, { on: 'fear', by: -0.4 }], sow: 20 });
  ok('a new herb is made, clipped to bounds, and sown', a2.ok && L.plants.moonwort && L.plants.moonwort.fx[0].times === 2.5 && L.plants.moonwort.fx[0].for === 720 && !L.plants.moonwort.heal && w.plants.filter(p => p && p.sp === 'moonwort').length > 5, a2.text);
  const a3 = t({ op: 'creature', name: 'boar', base: 'hornback', set: { speed: 99, gore: 30, predator: 1, nope: 4 }, n: 6 });
  ok('a new animal is made within 0.4x to 2.5x of its base and arrives', a3.ok && L.creatures.boar.speed <= L.creatures.hornback.speed * 2.5 + 1e-9 && !L.creatures.boar.predator === !L.creatures.hornback.predator && w.creatures.filter(c => c.sp === 'boar').length > 0, a3.text + ' speed ' + L.creatures.boar.speed);
  ok('a mix needs two real, different plants', t({ op: 'mix', name: 'calm draught', of: ['moonwort', 'berry'], fx: [{ on: 'anger', by: -0.5 }] }).ok && !t({ op: 'mix', name: 'x', of: ['berry', 'berry'], fx: [{ on: 'joy', by: 1 }] }).ok && !t({ op: 'mix', name: 'x', of: ['berry', 'nope'], fx: [{ on: 'joy', by: 1 }] }).ok);
  const a5 = t({ op: 'site', name: 'The Humming Stone', kind: 'spirit', on: 'rock', r: 9, fx: [{ on: 'learning', times: 2, for: 480 }] }); ok('a place of power is set on the asked ground', a5.ok && w.sites.length === 1 && w.sites[0].r === 3 && SW.TERRAIN[w.terrain[w.sites[0].y * w.W + w.sites[0].x]] === 'rock', a5.text);
  const a6 = t({ op: 'way', id: 'herblore', tree: 'life', needs: ['farming', 'nope'], lore: 1, stat: 'mixed', n: 2, hint: 'knowing what plants do together' }); ok('a new way joins the tree', a6.ok && L.tree.herblore.needs.length === 1 && !t({ op: 'way', id: 'x', stat: 'nostat' }).ok);
  const a7 = t({ op: 'recipe', name: 'Night Vigil', way: null, needs: { wood: 2, fire: true, night: true, beings: 2, bogus: 1 }, gives: { thing: 'vigil knot', fxAll: [{ on: 'fear', by: -0.6 }, { on: 'toughness', times: 1.3, for: 240 }] }, hint: 'Keep a fire through the dark with others.' });
  ok('a ceremony is defined as a recipe', a7.ok && L.recipes['night vigil'].needs.beings === 2 && L.recipes['night vigil'].gives.fxAll.length === 2 && !t({ op: 'recipe', name: 'empty', gives: {} }).ok, a7.text);
  ok('beings read about it, and are not told what it does', /THINGS THAT CAN BE MADE OR DONE/.test(M.buildPrompt(st, st.minds[w.agents[0].id], 'routine')) && /night vigil: Keep a fire/.test(M.buildPrompt(st, st.minds[w.agents[0].id], 'routine')) && !/toughness/.test(M.buildPrompt(st, st.minds[w.agents[0].id], 'routine')));
  ok('an unknown kind of change is refused', !t({ op: 'explode' }).ok && !t(null).ok);
  /* the trial world */
  const good = K.trial(w, [{ op: 'law', group: 'water', key: 'fishChance', value: 0.12 }], 240), bad = K.trial(w, [{ op: 'plant', name: 'deathcap', base: 'berry', nutrition: 20, fx: [{ on: 'health', by: -40 }, { on: 'energy', by: -60 }], soil: { grass: 1, forest: 1, sand: 1, marsh: 1 }, sow: 40 }, { op: 'law', group: 'body', key: 'baseDrain', value: 9 }, { op: 'law', group: 'body', key: 'nightCold', value: 9 }], 480);
  ok('a harmless change passes the trial; the real world is untouched by trials', good.ok && L.water.fishChance === 0.09 && !L.plants.deathcap, JSON.stringify(good));
  console.log('   (harsh trial result: ' + JSON.stringify(bad) + ')');
  /* the maker's visit */
  reply = { seen: 'Nobody is in danger and nothing is scarce.', review: [], changes: [{ op: 'law', group: 'ecology', key: 'bounty', value: 0.4 }, { op: 'site', name: 'Cold Spring', kind: 'spring', on: 'forest', fx: [{ on: 'health', by: 20 }] }, { op: 'explode' }, { op: 'law', group: 'body', key: 'baseDrain', value: 0.2 }], predict: 'Energy median falls below 70 by day 12.', ideas: { add: ['salt licks that draw herds'], done: [2], drop: [1] }, lesson: 'Plenty makes for peace and boredom.', requests: ['Animals need to mate in pairs; I cannot express that.'] };
  const v1 = await K.make(st);
  ok('the maker applies at most three changes, each within bounds, and refuses nonsense', v1 && v1.ops.length === 2 && v1.refused.length === 1 && L.ecology.bounty === 0.4 && w.sites.length === 2 && L.body.baseDrain === 0.085, JSON.stringify(v1.ops) + ' refused ' + JSON.stringify(v1.refused));
  ok('it keeps a notebook: ideas, a lesson, a request to the programmer', st.maker.ideas.length === K.SEED.length + 1 && st.maker.ideas[1].status === 'done' && st.maker.ideas[0].status === 'open' && st.maker.lessons.length === 1 && st.maker.requests.length === 1 && st.rec.all.some(r => r.t === 'request') && st.rec.all.some(r => r.t === 'maker'));
  const mp = prompts[prompts.length - 1]; ok('its prompt has the story, numbers, parts, notebook and catalogue, on Opus', /THE STORY SO FAR/.test(mp.p) && /Three bands wake/.test(mp.p) && /baseDrain=0.085/.test(mp.p) && /moonwort/.test(mp.p) && /YOUR NOTEBOOK/.test(mp.p) && /tribal bonds/.test(mp.p) && /"op":"recipe"/.test(mp.p) && mp.o.model === 'claude-opus-5-5' && mp.o.effort === 'high', mp.p.length + ' chars');
  reply = { seen: 'Too harsh.', review: [{ id: v1.id, keep: false, why: 'Two starved.' }], changes: [], predict: 'Recovery.', ideas: {}, lesson: null, requests: [] };
  const v2 = await K.make(st);
  ok('at its next visit it can undo what it did', st.maker.log[0].verdict === 'undone' && L.ecology.bounty === 0.5 && w.sites.length === 1 && v2.verdict === 'nothing', 'bounty ' + L.ecology.bounty);
  /* tales */
  const a = w.agents[0], b = w.agents[1], m = st.minds[a.id]; b.x = a.x + 1; b.y = a.y;
  reply = { thought: 'I look back on the first winter and what it took from us.', tale: { title: 'The First Winter', text: 'When the berries withered we ate fish from the river and lived.' }, teach: { to: b.name, lesson: 'Remember the winter.', tale: 'the first winter' } };
  await M.think(st, m, 'deep');
  ok('a being makes a tale and tells it on; the hearer carries it with its teller named', m.tales.length === 1 && (st.minds[b.id].tales || []).length === 1 && st.minds[b.id].tales[0].from === a.name && /TALES YOU CARRY/.test(M.buildPrompt(st, st.minds[b.id], 'routine')), JSON.stringify(st.minds[b.id].tales));
  /* the world keeps running with all of it, and survives a save */
  for (let i = 0; i < 1500; i++) { SW.step(w, st.emit); M.tick(st); }
  const st2 = M.restore(JSON.parse(JSON.stringify(M.snapshot(st)))); for (let i = 0; i < 300; i++) SW.step(st2.world, st2.emit);
  ok('everything survives a save and reload', st2.story.chapters.length === 1 && st2.maker.log.length === 2 && st2.world.sites.length === 1 && !!st2.world.laws.recipes['night vigil'] && !!st2.world.laws.plants.moonwort && st2.world.agents.length > 0, st2.world.agents.length + ' alive');
  st.on = true; st.story.lastDay = SW.day(w) - 5; K.tick(st); ok('the chronicler is called when a chapter is due', K.busy === 'story'); await new Promise(r => setTimeout(r, 20));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
})().catch(e => { console.error('CRASH', e.stack); process.exit(1); });
