const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8128);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    let n = 0; window.CALLS = { mind: 0, story: 0, maker: 0, models: {} };
    const sample = async (prompt, opts) => {
      n++; await new Promise(r => setTimeout(r, 200)); window.CALLS.models[opts.model] = (window.CALLS.models[opts.model] || 0) + 1;
      if (/^You are the chronicler/.test(prompt)) { window.CALLS.story++; return { text: JSON.stringify({ title: 'The first days by the river', text: 'Three bands woke far apart. Brukel claimed the grain and Yeba let him have it. Nobody built anything, and nobody went hungry. '.repeat(3), threads: [{ name: 'Brukel and Yeba', kind: 'rivalry', text: 'Brukel guards the grain; Yeba keeps her distance.' }, { name: 'The eastern band', kind: 'band', text: 'Still three strangers who happen to stand near one another.' }], trends: ['Nothing has been built (0 shelters).', 'No one follows anyone.'] }) }; }
      if (/^You are the MAKER/.test(prompt)) { window.CALLS.maker++; return { text: JSON.stringify({ seen: 'The beings are fed and idle. Nothing in the land rewards curiosity or punishes carelessness.', review: [], changes: [{ op: 'site', name: 'The Humming Stone', kind: 'spirit', on: 'grass', r: 2, fx: [{ on: 'learning', times: 2, for: 480 }, { on: 'fear', by: 0.3 }] }, { op: 'plant', name: 'moonwort', base: 'sunleaf', nutrition: 2, soil: { grass: 1, forest: 0.6 }, fx: [{ on: 'vigor', times: 1.5, for: 300 }], sow: 25 }, { op: 'recipe', name: 'night vigil', way: null, needs: { wood: 1, fire: true, night: true, beings: 1 }, gives: { fxAll: [{ on: 'fear', by: -0.5 }, { on: 'toughness', times: 1.3, for: 240 }] }, hint: 'Keep a fire through the dark with another beside you.' }], predict: 'At least two beings find the stone within four days.', ideas: { add: ['salt licks that draw herds to one place'], done: [], drop: [] }, lesson: 'Plenty alone makes a quiet world.', requests: ['Animals should mate in pairs; I cannot express that with my parts.'] }) }; }
      window.CALLS.mind++;
      const others = (prompt.match(/^- (\w+) at \(/gm) || []).map(s => s.slice(2).split(' ')[0]), o = others[0] || 'all';
      return { text: JSON.stringify({ thought: 'Thought ' + n + ': I want ' + o + ' to answer me and I am tired of this place.', feeling: 'Restless toward ' + o + '.', say: n % 2 ? { to: o, text: 'Line ' + n + ': walk with me.' } : null, plan: [{ do: 'explore', dir: ['N', 'E', 'S', 'W'][n % 4], ticks: 60 }], tale: /DEEP REFLECTION/.test(prompt) ? { title: 'The waking', text: 'We woke among strangers and knew nothing.' } : undefined }), modelApplied: opts.model };
    };
    sample.limits = async () => ({ tools: null });
    window.claude = { use: async (k) => k === 'sample' ? sample : null };
  });
  await page.goto('http://localhost:8128/'); await page.waitForTimeout(800);
  await page.evaluate(() => { const d = window.SWdebug; d.st.settings.perMinute = 60; d.st.settings.story.every = 1; d.st.settings.maker.every = 1; });
  await page.selectOption('#selSpeed', '8'); await page.evaluate(() => { const b = document.getElementById('btnMinds'); if (!b.classList.contains('awake')) b.click(); });
  await page.waitForTimeout(34000);
  await page.keyboard.press('Escape');
  await page.click('#tabs button[data-tab="story"]'); await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + '/g9-story.png', clip: { x: 1020, y: 0, width: 420, height: 900 } });
  await page.click('#tabs button[data-tab="maker"]'); await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + '/g9-maker.png', clip: { x: 1020, y: 0, width: 420, height: 900 } });
  await page.click('#tabs button[data-tab="settings"]'); await page.waitForTimeout(400);
  const out = await page.evaluate(() => { const d = window.SWdebug, st = d.st, w = st.world; const q = w.sites[0]; if (q) { d.cam.x = q.x + 0.5; d.cam.y = q.y + 0.5; d.cam.z = 30; }
    return { day: SW.day(w), calls: window.CALLS, chapters: st.story.chapters.length, threads: st.story.threads.length, visits: st.maker.log.length, ops: st.maker.log.map(e => e.ops), refused: st.maker.log.map(e => e.refused), sites: w.sites.length, moonwort: w.plants.filter(p => p && p.sp === 'moonwort').length, recipe: !!(w.laws.recipes || {})['night vigil'], ideas: st.maker.ideas.length, requests: st.maker.requests.length, tales: Object.values(st.minds).filter(m => (m.tales || []).length).length, err: SWK.error || '', tabs: document.querySelectorAll('#tabs button').length }; });
  await page.waitForTimeout(800); await page.screenshot({ path: SHOTS + '/g9-site.png', clip: { x: 150, y: 100, width: 720, height: 640 } });
  console.log(JSON.stringify(out));
  const good = out.chapters >= 1 && out.visits >= 2 && out.sites >= 3 && out.moonwort > 5 && out.recipe && out.requests >= 1 && out.calls.models['claude-opus-5-5'] >= 1 && !out.err;
  console.log('ERRORS', errs.length, errs.slice(0, 5).join('\n'), good ? 'OUTER LOOP OK' : 'OUTER LOOP FAILED');
  await browser.close(); srv.close();
})();
