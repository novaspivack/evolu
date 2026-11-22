/* Fills a world with some culture through the real paths, then photographs the Culture tab in its four views. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8135);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; });
  await page.goto('http://localhost:8135/'); await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const d = window.SWdebug, st = d.st, w = st.world, M = window.SWM, ag = w.agents, P0 = ag.filter(a => a.people === 0), P1 = ag.filter(a => a.people === 1), P2 = ag.filter(a => a.people === 2);
    const say = (a, kind, o) => M.apply(st, st.minds[a.id], kind, Object.assign({ thought: 'x' }, o), {});
    const near = (a, b) => { b.x = a.x + 1; b.y = a.y; b.px = b.x; b.py = b.y; };
    const run = n => { for (let i = 0; i < n; i++) { window.SW.step(w, st.emit); M.tick(st); } };
    say(P0[0], 'deep', { tale: { title: 'How the Sea Came', kind: 'myth', text: 'The land was one. Two brothers quarrelled over a fire. The ground split between them and the water came in. Three days it rose.' } });
    say(P0[0], 'deep', { belief: { name: 'The Fed Hand', tenets: 'What is given comes back. Feed the one beside you before you feed yourself, and no winter will find you alone.' } });
    say(P1[0], 'deep', { tale: { title: 'Ssaua at the Seam', kind: 'song', about: P1[1].name, text: 'She went down where the tin lies cold, and came up with the hall on her back.' } });
    say(P2[0], 'deep', { tale: { title: 'The Long Winter', kind: 'tale', text: 'Three of us went north. Two came back. The snow kept one. We tell it so no one goes north alone.' } });
    run(250);
    P0.slice(1).forEach(b => { near(P0[0], b); say(P0[0], 'routine', { teach: { to: b.name, tale: 'How the Sea Came', belief: true, lesson: 'A promise is only kept when the food is in my hands.' } }); });
    say(P0[1], 'deep', { adopt: 'The Fed Hand' }); say(P0[2], 'deep', { adopt: 'The Fed Hand' });
    M.lesson(st, P2.map(a => a.id), 'Setha starved alone in winter, away from the fire, with no roof and no store.');
    run(250);
    near(P0[1], P1[0]); say(P0[1], 'routine', { teach: { to: P1[0].name, tale: 'How the Sea Came', belief: true } }); P1.slice(1).forEach(b => { near(P1[0], b); say(P1[0], 'routine', { teach: { to: b.name, tale: 'Ssaua at the Seam' } }); });
    run(250); near(P1[0], P1[1]); say(P1[0], 'routine', { teach: { to: P1[1].name, tale: 'How the Sea Came' } }); say(P1[0], 'deep', { adopt: 'The Fed Hand' });
    const a = P0[0]; a.things.flint = 2; a.knows.tools = a.knows.tools || { look: null }; a.policy = []; a.plan = [{ do: 'make', what: 'talisman', ticks: 2 }, { do: 'give', name: P0[1].name, what: 'flint talisman', ticks: 3 }]; a.intent = null; near(a, P0[1]); a.e = 90;
    run(260); w.tally.met = w.tally.met || []; return { ideas: Object.keys(w.culture.items).length, log: w.culture.log.length, days: w.culture.days.length, relics: w.relics.length };
  });
  await page.click('#tabs button[data-tab="culture"]'); await page.waitForTimeout(500);
  for (const v of ['peoples', 'spread', 'between', 'time']) { await page.click('#pane-culture button[data-id="' + v + '"]'); await page.waitForTimeout(400); await page.screenshot({ path: SHOTS + '/culture-' + v + '.png', clip: { x: 1020, y: 0, width: 420, height: 1100 } }); }
  console.log(JSON.stringify(info), 'ERRORS', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
})();
