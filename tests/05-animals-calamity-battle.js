const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); const ev = []; return { w, st, ev, em: e => { ev.push(e); st.emit(e); } }; };
{ // drives
  const { w, st } = fresh(7); for (let i = 0; i < 300; i++) { SW.step(w, st.emit); M.tick(st); }
  const a = w.agents[0], b = w.agents[1], c = w.agents[2], m = st.minds[a.id];
  a.leader = b.id; a.temperament.bold = 0.8; a.rel[b.id] = 0.9; b.x = a.x + 1; b.y = a.y; c.x = b.x; c.y = b.y + 1; b.rel[c.id] = 0.9; b.rel[a.id] = 0.3; a.stats.stolen = 3; a.temperament.honest = 0.9; m.dull = 4; a.e = 90; a.hp = 100;
  let d = M.drives(st, m, a, SW.look(w, a)).map(q => q.k);
  ok(d.includes('purpose') && d.includes('jealousy') && d.includes('freedom'), 'new drives speak: ' + d.join(', '));
  w.laws.drives.jealousy = 0; ok(!M.drives(st, m, a, SW.look(w, a)).some(q => q.k === 'jealousy'), 'the drives law silences a drive');
  ok(K.applyOp(w, { op: 'law', group: 'drives', key: 'purpose', value: 1.8 }).ok, 'the maker can tune a drive');
}
{ // disasters
  const { w, st, ev, em } = fresh(7); const i = w.terrain.findIndex(t => t === 3), x = i % w.W, y = Math.floor(i / w.W);
  const a = w.agents[0]; a.x = x; a.y = y; for (let k = 0; k < 9; k++) { const j = i + (k % 3) - 1 + (Math.floor(k / 3) - 1) * w.W; if (!w.plants[j] && w.terrain[j] === 3) w.plants[j] = { sp: Object.keys(w.laws.plants)[0], g: 1, food: 2 }; }
  const p0 = w.plants.filter(Boolean).length, hp0 = a.hp; const r = SW.disaster(w, 'wildfire', em, x, y);
  ok(r.lost > 0 && w.plants.filter(Boolean).length < p0 && a.hp < hp0, 'wildfire burns plants and people (lost ' + r.lost + ', health ' + Math.round(hp0) + '→' + Math.round(a.hp) + ')');
  ok(st.chron.some(q => /WILDFIRE/.test(q.text)) && st.minds[a.id].events.some(e => /WILDFIRE/.test(e.text)), 'it is chronicled and those near are told');
  w.shelters[i] = a.id; let fell = 0; for (let k = 0; k < 12 && !fell; k++) fell = SW.disaster(w, 'quake', em, x, y).down; ok(fell > 0, 'a quake brings down buildings');
  ok(SW.disaster(w, 'plague', em).hit > 0, 'a plague sickens'); ok(K.applyOp(w, { op: 'event', kind: 'locusts' }).ok && K.applyOp(w, { op: 'event', kind: 'weather', sky: 'drought', days: 2 }).ok && w.weather.kind === 'drought', 'the maker can send locusts and turn the sky');
}
{ // chained tools
  const { w, em, ev } = fresh(7); const a = w.agents[0];
  ok(K.applyOp(w, { op: 'recipe', name: 'carve needle', way: 'tools', needs: { tool: 'hunt', wood: 1 }, gives: { thing: 'needle' }, hint: 'x' }).ok && w.laws.recipes['carve needle'].needs.tool === 'hunt', 'a recipe can call for a tool');
  a.knows.tools = a.knows.tools || { look: null }; a.wood = 3; a.tools = []; a.policy = []; a.plan = [{ do: 'make', what: 'carve needle', ticks: 3 }]; a.intent = null; for (let k = 0; k < 4; k++) { a.e = 90; SW.step(w, em); }
  ok(!(a.things || {}).needle && ev.some(e => e.type === 'fail' && /tool for hunt/.test(e.text)), 'without the tool it fails and says why');
  w.laws.tools.spear = { use: 'hunt', power: 1.5, wear: 0.1, wood: 1, stone: 0, by: a.id }; const tk = 'spear'; a.tools = [{ k: tk, w: 5, u: 5 }]; a.plan = [{ do: 'make', what: 'carve needle', ticks: 3 }]; a.intent = null; for (let k = 0; k < 4; k++) { a.e = 90; SW.step(w, em); }
  ok((a.things || {}).needle >= 1, 'with the tool it is made' + (tk ? '' : ' (no hunting tool exists)'));
}
{ // taming, pens, pairs
  const { w, st, ev, em } = fresh(7); const a = w.agents[0]; a.policy = [{ if: [], do: 'linger' }]; w.creatures = w.creatures.filter(c => !w.laws.creatures[c.sp].predator);
  const g = w.creatures.find(c => c.sp === 'hopper'); g.age = 300;
  for (let k = 0; k < 60 && g.owner == null; k++) { a.e = 90; a.carry = [{ k: 'berry', n: 4 }]; a.intent = null; a.plan = [{ do: 'tame', ticks: 3 }]; g.x = a.x + 1; g.y = a.y; g.e = 50; SW.step(w, em); SW.step(w, em); }
  ok(g.owner != null && g.keeper === a.id, 'an animal can be tamed'); ok(/ANIMALS THAT ARE YOURS/.test(M.buildPrompt(st, st.minds[a.id], 'routine')), 'its keeper is told what is theirs');
  const tx = Math.max(2, Math.min(w.W - 3, a.x + (a.x > 48 ? -8 : 8))); a.x = tx; for (let k = 0; k < 60; k++) { a.e = 90; g.e = 50; SW.step(w, em); } ok(!g.dead && SW.cheb(g.x, g.y, a.x, a.y) <= 5, 'it keeps near its keeper (' + SW.cheb(g.x, g.y, a.x, a.y) + ' steps)');
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const j = (g.y + dy) * w.W + g.x + dx; w.walls[j] = a.id; } const gx = g.x, gy = g.y; a.x = Math.max(2, Math.min(w.W - 3, a.x + (a.x > 48 ? -14 : 14)));
  for (let k = 0; k < 120; k++) { a.e = 90; g.e = 50; SW.step(w, em); } ok(g.x === gx && g.y === gy, 'a ring of wall holds it though its keeper walks away');
  const w2 = SW.createWorld(3); w2.laws.weather.herd = 0; w2.laws.weather.pack = 0; Object.keys(w2.laws.creatures).forEach(k => { w2.laws.creatures[k].migrate = 0; }); w2.creatures = w2.creatures.filter(c => c.sp === w2.creatures[0].sp).slice(0, 1); const lone = w2.creatures[0]; let born = 0; for (let k = 0; k < 1500; k++) { lone.e = 99; lone.age = 999; SW.step(w2, e => { if (e.type === 'cbirth' || e.type === 'born') born++; }); } ok(w2.creatures.filter(c => c.sp === lone.sp).length <= 1, 'an animal alone does not breed');
  const w3 = SW.createWorld(3); w3.laws.weather.herd = 0; w3.laws.weather.pack = 0; Object.keys(w3.laws.creatures).forEach(k => { w3.laws.creatures[k].migrate = 0; }); const sp3 = w3.creatures.find(c => !w3.laws.creatures[c.sp].predator).sp; w3.creatures = w3.creatures.filter(c => c.sp === sp3).slice(0, 2); w3.creatures[1].x = w3.creatures[0].x; w3.creatures[1].y = w3.creatures[0].y; for (let k = 0; k < 1500 && w3.creatures.length < 3; k++) { w3.creatures.slice(0, 2).forEach(c => { c.e = 99; c.age = 999; }); if (SW.cheb(w3.creatures[0].x, w3.creatures[0].y, w3.creatures[1].x, w3.creatures[1].y) > 3) { w3.creatures[1].x = w3.creatures[0].x; w3.creatures[1].y = w3.creatures[0].y; } SW.step(w3); } ok(w3.creatures.length >= 3, 'a pair kept together does');
}
{ // battle
  const { w, st, ev, em } = fresh(7); const L = w.agents[3], f = w.agents[4], foe = w.agents[6]; w.laws.status.leadNeeds = 0; L.stats.built = 20; SW.pledge(w, f, L.name, em); { let gi = 0; for (let i = w.W * 10; i < w.terrain.length - w.W * 10; i++) if ([0, 1, 2, 3, 4].every(d => w.terrain[i + d] === 2)) { gi = i; break; } L.x = gi % w.W; L.y = Math.floor(gi / w.W); } w.creatures = []; f.x = L.x + 1; f.y = L.y; foe.x = L.x + 3; foe.y = L.y; L.policy = []; L.plan = [{ do: 'rally', name: foe.name, ticks: 5 }]; L.intent = null;
  for (let k = 0; k < 12; k++) { L.e = 90; f.e = 90; SW.step(w, em); }
  ok(ev.some(e => e.type === 'rallied') && ev.filter(e => e.type === 'attack' && e.b === foe.id && e.a === f.id).length > 0, 'a leader calls the band to battle and the follower fights'); ok(st.chron.some(c => /into battle/.test(c.text)), 'the battle is chronicled');
  f.plan = [{ do: 'rally', ticks: 3 }]; f.intent = null; const n0 = ev.filter(e => e.type === 'rallied').length; for (let k = 0; k < 4; k++) SW.step(w, em); ok(ev.filter(e => e.type === 'rallied').length === n0, 'a follower cannot call a battle');
}
{ // seasons lived, written record, lore sources, mourners
  const { w, st, ev, em } = fresh(11); for (let k = 0; k < 760; k++) { SW.step(w, em); M.tick(st); }
  const a = w.agents[0], m = st.minds[a.id]; ok(m.seasons && m.seasons.length === 1 && /Year 1, spring/.test(m.seasons[0]), 'a season lived is kept: ' + (m.seasons || [])[0]);
  ok(/THE SEASONS YOU HAVE LIVED/.test(M.buildPrompt(st, m, 'routine')), 'and shown to its mind');
  a.knows.signs = { look: null }; a.knows.writing = { look: null }; a.wood = 5; const ri = w.terrain.findIndex(t => t === 4); a.x = ri % w.W; a.y = Math.floor(ri / w.W); const txt = 'Winter comes after the third season. '.repeat(9); a.policy = []; a.plan = [{ do: 'mark', text: txt, ticks: 3 }]; a.intent = null; for (let k = 0; k < 3; k++) { a.e = 90; SW.step(w, em); }
  const mk = w.marks.filter(q => q.by === a.id).pop(); ok(mk && mk.text.length > 300 && mk.carved && mk.until - mk.tick > 5 * w.laws.craft.markLife * w.laws.craft.signLife, 'a sign cut in rock holds a long text and lasts (' + (mk ? mk.text.length : 0) + ' characters)');
  a.loreWhy = 'reflection'; a.lore += 0.3; SW.step(w, em); ok(w.loreBy && w.loreBy.reflection > 0 && K.stats(st).events.loreGainedBy.reflection > 0, 'the source of each gain in understanding is tallied: ' + JSON.stringify(w.loreBy));
  const b = w.agents[1], c = w.agents[2]; c.rel[b.id] = 0.8; c.x = b.x; c.y = b.y; b.hp = 0.01; b.e = 0; for (let k = 0; k < 30 && !st.rec.all.some(r => r.t === 'grief'); k++) { b.hp = Math.min(b.hp, 0.01); b.e = 0; SW.step(w, em); }
  const gr = st.rec.all.filter(r => r.t === 'grief').pop(); ok(gr && gr.mourners.some(q => q.name === c.name), 'who mourns a death is recorded: ' + JSON.stringify(gr || {}).slice(0, 150));
}
{ // long runs stay alive with disasters, pairs and tame code in place
  for (const seed of [7, 11, 42]) { const w = SW.createWorld(seed); w.laws.weather.disaster = 0.3; let n = 0; for (let k = 0; k < 7200; k++) SW.step(w, e => { if (e.type === 'disaster') n++; }); const an = w.creatures.length; ok(w.agents.length >= 3 && an >= 8, 'seed ' + seed + ': 30 days with frequent calamities (' + n + '): ' + w.agents.length + ' beings, ' + an + ' animals'); }
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
