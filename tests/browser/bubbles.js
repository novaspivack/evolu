/* What is said and what is thought are shown in boxes over the map. No box may lie over another, whichever came first, however many speak at once,
   and none may lie under a panel of the page. (Before, a thought was lifted by a fixed 70 points only if the speech had come first; if the thought
   came first, or the speech was taller than 70 points, or two beings stood together, one box covered the other.) */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8141);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
const cross = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pairs = L => { let n = 0; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (cross(L[i], L[j])) n++; return n; };
const THINK = 'Tonchi is hurt with health 27, and I have no feverbark left, only the memory of how it eased wounds. An icebear is four steps off and has already bitten me twice, so going straight there is folly.';
const SAY = 'Shohua, Tonchi is at the southwest, health 27. I am eating, then I take feverbark to her. Meet me there and keep clear of the icebear.';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const view of [{ width: 1440, height: 900, name: 'desktop' }, { width: 750, height: 1130, name: 'narrow' }]) {
    const page = await browser.newPage({ viewport: { width: view.width, height: view.height } });
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript(() => { window.EVOLU_SEED = 7; });
    await page.goto('http://localhost:8141/'); await page.waitForTimeout(2500);
    /* the placing itself, apart from the page */
    const pure = await page.evaluate(() => {
      const d = window.SWdebug, P = d.placeBubbles, o = {};
      o.one = P([{ ax: 400, top: 500, bot: 540, boxes: [{ w: 200, h: 90 }, { w: 220, h: 100 }] }], 1000, 800, []);
      o.two = P([{ ax: 400, top: 500, bot: 540, boxes: [{ w: 200, h: 90 }] }, { ax: 430, top: 505, bot: 545, boxes: [{ w: 200, h: 60 }, { w: 200, h: 60 }] }], 1000, 800, []);
      o.top = P([{ ax: 400, top: 60, bot: 100, boxes: [{ w: 200, h: 90 }, { w: 220, h: 100 }] }], 1000, 800, []);
      o.panel = P([{ ax: 400, top: 300, bot: 340, boxes: [{ w: 200, h: 90 }] }], 1000, 800, [{ x: 300, y: 150, w: 400, h: 120 }]);
      o.edge = P([{ ax: 4, top: 400, bot: 440, boxes: [{ w: 200, h: 60 }] }, { ax: 996, top: 400, bot: 440, boxes: [{ w: 200, h: 60 }] }], 1000, 800, []);
      const crowd = []; for (let k = 0; k < 14; k++) crowd.push({ ax: 300 + (k % 5) * 40, top: 380 + Math.floor(k / 5) * 30, bot: 420 + Math.floor(k / 5) * 30, boxes: [{ w: 180 + k * 3, h: 58 + (k % 3) * 16 }, { w: 200, h: 74 }] });
      o.crowd = P(crowd, 800, 600, [{ x: 0, y: 0, w: 320, h: 90 }, { x: 0, y: 480, w: 190, h: 120 }]); o.fixed = [{ x: 0, y: 0, w: 320, h: 90 }, { x: 0, y: 480, w: 190, h: 120 }];
      return o;
    });
    if (view.name === 'desktop') {
      const one = pure.one[0];
      ok(one && one.rects.length === 2 && !one.below && one.shift === 0 && one.rects[0].y + one.rects[0].h === 490 && one.rects[1].y + one.rects[1].h < one.rects[0].y, 'what is said stands just over the one who says it, and what it thinks stands clear above that: ' + JSON.stringify(one.rects.map(r => [r.y, r.y + r.h])));
      const all2 = pure.two[0].rects.concat(pure.two[1].rects);
      ok(pairs(all2) === 0 && pure.two[0].shift === 0 && pure.two[1].shift > 0 && pure.two[1].rects.length === 2, 'two who stand together: the first keeps its place and the second is lifted clear of it, both its boxes whole (lifted ' + Math.round(pure.two[1].shift) + ')');
      ok(pure.top[0] && pure.top[0].below && pure.top[0].rects[0].y === 110 && pure.top[0].rects[1].y > pure.top[0].rects[0].y + pure.top[0].rects[0].h, 'where there is no room above, the stack hangs below, speech still nearest');
      ok(pure.panel[0] && !cross(pure.panel[0].rects[0], { x: 300, y: 150, w: 400, h: 120 }), 'a box is never put under a panel of the page: ' + JSON.stringify(pure.panel[0]));
      ok(pure.edge.every(p => p && p.rects[0].x >= 6 && p.rects[0].x + p.rects[0].w <= 994), 'at the sides of the view a box stays whole within it');
      const laid = [].concat.apply([], pure.crowd.filter(Boolean).map(p => p.rects)), shown = pure.crowd.filter(Boolean).length;
      ok(pairs(laid) === 0 && laid.every(r => !pure.fixed.some(f => cross(r, f)) && r.y >= 6 && r.y + r.h <= 594 && r.x >= 6 && r.x + r.w <= 794) && shown >= 3 && shown < 14, 'fourteen speaking in one small place: ' + laid.length + ' boxes of ' + shown + ' beings are shown, none over another or over a panel or off the view, and the rest wait as dots');
    }
    /* on the page: the thought first and then the speech (the order that used to put white over blue), for five standing together */
    const run = async (label, setup) => page.evaluate(async ({ THINK, SAY, setup }) => {
      const d = window.SWdebug, w = d.st.world, U = d.U; U.playing = false; U.sel = null; U.bubbles.length = 0; w.creatures.length = 0;
      const A = w.agents.filter(a => a.alive !== false).slice(0, 5), a0 = A[0];
      A.forEach((a, k) => { a.x = a.px = a0.x + [0, 1, -1, 2, 0][k]; a.y = a.py = a0.y + [0, 0, 1, 1, -1][k]; });
      d.cam.z = 26; d.cam.x = a0.x; d.cam.y = a0.y + (setup.top ? document.getElementById('stage').getBoundingClientRect().height / 26 / 2 - 6 : 0); d.clampCam();
      const order = setup.order === 'say-first' ? ['say', 'think'] : ['think', 'say'];
      A.slice(0, setup.n).forEach((a, k) => { order.forEach(kind => d.bubble(a.id, kind, (kind === 'say' ? SAY : THINK).slice(0, 60 + k * 35))); });
      if (setup.onlyThink) d.bubble(A[4].id, 'think', THINK);
      await new Promise(r => setTimeout(r, 700));
      const first = JSON.parse(JSON.stringify(U.laid)); await new Promise(r => setTimeout(r, 500));
      return { laid: U.laid, first: first, hud: d.hudRects(), ids: A.map(a => a.id), live: U.bubbles.length };
    }, { THINK, SAY, setup });
    const check = (label, r, want) => {
      const L = r.laid, own = id => L.filter(b => b.id === id), near = b => b.below ? b.y : -(b.y + b.h);
      const order = r.ids.every(id => { const s = own(id).find(b => b.kind === 'say'), t = own(id).find(b => b.kind === 'think'); return !s || !t || (s.below ? t.y > s.y + s.h : t.y + t.h < s.y); });
      const still = r.first.length === L.length && r.first.every((b, i) => Math.abs(b.y - L[i].y) < 0.5 && Math.abs(b.x - L[i].x) < 0.5);
      ok(L.length >= want && pairs(L) === 0, view.name + ', ' + label + ': ' + L.length + ' boxes shown of ' + r.live + ' and no box lies over another');
      ok(L.every(b => !r.hud.some(h => cross(b, h))) && order && still, view.name + ', ' + label + ': none lies under a panel, each speech is nearer its speaker than the thought, and nothing shifts from one frame to the next');
    };
    const a = await run('thought first', { n: 1, order: 'think-first' }); check('one being, thought and then speech', a, 2);
    const b = await run('speech first', { n: 1, order: 'say-first' }); check('one being, speech and then thought', b, 2);
    ok(a.laid.length === 2 && b.laid.length === 2 && ['say', 'think'].every(k => { const p = a.laid.find(q => q.kind === k), q = b.laid.find(q => q.kind === k); return p && q && Math.abs(p.y - q.y) < 0.5 && Math.abs(p.h - q.h) < 0.5; }), view.name + ': the two boxes stand in the same places whichever came first');
    const c5 = await run('five', { n: 5, order: 'think-first' }); check('five standing together, each thinking and speaking', c5, 4);
    await page.screenshot({ path: path.join(SHOTS, 'bubbles-' + view.name + '.png') });
    const up = await run('under the top panel', { n: 2, order: 'think-first', top: true }); check('two beings just under the top of the view', up, 2);
    await page.screenshot({ path: path.join(SHOTS, 'bubbles-top-' + view.name + '.png') });
    await page.close();
  }
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
