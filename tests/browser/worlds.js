/* Saved worlds: a first visit begins a new named world and lets it run; a reload carries on; a return visit offers the saved worlds or a new one;
   a world saved before worlds had names is filed with the rest; the view can pass the rim of the map. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.join(__dirname, '..', '..', 'src');
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8136);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
const watch = page => { page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); };
const look = page => page.evaluate(() => { const d = window.SWdebug; return { id: d.st.runId, name: d.st.world.name, tick: d.st.world.tick, seed: d.st.world.seed, playing: d.U.playing, choosing: !!d.U.choosing, chooser: !document.getElementById('chooser').hidden, shown: document.getElementById('worldName').textContent, list: d.LIB.list.map(m => m.name + ':' + m.id), rows: document.querySelectorAll('#chooserList .world').length, lib: !!d.LIB.db }; });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p1 = await ctx.newPage(); watch(p1); await p1.goto('http://localhost:8136/'); await p1.waitForTimeout(5000);
  const a = await look(p1);
  ok(a.lib && !a.chooser && !a.choosing && a.playing && a.tick > 2 && /^[A-Z][a-z]+$/.test(a.name) && a.shown === a.name, 'a first visit begins a new world with a name of its own and lets it run: "' + a.name + '", seed ' + a.seed + ', moment ' + a.tick);
  await p1.evaluate(() => window.SWdebug.save()); await p1.waitForTimeout(600);
  await p1.reload(); await p1.waitForTimeout(2500); const b = await look(p1);
  ok(b.id === a.id && b.name === a.name && !b.chooser && b.tick >= a.tick, 'the same tab reloaded carries on with the same world, without asking');
  await p1.evaluate(() => window.SWdebug.save()); await p1.waitForTimeout(600); await p1.close();
  const p2 = await ctx.newPage(); watch(p2); await p2.goto('http://localhost:8136/'); await p2.waitForTimeout(2500);
  const c = await look(p2); await p2.waitForTimeout(1200); const c2 = await look(p2);
  ok(c.chooser && c.choosing && c.rows === 1 && c.id !== a.id && c2.tick === c.tick && c.list.length === 1, 'a return visit offers the saved world and a new one, and nothing runs or is saved until one is chosen');
  await p2.screenshot({ path: path.join(__dirname, 'shots', 'worlds-chooser.png') });
  await p2.click('#chooserList button[data-open]'); await p2.waitForTimeout(2000); const d = await look(p2);
  ok(d.id === a.id && d.name === a.name && !d.chooser && !d.choosing && d.playing && d.tick > b.tick, 'choosing the saved world opens it and lets it run');
  await p2.close();
  const p3 = await ctx.newPage(); watch(p3); await p3.goto('http://localhost:8136/'); await p3.waitForTimeout(2500);
  await p3.click('#chooserNew'); await p3.waitForTimeout(1500); const e = await look(p3);
  ok(e.id !== a.id && !e.chooser && e.playing && e.tick > 0 && e.list.length === 2 && e.name !== '', 'choosing a new world begins it, playing, and both are kept: ' + e.list.map(q => q.split(':')[0]).join(', '));
  await p3.click('#tabs button[data-tab="settings"]'); await p3.waitForTimeout(600);
  const setup = await p3.evaluate(() => ({ rows: document.querySelectorAll('#pane-settings .world').length, name: document.getElementById('setName').value }));
  ok(setup.rows === 1 && setup.name === e.name, 'Setup shows the name of this world and the other saved world');
  await p3.click('#pane-settings button[data-act="randomworld"]'); await p3.waitForTimeout(1500); const f = await look(p3);
  ok(f.id !== e.id && f.playing && f.tick > 0 && f.list.length === 3, 'a new world begun from Setup plays at once, and the one left behind is kept (' + f.list.length + ' saved)');
  /* the view may pass the rim, so land at the bottom is not held under the controls */
  const cam = await p3.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.cam.z = 30; d.cam.y = 9999; d.cam.x = 9999; d.clampCam(); const hh = document.getElementById('world').getBoundingClientRect().height / d.cam.z / 2; return { y: d.cam.y, limit: w.H - hh, H: w.H }; });
  ok(cam.y > cam.limit + 3 && cam.y < cam.H + 20, 'the view can be carried past the bottom rim of the map (centre ' + cam.y.toFixed(1) + ', where it used to stop at ' + cam.limit.toFixed(1) + ')');
  await p3.close(); await ctx.close();
  /* a world saved by Generation 18, before worlds had names, in the one old slot */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const old = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'save-generation-18.json.gz'))).toString(), oldId = JSON.parse(old).runId;
  await ctx2.addInitScript(raw => { try { if (!localStorage.getItem('seedworld.save.v4')) localStorage.setItem('seedworld.save.v4', raw); } catch (e) {} }, old);
  const p4 = await ctx2.newPage(); watch(p4); await p4.goto('http://localhost:8136/'); await p4.waitForTimeout(3000); const g = await look(p4);
  ok(g.chooser && g.rows === 1 && g.list.some(q => q.endsWith(':' + oldId)), 'a world saved before worlds had names is found, named and offered: ' + g.list.join(', '));
  await p4.click('#chooserList button[data-open]'); await p4.waitForTimeout(2000); const h = await look(p4);
  ok(h.id === oldId && !h.chooser && h.playing, 'and it opens and runs');
  /* the page republished while a world runs: the host hands the world back, it carries on, and it is filed in the library */
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx3.addInitScript(raw => { window.claude = { hot: { data: JSON.parse(raw), snapshot: function () {} } }; }, old);
  const p5 = await ctx3.newPage(); watch(p5); await p5.goto('http://localhost:8136/'); await p5.waitForTimeout(3000); const k = await look(p5);
  ok(k.id === oldId && !k.chooser && k.playing && k.lib && k.list.some(q => q.endsWith(':' + oldId)), 'a world handed back by the host after a republish carries on without asking and is filed by name: ' + k.list.join(', '));
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
