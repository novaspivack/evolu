const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => {
  const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } });
}).listen(8123);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: +(process.argv[3] || 1440), height: +(process.argv[4] || 900) } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.addInitScript(() => {
    window.EVOLU_SEED = 7; /* the first world of a visitor is made from a chance seed; the checks need the same land each time */
    let n = 0;
    const lines = ['The berries near the water are thick. I should not strip them bare.', 'Kendo watches me. I do not know yet whether to trust that one.', 'Night is coming and I am cold. A roof would change everything.', 'That red-capped thing made me sick. Never again.'];
    const sample = async (prompt, opts) => {
      n++; await new Promise(r => setTimeout(r, 600));
      const name = /mind of (\w+)/.exec(prompt)[1];
      const others = (prompt.match(/^- (\w+) at \(/gm) || []).map(s => s.slice(2).split(' ')[0]);
      const o = others[0] || 'all';
      const d = { thought: lines[n % lines.length], say: n % 2 ? { to: o, text: n % 4 === 1 ? 'Stay close tonight. The stalkers hunt in the dark, and two of us can watch better than one.' : 'I found grain to the east. Leave one bite on each plant or it dies!' } : null,
        plan: [[{ do: 'seek', target: 'tree', ticks: 80 }, { do: 'gather', ticks: 60 }, { do: 'build', what: 'fire', ticks: 5 }], [{ do: 'explore', dir: 'NE', ticks: 40 }, { do: 'linger', ticks: 20 }], null, [{ do: 'gather', ticks: 40 }, { do: 'craft', what: name.toLowerCase() + ' spear', ticks: 5 }, { do: 'place', what: name.toLowerCase() + ' snare', ticks: 5 }, { do: 'build', ticks: 5 }]][n % 4], place: n % 6 === 0 ? name + "'s Hollow" : null, stance: n % 7 === 0 && o !== 'all' ? { [o]: 'enemy' } : null, custom: n % 5 === 0 ? 'No one eats before the fire is lit.' : null, note: 'Redcap makes me sick.', feel: { [o]: n % 3 ? 0.3 : -0.5 }, habits: { avoid: ['redcap'], spare: 1 }, mood: n % 3 === 0 ? { anger: 0.8 } : n % 3 === 1 ? { joy: 0.7 } : { fear: 0.6 }, pledge: n % 3 === 0 && o !== 'all' ? { follow: o, band: 'The Ash Hold' } : null, teach: n % 4 === 2 && o !== 'all' ? { to: o, lesson: 'Leave the last bite or the plant dies.', art: 'growth' } : null };
      
      if (/DEEP REFLECTION/.test(prompt)) {
        if (opts.tools) opts.tools[0].execute({ reflexes: [{ if: [['energy', '<', 70], ['food_dist', '<', 99]], do: 'seek', target: 'food' }, { if: [['plant_here', '>=', 1]], do: 'eat' }, { if: [], do: 'wander' }] });
        d.creed = 'I am ' + name + '. I leave the last bite, I build before dark, and I speak before I strike.';
        { const wm = /"way": one of \[([^\]]+)\]/.exec(prompt); if (wm) d.discover = { way: wm[1].split(', ')[0], name: name + ' spear', idea: 'a fire-hardened point lashed to a shaft', use: 'hunt' }; if (/YOU CAN DEVISE NEW THINGS/.test(prompt)) d.invent = /way of DEVICES/.test(prompt) ? { name: name + ' snare', use: 'device', idea: 'a bent sapling and a noose', rules: [{ if: [['creature_dist', '<=', 1]], do: 'snare' }, { if: [['stranger_dist', '<', 4]], do: 'alarm' }] } : { name: name + ' maul', use: 'fight', idea: 'a river stone bound in a forked branch' }; }
        d.spell = { law: /ARTS you know: (\w+)/.exec(prompt) ? /ARTS you know: (\w+)/.exec(prompt)[1] : 'growth', factor: n % 2 ? 2 : 0.5, radius: 3, name: n % 2 ? 'The Green Hour' : 'Withering' }; d.designs = { self: { anim: 'pulse', shapes: [{ t: 'star', n: 7, s: 0.36, fill: '#ffcf4a' }, { t: 'circle', s: 0.22, fill: '#e2552f' }, { t: 'circle', x: -0.08, y: -0.04, s: 0.06, fill: '#ffffff' }, { t: 'circle', x: 0.08, y: -0.04, s: 0.06, fill: '#ffffff' }, { t: 'circle', x: -0.07, y: -0.03, s: 0.03, fill: '#111111' }, { t: 'circle', x: 0.09, y: -0.03, s: 0.03, fill: '#111111' }] }, shelter: { shapes: [{ t: 'circle', s: 0.4, fill: '#5b3a8a' }, { t: 'ring', n: 6, d: 0.3, s: 0.07, fill: '#ffd86b' }, { t: 'rect', y: 0.2, w: 0.08, h: 0.14, fill: '#1a1024' }] } };
      }
      const text = JSON.stringify(d); if (opts.onText) opts.onText({ text, delta: text });
      return { text, modelApplied: opts.model, modelTierApplied: opts.modelTier };
    };
    sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: 8 } });
    window.claude = { use: async (k) => k === 'sample' ? sample : null };
  });
  await page.goto('http://localhost:8123/');
  await page.waitForTimeout(800);
  const steps = process.argv[2] || 'a';
  await page.evaluate(() => { const d = window.SWdebug; d.st.settings.perMinute = 30; d.st.settings.reflectEvery = 2; d.st.world.agents.forEach((a, i) => { a.lore = 4.5; a.wood = 5; a.stone = 3; a.stats.wood = 6; a.stats.planted = 5; a.stats.crafted = 3; a.wood = 6; a.stone = 6; a.carry.push({ k: 'berry', n: 14 }); }); });
  await page.selectOption('#selSpeed', '8');
  const auto0 = await page.evaluate(() => ({ minds: document.getElementById('btnMinds').classList.contains('awake'), soundBeforeTouch: document.getElementById('btnSound').classList.contains('on') }));
  await page.mouse.click(640, 520); await page.waitForTimeout(250);
  await page.evaluate(() => { const b = document.getElementById('btnMinds'); if (!b.classList.contains('awake')) b.click(); });
  const auto1 = await page.evaluate(() => ({ sound: document.getElementById('btnSound').classList.contains('on'), minds: document.getElementById('btnMinds').classList.contains('awake') })); console.log('AUTO', JSON.stringify(auto0), JSON.stringify(auto1), auto0.minds && auto1.sound && auto1.minds ? 'AUTO OK' : 'AUTO FAILED');
  await page.waitForTimeout(+(process.argv[5] || 9000));
  await page.screenshot({ path: SHOTS + '/' + steps + '-1-world.png' });
  // select first agent, zoom in
  await page.evaluate(() => { const d = window.SWdebug, a = d.st.world.agents[0]; document.querySelector('#pane-inspect'); });
  await page.keyboard.press('Escape');
  await page.click('#pane-inspect .line.jump');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SHOTS + '/' + steps + '-2-being.png' });
  await page.evaluate(() => { const d = window.SWdebug; d.st.world.weather = { kind: 'storm', until: d.st.world.tick + 400 }; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SHOTS + '/' + steps + '-4-storm.png' });
  await page.evaluate(() => { const d = window.SWdebug; d.st.world.weather = { kind: 'fog', until: d.st.world.tick + 400 }; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOTS + '/' + steps + '-5-fog.png' });
  await page.evaluate(() => { const d = window.SWdebug; d.st.world.weather = { kind: 'clear', until: d.st.world.tick + 4000 }; });
  // night: advance world to night
  await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; while (SW.dayPhase(w) < 0.8) { SW.step(w, d.st.emit); } });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOTS + '/' + steps + '-3-night.png' });
  await page.click('#btnFit'); await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + '/' + steps + '-6-whole.png' });
  for (const t of ['culture', 'voices', 'chronicle', 'peoples', 'ways', 'kinds', 'laws', 'settings']) { await page.click('#tabs button[data-tab="' + t + '"]'); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + '/' + steps + '-tab-' + t + '.png', clip: { x: Math.max(0, (+(process.argv[3] || 1440)) - 420), y: 0, width: 420, height: +(process.argv[4] || 900) } }); }
  { /* the Add people control: seven come in, each gets a mind, and one of them can be inspected with what it does not forget */
    const before = await page.evaluate(() => window.SWdebug.st.world.agents.length);
    await page.evaluate(() => { const s = document.getElementById('selAdd'); if (s) s.value = '7'; }); await page.click('#btnAdd'); await page.waitForTimeout(1500);
    const added = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, a = w.agents[w.agents.length - 1], o = w.agents[0]; SW.mark(w, a, o, 'grudge', 'struck you'); return { n: w.agents.length, minds: w.agents.filter(q => d.st.minds[q.id]).length, opts: document.getElementById('selAdd').options.length }; });
    if (added.n < before + 6 || added.minds !== added.n || added.opts !== 10) errs.push('ADD PEOPLE: ' + before + ' -> ' + JSON.stringify(added));
    console.log('ADD', before, JSON.stringify(added)); await page.screenshot({ path: SHOTS + '/' + steps + '-7-added.png' });
  }
  const info = await page.evaluate(() => { const d = window.SWdebug; return { devices: Object.keys(d.st.world.devices).length, sets: d.st.world.settlements.map(q => q.name).join(','), ways: d.st.world.agents.map(a => Object.keys(a.knows).join('/')).join(' '), tools: Object.keys(d.st.world.laws.tools).join(','), places: d.st.world.places.length, fires: d.st.world.fires.filter(f => f > d.st.world.tick).length, fields: d.st.world.fields.length, walls: d.st.world.walls.filter(Boolean).length, arts: d.st.world.agents.map(a => a.arts.join('+') + '/' + a.lore + '/L' + a.leader).join(' '), kinds: [...new Set(d.st.chron.map(c => c.kind))].join(','), tick: d.st.world.tick, used: d.st.used, voices: d.st.voices.length, chron: d.st.chron.length, agents: d.st.world.agents.length, on: d.st.on, notice: document.getElementById('noticeText').textContent, fps: 0 }; });
  console.log(JSON.stringify(info)); console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
