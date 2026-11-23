/* After Generation 24. The chronicler writes each chapter from what the world recorded since the chapter before. It was handed only the last 140
   entries of that, a saved world kept only the last 120 and memory the last 300, while forty-five beings record about 95 a day: a chapter of three days
   showed only the last day and a half, and the chapter for days 37 to 61 of Nova's world said the record was thin until days 59 and 60, because those
   two days were all it had been shown. Now nothing recorded since the last chapter is let go before that chapter is written, and the chronicler is
   handed the whole span: what matters most in full, a share of every day, and a count of what each day held. */
const SW = require('../src/engine.js'), M = require('../src/minds.js'), K = require('../src/maker.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fresh = seed => { const w = SW.createWorld(seed), st = M.createState(w); K.inherit(st, null); SW.use(w); st.ui = () => {}; return { w, st }; };
const KINDS = ['self', 'self', 'self', 'culture', 'culture', 'gift', 'gift', 'power', 'lore', 'invention', 'hunt', 'magic', 'court', 'build', 'craft', 'age'];
/* a span like the one in Nova's world: busy days, then a long quiet stretch, then busy days again */
const fill = (st, w, plan, heavy) => {
  const d = w.laws.time.dayLength; st.chron = []; let n = 0;
  plan.forEach(([day, count]) => { for (let i = 0; i < count; i++) st.chron.push({ tick: (day - 1) * d + 1 + Math.floor(i * (d - 2) / count), kind: KINDS[(i * 7 + day) % KINDS.length], text: 'thing ' + (++n) + ' of day ' + day, ids: [] }); });
  (heavy || []).forEach(([day, kind, text]) => st.chron.push({ tick: (day - 1) * d + 5, kind: kind, text: text, ids: [] }));
  st.chron.sort((a, b) => a.tick - b.tick); w.tick = plan[plan.length - 1][0] * d - 1;
};
const dayOf = l => +/^day (\d+) /.exec(l)[1], count = (L, f) => L.filter(f).length;

(async () => {
  {
    const { w, st } = fresh(7), d = w.laws.time.dayLength;
    fill(st, w, [[2, 40], [3, 50], [4, 45]]); st.story.last = d;
    const s = K.span(st, st.story.last);
    ok(s.n === 135 && s.shown === 135 && s.table.length === 0 && s.lines.length === 135, 'a span that holds no more than the page carries is handed over whole, as before (135 of 135)');
  }
  {
    const { w, st } = fresh(7), d = w.laws.time.dayLength, plan = [[38, 68], [39, 62]];
    for (let day = 40; day <= 57; day++) plan.push([day, 3 + (day % 4) * 2]);
    plan.push([58, 115], [59, 84], [60, 86]);
    const heavy = [[38, 'death', 'Xaiel died: starved.'], [38, 'birth', 'Paque was born to Zika and Yachi.'], [39, 'discovery', 'Honi went past the edge of the known world and found new land.'], [44, 'theft', 'Tugek found a store robbed of 3 food.'], [47, 'death', 'Ilyae died: old age.'], [58, 'trade', 'Huatli and Nauwa traded cloudberry for amber.'], [59, 'birth', 'Thakar was born to Olum and Huatli.'], [60, 'death', 'Zika died: gored by a mammoth.'], [41, 'extinct', 'The fenfowl died out.']];
    fill(st, w, plan, heavy); st.story.last = 37 * d - 10;
    const total = st.chron.length, old = st.chron.slice(-140).map(c => Math.floor(c.tick / d) + 1), s = K.span(st, st.story.last);
    const shownBy = {}; s.lines.forEach(l => { shownBy[dayOf(l)] = (shownBy[dayOf(l)] || 0) + 1; });
    const heldBy = {}; st.chron.forEach(c => { const k = Math.floor(c.tick / d) + 1; heldBy[k] = (heldBy[k] || 0) + 1; });
    ok(Math.min.apply(null, old) === 59, 'the fault: of ' + total + ' entries over days 38 to 60, the last 140 all fall on days 59 and 60');
    ok(s.n === total && s.shown < total && s.shown >= 200 && s.shown <= K.STORY.show + 3 * 23, 'now ' + s.shown + ' of the ' + total + ' are handed over');
    ok(Object.keys(heldBy).every(k => shownBy[k] >= Math.min(3, heldBy[k])), 'something of every one of the 23 days is shown, never fewer than three where the day held three: ' + JSON.stringify(shownBy));
    ok(heavy.every(h => s.lines.some(l => l.indexOf(h[2]) >= 0)), 'every death, birth, discovery, trade, theft and dying-out in the span is shown, whichever day it fell on');
    ok(shownBy[38] > 15 && shownBy[58] > shownBy[38] && shownBy[58] < 115, 'a busier day is given more room, but not all of it (day 38: ' + shownBy[38] + ' of 69, day 58: ' + shownBy[58] + ' of 116)');
    const selfHeld = count(st.chron, c => c.kind === 'self') / total, selfShown = count(s.lines, l => /\[self\]/.test(l)) / s.shown, invHeld = count(st.chron, c => c.kind === 'invention') / total, invShown = count(s.lines, l => /\[invention\]/.test(l)) / s.shown;
    ok(selfShown < selfHeld * 0.6 && invShown > invHeld, 'the commonest and lightest kind does not crowd out the rest: a being rewriting its own thinking is ' + Math.round(selfHeld * 100) + '% of what was recorded and ' + Math.round(selfShown * 100) + '% of what is shown; discoveries of ways ' + Math.round(invHeld * 100) + '% and ' + Math.round(invShown * 100) + '%');
    ok(s.lines.every((l, i) => !i || dayOf(l) >= dayOf(s.lines[i - 1])), 'what is shown is in the order it happened');
    ok(s.table.length === 23 && s.table.every(t => { const m = /^day (\d+): (\d+) \(/.exec(t); return m && +m[2] === heldBy[m[1]]; }) && /^day 58: 116 \(self \d+, \w+ \d+/.test(s.table[20]), 'with it goes a count of everything each day held, so a quiet day can be told from a day of which little is shown: "' + s.table[20] + '"');
    /* the chapter itself */
    let prompts = []; st.sample = async (p, o) => { prompts.push(p); return { text: JSON.stringify({ title: 'The long sleep and the waking', text: 'Much happened on days 38 and 39. ' + 'Then little. '.repeat(20), threads: [], trends: [] }) }; };
    st.story.chapters.push({ n: 12, day0: 34, day1: 37, title: 'Before', text: 'Before.' }); st.story.lastDay = 37;
    const ch = await K.tell(st), p = prompts[0] || '';
    ok(ch && ch.day0 === 37 && ch.day1 === 60 && new RegExp(total + ' things were recorded in this span, more than can be set before you, so here are ' + s.shown + ' of them').test(p) && /HOW MUCH WAS RECORDED EACH DAY/.test(p) && /day 44: \d+ \(/.test(p) && /Xaiel died: starved/.test(p) && /never from how many lines of a day you are shown/.test(p), 'the chronicler is told how much was recorded, how much of it is before it, and to judge busy and quiet days from the counts');
    const rec = st.rec.all.filter(r => r.t === 'story').pop();
    ok(rec && rec.recorded === total && rec.shown === s.shown && rec.promptSize === p.length && K.pending(st) === 0, 'the record of the run says how much the chapter was written from (' + rec.shown + ' of ' + rec.recorded + ', prompt of ' + rec.promptSize + ' characters)');
  }
  {
    /* more of the weightiest than the page can carry: thinned evenly, the first and the last days still there */
    const { w, st } = fresh(7), d = w.laws.time.dayLength; st.chron = [];
    for (let i = 0; i < 600; i++) st.chron.push({ tick: d + 1 + i * 40, kind: 'death', text: 'Someone ' + i + ' died.', ids: [] });
    const s = K.span(st, d), days = s.lines.map(dayOf);
    ok(s.shown <= K.STORY.show + 101 && s.shown >= K.STORY.show * 0.6 && days[0] === 2 && days[days.length - 1] === Math.floor((d + 1 + 599 * 40) / d) + 1, 'if even the weightiest are too many they are thinned evenly over the span, first day and last (' + s.shown + ' of 600)');
  }
  {
    /* memory: nothing recorded since the last chapter is let go until the chapter is written */
    const { w, st } = fresh(7), d = w.laws.time.dayLength; st.chron = []; st.story.last = 0; w.tick = 10;
    for (let i = 0; i < 700; i++) { w.tick++; M.chron(st, 'gift', 'gift ' + i, []); }
    ok(st.chron.length === 700 && st.chron[0].text === 'gift 0', 'memory holds all 700 entries made since the last chapter (before, the last 300)');
    for (let i = 700; i < 1500; i++) { w.tick++; M.chron(st, 'gift', 'gift ' + i, []); }
    ok(st.chron.length === M.CHRON.most && st.chron[st.chron.length - 1].text === 'gift 1499', 'to a limit, for a world whose chronicler never gets through: ' + M.CHRON.most);
    /* a save keeps them too, and what was said aloud */
    for (let i = 0; i < 400; i++) st.voices.push({ tick: 20 + i, name: 'A', to: 'B', text: 'word ' + i });
    const back = M.restore(JSON.parse(JSON.stringify(M.snapshot(st))));
    ok(back && back.chron.length === M.CHRON.most && back.voices.length === 400 && K.span(back, back.story.last).n === M.CHRON.most, 'a saved world keeps everything since the last chapter, and what was said (before, the last 120 of each): the chronicler of the reloaded world still has ' + (back && back.chron.length) + ' entries and ' + (back && back.voices.length) + ' sayings');
    /* once the chapter is written, what is before it is let go, down to what the page shows */
    st.story.last = w.tick; w.tick++; M.chron(st, 'gift', 'after the chapter', []);
    const snap = M.snapshot(st);
    ok(st.chron.length === M.CHRON.hold && st.chron[st.chron.length - 1].text === 'after the chapter' && snap.chron.length === M.CHRON.save && snap.voices.length === M.CHRON.save, 'when the chapter is written memory goes back to the last ' + M.CHRON.hold + ' and a save to the last ' + M.CHRON.save + ', as before');
    ok(snap.chron !== st.chron && snap.voices !== st.voices, 'a save holds a copy of the chronicle, not the chronicle itself');
    /* what beings thought when they looked back: the record of the run does not come back with a reloaded world, so the save carries the last of these */
    const { w: w2, st: s2 } = fresh(7); s2.story.last = 100; w2.tick = 500;
    for (let i = 0; i < 15; i++) M.record(s2, { t: 'thought', kind: i % 5 === 4 ? 'routine' : 'deep', name: 'Being' + i, thought: 'I looked back, number ' + i, tick: 90 + i * 10, day: 1 });
    const b2 = M.restore(JSON.parse(JSON.stringify(M.snapshot(s2)))); let seen = '';
    b2.sample = async p => { seen = p; return { text: JSON.stringify({ title: 'T', text: 'Text. '.repeat(40), threads: [], trends: [] }) }; }; b2.ui = () => {}; SW.use(b2.world);
    M.record(b2, { t: 'thought', kind: 'deep', name: 'Late', thought: 'After the reload I looked back', tick: 480, day: 3 });
    await K.tell(b2);
    ok(b2.rec.all.filter(r => r.kind === 'deep').length === 1 && /Being3 reflected: I looked back, number 3/.test(seen) && /Being13 reflected/.test(seen) && /Late reflected: After the reload/.test(seen) && !/Being0 reflected/.test(seen) && !/Being4 reflected/.test(seen) && (seen.match(/ reflected: /g) || []).length === 12, 'after a reload the chronicler still has what beings thought when they looked back since the last chapter (11 from the save and one since, none from before the chapter)');
  }
  {
    /* a chapter comes early when so much has been recorded that waiting would mean showing too little of it */
    const { w, st } = fresh(7), d = w.laws.time.dayLength; let calls = 0;
    st.sample = async () => { calls++; return { text: JSON.stringify({ title: 'Early', text: 'Much. '.repeat(40), threads: [], trends: [] }) }; };
    st.on = true; w.tick = 5 * d + 10; st.story.last = 4 * d; st.story.lastDay = SW.day(w); st.chron = [];
    for (let i = 0; i < K.STORY.full; i++) st.chron.push({ tick: 4 * d + 1 + i, kind: 'gift', text: 'g' + i, ids: [] });
    K.tick(st); await new Promise(r => setTimeout(r, 20));
    ok(calls === 0, 'however much is recorded, not twice in one day');
    w.tick = 6 * d + 10; st.chron.pop(); K.tick(st); await new Promise(r => setTimeout(r, 20));
    ok(calls === 0 && K.pending(st) === K.STORY.full - 1, 'a day later with ' + (K.STORY.full - 1) + ' entries waiting, the chronicler still keeps to its every third day');
    st.chron.push({ tick: 6 * d + 5, kind: 'gift', text: 'one more', ids: [] }); K.tick(st); await new Promise(r => setTimeout(r, 30));
    ok(calls === 1 && st.story.chapters.length === 1 && st.story.lastDay === 7 && K.pending(st) === 0, 'with ' + K.STORY.full + ' waiting it writes a day early');
  }
  {
    /* a chapter written from too little can be written again from outside, from the full record */
    const { w, st } = fresh(7); st.story.chapters.push({ n: 12, day0: 34, day1: 37, title: 'Twelve', text: 'The twelfth.' }, { n: 13, day0: 37, day1: 61, title: 'Thin', text: 'The record is thin until days 59 and 60.' });
    const long = 'Days 37 to 39 were crowded. '.repeat(300), doc = { rev: 1, chapters: [{ n: 13, title: 'The Papa arrive', text: 'Days 37 to 39 were crowded. A band of the Papa came in. <b>not markup</b>', why: 'Rewritten from the run file.' }, { n: 99, title: 'No such chapter', text: 'This chapter does not exist and nothing may be made of it at all.' }, { n: 12, text: 'short' }] };
    const n = K.amend(st, doc), c13 = st.story.chapters[1], c12 = st.story.chapters[0];
    ok(n === 1 && c13.title === 'The Papa arrive' && /A band of the Papa came in/.test(c13.text) && c13.amended === 'Rewritten from the run file.' && c13.was.text === 'The record is thin until days 59 and 60.' && c13.day0 === 37 && c13.day1 === 61, 'the chapter takes the new title and text, is marked as written again, and keeps its first writing and its days');
    ok(st.story.chapters.length === 2 && c12.text === 'The twelfth.' && !c12.amended && st.rec.all.some(r => r.t === 'amended' && r.chapters[0] === 13), 'a chapter that does not exist is not made, a text too short to be a chapter changes nothing, and the record of the run notes the rewriting');
    ok(K.amend(st, doc) === 0 && K.amend(st, { rev: 1, chapters: [{ n: 13, text: 'Something else entirely, long enough to be taken for a chapter.' }] }) === 0 && /Papa/.test(c13.text), 'the same correction is not taken up twice');
    ok(K.amend(st, { rev: 2, chapters: [{ n: 13, text: long }] }) === 1 && c13.text.length === 6000 && c13.was.text === 'The record is thin until days 59 and 60.' && K.amend(st, null) === 0 && K.amend(st, { rev: 9 }) === 0 && K.amend(st, { rev: 'x', chapters: [] }) === 0, 'a later correction is, cut to the length of a chapter, with the first writing still kept; a correction that is empty or malformed does nothing');
    const back = M.restore(JSON.parse(JSON.stringify(M.snapshot(st))));
    ok(back.story.amended === 2 && back.story.chapters[1].amended && back.story.chapters[1].was.title === 'Thin' && K.amend(back, { rev: 2, chapters: [{ n: 13, text: 'Once more, long enough to be taken for a chapter of the story.' }] }) === 0, 'it is saved with the world, and a reloaded world does not take the same correction again');
  }
  {
    /* a world saved before this change carries on */
    const snap = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-generation-23.json.gz'))).toString()), st = M.restore(snap); SW.use(st.world);
    const s = K.span(st, st.story.last || 0); M.chron(st, 'gift', 'a new entry', []);
    ok(st && Array.isArray(s.lines) && s.n <= 120 && st.chron[st.chron.length - 1].text === 'a new entry', 'a world saved by the generation before loads, and its chronicler is handed what that save kept (' + s.n + ' entries)');
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.log('FAIL the checks broke: ' + (e && e.stack || e)); });
