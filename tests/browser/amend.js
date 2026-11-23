/* A chapter the chronicler wrote from too little can be written again from the full record and laid in the store beside the run
   (runs/<run id>/state/amend). The page looks for it once when a world is opened. Here the store is a stand-in. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src');
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8142);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    window.EVOLU_SEED = 7; window.STORE = { gets: [], sets: [], fail: 1 };
    const amend = { rev: 1, chapters: [{ n: 1, title: 'The Papa arrive', text: 'Days 37 to 39 were crowded. A small band of the Papa came in from beyond the edge of the land. <img src=x onerror="window.PWNED=1"> And so on.', why: 'Rewritten from the full record of the run. <b>plain</b>' }] };
    const db = { doc: p => ({
      get: () => { window.STORE.gets.push(p); if (/state\/amend$/.test(p) && window.STORE.fail-- > 0) return Promise.reject({ code: 'unavailable' }); return Promise.resolve(/state\/amend$/.test(p) ? { exists: true, data: () => amend } : { exists: false, data: () => undefined }); },
      set: () => { window.STORE.sets.push(p); return Promise.resolve(); } }) };
    window.claude = { use: name => Promise.resolve(name === 'db' ? db : null) };
  });
  await page.goto('http://localhost:8142/'); await page.waitForTimeout(1500);
  await page.evaluate(() => { const d = window.SWdebug; d.U.playing = false; d.st.story.chapters.push({ n: 1, day0: 1, day1: 4, title: 'Thin', text: 'The record is thin.' }); d.st.story.rev = (d.st.story.rev || 0) + 1; d.setTab('story'); });
  await page.waitForTimeout(6500);
  const a = await page.evaluate(() => { const d = window.SWdebug, c = d.st.story.chapters[0]; return { title: c.title, amended: c.amended, gets: window.STORE.gets.filter(p => /amend/.test(p)).length, at: d.U.amendAt > Date.now() }; });
  ok(a.title === 'Thin' && !a.amended && a.gets === 1 && a.at, 'the store did not answer the first time: nothing is changed, and the page waits a minute before asking again');
  await page.evaluate(() => { window.SWdebug.U.amendAt = 0; }); await page.waitForTimeout(6500);
  const b = await page.evaluate(() => {
    const d = window.SWdebug, c = d.st.story.chapters[0], pane = document.getElementById('pane-story');
    return { title: c.title, text: c.text, amended: c.amended, was: c.was && c.was.text, gets: window.STORE.gets.filter(p => /amend/.test(p)), wrote: window.STORE.sets.filter(p => /amend/.test(p)).length, pane: pane.innerText, imgs: pane.querySelectorAll('img').length + Array.from(pane.querySelectorAll('p.chapter, p.note')).reduce((n, e) => n + e.children.length, 0), pwned: !!window.PWNED, notice: (document.getElementById('notice') || {}).innerText || '', run: d.st.runId, rev: d.st.story.amended };
  });
  ok(b.title === 'The Papa arrive' && /A small band of the Papa/.test(b.text) && b.was === 'The record is thin.' && b.rev === 1, 'asked again, the store answers and the chapter is written again in the world, its first writing kept');
  ok(b.gets.length === 2 && b.gets[1] === 'runs/' + b.run + '/state/amend' && b.wrote === 0, 'it was read from the store beside this run and nowhere else, and the page writes nothing there');
  ok(/1\. The Papa arrive/i.test(b.pane) && /Rewritten from the full record of the run\. <b>plain<\/b>/.test(b.pane) && /<img src=x/.test(b.pane) && b.imgs === 0 && !b.pwned, 'the Story shows the new chapter and says it was rewritten; what came from the store is shown as text, never as markup');
  ok(/written again from the full record/.test(b.notice), 'a notice says so: "' + b.notice.slice(0, 90) + '"');
  await page.waitForTimeout(6000);
  const c = await page.evaluate(() => window.STORE.gets.filter(p => /amend/.test(p)).length);
  ok(c === 2, 'and it is not asked for again while the same world stays open');
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
