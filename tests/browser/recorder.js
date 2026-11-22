/* The recorder against a stand-in store, the download, the inspector's new parts, and the sound for 12 seconds. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src'), SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8127);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    let n = 0; window.DB = {}; window.DBwrites = []; window.DL = [];
    const sample = async (prompt, opts) => {
      n++; await new Promise(r => setTimeout(r, 250));
      const others = (prompt.match(/^- (\w+) at \(/gm) || []).map(s => s.slice(2).split(' ')[0]), o = others[0] || 'all';
      const d = { thought: 'Thought ' + n + ': I am tired of standing in one place and I want ' + o + ' to answer me.', feeling: 'Restless, and curious about ' + o + '.', wonder: n % 3 ? null : 'What lies past the river?', say: n % 2 ? { to: o, text: 'Line ' + n + ': walk with me to the river.' } : null, plan: [{ do: 'explore', dir: ['N', 'E', 'S', 'W'][n % 4], ticks: 60 }] };
      return { text: JSON.stringify(d), modelApplied: opts.model };
    };
    sample.limits = async () => ({ tools: null });
    let inflight = 0;
    const db = { doc: (p) => ({ set: async (body) => { if (p.split('/').length % 2) throw new TypeError('odd path ' + p); inflight++; if (inflight > 1) window.DBwrites.push('OVERLAP'); await new Promise(r => setTimeout(r, 120)); const sz = JSON.stringify(body).length; window.DB[p] = body; window.DBwrites.push(p + ' ' + sz); inflight--; } }) };
    const downloads = { save: async (q) => { window.DL.push({ name: q.filename, size: q.data.length, ok: !!JSON.parse(q.data).digest }); return { status: 'saved' }; } };
    window.claude = { use: async (k) => k === 'sample' ? sample : k === 'db' ? db : k === 'downloads' ? downloads : null };
  });
  await page.goto('http://localhost:8127/'); await page.waitForTimeout(800);
  await page.evaluate(() => { const d = window.SWdebug; d.st.settings.perMinute = 60; d.st.settings.parallel = 6; });
  await page.selectOption('#selSpeed', '8'); await page.click('#btnSound'); await page.click('#btnMinds');
  await page.waitForTimeout(12000);
  await page.click('#tabs button[data-tab="settings"]'); await page.waitForTimeout(400);
  const note1 = await page.textContent('#recNote');
  await page.click('button[data-act="recsend"]'); await page.waitForTimeout(6000);
  await page.click('button[data-act="recsave"]'); await page.waitForTimeout(500);
  const out = await page.evaluate(() => { const d = window.SWdebug, R = d.st.rec, keys = Object.keys(window.DB);
    const chunks = keys.filter(k => /\/chunks\//.test(k)), items = chunks.reduce((s, k) => s + window.DB[k].items.length, 0), kinds = {};
    chunks.forEach(k => window.DB[k].items.forEach(i => kinds[i.t] = (kinds[i.t] || 0) + 1));
    return { run: d.st.runId, used: d.st.used, all: R.all.length, sent: R.sent, chunk: R.chunk, chunks: chunks.length, items, kinds, meta: window.DB['runs/' + d.st.runId], state: !!(window.DB['runs/' + d.st.runId + '/state/latest'] || {}).digest, overlap: window.DBwrites.filter(x => x === 'OVERLAP').length, biggest: Math.max.apply(null, window.DBwrites.filter(x => x !== 'OVERLAP').map(x => +x.split(' ')[1])), dl: window.DL, note: document.getElementById('recNote').textContent, settings: d.st.settings }; });
  await page.screenshot({ path: SHOTS + '/g7-setup.png', clip: { x: 1020, y: 0, width: 420, height: 900 } });
  await page.click('#tabs button[data-tab="inspect"]'); await page.keyboard.press('Escape'); await page.click('#pane-inspect .line.jump'); await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOTS + '/g7-inspect.png', clip: { x: 1020, y: 0, width: 420, height: 900 } });
  const insp = await page.evaluate(() => { const t = document.getElementById('pane-inspect').textContent; return { presses: /What presses on it/.test(t), feels: /feels/.test(t), wonders: /wonders/.test(t) }; });
  console.log('before send:', note1);
  console.log(JSON.stringify(out, null, 1).slice(0, 1500));
  console.log('inspector', JSON.stringify(insp));
  const good = out.sent >= out.all - 20 && out.items === out.sent && out.chunks === out.chunk && out.meta && out.meta.records === out.sent && out.state && !out.overlap && out.biggest < 256000 && out.dl.length === 1 && out.dl[0].ok && insp.presses && insp.feels;
  console.log('ERRORS', errs.length, errs.slice(0, 5).join('\n'), good ? 'RECORDER OK' : 'RECORDER FAILED');
  await browser.close(); srv.close();
})();
