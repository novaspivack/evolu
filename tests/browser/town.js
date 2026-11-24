/* Generation 32 on the page: a world begun in the fifth age is drawn with no error; every kind of building of the library has a look of its
   own family and no two kinds of building share one; each vehicle is drawn; the music of each age plays without error. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src');
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8144);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; window.EVOLU_AGE = 5; window.claude = { use: () => Promise.resolve(null) }; });
  await page.goto('http://localhost:8144/'); await page.waitForTimeout(1800);
  const a = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.U.playing = false; const S = w.settlements.slice().sort((p, q) => q.n - p.n)[0]; d.cam.x = S.x + 0.5; d.cam.y = S.y + 0.5; d.cam.z = 44;
    const kinds = {}; let onRoad = 0; for (const i in w.bkind) if (w.shelters[i] > 0) { kinds[w.bkind[i]] = 1; if (w.roads[i]) onRoad++; } const veh = {}; w.agents.forEach(q => { for (const k in (q.things || {})) if (q.things[k] > 0) veh[k] = 1; });
    return { n: S.n, kinds: Object.keys(kinds).length, onRoad: onRoad, veh: Object.keys(veh), horses: w.creatures.filter(c => c.sp === 'horse' && c.keeper != null).length, age: w.startAge, story: (d.st.story.chapters[0] || {}).title }; });
  await page.waitForTimeout(900);
  ok(a.age === 5 && a.n > 40 && a.kinds >= 30 && a.onRoad === 0 && a.horses >= 3 && a.veh.indexOf('truck') >= 0 && a.veh.indexOf('motorcar') >= 0, 'a world begun in the fifth age on the page: a town of ' + a.n + ' buildings of ' + a.kinds + ' kinds, none on a street, with kept horses and ' + a.veh.join(', '));
  const b = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, B = w.laws.buildings, sig = L => JSON.stringify(L.shapes.map(s => [s.t, s.fill || s.stroke, s.x || 0, s.y || 0, s.w || s.s || 0, s.h || 0]));
    const fam = ['house', 'townhouse', 'rowhouse', 'tenement', 'apartments', 'office', 'keep', 'castle', 'townhall', 'guildhall', 'parliament', 'ministry', 'bank', 'hospital', 'laboratory', 'foundry', 'factory', 'gasworks', 'refinery', 'glassworks', 'powerhouse', 'waterworks', 'datacentre', 'reactor', 'fusionplant', 'launchpad', 'orbitalyard', 'spaceport', 'airport', 'hangar', 'mast', 'station', 'granary', 'tavern', 'guesthouse', 'roadhouse', 'bathhouse', 'apothecary', 'aqueduct', 'lighthouse', 'beacon', 'harbour', 'landing'];
    const seen = {}, same = [], all = Object.keys(B); all.forEach(k => { const s = sig(d.kindLook(k, 3)); if (seen[s]) same.push(k + '=' + seen[s]); else seen[s] = k; });
    const hut = sig(d.kindLook('zzznotakind', 3)); return { all: all.length, same: same, fam: fam.filter(k => B[k]).length, famN: fam.length, missing: fam.filter(k => !B[k]), shapes: fam.filter(k => B[k]).map(k => d.kindLook(k, 3).shapes.length), tones: sig(d.kindLook('rowhouse', 1)) !== sig(d.kindLook('rowhouse', 2)) }; });
  ok(b.all >= 60 && b.same.length === 0, 'the ' + b.all + ' kinds of building in a world of the fifth age are each drawn differently' + (b.same.length ? ' (the same: ' + b.same.join(', ') + ')' : ''));
  ok(b.fam >= 38 && Math.min.apply(null, b.shapes) >= 6 && b.tones, b.fam + ' kinds of the library have a look of their own family, each of six shapes or more, toned by who holds them' + (b.missing.length ? ' (not yet open here: ' + b.missing.join(', ') + ')' : ''));
  const c = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, cv = document.createElement('canvas'); cv.width = 200; cv.height = 120; const g = cv.getContext('2d'), out = {};
    ['cart', 'wagon', 'chariot', 'steamwagon', 'tractionengine', 'motorcar', 'truck', 'tractor', 'armouredcar'].forEach(k => { g.clearRect(0, 0, 200, 120); d.drawVehicle(g, k, 100, 60, 60, 1, 200); const px = g.getImageData(0, 0, 200, 120).data; let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) n++; out[k] = n; });
    const who = w.agents.filter(q => q.things && q.things.truck)[0]; let onRoad = null, off = null; if (who) { const keep = [who.x, who.y]; for (const i in w.roads) if (w.roads[i] === 1) { who.x = (+i) % w.W; who.y = Math.floor((+i) / w.W); break; } onRoad = d.vehicleOf(w, who, true); who.x = keep[0]; who.y = keep[1]; const rd = w.roads[who.y * w.W + who.x]; w.roads[who.y * w.W + who.x] = 0; off = d.vehicleOf(w, who, true); w.roads[who.y * w.W + who.x] = rd; } return { out: out, onRoad: onRoad, off: off }; });
  ok(Object.keys(c.out).every(k => c.out[k] > 300) && new Set(Object.values(c.out)).size >= 7, 'each of nine vehicles is drawn, and differently (' + Object.keys(c.out).map(k => k + ' ' + c.out[k]).join(', ') + ' points)');
  ok(c.onRoad === 'truck' && c.off !== 'truck', 'one who holds a truck is shown in it on a paved street and not off the road (' + c.off + ')');
  /* roads as they are drawn: a ribbon far narrower than a building, curved where it bends, joined aslant, with a path to a door */
  const r = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, made = k => w.roads[k] && w.roads[k] !== 3; let straight = null, n2 = 0, n3 = 0, slant = 0, total = 0;
    for (const k in w.roads) { if (!made(k)) continue; total++; const i = +k, x = i % w.W, y = (i - x) / w.W, L = d.wayLinks(x, y, false); if (L.length >= 3) n3++; if (L.length === 2) n2++; if (L.some(q => q[0] && q[1])) slant++;
      if (!straight && w.roads[k] === 1 && L.length === 2 && L[0][0] === 1 && L[1][0] === -1 && !L[0][1] && !L[1][1] && !(w.shelters[i - w.W] > 0) && !(w.shelters[i + w.W] > 0)) straight = { x: x, y: y }; }
    if (straight) { d.cam.x = straight.x + 0.5; d.cam.y = straight.y + 0.5; d.cam.z = 60; d.st.world.agents.forEach(q => { if (Math.abs(q.x - straight.x) < 2 && Math.abs(q.y - straight.y) < 2) { q.x += 3; q.px = q.x; } }); }
    return { straight: straight, n2: n2, n3: n3, slant: slant, total: total }; });
  await page.waitForTimeout(700);
  const grab = () => page.evaluate(() => { const cv = document.getElementById('world'), g = cv.getContext('2d'), dpr = cv.width / cv.clientWidth, zpx = Math.round(60 * dpr); return { zpx: zpx, col: Array.from(g.getImageData(Math.round(cv.width / 2), Math.round(cv.height / 2 - zpx / 2), 1, zpx).data) }; });
  const withRoad = await grab(); await page.evaluate(() => { const w = window.SWdebug.st.world; window._roads = w.roads; w.roads = {}; }); await page.waitForTimeout(500);
  const without = await grab(); await page.evaluate(() => { window.SWdebug.st.world.roads = window._roads; }); await page.waitForTimeout(300);
  const rw = (() => { let n = 0; for (let i = 0; i < withRoad.col.length; i += 4) if (Math.abs(withRoad.col[i] - without.col[i]) + Math.abs(withRoad.col[i + 1] - without.col[i + 1]) + Math.abs(withRoad.col[i + 2] - without.col[i + 2]) > 24) n++; return { stone: n, tile: withRoad.zpx, share: n / withRoad.zpx }; })(); /* the points across one tile that the road changes */
  ok(r.straight && rw.share > 0.2 && rw.share < 0.45, 'a paved street is drawn as a ribbon ' + Math.round(rw.share * 100) + '% of a tile wide (' + rw.stone + ' of ' + rw.tile + ' points across), not as a slab');
  ok(r.total > 150 && r.slant > r.total * 0.25 && r.n3 >= 20 && r.n2 > r.total * 0.5, 'of ' + r.total + ' street tiles, ' + r.slant + ' are joined aslant, ' + r.n3 + ' are junctions and ' + r.n2 + ' are drawn as a curve or a straight between two neighbours');
  const m = await page.evaluate(async () => { const A = window.SWA, out = []; let started = false; try { started = !!A.start(7); } catch (e) { out.push('start: ' + e.message); }
    for (let era = 1; era <= 6; era++) { try { for (let k = 0; k < 3; k++) { A.scene(0.2, 1, 'clear', { biome: 'woodland', mood: 'calm', era: era, crowd: 2 }); if (A.ageOf() !== era) out.push('era ' + era + ' not taken'); await new Promise(r => setTimeout(r, 60)); } /* the page sets the scene too, twice a second: the age is read at once */ ['built', 'drove', 'smoke', 'rode'].forEach(t => A.event(t, { pan: 0, near: 1, hue: 40, steam: era === 4 })); } catch (e) { out.push('era ' + era + ': ' + e.message); } }
    return { started: started, out: out }; });
  ok(m.out.length === 0, 'the music of each of the six ages, and the sounds of building, driving, smoke and riding, play with no error' + (m.started ? '' : ' (sound could not start in this browser: the calls were made with it off)') + (m.out.length ? ': ' + m.out.join('; ') : ''));
  await page.screenshot({ path: path.join(__dirname, 'shots', 'town-fifth-age.png') });
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
