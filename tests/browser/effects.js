/* Generation 21 on the page: the small signs and sounds of events; a wind that does not come round as a breath; no snow about the equator in winter. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8137);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.EVOLU_SEED = 7; });
  await page.goto('http://localhost:8137/'); await page.waitForTimeout(2500);
  /* signs */
  const fx = await page.evaluate(() => {
    const d = window.SWdebug, w = d.st.world, a = w.agents[0], b = w.agents[1]; d.U.playing = false; d.cam.z = 20; d.cam.x = a.x; d.cam.y = a.y; d.clampCam(); b.x = a.x + 1; b.y = a.y;
    const kinds = function (ev) { d.U.fx.length = 0; d.event(ev); const o = {}; d.U.fx.forEach(function (f) { o[f.type] = (o[f.type] || 0) + 1; }); return o; }, out = {};
    out.mined = kinds({ type: 'mined', a: a.id, kind: 'amber', first: true, x: a.x, y: a.y });
    out.telling = kinds({ type: 'telling', a: a.id, near: [b.id] });
    out.traded = kinds({ type: 'traded', a: a.id, b: b.id, gave: 'amber', got: 'berry' });
    out.offer = kinds({ type: 'offer', a: a.id, b: b.id, give: 'amber', want: 'food' });
    out.fished = kinds({ type: 'fished', a: a.id });
    out.tamed = kinds({ type: 'tamed', a: a.id, kind: 'dog', n: 1 });
    out.made = kinds({ type: 'made', a: a.id, what: 'amberknot', thing: 'amberknot' });
    out.arrived = kinds({ type: 'arrived', ids: [a.id], people: 0 });
    out.healed = kinds({ type: 'healed', a: a.id, b: b.id });
    out.claimed = kinds({ type: 'claimed', a: a.id, x: a.x, y: a.y, name: 'the Hold', n: 2, kinds: {} });
    ['felled', 'stashed', 'bridged', 'paved', 'dismantled', 'herdcame'].forEach(function (t) { out[t] = kinds({ type: t, a: a.id, x: a.x, y: a.y, kind: 'caribou', n: 5 }); });
    ['aged', 'grown', 'read', 'rallied', 'shared', 'rode', 'fed', 'drank', 'sick', 'crafted'].forEach(function (t) { out[t] = kinds({ type: t, a: a.id, b: b.id }); });
    out.mended = kinds({ type: 'mended', a: a.id, b: b.id }); d.event({ type: 'weather', kind: 'rain', was: 'clear' });
    return out;
  });
  ok(fx.mined.spark >= 6 && fx.mined.float === 1, 'ore won from the ground glints, and the first of a kind is named: ' + JSON.stringify(fx.mined));
  ok(fx.telling.mote >= 12 && fx.telling.ring === 1 && fx.telling.float === 1, 'a tale told at the fire sends up sparks and a note: ' + JSON.stringify(fx.telling));
  ok(fx.traded.slash === 1 && fx.traded.float === 1 && fx.traded.mote >= 5 && fx.offer.float === 1, 'an offer asks its question over the one who makes it, and a trade is drawn between the two');
  ok(fx.fished.ripple === 1 && fx.drank.ripple === 1, 'a line cast and a drink taken leave rings on the water');
  ok(fx.tamed.mote >= 6 && fx.made.mote >= 10 && fx.healed.mote >= 12 && fx.arrived.ring === 1 && fx.arrived.mote >= 14 && fx.claimed.ring === 1 && fx.claimed.float === 1, 'taming, a rite, a healing, newcomers and a claim each have their sign');
  ok(['felled', 'stashed', 'bridged', 'paved', 'dismantled'].every(t => fx[t].dot >= 4) && fx.herdcame.ring === 1 && fx.aged.mote >= 5 && fx.rallied.ring === 1 && fx.crafted.spark >= 3 && fx.sick.float === 1 && fx.mended.slash === 1 && fx.rode.dot >= 4, 'and so do the small works of a day: felling, storing, paving, a herd coming, coming of age, a rally, a thing made');
  /* Generation 22: the signs of hunger and of a call; verse in lines */
  const fx2 = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world, a = w.agents[0], b = w.agents[1], o = {}; const kinds = function (ev) { d.U.fx.length = 0; d.event(ev); const q = {}; d.U.fx.forEach(function (f) { q[f.type] = (q[f.type] || 0) + 1; }); return q; };
    o.mustered = kinds({ type: 'mustered', a: a.id, ids: [b.id], what: 'hunt' }); o.begged = kinds({ type: 'begged', a: a.id, b: b.id }); o.succoured = kinds({ type: 'succoured', a: a.id, b: b.id, what: 'berry' }); o.faint = kinds({ type: 'faint', a: a.id });
    o.verse = d.verse('The ice was thin, the night was long / we kept the fire, we kept the song'); o.plain = d.verse('a <b> tale / of one'); return o; });
  ok(fx2.mustered.ring === 1 && fx2.mustered.float === 1 && fx2.begged.float === 1 && fx2.succoured.slash === 1 && fx2.succoured.mote >= 10 && fx2.faint.float === 1 && fx2.faint.ring === 1, 'a call to hunt, a beggar, a feeding of the starving and a collapse each have their sign');
  ok(fx2.verse === 'The ice was thin, the night was long<br>we kept the fire, we kept the song' && fx2.plain === 'a &lt;b&gt; tale<br>of one', 'a song written with / between its lines is shown line by line, and nothing in it can become markup');
  /* the chart of the living */
  const eco = await page.evaluate(async () => { const d = window.SWdebug, w = d.st.world; d.U.hist.length = 0; for (let k = 0; k < 30; k++) d.U.hist.push({ d: 1 + Math.floor(k / 6), a: 15 + (k % 4), h: 240 + k, s: 20 + (k % 3), p: 2000 - k * 5 });
    d.setTab('chronicle'); await new Promise(r => setTimeout(r, 400)); d.drawEco(); const c = document.getElementById('eco'), q = c.getBoundingClientRect(), txt = id => (document.getElementById(id) || {}).textContent;
    const cols = Array.from(document.querySelectorAll('.legend i')).map(i => i.style.background), now = { a: txt('ecoN_a'), h: txt('ecoN_h'), s: txt('ecoN_s'), p: txt('ecoN_p'), day: txt('ecoDay') };
    c.dispatchEvent(new PointerEvent('pointermove', { clientX: q.left + 34 + (q.width - 42) * 6 / 29, clientY: q.top + 20, bubbles: true })); const then = { a: txt('ecoN_a'), h: txt('ecoN_h'), p: txt('ecoN_p'), day: txt('ecoDay') };
    c.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true })); const g = c.getContext('2d'), px = (v, col) => { /* is the line of this colour drawn at the height the ratio scale gives? */ return 1; };
    return { cols: cols, now: now, then: then, back: txt('ecoDay'), legend: document.querySelector('.legend').textContent }; });
  ok(new Set(eco.cols).size === 4 && !/÷/.test(eco.legend), 'the four lines of the chart have four different colours, and plants are no longer shown divided by ten: ' + eco.cols.join(' '));
  ok(eco.now.a === '16' && eco.now.h === '269' && eco.now.s === '22' && eco.now.p === '1855' && /^now, day 5/.test(eco.now.day), 'under the chart the count of each stands in its own colour: ' + JSON.stringify(eco.now));
  ok(eco.then.a === '17' && eco.then.h === '246' && eco.then.p === '1970' && eco.then.day === 'day 2' && /^now/.test(eco.back), 'pointing at the chart reads the counts of that day (' + JSON.stringify(eco.then) + '), and leaving it returns to now');
  await page.screenshot({ path: path.join(SHOTS, 'chart-of-the-living.png') });
  /* Generation 23: an eased pace is shown for as long as it lasts, and refusals never switch the minds off */
  const pace = await page.evaluate(async () => { const d = window.SWdebug, st = d.st, was = st.on, wait = () => new Promise(r => setTimeout(r, 700)), meter = () => document.getElementById('meter').textContent;
    st.on = true; st.rate = 0; st.par = 0; st.narrow = false; await wait(); const plain = meter();
    for (let k = 0; k < 3; k++) SWM.ease(st, Date.now()); await wait(); const eased = meter(), e1 = SWM.eased(st);
    for (let k = 0; k < 9; k++) SWM.ease(st, Date.now()); await wait(); const narrow = meter(), on = st.on, notice = document.getElementById('notice').hidden ? '' : document.getElementById('notice').textContent;
    st.rate = 0; st.par = 0; st.narrow = false; st.hold = 0; st.easeN = 0; st.notice = ''; await wait(); const after = meter(); st.on = was;
    return { plain: plain, eased: eased, narrow: narrow, after: after, on: on, e1: e1, notice: notice }; });
  ok(!/pace eased|in view only/.test(pace.plain) && /pace eased/.test(pace.eased) && pace.e1.par === 1 && /minds in view only/.test(pace.narrow) && pace.on === true && !/pace eased|in view only/.test(pace.after), 'the meter says "pace eased" after three refusals and "minds in view only" after twelve, the minds are still on, and it clears when the pace is whole again');
  ok(/Nothing has been switched off/.test(pace.notice || ''), 'and the notice says that nothing has been switched off');
  /* a notice passes by itself */
  await page.evaluate(() => { window.SWdebug.notice('A notice with nothing to do.'); }); const shown = await page.evaluate(() => !document.getElementById('notice').hidden);
  await page.waitForTimeout(10600); const gone = await page.evaluate(() => document.getElementById('notice').hidden);
  await page.evaluate(() => { window.SWdebug.notice('A notice with something to do.', { label: 'Do it', run: function () {} }); }); await page.waitForTimeout(10600); const stays = await page.evaluate(() => !document.getElementById('notice').hidden);
  ok(shown && gone && stays, 'a notice passes by itself after ten seconds; one that offers something to do stays for thirty');
  await page.evaluate(() => { document.getElementById('notice').hidden = true; window.SWdebug.setTab('inspect'); });
  await page.waitForTimeout(700); /* the signs are drawn for a while: an error in drawing one would show here */
  /* sound */
  const snd = await page.evaluate(async () => {
    const A = window.SWA, w = window.SWdebug.st.world; if (!A.on) A.start(w.seed); if (!A.on || !A.ctx) return { on: false };
    const b = A.noise(), d = b.getChannelData(0), n = d.length, sr = b.sampleRate, rms = function (i0, m) { let s = 0; for (let i = i0; i < i0 + m; i++) s += d[i] * d[i]; return Math.sqrt(s / m); };
    const win = Math.floor(sr * 0.1), mid = rms(Math.floor(n / 2), win * 10); let low = 9, step = 0; for (let k = 0; k < 8; k++) low = Math.min(low, rms(k * win, win), rms(n - (k + 1) * win, win)); for (let i = 1; i < 2000; i++) step = Math.max(step, Math.abs(d[i] - d[i - 1]));
    const types = ['mined', 'wood', 'stashed', 'craft', 'tamed', 'rode', 'telling', 'rite', 'shared', 'healed', 'sick', 'offer', 'traded', 'claimed', 'arrived', 'aged', 'rallied', 'herd', 'splash', 'opened', 'weather']; let threw = '';
    types.forEach(function (t) { try { A.event(t, { pan: 0, near: 1, hue: 120 }); } catch (e) { threw += t + ': ' + e.message + ' '; } });
    ['clear', 'rain', 'storm', 'gale', 'snow', 'fog', 'heat'].forEach(function (k) { try { A.scene(0.2, 3, k, { biome: 'steppe', warm: k === 'rain' }); } catch (e) { threw += k + ': ' + e.message + ' '; } });
    return { on: true, secs: n / sr, mid: mid, low: low, join: Math.abs(d[0] - d[n - 1]), step: step, threw: threw };
  });
  ok(snd.on && snd.threw === '', 'every new sound plays and every sky can be set without a fault' + (snd.threw ? ': ' + snd.threw : ''));
  ok(snd.on && snd.secs > 12 && snd.low > snd.mid * 0.45 && snd.join <= snd.step * 3, 'the bed of wind and rain does not dip where it comes round (quietest tenth of a second at either end ' + (snd.low / snd.mid).toFixed(2) + ' of the middle; the join steps ' + snd.join.toFixed(4) + ' against ' + snd.step.toFixed(4) + ' between neighbours)');
  /* winter about the equator */
  const pix = async () => page.evaluate(() => { const cv = document.getElementById('world'), g = cv.getContext('2d'), d = g.getImageData(Math.round(cv.width * 0.3), Math.round(cv.height * 0.3), Math.round(cv.width * 0.4), Math.round(cv.height * 0.4)).data; let white = 0, n = 0; for (let i = 0; i < d.length; i += 16) { n++; if (d[i] > 150 && d[i + 1] > 160 && d[i + 2] > 165 && Math.abs(d[i] - d[i + 2]) < 50) white++; } return white / n; });
  const where = await page.evaluate(() => {
    const d = window.SWdebug, w = d.st.world, V = w.veil; for (const i in V.t) { w.terrain[i] = V.t[i]; w.fert[i] = V.f[i]; } V.t = {}; V.f = {};
    w.tick = 10 * w.laws.time.dayLength + 100; w.weather.kind = 'clear'; w.weather.until = w.tick + 9999; d.st.ui({ type: 'opened', x0: 0, x1: 1, y0: 0, y1: 1 });
    const mid = Math.round((w.H - 1) / 2), land = function (x, y) { let n = 0; for (let dx = -8; dx <= 8; dx++) for (let dy = -5; dy <= 5; dy++) { const t = w.terrain[SW.idx(w, x + dx, y + dy)]; if (t === 2 || t === 3 || t === 6) n++; } return n; };
    let best = null, cold = null; for (let x = 0; x < w.W; x += 3) { const R = SW.regionAt(w, x, mid); if (!R || R.biome === 'rainforest' || R.biome === 'desert') continue; const n = land(x, mid); if (!best || n > best.n) best = { x: x, y: mid, n: n, biome: R.biome }; }
    for (let x = 0; x < w.W; x += 3) for (const y of [mid - 30, mid + 30]) { const R = SW.regionAt(w, x, y); if (!R || R.polar || SW.climate(w, x, y) !== 0) continue; const n = land(x, y); if (!cold || n > cold.n) cold = { x: x, y: y, n: n, biome: R.biome }; }
    return { best: best, cold: cold, season: SW.season(w), sky: [SW.skyAt(w, best.x, best.y), SW.skyAt(w, cold.x, cold.y)] };
  });
  const go = async p => { await page.evaluate(([x, y]) => { const d = window.SWdebug; d.cam.z = 22; d.cam.x = x; d.cam.y = y; d.clampCam(); }, [p.x, p.y]); await page.waitForTimeout(1200); };
  await go(where.best); const wb = await pix(); const skyB = await page.evaluate(() => window.SWdebug.skyHere()); await page.screenshot({ path: path.join(SHOTS, 'winter-at-the-equator.png') });
  await go(where.cold); const wc = await pix(); const skyC = await page.evaluate(() => window.SWdebug.skyHere()); await page.screenshot({ path: path.join(SHOTS, 'winter-away-from-it.png') });
  ok(where.season === 3 && wb < 0.03 && wc > 0.25, 'in winter no snow lies about the equator, in ' + where.best.biome + ' country (' + (wb * 100).toFixed(1) + '% of the view white), while it lies on ' + where.cold.biome + ' country far from it (' + (wc * 100).toFixed(1) + '%)');
  ok(skyB === 'rain' && skyC === 'clear', 'and over the equator it rains under a sky that is clear elsewhere: the page shows the sky of the place looked at (' + skyB + ' / ' + skyC + ')');
  await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.cam.z = d.zGlobe() * 0.9; d.clampCam(); }); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(SHOTS, 'winter-globe.png') });
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
