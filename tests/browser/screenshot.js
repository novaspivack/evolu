const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8134);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; });
  await page.goto('http://localhost:8134/'); await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const d = window.SWdebug, w = d.st.world, a = w.agents[0]; let bank = -1;
    for (let y = 20; y < 70 && bank < 0; y++) for (let x = 4; x < w.W - 12; x++) { const i = y * w.W + x; if (w.terrain[i] !== 0 && w.terrain[i] !== 5 && w.terrain[i + 1] === 0 && w.terrain[i + 2] === 0 && w.terrain[i + 3] === 0) { bank = i; break; } }
    for (let k = 1; k <= 5; k++) if (w.terrain[bank + k] === 0 || w.terrain[bank + k] === 5) w.roads[bank + k] = 2;
    a.x = (bank % w.W) + 2; a.y = Math.floor(bank / w.W); a.px = a.x; a.py = a.y; a.stats.built = 9; a.stats.gifts = 6; a.stats.told = 4; a.sung = 2; a.things.cloak = 1; a.stat = null;
    d.cam.x = a.x; d.cam.y = a.y; d.cam.z = 52; w.tick = 200; d.U.sel = { t: 'agent', id: a.id }; d.U.keys.inspect = ''; return { title: document.title, brand: document.querySelector('#brand h1').textContent, name: a.name };
  });
  await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + '/bridge.png' });
  console.log(JSON.stringify(info), 'ERRORS', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
})();
