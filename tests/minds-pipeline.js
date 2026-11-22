const SW = require('../src/engine.js'), M = require('../src/minds.js');
const w = SW.createWorld(7), st = M.createState(w);
let calls = 0, deep = 0, toolRuns = 0;
st.sample = async function (prompt, opts) {
  calls++;
  if (calls === 1) { console.log('--- ROUTINE PROMPT (' + prompt.length + ' chars) ---\n' + prompt + '\n---'); }
  const name = /mind of (\w+)/.exec(prompt)[1];
  const others = st.world.agents.filter(a => a.name !== name).map(a => a.name);
  const o = others[calls % Math.max(1, others.length)] || 'all';
  const d = { thought: 'I am ' + name + ' thinking #' + calls, say: calls % 2 ? { to: o, text: 'Hello ' + o + ', shall we stay close?' } : null,
    intent: [{ do: 'mate', name: o, ticks: 60 }, { do: 'gather', ticks: 40 }, { do: 'build', ticks: 5 }, { do: 'plant', ticks: 3 }, { do: 'mark', text: 'home of ' + name, ticks: 3 }, { do: 'cultivate', aim: 'richer', name: name + 'fruit', ticks: 3 }, { do: 'fly', ticks: 3 }, { do: 'seek', target: 'tree', ticks: 30 }][calls % 8], plan: calls % 6 === 0 ? [{ do: 'seek', target: 'tree', ticks: 60 }, { do: 'gather', ticks: 40 }, { do: 'craft', what: name.toLowerCase() + ' craft', ticks: 5 }, { do: 'build', what: 'fire', ticks: 5 }] : undefined, place: calls % 11 === 0 ? name + "'s Rest" : null, stance: calls % 13 === 0 ? { [o]: 'enemy' } : null, custom: calls % 7 === 0 ? 'Leave the last bite.' : null,
    note: 'redcap hurts', feel: { [o]: calls % 3 ? 0.3 : -0.4 }, habits: { avoid: ['redcap'], spare: 1 }, mood: { anger: 0.7 }, pledge: calls % 5 === 0 ? { follow: o, band: 'The ' + name + ' Hold' } : null, teach: calls % 4 === 0 ? { to: o, lesson: 'Leave one bite.', reflex: 2, art: 'growth' } : null };
  if (calls % 9 === 0) d.intent = [{ do: 'steal', name: o, ticks: 30 }, { do: 'trade', name: o, what: 'seed', want: 'food', ticks: 40 }, { do: 'build', what: 'wall', ticks: 4 }, { do: 'attack', target: 'agent', name: o, ticks: 20 }][(calls / 9) % 4];
  if (/DEEP REFLECTION/.test(prompt)) {
    deep++;
    const wm = /"way": one of \[([^\]]+)\]/.exec(prompt); if (wm) d.discover = { way: wm[1].split(', ')[deep % wm[1].split(', ').length], name: name + ' craft', idea: 'a thing of ' + name, use: 'hunt' };
    if (/YOU CAN DEVISE NEW THINGS/.test(prompt)) { const km = /THINGS YOU KNOW HOW TO MAKE: ([a-z ]+) \(/.exec(prompt); d.invent = { name: name + ' blade ' , use: 'fight', idea: 'sharp', improves: deep % 2 && km ? km[1] : undefined }; }
    if (deep === 1) console.log('--- DEEP PROMPT TAIL ---\n' + prompt.slice(prompt.indexOf('THIS IS A MOMENT')) + '\n---');
    const pol = SW.instinctPolicy(); pol.splice(1, 0, { if: [['seeds', '>', 0], ['plant_here', '==', 0], ['random', '<', 0.3]], do: 'plant', why: 'sow' }, { if: [['bogus', '<', 1]], do: 'eat' });
    if (opts.tools) { toolRuns++; const r = opts.tools[0].execute({ reflexes: pol }, {}); if (toolRuns === 1) console.log('forecast:', JSON.stringify(r)); }
    d.reflexes = pol; d.creed = 'I am ' + name + ', and I plant what I eat.'; d.notes = ['redcap hurts', 'leave one bite'];
    d.spell = { law: ['growth', 'harm'], factor: 1.8, radius: 2, name: 'test working' }; d.designs = { wall: [{ t: 'rect', w: 0.4, h: 0.3, fill: '#777777' }], self: { anim: 'pulse', shapes: [{ t: 'star', n: 6, s: 0.3, fill: '#ff00aa' }, { t: 'circle', s: 0.1, fill: '#ffffff' }] }, shelter: [{ t: 'tri', s: 0.4, fill: '#885522' }], emblem: [{ t: 'ring', n: 5, d: 0.2, s: 0.05, fill: '#00ffcc' }], junk: 5 };
    return { text: 'Let me think. {not json}\n\n```json\n' + JSON.stringify(d) + '\n```', modelApplied: opts.model, modelTierApplied: opts.modelTier };
  }
  return { text: calls % 7 === 0 ? 'garbage with no json' : 'Sure! ' + JSON.stringify(d), modelTierApplied: 'quick' };
};
(async () => {
  const types = {};
  st.ui = ev => { types[ev.type] = (types[ev.type] || 0) + 1; };
  for (let t = 1; t <= 6000; t++) {
    SW.step(w, st.emit); M.tick(st);
    if (t % 25 === 0) {
      let best = null; for (const id in st.minds) { const m = st.minds[id]; if (!m.dead && !m.busy && M.agentById(w, m.id) && (!best || m.urge > best.urge)) best = m; }
      if (best) await M.think(st, best, M.kindFor(st, best));
    }
  }
  console.log('calls', calls, 'deep', deep, 'tools', toolRuns, 'events', JSON.stringify(types));
  console.log('agents', w.agents.map(a => `${a.name}(g${a.gen},e${a.e | 0},lore${a.lore},arts[${a.arts}],leader${a.leader},stolen${a.stats.stolen},trades${a.stats.trades},kills${a.stats.kills})`).join(' '));
  console.log('knows', w.agents.map(a => a.name + ':' + Object.keys(a.knows).join('/') + ' tools[' + a.tools.map(t => t.k) + '] designs ' + Object.keys(a.designs).length).join(' | ')); console.log('designs', JSON.stringify(Object.keys(w.laws.tools).map(k => k + ' ' + w.laws.tools[k].use + ' x' + w.laws.tools[k].power)), 'places', w.places.map(p => p.name).join(','), 'fires', w.fires.filter(f => f > w.tick).length); console.log('notes0', JSON.stringify(Object.values(st.minds)[0].notes), 'foods0', JSON.stringify(Object.values(st.minds)[0].foods));
  console.log('fields', w.fields.length, 'walls', w.walls.filter(Boolean).length, 'weather', w.weather.kind);
  console.log('marks', w.marks.length, 'shelters', w.shelters.filter(Boolean).length, 'looks', Object.keys(w.looks).length, 'plant kinds', Object.keys(w.laws.plants).join(','));
  console.log('chron tail:\n ' + st.chron.slice(-12).map(c => c.kind + ': ' + c.text).join('\n '));
  console.log('voices', st.voices.length, JSON.stringify(st.voices[0]));
  const m = Object.values(st.minds)[0]; console.log('mind0 log tail', JSON.stringify(m.log.slice(-2)).slice(0, 900));
  const snap = JSON.parse(JSON.stringify(M.snapshot(st))); const st2 = M.restore(snap); console.log('snapshot bytes', JSON.stringify(snap).length, 'restored agents', st2.world.agents.length, 'minds', Object.keys(st2.minds).length);
  for (let t = 0; t < 200; t++) SW.step(st2.world, st2.emit);
  console.log('restored world steps ok, tick', st2.world.tick);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
