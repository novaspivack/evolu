/* Generation 33 on the page: what lies flat is drawn under what stands (a road under the building beside it); kinds are drawn at sizes of
   their own (a beacon small, a field exactly its tile); a field and a pyramid are drawn as what they are; the land picture is painted again
   when a road is made; and a pane keeps its place while the world runs and while it is being scrolled. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8145);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; window.EVOLU_AGE = 5; window.claude = { use: () => Promise.resolve(null) }; });
  await page.goto('http://localhost:8145/'); await page.waitForTimeout(1800);

  /* ---- a road is under the building that stands in front of it ---- */
  const scene = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.U.playing = false; w.tick += Math.round(w.laws.time.dayLength * 0.4);
    /* a straight piece of paved road running east and west, with open ground south of it: an office is set there, tall enough to stand across the road */
    let at = null; for (const k in w.roads) { if (w.roads[k] !== 1) continue; const i = +k, x = i % w.W, y = (i - x) / w.W, L = d.wayLinks(x, y, false); if (L.length !== 2 || L[0][1] || L[1][1]) continue; const s = i + w.W; if (w.roads[s] || w.terrain[s] === 0 || w.terrain[s] === 5 || w.terrain[s] === 9) continue; if (w.roads[s - 1] || w.roads[s + 1] || w.roads[i - w.W]) continue; at = { x: x, y: y, i: i, s: s }; break; }
    if (!at) return null; const own = w.agents[0].id; w.plants[at.s] = null; w.stores[at.s] = null; w.shelters[at.s] = own; w.bkind[at.s] = 'office'; w.plants[at.i - w.W] = null; if (w.shelters[at.i - w.W] > 0) { w.shelters[at.i - w.W] = 0; delete w.bkind[at.i - w.W]; }
    for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) { const j = at.i + dy * w.W + dx; if (j !== at.s && w.shelters[j] > 0 && !w.roads[j]) { w.shelters[j] = 0; delete w.bkind[j]; } w.plants[j] = null; }
    w.agents.forEach(q => { if (Math.abs(q.x - at.x) < 4 && Math.abs(q.y - at.y) < 4) { q.x += 6; q.px = q.x; } }); w.creatures.forEach(q => { if (Math.abs(q.x - at.x) < 4 && Math.abs(q.y - at.y) < 4) { q.x += 7; q.px = q.x; } });
    d.cam.x = at.x + 0.5; d.cam.y = at.y + 0.5; d.cam.z = 60; return at; });
  await page.waitForTimeout(700);
  const pix = () => page.evaluate(() => { const cv = document.getElementById('world'), g = cv.getContext('2d'), dpr = cv.width / cv.clientWidth, z = 60 * dpr, X = cv.width / 2, Y = cv.height / 2, at = (dx, dy) => Array.from(g.getImageData(Math.round(X + dx * z), Math.round(Y + dy * z), 1, 1).data.slice(0, 3)); return { over: at(0, 0.1), open: at(-0.42, 0) }; });
  /* the road tile is the middle of the view; the office stands one tile south and reaches up across the road's southern edge */
  const on = await pix(); await page.evaluate(() => { const w = window.SWdebug.st.world; window._roads = w.roads; w.roads = {}; }); await page.waitForTimeout(500);
  const off = await pix(); await page.evaluate(() => { window.SWdebug.st.world.roads = window._roads; }); await page.waitForTimeout(300);
  const diff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  ok(scene && diff(on.open, off.open) > 24, 'where nothing stands, the road is seen (the same point with and without the road differs by ' + (scene ? diff(on.open, off.open) : '-') + ')');
  ok(scene && diff(on.over, off.over) <= 6, 'where the office beside the road stands across it, the office is seen and not the road: that point is the same with and without the road (differs by ' + (scene ? diff(on.over, off.over) : '-') + ')');
  await page.screenshot({ path: path.join(SHOTS, 'road-under-building.png') });

  /* ---- sizes and looks ---- */
  const k = await page.evaluate(() => { const d = window.SWdebug, S = d.KIND_SIZE, f = d.kindLook('field', 1).shapes, p = d.kindLook('pyramid', 1).shapes, polys = p.filter(q => q.t === 'poly');
    return { field: S.field * 1.45, beacon: S.beacon, apartments: S.apartments, house: S.house, fieldRows: f.filter(q => q.t === 'line' && /hsl\((8|9)\d/.test(q.stroke)).length, fieldEars: f.filter(q => q.t === 'ellipse').length, fieldPoly: f[0].t === 'poly', faces: polys.length, lit: polys[0] && polys[0].fill, shade: polys[1] && polys[1].fill, courses: p.filter(q => q.t === 'line').length, noFooting: !p.some(q => q.t === 'rect') }; });
  ok(Math.abs(k.field - 1) < 0.02 && k.beacon < 0.65 && k.beacon < k.house && k.house < 1 && k.apartments > 1.1, 'kinds are drawn at sizes of their own: a field is its tile (' + k.field.toFixed(2) + '), a beacon ' + k.beacon + ' of a hall, a house ' + k.house + ', apartments ' + k.apartments);
  ok(k.fieldPoly && k.fieldRows >= 6 && k.fieldEars >= 30, 'a field is tilled ground with ' + k.fieldRows + ' rows of green and ' + k.fieldEars + ' ears of grain');
  ok(k.faces >= 4 && k.lit !== k.shade && k.courses >= 10 && k.noFooting, 'a pyramid has a lit face and a face in shade (' + k.lit + ', ' + k.shade + '), ' + k.courses + ' lines of courses and edge, a capstone, and no footing of a later age');

  /* ---- the land picture is painted again after a road is made ---- */
  const before = await page.evaluate(() => window.SWdebug.U.roadsPainted);
  await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; let i = -1; for (let j = 0; j < w.terrain.length && i < 0; j++) if (w.terrain[j] === 4 && !w.roads[j]) i = j; w.roads[i] = 1; d.event({ type: 'paved', x: i % w.W, y: Math.floor(i / w.W), a: w.agents[0].id }); }); await page.waitForTimeout(2600);
  const after = await page.evaluate(() => window.SWdebug.U.roadsPainted);
  ok(before > 100 && after === before + 1, 'when a road is made on rock the land is painted again a moment later, leaving the road clear of peaks (' + before + ' road tiles known to the picture, then ' + after + ')');

  /* ---- a pane keeps its place ---- */
  await page.evaluate(() => { const d = window.SWdebug; d.setTab('kinds'); d.U.playing = true; }); await page.waitForTimeout(900);
  const box = await page.evaluate(() => { const p = document.getElementById('pane-kinds'), r = p.getBoundingClientRect(); p.firstElementChild.setAttribute('data-old', '1'); window._rebuilds = 0; new MutationObserver(function () { window._rebuilds++; }).observe(p, { childList: true }); return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: p.scrollHeight, ch: p.clientHeight }; });
  await page.mouse.move(box.x, box.y); const seen = []; let want = 0;
  for (let s = 0; s < 24; s++) { await page.mouse.wheel(0, 120); want += 120; await page.waitForTimeout(260); seen.push(await page.evaluate(() => document.getElementById('pane-kinds').scrollTop)); } /* six seconds of scrolling in a running world */
  let jumps = 0; for (let s = 1; s < seen.length; s++) if (seen[s] < seen[s - 1] || seen[s] - seen[s - 1] > 260) jumps++;
  const during = await page.evaluate(() => window._rebuilds);
  ok(during === 0, 'while it is being scrolled the pane is not built again under the hand (' + during + ' times in six seconds; Generation 32 built it again about three times a second)');
  ok(box.h > box.ch + want && jumps === 0 && Math.abs(seen[seen.length - 1] - want) <= 4, 'scrolled for six seconds while the world runs, the Kinds pane goes where the wheel sends it: ' + seen[seen.length - 1] + ' of ' + want + ' points, never backward and never by a leap (' + jumps + ' jumps)');
  await page.waitForTimeout(7500); /* left alone: it is built again, and stays where it was */
  const rest = await page.evaluate(() => { const p = document.getElementById('pane-kinds'); return { top: p.scrollTop, rebuilt: !p.querySelector('[data-old]'), n: window._rebuilds }; });
  ok(rest.rebuilt && rest.n >= 1 && rest.n <= 3 && Math.abs(rest.top - want) <= 4, 'left alone for seven seconds it is built again from the world as it now is (' + rest.n + ' times, no oftener than every five seconds), and stays at ' + rest.top + ' points');
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
