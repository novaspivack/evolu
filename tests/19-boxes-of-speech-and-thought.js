/* On the page, what a being says and what it thinks stand in boxes over the map. Every box is given its place before any is drawn (placeBubbles in
   ui.js), so that none lies over another, none lies under a panel of the page, and none hangs off the view. This file takes that one function out of
   the page script and tries it on thousands of scenes made by chance; tests/browser/bubbles.js checks the same on the page itself. */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8'), a = src.indexOf('function placeBubbles('), b = src.indexOf('/* The panels that lie over the map');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
ok(a > 0 && b > a, 'the placing of the boxes is one function of the page script, with nothing of the page in it');
const place = new Function('clamp', src.slice(a, b) + '; return placeBubbles;')(clamp);
let seed = 20261123; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const cross = (p, q) => p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
const bad = { count: 0, size: 0, view: 0, panel: 0, over: 0, order: 0, side: 0, far: 0, lone: 0, wait: 0 };
let shown = 0, total = 0, scenes = 20000, lone = 0, hung = 0, lifted = 0, dots = 0;
for (let t = 0; t < scenes; t++) {
  const W = 300 + rnd() * 1400, H = 300 + rnd() * 900, fixed = [];
  if (rnd() < 0.8) fixed.push({ x: 12, y: 12, w: 120 + rnd() * 300, h: 40 + rnd() * 110 });
  if (rnd() < 0.8) fixed.push({ x: W - 112 - 300 * rnd(), y: 12, w: 100 + rnd() * 300, h: 40 + rnd() * 110 });
  if (rnd() < 0.6) fixed.push({ x: 12, y: H - 140, w: 190, h: 128 });
  const n = 1 + Math.floor(rnd() * 12), groups = [], cx = rnd() * W, cy = rnd() * H, spread = 10 + rnd() * 500;
  for (let k = 0; k < n; k++) {
    const ax = clamp(cx + (rnd() - 0.5) * spread, 0, W), z = 9 + rnd() * 40, py = clamp(cy + (rnd() - 0.5) * spread, z, H + 60), boxes = [], nb = rnd() < 0.5 ? 1 : 2;
    for (let i = 0; i < nb; i++) boxes.push({ w: 40 + rnd() * 190, h: 26 + Math.floor(rnd() * 6) * 16 });
    groups.push({ ax: ax, top: py - z * 0.95, bot: py + z * 0.85, boxes: boxes });
  }
  const out = place(groups, W, H, fixed), all = [];
  if (out.length !== n) { bad.count++; continue; }
  out.forEach((P, gi) => {
    const g = groups[gi]; total += g.boxes.length; if (!P) { dots += g.boxes.length; return; } shown += P.rects.length; dots += g.boxes.length - P.rects.length;
    if (P.rects.length > g.boxes.length || P.rects.length < 1) bad.count++;
    if (P.below) hung++; else if (P.shift > 0) lifted++;
    P.rects.forEach((r, i) => {
      all.push(r);
      if (r.w !== g.boxes[i].w || r.h !== g.boxes[i].h || !isFinite(r.x) || !isFinite(r.y)) bad.size++;
      if (r.y < 6 - 1e-6 || r.y + r.h > H - 6 + 1e-6 || r.x < 6 - 1e-6 || r.x + r.w > W - 6 + 1e-6) bad.view++;
      if (fixed.some(f => cross(r, f))) bad.panel++;
    });
    for (let i = 1; i < P.rects.length; i++) if (P.below ? P.rects[i].y < P.rects[i - 1].y + P.rects[i - 1].h : P.rects[i].y + P.rects[i].h > P.rects[i - 1].y) bad.order++;
    if (P.below ? P.rects[0].y < g.bot : P.rects[0].y + P.rects[0].h > g.top) bad.side++;
    if (P.shift > 240.02 || P.shift < 0) bad.far++;
  });
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (cross(all[i], all[j])) bad.over++;
  /* placing is in the order given: what the first group gets does not depend on who comes after it */
  if (n > 1) { const alone = place([groups[0]], W, H, fixed)[0]; if (JSON.stringify(alone) !== JSON.stringify(out[0])) bad.wait++; }
  /* one being with room over its head and no panel near: its boxes stand just over it, unmoved */
  if (n === 1) {
    const g = groups[0], P = out[0], hgt = g.boxes.reduce((q, x) => q + x.h, 0) + 6 * (g.boxes.length - 1);
    const free = g.top - 10 - hgt >= 6 && g.top - 10 <= H - 6 && !fixed.some(f => cross({ x: g.ax - 260, y: g.top - 14 - hgt, w: 520, h: hgt + 18 }, f));
    if (free) { lone++; if (!(P && !P.below && P.shift === 0 && P.rects.length === g.boxes.length && Math.abs(P.rects[0].y + P.rects[0].h - (g.top - 10)) < 1e-6)) bad.lone++; }
  }
}
ok(bad.over === 0, scenes + ' scenes of one to twelve beings speaking and thinking near one another: no box lies over another (' + bad.over + ' crossings among ' + shown + ' boxes placed)');
ok(bad.panel === 0, 'no box lies under a panel of the page (' + bad.panel + ')');
ok(bad.view === 0, 'every box shown is whole within the view (' + bad.view + ')');
ok(bad.order === 0 && bad.side === 0, 'the boxes of one being stand in order outward from it, speech nearest, all on one side of it (' + bad.order + ', ' + bad.side + ')');
ok(bad.size === 0 && bad.count === 0 && bad.far === 0, 'a box keeps its size, and is never carried more than 240 points from where it would stand');
ok(bad.wait === 0, 'whoever is placed first keeps the place it would have had alone: a box already up does not move for a newer one (' + bad.wait + ')');
ok(lone > 500 && bad.lone === 0, 'a being alone with room over its head has its boxes just above it, unmoved (' + lone + ' such scenes)');
ok(hung > 1000 && lifted > 1000 && dots > 1000 && shown > total * 0.4, 'the scenes did try the placing: ' + lifted + ' stacks lifted clear, ' + hung + ' hung below, ' + dots + ' boxes with no room left as dots, ' + Math.round(100 * shown / total) + '% shown');
/* the fault this was written for: the thought made first and the speech after it, for one being */
{
  const g = { ax: 400, top: 500, bot: 540, boxes: [{ w: 228, h: 74 }, { w: 228, h: 106 }] }, P = place([g], 1000, 800, [])[0];
  ok(P && P.rects.length === 2 && P.rects[0].y + P.rects[0].h === 490 && P.rects[1].y + P.rects[1].h === P.rects[0].y - 6, 'a speech of four lines with a thought of six: the thought stands six points above the speech, whatever the height of either (before, it was lifted a fixed 70 points, or not at all)');
  const top = place([{ ax: 400, top: 120, bot: 160, boxes: g.boxes }], 1000, 800, [{ x: 12, y: 12, w: 360, h: 100 }])[0];
  ok(top && top.below && top.rects[0].y === 170 && top.rects[1].y === top.rects[0].y + top.rects[0].h + 6, 'under the top of the view the two hang below their being instead of being pressed onto each other');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
