/* End to end: scripted minds that use the new actions through the real prompt/reply path, for 20 days. */
const SW = require('../src/engine.js'), M = require('../src/minds.js');
(async () => {
  for (const seed of [7, 42]) {
    const w = SW.createWorld(seed), st = M.createState(w); let calls = 0, bad = 0;
    st.sample = async function (prompt, opts) {
      calls++;
      const name = /mind of (\w+)/.exec(prompt)[1], a = w.agents.find(o => o.name === name);
      const others = w.agents.filter(o => o.name !== name).map(o => o.name), o = others[calls % Math.max(1, others.length)];
      const plans = [
        [{ do: 'seek', target: 'water', ticks: 80 }, { do: 'fish', ticks: 120 }, { do: 'eat', ticks: 2 }],
        [{ do: 'seek', target: 'food', ticks: 60 }, { do: 'harvest', ticks: 10 }, { do: 'gather', ticks: 60 }],
        [{ do: 'seek', target: 'tree', ticks: 60 }, { do: 'gather', ticks: 60 }, { do: 'build', what: 'fire', ticks: 3 }, { do: 'craft', what: 'pot', ticks: 3 }],
        [{ do: 'give', name: o, what: 'clay', ticks: 40 }, { do: 'give', name: o, what: 'ore', ticks: 40 }, { do: 'explore', dir: 'N', ticks: 80 }, { do: 'gather', ticks: 80 }]
      ];
      const d = { thought: 't' + calls, plan: plans[calls % plans.length], stance: calls % 11 === 0 && o ? { [o]: calls % 22 === 0 ? 'neutral' : 'enemy' } : null };
      if (/DEEP REFLECTION/.test(prompt)) {
        const wm = /"way": one of \[([^\]]+)\]/.exec(prompt); if (wm) d.discover = { way: wm[1].split(', ')[calls % wm[1].split(', ').length], name: name + ' way', idea: 'x', use: 'fish' };
        if (/YOU CAN DEVISE NEW THINGS/.test(prompt)) d.invent = { name: name + ' net', use: 'fish', idea: 'a net of reeds' };
        d.reflexes = [{ if: [['sick', '==', 1]], do: 'rest', why: 'sick' }, { if: [['energy', '<', 60], ['water_dist', '<=', 1]], do: 'fish', why: 'fish when hungry by water' }, { if: [['food_carried', '>', 0], ['energy', '<', 70]], do: 'eat' }].concat(SW.instinctPolicy());
      }
      if (!a) bad++;
      return { text: JSON.stringify(d), modelTierApplied: 'quick' };
    };
    const types = {}; st.ui = ev => { types[ev.type] = (types[ev.type] || 0) + 1; };
    const emit0 = st.emit; st.emit = ev => { types[ev.type] = (types[ev.type] || 0) + 1; emit0(ev); };
    for (let t = 1; t <= 4800; t++) {
      SW.step(w, st.emit); M.tick(st);
      if (t % 20 === 0) { let best = null; for (const id in st.minds) { const m = st.minds[id]; if (!m.dead && !m.busy && M.agentById(w, m.id) && (!best || m.urge > best.urge)) best = m; } if (best) await M.think(st, best, M.kindFor(st, best)); }
    }
    const pick = k => types[k] || 0;
    console.log('seed', seed, 'calls', calls, 'alive', w.agents.length, '| fished', pick('fished'), 'clay', pick('clay'), 'ore', pick('ore'), 'sick', pick('sick'), 'well', pick('well'), 'war', pick('war'), 'truce', pick('truce'), 'warend', pick('warend'), 'crafted', pick('crafted'), 'discovered', pick('discovered'), 'fail', pick('fail'), 'death', pick('death'));
    console.log('  ways', [...new Set(w.agents.flatMap(a => Object.keys(a.knows)))].join(','), '| pots', w.agents.map(a => a.pots).join(''), '| fish tools', Object.keys(w.laws.tools).filter(k => w.laws.tools[k].use === 'fish').length, '| wars', JSON.stringify(w.wars.map(r => [r.aName, r.bName, r.dead, r.how])).slice(0, 200));
    console.log('  causes', JSON.stringify(Object.values(st.minds).filter(m => m.dead).map(m => m.cause)));
    console.log('  chron', st.chron.filter(c => ['war', 'sick', 'age', 'craft'].includes(c.kind)).slice(-6).map(c => c.kind + ': ' + c.text).join(' | '));
    const snap = JSON.parse(JSON.stringify(M.snapshot(st))), st2 = M.restore(snap); for (let i = 0; i < 300; i++) SW.step(st2.world, st2.emit);
    console.log('  snapshot restores and runs: tick', st2.world.tick);
  }
})().catch(e => { console.error('CRASH', e.stack); process.exit(1); });
