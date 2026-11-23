/* Generation 24. What is recent is before a being at full grain. What is older is kept in the being: a journal of the year in hand and a markdown
   file for each year gone by, with an index of whom each speaks of. A being calls a year, a name or a thing back by asking in its reply, and what its
   memory holds of those it is looking at comes back by itself. The same window for the maker. All of it lives inside the saved world. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); SW.use(w); return { w, st }; };
const day = (w, d) => { w.tick = (d - 1) * w.laws.time.dayLength + 20; };
const fixture = n => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-' + n + '.json.gz'))).toString());
const sec = (p, head) => { const i = p.indexOf(head); if (i < 0) return ''; const j = p.indexOf('\n\n', i); return p.slice(i, j < 0 ? undefined : j); };

(async () => {
  { // a journal of the year in hand becomes a file when the year ends
    const { w, st } = fresh(7), a = w.agents[0], b = w.agents[1], m = st.minds[a.id];
    day(w, 2); M.journal(st, m, 'You met ' + b.name + ' for the first time.', 5); M.journal(st, m, 'You thought: the berries are thin here.', 2);
    day(w, 5); M.journal(st, m, 'You saw Orrin die (gored by a mammoth).', 8); M.journal(st, m, b.name + ' fed you when you were starving.', 8);
    for (let k = 0; k < 70; k++) { day(w, 6 + (k % 6)); M.journal(st, m, 'You thought: a passing thought, number ' + k + ', of no weight at all, about the weather and the walk.', 2); }
    day(w, 11); M.journal(st, m, 'We made a home: the Hold.', 9);
    ok(m.jr.y === 1 && m.jr.lines.length <= M.MEM.liveCap && m.jr.lines.some(q => /gored by a mammoth/.test(q.t)) && m.jr.lines.some(q => /made a home/.test(q.t)) && Object.keys(m.files).length === 0, 'the journal of the year in hand holds at most ' + M.MEM.liveCap + ' lines; when full it lets go of what mattered least and keeps what mattered most');
    day(w, 14); const p = M.buildPrompt(st, m, 'routine'), f = m.files['year-01.md'] || '';
    ok(/^# Year 1, days 1 to 12\n- day 2: You met /.test(f) && /- day 5: You saw Orrin die/.test(f) && /- day 11: We made a home: the Hold\./.test(f) && f.length <= M.MEM.yearCap + 80 && (f.match(/passing thought/g) || []).length < 12, 'when the year ends it is filed as year-01.md: markdown, dated lines, the weighty kept and most of the passing thoughts let go (' + f.length + ' characters, ' + f.split('\n').length + ' lines)');
    const ix = sec(p, 'YOUR LONGER MEMORY');
    ok(/- year 1 \(days 1 to 12\): \d+ things kept; of /.test(ix) && ix.indexOf(b.name) > 0 && /We made a home: the Hold/.test(ix) && /"recall": "year 2"/.test(ix) && ix.length < 900, 'the prompt carries an index of that year: how much is kept, whom it speaks of, what stands out, and how to call it back (' + ix.length + ' characters)');
    ok(ix.indexOf('- whom you remember, and the years to look in: ') > 0 && new RegExp(b.name + ' \\(1\\)').test(ix), 'and the other way about: for each one it remembers, the years to look in (' + (ix.split('\n').pop() || '').slice(0, 90) + ')');
    ok(p.indexOf('gored by a mammoth') < 0 || sec(p, 'YOUR LONGER MEMORY').indexOf('gored') > 0, 'the year itself is not in the prompt, only its line in the index');
    /* recall, asked for in a reply */
    const e1 = M.apply(st, m, 'routine', { thought: 'Who died that year? I want to remember.', plan: [{ do: 'linger', ticks: 10 }], recall: 'year 1' }, {});
    const p2 = M.buildPrompt(st, m, 'routine'), got = sec(p2, 'WHAT YOU CALLED BACK FROM MEMORY');
    ok(m.recallAsk === 'year 1' && m.again === true && /called back from memory: year 1/.test(e1.changes.join(' ')) && /\("year 1"\)/.test(got) && /day 5: You saw Orrin die/.test(got), 'a being that puts "recall": "year 1" in its reply has that year before it at its next thought, and that thought is brought forward');
    m.again = false; M.apply(st, m, 'routine', { thought: 'And of the mammoth?', plan: [{ do: 'linger', ticks: 10 }], recall: 'mammoth' }, {});
    const got2 = sec(M.buildPrompt(st, m, 'routine'), 'WHAT YOU CALLED BACK FROM MEMORY');
    ok(/\(year 1\) day 5: You saw Orrin die \(gored by a mammoth\)/.test(got2) && !/made a home/.test(got2) && m.again === false, 'asked for a thing or a name, it gets only the lines that speak of it, with their year; and a second call running does not bring a third thought forward');
    M.apply(st, m, 'routine', { thought: 'Enough of that.', plan: [{ do: 'linger', ticks: 10 }], recall: 'zzyzx' }, {});
    ok(/Nothing in your longer memory answers to that/.test(sec(M.buildPrompt(st, m, 'routine'), 'WHAT YOU CALLED BACK FROM MEMORY')), 'asked for what it never knew, it is told that nothing answers');
    M.apply(st, m, 'routine', { thought: 'On with the day.', plan: [{ do: 'linger', ticks: 10 }] }, {});
    ok(!m.recallAsk && M.buildPrompt(st, m, 'routine').indexOf('WHAT YOU CALLED BACK') < 0 && m.jr.lines.some(q => /You thought: On with the day/.test(q.t)), 'and when it asks for nothing, nothing is called back; its thoughts go into the journal of the new year');
    /* the sight of someone brings back what is kept of them */
    const at = (o, x, y) => { o.x = x; o.y = y; o.px = x; o.py = y; }; w.creatures = [];
    at(b, a.x + 1, a.y); const near = sec(M.buildPrompt(st, m, 'routine'), 'FROM LONGER AGO, OF THOSE YOU SEE');
    at(b, (a.x + 60) % w.W, a.y); const far = M.buildPrompt(st, m, 'routine').indexOf('FROM LONGER AGO');
    ok(near.indexOf('(year 1) day 2: You met ' + b.name) > 0 && far < 0, 'with ' + b.name + ' in sight, what the older years hold of them comes back by itself; with them away, it does not');
  }
  { // the window: foods, people, seasons
    const { w, st } = fresh(11), a = w.agents[0], m = st.minds[a.id]; w.creatures = [];
    const kinds = Object.keys(w.laws.plants).slice(0, 30); kinds.forEach((k, i) => { m.foods[k] = { gain: i === 3 ? -5 : 8 + (i % 7), n: 1 + (i % 9), fx: i === 5 ? 'your mind opened strangely' : '' }; });
    const here = M.buildPrompt(st, m, 'routine'), deep = M.buildPrompt(st, m, 'deep'), fl = t => (/Foods: [^\n]*/.exec(t) || [''])[0], full = t => (fl(t).match(/\(eaten \d+x\)/g) || []).length;
    const seenKinds = {}; SW.look(w, a).plants.forEach(q => { seenKinds[q.sp] = 1; });
    ok(full(deep) === 30 && full(here) <= 8 + Object.keys(seenKinds).length + 2 && full(here) < 20 && fl(here).indexOf(kinds[3] + ': HURTS') > 0 && fl(here).indexOf('your mind opened strangely') > 0 && /and \d+ more foods you have eaten and know to be safe/.test(fl(here)), 'of thirty foods known, a routine thought is shown ' + full(here) + ' in full (those in sight or in hand, every one that hurts or acts on it, the six most eaten) and the rest are counted; a deep reflection is shown all thirty');
    ok(Object.keys(seenKinds).every(k => !m.foods[k] || fl(here).indexOf(k + ': ') >= 0) && fl(here).length < fl(deep).length * 0.8, 'a known food that is in sight is always shown in full; the line is ' + fl(here).length + ' characters against ' + fl(deep).length);
    w.agents.slice(1).forEach((o, i) => { a.rel[o.id] = (i % 5) / 10; a.seenAt[o.id] = [o.x, o.y, w.tick - i * 300]; });
    const th = sec(M.buildPrompt(st, m, 'routine'), 'THOSE YOU KNOW');
    ok((th.match(/ [+-]\d\.\d/g) || []).length === 10 && /and 4 others you have met, kept in your longer memory/.test(th), 'of fourteen known, ten are named (those here, those most strongly felt about, those seen most lately) and the rest are counted');
    m.seasons = [1, 2, 3, 4, 5, 6, 7].map(i => 'Year 1, season line ' + i + '.'); const ss = sec(M.buildPrompt(st, m, 'routine'), 'THE SEASONS YOU HAVE LIVED');
    ok(ss.indexOf('season line 7') > 0 && ss.indexOf('season line 4') > 0 && ss.indexOf('season line 3') < 0, 'the last four seasons, one year, are before it; the older ones are in its files');
  }
  { // it lives inside the saved world, and nowhere else
    const { w, st } = fresh(7), a = w.agents[0], m = st.minds[a.id]; day(w, 3); M.journal(st, m, 'You found amber in the cold ground.', 7); day(w, 15); M.journal(st, m, 'A second year began.', 5);
    const snap = JSON.parse(JSON.stringify(M.snapshot(st))), back = M.restore(snap), m2 = back.minds[a.id];
    ok(m2.files['year-01.md'] && /amber in the cold ground/.test(m2.files['year-01.md']) && m2.fidx['year-01.md'].y === 1 && m2.jr.lines.some(q => /second year/.test(q.t)) && /amber/.test(M.recall(back, m2, 'amber').text), 'a world saved and opened again has every file, its index and the journal in hand, and recall works on them');
    const other = fresh(7); other.w.tick = w.tick;
    ok(Object.values(other.st.minds).every(x => !x.files || !Object.keys(x.files).length) && !/amber in the cold ground/.test(JSON.stringify(M.snapshot(other.st))), 'another world, even of the same seed, holds none of it: the memory is in the minds of the world it was lived in, not in any store they share');
    const dg = M.digest(st).beings.filter(x => x.id === a.id)[0];
    ok(dg.memory && /amber/.test(dg.memory.files['year-01.md']) && /second year/.test(dg.memory.yearInHand) && dg.memory.index['year-01.md'], 'the run file carries each being\'s files, index and year in hand');
    /* old years are gathered, and the whole stays small */
    for (let y = 2; y <= 14; y++) { day(w, (y - 1) * 12 + 2); for (let k = 0; k < 40; k++) M.journal(st, m, 'In year ' + y + ' thing ' + k + ' happened to you and to those near you, in some detail worth a line.', 2 + (k % 6)); }
    day(w, 14 * 12 + 2); M.roll(st, m); const names = Object.keys(m.files).sort(), bytes = JSON.stringify([m.files, m.fidx, m.jr]).length;
    ok(names.filter(n => /^year-/.test(n)).length === M.MEM.files && m.files['long-ago.md'] && /amber in the cold ground/.test(m.files['long-ago.md']) && bytes < 26000, 'after fourteen years a being keeps its last ' + M.MEM.files + ' years as files and the earliest gathered in long-ago.md; all of its longer memory is ' + bytes + ' characters');
    ok(M.memoryIndex(st, m).split('\n').filter(l => /^- (year \d+|long ago)/.test(l)).length === M.MEM.files + 1 && M.memoryIndex(st, m).length < 2600 && /amber/.test(M.recall(st, m, 'long ago').text), 'the index has a line for each, and long ago can be called back like a year');
    let e = null, old = null; try { old = M.restore(fixture(23)); for (let i = 0; i < 300; i++) SW.step(old.world, old.emit); old.world.agents.forEach(o => M.buildPrompt(old, old.minds[o.id], 'deep')); } catch (x) { e = x; }
    ok(!e && old && Object.values(old.minds).some(x => x.jr && x.jr.lines.length > 0), 'a world saved by Generation 23, which had no such memory, loads, runs, and begins to keep one' + (e ? ' ' + e.stack.split('\n').slice(0, 2).join(' | ') : ''));
  }
  { // what happens in the world is kept as it happens
    const { w, st } = fresh(7); for (let i = 0; i < 500; i++) SW.step(w, st.emit);
    const all = Object.values(st.minds).map(x => (x.jr && x.jr.lines) || []), lines = [].concat.apply([], all);
    ok(lines.some(q => /You met .* for the first time/.test(q.t)) && lines.length > 30 && all.every(L => L.length <= M.MEM.liveCap), 'meetings and the first things of a life are written into the journal as they happen (' + lines.length + ' lines among fifteen beings in two days)');
    ok(!lines.some(q => /^YOU ARE /.test(q.t) && q.w > 3), 'a cry of the body, such as YOU ARE PARCHED, is kept lightly and does not crowd out what matters');
  }
  { // the maker reads its last four visits in full and the older ones in a line, and can call one back
    const { w, st } = fresh(7); st.on = true; st.story.chapters.push({ n: 1, title: 'x', text: 'x', day0: 1, day1: 1 }); st.story.lastDay = SW.day(w);
    for (let i = 1; i <= 8; i++) st.maker.log.push({ id: 100 + i, day: i * 4, tick: i * 960, seen: 'Seen at visit ' + i + '.', predict: 'PREDICTION-' + i + ' in full, with every particular the maker wrote down at the time.', ops: ['law x.y: ' + i + ' -> ' + (i + 1)], undo: [null], refused: [], raw: [{}], verdict: 'kept', why: 'REASON-' + i });
    const prompts = []; let reply = { seen: 's', predict: 'p', changes: [], review: [], recall: 102 }; st.sample = async p => { prompts.push(p); return { text: JSON.stringify(reply) }; };
    st.maker.lastDay = SW.day(w) - 9; await K.make(st); const p1 = prompts[prompts.length - 1], sc = sec(p1, 'Your changes so far');
    ok(['PREDICTION-5', 'PREDICTION-6', 'PREDICTION-7', 'PREDICTION-8'].every(t => p1.indexOf(t) > 0) && ['PREDICTION-1', 'PREDICTION-2', 'PREDICTION-3', 'PREDICTION-4'].every(t => p1.indexOf(t) < 0) && /#101 day 4 \[kept\] law x\.y: 1 -> 2/.test(p1) && /add "recall": its number/.test(p1), 'the maker is shown its last four visits in full and each older one in a line, and is told how to read one again');
    reply = { seen: 's', predict: 'p', changes: [], review: [] }; st.maker.lastDay = SW.day(w) - 9; st.hold = 0; await K.make(st); const p2 = prompts[prompts.length - 1];
    ok(st.maker.recallAsk === 0 && p2.indexOf('PREDICTION-2') > 0 && p2.indexOf('PREDICTION-1 ') < 0 && p2.indexOf('PREDICTION-3') < 0, 'having asked for visit 102, it reads that visit in full at its next visit, and only that one');
    const md = K.visitFile(st.maker.log.filter(e => e.id === 102)[0]);
    ok(/^# Visit 102, day 8 \(kept\)\n\n## What it saw\nSeen at visit 2\.\n\n## What it changed\n- law x\.y: 2 -> 3\n\n## What it expected\nPREDICTION-2/.test(md) && /## What it concluded\nREASON-2/.test(md), 'each visit can be written out as a markdown file; the visits themselves are kept in the world they were made in');
    ok(K.SEED.some(s => /longer memory/.test(s)) && M.digest(st).generation >= 24, 'the maker\'s roadmap names longer memory, in Generation 24 and after');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
