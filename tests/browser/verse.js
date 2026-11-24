/* Generation 27 on the page: a world begun here has seas; a chapter is headed by a verse of the people's own; the final state goes to the
   store in parts, none above what a document may hold (256 KiB). The store is a stand-in. */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'src');
const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); }).listen(8143);
const errs = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) errs.push(m); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    window.EVOLU_SEED = 7; window.EVOLU_FOG = 0; window.DBwrites = []; /* the seas are looked at whole here; a world that begins mostly unknown is checked below */
    const db = { doc: p => ({ get: () => Promise.resolve({ exists: false, data: () => null }), set: body => { const s = JSON.stringify(body); if (new Blob([s]).size > 262144) { window.DBwrites.push({ p: p, size: new Blob([s]).size, refused: 1 }); return Promise.reject({ code: 'invalid_argument' }); } window.DBwrites.push({ p: p, size: new Blob([s]).size }); return Promise.resolve(); } }) };
    window.claude = { use: name => Promise.resolve(name === 'db' ? db : null) };
  });
  await page.goto('http://localhost:8143/'); await page.waitForTimeout(1500);
  const a = await page.evaluate(() => { const d = window.SWdebug, w = d.st.world; d.U.playing = false; let open = 0; for (let i = 0; i < w.W * w.H; i++) if (w.terrain[i] === 0 && !(w.narrow && w.narrow[i])) open++;
    return { seas: !!(w.seas && w.seas.plan), oceans: w.seas ? w.seas.plan.oceans.length : 0, open: open, trad: w.peoples.map(P => P.tradition), n: w.agents.length }; });
  ok(a.seas && a.oceans === 2 && a.open > 700 && a.n === 15, 'a world begun on the page has seas: two oceans, ' + a.open + ' tiles of open water in the known land, fifteen founders');
  ok(a.trad.length === 3 && a.trad.every(Boolean), 'and each of its peoples a tradition (' + a.trad.join(', ') + ')');
  const b = await page.evaluate(() => { const d = window.SWdebug, st = d.st, who = st.world.agents[0], P = st.world.peoples[who.people];
    st.story.chapters.push({ n: 1, day0: 1, day1: 4, title: 'The first frost', text: 'They came down to the water.', epigraph: { text: 'Frost on the reed bed / all I kept I gave away / the river <b>goes</b> on', title: 'Last frost', by: who.name, people: P.name, day: 3, kind: 'poem', occasion: 'dying', about: null } });
    st.story.chapters.push({ n: 2, day0: 5, day1: 8, title: 'A quiet span', text: 'Little was made.', epigraph: { text: 'What is given returns.', title: 'the Open Hand', by: null, people: P.name, day: null, kind: 'tradition', occasion: null, about: null } });
    st.story.chapters.push({ n: 3, day0: 9, day1: 12, title: 'Before verse', text: 'An older chapter has none.' });
    st.story.rev = (st.story.rev || 0) + 1; d.setTab('story'); return { who: who.name, people: P.name }; });
  await page.waitForTimeout(1200);
  const c = await page.evaluate(() => { const pane = document.getElementById('pane-story'), ep = Array.from(pane.querySelectorAll('blockquote.epi')); return { n: ep.length, html: ep.map(e => e.innerHTML), text: ep.map(e => e.innerText), bold: pane.querySelectorAll('blockquote.epi b').length, heads: pane.querySelectorAll('h3').length }; });
  ok(c.n === 2 && c.heads >= 3, 'a chapter that has one is headed by its epigraph; one written before has none and is shown as it was');
  ok(c.html.some(h => (h.match(/<br>/g) || []).length === 2) && c.bold === 0 && c.html.some(h => /&lt;b&gt;goes/.test(h)), 'the verse is set line under line, and what it holds is shown as text, never as markup');
  ok(c.text.some(t => t.indexOf('the death poem of ' + b.who + ' of ' + b.people + ', day 3') >= 0) && c.text.some(t => /from the teaching of the Open Hand, as held among /.test(t)), 'under it stands whose it is: "' + (c.text[1] || c.text[0] || '').split('\n').pop().slice(0, 80) + '"');
  /* Generation 29: a speech box that was cut opens on hover and jumps to Voices on a click; settlements and ways */
  const bb = await page.evaluate(async () => { const d = window.SWdebug, st = d.st, w = st.world, a = w.agents[0]; d.setTab('inspect'); d.cam.x = a.x + 0.5; d.cam.y = a.y + 0.5; d.cam.z = 24;
    const long = 'We came down from the high ground when the snow closed the pass, and I tell you now that the reed beds by the water hold more food than the whole of the ridge, so we should stay here through the cold and lay by what we can before the frost takes the last of the berries and the herds move on to the south without us';
    st.voices.push({ a: a.id, name: a.name, to: 'all', text: long, tick: w.tick, heard: [] }); d.event({ type: 'said', a: a.id, text: long, to: 'all' });
    await new Promise(r => setTimeout(r, 900)); const box = d.U.laid.filter(q => q.id === a.id && q.kind === 'say')[0]; if (!box) return { box: false };
    const hit = d.bubbleAt(box.x + 4, box.y + 4), miss = d.bubbleAt(box.x - 40, box.y - 40); d.openBubble(box); await new Promise(r => setTimeout(r, 500));
    const row = document.querySelector('#pane-voices .line.focus'); return { box: true, cut: box.cut, whole: box.text === long, hit: !!hit && hit.id === a.id, miss: !miss || miss.id !== a.id, tab: d.U.tab, focus: !!row && row.textContent.indexOf('We came down from the high ground') >= 0 }; });
  ok(bb.box && bb.cut && bb.whole && bb.hit && bb.miss, 'a long thing said is cut in its box, and the box under the pointer is found with the whole of what was said');
  ok(bb.tab === 'voices' && bb.focus, 'a click on it opens Voices at that line');
  const fg = await page.evaluate(() => { const SWg = window.SW, a = SWg.createWorld(7, { seas: 1, flora: 1 }), b = SWg.createWorld(7, { seas: 1, flora: 1, fog: 1 }), known = x => x.terrain.filter(t => t !== 9).length, kinds = new Set(a.plants.filter(Boolean).map(p => p.sp).filter(k => SWg.FLORA[k])); return { all: known(a), fog: known(b), onLand: b.agents.every(q => b.terrain[q.y * b.W + q.x] !== 9), kinds: kinds.size }; });
  ok(fg.fog < fg.all * 0.6 && fg.onLand && fg.kinds >= 10, 'in the browser a world that begins mostly unknown knows ' + fg.fog + ' tiles of ' + fg.all + ', with every founder on known land, and ' + fg.kinds + ' of the new kinds of plant grow in it');
  /* Generation 31: beyond the planet */
  const fz = await page.evaluate(async () => { const d = window.SWdebug, out = []; d.farTo(4); await new Promise(r => setTimeout(r, 300)); out.push(d.U.far); d.farTo(2.5); await new Promise(r => setTimeout(r, 200)); d.farTo(1.5); await new Promise(r => setTimeout(r, 200)); d.farTo(0.5); await new Promise(r => setTimeout(r, 200)); out.push(d.U.far); const C = d.cosmosOf(d.st.world.seed), C2 = d.cosmosOf(d.st.world.seed); d.farTo(0); await new Promise(r => setTimeout(r, 200)); out.push(d.U.far); return { out, planets: C.planets.length, home: C.home, same: C === C2, btn: !!document.getElementById('farOut') && !!document.getElementById('farHome') }; });
  ok(fz.out[0] === 4 && fz.out[1] === 0.5 && fz.out[2] === 0 && fz.planets >= 4 && fz.home >= 1 && fz.same && fz.btn, 'the view goes out past the planet to its star (' + fz.planets + ' worlds), the near stars, the galaxy and the galaxies, and back, each drawn without error; the sky of a world is made from its seed');
  const ag = await page.evaluate(async () => { const d = window.SWdebug; d.setTab('setup'); await new Promise(r => setTimeout(r, 400)); const sel = document.getElementById('setAge'), SWg = window.SW, w2 = SWg.createWorld(11, { seas: 1, flora: 1, fog: 1 }), n = SWg.beginAt(w2, 3); return { sel: !!sel && sel.options.length === 6, n: n, era: SWg.eraOf(w2), setts: (w2.settlements || []).filter(q => q.n >= 20).length }; });
  ok(ag.sel && ag.n > 30 && ag.era === 3 && ag.setts >= 3, 'Setup offers the age a new world begins in; in the browser a world begun in the third age stands with ' + ag.n + ' works in ' + ag.setts + ' settlements');
  /* send everything now */
  await page.evaluate(() => { window.SWdebug.setTab('setup'); }); await page.waitForTimeout(600);
  const pressed = await page.evaluate(() => { const bt = document.querySelector('[data-act="recsend"]'); if (bt) bt.click(); return !!bt; });
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => ({ writes: window.DBwrites, note: (document.getElementById('recNote') || {}).innerText || '' }));
  const st = s.writes.filter(q => /\/state\//.test(q.p));
  ok(pressed && st.some(q => /state\/latest$/.test(q.p)) && st.some(q => /state\/beings-0$/.test(q.p)) && st.some(q => /state\/maker$/.test(q.p)), 'Send everything now writes the state as a head, the beings in parts, and the maker\'s document (' + st.map(q => q.p.split('/').pop() + ' ' + q.size).join(', ') + ')');
  ok(s.writes.length > 0 && !s.writes.some(q => q.refused) && Math.max.apply(null, s.writes.map(q => q.size)) <= 262144, 'no document is above what the store takes (the largest is ' + Math.max.apply(null, s.writes.map(q => q.size)) + ' bytes of 262,144)');
  ok(!/failed|invalid_argument/.test(s.note), 'and the page reports no failed send: "' + s.note.replace(/\s+/g, ' ').slice(0, 110) + '"');
  console.log('ERRORS', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
