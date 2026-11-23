/* A world that goes round, on the page: the flat map runs on across the line where east meets west; from far off it is a globe among stars,
   with the sun by day and the moon by night; coming closer returns to the map. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8137);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; });
  await page.goto('http://localhost:8137/'); await page.waitForTimeout(2500);
  const px = (x, y) => page.evaluate(([x, y]) => { const cv = document.getElementById('world'), r = cv.getBoundingClientRect(), k = cv.width / r.width, d = cv.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);
  const a = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.U.playing = false; return { wrap: w.wrap, W: w.W, H: w.H, globe: d.isGlobe(), z: d.cam.z, zg: d.zGlobe() }; });
  ok(a.wrap === 1 && a.W === 216 && a.H === 124 && !a.globe && a.z > a.zg, 'a new world goes round (216 by 124) and opens on the flat map');
  /* across the line where east meets west */
  const seam = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, b = w.agents[0]; d.cam.z = 14; d.cam.y = 62; d.cam.x = 0.5; d.clampCam(); b.x = w.W - 2; b.y = 62; b.px = b.x; b.py = b.y; const c = w.agents[1]; c.x = 1; c.y = 62; c.px = c.x; c.py = c.y; w.veil.t = {}; for (let i = 0; i < w.terrain.length; i++) if (w.terrain[i] === 9) w.terrain[i] = 2; return { x: d.cam.x }; });
  await page.evaluate(() => { const ev = { type: 'opened', x0: 0, x1: 1, y0: 0, y1: 1 }; window.SWdebug.st.ui(ev); }); await page.waitForTimeout(900);
  const stage = await page.evaluate(() => { const r = document.getElementById('world').getBoundingClientRect(); return { w: r.width, h: r.height }; });
  const left = await px(stage.w / 2 - 300, stage.h / 2 + 150), right = await px(stage.w / 2 + 300, stage.h / 2 + 150);
  ok(left[0] + left[1] + left[2] > 60 && right[0] + right[1] + right[2] > 60, 'with the view on the line where east meets west, there is land on both sides of it: ' + left + ' | ' + right);
  await page.screenshot({ path: SHOTS + '/globe-1-seam.png' });
  const drag = await page.evaluate(() => { const d = window.SWdebug; const x0 = d.cam.x; d.cam.x -= 5; d.clampCam(); return { from: x0, to: d.cam.x }; });
  ok(drag.to > 200 && drag.to < 216, 'carried west past the line, the view comes round to the far east (' + drag.from.toFixed(1) + ' to ' + drag.to.toFixed(1) + ')');
  /* far off: the globe */
  await page.evaluate(() => { window.SWdebug.fitWorld(); }); await page.waitForTimeout(1200);
  const g = await page.evaluate(() => { const d = window.SWdebug; return { globe: d.isGlobe(), t: d.U.globeT }; });
  const mid = await px(stage.w / 2, stage.h / 2), corner = await px(stage.w - 30, stage.h - 120);
  ok(g.globe && g.t === 1 && mid[0] + mid[1] + mid[2] > 90 && corner[0] + corner[1] + corner[2] < 60, 'Whole world shows a globe: lit in the middle (' + mid + '), dark space at the corner (' + corner + ')');
  await page.screenshot({ path: SHOTS + '/globe-2-day.png' });
  const x1 = await page.evaluate(() => window.SWdebug.cam.x); await page.mouse.move(stage.w / 2, stage.h / 2); await page.mouse.down(); await page.mouse.move(stage.w / 2 + 200, stage.h / 2 + 40, { steps: 6 }); await page.mouse.up(); const x2 = await page.evaluate(() => window.SWdebug.cam.x);
  ok(Math.abs(x2 - x1) > 5, 'dragging turns it (' + x1.toFixed(1) + ' to ' + x2.toFixed(1) + ')');
  await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; while (SW.dayPhase(w) < 0.86) SW.step(w, d.st.emit); for (let i = 0; i < 40; i++) w.fires[w.agents[i % w.agents.length].y * w.W + w.agents[i % w.agents.length].x] = w.tick + 5000; }); await page.waitForTimeout(900);
  const midN = await px(stage.w / 2, stage.h / 2); ok(midN[0] + midN[1] + midN[2] < mid[0] + mid[1] + mid[2], 'at night the globe is darker (' + midN + '), and the moon is out'); await page.screenshot({ path: SHOTS + '/globe-3-night.png' });
  await page.mouse.move(stage.w / 2, stage.h / 2); for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -260); await page.waitForTimeout(40); } await page.waitForTimeout(700);
  const back = await page.evaluate(() => { const d = window.SWdebug; return { globe: d.isGlobe(), t: d.U.globeT, z: d.cam.z, zg: d.zGlobe() }; });
  ok(!back.globe && back.t === 0 && back.z > back.zg, 'scrolling in comes down to the flat map again'); await page.screenshot({ path: SHOTS + '/globe-4-down.png' });
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(25); } await page.waitForTimeout(600);
  const out = await page.evaluate(() => window.SWdebug.isGlobe()); ok(out, 'and scrolling out rises to the globe');
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
