/* Makes the pictures the README shows of the current page (docs/images/now-*).
   Run after a generation that changes how anything looks:

     PLAYWRIGHT=/path/to/node_modules/playwright node tests/tools/readme-shots.js [scene ...]

   Scenes: young, lead, towns, far, ride, panes. With none named, all are made.
   The minds here are a stand-in: words and thoughts are put in through the same doors a real reply
   goes through (M.apply, M.groupApply), so what is drawn is drawn as it would be in a run, but nothing
   in these pictures was thought by Claude. The README says so beside each one. */
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const SRC = path.join(__dirname, '..', '..', 'src'), OUT = path.join(__dirname, '..', '..', 'docs', 'images');
const PORT = 8171, W = 1400, H = 900, MAP = { x: 0, y: 0, width: 980, height: H }, PANE = { x: 980, y: 0, width: 420, height: H };
const want = process.argv.slice(2), on = n => !want.length || want.indexOf(n) >= 0;

const srv = http.createServer((req, res) => { const f = path.join(SRC, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(PORT);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [];
  /* a page with a world of the given seed, begun at the given age, minds asleep */
  const open = async (seed, age) => { const page = await browser.newPage({ viewport: { width: W, height: H } }); page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(o => { window.EVOLU_SEED = o.seed; if (o.age > 1) window.EVOLU_AGE = o.age; window.claude = { use: () => Promise.resolve(null) }; }, { seed, age });
    await page.goto('http://localhost:' + PORT + '/'); await page.waitForTimeout(age > 1 ? 2600 : 1800); return page; };
  const still = async page => { await page.evaluate(() => { window.SWdebug.U.playing = false; }); await page.waitForTimeout(500); };
  const shot = async (page, name, clip) => { await page.evaluate(() => { const n = document.getElementById('notice'); if (n) n.hidden = true; }); await page.waitForTimeout(150); const f = path.join(OUT, name), o = /\.jpg$/.test(name) ? { path: f, type: 'jpeg', quality: 86 } : { path: f }; if (clip) o.clip = clip; await page.screenshot(o); console.log('made ' + name + ' ' + Math.round(fs.statSync(f).size / 1024) + ' KB'); };
  /* midday in a town: the many have had a day, and its largest place is in the middle of the view */
  const town = (page, z, dy) => page.evaluate(o => { const d = window.SWdebug, w = d.st.world; w.tick += Math.round(w.laws.time.dayLength * 0.45); window.SW.manyDay(w, d.st.emit);
    const S = w.settlements.slice().sort((p, q) => q.n - p.n)[0]; d.cam.x = S.x + 0.5; d.cam.y = S.y + (o.dy || 0); d.cam.z = o.z; window._S = S; return { name: S.name, many: window.SW.manyTotal(w), groups: w.groups.filter(g => !g.gone).length }; }, { z, dy });

  if (on('young')) { /* a world at its beginning: three peoples in a land mostly unknown */
    const page = await open(7, 1);
    await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; for (let i = 0; i < 300; i++) window.SW.step(w, d.st.emit); });
    await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, P = w.agents[0].people, band = w.agents.filter(a => a.people === P), a = band[0], b = band[1] || band[0], c = band[2] || band[0];
      window.SWM.apply(d.st, d.st.minds[a.id], 'routine', { thought: 'The berries by the water are thick, and the mist beyond the hill hides what lies there. I will fill my hands first and then look.', feeling: 'curious', say: { to: b.name, text: b.name + ', the red berries by the water are good. Come and gather with me.' } }, {});
      window.SWM.apply(d.st, d.st.minds[c.id], 'routine', { thought: 'Night will be cold. A shelter first, then a fire.', feeling: 'wary' }, {});
      d.select({ t: 'agent', id: a.id }, true); d.cam.z = 30; d.clampCam(); });
    await page.waitForTimeout(900); await still(page); await shot(page, 'now-being.jpg');
    await page.evaluate(() => { const d = window.SWdebug; const w = d.st.world, a = w.agents[0]; d.select(null); d.setTab('story'); d.cam.z = 11; d.cam.x = a.x; d.cam.y = Math.min(a.y, w.H - 900 / 11 / 2 - 1); }); await page.waitForTimeout(700); await shot(page, 'now-young-world.jpg', MAP);
    await page.close(); }

  if (on('lead')) { /* a town of the fourth age with its many, and a group speaking */
    const page = await open(7, 4); const t = await town(page, 40, 1.5); console.log('lead', JSON.stringify(t));
    await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, S = window._S, G = w.groups.filter(q => !q.gone && q.sid === S.id), who = w.agents.filter(o => window.SW.cheb(o.x, o.y, S.x, S.y) < 16)[0];
      window.SWM.groupApply(d.st, G[0], { thought: 'We feed this town and the stores stay shut to us. We will ask once more before we lay down our tools.', feeling: 'restless', say: { to: 'all', text: 'We who work the land ask that the stores be opened to those who fill them.' }, stance: who ? { [who.name]: 'oppose' } : null, note: 'asked for the stores' }, {});
      if (G[1]) window.SWM.groupApply(d.st, G[1], { thought: 'The work is steady and we are fed. We stand with those who keep it so.', feeling: 'steady', stance: who ? { [who.name]: 'back' } : null, note: 'steady' }, {});
      d.setTab('peoples'); const n = document.getElementById('notice'); if (n) n.hidden = true; });
    await page.waitForTimeout(1500); await still(page); await page.evaluate(() => { document.querySelectorAll('#notice, .notice').forEach(n => { n.hidden = true; }); }); await page.waitForTimeout(200); await shot(page, 'now-town-and-the-many.jpg');
    /* one dwelling of the many, opened */
    await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, h = w.many.hh.filter(q => q.sid === window._S.id && q.n > 3)[0]; d.select({ t: 'tile', x: h.x, y: h.y }); }); await page.waitForTimeout(600); await shot(page, 'now-pane-dwelling.png', { x: 980, y: 0, width: 420, height: 480 });
    await page.close(); }

  if (on('towns')) for (const age of [2, 3, 4, 5, 6]) { /* the same seed begun at each age */
    const page = await open(7, age); const t = await town(page, 30, 0.5); console.log('age', age, JSON.stringify(t)); await page.waitForTimeout(1200); await still(page);
    await page.evaluate(() => { document.querySelectorAll('#notice, .notice').forEach(n => { n.hidden = true; }); }); await page.waitForTimeout(200);
    await shot(page, 'now-town-age-' + age + '.jpg', { x: 0, y: 130, width: 980, height: 620 }); await page.close(); }

  if (on('far')) { /* the way out, in one world so the name is the same throughout: the town, the known land, the globe, its star's worlds, the near stars, the galaxy, the galaxies */
    const page = await open(7, 5); await town(page, 30, 0.5); await still(page); const SQ = { x: 130, y: 128, width: 720, height: 720 };
    await page.evaluate(() => { document.getElementById('miniWrap').style.visibility = 'hidden'; }); /* the small map would sit in the corner of every picture of the sequence */
    await shot(page, 'now-out-1-town.jpg', SQ);
    await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, S = window._S; d.select(null); d.cam.z = 7.5; d.cam.x = S.x; d.cam.y = Math.max(900 / 7.5 / 2 + 1, Math.min(S.y, w.H - 900 / 7.5 / 2 - 1)); }); await page.waitForTimeout(900); await shot(page, 'now-out-2-land.jpg', SQ);
    await page.evaluate(() => { const d = window.SWdebug; d.cam.z = d.zGlobe() * 0.45; d.clampCam(); d.U.globeT = 1; }); await page.waitForTimeout(1500); await shot(page, 'now-out-3-globe.jpg', SQ);
    for (const lvl of [1, 2, 3, 4]) { await page.evaluate(v => window.SWdebug.farTo(v), lvl); await page.waitForTimeout(1300); await shot(page, 'now-out-' + (3 + lvl) + '-' + ['star', 'near-stars', 'galaxy', 'galaxies'][lvl - 1] + '.jpg', SQ); }
    await page.close(); }

  if (on('ride')) { /* those who ride and drive, close */
    const page = await open(7, 5); await town(page, 30, 0); await still(page);
    const got = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, S = window._S, G = w.laws.goods, seen = {}, who = [];
      /* one holder of each kind of vehicle, set down on the street nearest the middle (they are placed: at the first moment of a world everyone is at home) */
      w.agents.forEach(a => { const v = Object.keys(a.things || {}).filter(k => a.things[k] > 0 && G[k] && (G[k].speed || G[k].plough || G[k].engine))[0]; if (v && !seen[v]) { seen[v] = 1; who.push(a); } });
      const tiles = []; for (let dy = -7; dy <= 7; dy++) for (let dx = -9; dx <= 9; dx++) { const x = S.x + dx, y = S.y + dy, i = y * w.W + x; if (w.roads[i] === 1 || w.roads[i] === 4) tiles.push({ x, y, d: Math.abs(dx) + Math.abs(dy) * 2 }); }
      tiles.sort((p, q) => p.d - q.d); const used = []; who.forEach(a => { const t = tiles.filter(t => used.every(u => Math.abs(u.x - t.x) + Math.abs(u.y - t.y) >= 3))[0]; if (t) { a.x = t.x; a.y = t.y; used.push(t); } });
      const mx = used.reduce((s, t) => s + t.x, 0) / used.length, my = used.reduce((s, t) => s + t.y, 0) / used.length; d.cam.x = mx + 0.5; d.cam.y = my + 0.5; d.cam.z = 58; d.select(null); d.setTab('kinds');
      return { placed: who.map(a => a.name + ':' + d.vehicleOf(w, a, true)), horses: w.creatures.filter(c => c.kind === 'horse' || c.sp === 'horse').length }; });
    console.log('ride', JSON.stringify(got)); await page.waitForTimeout(900); await shot(page, 'now-vehicle.jpg', MAP); await page.close(); }

  if (on('panes')) { const page = await open(7, 5); await town(page, 30, 0); await still(page);
    for (const tab of ['ways', 'settings']) { await page.evaluate(t => { window.SWdebug.select(null); window.SWdebug.setTab(t); }, tab); await page.waitForTimeout(700);
      if (tab === 'settings') { await page.evaluate(() => { const e = document.getElementById('setAge'); if (e) e.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(300); } await shot(page, 'now-pane-' + tab + '.png', tab === 'settings' ? { x: 980, y: 455, width: 420, height: 290 } : PANE); } /* of Setup, only the part that begins a world */
    await page.close(); }

  console.log('page errors: ' + (errs.join(' | ') || 'none')); await browser.close(); srv.close();
})().catch(e => { console.log('BROKE', e && e.stack || e); process.exit(1); });
