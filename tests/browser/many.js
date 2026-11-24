/* Generation 34 on the page: a town begun old is peopled; the many are counted at the top and beside the name of their place, are seen as small
   figures on its streets and as tilled land about it; a group's words are shown over the place and kept among the voices; the Peoples pane lists
   the groups; and the watcher can give one of the many a mind. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = process.env.EVOLU_DIR || path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8148);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; window.EVOLU_AGE = 5; window.claude = { use: () => Promise.resolve(null) }; });
  await page.goto('http://localhost:8148/'); await page.waitForTimeout(1800);
  const a = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.U.playing = false; w.tick += Math.round(w.laws.time.dayLength * 0.4); window.SW.manyDay(w, d.st.emit); const S = w.settlements.slice().sort((p, q) => q.n - p.n)[0]; d.cam.x = S.x + 0.5; d.cam.y = S.y + 0.5; d.cam.z = 44; window._S = S;
    return { many: window.SW.manyTotal(w), persons: w.agents.length, groups: w.groups.filter(g => !g.gone).length, here: window.SW.manyBrief(w, S).people, name: S.name }; });
  await page.waitForTimeout(900);
  const chip = await page.evaluate(() => document.getElementById('census').textContent);
  ok(a.many > 500 && a.groups >= 8 && new RegExp(a.persons + '\\s*named').test(chip) && new RegExp(a.many + '\\s*of the many').test(chip), 'a world begun in the fifth age is peopled: ' + a.persons + ' named and ' + a.many + ' of the many, in ' + a.groups + ' groups, and the page says so at the top');
  const lab = await page.evaluate(() => window.SWdebug.U.manyBy[window._S.id]); ok(lab === a.here, 'the name of ' + a.name + ' on the map carries its people (' + lab + ')');
  /* the figures and the tilled land: the same view drawn with and without the many */
  const grab = () => page.evaluate(() => { const cv = document.getElementById('world'), g = cv.getContext('2d'), w0 = Math.round(cv.width * 0.6), h0 = cv.height; return Array.from(g.getImageData(0, 0, w0, h0).data); });
  const withMany = await grab(); await page.evaluate(() => { const w = window.SWdebug.st.world; window._hh = w.many.hh; w.many.hh = []; }); await page.waitForTimeout(500);
  const without = await grab(); await page.evaluate(() => { window.SWdebug.st.world.many.hh = window._hh; }); await page.waitForTimeout(400);
  let changed = 0; for (let i = 0; i < withMany.length; i += 4) if (Math.abs(withMany[i] - without[i]) + Math.abs(withMany[i + 1] - without[i + 1]) + Math.abs(withMany[i + 2] - without[i + 2]) > 40) changed++;
  ok(changed > 2500, 'the many are seen: ' + changed + ' points of the view differ when they are taken away (figures on the streets, tilled land about the place)');
  const p = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, made = (x, y) => { const g = w.roads[y * w.W + ((x % w.W) + w.W) % w.W]; return !!g && g !== 3; }; let n = 0, onRoad = 0, steps = 0, len = 0;
    w.many.hh.filter(h => h.sid === window._S.id).slice(0, 30).forEach(h => { const tx = h.at >= 0 ? h.at % w.W : window._S.x, ty = h.at >= 0 ? Math.floor(h.at / w.W) : window._S.y, P = d.manyPath(h, tx, ty, 0); n++; len += P.len; for (let k = 1; k < P.length - 1; k++) { steps++; if (made(h.x + P[k][0], h.y + P[k][1])) onRoad++; } }); const plots = d.manyPlots(window._S); return { n, onRoad, steps, len: len / n, plots: plots.length, plotsOk: plots.every(i => !w.shelters[i] && !(w.roads[i] && w.roads[i] !== 3) && w.terrain[i] !== 0 && w.terrain[i] !== 5) }; });
  ok(p.n >= 20 && p.steps > 60 && p.onRoad === p.steps && p.len > 3, 'the way each household goes runs along the streets: all ' + p.steps + ' steps between door and work of ' + p.n + ' households are on made road (' + p.len.toFixed(1) + ' tiles a way)');
  ok(p.plots >= 20 && p.plotsOk, p.plots + ' tiles about the place are shown as tilled, none on a road, a building or water');
  await page.screenshot({ path: path.join(SHOTS, 'the-many.png') });
  /* a group speaks */
  const g = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, G = w.groups.filter(q => !q.gone && q.sid === window._S.id)[0], who = w.agents.filter(o => window.SW.cheb(o.x, o.y, G.x, G.y) < 16)[0]; window.SWM.groupApply(d.st, G, { thought: 'We feed this place and we are not heard.', feeling: 'restless', say: { to: 'all', text: 'We who work ask that the stores be opened.' }, stance: who ? { [who.name]: 'back' } : null, note: 'spoke' }, {}); d.U.playing = true; return { name: G.name, who: who && who.name }; });
  await page.waitForTimeout(700);
  const laid = await page.evaluate(() => { const d = window.SWdebug; d.U.playing = false; return d.U.laid.map(b => ({ t: b.text || (b.b && b.b.text) || '', x: b.x, y: b.y, w: b.w, h: b.h })); });
  const mine = laid.filter(b => b.t.indexOf(g.name) === 0);
  ok(mine.length === 1 && /We who work ask/.test(mine[0].t), 'what a group says is shown in a box over its place, beginning with its name (' + laid.length + ' boxes laid, none placed by itself)');
  const cross = (p1, q) => p1.x < q.x + q.w && p1.x + p1.w > q.x && p1.y < q.y + q.h && p1.y + p1.h > q.y; let over = 0; for (let i = 0; i < laid.length; i++) for (let j = i + 1; j < laid.length; j++) if (laid[i].w && laid[j].w && cross(laid[i], laid[j])) over++;
  ok(over === 0, 'and no box lies over another');
  const tabs = await page.evaluate((nm) => { const d = window.SWdebug; d.setTab('voices'); return new Promise(r => setTimeout(() => { const v = document.getElementById('pane-voices').textContent; d.setTab('peoples'); setTimeout(() => r({ v: v.indexOf(nm) >= 0 && /We who work ask/.test(v), p: document.getElementById('pane-peoples').textContent }), 900); }, 900)); }, g.name);
  ok(tabs.v && tabs.p.indexOf('The many') >= 0 && tabs.p.indexOf(g.name) >= 0 && /backs/.test(tabs.p) && /We feed this place and we are not heard/.test(tabs.p), 'the group is among the voices, and the Peoples pane lists the many of each place, each group with its mood, whom it backs, what it thinks and what it last said');
  /* the watcher gives one of the many a mind */
  const r = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, h = w.many.hh.filter(q => q.sid === window._S.id && q.n > 3)[0], n0 = w.agents.length, m0 = h.n; d.setTab('inspect'); d.select({ t: 'tile', x: h.x, y: h.y }); return new Promise(res => setTimeout(() => { const pane = document.getElementById('pane-inspect'), txt = pane.textContent, btn = pane.querySelector('[data-act="rise"]'); if (btn) btn.click(); setTimeout(() => { const a = w.agents[w.agents.length - 1]; res({ txt: /Of the many/.test(txt) && /Give one of them a mind/.test(txt), n0, n1: w.agents.length, m0, m1: h.n, name: a.name, mind: !!d.st.minds[a.id], from: !!a.fromMany, shown: document.getElementById('pane-inspect').textContent.indexOf(a.name) >= 0 }); }, 700); }, 700)); });
  ok(r.txt && r.n1 === r.n0 + 1 && r.m1 === r.m0 - 1 && r.mind && r.from && r.shown, 'a dwelling shows who of the many live in it, and "Give one of them a mind" makes one a person: ' + r.name + ' steps out, the household is one fewer, and the page turns to them');
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
