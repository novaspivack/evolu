/* Required Notice: Copyright (c) 2026 Nova Spivack (https://github.com/novaspivack/evolu)
   Evolu is licensed under the PolyForm Noncommercial License 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0

   Evolu interface: camera, renderer, instruments and inspector. */
(function () {
'use strict';
const $ = function (id) { return document.getElementById(id); };
const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
const clamp = SW.clamp;
const SAVE_KEY = 'seedworld.save.v4'; /* the key keeps the world's first name so that worlds saved before the renaming still load */
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TICKS_PER_SEC = 3;

let st = null, w = null, sampleFn = null, toolsOK = true;
const cam = { x: 22, y: 15, z: 20, fit: 20 };
const U = { sel: null, follow: false, tab: 'inspect', playing: true, speed: 1, acc: 0, last: 0, time: 0, bubbles: [], fx: [], hist: [], onlySel: false, keys: {}, showOld: false, lastSave: 0, lastPanel: 0, lastScene: 0, lastMini: 0 };
const cv = $('world'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, terrainBmp = null, miniBmp = null, snowBmp = null, leafBmp = null;
const lightCv = document.createElement('canvas'), lightCx = lightCv.getContext('2d');

/* ---------- default looks for things nobody has designed yet ---------- */
const DEFAULT_SHELTER = { anim: 'none', shapes: [{ t: 'ellipse', x: 0.05, y: 0.33, w: 0.36, h: 0.07, fill: '#141a14' }, { t: 'rect', y: 0.17, w: 0.26, h: 0.15, fill: '#5c452c' }, { t: 'tri', y: -0.12, s: 0.41, fill: '#9a7b45' }, { t: 'line', x: -0.21, y: 0.07, x2: 0, y2: -0.31, lw: 0.022, stroke: '#6f5730' }, { t: 'line', x: 0.21, y: 0.07, x2: 0, y2: -0.31, lw: 0.022, stroke: '#6f5730' }, { t: 'line', x: -0.1, y: 0.07, x2: 0, y2: -0.31, lw: 0.016, stroke: '#7d6436' }, { t: 'line', x: 0.1, y: 0.07, x2: 0, y2: -0.31, lw: 0.016, stroke: '#7d6436' }, { t: 'rect', y: 0.22, w: 0.06, h: 0.1, fill: '#1e150c' }] };
function defaultEmblem(hue) { const c = SW.hslToHex(hue || 0, 0.7, 0.6); return { anim: 'sway', shapes: [{ t: 'line', x: 0, y: 0.34, x2: 0, y2: -0.3, lw: 0.05, stroke: '#7a5a3a' }, { t: 'tri', x: 0.13, y: -0.2, s: 0.15, rot: 90, fill: c }] }; }
const DEFAULT_FIRE = { anim: 'pulse', shapes: [{ t: 'line', x: -0.26, y: 0.26, x2: 0.26, y2: 0.14, lw: 0.08, stroke: '#4a321e' }, { t: 'line', x: 0.26, y: 0.26, x2: -0.26, y2: 0.14, lw: 0.08, stroke: '#5a3d26' }, { t: 'tri', y: -0.06, s: 0.3, fill: '#e2552f' }, { t: 'tri', y: 0, s: 0.2, fill: '#ffb03a' }, { t: 'tri', y: 0.05, s: 0.11, fill: '#fff0a0' }] };
const DEFAULT_STORE = { anim: 'none', shapes: [{ t: 'line', x: -0.24, y: 0.4, x2: -0.24, y2: 0.14, lw: 0.05, stroke: '#4a3722' }, { t: 'line', x: 0.24, y: 0.4, x2: 0.24, y2: 0.14, lw: 0.05, stroke: '#4a3722' }, { t: 'rect', y: 0.06, w: 0.3, h: 0.16, fill: '#8a6a3c' }, { t: 'line', x: -0.3, y: 0.06, x2: 0.3, y2: 0.06, lw: 0.025, stroke: '#5f4826' }, { t: 'tri', y: -0.22, s: 0.36, fill: '#a98a4e' }, { t: 'line', x: -0.18, y: -0.06, x2: 0, y2: -0.38, lw: 0.018, stroke: '#7d6436' }, { t: 'line', x: 0.18, y: -0.06, x2: 0, y2: -0.38, lw: 0.018, stroke: '#7d6436' }] };
/* built things are composed from parts too: each builder has a way of building, and no two of its buildings are quite alike */
const STRUCT_CACHE = {};
const KIND_CACHE = {};
function kindLook(name, owner) {
  const tone = (owner || 0) % 7, key = name + tone; if (KIND_CACHE[key]) return KIND_CACHE[key];
  const hue = [28, 38, 20, 46, 14, 58, 32][tone], wood = 'hsl(' + hue + ',34%,29%)', thatch = 'hsl(' + (hue + 12) + ',44%,46%)', dark = 'hsl(' + hue + ',30%,13%)', line = 'hsl(' + hue + ',36%,24%)', stone = 'hsl(' + (205 + tone * 5) + ',7%,56%)', stone2 = 'hsl(' + (205 + tone * 5) + ',7%,42%)', sh = [{ t: 'ellipse', x: 0.05, y: 0.36, w: 0.46, h: 0.08, fill: '#141a14' }];
  let h = 0; for (let k = 0; k < name.length; k++) h = (h * 31 + name.charCodeAt(k)) % 997;
  const special = { cave: 10, stone: 11, statue: 12, pyramid: 13, well: 14, mill: 15, windmill: 15, temple: 16, market: 17, dock: 18 }[name];
  if (special) {
    const sand = '#c9b27a', pale = 'hsl(' + (205 + tone * 5) + ',8%,70%)';
    if (special === 10) { sh.length = 0; sh.push({ t: 'ellipse', y: 0.1, w: 0.44, h: 0.34, fill: '#6e6a66' }, { t: 'ellipse', x: -0.1, y: -0.08, w: 0.2, h: 0.12, fill: '#84807b' }, { t: 'ellipse', y: 0.18, w: 0.25, h: 0.24, fill: '#15120f' }, { t: 'ellipse', x: -0.34, y: 0.32, w: 0.13, h: 0.08, fill: '#5a5652' }, { t: 'ellipse', x: 0.34, y: 0.3, w: 0.12, h: 0.07, fill: '#7a7672' }); }
    else if (special === 11) sh.push({ t: 'ellipse', y: 0, w: 0.12, h: 0.38, fill: stone }, { t: 'ellipse', x: -0.03, y: -0.1, w: 0.05, h: 0.22, fill: pale }, { t: 'ring', n: 5, d: 0.5, y: 0.32, s: 0.05, fill: stone2 });
    else if (special === 12) sh.push({ t: 'rect', y: 0.32, w: 0.36, h: 0.08, fill: stone2 }, { t: 'rect', y: 0.06, w: 0.13, h: 0.4, fill: stone }, { t: 'line', x: -0.13, y: -0.06, x2: -0.28, y2: -0.22, lw: 0.07, stroke: stone }, { t: 'line', x: 0.13, y: -0.06, x2: 0.2, y2: 0.12, lw: 0.07, stroke: stone }, { t: 'circle', y: -0.32, s: 0.12, fill: pale }, { t: 'line', x: -0.06, y: 0.0, x2: -0.06, y2: 0.24, lw: 0.015, stroke: stone2 });
    else if (special === 13) sh.push({ t: 'tri', y: 0.02, s: 0.66, fill: sand }, { t: 'tri', x: 0.14, y: 0.08, s: 0.42, rot: 0, fill: '#b39a62' }, { t: 'line', x: -0.3, y: 0.22, x2: 0.3, y2: 0.22, lw: 0.012, stroke: '#8a7648' }, { t: 'line', x: -0.2, y: 0.06, x2: 0.2, y2: 0.06, lw: 0.012, stroke: '#8a7648' }, { t: 'line', x: -0.1, y: -0.1, x2: 0.1, y2: -0.1, lw: 0.012, stroke: '#8a7648' }, { t: 'tri', y: -0.31, s: 0.09, fill: '#f2d28a' });
    else if (special === 14) sh.push({ t: 'ellipse', y: 0.22, w: 0.26, h: 0.13, fill: stone2 }, { t: 'ellipse', y: 0.18, w: 0.18, h: 0.075, fill: '#0e2a3a' }, { t: 'line', x: -0.2, y: 0.2, x2: -0.2, y2: -0.2, lw: 0.04, stroke: line }, { t: 'line', x: 0.2, y: 0.2, x2: 0.2, y2: -0.2, lw: 0.04, stroke: line }, { t: 'tri', y: -0.3, s: 0.3, fill: thatch }, { t: 'line', x: 0, y: -0.16, x2: 0, y2: 0.1, lw: 0.015, stroke: dark });
    else if (special === 15) sh.push({ t: 'rect', y: 0.16, w: 0.2, h: 0.36, fill: stone }, { t: 'tri', y: -0.12, s: 0.25, fill: thatch }, { t: 'rect', y: 0.28, w: 0.07, h: 0.12, fill: dark }, { t: 'line', x: -0.36, y: -0.46, x2: 0.36, y2: 0.22, lw: 0.045, stroke: '#e8dcc0' }, { t: 'line', x: 0.36, y: -0.46, x2: -0.36, y2: 0.22, lw: 0.045, stroke: '#e8dcc0' }, { t: 'circle', y: -0.12, s: 0.04, fill: dark });
    else if (special === 16) sh.push({ t: 'rect', y: 0.34, w: 0.6, h: 0.06, fill: stone2 }, { t: 'line', x: -0.21, y: 0.3, x2: -0.21, y2: -0.1, lw: 0.07, stroke: pale }, { t: 'line', x: -0.07, y: 0.3, x2: -0.07, y2: -0.1, lw: 0.07, stroke: pale }, { t: 'line', x: 0.07, y: 0.3, x2: 0.07, y2: -0.1, lw: 0.07, stroke: pale }, { t: 'line', x: 0.21, y: 0.3, x2: 0.21, y2: -0.1, lw: 0.07, stroke: pale }, { t: 'tri', y: -0.24, s: 0.52, fill: stone }, { t: 'star', y: -0.24, s: 0.07, n: 6, fill: '#f2d28a' });
    else if (special === 17) sh.push({ t: 'line', x: -0.34, y: 0.34, x2: -0.34, y2: -0.02, lw: 0.03, stroke: line }, { t: 'line', x: -0.06, y: 0.34, x2: -0.06, y2: -0.02, lw: 0.03, stroke: line }, { t: 'line', x: 0.08, y: 0.34, x2: 0.08, y2: -0.1, lw: 0.03, stroke: line }, { t: 'line', x: 0.36, y: 0.34, x2: 0.36, y2: -0.1, lw: 0.03, stroke: line }, { t: 'rect', x: -0.2, y: -0.04, w: 0.17, h: 0.05, fill: '#b5532a' }, { t: 'rect', x: 0.22, y: -0.12, w: 0.17, h: 0.05, fill: '#e8dcc0' }, { t: 'ring', n: 4, d: 0.2, x: -0.2, y: 0.24, s: 0.05, fill: '#d8a13a' }, { t: 'ring', n: 3, d: 0.18, x: 0.22, y: 0.22, s: 0.05, fill: '#7fb7b0' });
    else sh.push({ t: 'rect', y: 0.16, w: 0.56, h: 0.07, fill: wood }, { t: 'line', x: -0.4, y: 0.4, x2: -0.4, y2: 0.06, lw: 0.05, stroke: line }, { t: 'line', x: 0, y: 0.4, x2: 0, y2: 0.06, lw: 0.05, stroke: line }, { t: 'line', x: 0.4, y: 0.4, x2: 0.4, y2: 0.06, lw: 0.05, stroke: line }, { t: 'ellipse', x: 0.1, y: -0.08, w: 0.26, h: 0.07, fill: '#7a5a3a' }, { t: 'line', x: 0.1, y: -0.12, x2: 0.1, y2: -0.44, lw: 0.02, stroke: line }, { t: 'tri', x: 0.2, y: -0.3, s: 0.16, rot: 90, fill: '#e8dcc0' });
    return (KIND_CACHE[key] = { anim: 'none', shapes: sh });
  }
  const form = name === 'hall' || name === 'longhall' || name === 'school' || name === 'moot' ? 0 : name === 'shrine' ? 1 : name === 'workshop' || name === 'kiln' || name === 'forge' || name === 'enginehouse' ? 2 : name === 'tower' || name === 'observatory' ? 3 : h % 4;
  if (form === 0) sh.push({ t: 'rect', y: 0.18, w: 0.5, h: 0.16, fill: wood }, { t: 'tri', y: -0.14, s: 0.54, fill: thatch }, { t: 'line', x: -0.5, y: 0.03, x2: 0.5, y2: 0.03, lw: 0.03, stroke: line }, { t: 'rect', y: 0.22, w: 0.09, h: 0.12, fill: dark }, { t: 'line', x: -0.3, y: 0.06, x2: -0.3, y2: 0.34, lw: 0.03, stroke: line }, { t: 'line', x: 0.3, y: 0.06, x2: 0.3, y2: 0.34, lw: 0.03, stroke: line }, { t: 'line', x: 0, y: -0.5, x2: 0, y2: -0.66, lw: 0.025, stroke: line }, { t: 'tri', x: 0.07, y: -0.6, s: 0.07, rot: 90, fill: '#b5532a' });
  else if (form === 1) sh.push({ t: 'ring', n: 7, d: 0.72, y: 0.18, s: 0.07, fill: stone2 }, { t: 'rect', y: 0.1, w: 0.1, h: 0.26, fill: stone }, { t: 'rect', y: -0.18, w: 0.2, h: 0.05, fill: stone }, { t: 'star', y: -0.36, s: 0.1, n: 6, fill: '#f2d28a' }, { t: 'ring', n: 3, d: 0.24, y: 0.3, s: 0.035, fill: '#e8a04a' });
  else if (form === 2) sh.push({ t: 'rect', x: -0.08, y: 0.16, w: 0.36, h: 0.18, fill: wood }, { t: 'tri', x: -0.08, y: -0.06, s: 0.4, rot: 0, fill: thatch }, { t: 'rect', x: 0.36, y: 0.02, w: 0.07, h: 0.34, fill: stone2 }, { t: 'circle', x: 0.36, y: -0.38, s: 0.07, fill: 'rgba(200,200,200,0.5)' }, { t: 'circle', x: 0.42, y: -0.52, s: 0.05, fill: 'rgba(200,200,200,0.35)' }, { t: 'rect', x: -0.08, y: 0.24, w: 0.14, h: 0.1, fill: dark }, { t: 'circle', x: -0.08, y: 0.26, s: 0.035, fill: '#f08a3c' }, { t: 'line', x: -0.42, y: 0.34, x2: -0.3, y2: 0.2, lw: 0.03, stroke: stone });
  else sh.push({ t: 'rect', y: 0.1, w: 0.2, h: 0.5, fill: stone2 }, { t: 'rect', y: -0.44, w: 0.3, h: 0.07, fill: stone }, { t: 'rect', x: -0.2, y: -0.56, w: 0.07, h: 0.08, fill: stone }, { t: 'rect', x: 0, y: -0.56, w: 0.07, h: 0.08, fill: stone }, { t: 'rect', x: 0.2, y: -0.56, w: 0.07, h: 0.08, fill: stone }, { t: 'rect', y: -0.12, w: 0.06, h: 0.1, fill: dark }, { t: 'rect', y: 0.28, w: 0.09, h: 0.14, fill: dark }, { t: 'line', x: -0.2, y: 0.1, x2: 0.2, y2: 0.1, lw: 0.015, stroke: dark });
  return (KIND_CACHE[key] = { anim: 'none', shapes: sh });
}
function structLook(kind, owner, i) {
  if (kind === 'shelter' && w.bkind && w.bkind[i] && ((w.laws.buildings && w.laws.buildings[w.bkind[i]]) || w.bkind[i] === 'cave')) return kindLook(w.bkind[i], owner > 0 ? owner : 0);
  owner = owner || 0;
  const fam = owner % (kind === 'shelter' ? 6 : 3), v = Math.floor(hash(i % w.W, Math.floor(i / w.W), 91) * 3), tone = owner % 7, key = kind + fam + v + tone;
  if (STRUCT_CACHE[key]) return STRUCT_CACHE[key];
  const hue = [28, 38, 20, 46, 14, 58, 32][tone], wood = 'hsl(' + hue + ',34%,' + (27 + v * 2) + '%)', thatch = 'hsl(' + (hue + 12) + ',44%,' + (44 + v * 4) + '%)', dark = 'hsl(' + hue + ',30%,13%)', line = 'hsl(' + hue + ',36%,26%)', stone = 'hsl(' + (200 + tone * 6) + ',6%,' + (50 + v * 5) + '%)', sh = [{ t: 'ellipse', x: 0.05, y: 0.34, w: 0.38, h: 0.07, fill: '#141a14' }];
  if (kind === 'shelter') {
    if (fam === 0) { sh.push({ t: 'rect', y: 0.17, w: 0.26, h: 0.15, fill: wood }, { t: 'tri', y: -0.12, s: 0.41, fill: thatch }, { t: 'line', x: -0.21, y: 0.07, x2: 0, y2: -0.31, lw: 0.02, stroke: line }, { t: 'line', x: 0.21, y: 0.07, x2: 0, y2: -0.31, lw: 0.02, stroke: line }, { t: 'rect', y: 0.22, w: 0.06, h: 0.1, fill: dark }); }
    else if (fam === 1) { sh.push({ t: 'tri', y: 0.02, s: 0.5, fill: thatch }, { t: 'line', x: 0, y: -0.44, x2: -0.06, y2: -0.56, lw: 0.02, stroke: line }, { t: 'line', x: 0, y: -0.44, x2: 0.07, y2: -0.56, lw: 0.02, stroke: line }, { t: 'tri', y: 0.2, s: 0.16, fill: dark }, { t: 'line', x: -0.3, y: 0.2, x2: 0.3, y2: 0.2, lw: 0.03, stroke: stone }); }
    else if (fam === 2) { sh.push({ t: 'ellipse', y: 0.18, w: 0.33, h: 0.15, fill: wood }, { t: 'tri', y: -0.1, s: 0.44, fill: thatch }, { t: 'ellipse', y: 0.07, w: 0.36, h: 0.05, fill: line }, { t: 'rect', y: 0.22, w: 0.06, h: 0.09, fill: dark }); }
    else if (fam === 3) { sh.push({ t: 'rect', y: 0.16, w: 0.42, h: 0.14, fill: wood }, { t: 'tri', x: -0.2, y: -0.06, s: 0.3, fill: thatch }, { t: 'tri', x: 0.2, y: -0.06, s: 0.3, fill: thatch }, { t: 'rect', y: -0.04, w: 0.22, h: 0.11, fill: thatch }, { t: 'rect', x: -0.14, y: 0.21, w: 0.05, h: 0.09, fill: dark }, { t: 'line', x: -0.42, y: 0.03, x2: 0.42, y2: 0.03, lw: 0.025, stroke: line }); }
    else if (fam === 4) { sh.push({ t: 'ellipse', y: 0.12, w: 0.38, h: 0.24, fill: 'hsl(' + (88 + tone * 5) + ',26%,' + (30 + v * 3) + '%)' }, { t: 'ellipse', y: 0.03, w: 0.26, h: 0.1, fill: 'hsl(' + (92 + tone * 5) + ',30%,' + (38 + v * 3) + '%)' }, { t: 'rect', y: 0.22, w: 0.08, h: 0.11, fill: dark }, { t: 'line', x: -0.11, y: 0.1, x2: -0.11, y2: 0.33, lw: 0.03, stroke: wood }, { t: 'line', x: 0.11, y: 0.1, x2: 0.11, y2: 0.33, lw: 0.03, stroke: wood }); }
    else { sh.push({ t: 'line', x: -0.24, y: 0.36, x2: -0.24, y2: 0.08, lw: 0.045, stroke: line }, { t: 'line', x: 0.24, y: 0.36, x2: 0.24, y2: 0.08, lw: 0.045, stroke: line }, { t: 'line', x: 0, y: 0.36, x2: 0, y2: 0.08, lw: 0.045, stroke: line }, { t: 'rect', y: 0, w: 0.3, h: 0.12, fill: wood }, { t: 'tri', y: -0.24, s: 0.36, fill: thatch }, { t: 'rect', x: 0.08, y: 0.02, w: 0.05, h: 0.08, fill: dark }); }
    if (v === 1) sh.push({ t: 'line', x: 0.12, y: -0.2, x2: 0.12, y2: -0.42, lw: 0.03, stroke: stone }); else if (v === 2) sh.push({ t: 'rect', x: 0.33, y: 0.24, w: 0.1, h: 0.08, fill: wood });
  } else if (kind === 'wall') {
    if (fam === 0) [-0.38, -0.19, 0, 0.19, 0.38].forEach(function (x, k) { sh.push({ t: 'line', x: x, y: 0.4, x2: x, y2: k % 2 ? -0.22 : -0.16, lw: 0.14, stroke: k % 2 ? wood : line }); });
    else if (fam === 1) { [[0.26, 0.42], [0.08, 0.38], [-0.1, 0.34]].forEach(function (q, k) { sh.push({ t: 'rect', x: k % 2 ? 0.04 : -0.04, y: q[0], w: q[1], h: 0.09, fill: k % 2 ? stone : 'hsl(200,6%,' + (42 + v * 5) + '%)' }); }); sh.push({ t: 'line', x: -0.3, y: 0.17, x2: 0.3, y2: 0.17, lw: 0.015, stroke: dark }); }
    else { [-0.3, 0, 0.3].forEach(function (x) { sh.push({ t: 'line', x: x, y: 0.4, x2: x, y2: -0.12, lw: 0.05, stroke: line }); }); [-0.02, 0.14, 0.3].forEach(function (y, k) { sh.push({ t: 'line', x: -0.42, y: y + (k % 2 ? 0.03 : 0), x2: 0.42, y2: y + (k % 2 ? 0 : 0.03), lw: 0.04, stroke: k % 2 ? wood : thatch }); }); }
  } else {
    if (fam === 0) sh.push({ t: 'line', x: -0.24, y: 0.4, x2: -0.24, y2: 0.14, lw: 0.05, stroke: line }, { t: 'line', x: 0.24, y: 0.4, x2: 0.24, y2: 0.14, lw: 0.05, stroke: line }, { t: 'rect', y: 0.06, w: 0.3, h: 0.16, fill: wood }, { t: 'tri', y: -0.22, s: 0.36, fill: thatch });
    else if (fam === 1) sh.push({ t: 'ellipse', y: 0.2, w: 0.36, h: 0.16, fill: dark }, { t: 'ellipse', y: 0.14, w: 0.38, h: 0.1, fill: thatch }, { t: 'line', x: -0.3, y: 0.14, x2: 0.3, y2: 0.14, lw: 0.02, stroke: line }, { t: 'ring', n: 5, d: 0.3, y: 0.2, s: 0.05, fill: stone });
    else sh.push({ t: 'line', x: -0.34, y: 0.4, x2: -0.3, y2: -0.24, lw: 0.04, stroke: line }, { t: 'line', x: 0.34, y: 0.4, x2: 0.3, y2: -0.24, lw: 0.04, stroke: line }, { t: 'line', x: -0.32, y: -0.2, x2: 0.32, y2: -0.2, lw: 0.035, stroke: wood }, { t: 'line', x: -0.33, y: 0.05, x2: 0.33, y2: 0.05, lw: 0.035, stroke: wood }, { t: 'ring', n: 4, d: 0.16, y: -0.08, s: 0.045, fill: '#b5532a' }, { t: 'ring', n: 3, d: 0.14, y: 0.17, s: 0.045, fill: thatch });
  }
  return (STRUCT_CACHE[key] = { anim: 'none', shapes: sh });
}
const SITE_LOOK = { anim: 'pulse', shapes: [{ t: 'ring', d: 0.34, n: 7, s: 0.035, fill: '#d9c8ff' }, { t: 'star', s: 0.2, n: 6, fill: '#f2ecff' }, { t: 'circle', s: 0.07, fill: '#8f6ad8' }] };
const TOOL_LOOKS = {
  fish: [{ t: 'line', x: -0.3, y: 0.32, x2: 0.22, y2: -0.3, lw: 0.05, stroke: '#7a5a3a' }, { t: 'line', x: 0.22, y: -0.3, x2: 0.26, y2: 0.12, lw: 0.02, stroke: '#d8d2c2' }, { t: 'ellipse', x: 0.26, y: 0.2, w: 0.1, h: 0.05, fill: '#8fb4c4' }],
  hunt: [{ t: 'line', x: -0.3, y: 0.3, x2: 0.24, y2: -0.24, lw: 0.06, stroke: '#7a5a3a' }, { t: 'tri', x: 0.28, y: -0.28, s: 0.14, rot: 45, fill: '#b9c2ca' }],
  fight: [{ t: 'line', x: -0.26, y: 0.28, x2: 0.1, y2: -0.08, lw: 0.08, stroke: '#6b4a2e' }, { t: 'ellipse', x: 0.2, y: -0.18, w: 0.17, h: 0.13, rot: -45, fill: '#8d939c' }],
  guard: [{ t: 'ellipse', w: 0.3, h: 0.36, fill: '#7a5a3a' }, { t: 'ellipse', w: 0.2, h: 0.26, fill: '#9a7648' }, { t: 'circle', s: 0.07, fill: '#b9c2ca' }],
  gather: [{ t: 'line', x: -0.26, y: 0.3, x2: 0.12, y2: -0.2, lw: 0.07, stroke: '#7a5a3a' }, { t: 'rect', x: 0.14, y: -0.22, w: 0.18, h: 0.08, rot: -40, fill: '#8d939c' }],
  harvest: [{ t: 'line', x: -0.2, y: 0.3, x2: 0, y2: 0, lw: 0.06, stroke: '#7a5a3a' }, { t: 'ring', n: 5, d: 0.2, x: 0.08, y: -0.14, s: 0.04, fill: '#b9c2ca' }],
  plant: [{ t: 'line', x: 0, y: -0.34, x2: 0, y2: 0.16, lw: 0.06, stroke: '#7a5a3a' }, { t: 'tri', y: 0.26, s: 0.14, rot: 180, fill: '#8d939c' }],
  build: [{ t: 'line', x: -0.24, y: 0.3, x2: 0.08, y2: -0.1, lw: 0.07, stroke: '#7a5a3a' }, { t: 'rect', x: 0.12, y: -0.18, w: 0.2, h: 0.11, rot: -40, fill: '#6f6a60' }]
};
function toolLook(d) { return d.look || (d.use === 'device' ? DEFAULT_DEVICE : { anim: 'none', shapes: TOOL_LOOKS[d.use] || TOOL_LOOKS.gather }); }
const DEFAULT_DEVICE = { anim: 'none', shapes: [{ t: 'line', x: 0, y: 0.36, x2: 0, y2: -0.1, lw: 0.08, stroke: '#5a4630' }, { t: 'star', n: 8, y: -0.18, s: 0.22, fill: '#8d939c' }, { t: 'circle', y: -0.18, s: 0.09, fill: '#f2b84b' }] };
function ruleWords(r) { return 'if ' + ((r.if || []).map(function (q) { return q[0] + ' ' + q[1] + ' ' + q[2]; }).join(' and ') || 'always') + ' → ' + r.do; }
const DEFAULT_WALL = { anim: 'none', shapes: [{ t: 'line', x: -0.38, y: 0.4, x2: -0.38, y2: -0.16, lw: 0.14, stroke: '#5a442c' }, { t: 'line', x: -0.19, y: 0.4, x2: -0.19, y2: -0.22, lw: 0.14, stroke: '#6b5136' }, { t: 'line', x: 0, y: 0.4, x2: 0, y2: -0.16, lw: 0.14, stroke: '#5a442c' }, { t: 'line', x: 0.19, y: 0.4, x2: 0.19, y2: -0.22, lw: 0.14, stroke: '#6b5136' }, { t: 'line', x: 0.38, y: 0.4, x2: 0.38, y2: -0.16, lw: 0.14, stroke: '#5a442c' }, { t: 'line', x: -0.44, y: 0.12, x2: 0.44, y2: 0.12, lw: 0.045, stroke: '#3d2e1d' }] };
const MOOD_COLOR = { anger: '#ff4a3a', fear: '#b38cff', grief: '#6f8fb8', joy: '#ffd86b', lonely: '#9aa7ad' };
function fieldColor(f) {
  if (f.law === 'growth') return f.factor > 1 ? '#6fe08a' : '#b08a4a';
  if (f.law === 'cold') return f.factor < 1 ? '#ffb45a' : '#8fd0ff';
  if (f.law === 'drain') return f.factor > 1 ? '#b06cff' : '#ffe27a';
  return f.factor > 1 ? '#ff5a5a' : '#e8f0ff';
}
function fieldMeaning(f) {
  const up = f.factor > 1;
  if (f.law === 'growth') return up ? 'plants here grow and bear faster' : 'plants here wither';
  if (f.law === 'cold') return up ? 'cold bites harder here' : 'a ward of warmth';
  if (f.law === 'drain') return up ? 'bodies here burn out faster' : 'bodies here tire more slowly';
  return up ? 'blows land harder here' : 'blows land softer here';
}
function topMood(a) { let k = null, v = 0.35; for (const m in MOOD_COLOR) if (a.mood[m] > v) { v = a.mood[m]; k = m; } return k; }
const GRAVE = { anim: 'none', shapes: [{ t: 'rect', y: 0.05, w: 0.13, h: 0.17, fill: '#8d939c' }, { t: 'circle', y: -0.1, s: 0.13, fill: '#8d939c' }] };

/* ---------- the look interpreter ---------- */
function drawLook(c, look, px, py, S, o) {
  if (!look || !look.shapes) return;
  o = o || {};
  const t = U.time + (o.phase || 0);
  c.save(); c.translate(px, py);
  if (!reduceMotion) {
    if (look.anim === 'bob') c.translate(0, -Math.abs(Math.sin(t * (o.moving ? 9 : 2.2))) * (o.moving ? 0.08 : 0.025) * S);
    else if (look.anim === 'pulse') { const k = 1 + 0.07 * Math.sin(t * 3); c.scale(k, k); }
    else if (look.anim === 'sway') c.rotate(Math.sin(t * 1.8) * 0.07);
    else if (look.anim === 'spin') c.rotate(t * 0.9);
  }
  if (o.flip) c.scale(-1, 1);
  const sh = look.shapes;
  for (let k = 0; k < sh.length; k++) {
    const q = sh[k], x = (q.x || 0) * S, y = (q.y || 0) * S;
    let n = q.n || 4;
    if (q.per === 'food') { n = Math.floor((o.food || 0) + 1e-9); if (n <= 0) continue; }
    c.beginPath();
    switch (q.t) {
      case 'circle': c.arc(x, y, (q.s || 0.2) * S, 0, 6.2832); break;
      case 'ellipse': c.ellipse(x, y, (q.w || q.s || 0.2) * S, (q.h || (q.s || 0.2) * 0.6) * S, (q.rot || 0) * 0.01745, 0, 6.2832); break;
      case 'rect': {
        const hw = (q.w || q.s || 0.2) * S, hh = (q.h || q.s || 0.2) * S, r = Math.min(hw, hh) * 0.35;
        c.save(); c.translate(x, y); c.rotate((q.rot || 0) * 0.01745);
        if (c.roundRect) c.roundRect(-hw, -hh, 2 * hw, 2 * hh, r); else c.rect(-hw, -hh, 2 * hw, 2 * hh);
        c.restore(); break;
      }
      case 'tri': {
        const s = (q.s || 0.2) * S, a = (q.rot || 0) * 0.01745, cs = Math.cos(a), sn = Math.sin(a);
        const pts = [[0, -s], [0.87 * s, 0.5 * s], [-0.87 * s, 0.5 * s]];
        for (let i = 0; i < 3; i++) { const X = x + pts[i][0] * cs - pts[i][1] * sn, Y = y + pts[i][0] * sn + pts[i][1] * cs; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); }
        c.closePath(); break;
      }
      case 'line': c.moveTo(x, y); c.lineTo((q.x2 || 0) * S, (q.y2 || 0) * S); break;
      case 'ring': {
        const d = (q.d == null ? 0.2 : q.d) * S, r = (q.s || 0.05) * S;
        for (let i = 0; i < n; i++) { const a = i / n * 6.2832 - 1.5708; c.moveTo(x + Math.cos(a) * d + r, y + Math.sin(a) * d); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, 6.2832); }
        break;
      }
      case 'star': {
        const R = (q.s || 0.2) * S, r = R * 0.45, a0 = (q.rot || 0) * 0.01745 - 1.5708;
        for (let i = 0; i < 2 * n; i++) { const a = a0 + i * 3.1416 / n, rr = i % 2 ? r : R; if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        c.closePath(); break;
      }
    }
    if (q.t === 'line') { c.lineCap = 'round'; c.lineWidth = (q.lw || 0.05) * S; c.strokeStyle = q.stroke || q.fill; c.stroke(); }
    else {
      if (q.fill) { c.fillStyle = q.fill; c.fill(); }
      if (q.stroke) { c.lineWidth = (q.lw || 0.03) * S; c.strokeStyle = q.stroke; c.stroke(); }
    }
  }
  c.restore();
}
function paintLook(canvas, look, o) {
  const c = canvas.getContext('2d'), n = canvas.width;
  c.clearRect(0, 0, n, n);
  drawLook(c, look, n / 2, n / 2 + n * 0.04, n * (o && o.scale || 1.05), o);
}

/* ---------- terrain: painted once per world ---------- */
const TP = 24;
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y); let fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
/* The land is painted once per world: wandering borders, light from the north-west, deep and shallow water, shore foam, then brushwork and detail. */
function buildTerrain() {
  const Wt = w.W, Ht = w.H, SS = 4, sw = Wt * SS, shh = Ht * SS;
  const ELEV = [-2.4, 0.1, 1, 1.3, 3.4, -1, 0.6, 1.1, 2.7, 0.4];
  const PAL = [[22, 52, 80], [196, 178, 136], [104, 132, 74], [70, 100, 62], [122, 114, 106], [54, 108, 120], [82, 98, 70], [194, 152, 96], [222, 229, 234], [34, 38, 52]]; /* the last is the unknown: mist */
  const el = new Float32Array(Wt * Ht), eb = new Float32Array(Wt * Ht);
  for (let i = 0; i < Wt * Ht; i++) el[i] = ELEV[w.terrain[i]] + (hash(i % Wt, Math.floor(i / Wt), 3) - 0.5) * 0.5;
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) {
    let sum = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= Wt || yy >= Ht) continue; sum += el[yy * Wt + xx]; n++; }
    eb[y * Wt + x] = sum / n;
  }
  const elev = function (fx, fy) {
    const x = clamp(fx - 0.5, 0, Wt - 1.001), y = clamp(fy - 0.5, 0, Ht - 1.001), x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    return (eb[y0 * Wt + x0] * (1 - tx) + eb[y0 * Wt + x0 + 1] * tx) * (1 - ty) + (eb[(y0 + 1) * Wt + x0] * (1 - tx) + eb[(y0 + 1) * Wt + x0 + 1] * tx) * ty;
  };
  const small = document.createElement('canvas'); small.width = sw; small.height = shh;
  const sc = small.getContext('2d'), img = sc.createImageData(sw, shh), px = img.data;
  for (let py = 0; py < shh; py++) for (let qx = 0; qx < sw; qx++) {
    const fx = (qx + 0.5) / SS, fy = (py + 0.5) / SS;
    const jx = fx + (vnoise(fx * 1.4, fy * 1.4, 11) - 0.5) * 1.0, jy = fy + (vnoise(fx * 1.4, fy * 1.4, 12) - 0.5) * 1.0;
    const tx = clamp(Math.floor(jx), 0, Wt - 1), ty = clamp(Math.floor(jy), 0, Ht - 1), ti = ty * Wt + tx, t = w.terrain[ti], b = PAL[t];
    let r = b[0], g = b[1], bl = b[2];
    const tone = vnoise(fx * 0.35, fy * 0.35, 5) - 0.5, grain = hash(qx, py, 7) - 0.5;
    if (t === 2) { const f = w.fert[ti] - 0.75; r += tone * 34 - f * 26; g += tone * 20 + f * 22; bl += tone * 10 - f * 16; }
    else if (t === 3) { r += tone * 16; g += tone * 20; bl += tone * 12; }
    else if (t === 7) { r += tone * 26; g += tone * 20; bl += tone * 10; }
    else if (t === 8) { r += tone * 10; g += tone * 10; bl += tone * 14; }
    else if (t === 0 || t === 5) { const dp = clamp((elev(fx, fy) + 2.4) / 3, 0, 1); r += dp * 26 - 8; g += dp * 44 - 12; bl += dp * 40 - 10; }
    else { r += tone * 20; g += tone * 18; bl += tone * 16; }
    let shade = 1;
    if (t !== 0 && t !== 5) shade = 1 + clamp((elev(fx - 0.7, fy - 0.7) - elev(fx + 0.7, fy + 0.7)) * 0.2, -0.3, 0.3);
    const k = (py * sw + qx) * 4;
    px[k] = clamp((r + grain * 8) * shade, 0, 255); px[k + 1] = clamp((g + grain * 8) * shade, 0, 255); px[k + 2] = clamp((bl + grain * 8) * shade, 0, 255); px[k + 3] = 255;
  }
  sc.putImageData(img, 0, 0);
  const mini2 = document.createElement('canvas'); mini2.width = Wt * 2; mini2.height = Ht * 2; mini2.getContext('2d').drawImage(small, 0, 0, Wt * 2, Ht * 2); miniBmp = mini2;
  const big = document.createElement('canvas'); big.width = Wt * TP; big.height = Ht * TP;
  const b = big.getContext('2d');
  b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high';
  b.drawImage(small, 0, 0, big.width, big.height);
  const colAt = function (fx, fy) { const k = (clamp(Math.floor(fy * SS), 0, shh - 1) * sw + clamp(Math.floor(fx * SS), 0, sw - 1)) * 4; return [px[k], px[k + 1], px[k + 2]]; };
  /* brushwork: short strokes in the local colour, following a slow direction field */
  b.lineCap = 'round';
  const strokes = Math.round(Wt * Ht * 2.6);
  for (let n = 0; n < strokes; n++) {
    const fx = hash(n, 1, 21) * Wt, fy = hash(n, 2, 21) * Ht, c0 = colAt(fx, fy), dv = (hash(n, 3, 21) - 0.5) * 34;
    const ang = vnoise(fx * 0.22, fy * 0.22, 23) * 6.28, len = 4 + hash(n, 4, 21) * 9;
    b.strokeStyle = 'rgba(' + Math.round(clamp(c0[0] + dv, 0, 255)) + ',' + Math.round(clamp(c0[1] + dv, 0, 255)) + ',' + Math.round(clamp(c0[2] + dv, 0, 255)) + ',0.22)';
    b.lineWidth = 1.6 + hash(n, 5, 21) * 2.6;
    b.beginPath(); b.moveTo(fx * TP, fy * TP); b.lineTo(fx * TP + Math.cos(ang) * len, fy * TP + Math.sin(ang) * len); b.stroke();
  }
  /* shore foam where land meets water */
  b.strokeStyle = 'rgba(232,240,232,0.34)'; b.lineWidth = 2.2; b.shadowColor = 'rgba(232,240,232,0.5)'; b.shadowBlur = 5;
  const wet = function (x, y) { if (x < 0 || y < 0 || x >= Wt || y >= Ht) return false; const t = w.terrain[y * Wt + x]; return t === 0 || t === 5; };
  b.beginPath();
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) {
    if (wet(x, y)) continue;
    const ox = x * TP, oy = y * TP, j = function (s) { return (hash(x, y, s) - 0.5) * 6; };
    if (wet(x + 1, y)) { b.moveTo(ox + TP + j(31), oy); b.quadraticCurveTo(ox + TP + j(32) + 3, oy + TP / 2, ox + TP + j(33), oy + TP); }
    if (wet(x - 1, y)) { b.moveTo(ox + j(34), oy); b.quadraticCurveTo(ox + j(35) - 3, oy + TP / 2, ox + j(36), oy + TP); }
    if (wet(x, y + 1)) { b.moveTo(ox, oy + TP + j(37)); b.quadraticCurveTo(ox + TP / 2, oy + TP + j(38) + 3, ox + TP, oy + TP + j(39)); }
    if (wet(x, y - 1)) { b.moveTo(ox, oy + j(40)); b.quadraticCurveTo(ox + TP / 2, oy + j(41) - 3, ox + TP, oy + j(42)); }
  }
  b.stroke(); b.shadowBlur = 0;
  /* detail by ground */
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) {
    const t = w.terrain[y * Wt + x], ox = x * TP, oy = y * TP;
    if (t === 2) {
      for (let k = 0; k < 2; k++) {
        const gx = ox + hash(x, y, 50 + k) * TP, gy = oy + hash(x, y, 60 + k) * TP;
        b.strokeStyle = hash(x, y, 70 + k) < 0.5 ? 'rgba(52,84,44,0.45)' : 'rgba(168,186,112,0.4)'; b.lineWidth = 1.1;
        b.beginPath(); b.moveTo(gx, gy); b.lineTo(gx - 1.5, gy - 4.5); b.moveTo(gx, gy); b.lineTo(gx + 2, gy - 4); b.stroke();
      }
    } else if (t === 1) {
      for (let k = 0; k < 3; k++) { b.fillStyle = 'rgba(120,100,64,0.3)'; b.fillRect(ox + hash(x, y, 80 + k) * TP, oy + hash(x, y, 90 + k) * TP, 1.5, 1.5); }
    } else if (t === 6) {
      for (let k = 0; k < 2; k++) { b.fillStyle = 'rgba(28,50,60,0.5)'; b.beginPath(); b.ellipse(ox + hash(x, y, 130 + k) * TP, oy + hash(x, y, 140 + k) * TP, 4 + hash(x, y, 150 + k) * 4.5, 2.4, hash(x, y, 155 + k) * 3, 0, 6.2832); b.fill(); }
      for (let k = 0; k < 3; k++) { const gx = ox + hash(x, y, 160 + k) * TP, gy = oy + hash(x, y, 170 + k) * TP; b.strokeStyle = 'rgba(150,164,92,0.6)'; b.lineWidth = 1.1; b.beginPath(); b.moveTo(gx, gy); b.lineTo(gx - 1, gy - 6.5); b.moveTo(gx + 2, gy); b.lineTo(gx + 3, gy - 5.5); b.stroke(); }
    } else if (t === 7) {
      for (let k = 0; k < 2; k++) {
        const gx = ox + hash(x, y, 180 + k) * TP, gy = oy + 4 + hash(x, y, 190 + k) * (TP - 8);
        b.strokeStyle = 'rgba(120,84,40,0.38)'; b.lineWidth = 1.6; b.beginPath(); b.moveTo(gx - 9, gy + 1); b.quadraticCurveTo(gx, gy - 4, gx + 9, gy + 1); b.stroke();
        b.strokeStyle = 'rgba(240,214,160,0.4)'; b.lineWidth = 1.2; b.beginPath(); b.moveTo(gx - 9, gy - 0.5); b.quadraticCurveTo(gx, gy - 5.5, gx + 9, gy - 0.5); b.stroke();
      }
    } else if (t === 8) {
      for (let k = 0; k < 2; k++) { const gx = ox + hash(x, y, 200 + k) * TP, gy = oy + hash(x, y, 210 + k) * TP; b.strokeStyle = 'rgba(150,172,196,0.5)'; b.lineWidth = 1.5; b.beginPath(); b.moveTo(gx - 7, gy); b.quadraticCurveTo(gx, gy - 3.5, gx + 7, gy); b.stroke(); }
    } else if (t === 4) {
      for (let k = 0; k < 2; k++) {
        const gx = ox + 5 + hash(x, y, 220 + k) * (TP - 10), gy = oy + 8 + hash(x, y, 230 + k) * (TP - 10), r = 5 + hash(x, y, 240 + k) * 6;
        b.fillStyle = 'rgba(48,46,52,0.75)'; b.beginPath(); b.moveTo(gx, gy - r); b.lineTo(gx + r * 0.95, gy + r * 0.55); b.lineTo(gx - r * 0.2, gy + r * 0.55); b.closePath(); b.fill();
        b.fillStyle = 'rgba(176,170,160,0.85)'; b.beginPath(); b.moveTo(gx, gy - r); b.lineTo(gx - r * 0.2, gy + r * 0.55); b.lineTo(gx - r * 0.95, gy + r * 0.55); b.closePath(); b.fill();
        if (y < Ht * 0.45 || hash(x, y, 250 + k) < 0.25) { b.fillStyle = 'rgba(240,244,248,0.9)'; b.beginPath(); b.moveTo(gx, gy - r); b.lineTo(gx + r * 0.3, gy - r * 0.45); b.lineTo(gx - r * 0.28, gy - r * 0.4); b.closePath(); b.fill(); }
      }
    }
  }
  /* trees last, so crowns overlap their neighbours: broadleaf in the warm south, conifer in the cold north */
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) {
    if (w.terrain[y * Wt + x] !== 3) continue;
    const cold = y / Ht < 0.36 + (hash(x, y, 260) - 0.5) * 0.12;
    for (let k = 0; k < 3; k++) {
      const gx = (x + 0.12 + hash(x, y, 270 + k) * 0.76) * TP, gy = (y + 0.12 + hash(x, y, 280 + k) * 0.76) * TP, r = 5 + hash(x, y, 290 + k) * 4.5;
      b.fillStyle = 'rgba(8,22,16,0.4)'; b.beginPath(); b.ellipse(gx + 2.5, gy + 3.5, r, r * 0.8, 0, 0, 6.2832); b.fill();
      if (cold) {
        b.fillStyle = '#1f3d33'; b.beginPath(); b.moveTo(gx, gy - r * 1.25); b.lineTo(gx + r * 0.9, gy + r * 0.7); b.lineTo(gx - r * 0.9, gy + r * 0.7); b.closePath(); b.fill();
        b.fillStyle = 'rgba(96,140,112,0.5)'; b.beginPath(); b.moveTo(gx, gy - r * 1.25); b.lineTo(gx - r * 0.1, gy + r * 0.7); b.lineTo(gx - r * 0.9, gy + r * 0.7); b.closePath(); b.fill();
      } else {
        b.fillStyle = hash(x, y, 300 + k) < 0.5 ? '#2c4f36' : '#35573a'; b.beginPath(); b.arc(gx, gy, r, 0, 6.2832); b.arc(gx + r * 0.5, gy - r * 0.3, r * 0.7, 0, 6.2832); b.fill();
        b.fillStyle = 'rgba(132,168,104,0.42)'; b.beginPath(); b.arc(gx - r * 0.3, gy - r * 0.35, r * 0.5, 0, 6.2832); b.fill();
      }
    }
  }
  terrainBmp = big;
  /* two veils laid over the land by the season: snow, and the turning of the leaves */
  const mk = function (fn) {
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = shh; const g = cv.getContext('2d'), im = g.createImageData(sw, shh), q = im.data;
    for (let py = 0; py < shh; py++) for (let qx = 0; qx < sw; qx++) {
      const fx = (qx + 0.5) / SS, fy = (py + 0.5) / SS, jx = fx + (vnoise(fx * 1.4, fy * 1.4, 11) - 0.5), jy = fy + (vnoise(fx * 1.4, fy * 1.4, 12) - 0.5);
      const t = w.terrain[clamp(Math.floor(jy), 0, Ht - 1) * Wt + clamp(Math.floor(jx), 0, Wt - 1)], ti = clamp(Math.floor(jy), 0, Ht - 1) * Wt + clamp(Math.floor(jx), 0, Wt - 1), v = t === 9 || (w.regions.length > 1 && SW.climate(w, ti % Wt, Math.floor(ti / Wt)) === 1) ? [0, 0, 0, 0] : fn(t, fx, fy, hash(qx, py, 71)), k = (py * sw + qx) * 4; /* no snow falls and no leaf turns in the warm belt */
      q[k] = v[0]; q[k + 1] = v[1]; q[k + 2] = v[2]; q[k + 3] = v[3];
    }
    g.putImageData(im, 0, 0); return cv;
  };
  snowBmp = mk(function (t, fx, fy, gr) {
    if (t === 0 || t === 5) return [214, 232, 240, t === 5 ? 120 + gr * 50 : 0]; /* shallows and rivers skin with ice; the sea stays open */
    const drift = vnoise(fx * 0.9, fy * 0.9, 73), a = t === 8 ? 0 : t === 3 ? 150 + drift * 60 : t === 7 ? 110 + drift * 70 : 185 + drift * 60;
    return [236 + gr * 12, 241 + gr * 10, 247, Math.min(255, a)];
  });
  leafBmp = mk(function (t, fx, fy, gr) {
    const n = vnoise(fx * 1.7, fy * 1.7, 75);
    if (t === 3) return n < 0.33 ? [196, 92, 38, 150 + gr * 50] : n < 0.66 ? [214, 158, 44, 140 + gr * 50] : [150, 60, 40, 120 + gr * 40];
    if (t === 2 || t === 6) return [196, 170, 96, 70 + n * 60];
    return [0, 0, 0, 0];
  });
}
/* how deep the snow lies and how far the leaves have turned, from the day of the year */
function seasonVeils() {
  const S = w.laws.time.seasonDays * w.laws.time.dayLength, pos = (w.tick % (4 * S)) / S, se = Math.floor(pos), f = pos - se;
  return { snow: se === 3 ? Math.min(1, f * 4) * 0.92 : se === 0 ? (w.tick < S ? 0 : Math.max(0, 1 - f * 3) * 0.92) : se === 2 && f > 0.9 ? (f - 0.9) * 2 : 0, leaf: se === 2 ? Math.min(1, f * 2.5) * 0.85 : se === 3 ? Math.max(0, 1 - f * 5) * 0.85 : 0 };
}

/* ---------- camera ---------- */
function resize() {
  const r = $('stage').getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(200, r.width); H = Math.max(200, r.height);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  lightCv.width = Math.ceil(W / 3); lightCv.height = Math.ceil(H / 3);
  if (w) { cam.fit = Math.min(W / w.W, H / w.H); clampCam(); }
}
/* A world that goes round is seen two ways. Close, it is a flat map that runs on east and west without end. From far enough that all of it would
   fit across the view (cam.z below zGlobe) it is a globe in space, turned by dragging. */
function zGlobe() { return w && w.wrap ? W / w.W : 0; }
function isGlobe() { return !!(w && w.wrap && cam.z < zGlobe() * 0.999); }
function wrapd(d) { if (w && w.wrap) { const Wd = w.W; if (d > Wd / 2) d -= Wd; else if (d < -Wd / 2) d += Wd; } return d; }
function clampCam() {
  if (w.wrap) {
    cam.z = clamp(cam.z, zGlobe() * 0.3, 110); cam.x = ((cam.x % w.W) + w.W) % w.W;
    const hh = H / cam.z / 2, oy = hh * 0.7; cam.y = isGlobe() ? clamp(cam.y, w.H * 0.12, w.H * 0.88) : hh - oy >= w.H - hh + oy ? w.H / 2 : clamp(cam.y, hh - oy, w.H - hh + oy);
    return;
  }
  cam.z = clamp(cam.z, cam.fit * 0.85, 110);
  const hw = W / cam.z / 2, hh = H / cam.z / 2, ox = hw * 0.7, oy = hh * 0.7; /* the view may run past the rim by most of half a screen */
  cam.x = hw - ox >= w.W - hw + ox ? w.W / 2 : clamp(cam.x, hw - ox, w.W - hw + ox);
  cam.y = hh - oy >= w.H - hh + oy ? w.H / 2 : clamp(cam.y, hh - oy, w.H - hh + oy);
}
function sx(tx) { return wrapd(tx + 0.5 - cam.x) * cam.z + W / 2; }
function sy(ty) { return (ty + 0.5 - cam.y) * cam.z + H / 2; }
function toWorld(px, py) { let x = (px - W / 2) / cam.z + cam.x - 0.5; if (w.wrap) x = ((x + 0.5) % w.W + w.W) % w.W - 0.5; return { x: x, y: (py - H / 2) / cam.z + cam.y - 0.5 }; }
function zoomAt(px, py, k) {
  if (w.wrap) { const was = isGlobe(); if (was || cam.z * k < zGlobe()) { cam.z = cam.z * k; clampCam(); if (was && !isGlobe()) cam.z = Math.max(cam.z, zGlobe() * 1.02); return; } } /* to and from the globe, the middle of the view stays put */
  const before = toWorld(px, py); cam.z = clamp(cam.z * k, w.wrap ? zGlobe() * 0.3 : cam.fit * 0.85, 110);
  const after = toWorld(px, py); cam.x += wrapd(before.x - after.x); cam.y += before.y - after.y; clampCam();
}
function fitWorld() { if (w.wrap) { cam.z = zGlobe() * 0.62; cam.y = w.H / 2; clampCam(); } else { cam.z = cam.fit; cam.x = w.W / 2; cam.y = w.H / 2; } U.follow = false; syncButtons(); }
function frac() { return U.playing ? Math.min(1, U.acc) : 1; }
function ex(e) { const f = frac(); return e.px + wrapd(e.x - e.px) * f; }
function ey(e) { const f = frac(); return e.py + (e.y - e.py) * f; }
function agentOf(id) { return SWM.agentById(w, id); }
function nightLevel() {
  const p = SW.dayPhase(w), n0 = 1 - w.laws.time.nightFraction, fade = 0.07;
  if (p >= n0) return Math.min(1, (p - n0) / fade);
  if (p < fade) return 1 - p / fade;
  return 0;
}

/* ---------- drawing the world ---------- */
const bandCache = {};
function refreshBands() {
  for (const k in bandCache) delete bandCache[k];
  const roots = {};
  w.agents.forEach(function (a) { const r = SW.rootOf(w, a); (roots[r.id] = roots[r.id] || { root: r, members: [] }).members.push(a); });
  for (const id in roots) { const b = roots[id]; if (b.members.length < 2) continue; const color = SW.hslToHex(b.root.hue, 0.85, 0.6), name = b.root.bandName || b.root.name + "'s band"; b.members.forEach(function (a) { bandCache[a.id] = { color: color, leader: b.root.id, name: name, size: b.members.length }; }); }
}
/* ---------- the world from far off: a globe among the stars ---------- */
const SPACE = { stars: null, cv: null, gc: null, tex: null, tw: 0, th: 0, texAt: -99, texOf: null, row: null, lon: null, shade: null, edge: null, tilt: 99, out: null, last: 0 };
const GLOBE_PX = 220; /* the globe is painted at this radius and laid at whatever size the view asks */
function globeR() { return Math.min(W, H) * 0.5 * clamp(0.4 + 0.52 * (cam.z / zGlobe() - 0.3) / 0.7, 0.4, 0.92); }
function spaceTexture() { /* the whole world as one small picture, with the season lying on it */
  const tw = w.W * 2, th = w.H * 2; if (!SPACE.cv) SPACE.cv = document.createElement('canvas'); const cv2 = SPACE.cv; if (cv2.width !== tw || cv2.height !== th) { cv2.width = tw; cv2.height = th; }
  const g = cv2.getContext('2d', { willReadFrequently: true }); g.globalAlpha = 1; g.clearRect(0, 0, tw, th); g.drawImage(terrainBmp, 0, 0, tw, th);
  const sv = seasonVeils(); if (sv.leaf > 0.02 && leafBmp) { g.globalAlpha = sv.leaf; g.drawImage(leafBmp, 0, 0, tw, th); } if (sv.snow > 0.02 && snowBmp) { g.globalAlpha = sv.snow; g.drawImage(snowBmp, 0, 0, tw, th); } g.globalAlpha = 1;
  SPACE.tex = g.getImageData(0, 0, tw, th).data; SPACE.tw = tw; SPACE.th = th; SPACE.texAt = U.time; SPACE.texOf = terrainBmp;
  if (!SPACE.mask || SPACE.mask.length !== tw * th) SPACE.mask = new Uint8Array(tw * th); /* where the world is still unknown */
  for (let y = 0; y < th; y++) { const ro = (y >> 1) * w.W; for (let x = 0; x < tw; x++) SPACE.mask[y * tw + x] = w.terrain[ro + (x >> 1)] === 9 ? 1 : 0; }
}
function spaceTables(tilt) { /* for each point of the painted disc: which row of the world it shows, and how far east of the middle */
  const R = GLOBE_PX, D = 2 * R, n = D * D, ct = Math.cos(tilt), stl = Math.sin(tilt);
  if (!SPACE.row) { SPACE.row = new Int16Array(n); SPACE.lon = new Float32Array(n); SPACE.shade = new Float32Array(n); SPACE.edge = new Uint8Array(n); }
  for (let py = 0; py < D; py++) for (let px = 0; px < D; px++) {
    const k = py * D + px, x = (px + 0.5 - R) / R, y = (py + 0.5 - R) / R, r2 = x * x + y * y;
    if (r2 >= 1) { SPACE.row[k] = -1; continue; }
    const z = Math.sqrt(1 - r2), up = -y, yw = up * ct + z * stl, zw = -up * stl + z * ct;
    SPACE.row[k] = Math.min(SPACE.th - 1, Math.max(0, Math.floor((0.5 - Math.asin(clamp(yw, -1, 1)) / 3.14159265) * SPACE.th)));
    SPACE.lon[k] = Math.atan2(x, zw) / 6.2831853; SPACE.shade[k] = 0.3 + 0.7 * Math.pow(z, 0.55); SPACE.edge[k] = Math.round(255 * clamp((1 - Math.sqrt(r2)) * R, 0, 1));
  }
  SPACE.tilt = tilt;
}
function drawSpace(alpha) {
  const c = cx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = alpha; c.fillStyle = '#02030a'; c.fillRect(0, 0, W, H);
  /* the stars */
  if (!SPACE.stars) { SPACE.stars = []; let sd = 20261122; const r = function () { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }; for (let i = 0; i < 520; i++) SPACE.stars.push({ x: r(), y: r(), m: r(), p: r() * 6.28, h: r() }); }
  for (let i = 0; i < SPACE.stars.length; i++) { const q = SPACE.stars[i], tw = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin(U.time * (0.5 + q.m) + q.p), sz = q.m > 0.95 ? 2 : q.m > 0.72 ? 1.4 : 0.9; c.globalAlpha = alpha * (0.2 + 0.8 * q.m * q.m) * tw; c.fillStyle = q.h < 0.14 ? '#ffd9b0' : q.h > 0.86 ? '#bcd4ff' : '#ffffff'; c.fillRect(q.x * W, q.y * H, sz, sz); }
  c.globalAlpha = alpha;
  /* the sun by day and the moon by night, far off, rising on one side and setting on the other as the world's own day goes */
  const ph = SW.dayPhase(w), n0 = 1 - w.laws.time.nightFraction, day = ph < n0, t = day ? ph / n0 : (ph - n0) / (1 - n0), bx = day ? W * (0.04 + 0.1 * t) : W * (0.96 - 0.1 * t), by = H * (0.62 - 0.44 * Math.sin(3.14159 * t)), vis = Math.pow(Math.sin(3.14159 * t), 0.4); /* the sun climbs and sinks on one side of the world, the moon on the other */
  if (day) {
    const g1 = c.createRadialGradient(bx, by, 0, bx, by, 90); g1.addColorStop(0, 'rgba(255,244,200,' + 0.95 * vis + ')'); g1.addColorStop(0.12, 'rgba(255,225,140,' + 0.55 * vis + ')'); g1.addColorStop(0.4, 'rgba(255,190,90,' + 0.12 * vis + ')'); g1.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = g1; c.beginPath(); c.arc(bx, by, 90, 0, 6.2832); c.fill(); c.fillStyle = 'rgba(255,250,226,' + vis + ')'; c.beginPath(); c.arc(bx, by, 11, 0, 6.2832); c.fill();
  } else {
    const g2 = c.createRadialGradient(bx, by, 0, bx, by, 46); g2.addColorStop(0, 'rgba(210,222,245,' + 0.4 * vis + ')'); g2.addColorStop(1, 'rgba(180,200,240,0)'); c.fillStyle = g2; c.beginPath(); c.arc(bx, by, 46, 0, 6.2832); c.fill();
    const mp = ((SW.day(w) % 12) / 12) * 2 - 1; /* the moon waxes and wanes over twelve days */
    c.save(); c.beginPath(); c.arc(bx, by, 10, 0, 6.2832); c.clip(); c.fillStyle = 'rgba(226,232,244,' + vis + ')'; c.fillRect(bx - 11, by - 11, 22, 22); c.fillStyle = 'rgba(8,10,22,' + 0.92 * vis + ')'; c.beginPath(); c.arc(bx + mp * 16, by, 11.5, 0, 6.2832); c.fill(); c.restore();
  }
  /* the globe */
  if (!SPACE.tex || SPACE.texOf !== terrainBmp || U.time - SPACE.texAt > 3) spaceTexture();
  const R = GLOBE_PX, D = 2 * R, tilt = (0.5 - cam.y / w.H) * 3.14159265 * 0.9; if (!SPACE.row || Math.abs(tilt - SPACE.tilt) > 0.003) spaceTables(tilt);
  if (!SPACE.gc) { SPACE.gc = document.createElement('canvas'); SPACE.gc.width = D; SPACE.gc.height = D; SPACE.out = SPACE.gc.getContext('2d').createImageData(D, D); }
  const out = SPACE.out.data, tex = SPACE.tex, mask = SPACE.mask, tw = SPACE.tw, row = SPACE.row, lon = SPACE.lon, shd = SPACE.shade, edg = SPACE.edge, u0 = cam.x / w.W + 8, night = nightLevel(), lit = 1 - 0.6 * night, nb = 1 + 0.25 * night;
  for (let k = 0, n = D * D; k < n; k++) {
    const o = k * 4, rw = row[k]; if (rw < 0) { out[o + 3] = 0; continue; }
    let u = u0 + lon[k]; u -= Math.floor(u); const ti = (rw * tw + Math.min(tw - 1, Math.floor(u * tw))) * 4, sh = shd[k] * lit;
    if (mask[ti >> 2]) { out[o] = (tex[ti] * 1.5 + 78) * sh; out[o + 1] = (tex[ti + 1] * 1.5 + 84) * sh; out[o + 2] = Math.min(255, (tex[ti + 2] * 1.5 + 100) * sh * nb); } /* the unknown lies under cloud */
    else { out[o] = tex[ti] * sh; out[o + 1] = tex[ti + 1] * sh; out[o + 2] = Math.min(255, tex[ti + 2] * sh * nb); }
    out[o + 3] = edg[k];
  }
  SPACE.gc.getContext('2d').putImageData(SPACE.out, 0, 0);
  const Rg = globeR(), gx = W / 2, gy = H / 2 + 6;
  const halo = c.createRadialGradient(gx, gy, Rg * 0.96, gx, gy, Rg * 1.16); halo.addColorStop(0, 'rgba(120,175,255,' + (0.42 - 0.2 * night) + ')'); halo.addColorStop(1, 'rgba(90,140,255,0)'); c.fillStyle = halo; c.beginPath(); c.arc(gx, gy, Rg * 1.16, 0, 6.2832); c.fill();
  c.imageSmoothingEnabled = true; c.drawImage(SPACE.gc, gx - Rg, gy - Rg, Rg * 2, Rg * 2);
  /* the living, and their fires at night */
  const ct = Math.cos(tilt), stl = Math.sin(tilt), l0 = cam.x / w.W * 6.2831853, spot = function (tx, ty) { const lo = (tx + 0.5) / w.W * 6.2831853 - l0, la = (0.5 - (ty + 0.5) / w.H) * 3.14159265, xw = Math.cos(la) * Math.sin(lo), yw = Math.sin(la), zw = Math.cos(la) * Math.cos(lo), up = yw * ct - zw * stl, zv = yw * stl + zw * ct; return zv > 0.05 ? { x: gx + xw * Rg, y: gy - up * Rg, z: zv } : null; };
  if (night > 0.3) { c.fillStyle = 'rgba(255,190,90,' + 0.85 * night + ')'; for (let i = 0; i < w.fires.length; i++) if (w.fires[i] > w.tick) { const q = spot(i % w.W, Math.floor(i / w.W)); if (q) { c.beginPath(); c.arc(q.x, q.y, 1.6, 0, 6.2832); c.fill(); } } }
  for (let i = 0; i < w.agents.length; i++) { const a = w.agents[i], q = spot(a.x, a.y); if (!q) continue; c.fillStyle = SW.hslToHex(a.hue, 0.85, 0.66); c.beginPath(); c.arc(q.x, q.y, 2.3, 0, 6.2832); c.fill(); }
  /* its name */
  c.textAlign = 'center'; c.fillStyle = 'rgba(232,236,244,' + 0.9 * alpha + ')'; c.font = '600 ' + Math.round(clamp(Rg * 0.085, 14, 26)) + 'px "Bricolage Grotesque", sans-serif'; c.fillText(w.name || 'Evolu', gx, Math.min(H - 64, gy + Rg + 34));
  c.fillStyle = 'rgba(160,170,190,' + 0.8 * alpha + ')'; c.font = '13px Inter, sans-serif'; c.fillText('day ' + SW.day(w) + ' · ' + w.agents.length + ' living · drag to turn it, scroll in to come down', gx, Math.min(H - 44, gy + Rg + 54)); c.textAlign = 'left';
  c.globalAlpha = 1;
}
function draw() {
  if (w.wrap) {
    const far = isGlobe(), tg = far ? 1 : 0, now = U.time, dt = Math.min(0.1, now - (SPACE.last || now)); SPACE.last = now;
    U.globeT = (U.globeT || 0) + (tg - (U.globeT || 0)) * 0.2; if (Math.abs(tg - U.globeT) < 0.02) U.globeT = tg;
    if (far && !ptr.down && !reduceMotion && now > (U.spinAt || 0)) cam.x = (cam.x + dt * 1.2) % w.W; /* left alone, it turns: once round in three minutes */
    if (U.globeT < 1) drawFlat();
    if (U.globeT > 0) drawSpace(U.globeT);
    return;
  }
  drawFlat();
}
function drawFlat() {
  const c = cx, z = cam.z;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = w.veil ? '#20232f' : '#05080b'; c.fillRect(0, 0, W, H); /* past the rim of a world with an unknown, more mist */
  c.imageSmoothingEnabled = true;
  const mapX = (-cam.x) * z + W / 2, mapW = w.W * z, lay = function (bmp) { c.drawImage(bmp, mapX, sy(-0.5), mapW, w.H * z); if (w.wrap) { if (mapX > 0) c.drawImage(bmp, mapX - mapW, sy(-0.5), mapW, w.H * z); if (mapX + mapW < W) c.drawImage(bmp, mapX + mapW, sy(-0.5), mapW, w.H * z); } };
  lay(terrainBmp);
  { const sv = seasonVeils(); c.imageSmoothingEnabled = true;
    if (sv.leaf > 0.02 && leafBmp) { c.globalAlpha = sv.leaf; lay(leafBmp); }
    if (sv.snow > 0.02 && snowBmp) { c.globalAlpha = sv.snow; lay(snowBmp); }
    c.globalAlpha = 1; }
  let x0 = Math.floor((0 - W / 2) / z + cam.x - 0.5) - 1, x1 = Math.ceil((W - W / 2) / z + cam.x - 0.5) + 1;
  if (w.wrap && (x0 < 0 || x1 > w.W - 1)) { x0 = 0; x1 = w.W - 1; } /* the view lies across the line where east meets west: every column is asked, and each is drawn where it falls */
  x0 = Math.max(0, x0); x1 = Math.min(w.W - 1, x1);
  const y0 = Math.max(0, Math.floor(toWorld(0, 0).y) - 1), y1 = Math.min(w.H - 1, Math.ceil(toWorld(0, H).y) + 1);
  const season = SW.season(w), L = w.laws;

  /* water shimmer */
  if (z >= 9 && !reduceMotion) {
    c.strokeStyle = 'rgba(200,228,240,0.16)'; c.lineWidth = Math.max(1, z * 0.04); c.lineCap = 'round'; c.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const tw = w.terrain[y * w.W + x]; if (tw !== 0 && tw !== 5) continue;
      const ph = hash(x, y, 5) * 6.28, dx = Math.sin(U.time * 0.9 + ph) * 0.12, px = sx(x + (hash(x, y, 6) - 0.5) * 0.5 + dx), py = sy(y + (hash(x, y, 7) - 0.5) * 0.5);
      c.moveTo(px - z * 0.16, py); c.quadraticCurveTo(px, py - z * 0.07, px + z * 0.16, py);
    }
    c.stroke();
  }
  /* things on the ground */
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w.W + x;
    if (w.terrain[i] === 3 && w.trees[i] < 3 && z > 5) { /* where trees were felled: bare earth and stumps */
      const gone = 3 - w.trees[i], px = sx(x), py = sy(y);
      c.fillStyle = 'rgba(104,88,62,' + (0.3 + 0.2 * gone) + ')'; c.beginPath(); c.ellipse(px, py, z * (0.3 + 0.09 * gone), z * (0.26 + 0.08 * gone), hash(x, y, 430) * 3, 0, 6.2832); c.fill();
      if (z > 11) for (let k = 0; k < gone; k++) { const gx = px + (hash(x, y, 440 + k) - 0.5) * z * 0.6, gy = py + (hash(x, y, 450 + k) - 0.5) * z * 0.5, r = z * 0.07; c.fillStyle = '#4a3826'; c.beginPath(); c.ellipse(gx, gy + r * 0.5, r, r * 0.7, 0, 0, 6.2832); c.fill(); c.fillStyle = '#b89a6a'; c.beginPath(); c.ellipse(gx, gy, r, r * 0.6, 0, 0, 6.2832); c.fill(); }
    }
    if (w.roads && w.roads[i] === 2) { c.fillStyle = '#7a5a36'; c.fillRect(sx(x) - z * 0.5, sy(y) - z * 0.3, z, z * 0.6); c.strokeStyle = '#3f2c1a'; c.lineWidth = Math.max(1, z * 0.03); for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(sx(x) + k * z * 0.28, sy(y) - z * 0.3); c.lineTo(sx(x) + k * z * 0.28, sy(y) + z * 0.3); c.stroke(); } c.strokeRect(sx(x) - z * 0.5, sy(y) - z * 0.3, z, z * 0.6); }
    else if (w.roads && w.roads[i]) { c.fillStyle = 'rgba(170,162,150,0.9)'; c.fillRect(sx(x) - z * 0.5, sy(y) - z * 0.28, z, z * 0.56); if (z > 12) { c.strokeStyle = 'rgba(96,90,82,0.7)'; c.lineWidth = 1; c.strokeRect(sx(x) - z * 0.5, sy(y) - z * 0.28, z * 0.5, z * 0.56); c.strokeRect(sx(x), sy(y) - z * 0.28, z * 0.5, z * 0.28); } }
    if (w.lodes && w.lodes[i] && z > 5.5) {
      const hu = (L.minerals[w.lodes[i].k] || {}).hue || 0, kq = w.lodes[i].k, grey = kq === 'coal' || kq === 'obsidian' || kq === 'peat';
      for (let k = 0; k < 5; k++) { const gx = sx(x) + (hash(x, y, 470 + k) - 0.5) * z * 0.7, gy = sy(y) + (hash(x, y, 480 + k) - 0.5) * z * 0.55, r = z * (0.07 + 0.05 * hash(x, y, 490 + k)); c.fillStyle = grey ? (k % 2 ? '#1c1a22' : '#3a3644') : 'hsl(' + hu + ',' + (kq === 'salt' ? 12 : 68) + '%,' + (k === 0 ? 84 : k % 2 ? 62 : 48) + '%)'; c.beginPath(); c.moveTo(gx, gy - r); c.lineTo(gx + r * 0.8, gy); c.lineTo(gx, gy + r * 0.7); c.lineTo(gx - r * 0.8, gy); c.closePath(); c.fill(); }
      if (z > 16 && Math.sin(U.time * 2 + i) > 0.92) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(sx(x) - 1, sy(y) - z * 0.2, 2, 2); }
    }
    if (w.works && w.works[i]) {
      const W0 = w.works[i], B = L.buildings[W0.kind] || {}, need = (B.wood || 0) + (B.stone || 0), frac = need ? (W0.wood + W0.stone) / need : 0, px = sx(x), py = sy(y);
      c.strokeStyle = '#8a6a3c'; c.lineWidth = Math.max(1, z * 0.05); c.beginPath(); c.moveTo(px - z * 0.4, py + z * 0.4); c.lineTo(px - z * 0.4, py - z * 0.5); c.lineTo(px + z * 0.4, py - z * 0.5); c.lineTo(px + z * 0.4, py + z * 0.4); c.moveTo(px - z * 0.4, py - z * 0.05); c.lineTo(px + z * 0.4, py - z * 0.05); c.moveTo(px - z * 0.4, py + z * 0.4); c.lineTo(px + z * 0.4, py - z * 0.5); c.stroke();
      c.fillStyle = '#9a958c'; c.fillRect(px - z * 0.36, py + z * 0.4 - z * 0.8 * frac, z * 0.72, z * 0.8 * frac * 0.999); c.fillStyle = 'rgba(242,184,75,0.95)'; c.fillRect(px - z * 0.4, py + z * 0.5, z * 0.8 * frac, Math.max(2, z * 0.07));
    }
    if (w.ore[i] && z > 9) {
      for (let k = 0; k < 3; k++) {
        const gx = sx(x) + (hash(x, y, 400 + k) - 0.5) * z * 0.62, gy = sy(y) + (hash(x, y, 410 + k) - 0.5) * z * 0.5, r = z * (0.05 + 0.03 * hash(x, y, 420 + k));
        c.fillStyle = k === 0 ? '#f0b070' : '#c9753c'; c.beginPath(); c.moveTo(gx, gy - r); c.lineTo(gx + r, gy); c.lineTo(gx, gy + r); c.lineTo(gx - r, gy); c.closePath(); c.fill();
      }
    }
    if (w.fires[i] > w.tick) drawLook(c, DEFAULT_FIRE, sx(x), sy(y), z * (0.8 + 0.25 * Math.min(1, (w.fires[i] - w.tick) / 200)), { phase: i * 1.7 });
    if (w.stores[i]) drawLook(c, w.looks[i] || structLook('store', w.stores[i].by, i), sx(x), sy(y), z * 1.1, { phase: i });
    if (w.shelters[i]) drawLook(c, w.looks[i] || structLook('shelter', w.shelters[i], i), sx(x), sy(y), z * (w.bkind && w.bkind[i] ? 1.45 : 1.15), { phase: i });
    else if (w.walls[i]) drawLook(c, w.looks[i] || structLook('wall', w.walls[i], i), sx(x), sy(y), z * 1.05, { phase: i });
    const p = w.plants[i];
    if (p) {
      const sp = L.plants[p.sp]; if (!sp) continue;
      if (z < 7.5) { const q0 = sp.look.shapes[0]; c.fillStyle = q0.fill || q0.stroke; c.fillRect(sx(x) - z * 0.22, sy(y) - z * 0.22, z * 0.44, z * 0.44); continue; }
      if (p.t) { c.fillStyle = 'rgba(74,50,30,0.78)'; c.fillRect(sx(x) - z * 0.46, sy(y) - z * 0.1, z * 0.92, z * 0.52); c.strokeStyle = 'rgba(38,24,14,0.85)'; c.lineWidth = Math.max(1, z * 0.035); for (let fr = 0; fr < 3; fr++) { c.beginPath(); c.moveTo(sx(x) - z * 0.44, sy(y) + z * (0.02 + fr * 0.15)); c.lineTo(sx(x) + z * 0.44, sy(y) + z * (0.02 + fr * 0.15)); c.stroke(); } }
      if (p.g < 1) c.globalAlpha = 0.85;
      drawLook(c, sp.look, sx(x), sy(y), z * (0.4 + 0.6 * Math.min(1, p.g)) * (season === 3 ? 0.92 : 1), { food: p.food, phase: i * 0.37 });
      c.globalAlpha = 1;
    }
  }
  /* workings: places where a law of the world has been bent */
  for (let k = 0; k < w.fields.length; k++) {
    const f = w.fields[k], px = sx(f.x), py = sy(f.y), R = (f.r + 0.5) * z, col = fieldColor(f), left = (f.until - w.tick) / L.magic.duration;
    const g = c.createRadialGradient(px, py, R * 0.1, px, py, R);
    g.addColorStop(0, col + '10'); g.addColorStop(0.75, col + '2c'); g.addColorStop(1, col + '00');
    c.fillStyle = g; c.beginPath(); c.arc(px, py, R, 0, 6.2832); c.fill();
    c.save(); c.translate(px, py); if (!reduceMotion) c.rotate(U.time * 0.25 * (k % 2 ? -1 : 1));
    c.strokeStyle = col; c.globalAlpha = 0.35 + 0.45 * clamp(left, 0, 1); c.lineWidth = Math.max(1.5, z * 0.07); c.setLineDash([z * 0.5, z * 0.35]);
    c.beginPath(); c.arc(0, 0, R * (0.96 - 0.06 * (k % 3)), 0, 6.2832); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; c.restore();
    if (z >= 13 && f.name) { c.font = 'italic 500 ' + Math.round(clamp(z * 0.42, 11, 15)) + 'px "Instrument Sans", sans-serif'; c.textAlign = 'center'; c.fillStyle = col; c.globalAlpha = 0.9; c.fillText(f.name, px, py - R - 4); c.globalAlpha = 1; }
  }
  /* the ground a band has made its own */
  for (let k = 0; k < w.settlements.length; k++) {
    const stl = w.settlements[k], root = agentOf(stl.root), col = SW.hslToHex(root ? root.hue : 40, 0.85, 0.6), px = sx(stl.x), py = sy(stl.y), R = (stl.r + 0.5) * z;
    if (px < -R || py < -R || px > W + R || py > H + R) continue;
    const g = c.createRadialGradient(px, py, R * 0.5, px, py, R); g.addColorStop(0, col + '00'); g.addColorStop(1, col + '22');
    c.fillStyle = g; c.beginPath(); c.arc(px, py, R, 0, 6.2832); c.fill();
    c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = Math.max(1.2, z * 0.05); c.setLineDash([z * 0.3, z * 0.3]); c.beginPath(); c.arc(px, py, R, 0, 6.2832); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  }
  for (const dk in w.devices) {
    const dv = w.devices[dk], law = L.tools[dv.k], px = sx(dv.x), py = sy(dv.y); if (!law || px < -z || py < -z || px > W + z || py > H + z) continue;
    drawLook(c, toolLook(law), px, py, z * 1.05, { phase: dv.x });
    if (dv.barred) { c.strokeStyle = 'rgba(255,90,72,0.9)'; c.lineWidth = Math.max(1.5, z * 0.08); c.beginPath(); c.moveTo(px - z * 0.42, py + z * 0.42); c.lineTo(px + z * 0.42, py - z * 0.42); c.moveTo(px - z * 0.42, py - z * 0.42); c.lineTo(px + z * 0.42, py + z * 0.42); c.stroke(); }
    if (dv.hold.length) { c.fillStyle = '#c96a4a'; for (let i = 0; i < dv.hold.length; i++) { c.beginPath(); c.arc(px - z * 0.3 + i * z * 0.12, py + z * 0.42, Math.max(1.5, z * 0.05), 0, 6.2832); c.fill(); } }
  }
  for (let k = 0; k < w.marks.length; k++) { const m = w.marks[k]; drawLook(c, m.look || defaultEmblem(m.hue), sx(m.x), sy(m.y), z * 0.95, { phase: k }); }
  for (let k = 0; k < w.graves.length; k++) {
    const g = w.graves[k], age = w.tick - g.tick; if (age > 2400) continue;
    c.globalAlpha = 1 - age / 2400; drawLook(c, GRAVE, sx(g.x), sy(g.y), z * 0.8); c.globalAlpha = 1;
  }
  /* the living, back to front */
  const list = [];
  for (let k = 0; k < w.creatures.length; k++) list.push(w.creatures[k]);
  for (let k = 0; k < w.agents.length; k++) list.push(w.agents[k]);
  list.sort(function (p, q) { return ey(p) - ey(q); });
  for (let k = 0; k < list.length; k++) {
    const e = list[k], px = sx(ex(e)), py = sy(ey(e));
    if (px < -z * 2 || py < -z * 2 || px > W + z * 2 || py > H + z * 2) continue;
    const moving = e.px !== e.x || e.py !== e.y;
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath();
    if (e.policy) {
      c.ellipse(px + z * 0.07, py + z * 0.38, z * 0.3, z * 0.1, 0, 0, 6.2832); c.fill();
      const tm = topMood(e);
      if (tm) {
        const pulse = tm === 'anger' && !reduceMotion ? 0.75 + 0.25 * Math.sin(U.time * 9 + e.id) : 1, g = c.createRadialGradient(px, py, 0, px, py, z * 1.05);
        const al = Math.round(clamp(e.mood[tm] * 0.6 * pulse, 0, 0.6) * 255).toString(16); g.addColorStop(0, MOOD_COLOR[tm] + (al.length < 2 ? '0' + al : al)); g.addColorStop(1, MOOD_COLOR[tm] + '00');
        c.fillStyle = g; c.beginPath(); c.arc(px, py, z * 1.05, 0, 6.2832); c.fill();
      }
      const band = bandCache[e.id];
      if (band) { c.strokeStyle = band.color; c.lineWidth = Math.max(1.5, z * 0.06); c.beginPath(); c.ellipse(px, py + z * 0.34, z * 0.4, z * 0.16, 0, 0, 6.2832); c.stroke(); }
      if (U.sel && U.sel.t === 'agent' && U.sel.id === e.id) {
        c.strokeStyle = 'rgba(242,184,75,0.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py + z * 0.3, z * 0.52, z * 0.24, 0, 0, 6.2832); c.stroke();
        c.setLineDash([5, 7]); c.strokeStyle = 'rgba(242,184,75,0.28)'; c.lineWidth = 1.2; c.beginPath(); c.arc(px, py, (L.body.sight + 0.5) * z, 0, 6.2832); c.stroke(); c.setLineDash([]);
      }
      const stg = SW.stage(w, e), bs = stg === 'child' ? 0.68 : 1;
      if (stg === 'elder') { c.strokeStyle = '#8a7654'; c.lineWidth = Math.max(1, z * 0.05); c.lineCap = 'round'; c.beginPath(); c.moveTo(px + z * 0.36 * (e.f < 0 ? -1 : 1), py + z * 0.44); c.lineTo(px + z * 0.31 * (e.f < 0 ? -1 : 1), py - z * 0.5); c.stroke(); }
      { const tt = w.terrain[e.y * w.W + e.x]; if ((tt === 0 || tt === 5) && e.things) { const fl = SW.floatOf(w, e); if (fl > 0) { c.fillStyle = fl > 2 ? '#8a6a3c' : '#6b4a2a'; c.beginPath(); c.ellipse(px, py + z * 0.42, z * (fl > 2 ? 0.5 : fl <= 0.6 ? 0.8 : 0.6), z * 0.16, 0, 0, 6.2832); c.fill(); if (fl <= 0.6) { c.strokeStyle = '#3f2c1a'; c.lineWidth = Math.max(1, z * 0.04); c.beginPath(); c.moveTo(px + z * 0.3, py + z * 0.36); c.lineTo(px + z * 0.3, py - z * 0.9); c.stroke(); c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(px + z * 0.32, py - z * 0.86); c.lineTo(px + z * 0.78, py - z * 0.1); c.lineTo(px + z * 0.32, py - z * 0.1); c.closePath(); c.fill(); } } } }
      drawLook(c, e.look, px, py - z * 0.1 + (1 - bs * (e.tall || 1)) * z * 0.42, z * 1.45 * bs * (e.tall || 1), { flip: e.f < 0, moving: moving, phase: e.id });
      if (e.sick > 0) { c.fillStyle = 'rgba(166,220,90,0.9)'; for (let k = 0; k < 3; k++) { const an = U.time * 1.6 + k * 2.094; c.beginPath(); c.arc(px + Math.cos(an) * z * 0.36, py - z * 0.2 + Math.sin(an) * z * 0.24, Math.max(1.2, z * 0.04), 0, 6.2832); c.fill(); } }
      if (band && band.leader === e.id) { /* a leader wears its band's colour as a crown */
        const cy = py - z * 0.86, cw = z * 0.2; c.fillStyle = band.color; c.beginPath();
        c.moveTo(px - cw, cy + cw * 0.5); c.lineTo(px - cw, cy - cw * 0.4); c.lineTo(px - cw * 0.5, cy); c.lineTo(px, cy - cw * 0.7); c.lineTo(px + cw * 0.5, cy); c.lineTo(px + cw, cy - cw * 0.4); c.lineTo(px + cw, cy + cw * 0.5); c.closePath(); c.fill();
      }
      if (e.arts && e.arts.length) { /* those who can work the world carry sparks */
        for (let i = 0; i < e.arts.length; i++) {
          const an = U.time * 1.6 + i * 6.2832 / e.arts.length + e.id, qx = px + Math.cos(an) * z * 0.62, qy = py - z * 0.1 + Math.sin(an) * z * 0.3;
          c.fillStyle = fieldColor({ law: e.arts[i], factor: e.arts[i] === 'cold' ? 0.5 : 2 }); c.beginPath(); c.arc(qx, qy, Math.max(1.6, z * 0.07), 0, 6.2832); c.fill();
        }
      }
    } else {
      const s = L.creatures[e.sp]; if (!s) continue;
      c.ellipse(px + z * 0.06, py + z * 0.24, z * 0.26 * e.size, z * 0.075, 0, 0, 6.2832); c.fill();
      if (U.sel && U.sel.t === 'creature' && U.sel.id === e.id) { c.strokeStyle = 'rgba(242,184,75,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, z * 0.5, 0, 6.2832); c.stroke(); }
      if (e.owner != null) { const bd0 = bandCache[e.keeper]; c.strokeStyle = bd0 ? bd0.color : '#f2b84b'; c.lineWidth = Math.max(1, z * 0.04); c.beginPath(); c.ellipse(px, py + z * 0.24, z * 0.3 * e.size, z * 0.1, 0, 0, 6.2832); c.stroke(); }
      drawLook(c, s.look, px, py, z * e.size * 1.1, { flip: e.f < 0, moving: moving, phase: e.id });
    }
  }
  /* places of power glow where they stand */
  if (w.volcano && z >= 7.5) { const vx = sx(w.volcano.x), vy = sy(w.volcano.y), g = c.createRadialGradient(vx, vy, 0, vx, vy, z * 1.6); g.addColorStop(0, 'rgba(255,90,30,' + (0.4 + 0.15 * Math.sin(U.time * 2.4)) + ')'); g.addColorStop(1, 'rgba(255,90,30,0)'); c.fillStyle = g; c.fillRect(vx - z * 1.6, vy - z * 1.6, z * 3.2, z * 3.2); c.fillStyle = '#3a2a26'; c.beginPath(); c.moveTo(vx - z * 0.5, vy + z * 0.4); c.lineTo(vx - z * 0.14, vy - z * 0.4); c.lineTo(vx + z * 0.14, vy - z * 0.4); c.lineTo(vx + z * 0.5, vy + z * 0.4); c.closePath(); c.fill(); c.fillStyle = '#ff7a2a'; c.fillRect(vx - z * 0.12, vy - z * 0.44, z * 0.24, z * 0.08); }
  (w.sites || []).forEach(function (q) {
    const px = sx(q.x), py = sy(q.y), R = z * (q.r + 0.9); if (px < -R || py < -R || px > W + R || py > H + R) return;
    const pul = 0.55 + 0.45 * Math.sin(U.time * 1.2 + q.id), g = c.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, 'rgba(214,196,255,' + (0.34 * pul) + ')'); g.addColorStop(1, 'rgba(214,196,255,0)'); c.fillStyle = g; c.fillRect(px - R, py - R, 2 * R, 2 * R);
    drawLook(c, SITE_LOOK, px, py, Math.max(z, 9) * 1.1, { phase: q.id });
    if (z >= 20) { c.font = '500 11px "Instrument Sans", sans-serif'; c.textAlign = 'center'; c.lineWidth = 2.6; c.strokeStyle = 'rgba(5,8,11,0.75)'; c.strokeText(q.name, px, py + z * 0.9); c.fillStyle = '#d9c8ff'; c.fillText(q.name, px, py + z * 0.9); }
  });
  /* slow cloud shadows crossing the land by day */
  if (!reduceMotion && z < 60) {
    const dayness = 1 - nightLevel();
    if (dayness > 0.2) for (let i = 0; i < 7; i++) {
      const cxw = ((hash(i, 4, 51) * (w.W + 40) + U.time * (0.35 + 0.2 * hash(i, 5, 51))) % (w.W + 40)) - 20, cyw = hash(i, 6, 51) * w.H, R = (7 + hash(i, 7, 51) * 7) * z;
      const px = sx(cxw), py = sy(cyw); if (px < -R || py < -R || px > W + R || py > H + R) continue;
      const g = c.createRadialGradient(px, py, R * 0.2, px, py, R); g.addColorStop(0, 'rgba(10,18,26,' + (0.17 * dayness) + ')'); g.addColorStop(1, 'rgba(10,18,26,0)');
      c.fillStyle = g; c.fillRect(px - R, py - R * 0.7, 2 * R, 1.4 * R);
    }
  }
  /* the colour of the hour */
  { const ph = SW.dayPhase(w), n0 = 1 - w.laws.time.nightFraction;
    if (ph < 0.12) { c.fillStyle = 'rgba(255,170,130,' + (0.13 * (1 - ph / 0.12)) + ')'; c.fillRect(0, 0, W, H); }
    else if (ph > n0 - 0.14 && ph < n0 + 0.04) { const k = 1 - Math.abs(ph - (n0 - 0.03)) / 0.11; if (k > 0) { c.fillStyle = 'rgba(255,128,56,' + (0.15 * k) + ')'; c.fillRect(0, 0, W, H); } } }
  /* season and night */
  if (season === 3) { c.fillStyle = 'rgba(205,225,255,0.04)'; c.fillRect(0, 0, W, H); }
  else if (season === 2) { c.fillStyle = 'rgba(255,160,50,0.05)'; c.fillRect(0, 0, W, H); }
  const nl = nightLevel();
  if (nl > 0.01) {
    const lc = lightCx, k = 1 / 3;
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, lightCv.width, lightCv.height);
    lc.fillStyle = 'rgba(6,10,38,' + (0.6 * nl) + ')'; lc.fillRect(0, 0, lightCv.width, lightCv.height);
    lc.globalCompositeOperation = 'destination-out';
    const hole = function (px, py, r, a) {
      const g = lc.createRadialGradient(px * k, py * k, 0, px * k, py * k, r * k);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.beginPath(); lc.arc(px * k, py * k, r * k, 0, 6.2832); lc.fill();
    };
    for (let i = 0; i < w.agents.length; i++) { const a = w.agents[i]; hole(sx(ex(a)), sy(ey(a)), z * 2.6, 0.7); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const li = y * w.W + x; if (w.fires[li] > w.tick) hole(sx(x), sy(y), z * 3.6, 0.95); else if (w.shelters[li]) hole(sx(x), sy(y), z * 2.4, 0.8); }
    c.drawImage(lightCv, 0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (w.shelters[y * w.W + x] || w.fires[y * w.W + x] > w.tick) {
      const fr = w.fires[y * w.W + x] > w.tick ? 3.2 : 2, g = c.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), z * fr);
      g.addColorStop(0, 'rgba(255,170,70,' + (0.22 * nl) + ')'); g.addColorStop(1, 'rgba(255,170,70,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx(x), sy(y), z * fr, 0, 6.2832); c.fill();
    }
    if (!reduceMotion && season !== 3) {
      c.fillStyle = 'rgba(230,255,140,' + (0.8 * nl) + ')';
      for (let i = 0; i < 26; i++) {
        const fx = hash(i, 3, 9) * w.W + Math.sin(U.time * 0.4 + i) * 1.2, fy = hash(i, 8, 9) * w.H + Math.cos(U.time * 0.33 + i * 2) * 1.2;
        if (Math.sin(U.time * 1.7 + i * 1.3) > 0.2) { c.beginPath(); c.arc(sx(fx), sy(fy), Math.max(1, z * 0.045), 0, 6.2832); c.fill(); }
      }
    }
    c.globalCompositeOperation = 'source-over';
  }
  /* while a great working holds, the whole sky shows it */
  if (w.edicts.length && !reduceMotion) {
    for (let k = 0; k < w.edicts.length; k++) {
      const g = c.createLinearGradient(0, 0, W, H), ph = U.time * 0.15 + k;
      g.addColorStop(0, 'rgba(229,155,240,' + (0.05 + 0.04 * Math.sin(ph)) + ')'); g.addColorStop(0.5, 'rgba(157,180,255,' + (0.05 + 0.04 * Math.sin(ph + 2)) + ')'); g.addColorStop(1, 'rgba(111,224,138,' + (0.05 + 0.04 * Math.sin(ph + 4)) + ')');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
  }
  const sky = skyHere();
  if (sky === 'storm') { c.fillStyle = 'rgba(8,12,28,0.28)'; c.fillRect(0, 0, W, H); }
  else if (sky === 'drought') { c.fillStyle = 'rgba(255,186,70,0.10)'; c.fillRect(0, 0, W, H); }
  else if (sky === 'heat') { c.fillStyle = 'rgba(255,150,60,' + (0.1 + 0.03 * Math.sin(U.time * 1.3)) + ')'; c.fillRect(0, 0, W, H); }
  else if (sky === 'gale') { c.fillStyle = 'rgba(150,170,190,0.10)'; c.fillRect(0, 0, W, H); if (!reduceMotion) { c.strokeStyle = 'rgba(230,238,245,0.3)'; c.lineWidth = 1.2; for (let k = 0; k < 26; k++) { const gx = ((hash(k, 3, 7) * W + U.time * 520 * (0.6 + hash(k, 5, 9))) % (W + 200)) - 100, gy = hash(k, 1, 2) * H; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 60 + 80 * hash(k, 8, 8), gy + 6); c.stroke(); } } }
  else if (sky === 'fog') {
    c.fillStyle = 'rgba(196,208,214,0.30)'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const fx = ((hash(i, 2, 31) * 1.4 - 0.2) * W + U.time * (6 + i * 2)) % (W * 1.4) - W * 0.2, fy = hash(i, 5, 31) * H, R = Math.max(W, H) * (0.22 + hash(i, 7, 31) * 0.2);
      const g = c.createRadialGradient(fx, fy, 0, fx, fy, R); g.addColorStop(0, 'rgba(225,232,236,0.28)'); g.addColorStop(1, 'rgba(225,232,236,0)');
      c.fillStyle = g; c.fillRect(fx - R, fy - R, 2 * R, 2 * R);
    }
  }
  if ((sky === 'rain' || sky === 'storm') && !reduceMotion) {
    const n = sky === 'storm' ? 190 : 100, sp = sky === 'storm' ? 1500 : 1000;
    c.strokeStyle = sky === 'storm' ? 'rgba(190,210,255,0.5)' : 'rgba(175,205,255,0.38)'; c.lineWidth = 1.3; c.beginPath();
    for (let i = 0; i < n; i++) {
      const px = (hash(i, 1, 41) * (W + 200) + U.time * sp * 0.25) % (W + 200) - 100, py = (hash(i, 2, 41) * H + U.time * sp * (0.7 + 0.5 * hash(i, 3, 41))) % (H + 40) - 20;
      c.moveTo(px, py); c.lineTo(px + 5, py + 17);
    }
    c.stroke();
  }
  if (U.flash > 0) { c.fillStyle = 'rgba(235,240,255,' + Math.min(0.75, U.flash) + ')'; c.fillRect(0, 0, W, H); }
  if (sky === 'snow' && !reduceMotion) {
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 110; i++) { const px = (hash(i, 1, 2) * W + U.time * 14 * (0.5 + hash(i, 2, 2))) % W, py = (hash(i, 3, 2) * H + U.time * 34 * (0.6 + hash(i, 4, 2))) % H; c.fillRect(px, py, 1.6, 1.6); }
  }
  drawFx(c);
  drawLabels(c);
  /* vignette */
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

function addFx(o) { o.t0 = U.time; U.fx.push(o); if (U.fx.length > 140) U.fx.shift(); }
function burst(x, y, color, n) { for (let k = 0; k < (n || 8); k++) { const a = Math.random() * 6.28, v = 0.6 + Math.random() * 1.2; addFx({ type: 'dot', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 0.7 + Math.random() * 0.5, color: color }); } }
/* small things that rise and fade (a rite, a tale, a healing), that glint (ore, a thing made), and rings on water */
function motes(x, y, color, n) { for (let k = 0; k < (n || 6); k++) addFx({ type: 'mote', x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 0.3, vy: 0.5 + Math.random() * 0.7, ph: Math.random() * 6, life: 1.2 + Math.random(), color: color }); }
function sparks(x, y, color, n) { for (let k = 0; k < (n || 3); k++) addFx({ type: 'spark', x: x, y: y, dx: (Math.random() - 0.5) * 1.1, dy: (Math.random() - 0.5) * 1.1, life: 0.5 + Math.random() * 0.6, color: color }); }
function glyph(x, y, text, color, life) { addFx({ type: 'float', x: x, y: y, text: text, life: life || 2, color: color }); }
function drawFx(c) {
  const z = cam.z, keep = [];
  for (let k = 0; k < U.fx.length; k++) {
    const f = U.fx[k], age = U.time - f.t0, p = age / f.life;
    if (p >= 1) continue; keep.push(f);
    c.globalAlpha = 1 - p;
    if (f.type === 'ring') { c.strokeStyle = f.color; c.lineWidth = 2; c.beginPath(); c.arc(sx(f.x), sy(f.y), f.r * z * (0.15 + 0.85 * Math.sqrt(p)), 0, 6.2832); c.stroke(); }
    else if (f.type === 'slash') { c.strokeStyle = f.color; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx(f.x), sy(f.y)); c.lineTo(sx(f.x2), sy(f.y2)); c.stroke(); }
    else if (f.type === 'dot') { c.fillStyle = f.color; c.beginPath(); c.arc(sx(f.x + f.vx * age), sy(f.y + f.vy * age + 0.9 * age * age), Math.max(1.2, z * 0.06), 0, 6.2832); c.fill(); }
    else if (f.type === 'bolt') {
      c.strokeStyle = '#f2f6ff'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      const bx = sx(f.x) + 60, by = -10, tx = sx(f.x), ty = sy(f.y); c.moveTo(bx, by);
      for (let i = 1; i <= 7; i++) { const q = i / 7; c.lineTo(bx + (tx - bx) * q + (i < 7 ? (hash(i, f.x, f.y) - 0.5) * 46 : 0), by + (ty - by) * q); }
      c.stroke();
    }
    else if (f.type === 'mote') { c.fillStyle = f.color; c.beginPath(); c.arc(sx(f.x + f.vx * age + 0.12 * Math.sin(age * 4 + f.ph)), sy(f.y - f.vy * age), Math.max(1, z * 0.05) * (1 + 0.5 * Math.sin(age * 9 + f.ph)), 0, 6.2832); c.fill(); }
    else if (f.type === 'spark') { const X = sx(f.x + f.dx), Y = sy(f.y + f.dy), r = Math.max(3, z * 0.22) * Math.sin(3.1416 * p); c.strokeStyle = f.color; c.lineWidth = 1.4; c.beginPath(); c.moveTo(X - r, Y); c.lineTo(X + r, Y); c.moveTo(X, Y - r); c.lineTo(X, Y + r); c.stroke(); }
    else if (f.type === 'ripple') { c.strokeStyle = f.color; c.lineWidth = 1.5; for (let q = 0; q < 2; q++) { const pp = p - q * 0.25; if (pp <= 0) continue; c.beginPath(); c.ellipse(sx(f.x), sy(f.y), f.r * z * pp, f.r * z * pp * 0.5, 0, 0, 6.2832); c.stroke(); } }
    else if (f.type === 'float') { c.fillStyle = f.color; c.font = '600 ' + Math.round(clamp(z * 0.5, 11, 22)) + 'px "Instrument Sans", sans-serif'; c.textAlign = 'center'; c.fillText(f.text, sx(f.x), sy(f.y) - z * (0.5 + p * 0.9)); }
  }
  c.globalAlpha = 1; U.fx = keep;
}
function wrap(c, text, maxW) {
  const words = String(text).split(' '), lines = []; let line = '';
  for (let k = 0; k < words.length; k++) {
    const t = line ? line + ' ' + words[k] : words[k];
    if (c.measureText(t).width > maxW && line) { lines.push(line); line = words[k]; } else line = t;
    if (lines.length >= 5) break;
  }
  if (line && lines.length < 6) lines.push(line);
  if (lines.length === 6) lines[5] = lines[5].replace(/.{0,3}$/, '…');
  return lines;
}
function drawLabels(c) {
  const z = cam.z;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  if (w.regions && w.regions.length > 1 && z < 15) { c.font = 'italic 600 ' + Math.round(clamp(z * 1.5, 11, 20)) + 'px "Bricolage Grotesque", sans-serif'; w.regions.forEach(function (R) { if (w.terrain[Math.round(R.y) * w.W + Math.round(R.x)] === 9) return; const px = sx(R.x), py = sy(R.y); if (px < -100 || py < -20 || px > W + 100 || py > H + 20) return; c.lineWidth = 3; c.strokeStyle = 'rgba(5,8,11,0.55)'; c.strokeText(R.name, px, py); c.fillStyle = 'rgba(236,232,220,0.78)'; c.fillText(R.name, px, py); }); }
  for (let k = 0; k < w.settlements.length; k++) {
    const stl = w.settlements[k], root = agentOf(stl.root), px = sx(stl.x), py = sy(stl.y) - (stl.r + 0.9) * z; if (px < -120 || py < -30 || px > W + 120 || py > H + 30) continue;
    c.font = '800 ' + Math.round(clamp(z * 0.62, 12, 22)) + 'px "Bricolage Grotesque", sans-serif';
    c.lineWidth = 4; c.strokeStyle = 'rgba(5,8,11,0.8)'; c.strokeText(stl.name, px, py); c.fillStyle = SW.hslToHex(root ? root.hue : 40, 0.85, 0.72); c.fillText(stl.name, px, py);
  }
  /* the names beings have given to places */
  for (let k = 0; k < w.places.length; k++) {
    const pl = w.places[k], px = sx(pl.x), py = sy(pl.y); if (px < -100 || py < -30 || px > W + 100 || py > H + 30) continue;
    c.font = 'italic 600 ' + Math.round(clamp(z * 0.5, 11, 17)) + 'px "Bricolage Grotesque", sans-serif';
    c.lineWidth = 3.5; c.strokeStyle = 'rgba(5,8,11,0.75)'; c.strokeText(pl.name, px, py - z * 1.5); c.fillStyle = '#f4e6c0'; c.fillText(pl.name, px, py - z * 1.5);
  }
  for (let k = 0; k < w.agents.length; k++) {
    const a = w.agents[k], px = sx(ex(a)), py = sy(ey(a)), m = st.minds[a.id];
    if (px < -80 || py < -80 || px > W + 80 || py > H + 80) continue;
    if (z >= 11) {
      c.font = '500 ' + Math.round(clamp(z * 0.36, 10, 13)) + 'px "Instrument Sans", sans-serif';
      c.lineWidth = 2.6; c.strokeStyle = 'rgba(5,8,11,0.75)'; c.strokeText(a.name, px, py + z * 0.78);
      c.fillStyle = '#e3e9e2'; c.fillText(a.name, px, py + z * 0.78);
      const bw = Math.max(18, z * 0.8), by = py + z * 0.86;
      c.fillStyle = 'rgba(5,8,11,0.7)'; c.fillRect(px - bw / 2, by, bw, 3);
      c.fillStyle = a.e < 25 ? '#ef6a5b' : '#6fd38b'; c.fillRect(px - bw / 2, by, bw * clamp(a.e / 100, 0, 1), 3);
      if (a.hp < 99) { c.fillStyle = 'rgba(5,8,11,0.7)'; c.fillRect(px - bw / 2, by + 4, bw, 2); c.fillStyle = '#ef6a5b'; c.fillRect(px - bw / 2, by + 4, bw * clamp(a.hp / 100, 0, 1), 2); }
      if (z >= 17 || (U.sel && U.sel.t === 'agent' && U.sel.id === a.id)) { /* what the body is doing, so it can be checked against what the mind said */
        c.font = '500 10.5px "Instrument Sans", sans-serif'; const txt = a.doing + (a.intent ? '' : ' ·');
        c.lineWidth = 2.5; c.strokeStyle = 'rgba(5,8,11,0.8)'; c.strokeText(txt, px, by + 17); c.fillStyle = a.intent ? '#f2b84b' : '#9fb0ad'; c.fillText(txt, px, by + 17);
      }
    }
    if (m && m.busy) {
      for (let i = 0; i < 3; i++) {
        const on = 0.35 + 0.65 * Math.max(0, Math.sin(U.time * 5 - i * 0.9));
        c.fillStyle = (m.kindNow === 'deep' ? 'rgba(229,155,240,' : 'rgba(157,180,255,') + on + ')';
        c.beginPath(); c.arc(px + (i - 1) * 7, py - z * 0.85 - 4, 2.6, 0, 6.2832); c.fill();
      }
    }
  }
  /* speech and thought */
  const keep = [];
  for (let k = 0; k < U.bubbles.length; k++) {
    const b = U.bubbles[k], age = U.time - b.t0; if (age > b.life) continue; keep.push(b);
    const a = agentOf(b.id); if (!a) continue;
    const px = sx(ex(a)), py = sy(ey(a)) - z * 0.95 - (b.kind === 'think' && keep.some(function (o) { return o.id === b.id && o.kind === 'say'; }) ? 70 : 0);
    if (px < 0 || py < 0 || px > W || py > H + 60) continue;
    const alpha = Math.min(1, age / 0.2, (b.life - age) / 0.6);
    c.globalAlpha = clamp(alpha, 0, 1);
    if (z < 9) { c.fillStyle = b.kind === 'say' ? '#f4f6f0' : '#9db4ff'; c.beginPath(); c.arc(px, py, 4, 0, 6.2832); c.fill(); continue; }
    c.font = (b.kind === 'think' ? 'italic 400 ' : '500 ') + '12.5px "Instrument Sans", sans-serif';
    const lines = wrap(c, b.text, 210), tw = Math.max.apply(null, lines.map(function (l) { return c.measureText(l).width; })), bw = tw + 18, bh = lines.length * 16 + 10;
    const bx = clamp(px - bw / 2, 6, W - bw - 6), by = Math.max(6, py - bh - 8);
    c.beginPath();
    if (c.roundRect) c.roundRect(bx, by, bw, bh, 9); else c.rect(bx, by, bw, bh);
    if (b.kind === 'say') {
      c.fillStyle = 'rgba(244,246,240,0.96)'; c.fill();
      c.beginPath(); c.moveTo(px - 5, by + bh - 1); c.lineTo(px, by + bh + 7); c.lineTo(px + 5, by + bh - 1); c.fill();
      c.fillStyle = '#131a1f';
    } else {
      c.fillStyle = 'rgba(22,30,58,0.9)'; c.fill(); c.strokeStyle = 'rgba(157,180,255,0.7)'; c.setLineDash([3, 3]); c.lineWidth = 1; c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(157,180,255,0.8)'; c.beginPath(); c.arc(px - 2, by + bh + 5, 2.6, 0, 6.2832); c.arc(px + 2, by + bh + 11, 1.6, 0, 6.2832); c.fill();
      c.fillStyle = '#cfd9ff';
    }
    c.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) c.fillText(lines[i], bx + 9, by + 17 + i * 16);
    c.textAlign = 'center';
  }
  c.globalAlpha = 1; U.bubbles = keep;
}
function bubble(id, kind, text) {
  U.bubbles = U.bubbles.filter(function (b) { return b.id !== id || b.kind !== kind; });
  U.bubbles.push({ id: id, kind: kind, text: text, t0: U.time, life: (kind === 'say' ? 4.5 : 4) + Math.min(5, String(text).length * 0.045) });
}

/* ---------- world events become light, motion and sound ---------- */
/* the sky over the middle of the view: rain where the world is warm, snow on the ice */
function skyHere() { const w = st.world; return SW.skyAt(w, ((Math.round(cam.x) % w.W) + w.W) % w.W, clamp(Math.round(cam.y), 0, w.H - 1)); }
function soundAt(type, x, y, extra) {
  if (!SWA.on) return;
  const px = sx(x), py = sy(y), onScreen = px > -40 && py > -40 && px < W + 40 && py < H + 40;
  const o = extra || {}; o.pan = clamp((px - W / 2) / (W / 2), -1, 1); o.near = onScreen ? clamp(cam.z / 26, 0.35, 1) : 0.12;
  SWA.event(type, o);
}
function onWorldEvent(ev) {
  const a = ev.a != null ? agentOf(ev.a) : null, b = ev.b != null ? agentOf(ev.b) : null;
  const voice = a ? { hue: a.hue, bold: a.temperament.bold, gentle: a.temperament.gentle } : {};
  switch (ev.type) {
    case 'said': if (a) { bubble(a.id, 'say', ev.text); addFx({ type: 'ring', x: a.x, y: a.y, r: w.laws.body.hearing, life: 0.9, color: 'rgba(244,246,240,0.5)' }); voice.text = ev.text; soundAt('said', a.x, a.y, voice); } break;
    case 'thought': if (a) {
      bubble(a.id, 'think', ev.entry.thought);
      const self = ev.entry.changes.some(function (c) { return /rewrote|redesigned/.test(c); });
      if (ev.entry.taught && ev.entry.taught.lesson) bubble(a.id, 'say', ev.entry.taught.to + ', learn this: ' + ev.entry.taught.lesson);
      if (self) { burst(a.x, a.y, '#e59bf0', 14); addFx({ type: 'ring', x: a.x, y: a.y, r: 2.2, life: 1.2, color: 'rgba(229,155,240,0.8)' }); }
      soundAt(self ? 'rewrite' : ev.entry.kind === 'deep' ? 'deep' : 'thought', a.x, a.y, voice);
    } break;
    case 'ate': if (a) { if (cam.z >= 16) addFx({ type: 'float', x: a.x, y: a.y, text: (ev.gain > 0 ? '+' : '') + ev.gain, life: 1, color: ev.gain > 0 ? '#6fd38b' : '#ef6a5b' }); soundAt(ev.gain < 0 ? 'poison' : 'ate', a.x, a.y, voice); } break;
    case 'planted': if (a) { burst(a.x, a.y, '#8fe08a', 5); soundAt('planted', a.x, a.y, voice); } break;
    case 'attack': if (a && b) { addFx({ type: 'slash', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 0.35, color: '#ff5a48' }); burst(b.x, b.y, '#ff5a48', 8); soundAt('attack', b.x, b.y); } break;
    case 'preykill': if (cam.z >= 7) { burst(ev.x, ev.y, '#c8443a', 7); addFx({ type: 'ring', x: ev.x, y: ev.y, r: 2.2, life: 1.2, color: 'rgba(200,68,58,0.8)' }); if (cam.z >= 14) addFx({ type: 'float', x: ev.x, y: ev.y, text: 'a kill', life: 1.6, color: '#e0847a' }); soundAt('bitten', ev.x, ev.y); } break;
    case 'bitten': if (a) { burst(a.x, a.y, '#ff5a48', 6); soundAt('bitten', a.x, a.y); } break;
    case 'hunted': if (a) soundAt('hunted', a.x, a.y); break;
    case 'death': addFx({ type: 'ring', x: ev.x, y: ev.y, r: 3, life: 2, color: 'rgba(239,106,91,0.8)' }); addFx({ type: 'float', x: ev.x, y: ev.y, text: '✝', life: 2.4, color: '#e6eee9' }); soundAt('death', ev.x, ev.y); break;
    case 'birth': { const k = agentOf(ev.a) || (w.newborn || []).filter(function (n) { return n.id === ev.a; })[0]; if (k) { burst(k.x, k.y, '#ffd86b', 18); addFx({ type: 'ring', x: k.x, y: k.y, r: 2.5, life: 1.5, color: 'rgba(255,216,107,0.9)' }); soundAt('birth', k.x, k.y, { hue: k.hue }); } break; }
    case 'court': if (a) { addFx({ type: 'float', x: a.x, y: a.y, text: '♥', life: 1.6, color: '#ff8fb0' }); soundAt('court', a.x, a.y, voice); } break;
    case 'gave': if (a && b) { addFx({ type: 'slash', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 0.6, color: '#ffd86b' }); soundAt('gave', a.x, a.y, voice); } break;
    case 'built': burst(ev.x, ev.y, '#d9a066', 10); soundAt('built', ev.x, ev.y); break;
    case 'marked': soundAt('marked', ev.x, ev.y, voice); break;
    case 'cultivated': case 'variety': burst(ev.x, ev.y, '#ffe9a0', 16); addFx({ type: 'ring', x: ev.x, y: ev.y, r: 2, life: 1.6, color: 'rgba(255,233,160,0.9)' }); addFx({ type: 'float', x: ev.x, y: ev.y, text: '✦ ' + ev.kind, life: 3, color: '#ffe9a0' }); soundAt('variety', ev.x, ev.y); break;
    case 'extinct': if (SWA.on) SWA.event('extinct', {}); break;
    case 'alarm': addFx({ type: 'ring', x: ev.x, y: ev.y, r: 14, life: 1.6, color: 'rgba(255,90,72,0.8)' }); addFx({ type: 'ring', x: ev.x, y: ev.y, r: 7, life: 1.1, color: 'rgba(255,200,90,0.9)' }); soundAt('pledged', ev.x, ev.y, { hue: 20 }); break;
    case 'snared': burst(ev.x, ev.y, '#d9a066', 10); soundAt('hunted', ev.x, ev.y); break;
    case 'devstruck': burst(ev.x, ev.y, '#ff5a48', 10); soundAt('attack', ev.x, ev.y); break;
    case 'placed': burst(ev.x, ev.y, '#f2b84b', 12); soundAt('built', ev.x, ev.y); break;
    case 'settled': addFx({ type: 'ring', x: ev.set.x, y: ev.set.y, r: ev.set.r + 2, life: 3, color: 'rgba(255,233,160,0.9)' }); addFx({ type: 'float', x: ev.set.x, y: ev.set.y, text: '⌂ ' + ev.set.name, life: 4, color: '#ffe9a0' }); soundAt('birth', ev.set.x, ev.set.y, { hue: 60 }); break;
    case 'great': { const e = ev.edict; U.flash = 0.6; burst(e.x, e.y, '#ffffff', 40); addFx({ type: 'ring', x: e.x, y: e.y, r: 14, life: 4, color: 'rgba(255,255,255,0.9)' }); addFx({ type: 'ring', x: e.x, y: e.y, r: 30, life: 6, color: 'rgba(229,155,240,0.8)' }); if (SWA.on) { SWA.event('law', {}); SWA.event('awakened', { near: 1, hue: e.hue }); } break; }
    case 'discovery': if (a) { burst(a.x, a.y, '#ffe9a0', 24); addFx({ type: 'ring', x: a.x, y: a.y, r: 3, life: 2, color: 'rgba(255,233,160,0.9)' }); soundAt('variety', a.x, a.y); } break;
    case 'invented': if (a) { addFx({ type: 'float', x: a.x, y: a.y, text: '✦ ' + ev.kind, life: 3.2, color: '#ffe9a0' }); burst(a.x, a.y, '#ffe9a0', 16); soundAt('variety', a.x, a.y); } break;
    case 'crafted': if (a) { burst(a.x, a.y, '#d9a066', 6); sparks(a.x, a.y, '#ffe2b0', 3); soundAt('craft', a.x, a.y, voice); } break;
    case 'healed': if (b) { motes(b.x, b.y, '#8fe08a', 12); addFx({ type: 'ring', x: b.x, y: b.y, r: 1.4, life: 1.4, color: 'rgba(143,224,138,0.8)' }); soundAt('healed', b.x, b.y, voice); } break;
    case 'took': if (ev.raid) { addFx({ type: 'float', x: ev.x, y: ev.y, text: 'raid!', life: 1.8, color: '#ff8f6b' }); soundAt('stole', ev.x, ev.y); } break;
    case 'story': U.keys.story = ''; break;
    case 'insight': U.keys.inspect = ''; break;
    case 'opened': buildTerrain(); SPACE.tex = null; U.keys.kinds = ''; addFx({ type: 'ring', x: (ev.x0 + ev.x1) / 2, y: (ev.y0 + ev.y1) / 2, r: 10, life: 4, color: 'rgba(250,236,170,0.9)' }); showNotice('New land has been found beyond the edge of the known world' + (ev.land ? ', in ' + ev.land : '') + '.'); motes((ev.x0 + ev.x1) / 2, (ev.y0 + ev.y1) / 2, '#faecaa', 16); soundAt('opened', (ev.x0 + ev.x1) / 2, (ev.y0 + ev.y1) / 2); break;
    case 'disaster': if (ev.x2 != null) addFx({ type: 'ring', x: ev.x2, y: ev.y2, r: 4, life: 3.5, color: 'rgba(230,230,240,0.9)' }); addFx({ type: 'ring', x: ev.x, y: ev.y, r: Math.max(4, ev.r), life: 3.5, color: ev.kind === 'wildfire' || ev.kind === 'volcano' ? 'rgba(255,120,40,0.95)' : ev.kind === 'locusts' ? 'rgba(190,200,90,0.9)' : 'rgba(230,230,240,0.9)' }); addFx({ type: 'float', x: ev.x, y: ev.y, text: ev.kind === 'quake' ? 'the earth shakes' : ev.kind === 'volcano' ? 'the mountain burns' : ev.kind, life: 4, color: '#ffb070' }); soundAt('lightning', ev.x, ev.y); U.keys.laws = ''; break;
    case 'maker': U.keys.maker = ''; U.keys.laws = ''; U.keys.kinds = ''; U.keys.ways = ''; if (ev.entry.ops.length) showNotice('The maker changed the world: ' + ev.entry.ops.join('; ') + '. See the Maker tab.'); break;
    case 'site': if (ev.first) { addFx({ type: 'ring', x: ev.x, y: ev.y, r: 5, life: 2.5, color: 'rgba(214,196,255,0.9)' }); soundAt('cast', ev.x, ev.y); } break;
    case 'sick': if (a) { addFx({ type: 'float', x: a.x, y: a.y, text: 'sick', life: 2.6, color: '#a6dc5a' }); soundAt('sick', a.x, a.y, voice); } break;
    case 'fished': if (a) { addFx({ type: 'ripple', x: a.x, y: a.y, r: 1.1, life: 1.3, color: 'rgba(159,211,230,0.9)' }); soundAt('splash', a.x, a.y); if (ev.first) addFx({ type: 'float', x: a.x, y: a.y, text: 'a fish', life: 2.2, color: '#9fd3e6' }); } break;
    case 'war': { const q = agentOf(ev.war.a); if (q) { addFx({ type: 'ring', x: q.x, y: q.y, r: 7, life: 3, color: 'rgba(255,90,72,0.9)' }); addFx({ type: 'float', x: q.x, y: q.y, text: '⚔ war with ' + ev.war.bName, life: 4, color: '#ff6a55' }); soundAt('death', q.x, q.y); } break; }
    case 'truce': { const q = agentOf(ev.by); if (q) { addFx({ type: 'ring', x: q.x, y: q.y, r: 7, life: 3, color: 'rgba(143,224,192,0.9)' }); addFx({ type: 'float', x: q.x, y: q.y, text: 'truce', life: 4, color: '#8fe0c0' }); soundAt('pledged', q.x, q.y); } break; }
    case 'stance': if (a) { addFx({ type: 'ring', x: a.x, y: a.y, r: 5, life: 2.2, color: ev.stance === 'enemy' ? 'rgba(255,90,72,0.9)' : 'rgba(143,224,192,0.9)' }); soundAt('pledged', a.x, a.y, voice); } break;
    case 'named': addFx({ type: 'ring', x: ev.x, y: ev.y, r: 2, life: 1.6, color: 'rgba(244,230,192,0.9)' }); soundAt('marked', ev.x, ev.y, voice); break;
    case 'learned': if (a) { burst(a.x, a.y, '#cfd9ff', 16); soundAt('taught', a.x, a.y, voice); } break;
    case 'lightning': U.flash = 0.8; addFx({ type: 'bolt', x: ev.x, y: ev.y, life: 0.3 }); burst(ev.x, ev.y, '#fff6c0', 14); soundAt('thunder', ev.x, ev.y); break;
    case 'cast': { const f = ev.field; burst(f.x, f.y, fieldColor(f), 26); addFx({ type: 'ring', x: f.x, y: f.y, r: f.r + 0.5, life: 2, color: fieldColor(f) }); addFx({ type: 'float', x: f.x, y: f.y, text: '✦ ' + (f.name || f.law), life: 3.2, color: fieldColor(f) }); soundAt('cast', f.x, f.y, voice); break; }
    case 'awakened': if (a) { burst(a.x, a.y, '#ffffff', 30); addFx({ type: 'ring', x: a.x, y: a.y, r: 4, life: 2.4, color: 'rgba(255,255,255,0.9)' }); soundAt('awakened', a.x, a.y, voice); } break;
    case 'stole': if (a) { addFx({ type: 'float', x: a.x, y: a.y, text: ev.seen ? 'thief!' : '…', life: 1.6, color: ev.seen ? '#ff8f6b' : '#9aa7ad' }); soundAt('stole', a.x, a.y, voice); } break;
    case 'traded': if (a && b) { addFx({ type: 'slash', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 0.9, color: '#8fe0c0' }); glyph(a.x, a.y, ev.gave + ' for ' + ev.got, '#8fe0c0', 2.6); motes(b.x, b.y, '#8fe0c0', 5); soundAt('traded', a.x, a.y, voice); } break;
    case 'offer': if (a) { glyph(a.x, a.y, ev.give + ' for ' + ev.want + '?', '#8fe0c0', 2.2); soundAt('offer', a.x, a.y, voice); } break;
    case 'mined': sparks(ev.x, ev.y, '#ffe9a0', ev.first ? 6 : 3); soundAt('mined', ev.x, ev.y, voice); if (ev.first && a) glyph(a.x, a.y, ev.kind, '#ffe9a0', 2.4); break;
    case 'felled': burst(ev.x, ev.y, '#b98a55', 5); soundAt('wood', ev.x, ev.y); break;
    case 'bridged': case 'paved': burst(ev.x, ev.y, '#b9a27a', 5); soundAt('wood', ev.x, ev.y); break;
    case 'dismantled': burst(ev.x, ev.y, '#b98a55', 8); soundAt('wood', ev.x, ev.y); break;
    case 'stashed': burst(ev.x, ev.y, '#d9c08a', 4); soundAt('stashed', ev.x, ev.y); break;
    case 'tamed': if (a) { glyph(a.x, a.y, '\u2665 ' + ev.kind, '#ffb3c7', 2.6); motes(a.x, a.y, '#ffb3c7', 6); soundAt('tamed', a.x, a.y, voice); } break;
    case 'fed': if (a) motes(a.x, a.y, '#ffd9a0', 3); break;
    case 'rode': if (a && !ev.off) { burst(a.x, a.y, '#cdbb96', 4); soundAt('rode', a.x, a.y); } break;
    case 'telling': if (a) { motes(a.x, a.y, '#ffc67a', 12); glyph(a.x, a.y, '\u266a', '#ffe9a0', 2.6); addFx({ type: 'ring', x: a.x, y: a.y, r: 3, life: 2.4, color: 'rgba(255,198,122,0.7)' }); soundAt('telling', a.x, a.y, voice); } break;
    case 'made': if (a) { motes(a.x, a.y, '#e9c8ff', 10); glyph(a.x, a.y, ev.thing || ev.what, '#e9c8ff', 2.6); soundAt('rite', a.x, a.y, voice); } break;
    case 'shared': if (a) { motes(a.x, a.y, '#ffd9a0', 5); soundAt('shared', a.x, a.y); } break;
    case 'mended': if (a && b) { addFx({ type: 'slash', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 1.2, color: '#b9f0c0' }); motes(a.x, a.y, '#b9f0c0', 6); soundAt('shared', a.x, a.y); } break;
    case 'claimed': addFx({ type: 'ring', x: ev.x, y: ev.y, r: 4, life: 3, color: 'rgba(255,233,160,0.9)' }); glyph(ev.x, ev.y, ev.name || 'claimed', '#ffe9a0', 3.2); soundAt('claimed', ev.x, ev.y, voice); break;
    case 'arrived': { const f = agentOf((ev.ids || [])[0]); if (f) { addFx({ type: 'ring', x: f.x, y: f.y, r: 6, life: 3.5, color: 'rgba(190,225,255,0.9)' }); motes(f.x, f.y, '#bee1ff', 14); glyph(f.x, f.y, 'newcomers', '#bee1ff', 3.5); soundAt('arrived', f.x, f.y); } break; }
    case 'aged': if (a) { addFx({ type: 'ring', x: a.x, y: a.y, r: 1.5, life: 1.6, color: 'rgba(244,230,192,0.8)' }); motes(a.x, a.y, '#f4e6c0', 5); soundAt('aged', a.x, a.y, voice); } break;
    case 'grown': if (a) motes(a.x, a.y, '#cfe9ff', 5); break;
    case 'read': if (a) motes(a.x, a.y, '#f4e6c0', 3); break;
    case 'rallied': if (a) { addFx({ type: 'ring', x: a.x, y: a.y, r: w.laws.body.hearing, life: 1.2, color: 'rgba(255,120,90,0.7)' }); glyph(a.x, a.y, 'rally!', '#ff8f6b', 2.2); soundAt('rallied', a.x, a.y); } break;
    case 'herdcame': addFx({ type: 'ring', x: ev.x, y: ev.y, r: 5, life: 3, color: 'rgba(205,187,150,0.8)' }); glyph(ev.x, ev.y, ev.n + ' ' + ev.kind, '#cdbb96', 3); soundAt('herd', ev.x, ev.y); break;
    case 'drank': if (a && !ev.pot) addFx({ type: 'ripple', x: a.x, y: a.y, r: 0.7, life: 1.1, color: 'rgba(159,211,230,0.8)' }); break;
    case 'weather': SWA.event('weather', { near: 0.7 }); break;
    case 'pledged': if (a && b) { addFx({ type: 'slash', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 1, color: SW.hslToHex(b.hue, 0.85, 0.6) }); addFx({ type: 'ring', x: b.x, y: b.y, r: 1.6, life: 1.4, color: SW.hslToHex(b.hue, 0.85, 0.6) }); soundAt('pledged', b.x, b.y, voice); } break;
    case 'broke': if (a) { addFx({ type: 'float', x: a.x, y: a.y, text: '✕', life: 1.6, color: '#ff8f6b' }); soundAt('stole', a.x, a.y, voice); } break;
    case 'razed': burst(ev.x, ev.y, '#b9b1a2', 16); soundAt('razed', ev.x, ev.y); break;
    case 'taught': if (a && b) { addFx({ type: 'slash', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 1, color: '#cfd9ff' }); burst(b.x, b.y, '#cfd9ff', ev.art ? 16 : 6); soundAt('taught', b.x, b.y, voice); } break;
  }
}

/* ---------- picking ---------- */
function pick(px, py) {
  const p = toWorld(px, py); let best = null, bd = 0.85;
  for (let k = 0; k < w.agents.length; k++) { const a = w.agents[k], d = Math.hypot(wrapd(ex(a) - p.x), ey(a) - 0.1 - p.y); if (d < bd) { bd = d; best = { t: 'agent', id: a.id }; } }
  if (best) return best;
  bd = 0.6;
  for (let k = 0; k < w.creatures.length; k++) { const c = w.creatures[k], d = Math.hypot(wrapd(ex(c) - p.x), ey(c) - p.y); if (d < bd) { bd = d; best = { t: 'creature', id: c.id }; } }
  if (best) return best;
  const tx = w.wrap ? ((Math.round(p.x) % w.W) + w.W) % w.W : Math.round(p.x), ty = Math.round(p.y);
  if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return null;
  return { t: 'tile', x: tx, y: ty };
}
function describe(s) {
  if (!s) return '';
  if (s.t === 'agent') { const a = agentOf(s.id); return a ? '<b>' + esc(a.name) + '</b> · ' + esc(a.doing) + ' · energy ' + Math.round(a.e) : ''; }
  if (s.t === 'creature') { const c = w.creatures.filter(function (q) { return q.id === s.id; })[0]; return c ? '<b>' + esc(c.sp) + '</b> · ' + (w.laws.creatures[c.sp].predator ? 'hunter' : 'grazer') : ''; }
  const i = s.y * w.W + s.x, p = w.plants[i], bits = [];
  if (p) bits.push('<b>' + esc(p.sp) + '</b> · ' + (p.g < 1 ? 'young' : Math.floor(p.food + 1e-9) + ' food'));
  if (w.shelters[i]) bits.push(w.shelters[i] < 0 ? 'a cave' : (w.bkind && w.bkind[i] ? esc(w.bkind[i]) : 'shelter') + ' by ' + esc(st.names[w.shelters[i]] || '?'));
  if (w.walls[i]) bits.push('wall by ' + esc(st.names[w.walls[i]] || '?'));
  if (w.fires[i] > w.tick) bits.push('a fire');
  if (w.terrain[i] === 3) bits.push(w.trees[i] >= 3 ? 'standing forest' : w.trees[i] > 0 ? 'thinned forest (' + w.trees[i] + ' of 3 trees left)' : 'felled: only stumps');
  if (w.ore[i]) bits.push('a seam of ore'); if (w.river[i]) bits.push('a river'); if (w.lodes && w.lodes[i]) bits.push('a deposit of ' + esc(w.lodes[i].k) + ' (' + w.lodes[i].n + ' left)'); if (w.roads && w.roads[i]) bits.push(w.roads[i] === 2 ? 'a bridge' : 'a paved road'); if (w.works && w.works[i]) bits.push('a ' + esc(w.works[i].kind) + ' being raised (' + (w.works[i].wood + w.works[i].stone) + ' brought)'); { const R1 = SW.regionAt(w, i % w.W, Math.floor(i / w.W)); if (R1 && w.regions.length > 1) bits.push('in ' + esc(R1.name)); }
  if (w.devices[i]) bits.push('device: ' + esc(w.devices[i].k) + ' by ' + esc(w.devices[i].byName));
  if (w.stores[i]) bits.push('store by ' + esc(st.names[w.stores[i].by] || '?') + ' (' + w.stores[i].items.length + ' food)');
  w.fields.forEach(function (f) { if (SW.cheb(s.x, s.y, f.x, f.y) <= f.r) bits.push('working by ' + esc(f.byName)); });
  const m = w.marks.filter(function (q) { return q.x === s.x && q.y === s.y; })[0];
  if (m) bits.push('mark by ' + esc(m.name) + (m.text ? ': “' + esc(m.text) + '”' : ''));
  if (!bits.length) bits.push(SW.TERRAIN[w.terrain[i]]);
  return bits.join(' · ') + ' <span class="muted">(' + s.x + ',' + s.y + ')</span>';
}
function select(s, jump) {
  U.sel = s; U.keys.inspect = ''; U.showOld = false;
  if (s) setTab('inspect');
  if (s && s.t === 'agent' && jump) { const a = agentOf(s.id); if (a) { cam.x = a.x + 0.5; cam.y = a.y + 0.5; if (cam.z < 26) cam.z = 30; clampCam(); } }
  if (!s || s.t !== 'agent') U.follow = false;
  syncButtons();
}

/* ---------- pointer, wheel, keys ---------- */
const ptr = { down: false, moved: 0, lx: 0, ly: 0, pts: {}, pinch: 0 };
cv.addEventListener('pointerdown', function (e) {
  cv.setPointerCapture(e.pointerId); ptr.pts[e.pointerId] = { x: e.offsetX, y: e.offsetY };
  ptr.down = true; ptr.moved = 0; ptr.lx = e.offsetX; ptr.ly = e.offsetY; ptr.pinch = 0; cv.classList.add('drag');
});
cv.addEventListener('pointermove', function (e) {
  const ids = Object.keys(ptr.pts);
  if (ptr.pts[e.pointerId]) ptr.pts[e.pointerId] = { x: e.offsetX, y: e.offsetY };
  if (ids.length >= 2) {
    const p = ptr.pts[ids[0]], q = ptr.pts[ids[1]], d = Math.hypot(p.x - q.x, p.y - q.y);
    if (ptr.pinch) zoomAt((p.x + q.x) / 2, (p.y + q.y) / 2, d / ptr.pinch);
    ptr.pinch = d; ptr.moved = 99; return;
  }
  if (ptr.down) {
    const dx = e.offsetX - ptr.lx, dy = e.offsetY - ptr.ly; ptr.moved += Math.abs(dx) + Math.abs(dy);
    if (ptr.moved > 4) { if (isGlobe()) { const Rg = globeR(); cam.x -= dx / Rg * w.W / 6.2832; cam.y -= dy / Rg * w.H / 3.1416; U.spinAt = U.time + 8; } else { cam.x -= dx / cam.z; cam.y -= dy / cam.z; } U.follow = false; clampCam(); syncButtons(); }
    ptr.lx = e.offsetX; ptr.ly = e.offsetY; $('tip').hidden = true;
  } else {
    const s = isGlobe() ? null : pick(e.offsetX, e.offsetY), html = s ? describe(s) : '', tip = $('tip');
    if (html) { tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(W - 270, e.offsetX + 14) + 'px'; tip.style.top = Math.min(H - 40, e.offsetY + 16) + 'px'; } else tip.hidden = true;
  }
});
function endPtr(e) {
  delete ptr.pts[e.pointerId]; cv.classList.remove('drag');
  if (ptr.down && ptr.moved <= 4 && e.type === 'pointerup' && !isGlobe()) select(pick(e.offsetX, e.offsetY), false);
  if (!Object.keys(ptr.pts).length) ptr.down = false;
  ptr.pinch = 0;
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', function () { $('tip').hidden = true; });
cv.addEventListener('dblclick', function (e) { if (isGlobe()) { cam.z = zGlobe() * 1.6; clampCam(); } else zoomAt(e.offsetX, e.offsetY, 1.8); });
cv.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
window.addEventListener('keydown', function (e) {
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const k = e.key, step = 80 / cam.z;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === 'f' || k === 'F') toggleFollow();
  else if (k === 'm' || k === 'M') toggleSound();
  else if (k === '+' || k === '=') zoomAt(W / 2, H / 2, 1.3);
  else if (k === '-' || k === '_') zoomAt(W / 2, H / 2, 1 / 1.3);
  else if (k === '0') fitWorld();
  else if (k === 'Escape') select(null);
  else if (k === 'ArrowLeft' || k === 'a') { cam.x -= step; U.follow = false; clampCam(); }
  else if (k === 'ArrowRight' || k === 'd') { cam.x += step; U.follow = false; clampCam(); }
  else if (k === 'ArrowUp' || k === 'w') { cam.y -= step; U.follow = false; clampCam(); }
  else if (k === 'ArrowDown' || k === 's') { cam.y += step; U.follow = false; clampCam(); }
});
const mini = $('mini');
function miniGo(e) { const r = mini.getBoundingClientRect(); cam.x = (e.clientX - r.left) / r.width * w.W; cam.y = (e.clientY - r.top) / r.height * w.H; U.follow = false; clampCam(); syncButtons(); }
mini.addEventListener('pointerdown', function (e) { mini.setPointerCapture(e.pointerId); mini._d = true; miniGo(e); });
mini.addEventListener('pointermove', function (e) { if (mini._d) miniGo(e); });
mini.addEventListener('pointerup', function () { mini._d = false; });

/* ---------- controls ---------- */
function togglePlay() { U.playing = !U.playing; syncButtons(); }
function toggleFollow() { if (!U.sel || U.sel.t !== 'agent') { U.follow = false; } else U.follow = !U.follow; syncButtons(); }
function toggleSound() {
  if (SWA.on) { SWA.stop(); st.settings.sound = false; } else if (!SWA.start(w.seed)) showNotice('Sound could not start in this view.'); else st.settings.sound = true;
  syncButtons(); save();
}
function wakeMinds(another) {
  if (st.on && !another) { st.on = false; syncButtons(); return; }
  if (!st.sample) { showNotice(st.blocked || 'Claude is not available to this page in this view, so the beings run on reflexes alone. Open it from Claude to wake their minds.'); return; }
  if (st.used >= st.settings.budget || another) st.used = 0;
  st.notice = ''; st.budgetHit = false; st.errStreak = 0; st.on = true; $('notice').hidden = true;
  if (SWA.on) SWA.event('wake', {});
  syncButtons();
}
function showNotice(text, action) {
  $('noticeText').textContent = text; $('notice').hidden = false;
  const b = $('noticeBtn'); b.textContent = action ? action.label : 'Dismiss';
  b.onclick = function () { $('notice').hidden = true; if (action) action.run(); };
}
function syncButtons() {
  $('btnPlay').textContent = U.playing ? '❚❚' : '▶'; $('btnPlay').classList.toggle('on', !U.playing);
  $('btnFollow').classList.toggle('on', U.follow); $('btnFollow').disabled = !(U.sel && U.sel.t === 'agent');
  $('btnSound').textContent = SWA.on ? (SWA.ctx && SWA.ctx.state !== 'running' ? 'Sound on · click to hear' : 'Sound on') : 'Sound off'; $('btnSound').classList.toggle('on', SWA.on);
  const bm = $('btnMinds'); bm.textContent = st && st.on ? 'Minds awake' : 'Wake minds'; bm.classList.toggle('awake', !!(st && st.on));
}
$('btnPlay').onclick = togglePlay;
$('selSpeed').onchange = function () { U.speed = +this.value; };
$('btnIn').onclick = function () { zoomAt(W / 2, H / 2, 1.4); };
$('btnOut').onclick = function () { zoomAt(W / 2, H / 2, 1 / 1.4); };
$('btnFit').onclick = fitWorld;
$('btnFollow').onclick = toggleFollow;
$('btnSound').onclick = toggleSound;
$('btnMinds').onclick = function () { wakeMinds(false); };
$('btnAdd').onclick = function () { const n = +$('selAdd').value || 4, made = SW.addPeople(w, n); if (made.length) { showNotice(made.length + ' newcomers are coming into the land: ' + made.map(function (o) { return o.name; }).join(', ') + '.'); U.keys.inspect = ''; U.keys.peoples = ''; } else showNotice('There is no room for more people in this world.'); };

/* ---------- tabs ---------- */
function setTab(name) {
  U.tab = name;
  document.querySelectorAll('#tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
  ['inspect', 'story', 'culture', 'voices', 'chronicle', 'peoples', 'ways', 'kinds', 'laws', 'maker', 'settings'].forEach(function (n) { $('pane-' + n).hidden = n !== name; });
  U.keys[name] = '';
}
$('tabs').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
function when(tick) { const d = w.laws.time.dayLength, p = (tick % d) / d, n = 1 - w.laws.time.nightFraction; return 'day ' + (Math.floor(tick / d) + 1) + ', ' + (p >= n ? 'night' : p < 0.08 ? 'dawn' : p > n - 0.1 ? 'dusk' : 'day'); }
function bar(v, color) { return '<div class="bar"><i style="width:' + clamp(v * 100, 0, 100).toFixed(0) + '%;background:' + color + '"></i></div>'; }
function nameLink(id) { const alive = !!agentOf(id); return '<button class="link" data-act="sel" data-id="' + id + '">' + esc(st.names[id] || '?') + '</button>' + (alive ? '' : ' <span class="muted">(dead)</span>'); }
const looksToPaint = [];
function lookCanvas(look, size, o) { looksToPaint.push({ look: look, o: o }); return '<canvas data-look="' + (looksToPaint.length - 1) + '" width="' + size * 2 + '" height="' + size * 2 + '" style="width:' + size + 'px;height:' + size + 'px"></canvas>'; }
function paintPending(rootEl) {
  rootEl.querySelectorAll('canvas[data-look]').forEach(function (c) { const p = looksToPaint[+c.dataset.look]; if (p) paintLook(c, p.look, p.o); c.removeAttribute('data-look'); });
  looksToPaint.length = 0;
}

/* ---------- inspector: a being ---------- */
function ruleHtml(r) {
  const cond = (r.if || []).map(function (q) { return esc(q[0]) + ' ' + esc(q[1]) + ' ' + esc(q[2]); }).join(' <span class="k">and</span> ') || 'always';
  const p = []; ['target', 'from', 'name', 'what', 'dir', 'aim', 'text'].forEach(function (k) { if (r[k] != null) p.push(esc(r[k])); });
  if (r.x != null) p.push('(' + r.x + ',' + r.y + ')');
  return '<li><span class="k">if</span> ' + cond + ' <span class="k">→</span> <span class="a">' + esc(r.do) + (p.length ? ' ' + p.join(' ') : '') + '</span>' + (r.urgent ? ' <span class="u">urgent</span>' : '') + (r.why ? '<span class="why">' + esc(r.why) + '</span>' : '') + '</li>';
}
function intentText(it) { const p = []; ['target', 'from', 'name', 'what', 'dir', 'aim', 'text'].forEach(function (k) { if (it[k] != null) p.push(it[k]); }); if (it.x != null) p.push('(' + it.x + ',' + it.y + ')'); return it.do + (p.length ? ' ' + p.join(' ') : '') + ' for up to ' + it.ticks + ' moments'; }
function thoughtHtml(e) {
  let h = '<div class="thought' + (e.kind === 'deep' ? ' deep' : '') + (e.failed ? ' failed' : '') + '"><div class="meta">' + esc(when(e.tick)) + ' · ' + (e.kind === 'deep' ? '<em>deep reflection</em>' : 'thought') + (e.model ? ' · ' + esc(e.model) : '') + (e.ms ? ' · ' + (e.ms / 1000).toFixed(1) + 's' : '') + '</div><div class="t">' + esc(e.thought) + '</div>';
  if (e.feeling) h += '<div class="feel">' + esc(e.feeling) + (e.rut >= 2 ? ' <span class="rut">going in circles</span>' : '') + '</div>';
  if (e.say) h += '<div class="say"><b>to ' + esc(e.say.to) + ':</b> “' + esc(e.say.text) + '”</div>';
  const li = [];
  if (e.intent) li.push('<li class="intent">sets out to ' + esc(intentText(e.intent)) + '</li>');
  if (e.plan) li.push('<li class="intent">plans: ' + e.plan.map(esc).join(' → ') + '</li>');
  if (e.note) li.push('<li class="memo">remembers: ' + esc(e.note) + '</li>');
  (e.tests || []).forEach(function (t) { li.push('<li class="test">imagined ' + t.rules + ' rules for a day and a half: ' + (t.survived ? 'survived, lowest energy ' + t.low + ', ended at ' + t.end : 'died (' + esc(t.cause) + ')') + '</li>'); });
  (e.changes || []).forEach(function (c) { li.push('<li>' + esc(c) + '</li>'); });
  if (li.length) h += '<ul>' + li.join('') + '</ul>';
  return h + '</div>';
}
function renderAgent(pane, id) {
  const a = agentOf(id), m = st.minds[id];
  if (!m) { pane.innerHTML = '<p class="empty">This being is gone from memory.</p>'; return; }
  const top = pane.querySelector('#insTop') ? null : true;
  if (top) pane.innerHTML = '<div id="insTop"></div><div id="insBody"></div>';
  /* vitals: refreshed often */
  let h = '<div class="who">' + (a ? '<canvas class="portrait" id="portrait" width="152" height="152"></canvas>' : '') + '<div><h2>' + esc(m.name) + '</h2>';
  if (a) {
    h += '<div class="sub">generation ' + a.gen + (a.parents.length ? ' · child of ' + a.parents.map(nameLink).join(' and ') : ' · a founder') + (SW.stage(w, a) === 'child' ? ' · a child' : SW.stage(w, a) === 'elder' ? ' · an elder' : '') + (a.sick > 0 ? ' · <span style="color:#a6dc5a">sick</span>' : '') + '</div><div class="doing">' + esc(a.doing) + (a.intent ? ' (by plan)' : ' (by reflex)') + '</div></div></div>';
    h += '<div class="planbox">' + (a.intent ? '<b>Plan</b> ' + esc(SWM.stepText(a.intent)) + (a.plan.length ? ' → ' + a.plan.map(function (q) { return esc(SWM.stepText(q)); }).join(' → ') : '') : '<b>Plan</b> <span class="muted">none: the body is on reflexes</span>') + '</div>';
    h += '<div class="row"><button class="btn" data-act="follow">' + (U.follow ? 'Following' : 'Follow') + '</button><button class="btn" data-act="think"' + (m.busy ? ' disabled' : '') + '>Think now</button><button class="btn" data-act="reflect"' + (m.busy ? ' disabled' : '') + '>Reflect deeply</button></div>';
    h += '<div class="bars"><span class="lab">Energy</span>' + bar(a.e / 100, a.e < 25 ? 'var(--harm)' : 'var(--life)') + '<span class="num">' + Math.round(a.e) + '</span><span class="lab">Health</span>' + bar(a.hp / 100, a.hp < 50 ? 'var(--harm)' : '#7fc8c2') + '<span class="num">' + Math.round(Math.max(0, a.hp)) + '</span><span class="lab">Age</span>' + bar(a.age / a.life, 'var(--muted)') + '<span class="num">' + Math.round(100 * a.age / a.life) + '%</span></div>';
    { const wb = SW.wellbeing(a), th = a.thirst || 0; h += '<div class="bars"><span class="lab">Thirst</span>' + bar(th / 100, th > 70 ? 'var(--harm)' : '#6fa8d8') + '<span class="num">' + Math.round(th) + '</span><span class="lab">Suffering</span>' + bar(wb.suffering, 'var(--harm)') + '<span class="num">' + Math.round(wb.suffering * 100) + '</span><span class="lab">Happiness</span>' + bar(wb.happiness, '#e6c34a') + '<span class="num">' + Math.round(wb.happiness * 100) + '</span><span class="lab">Satisfied with life</span>' + bar(wb.satisfaction, '#9fca7a') + '<span class="num">' + Math.round(wb.satisfaction * 100) + '</span></div>'; }
    const t = a.temperament;
    h += '<div class="traits">' + ['bold', 'sociable', 'curious', 'gentle', 'honest', 'greedy'].map(function (k) { return '<div class="trait">' + k + bar(t[k], 'var(--accent)') + '</div>'; }).join('') + '</div>';
    h += '<div class="traits moods">' + ['anger', 'fear', 'grief', 'joy', 'lonely'].map(function (k) { return '<div class="trait">' + k + bar(a.mood[k], MOOD_COLOR[k]) + '</div>'; }).join('') + '</div>';
    const bd = bandCache[a.id], fol = w.agents.filter(function (o) { return o.leader === a.id; });
    { const rl = SW.roleOf(w, a), md0 = st.minds[a.id]; h += '<div class="kv">Standing <b>' + SW.status(w, a).toFixed(1) + '</b>' + (rl ? ' · known as a <b>' + esc(rl) + '</b>' : '') + (a.shame > 0.05 ? ' · shame ' + a.shame : '') + (a.sung ? ' · sung of ' + a.sung + ' times' : '') + (a.sex ? ' · ' + (a.sex === 'f' ? 'female' : 'male') : '') + (a.faith && w.culture && w.culture.items[a.faith] ? '<br>Holds the teaching <b>“' + esc(w.culture.items[a.faith].title) + '”</b>' : '') + (a.press && Object.keys(a.press).length ? '<br>Pressed by: ' + Object.keys(a.press).sort(function (x, y) { return a.press[y] - a.press[x]; }).slice(0, 4).map(function (k) { return esc(SW.PRESSURES[k] || k) + ' ' + a.press[k].toFixed(1); }).join(' · ') : '') + (md0 && md0.lessons && md0.lessons.length ? '<br>Learned from what befell others: ' + md0.lessons.slice(-3).map(function (q) { return esc(q.text); }).join(' · ') : '') + '</div>'; }
    { const P0 = SW.peopleOf(w, a); if (P0) h += '<div class="kv">Of <b>' + esc(P0.name) + '</b> (' + esc(P0.noun) + ')' + (a.mixed ? ' · born of two peoples' : '') + ' · in ' + esc((SW.regionAt(w, a.x, a.y) || {}).name || '') + (a.genes ? '<br>Born with: ' + Object.keys(a.genes).map(function (g) { return esc(g) + ' ×' + a.genes[g]; }).join(' · ') : '') + (Object.keys(a.tongues || {}).filter(function (k) { return +k !== a.lang && a.tongues[k] > 0.02; }).length ? '<br>Other tongues: ' + Object.keys(a.tongues).filter(function (k) { return +k !== a.lang && a.tongues[k] > 0.02; }).map(function (k) { const op = w.peoples.filter(function (q) { return q.tongue === +k; })[0]; return esc(op ? op.name : '?') + ' ' + Math.round(a.tongues[k] * 100) + '%'; }).join(' · ') : '') + '</div>'; }
    h += '<div class="kv">' + (a.leader != null ? 'Follows ' + nameLink(a.leader) : 'Follows <b>no one</b>') + (fol.length ? ' · followed by ' + fol.map(function (o) { return nameLink(o.id); }).join(', ') : '') + (bd ? '<br>Band <b style="color:' + bd.color + '">' + esc(bd.name) + '</b> (' + bd.size + ')' : '') +
      '<br>Lore <b>' + (Math.round(a.lore * 10) / 10) + '</b> of ' + w.laws.magic.loreToCast + ' to work the world' + (a.arts.length ? ' · arts <b>' + esc(a.arts.join(', ')) + '</b>' : '') + (a.teachers.length ? ' · taught by ' + a.teachers.map(nameLink).join(', ') : '') + '</div>';
    const carry = {}; a.carry.forEach(function (c) { carry[c.k] = (carry[c.k] || 0) + 1; });
    const seeds = {}; a.seeds.forEach(function (c) { seeds[c] = (seeds[c] || 0) + 1; });
    const ls = function (o) { const ks = Object.keys(o); return ks.length ? ks.map(function (k) { return esc(k) + ' ×' + o[k]; }).join(', ') : 'none'; };
    h += '<div class="kv">Carrying <b>' + ls(carry) + '</b> · seeds <b>' + ls(seeds) + '</b> · wood <b>' + a.wood + '</b> · stone <b>' + a.stone + '</b>' + (a.ore ? ' · ore <b>' + a.ore + '</b>' : '') + (a.clay ? ' · clay <b>' + a.clay + '</b>' : '') + (a.pots ? ' · pots <b>' + a.pots + '</b>' : '') + ' · at <b>(' + a.x + ',' + a.y + ')</b> on ' + SW.TERRAIN[w.terrain[a.y * w.W + a.x]] + '<br>Thoughts <b>' + m.thoughts + '</b> · planted <b>' + a.stats.planted + '</b> · built <b>' + a.stats.built + '</b> · bred <b>' + a.stats.bred + '</b> · children <b>' + a.stats.kids + '</b> · kills <b>' + a.stats.kills + '</b> · thefts <b>' + a.stats.stolen + '</b> · trades <b>' + a.stats.trades + '</b></div>';
  } else h += '<div class="sub">died ' + esc(when(m.diedTick || 0)) + ': ' + esc(m.cause || 'unknown') + '</div></div></div><p class="note">This being is dead. Its mind is kept here so you can read how it lived.</p>';
  if (U.keys.insTop !== h || !$('portrait')) { U.keys.insTop = h; pane.querySelector('#insTop').innerHTML = h; }
  if (a && $('portrait')) paintLook($('portrait'), a.look, { scale: 1.15, phase: a.id });
  /* mind: rebuilt when something changed */
  const key = id + ':' + m.rev + ':' + (m.busy ? m.stream.length : -1) + ':' + U.showOld + ':' + (a ? a.policy.length + (a.intent ? 1 : 0) : 'x');
  if (U.keys.inspect === key) return; U.keys.inspect = key;
  let b = '';
  if (m.busy) b += '<div class="thinking"><span class="pulse"></span>' + (m.kindNow === 'deep' ? 'In deep reflection' : 'Thinking') + '…' + ((m.tests || []).length ? ' imagined ' + m.tests.length + ' possible future' + (m.tests.length > 1 ? 's' : '') : '') + (m.stream ? '<pre>' + esc(m.stream.slice(-600)) + '</pre>' : '') + '</div>';
  { const dv = SWM.drives(st, m, a, SW.look(w, a));
    b += '<h3>What presses on it <small>the forces under its thoughts</small></h3>' + (dv.length ? dv.map(function (d) { return '<div class="bond"><span style="min-width:92px;text-transform:capitalize">' + esc(d.k) + '</span><div class="bar"><i style="left:0;width:' + Math.round(d.s * 100) + '%;background:var(--mind)"></i></div><span class="num">' + d.s.toFixed(1) + '</span></div>'; }).join('') : '<p class="muted">Nothing presses hard. It is at ease.</p>');
    if (m.feeling) b += '<div class="kv" style="font-size:13px;margin-top:6px"><span class="muted">feels</span> ' + esc(m.feeling) + '</div>';
    if (m.wonder) b += '<div class="kv" style="font-size:13px"><span class="muted">wonders</span> ' + esc(m.wonder) + '</div>'; }
  b += '<h3>Mind stream <small>' + m.thoughts + ' thoughts</small></h3>';
  b += m.log.length ? m.log.slice(-14).reverse().map(thoughtHtml).join('') : '<p class="muted">No thoughts yet. ' + (st.on ? 'Its turn will come.' : 'Wake the minds, or press Think now.') + '</p>';
  { const th = a.things ? Object.keys(a.things).filter(function (k) { return a.things[k] > 0; }) : [];
    if (th.length) b += '<div class="kv" style="font-size:13px"><span class="muted">holds</span> ' + th.map(function (k) { return esc(k) + ' ×' + a.things[k]; }).join(', ') + '</div>';
    if (a.boons && a.boons.length) b += '<div class="kv" style="font-size:13px"><span class="muted">at work in its body</span> ' + a.boons.map(function (q) { return esc(q.k) + ' ×' + q.v + ' <span class="muted">(' + esc(q.src) + ')</span>'; }).join(', ') + '</div>';
    if (m.tales && m.tales.length) b += '<h3>Tales it carries</h3>' + m.tales.map(function (q) { return '<div class="mk"><b>' + esc(q.title) + '</b> <span class="v">' + (q.from ? 'told by ' + esc(q.from) + ', first by ' + esc(q.by) : 'its own') + (q.retold ? ' · retold' : '') + '</span><div class="q">' + esc(q.text) + '</div></div>'; }).join(''); }
  if (m.aim) b += '<h3>Aim</h3><div class="kv" style="font-size:13.5px;color:var(--text)">' + esc(m.aim) + '</div>';
  if (m.life && m.life.length) b += '<h3>Its life so far</h3><ul class="events">' + m.life.map(function (e) { return '<li><span class="muted">' + esc(when(e.tick).split(',')[0]) + '</span> ' + esc(e.text) + '</li>'; }).join('') + '</ul>';
  if (m.method) b += '<h3>How it has taught itself to think</h3><div class="creed" style="border-left-color:var(--mind);font-size:14px">' + esc(m.method) + '</div>';
  b += '<h3>Creed <small>' + (m.creedHistory.length ? 'rewritten ' + m.creedHistory.length + '×' : 'as born') + '</small></h3><div class="creed">' + esc(m.creed) + '</div>';
  if (m.creedHistory.length) b += '<div class="old"><button class="link" data-act="old">' + (U.showOld ? 'Hide' : 'Show') + ' earlier creeds</button>' + (U.showOld ? m.creedHistory.slice().reverse().map(function (c) { return '<div>' + esc(when(c.tick)) + ': ' + esc(c.text) + '</div>'; }).join('') : '') + '</div>';
  if (a) {
    b += '<h3>Reflexes <small>' + (m.policyHistory.length ? 'rewritten ' + m.policyHistory.length + '×' : 'instinct') + '</small></h3><ol class="rules">' + a.policy.map(ruleHtml).join('') + '</ol>';
    b += '<div class="kv">Refuses to eat <b>' + (a.habits.avoid.length ? esc(a.habits.avoid.join(', ')) : 'nothing') + '</b> · leaves <b>' + (a.habits.spare || 0) + '</b> food on each plant</div>';
    const ways = Object.keys(a.knows), paths = SW.pathsFor(w, a), fk = Object.keys(m.foods);
    b += '<h3>Knowledge <small>' + ways.length + ' ways · ' + Object.keys(a.designs).length + ' designs</small></h3>';
    b += ways.length ? '<div class="kinds">' + ways.map(function (id) { const k = a.knows[id]; return '<div class="kind">' + (k.look ? lookCanvas(k.look, 48, { scale: 1.05 }) : '') + '<b>' + esc(k.name) + '</b><span>' + esc(id) + (k.by === a.id ? ' · own discovery' : ' · from ' + esc(k.byName)) + '</span></div>'; }).join('') + '</div>' : '<p class="muted">No ways discovered yet.</p>';
    if (paths.open.length) b += '<div class="kv">Within reach at its next deep reflection: <b>' + paths.open.map(function (o) { return esc(o.id); }).join(', ') + '</b></div>';
    if (paths.near.length) b += '<div class="kv">' + paths.near.slice(0, 4).map(function (o) { return '<b>' + esc(o.id) + '</b> needs ' + esc(o.missing); }).join('<br>') + '</div>';
    if (a.tools.length) b += '<div class="kv">Carries ' + a.tools.map(function (q) { const d = w.laws.tools[q.k]; return '<b>' + esc(q.k) + '</b>' + (d ? ' (' + d.use + ' ×' + d.power + ', ' + q.wear + ' uses left)' : ''); }).join(', ') + '</div>';
    const dk = Object.keys(a.designs).filter(function (k) { return w.laws.tools[k]; });
    if (dk.length) b += '<div class="kinds" style="margin-top:8px">' + dk.map(function (k) { const d = w.laws.tools[k]; return '<div class="kind">' + lookCanvas(toolLook(d), 48, { scale: 1.05 }) + '<b>' + esc(k) + '</b><span>' + d.use + ' ×' + d.power + (d.by === a.id ? ' · own' : '') + '</span></div>'; }).join('') + '</div>';
    if (fk.length) b += '<div class="kv">Foods it knows: ' + fk.map(function (k) { const f = m.foods[k]; return '<b>' + esc(k) + '</b> ' + (f.told ? (f.gain < 0 ? 'said to hurt' : 'said to be good') + ' (' + esc(f.told) + "'s word)" : (f.gain < 0 ? f.gain : '+' + f.gain) + (f.fx ? ' *' : '') + (f.seen ? ' (by watching)' : '')); }).join(' · ') + '</div>';
    b += '<h3>Designs</h3><div class="kinds">' +
      '<div class="kind">' + lookCanvas(a.look, 64, { scale: 1.1 }) + '<b>body</b><span>its own form</span></div>' +
      '<div class="kind">' + lookCanvas(a.shelterLook || DEFAULT_SHELTER, 64, { scale: 1.1 }) + '<b>shelter</b><span>' + (a.shelterLook ? 'own design' : 'not yet designed') + '</span></div>' +
      '<div class="kind">' + lookCanvas(a.wallLook || DEFAULT_WALL, 64, { scale: 1.05 }) + '<b>wall</b><span>' + (a.wallLook ? 'own design' : 'not yet designed') + '</span></div>' +
      '<div class="kind">' + lookCanvas(a.emblem || defaultEmblem(a.hue), 64, { scale: 1.1 }) + '<b>emblem</b><span>' + (a.emblem ? 'own design' : 'not yet designed') + '</span></div></div>';
  }
  b += '<h3>Memory notes <small>' + m.notes.length + '</small></h3>' + (m.notes.length ? '<ol class="notes">' + m.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ol>' : '<p class="muted">Nothing written down yet.</p>');
  if (a) {
    const ids = Object.keys(a.rel).sort(function (p, q) { return a.rel[q] - a.rel[p]; });
    b += '<h3>Bonds</h3>' + (ids.length ? ids.map(function (o) { const v = a.rel[o]; return '<div class="bond">' + nameLink(+o) + '<div class="bar"><i style="left:' + (v >= 0 ? 50 : 50 + v * 50) + '%;width:' + Math.abs(v) * 50 + '%;background:' + (v >= 0 ? 'var(--life)' : 'var(--harm)') + '"></i></div><span class="num">' + (v > 0 ? '+' : '') + v.toFixed(1) + '</span></div>' + SWM.tiesOf(m, o).slice(-3).map(function (e) { return '<div class="tie">day ' + e.day + ' · ' + esc(e.text) + (e.n > 1 ? ' ×' + e.n : '') + '</div>'; }).join(''); }).join('') : '<p class="muted">No feelings toward anyone yet.</p>');
    { const mk = a.marks || {}, mids = Object.keys(mk); if (mids.length) b += '<h3>Does not forget</h3>' + mids.map(function (o) { const q = mk[o]; return '<div class="tie">' + (q.k === 'grudge' ? 'a grudge: ' : 'a kindness: ') + nameLink(+o) + ' ' + esc(q.why.replace(/\byou\b/g, 'them').replace(/\byour\b/g, 'their')) + ', day ' + q.day + (q.k === 'grudge' && q.n ? ' · ' + q.n + ' gift' + (q.n > 1 ? 's' : '') + ' toward mending' : '') + '</div>'; }).join(''); }
  }
  if (m.heard && m.heard.length) b += '<h3>What others have told it</h3><ul class="events">' + m.heard.slice().reverse().map(function (q) { return '<li><b style="color:var(--accent);font-weight:600">' + esc(q.from) + '</b>: “' + esc(q.text) + '”</li>'; }).join('') + '</ul>';
  b += '<h3>Since its last thought</h3>' + (m.events.length ? '<ul class="events">' + m.events.slice().reverse().map(function (e) { return '<li>' + esc(e.text) + (e.n > 1 ? ' ×' + e.n : '') + '</li>'; }).join('') + '</ul>' : '<p class="muted">Nothing of note.</p>');
  const body = pane.querySelector('#insBody'); body.innerHTML = b; paintPending(body);
}
function kindCard(table, name) {
  const s = w.laws[table][name]; if (!s) return '<p class="empty">The ' + esc(name) + ' has died out.</p>';
  const flora = table === 'plants';
  let n = 0;
  if (flora) { for (let i = 0; i < w.plants.length; i++) if (w.plants[i] && w.plants[i].sp === name) n++; } else n = w.creatures.filter(function (c) { return c.sp === name; }).length;
  let h = '<div class="who">' + lookCanvas(s.look, 76, { scale: 1.1, food: s.maxFood }).replace('<canvas', '<canvas class="portrait"') + '<div><h2>' + esc(name) + '</h2><div class="sub">' + (flora ? 'plant' : s.predator ? 'hunter' : 'grazer') + ' · ' + n + ' alive</div><div class="doing">' +
    (s.by ? 'bred by ' + esc(s.byName || '?') + ' from ' + esc(s.from) : s.from ? 'a wild variety of ' + esc(s.from) : 'one of the first kinds') + '</div></div></div>';
  const rows = Object.keys(s).filter(function (k) { return typeof s[k] === 'number' && k !== 'by' && k !== 'predator'; });
  h += '<h3>Its law <small>edit under Laws</small></h3><div class="laws">' + rows.map(function (k) { return '<label>' + esc(k) + '</label><span class="num">' + s[k] + '</span>'; }).join('') + '</div>';
  return h;
}
function renderInspect() {
  const pane = $('pane-inspect'), s = U.sel;
  if (!s) {
    const nk = 'none:' + Math.floor(U.time / 2) + ':' + w.agents.length;
    if (U.keys.inspect === nk) return; U.keys.inspect = nk;
    pane.innerHTML = '<h2>Nothing selected</h2><p class="empty">Click a <b>being</b> to open its mind: what it is thinking, what it has said, the creed and reflexes it has written for itself, and how it has designed its own body.<br><br>Click a plant, an animal, a shelter or a mark to see what it is and where it came from.</p><h3>Who is alive</h3>' +
      (w.agents.length ? w.agents.map(function (a) { return '<div class="line jump face" data-act="sel" data-id="' + a.id + '">' + lookCanvas(a.look, 30, { scale: 1.1 }) + '<div><span class="sp">' + esc(a.name) + '</span> <span class="muted">· ' + esc(a.doing) + ' · energy ' + Math.round(a.e) + (bandCache[a.id] ? ' · ' + esc(bandCache[a.id].name) : '') + '</span></div></div>'; }).join('') : '<p class="muted">No one. The land goes on without them.</p><div class="row"><button class="btn" data-act="settle">Send a band of three settlers</button></div>');
    paintPending(pane);
    return;
  }
  if (s.t === 'agent') { if (!pane.querySelector('#insTop')) { pane.innerHTML = ''; U.keys.inspect = ''; } renderAgent(pane, s.id); return; }
  let key, h = '';
  if (s.t === 'creature') {
    const c = w.creatures.filter(function (q) { return q.id === s.id; })[0];
    key = 'c' + s.id + ':' + (c ? Math.round(c.e) : 'gone');
    if (U.keys.inspect === key) return;
    if (!c) h = '<p class="empty">That animal is gone.</p>';
    else h = kindCard('creatures', c.sp) + '<h3>This one</h3><div class="kv">energy <b>' + Math.round(c.e) + '</b> · age <b>' + Math.round(100 * c.age / c.life) + '%</b> · size <b>' + c.size.toFixed(2) + '</b> · quickness <b>' + c.quick.toFixed(2) + '</b></div>';
  } else if (s.t === 'kind') {
    key = 'k' + s.table + s.name + ':' + Math.floor(w.tick / 30);
    if (U.keys.inspect === key) return;
    h = kindCard(s.table, s.name);
  } else {
    const i = s.y * w.W + s.x, p = w.plants[i];
    key = 't' + i + ':' + (p ? p.sp + Math.floor(p.food) + (p.g >= 1) : '') + w.shelters[i] + ':' + w.walls[i] + ':' + w.marks.length + ':' + w.fields.length + ':' + Math.floor(w.tick / 60) + ':' + (w.fires[i] > w.tick) + (w.stores[i] ? w.stores[i].items.length : '') + (w.devices[i] ? w.devices[i].k + w.devices[i].barred + w.devices[i].hold.length : '');
    if (U.keys.inspect === key) return;
    if (p) h += kindCard('plants', p.sp) + '<h3>This plant</h3><div class="kv">' + (p.g < 1 ? 'young, ' + Math.round(p.g * 100) + '% grown' : '<b>' + Math.floor(p.food + 1e-9) + '</b> food ready') + ' · age <b>' + Math.round(100 * p.age / p.life) + '%</b></div>';
    else h += '<h2>' + esc(SW.TERRAIN[w.terrain[i]]) + '</h2>';
    h += '<div class="kv">Tile <b>(' + s.x + ',' + s.y + ')</b> · ' + esc(SW.TERRAIN[w.terrain[i]]) + ' · fertility <b>' + w.fert[i] + '</b></div>';
    if (w.shelters[i]) h += '<h3>' + (w.bkind && w.bkind[i] ? esc(w.bkind[i].charAt(0).toUpperCase() + w.bkind[i].slice(1)) + '</h3><p class="muted">' + esc((w.laws.buildings[w.bkind[i]] || {}).hint || '') + '</p>' : 'Shelter</h3>') + '<div class="who">' + lookCanvas(w.looks[i] || structLook('shelter', w.shelters[i], i), 76, { scale: 1.1 }).replace('<canvas', '<canvas class="portrait"') + '<div>Built by ' + nameLink(w.shelters[i]) + '<div class="sub">' + (w.looks[i] ? 'to its own design' : 'plain: its builder has not designed one') + '</div></div></div>';
    if (w.fires[i] > w.tick) h += '<h3>Fire</h3><div class="kv">Burning for <b>' + (w.fires[i] - w.tick) + '</b> more moments. Warms those within ' + w.laws.craft.fireReach + ' steps, keeps hunting beasts off, and cooks meat eaten beside it.</div>';
    if (w.stores[i]) { const tl = {}; w.stores[i].items.forEach(function (q) { tl[q.k] = (tl[q.k] || 0) + 1; }); h += '<h3>Store</h3><div class="kv">Built by ' + nameLink(w.stores[i].by) + '. Holding <b>' + (Object.keys(tl).map(function (k) { return esc(k) + ' ×' + tl[k]; }).join(', ') || 'nothing') + '</b>.</div>'; }
    if (w.devices[i]) { const dv = w.devices[i], law = w.laws.tools[dv.k]; h += '<h3>Device</h3><div class="who">' + lookCanvas(law ? toolLook(law) : DEFAULT_DEVICE, 76, { scale: 1.05 }).replace('<canvas', '<canvas class="portrait"') + '<div><b>' + esc(dv.k) + '</b><div class="sub">set by ' + nameLink(dv.by) + ', ' + esc(when(dv.born)) + (dv.barred ? ' · barring the way' : '') + (dv.hold.length ? ' · holding ' + dv.hold.length + ' food' : '') + '</div></div></div>' + (law ? '<ol class="rules">' + law.rules.map(function (r) { return '<li>' + esc(ruleWords(r)) + '</li>'; }).join('') + '</ol>' + (law.idea ? '<div class="kv"><i>' + esc(law.idea) + '</i></div>' : '') : ''); }
    if (w.walls[i]) h += '<h3>Wall</h3><div class="who">' + lookCanvas(w.looks[i] || DEFAULT_WALL, 76, { scale: 1.05 }).replace('<canvas', '<canvas class="portrait"') + '<div>Built by ' + nameLink(w.walls[i]) + '<div class="sub">Only its builder\'s band may pass. Others must tear it down.</div></div></div>';
    w.fields.forEach(function (f) { if (SW.cheb(s.x, s.y, f.x, f.y) <= f.r) h += '<h3>Working</h3><div class="kv"><b style="color:' + fieldColor(f) + '">' + esc(f.name || 'unnamed') + '</b> by ' + nameLink(f.by) + '<br>' + esc(f.law) + ' ×' + f.factor + ' within ' + f.r + ' steps of (' + f.x + ',' + f.y + '): ' + fieldMeaning(f) + '<br>fades in <b>' + (f.until - w.tick) + '</b> moments</div>'; });
    const m = w.marks.filter(function (q) { return q.x === s.x && q.y === s.y; })[0];
    if (m) h += '<h3>Mark</h3><div class="who">' + lookCanvas(m.look || defaultEmblem(m.hue), 76, { scale: 1.1 }).replace('<canvas', '<canvas class="portrait"') + '<div>Left by ' + nameLink(m.by) + ', ' + esc(when(m.tick)) + (m.text ? '<div class="creed" style="margin-top:6px">' + esc(m.text) + '</div>' : '') + '</div></div>';
  }
  U.keys.inspect = key; pane.innerHTML = h; paintPending(pane);
}
$('panel').addEventListener('click', function (e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, s = U.sel;
  if (act === 'sel') { const id = +el.dataset.id; if (agentOf(id) || st.minds[id]) select({ t: 'agent', id: id }, !!agentOf(id)); }
  else if (act === 'follow') toggleFollow();
  else if (act === 'cultp') { U.cultP = el.dataset.id === 'all' ? null : +el.dataset.id; U.keys.culture = ''; }
  else if (act === 'cultv') { U.cultV = el.dataset.id; U.keys.culture = ''; }
  else if (act === 'old') { U.showOld = !U.showOld; }
  else if ((act === 'think' || act === 'reflect') && s && s.t === 'agent') {
    const m = st.minds[s.id];
    if (!st.sample) showNotice(st.blocked || 'Claude is not available to this page in this view.');
    else if (m && !m.busy) SWM.think(st, m, act === 'reflect' ? 'deep' : 'routine');
  }
  else if (act === 'kind') select({ t: 'kind', table: el.dataset.table, name: el.dataset.name });
  else if (act === 'voice') { const v = st.voices[+el.dataset.i]; if (v) { if (agentOf(v.a)) select({ t: 'agent', id: v.a }, true); else if (v.x != null) { cam.x = v.x; cam.y = v.y; clampCam(); } } }
  else if (act === 'chron') { const c = st.chron[+el.dataset.i]; if (c) { if (c.ids.length && agentOf(c.ids[0])) select({ t: 'agent', id: c.ids[0] }, true); else if (c.x != null) { cam.x = c.x + 0.5; cam.y = c.y + 0.5; if (cam.z < 24) cam.z = 28; clampCam(); } } }
  else if (act === 'settle') settle();
  else if (act === 'place') { cam.x = +el.dataset.x + 0.5; cam.y = +el.dataset.y + 0.5; if (cam.z < 22) cam.z = 26; clampCam(); }
  else if (act === 'preset') {
    const P = { quick: ['claude-haiku-5-5', '', 'claude-sonnet-5-5', 'medium'], rich: ['claude-sonnet-5-5', '', 'claude-sonnet-5-5', 'high'], richest: ['claude-sonnet-5-5', '', 'claude-opus-5-5', 'medium'] }[el.dataset.id];
    if (P) { st.settings.routine = { model: P[0], effort: P[1] }; st.settings.deep = { model: P[2], effort: P[3] }; U.keys.settings = ''; save(); }
  }
  else if (act === 'storynow' || act === 'makernow') {
    if (!st.sample) showNotice('Claude is not available to this page in this view.');
    else { SWK.error = ''; (act === 'storynow' ? SWK.tell(st) : SWK.make(st)).then(function () { U.keys.story = ''; U.keys.maker = ''; save(); }); U.keys.story = ''; U.keys.maker = ''; }
  }
  else if (act === 'makertoggle') { st.settings.maker.on = !st.settings.maker.on; U.keys.maker = ''; U.keys.settings = ''; save(); }
  else if (act === 'recsend') recFlush(true);
  else if (act === 'recsave') recDownload();
  else if (act === 'newworld') newWorld(+$('setSeed').value || Math.floor(Math.random() * 9999) + 1);
  else if (act === 'randomworld') newWorld(Math.floor(Math.random() * 9999) + 1);
  else if (act === 'openworld') openWorld(el.dataset.id);
  else if (act === 'forgetworld') { if (U.forget === el.dataset.id) { U.forget = null; libDel(el.dataset.id); } else U.forget = el.dataset.id; U.keys.settings = ''; }
});

/* ---------- voices, chronicle, kinds ---------- */
function renderVoices() {
  const sel = U.sel && U.sel.t === 'agent' ? U.sel.id : null, key = st.voices.length + ':' + (st.voices.length ? st.voices[st.voices.length - 1].tick : 0) + ':' + U.onlySel + ':' + sel;
  if (U.keys.voices === key) return; U.keys.voices = key;
  const name = sel != null ? st.names[sel] : null;
  let h = '<h2>Voices</h2><p class="muted">Everything said aloud, newest first. Beings only know what they hear.</p><label class="kv"><input type="checkbox" id="onlySel"' + (U.onlySel ? ' checked' : '') + '> Only what ' + (name ? esc(name) : 'the selected being') + ' said or heard</label><div style="margin-top:10px">';
  const rows = [];
  for (let i = st.voices.length - 1; i >= 0 && rows.length < 90; i--) {
    const v = st.voices[i];
    if (U.onlySel && name && v.name !== name && v.heard.indexOf(name) < 0) continue;
    const sp = agentOf(v.a);
    rows.push('<div class="line jump face" data-act="voice" data-i="' + i + '">' + (sp ? lookCanvas(sp.look, 30, { scale: 1.1 }) : '<span></span>') + '<div><div class="when">' + esc(when(v.tick)) + '</div><span class="sp">' + esc(v.name) + '</span> <span class="muted">to ' + esc(v.to === 'all' ? 'everyone' : v.to) + ':</span> “' + esc(v.text) + '”<div class="heard">' + (v.heard.length ? 'heard by ' + esc(v.heard.join(', ')) : 'no one was near enough to hear') + '</div></div></div>');
  }
  h += rows.length ? rows.join('') : '<p class="empty">No one has spoken yet. Beings speak when they think, so wake the minds.</p>';
  $('pane-voices').innerHTML = h + '</div>'; paintPending($('pane-voices'));
  $('onlySel').onchange = function () { U.onlySel = this.checked; U.keys.voices = ''; };
}
function drawEco() {
  const c = $('eco'); if (!c) return;
  const r = c.getBoundingClientRect(), g = c.getContext('2d'), d = Math.min(2, window.devicePixelRatio || 1);
  c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0);
  const Wd = r.width, Hd = r.height, hist = U.hist, pad = { l: 26, r: 8, t: 8, b: 16 };
  let max = 10; hist.forEach(function (q) { max = Math.max(max, q.a, q.h, q.s, q.p / 10); }); max = Math.ceil(max / 10) * 10;
  g.strokeStyle = '#1c2a32'; g.lineWidth = 1; g.fillStyle = '#8ea3a1'; g.font = '10px "JetBrains Mono", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
  [0, 0.5, 1].forEach(function (f) { const y = pad.t + (Hd - pad.t - pad.b) * (1 - f); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(Wd - pad.r, y); g.stroke(); g.fillText(String(Math.round(max * f)), pad.l - 5, y); });
  if (hist.length < 2) return;
  const X = function (i) { return pad.l + (Wd - pad.l - pad.r) * i / (hist.length - 1); }, Y = function (v) { return pad.t + (Hd - pad.t - pad.b) * (1 - v / max); };
  [['p', '#6fd38b', 10], ['h', '#c9a877', 1], ['s', '#a68bd8', 1], ['a', '#f2b84b', 1]].forEach(function (s) {
    g.strokeStyle = s[1]; g.lineWidth = s[0] === 'a' ? 2.2 : 1.4; g.beginPath();
    hist.forEach(function (q, i) { const y = Y(q[s[0]] / s[2]); if (i) g.lineTo(X(i), y); else g.moveTo(X(i), y); });
    g.stroke();
    const last = hist[hist.length - 1]; g.fillStyle = s[1]; g.beginPath(); g.arc(X(hist.length - 1), Y(last[s[0]] / s[2]), 2.6, 0, 6.2832); g.fill();
  });
  g.fillStyle = '#8ea3a1'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('day ' + hist[0].d, pad.l, Hd - 3); g.textAlign = 'right'; g.fillText('day ' + hist[hist.length - 1].d, Wd - pad.r, Hd - 3);
}
function renderChronicle() {
  const key = st.chron.length + ':' + (st.chron.length ? st.chron[st.chron.length - 1].tick : 0);
  if (U.keys.chronicle !== key) {
    U.keys.chronicle = key;
    let h = '<h2>Chronicle</h2><h3>The living, over time</h3><canvas id="eco"></canvas><div class="legend"><span><i style="background:#f2b84b"></i>beings</span><span><i style="background:#c9a877"></i>grazers</span><span><i style="background:#a68bd8"></i>hunters</span><span><i style="background:#6fd38b"></i>plants ÷ 10</span></div><h3>What has happened</h3>';
    const rows = [];
    for (let i = st.chron.length - 1; i >= 0 && rows.length < 120; i--) { const c = st.chron[i]; rows.push('<div class="line jump" data-act="chron" data-i="' + i + '"><span class="tag ' + esc(c.kind) + '">' + esc(c.kind) + '</span>' + esc(c.text) + ' <span class="when">' + esc(when(c.tick)) + '</span></div>'); }
    $('pane-chronicle').innerHTML = h + (rows.length ? rows.join('') : '<p class="empty">Nothing worth recording yet.</p>');
  }
  drawEco();
}
function renderKinds() {
  const L = w.laws, cp = {}, cc = {};
  for (let i = 0; i < w.plants.length; i++) if (w.plants[i]) cp[w.plants[i].sp] = (cp[w.plants[i].sp] || 0) + 1;
  w.creatures.forEach(function (c) { cc[c.sp] = (cc[c.sp] || 0) + 1; });
  const key = Object.keys(L.plants).join() + Object.keys(L.creatures).join() + JSON.stringify(cp) + JSON.stringify(cc) + Math.floor(U.time / 4) + Object.keys(L.buildings || {}).length + ':' + Object.keys(L.recipes || {}).length + ':' + Object.keys(L.minerals || {}).length;
  if (U.keys.kinds === key) return; U.keys.kinds = key;
  const card = function (table, n, count) { const s = L[table][n]; return '<button class="kind" data-act="kind" data-table="' + table + '" data-name="' + esc(n) + '">' + lookCanvas(s.look, 64, { scale: 1.1, food: s.maxFood }) + '<b>' + esc(n) + '</b><span>' + (count || 0) + ' alive' + (s.by ? ' · bred by ' + esc(s.byName || '?') : s.from ? ' · wild' : '') + '</span></button>'; };
  let h = '<h2>Kinds</h2><p class="muted">Every kind of living thing carries its own law and its own look. New kinds arise in the wild by mutation, and beings can breed their own.</p><h3>Flora <small>' + Object.keys(L.plants).length + ' of ' + L.ecology.maxPlantKinds + '</small></h3><div class="kinds">' + Object.keys(L.plants).map(function (n) { return card('plants', n, cp[n]); }).join('') + '</div>';
  h += '<h3>Fauna <small>' + Object.keys(L.creatures).length + ' of ' + L.ecology.maxCreatureKinds + '</small></h3><div class="kinds">' + Object.keys(L.creatures).map(function (n) { return card('creatures', n, cc[n]); }).join('') + '</div>';
  h += '<h3>Beings <small>' + w.agents.length + '</small></h3><div class="kinds">' + w.agents.map(function (a) { return '<button class="kind" data-act="sel" data-id="' + a.id + '">' + lookCanvas(a.look, 64, { scale: 1.1 }) + '<b>' + esc(a.name) + '</b><span>generation ' + a.gen + '</span></button>'; }).join('') + '</div>';
  const pl = lineageHtml('plants', function (d) { return (d.nutrition < 0 ? d.nutrition : '+' + d.nutrition) + (d.heal ? ' heals' : '') + (d.lore ? ' opens the mind' : '') + (d.anger ? ' enrages' : '') + (d.joy ? ' gladdens' : '') + (d.calm ? ' calms' : '') + (d.hurt ? ' harms' : '') + (d.by ? ' · bred by ' + esc(d.byName || '?') : ''); }), cl = lineageHtml('creatures', function (d) { return (d.predator ? 'hunter' : 'grazer') + (d.tough > 1 ? ' · tough' : ''); });
  if (pl || cl) h += '<h3>Lines of descent</h3>' + pl + cl;
  if (w.peoples && w.peoples.length) h += '<h3>Peoples <small>' + w.peoples.length + '</small></h3><div class="kinds">' + w.peoples.map(function (P) { const mem = w.agents.filter(function (a) { return a.people === P.id; }); return '<div class="kind">' + (mem[0] ? lookCanvas(mem[0].look, 64, { scale: 1.1 }) : '') + '<b>' + esc(P.name) + '</b><span>' + esc(P.noun) + ' · ' + mem.length + ' alive · ' + mem.filter(function (a) { return a.mixed; }).length + ' of mixed birth<br>born knowing ' + esc(P.way) + '<br><i>' + esc(P.custom) + '</i></span></div>'; }).join('') + '</div>';
  if (w.regions && w.regions.length > 1) h += '<h3>Lands <small>' + w.regions.length + '</small></h3>' + w.regions.map(function (R) { const here = w.agents.filter(function (a) { return w.region[a.y * w.W + a.x] === R.id; }).length; return '<div class="way' + (here ? ' known' : '') + '"><b>' + esc(R.name) + '</b> <span class="muted">' + esc(R.biome) + '</span><div class="muted">' + esc(SW.BIOMES[R.biome].say) + '</div><div class="kv">In its ground: ' + esc((R.minerals || []).join(', ') || 'nothing known') + ' · beings here now: ' + here + '</div></div>'; }).join('');
  { const lc = {}; for (const i in (w.lodes || {})) lc[w.lodes[i].k] = (lc[w.lodes[i].k] || 0) + 1; const held = {}; w.agents.forEach(function (a) { for (const k in (a.things || {})) if (a.things[k] > 0) held[k] = (held[k] || 0) + a.things[k]; });
    h += '<h3>In the ground <small>' + Object.keys(L.minerals || {}).length + ' kinds</small></h3><div class="kinds">' + Object.keys(L.minerals || {}).map(function (k) { const md = L.minerals[k], grey = k === 'coal' || k === 'obsidian' || k === 'peat'; return '<div class="kind"><span style="display:block;width:44px;height:44px;margin:6px auto;border-radius:10px;transform:rotate(45deg);background:' + (grey ? '#2a2732' : 'hsl(' + (md.hue || 0) + ',' + (k === 'salt' ? 12 : 65) + '%,62%)') + '"></span><b>' + esc(k) + '</b><span>' + (lc[k] || 0) + ' deposits' + (md.deep ? ' · deep' : '') + ' · ' + (held[k] || 0) + ' held<br>' + esc(md.hint || '') + '</span></div>'; }).join('') + '</div>';
    const tb = (w.tally && w.tally.built) || {}, tm = (w.tally && w.tally.made) || {};
    h += '<h3>Buildings <small>' + Object.keys(L.buildings || {}).length + ' kinds</small></h3><div class="kinds">' + Object.keys(L.buildings || {}).map(function (k) { const B = L.buildings[k], big = (B.wood || 0) + (B.stone || 0) > 14; return '<div class="kind">' + lookCanvas(kindLook(k, 0), 64, { scale: 1 }) + '<b>' + esc(k) + '</b><span>' + (B.wood || 0) + ' wood, ' + (B.stone || 0) + ' stone' + (big ? ' · a great work' : '') + (B.way ? '<br>way of ' + esc(B.way) : '') + '<br>' + (tb[k] || 0) + ' built' + (B.maker ? ' · added by the maker' : '') + '</span></div>'; }).join('') + '</div>';
    h += '<h3>Things made and done <small>' + Object.keys(L.recipes || {}).length + '</small></h3><ul class="events">' + Object.keys(L.recipes || {}).map(function (k) { const R = L.recipes[k], G = R.gives && R.gives.thing && L.goods && L.goods[R.gives.thing]; return '<li><b>' + esc(k) + '</b>' + (R.way ? ' <span class="muted">way of ' + esc(R.way) + '</span>' : '') + (G ? ' <span class="muted">' + (G.float ? 'vessel' : G.fight ? 'for war' : 'carries') + '</span>' : '') + ' · done ' + (tm[k] || 0) + ' times' + (held[R.gives && R.gives.thing] ? ' · ' + held[R.gives.thing] + ' held' : '') + '<br><span class="muted">' + esc(R.hint || '') + '</span></li>'; }).join('') + '</ul>'; }
  const pane = $('pane-kinds'); pane.innerHTML = h; paintPending(pane);
}

/* ---------- the story of the world, and the maker's notebook ---------- */
function renderStory() {
  const S = st.story, key = (S.rev || 0) + ':' + (SWK.busy || '') + ':' + SW.day(w) + ':' + (SWK.error || '');
  if (U.keys.story === key) return; U.keys.story = key;
  let h = '<h2>The story so far</h2><p class="note">A chronicler stands outside the world and, every ' + st.settings.story.every + ' days, writes the next chapter from the whole record: what was done, said and thought. It may use only what happened.</p>' +
    '<div class="row"><button class="btn" data-act="storynow"' + (SWK.busy ? ' disabled' : '') + '>' + (SWK.busy === 'story' ? 'Writing…' : 'Write the next chapter now') + '</button></div>';
  if (SWK.error) h += '<p class="note">' + esc(SWK.error) + '</p>';
  if (S.trends.length) h += '<h3>Trends</h3><ul class="events">' + S.trends.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  if (S.threads.length) h += '<h3>Threads</h3>' + S.threads.map(function (t) { return '<div class="mk"><b>' + esc(t.name) + '</b> <span class="v">' + esc(t.kind) + '</span><div class="q">' + esc(t.text) + '</div></div>'; }).join('');
  h += S.chapters.length ? S.chapters.slice().reverse().map(function (c) { return '<h3>' + c.n + '. ' + esc(c.title) + ' <small>days ' + c.day0 + ' to ' + c.day1 + '</small></h3><p class="chapter">' + esc(c.text) + '</p>'; }).join('') : '<p class="muted">No chapter yet. The first is written on day ' + (1 + st.settings.story.every) + ' while the minds are awake, or press the button.</p>';
  const n = SWK.stats(st), kv = function (o) { return Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + ' <b>' + o[k] + '</b>'; }).join(' · ') || 'none'; };
  h += '<h3>The numbers <small>day ' + n.day + ', ' + n.season + '</small></h3><div class="nums">alive <b>' + n.alive + '</b> (children <b>' + n.children + '</b>, elders <b>' + n.elders + '</b>) · ever lived <b>' + n.everBorn + '</b> · died <b>' + n.deaths + '</b>' + (n.deaths ? ' (' + kv(n.deathCauses) + ')' : '') +
    '<br>energy, middle being <b>' + n.energyMedian + '</b> · lowest health <b>' + n.healthLowest + '</b> · sick <b>' + n.sick + '</b><br>bonds <b>' + n.bonds + '</b>: warm <b>' + n.bondsWarm + '</b>, hostile <b>' + n.bondsHostile + '</b> · following a leader <b>' + n.following + '</b> · bands ' + (n.bands.length ? '<b>' + esc(n.bands.join(', ')) + '</b>' : '<b>none</b>') +
    '<br>homes <b>' + n.settlements + '</b> · shelters <b>' + n.shelters + '</b> · stores <b>' + n.stores + '</b> · walls <b>' + n.walls + '</b> · wars <b>' + n.warsEver + '</b> (open <b>' + n.warsOpen + '</b>) · places of power <b>' + n.sites + '</b><br>ways known: ' + kv(n.waysKnown) + '<br>made designs <b>' + n.designs + '</b> · highest lore <b>' + n.loreHighest + '</b> · who can work the world <b>' + n.withArts + '</b>' +
    '<br>so far: ' + kv(n.events) + '<br>land: plants <b>' + n.plants + '</b>, food standing <b>' + n.foodStanding + '</b> · animals: ' + kv(n.creatures) + '<br>minds: thoughts <b>' + n.minds.thoughts + '</b>, going in circles <b>' + n.minds.circling + '%</b></div>';
  const pane = $('pane-story'), keep = pane.scrollTop; pane.innerHTML = h; pane.scrollTop = keep;
}
/* ---------- culture: what each people makes, holds and hands on, and how it spreads ---------- */
const CULT_KINDS = { myth: 'Myths', tale: 'Tales', song: 'Songs', poem: 'Poems', belief: 'Teachings', saying: 'Sayings', lesson: 'Lessons from what befell', way: 'Ways' };
function peopleDot(i) { const P = (w.peoples || [])[i]; return '<i class="pdot" style="background:' + (P ? 'hsl(' + (P.hue != null ? P.hue : (i * 97) % 360) + ' 55% 58%)' : 'var(--muted)') + '"></i>'; }
function peopleName(i) { const P = (w.peoples || [])[i]; return P ? P.name : 'no people'; }
function sparkOf(C, id, wd, hg) {
  const pts = C.days.map(function (r) { return r.n[id] || 0; }); if (pts.length < 2) return '';
  const mx = Math.max.apply(null, pts.concat([1])), n = pts.length, path = pts.map(function (v, i) { return (i ? 'L' : 'M') + (i / (n - 1) * (wd - 2) + 1).toFixed(1) + ' ' + (hg - 2 - v / mx * (hg - 4)).toFixed(1); }).join(' ');
  return '<svg width="' + wd + '" height="' + hg + '" viewBox="0 0 ' + wd + ' ' + hg + '" aria-hidden="true"><path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round"/></svg>';
}
function renderCulture() {
  const C = w.culture || { items: {}, log: [], days: [], rites: {} }, day = SW.day(w), view = U.cultV || 'peoples', pf = U.cultP == null ? null : U.cultP;
  const key = (C.rev || 0) + ':' + day + ':' + view + ':' + pf + ':' + (w.relics || []).length + ':' + w.agents.length;
  if (U.keys.culture === key) return; U.keys.culture = key;
  const live = {}, items = []; for (const id in C.items) { const it = C.items[id]; live[id] = SWM.cultLive(st, it); items.push(it); }
  const cnt = {}; items.forEach(function (it) { if (live[it.id].n) cnt[it.kind] = (cnt[it.kind] || 0) + 1; });
  const crossed = C.log.filter(function (e) { return e.k === 'crossed'; }).length, P = w.peoples || [];
  let h = '<h2>Culture</h2><p class="note">What each people makes, holds and hands on: its myths, tales, songs and poems, its teachings, sayings and hard lessons, the ways it knows and what it calls them, the things it does together, and the things it prizes. Every idea is followed from the one who first held it to everyone who holds it now.</p>';
  h += '<div class="nums">ideas held by the living <b>' + items.filter(function (it) { return live[it.id].n; }).length + '</b>: ' + (Object.keys(CULT_KINDS).filter(function (k) { return cnt[k]; }).map(function (k) { return CULT_KINDS[k].toLowerCase() + ' <b>' + cnt[k] + '</b>'; }).join(' · ') || 'none yet') +
    '<br>teachings with followers <b>' + Object.keys(w.faiths || {}).filter(function (k) { return w.faiths[k].n > 1; }).length + '</b> · prized things made <b>' + (w.relics || []).length + '</b> · ideas that crossed between peoples <b>' + crossed + '</b></div>';
  h += '<div class="cseg" role="group" aria-label="View">' + [['peoples', 'By people'], ['spread', 'How ideas spread'], ['between', 'Between peoples'], ['time', 'As it happened']].map(function (v) { return '<button data-act="cultv" data-id="' + v[0] + '" aria-pressed="' + (view === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div>';
  const holdersLine = function (it) { const lv = live[it.id], ps = Object.keys(lv.p); return 'held by <b>' + lv.n + '</b>' + (ps.length > 1 || (ps.length === 1 && +ps[0] !== it.people) ? ' (' + ps.map(function (p) { return peopleDot(+p) + esc(peopleName(+p)) + ' ' + lv.p[p]; }).join(', ') + ')' : '') + (it.tellings ? ' · passed on ' + it.tellings + ' time' + (it.tellings > 1 ? 's' : '') : '') + (it.changed ? ' · changed in the telling ' + it.changed + ' time' + (it.changed > 1 ? 's' : '') : '') + (it.depth > 1 ? ' · ' + it.depth + ' mouths from its maker' : ''); };
  const variant = function (it) { for (const hid in it.holders) { const m = st.minds[hid]; if (!m || m.dead || +hid === it.byId) continue; const t = (m.tales || []).filter(function (q) { return q.cid === it.id; })[0]; if (t && t.text !== it.text) return '<div class="alt">As ' + esc(st.names[hid] || 'another') + ' tells it now: “' + esc(t.text) + '”</div>'; } return ''; };
  const card = function (it, p) { return '<div class="idea ' + it.kind + '"><div class="t"><span class="tag">' + esc(it.kind) + '</span>' + esc(it.title) + '</div><div class="m">' + (it.by ? 'first from ' + (it.byId != null ? nameLink(it.byId) : esc(it.by)) : 'older than memory') + ', day ' + it.day + (it.about ? ' · about ' + esc(it.about) : '') + (p != null && it.people != null && it.people !== p ? ' · came from ' + peopleDot(it.people) + esc(peopleName(it.people)) : '') + '</div>' + (it.text && it.kind !== 'lesson' && it.kind !== 'saying' ? '<blockquote>“' + esc(it.text) + '”</blockquote>' : '') + (['tale', 'song', 'poem', 'myth'].indexOf(it.kind) >= 0 ? variant(it) : '') + '<div class="m">' + holdersLine(it) + '</div></div>'; };
  if (view === 'peoples') {
    h += '<div class="cseg" role="group" aria-label="People"><button data-act="cultp" data-id="all" aria-pressed="' + (pf == null) + '">All</button>' + P.map(function (p, i) { return '<button data-act="cultp" data-id="' + i + '" aria-pressed="' + (pf === i) + '">' + peopleDot(i) + esc(p.name) + '</button>'; }).join('') + '</div>';
    P.forEach(function (p, i) {
      if (pf != null && pf !== i) return;
      const mem = w.agents.filter(function (a) { return a.people === i; }), mine = items.filter(function (it) { return live[it.id].p[i] || (it.people === i && live[it.id].n === 0 && it.kind !== 'lesson' && it.kind !== 'way'); });
      h += '<h3>' + peopleDot(i) + esc(p.name) + ' <small>' + esc(p.noun || '') + ' · ' + mem.length + ' living' + (w.regions[p.region] ? ' · ' + esc(w.regions[p.region].name) : '') + '</small></h3>';
      if (p.custom) h += '<div class="idea"><div class="t"><span class="tag">custom</span>Held since before memory</div><blockquote>“' + esc(p.custom) + '”</blockquote></div>';
      const sect = function (title, list, max) { if (!list.length) return ''; list.sort(function (x, y) { return live[y.id].n - live[x.id].n || y.day - x.day; }); return '<div class="m" style="margin:12px 0 6px;font-weight:600;color:var(--text)">' + title + '</div>' + list.slice(0, max).map(function (it) { return card(it, i); }).join('') + (list.length > max ? '<p class="muted">and ' + (list.length - max) + ' more</p>' : ''); };
      const got = sect('Teachings', mine.filter(function (it) { return it.kind === 'belief'; }), 6) + sect('Myths, tales, songs and poems', mine.filter(function (it) { return ['myth', 'tale', 'song', 'poem'].indexOf(it.kind) >= 0; }), 10);
      h += got;
      const say = mine.filter(function (it) { return (it.kind === 'saying' || it.kind === 'lesson') && live[it.id].p[i]; }).sort(function (x, y) { return live[y.id].p[i] - live[x.id].p[i] || y.day - x.day; });
      if (say.length) h += '<div class="m" style="margin:12px 0 6px;font-weight:600;color:var(--text)">Sayings and hard lessons</div><ul class="tl">' + say.slice(0, 8).map(function (it) { return '<li>“' + esc(it.text) + '” <span class="muted">· ' + (it.kind === 'saying' && it.by ? 'from ' + esc(it.by) + ' · ' : '') + 'day ' + it.day + ' · held by ' + live[it.id].p[i] + ' of ' + mem.length + '</span></li>'; }).join('') + '</ul>';
      const ways = {}; mem.forEach(function (a) { for (const k in a.knows) { const q = ways[k] = ways[k] || { n: 0, names: {}, first: null }; q.n++; const nm = a.knows[k].name; if (nm && nm !== k) q.names[nm] = 1; if (a.knows[k].byName && !q.first) q.first = a.knows[k].byName; } });
      const wk = Object.keys(ways).sort(function (x, y) { return ways[y].n - ways[x].n; });
      if (wk.length) h += '<div class="m" style="margin:12px 0 6px;font-weight:600;color:var(--text)">Ways they know, and what they call them</div><ul class="tl">' + wk.map(function (k) { const q = ways[k], nm = Object.keys(q.names); return '<li><b>' + esc(k) + '</b>' + (nm.length ? ': “' + nm.slice(0, 3).map(esc).join('”, “') + '”' : '') + ' <span class="muted">· known by ' + q.n + ' of ' + mem.length + (q.first ? ' · first found by ' + esc(q.first) : ' · older than memory') + '</span></li>'; }).join('') + '</ul>';
      const R = (C.rites || {})[i]; if (R && Object.keys(R).length) h += '<div class="m" style="margin:12px 0 6px;font-weight:600;color:var(--text)">Things they do together</div><ul class="tl">' + Object.keys(R).sort(function (x, y) { return R[y].n - R[x].n; }).map(function (k) { return '<li><b>' + esc(k) + '</b> <span class="muted">· ' + R[k].n + ' time' + (R[k].n > 1 ? 's' : '') + ' · first by ' + esc(R[k].by || '?') + ' on day ' + R[k].first + (w.laws.recipes[k] && w.laws.recipes[k].hint ? ' · ' + esc(String(w.laws.recipes[k].hint).slice(0, 90)) : '') + '</span></li>'; }).join('') + '</ul>';
      const rel = (w.relics || []).filter(function (r) { return r.people === i; });
      if (rel.length) h += '<div class="m" style="margin:12px 0 6px;font-weight:600;color:var(--text)">Things they prize</div>' + rel.slice(-8).reverse().map(function (r) { return '<div class="idea thing"><div class="t"><span class="tag">made</span>' + esc(r.kind) + '</div><div class="m">made by ' + esc(r.byName) + ' on day ' + r.day + (r.passes.length ? r.passes.map(function (q) { return ' → given to ' + esc(q.to) + (q.people !== i ? ' of ' + esc(peopleName(q.people)) : '') + ' (day ' + q.day + ')'; }).join('') : '') + ' · now with ' + esc(r.holderName) + (agentOf(r.holder) ? '' : ' (dead)') + (w.laws.goods[r.kind] && w.laws.goods[r.kind].hint ? ' · ' + esc(w.laws.goods[r.kind].hint) : '') + '</div></div>'; }).join('');
      if (!got && !say.length && !rel.length && !(R && Object.keys(R).length)) h += '<p class="muted">Nothing of their own making yet beyond what they woke with.</p>';
    });
    const works = {}; for (const i in w.bkind) { const k = w.bkind[i]; if (['statue', 'pyramid', 'temple', 'stone', 'shrine', 'moot', 'observatory', 'library', 'school'].indexOf(k) >= 0) works[k] = (works[k] || 0) + 1; }
    if (Object.keys(works).length || (w.marks || []).length) h += '<h3>Works and marks on the land</h3><div class="nums">' + (Object.keys(works).map(function (k) { return esc(k) + ' <b>' + works[k] + '</b>'; }).join(' · ') || 'no monuments') + ' · marks left <b>' + (w.marks || []).length + '</b>' + ((w.marks || []).length ? '<br>' + w.marks.slice(-4).map(function (m) { return '“' + esc(String(m.text || '').slice(0, 110)) + '”' + (m.name ? ' <span class="muted">(' + esc(m.name) + ')</span>' : ''); }).join('<br>') : '') + '</div>';
  } else if (view === 'spread') {
    const rows = items.filter(function (it) { return Object.keys(it.holders).length >= 2 || (live[it.id].n && it.kind !== 'lesson' && it.kind !== 'way'); }).sort(function (x, y) { return live[y.id].n - live[x.id].n || Object.keys(y.holders).length - Object.keys(x.holders).length; });
    h += '<p class="note">Each line is one idea. The curve is how many of the living held it on each day; the dots are the peoples it has reached. An idea dies when the last one who holds it does.</p>';
    h += rows.length ? '<table class="spread"><tbody>' + rows.slice(0, 40).map(function (it) { const ever = Object.keys(it.holders).length, peak = Math.max.apply(null, C.days.map(function (r) { return r.n[it.id] || 0; }).concat([live[it.id].n])); return '<tr><td><span class="tag">' + esc(it.kind) + '</span>' + esc(it.title.slice(0, 46)) + '<div class="muted" style="font-size:11.5px">' + (it.by ? esc(it.by) : 'older than memory') + ', day ' + it.day + ' · ' + Object.keys(it.reach).map(function (p) { return peopleDot(+p); }).join('') + '</div></td><td>' + sparkOf(C, it.id, 84, 22) + '</td><td class="n"><b style="color:var(--text)">' + live[it.id].n + '</b> now<br>' + peak + ' peak · ' + ever + ' ever</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">No idea has passed from one being to another yet.</p>';
  } else if (view === 'between') {
    h += '<h3>How much of each other they understand</h3>';
    h += P.length > 1 ? '<ul class="tl">' + P.map(function (p, i) { return P.map(function (q, j) { if (i === j) return ''; const mem = w.agents.filter(function (a) { return a.people === i; }); if (!mem.length) return ''; const u = mem.reduce(function (sm, a) { return sm + SW.understands(a, q.tongue != null ? q.tongue : j); }, 0) / mem.length, best = mem.slice().sort(function (x, y) { return SW.understands(y, q.tongue != null ? q.tongue : j) - SW.understands(x, q.tongue != null ? q.tongue : j); })[0]; return '<li>' + peopleDot(i) + esc(p.name) + ' understand ' + peopleDot(j) + esc(q.name) + ': <b>' + Math.round(u * 100) + '%</b> <span class="muted">· best ' + esc(best.name) + ' ' + Math.round(SW.understands(best, q.tongue != null ? q.tongue : j) * 100) + '%</span></li>'; }).join(''); }).join('') + '</ul>' : '<p class="muted">One people only.</p>';
    const T = w.tally || {}, met = T.met || [];
    h += '<h3>What has passed between them</h3><div class="nums">meetings <b>' + met.length + '</b> · gifts across <b>' + (T.crossGifts || 0) + '</b> · things done together <b>' + (T.crossActs || 0) + '</b> · ideas crossed <b>' + crossed + '</b> · children of two peoples <b>' + w.agents.filter(function (a) { return a.mixed; }).length + '</b></div>';
    const cx = C.log.filter(function (e) { return e.k === 'crossed'; });
    if (cx.length) h += '<ul class="tl">' + cx.slice(-20).reverse().map(function (e) { return '<li><span class="d">day ' + e.day + '</span>the ' + esc(e.kind) + ' <b>“' + esc(e.title) + '”</b> of ' + peopleDot(e.of) + esc(peopleName(e.of)) + ' reached ' + peopleDot(e.people) + esc(peopleName(e.people)) + ', through ' + esc(e.who) + (e.from ? ', from ' + esc(e.from) : '') + '</li>'; }).join('') + '</ul>';
    if (met.length) h += '<h3>First meetings</h3><ul class="tl">' + met.slice(-12).reverse().map(function (m) { return '<li><span class="d">day ' + m.day + '</span>' + esc(m.a) + ' and ' + esc(m.b) + ' <span class="muted">in ' + esc(m.land || 'the land') + '</span></li>'; }).join('') + '</ul>';
    const xr = (w.relics || []).filter(function (r) { return r.passes.some(function (q) { return q.people !== r.people; }); });
    if (xr.length) h += '<h3>Prized things that changed peoples</h3><ul class="tl">' + xr.slice(-10).map(function (r) { return '<li><b>' + esc(r.kind) + '</b> of ' + esc(r.byName) + ' → ' + r.passes.map(function (q) { return esc(q.to) + ' (day ' + q.day + ')'; }).join(' → ') + '</li>'; }).join('') + '</ul>';
    if (!cx.length && !met.length) h += '<p class="muted">The peoples have not yet met.</p>';
  } else {
    const words = { made: 'arose', passed: 'was passed on', crossed: 'crossed to another people', retold: 'was retold in new words', rite: 'was first done', left: 'was given up' };
    h += C.log.length ? '<ul class="tl">' + C.log.slice(-80).reverse().map(function (e) { return '<li><span class="d">day ' + e.day + '</span>' + (e.people != null && e.people >= 0 ? peopleDot(e.people) : '') + (e.k === 'rite' ? 'the shared act <b>“' + esc(e.title) + '”</b> was first done, by ' + esc(e.who || '?') : 'the ' + esc(e.kind) + ' <b>“' + esc(String(e.title).slice(0, 70)) + '”</b> ' + words[e.k] + (e.k === 'made' ? (e.who ? ' with ' + esc(e.who) : '') : e.k === 'passed' ? ' from ' + esc(e.from) + ' to ' + esc(e.who) + (e.changed ? ', and changed in the telling' : '') : e.k === 'crossed' ? ': ' + esc(e.who) + ' of ' + esc(peopleName(e.people)) + ' now holds it' : ' by ' + esc(e.who || '?'))) + '</li>'; }).join('') + '</ul>' : '<p class="muted">Nothing yet. Culture begins when someone makes a tale, a teaching or a thing worth keeping, or learns from what befell another.</p>';
  }
  const pane = $('pane-culture'), keep = pane.scrollTop; pane.innerHTML = h; pane.scrollTop = keep;
}
function renderMaker() {
  const Mk = SWK.ensure(st), C = st.settings.maker, key = (Mk.rev || 0) + ':' + (SWK.busy || '') + ':' + C.on + ':' + (SWK.error || '') + ':' + st.story.chapters.length;
  if (U.keys.maker === key) return; U.keys.maker = key;
  const model = (SWM.MODELS.filter(function (m) { return m.id === C.model; })[0] || { label: C.model }).label;
  let h = '<h2>The maker</h2><p class="note">A mind outside the world (' + esc(model) + ') that reads the story and the numbers every ' + C.every + ' days and changes the world while it runs: laws, plants, animals, what foods and places do, what can be made and done, the ways of knowledge. Each change is first lived through on a copy of the world, written down with a prediction, and kept or undone at its next visit. It never tells the beings anything.</p>' +
    '<div class="row"><button class="btn" data-act="makernow"' + (SWK.busy ? ' disabled' : '') + '>' + (SWK.busy === 'maker' ? 'Looking…' : 'Let the maker look now') + '</button><button class="btn" data-act="makertoggle">' + (C.on ? 'Maker is on: turn off' : 'Maker is off: turn on') + '</button></div>';
  if (!st.story.chapters.length) h += '<p class="note">The maker waits for the first chapter of the story before its first visit.</p>';
  if (SWK.error) h += '<p class="note">' + esc(SWK.error) + '</p>';
  if (Mk.seen) h += '<h3>What it last saw</h3><p class="chapter">' + esc(Mk.seen) + '</p>';
  {
    const L = w.laws, tm = (w.tally && w.tally.made) || {}, te = (w.tally && w.tally.eaten) || {}, tb = (w.tally && w.tally.built) || {};
    /* what became of one change: is the thing still in the world, and has anyone used it */
    const fate = function (o) {
      let m;
      if ((m = /^recipe "([^"]+)"/.exec(o))) return L.recipes && L.recipes[m[1]] ? 'in the world · done ' + (tm[m[1]] || 0) + ' times' : 'no longer in the world';
      if ((m = /^new plant (\S+)/.exec(o))) { let n = 0; for (let i = 0; i < w.plants.length; i++) if (w.plants[i] && w.plants[i].sp === m[1]) n++; return L.plants[m[1]] ? 'in the world · ' + n + ' growing · eaten ' + (te[m[1]] || 0) + ' times' : 'no longer in the world'; }
      if ((m = /^new animal (\S+)/.exec(o))) return L.creatures[m[1]] ? 'in the world · ' + w.creatures.filter(function (c) { return c.sp === m[1]; }).length + ' alive' : 'no longer in the world';
      if ((m = /^new kind of building: (\S+)/.exec(o))) return L.buildings[m[1]] ? 'in the world · ' + (tb[m[1]] || 0) + ' built' : 'no longer in the world';
      if ((m = /^new way (\S+)/.exec(o))) return L.tree[m[1]] ? 'in the world · known to ' + w.agents.filter(function (a) { return a.knows[m[1]]; }).length : 'no longer in the world';
      if ((m = /^(?:\w+ )?"([^"]+)" at \(/.exec(o)) || (m = /^mix "([^"]+)"/.exec(o))) { const q = (w.sites || []).filter(function (z) { return z.name === m[1]; })[0]; if (q) return 'in the world · found by ' + w.agents.filter(function (a) { return a.met && a.met[q.id] != null; }).length; return (L.mixes || []).some(function (x) { return x.name === m[1]; }) ? 'in the world' : ''; }
      if ((m = /^law (\w+)\.(\w+): (\S+) → (\S+)/.exec(o))) return L[m[1]] && String(L[m[1]][m[2]]) === m[4] ? 'still set to ' + m[4] : 'now ' + (L[m[1]] ? L[m[1]][m[2]] : '?');
      if ((m = /^new mineral (\S+)/.exec(o))) return L.minerals[m[1]] ? 'in the world' : 'no longer in the world';
      return '';
    };
    const word = { kept: 'Kept', undone: 'Undone', pending: 'Awaiting review', nothing: 'Changed nothing' }, col = { kept: 'var(--life)', undone: 'var(--harm)', pending: 'var(--accent)', nothing: 'var(--muted)' };
    const tallyV = { kept: 0, undone: 0, pending: 0 }; Mk.log.forEach(function (e) { if (tallyV[e.verdict] != null) tallyV[e.verdict] += e.ops.length; });
    h += '<h3>Its visits <small>' + Mk.log.length + '</small></h3><p class="note">Changes kept: <b>' + tallyV.kept + '</b> · undone: <b>' + tallyV.undone + '</b> · awaiting review: <b>' + tallyV.pending + '</b>. Newest visit first. Each card says what the maker saw, what it changed, what it expected, and what it concluded at its next visit. The line under each change shows what has become of it since.</p>' + (Mk.log.length ? Mk.log.slice().reverse().map(function (e) {
      const sec = function (label, text) { return text ? '<div style="margin-top:8px"><div class="muted" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase">' + label + '</div><div>' + esc(text) + '</div></div>' : ''; };
      return '<div class="mk" style="border-left:3px solid ' + (col[e.verdict] || 'var(--muted)') + ';padding-left:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>' + (e.id === 0 ? 'Inherited from earlier worlds' : 'Visit ' + e.id) + ' · day ' + e.day + '</b><span style="color:' + (col[e.verdict] || 'var(--muted)') + ';font-weight:700">' + (word[e.verdict] || esc(e.verdict)) + '</span></div>' +
        sec('What it saw', e.seen) +
        (e.ops.length ? '<div style="margin-top:8px"><div class="muted" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase">What it changed</div><ul style="margin:4px 0 0 18px;padding:0">' + e.ops.map(function (o) { const f = e.verdict === 'undone' ? 'undone at review' : fate(o); return '<li>' + esc(o) + (f ? '<div class="muted" style="font-size:12px">' + esc(f) + '</div>' : '') + '</li>'; }).join('') + '</ul></div>' : '') +
        (e.refused.length ? sec('Refused by the world', e.refused.join('; ')) : '') + sec('What it expected', e.predict) + sec(e.verdict === 'pending' ? '' : 'What it concluded at its next visit', e.why) + '</div>';
    }).join('') : '<p class="muted">It has not visited yet.</p>');
  }
  if (Mk.lessons.length) h += '<h3>What it has learned</h3><ul class="events">' + Mk.lessons.slice().reverse().map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  if (Mk.requests.length) h += '<h3>Its requests to the programmer</h3><ul class="events">' + Mk.requests.slice().reverse().map(function (q) { return '<li><span class="muted">day ' + q.day + '</span> ' + esc(q.text) + '</li>'; }).join('') + '</ul>';
  h += '<h3>Its ideas <small>your roadmap first, then its own</small></h3>' + Mk.ideas.map(function (q) { return '<div class="idea ' + q.status + '">' + (q.status === 'done' ? '✓ ' : '') + esc(q.text) + (q.by === 'maker' ? ' <span class="muted">(its own, day ' + q.day + ')</span>' : '') + '</div>'; }).join('');
  const pane = $('pane-maker'), keep = pane.scrollTop; pane.innerHTML = h; pane.scrollTop = keep;
}

/* ---------- instruments: who feels what toward whom, and who descends from whom ---------- */
const bondHits = [];
function drawBonds() {
  const c = $('bonds'); if (!c) return;
  const r = c.getBoundingClientRect(), g = c.getContext('2d'), d = Math.min(2, window.devicePixelRatio || 1);
  c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0);
  const Wd = r.width, Hd = r.height, ags = w.agents.slice().sort(function (p, q) { return SW.rootOf(w, p).id - SW.rootOf(w, q).id || p.id - q.id; });
  bondHits.length = 0;
  if (!ags.length) return;
  const cxm = Wd / 2, cym = Hd / 2, R = Math.min(Wd, Hd) / 2 - 34, pos = {};
  ags.forEach(function (a, i) { const an = i / ags.length * 6.2832 - 1.5708; pos[a.id] = { x: cxm + Math.cos(an) * R, y: cym + Math.sin(an) * R, an: an }; });
  g.lineCap = 'round';
  ags.forEach(function (a) {
    for (const id in a.rel) {
      const v = a.rel[id], q = pos[id]; if (!q || Math.abs(v) < 0.15) continue;
      const p = pos[a.id], mx = (p.x + q.x) / 2 * 0.72 + cxm * 0.28, my = (p.y + q.y) / 2 * 0.72 + cym * 0.28;
      /* each being draws its own half of the line: how IT feels */
      g.strokeStyle = v > 0 ? 'rgba(111,211,139,' + Math.min(0.9, 0.25 + v * 0.7) + ')' : 'rgba(239,106,91,' + Math.min(0.9, 0.25 - v * 0.7) + ')';
      g.lineWidth = 1 + Math.abs(v) * 3.2;
      g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo((p.x + mx) / 2 * 0.9 + cxm * 0.1, (p.y + my) / 2 * 0.9 + cym * 0.1, mx, my); g.stroke();
    }
    if (a.leader != null && pos[a.leader]) { const p = pos[a.id], q = pos[a.leader]; g.strokeStyle = 'rgba(242,184,75,0.75)'; g.lineWidth = 1.2; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); g.setLineDash([]); }
  });
  ags.forEach(function (a) {
    const p = pos[a.id], bd = bandCache[a.id];
    g.fillStyle = '#101920'; g.beginPath(); g.arc(p.x, p.y, 15, 0, 6.2832); g.fill();
    g.strokeStyle = bd ? bd.color : '#3a4c55'; g.lineWidth = U.sel && U.sel.id === a.id ? 3 : 1.6; g.stroke();
    drawLook(g, a.look, p.x, p.y + 2, 26, { phase: a.id });
    g.fillStyle = '#e6eee9'; g.font = '600 11px "Instrument Sans", sans-serif'; g.textAlign = Math.cos(p.an) > 0.3 ? 'left' : Math.cos(p.an) < -0.3 ? 'right' : 'center';
    g.fillText(a.name, p.x + Math.cos(p.an) * 20, p.y + Math.sin(p.an) * 22 + 4);
    bondHits.push({ id: a.id, x: p.x, y: p.y });
  });
}
function familyHtml() {
  const ms = Object.keys(st.minds).map(function (id) { return st.minds[id]; }), kids = {};
  ms.forEach(function (m) { (m.parents || []).forEach(function (p) { (kids[p] = kids[p] || []).push(m); }); });
  const line = function (m, depth, via) {
    const alive = !!agentOf(m.id), mate = via != null ? (m.parents || []).filter(function (p) { return p !== via; })[0] : null;
    let h = '<div class="kin" style="margin-left:' + depth * 16 + 'px">' + (depth ? '<span class="muted">└ </span>' : '') + '<button class="link" data-act="sel" data-id="' + m.id + '">' + esc(m.name) + '</button>' + (alive ? '' : ' <span class="muted">† ' + esc(m.cause || '') + '</span>') + (mate != null ? ' <span class="muted">with ' + esc(st.names[mate] || '?') + '</span>' : '') + '</div>';
    (kids[m.id] || []).forEach(function (k) { if (k.parents[0] === m.id) h += line(k, depth + 1, m.id); });
    return h;
  };
  const tops = ms.filter(function (m) { return !(m.parents || []).length && (kids[m.id] || []).length; });
  return tops.length ? tops.map(function (m) { return line(m, 0, null); }).join('') : '<p class="muted">No children have been born yet. A child needs both parents to choose it.</p>';
}
function lineageHtml(table, label) {
  const reg = w.laws[table], names = Object.keys(reg), kids = {};
  names.forEach(function (n) { const f = reg[n].from; if (f && reg[f]) (kids[f] = kids[f] || []).push(n); });
  const line = function (n, depth) {
    const d = reg[n];
    let h = '<div class="kin" style="margin-left:' + depth * 16 + 'px">' + (depth ? '<span class="muted">└ </span>' : '') + '<b>' + esc(n) + '</b> <span class="muted">' + label(d) + '</span></div>';
    (kids[n] || []).forEach(function (k) { h += line(k, depth + 1); });
    return h;
  };
  const tops = names.filter(function (n) { return (!reg[n].from || !reg[reg[n].from]) && (kids[n] || []).length; });
  return tops.map(function (n) { return line(n, 0); }).join('');
}

/* ---------- peoples: bands, their customs and how they stand toward each other ---------- */
function renderPeoples() {
  const key = Math.floor(U.time / 2) + ':' + w.agents.length + ':' + w.places.length + ':' + w.settlements.length + ':' + w.wars.length;
  if (U.keys.peoples === key) return; U.keys.peoples = key;
  const roots = {};
  w.agents.forEach(function (a) { const r = SW.rootOf(w, a); (roots[r.id] = roots[r.id] || { root: r, members: [] }).members.push(a); });
  const bands = Object.keys(roots).map(function (id) { return roots[id]; }).sort(function (p, q) { return q.members.length - p.members.length; });
  let h = '<h2>Peoples</h2><p class="muted">Bands form when beings pledge to a leader. A band can name itself, hold customs, and declare others ally or enemy. Click a name to go there.</p>';
  bands.filter(function (b) { return b.members.length > 1; }).forEach(function (b) {
    const r = b.root, col = SW.hslToHex(r.hue, 0.85, 0.6);
    h += '<div class="people" style="border-color:' + col + '"><h3 style="margin-top:0"><span style="color:' + col + ';letter-spacing:0;text-transform:none;font-size:15px;font-family:var(--display)">' + esc(r.bandName || r.name + "'s band") + '</span><small>' + b.members.length + ' members</small></h3>' +
      '<div class="kv">Led by ' + nameLink(r.id) + ' · ' + b.members.filter(function (a) { return a !== r; }).map(function (a) { return nameLink(a.id); }).join(', ') + '</div>';
    if (r.customs.length) h += '<ol class="notes" style="margin-top:8px">' + r.customs.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ol>';
    w.settlements.filter(function (q) { return q.root === r.id; }).forEach(function (q) { h += '<div class="line jump" data-act="place" data-x="' + q.x + '" data-y="' + q.y + '"><span class="tag variety">home</span><span class="sp">' + esc(q.name) + '</span> <span class="muted">· ' + q.n + ' structures, since ' + esc(when(q.since).split(',')[0]) + '</span></div>'; });
    const st2 = Object.keys(r.stances).map(function (id) { const o = agentOf(+id); if (!o) return ''; const ob = SW.bandOf(w, o); return '<span class="tag ' + (r.stances[id] === 'enemy' ? 'fight' : 'gift') + '">' + r.stances[id] + '</span>' + esc(ob ? ob.name : o.name); }).filter(Boolean);
    if (st2.length) h += '<div class="kv">' + st2.join(' &nbsp; ') + '</div>';
    const ways = {}; b.members.forEach(function (a) { Object.keys(a.knows).forEach(function (k) { ways[k] = (ways[k] || 0) + 1; }); });
    if (Object.keys(ways).length) h += '<div class="kv">Knows: ' + Object.keys(ways).map(function (k) { return '<b>' + esc(k) + '</b> ' + ways[k] + '/' + b.members.length; }).join(' · ') + '</div>';
    h += '</div>';
  });
  const lone = bands.filter(function (b) { return b.members.length === 1; });
  if (lone.length) h += '<h3>Following no one <small>' + lone.length + '</small></h3><div class="kv">' + lone.map(function (b) { return nameLink(b.root.id); }).join(', ') + '</div>';
  if (w.wars.length) h += '<h3>Wars and truces</h3>' + w.wars.slice().reverse().map(function (q) {
    const days = Math.max(1, Math.round(((q.ended == null ? w.tick : q.ended) - q.since) / w.laws.time.dayLength));
    return '<div class="kin">' + (q.ended == null ? '<b style="color:#ef6a5b">at war</b> ' : '<span class="muted">over</span> ') + esc(q.aName) + ' against ' + esc(q.bName) + ' <span class="muted">· ' + days + (days === 1 ? ' day' : ' days') + ' · ' + q.dead + ' dead · ' + q.blows + ' blows' + (q.ended != null ? ' · ended with ' + esc(q.how) : '') + '</span></div>';
  }).join('');
  h += '<h3>Bonds <small>green trust, red enmity; each half of a line is one being\'s feeling</small></h3><canvas id="bonds" style="width:100%;height:330px;display:block;background:#0b1318;border-radius:10px;cursor:pointer"></canvas>';
  h += '<h3>Families</h3>' + familyHtml();
  if (w.places.length) h += '<h3>Named places</h3>' + w.places.slice().reverse().map(function (p) { return '<div class="line jump" data-act="place" data-x="' + p.x + '" data-y="' + p.y + '"><span class="sp">' + esc(p.name) + '</span> <span class="muted">· named by ' + esc(p.byName) + ', ' + esc(when(p.tick)) + '</span></div>'; }).join('');
  const keep = $('panel').querySelector('#pane-peoples').scrollTop;
  $('pane-peoples').innerHTML = h; $('pane-peoples').scrollTop = keep;
  drawBonds();
  $('bonds').onclick = function (e) { const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 22; bondHits.forEach(function (q) { const dd = Math.hypot(q.x - x, q.y - y); if (dd < bd) { bd = dd; best = q; } }); if (best) select({ t: 'agent', id: best.id }, true); };
}
/* ---------- ways: what the world allows, and what each being made of it ---------- */
function renderWays() {
  const key = Math.floor(U.time / 2) + ':' + w.inventions.length + ':' + Object.keys(w.laws.tools).length;
  if (U.keys.ways === key) return; U.keys.ways = key;
  const T2 = w.laws.tree, eras = {}, ERA = { 1: 'The first age: the wild', 2: 'The second age: settled', 3: 'The third age: metal and cities', 4: 'The fourth age: machines', 5: 'The fifth age: beyond', 6: 'Later still' };
  let found = 0, total = 0, reach = 1;
  for (const id in T2) { const e = T2[id].era || 1; (eras[e] = eras[e] || []).push(id); total++; if (w.agents.some(function (a) { return a.knows[id]; })) { found++; reach = Math.max(reach, e); } }
  let h = '<h2>Ways</h2><p class="muted">The world offers ways of doing things, in ages that build on each other. A way comes to one who has the understanding and has done enough of the work it grows from; it then spreads by teaching and by watching. Nothing is handed out, and the later ages are far.</p><p class="note">Found so far: <b>' + found + '</b> of ' + total + '. Furthest age reached: <b>' + reach + '</b>.</p>';
  Object.keys(eras).sort().forEach(function (e) {
    const ids = eras[e], known = ids.filter(function (id) { return w.agents.some(function (a) { return a.knows[id]; }); });
    h += '<h3>' + (ERA[e] || 'Age ' + e) + ' <small>' + known.length + ' of ' + ids.length + '</small></h3>';
    if (+e > reach + 1) { h += '<p class="muted">Still far off: ' + ids.map(esc).join(', ') + '.</p>'; return; }
    ids.forEach(function (id) {
      const n = T2[id], who = w.agents.filter(function (a) { return a.knows[id]; });
      const names = {}; who.forEach(function (a) { const k = a.knows[id]; (names[k.name] = names[k.name] || { by: k.byName, n: 0, look: k.look, idea: k.idea }).n++; });
      h += '<div class="way' + (who.length ? ' known' : '') + '"><b>' + esc(id) + '</b> <span class="muted">' + esc(n.tree) + (n.needs.length ? ' · after ' + n.needs.join(', ') : '') + ' · understanding ' + n.lore + ', ' + esc(n.stat) + ' ×' + n.n + (n.has ? ', holding ' + Object.keys(n.has).join(', ') : '') + (n.maker ? ' · added by the maker' : '') + '</span><div class="muted">' + esc(n.hint) + '</div>' +
        (who.length ? Object.keys(names).map(function (nm) { const q = names[nm]; return '<div class="kv">“<b>' + esc(nm) + '</b>”, from ' + esc(q.by) + ', known to ' + q.n + (q.idea ? '<br><i>' + esc(q.idea) + '</i>' : '') + '</div>'; }).join('') : '<div class="kv">No one has found this yet.</div>') + '</div>';
    });
  });
  const reg = w.laws.tools, dk = Object.keys(reg);
  h += '<h3>Made things <small>' + dk.length + ' designs</small></h3>' + (dk.length ? '<div class="kinds">' + dk.map(function (k) { const d = reg[k], holders = w.agents.filter(function (a) { return a.tools.some(function (q) { return q.k === k; }); }).length; return '<div class="kind">' + lookCanvas(toolLook(d), 56, { scale: 1.05 }) + '<b>' + esc(k) + '</b><span>' + (d.use === 'device' ? 'device: ' + d.rules.map(ruleWords).map(esc).join('; ') : d.use + ' ×' + d.power) + ' · by ' + esc(d.byName) + (d.from ? ' · from ' + esc(d.from) : '') + ' · ' + holders + ' carried</span></div>'; }).join('') + '</div>' : '<p class="muted">Nothing has been invented yet. Tools begin when someone who has worked enough with wood reflects deeply.</p>');
  const tl = lineageHtml('tools', function (d) { return d.use + (d.use === 'device' ? '' : ' ×' + d.power) + ' · ' + esc(d.byName); });
  if (tl) h += '<h3>Lines of descent <small>each bettering under what it bettered</small></h3>' + tl;
  const pane = $('pane-ways'); pane.innerHTML = h; paintPending(pane);
}

/* ---------- laws: the registry, open to the observer ---------- */
function renderLaws() {
  const L = w.laws, key = Object.keys(L.plants).join() + '|' + Object.keys(L.creatures).join() + '|' + w.edicts.length;
  if (U.keys.laws === key) return; U.keys.laws = key;
  const rows = function (obj, path) { return Object.keys(obj).filter(function (k) { return typeof obj[k] === 'number' && k !== 'by' && k !== 'predator'; }).map(function (k) { const id = 'law-' + (path + '.' + k).replace(/\W/g, '-'); return '<label for="' + id + '">' + esc(k) + '</label><input type="number" step="any" id="' + id + '" data-path="' + esc(path + '.' + k) + '" value="' + obj[k] + '">'; }).join(''); };
  let h = '<h2>Laws</h2>' + (w.edicts.length ? '<p class="note" style="border:1px solid var(--self)">' + w.edicts.map(function (e) { return '<b>A great working holds:</b> ' + esc(e.byName) + (e.name ? ' (“' + esc(e.name) + '”)' : '') + ' has bent <b>' + esc(e.path) + '</b> ×' + e.factor + ' for the whole world. It fades in ' + (e.until - w.tick) + ' moments.'; }).join('<br>') + '</p>' : '') + '<p class="note">These numbers <b>are</b> the world: the engine reads every one of them each moment. Change one and reality changes; the beings are not told, they only feel it. Beings who become masters can bend some of them for the whole world, for a time; you can change any of them outright.</p>';
  ['time', 'body', 'drives', 'age', 'land', 'water', 'weather', 'disease', 'fight', 'mate', 'build', 'craft', 'magic', 'mood', 'ecology'].forEach(function (g) { h += '<details class="grp"' + (g === 'body' ? ' open' : '') + '><summary>' + g + '</summary><div class="laws">' + rows(L[g], g) + '</div></details>'; });
  Object.keys(L.plants).forEach(function (n) { h += '<details class="grp"><summary>plant: ' + esc(n) + '</summary><div class="laws">' + rows(L.plants[n], 'plants.' + n) + '</div></details>'; });
  Object.keys(L.creatures).forEach(function (n) { h += '<details class="grp"><summary>animal: ' + esc(n) + '</summary><div class="laws">' + rows(L.creatures[n], 'creatures.' + n) + '</div></details>'; });
  $('pane-laws').innerHTML = h;
}
$('pane-laws').addEventListener('change', function (e) {
  const el = e.target; if (!el.dataset || !el.dataset.path) return;
  const v = parseFloat(el.value); if (!isFinite(v)) return;
  const parts = el.dataset.path.split('.'); let o = w.laws;
  for (let k = 0; k < parts.length - 1; k++) { o = o[parts[k]]; if (!o) return; }
  const old = o[parts[parts.length - 1]]; if (old === v) return;
  o[parts[parts.length - 1]] = v; el.classList.add('changed');
  SWM.chron(st, 'law', 'The Observer changed ' + el.dataset.path + ' from ' + old + ' to ' + v + '.', []);
  if (SWA.on) SWA.event('law', {});
});

/* ---------- settings ---------- */
function renderSettings() {
  if (U.keys.settings === 'built') return; U.keys.settings = 'built';
  const S = st.settings;
  const models = function (cur) { return SWM.MODELS.map(function (m) { return '<option value="' + m.id + '"' + (m.id === cur ? ' selected' : '') + '>' + esc(m.label) + '</option>'; }).join(''); };
  const efforts = function (cur) { return [['', 'model default'], ['low', 'low'], ['medium', 'medium'], ['high', 'high']].map(function (e) { return '<option value="' + e[0] + '"' + (e[0] === cur ? ' selected' : '') + '>' + e[1] + '</option>'; }).join(''); };
  $('pane-settings').innerHTML = '<h2>Settings</h2>' +
    '<p class="note">Each thought is one call to Claude on <b>your</b> account and counts against your usage. Minds only think while this page is open and awake, never faster than the pace below, and they stop at the budget.</p>' +
    '<h3>Everyday thoughts</h3><div class="form"><label for="setRM">Model<small>Fast and frequent: what to do next, what to say</small></label><select class="field" id="setRM">' + models(S.routine.model) + '</select><label for="setRE">Thinking effort</label><select class="field" id="setRE">' + efforts(S.routine.effort) + '</select></div>' +
    '<h3>Deep reflection</h3><div class="form"><label for="setDM">Model<small>Rare: rewriting reflexes, creed, memory and designs</small></label><select class="field" id="setDM">' + models(S.deep.model) + '</select><label for="setDE">Thinking effort</label><select class="field" id="setDE">' + efforts(S.deep.effort) + '</select>' +
    '<label for="setEvery">Reflect after every<small>everyday thoughts (sooner after a shock)</small></label><input type="number" id="setEvery" min="2" max="30" value="' + S.reflectEvery + '">' +
    '<label for="setFore">Foresight<small>Let a reflecting mind test new reflexes in an imagined copy of the world (costs extra calls)</small></label><select class="field" id="setFore"><option value="1"' + (S.foresight ? ' selected' : '') + '>on</option><option value="0"' + (S.foresight ? '' : ' selected') + '>off</option></select></div>' +
    '<h3>Pace and budget</h3><div class="form"><label for="setPM">Thoughts per minute<small>across all beings</small></label><input type="number" id="setPM" min="1" max="60" value="' + S.perMinute + '">' +
    '<label for="setPar">At the same time</label><input type="number" id="setPar" min="1" max="8" value="' + S.parallel + '">' +
    '<label for="setWait">The world waits for the minds<small>when there are more beings than Claude can think for in time, the clock slows so that each still thinks about this often; nothing in the world is cut</small></label><select class="field" id="setWait"><option value="1"' + (S.wait !== false ? ' selected' : '') + '>yes</option><option value="0"' + (S.wait === false ? ' selected' : '') + '>no, keep the clock steady</option></select>' +
    '<label for="setFocus">The world waits for<small>everyone, or only those you are looking at. Nothing is ever frozen: beings out of view go on living on their reflexes and think less than half as often, so the ones you watch get more of the thoughts and the clock runs faster</small></label><select class="field" id="setFocus"><option value="all"' + (S.focus !== 'view' ? ' selected' : '') + '>everyone</option><option value="view"' + (S.focus === 'view' ? ' selected' : '') + '>those in view</option></select>' +
    '<label for="setThink">Each being thinks about every<small>moments of the world (a day is 240)</small></label><input type="number" id="setThink" min="30" max="480" value="' + (S.thinkEvery || 90) + '">' +
    '<label for="setBudget">Thought budget<small>minds fall asleep when it is spent</small></label><input type="number" id="setBudget" min="5" max="100000" value="' + S.budget + '">' +
    '<label for="setAuto">Wake the minds when the page opens<small>and after it reloads, so a long run carries on by itself</small></label><select class="field" id="setAuto"><option value="1"' + (S.autoWake ? ' selected' : '') + '>yes</option><option value="0"' + (S.autoWake ? '' : ' selected') + '>no</option></select>' +
    '<label for="setEndless">Keep thinking past the budget<small>for long runs: the minds never fall asleep by themselves</small></label><select class="field" id="setEndless"><option value="0"' + (S.endless ? '' : ' selected') + '>no</option><option value="1"' + (S.endless ? ' selected' : '') + '>yes</option></select></div>' +
    '<div class="row"><button class="btn" data-act="preset" data-id="quick">Quick: Haiku + Sonnet</button><button class="btn" data-act="preset" data-id="rich">Rich: Sonnet + Sonnet high</button><button class="btn" data-act="preset" data-id="richest">Richest: Sonnet + Opus</button></div>' +
    '<h3>The chronicler and the maker <small>the outer loop</small></h3><div class="form"><label for="setStEvery">Write a chapter every<small>days. One call each, on the chronicler\'s model</small></label><input type="number" id="setStEvery" min="1" max="30" value="' + S.story.every + '"><label for="setStModel">Chronicler\'s model</label><select class="field" id="setStModel">' + models(S.story.model) + '</select>' +
    '<label for="setMkOn">The maker<small>Changes the world itself while it runs. See the Maker tab</small></label><select class="field" id="setMkOn"><option value="1"' + (S.maker.on ? ' selected' : '') + '>on</option><option value="0"' + (S.maker.on ? '' : ' selected') + '>off</option></select><label for="setMkEvery">Maker visits every<small>days. One large call each</small></label><input type="number" id="setMkEvery" min="1" max="30" value="' + S.maker.every + '"><label for="setMkModel">Maker\'s model</label><select class="field" id="setMkModel">' + models(S.maker.model) + '</select></div>' +
    '<h3>Run record <small>so Claude can read the whole run afterwards</small></h3><p class="note" id="recNote">' + recText() + '</p><div class="form"><label for="setRec">Record this run<small>Every thought, everything said, every event, and each being\'s state, kept with this artifact, where you and Claude can read it (and anyone you later share the artifact with)</small></label><select class="field" id="setRec"><option value="1"' + (S.record ? ' selected' : '') + '>on</option><option value="0"' + (S.record ? '' : ' selected') + '>off</option></select></div>' +
    '<div class="row"><button class="btn" data-act="recsend">Send everything now</button><button class="btn" data-act="recsave">Download run log</button></div>' +
    '<h3>Sound</h3><div class="form"><label for="setVol">Volume</label><input type="range" id="setVol" min="0" max="1" step="0.05" value="' + SWA.vol + '"></div>' +
    '<h3>World</h3><div class="form"><label for="setBounty">The land<small>How fast food grows back. Lean land makes beings compete</small></label><select class="field" id="setBounty">' + [[1, 'lush'], [0.7, 'fair'], [0.5, 'lean'], [0.3, 'harsh']].map(function (q) { return '<option value="' + q[0] + '"' + (Math.abs((w.laws.ecology.bounty == null ? 1 : w.laws.ecology.bounty) - q[0]) < 0.06 ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select><label for="setSeed">Seed<small>the same seed grows the same land</small></label><input type="number" id="setSeed" min="1" max="99999" value="' + w.seed + '"><label for="setName">Name of this world</label><input type="text" id="setName" maxlength="28" value="' + esc(w.name || '') + '"></div><div class="row"><button class="btn" data-act="newworld">Begin a new world from this seed</button><button class="btn" data-act="randomworld">Surprise me</button></div>' +
    '<p class="note" id="saveNote">' + (LIB.db ? 'Every world is kept in this browser under its name as it runs. Beginning a new one does not lose this one.' : 'The world is saved in this browser as it runs. This browser keeps only one world: beginning a new one replaces it.') + '</p>' +
    (function () { const others = LIB.list.filter(function (m) { return m.id !== st.runId; }); return '<h3>Saved worlds <small>in this browser</small></h3>' + (others.length ? others.map(function (m) { return '<div class="world"><div><b>' + esc(m.name || 'A world') + '</b><small>' + esc(worldLine(m)) + '</small></div><span><button class="btn" data-act="openworld" data-id="' + esc(m.id) + '">Continue</button> <button class="btn" data-act="forgetworld" data-id="' + esc(m.id) + '">' + (U.forget === m.id ? 'Really forget?' : 'Forget') + '</button></span></div>'; }).join('') : '<p class="muted">No other world is saved here yet.</p>'); })();
  const bind = function (id, fn) { $(id).onchange = function () { fn(this.value); save(); }; };
  bind('setName', function (v) { const nm = String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28); if (nm) { w.name = nm; $('worldName').textContent = nm; } });
  bind('setRM', function (v) { S.routine.model = v; }); bind('setRE', function (v) { S.routine.effort = v; });
  bind('setDM', function (v) { S.deep.model = v; }); bind('setDE', function (v) { S.deep.effort = v; });
  bind('setEvery', function (v) { S.reflectEvery = clamp(Math.round(+v) || 5, 2, 30); });
  bind('setWait', function (v) { S.wait = v === '1'; }); bind('setFocus', function (v) { S.focus = v === 'view' ? 'view' : 'all'; }); bind('setThink', function (v) { S.thinkEvery = clamp(Math.round(+v) || 90, 30, 480); });
  bind('setFore', function (v) { S.foresight = v === '1'; });
  bind('setPM', function (v) { S.perMinute = clamp(Math.round(+v) || 6, 1, 60); });
  bind('setRec', function (v) { S.record = v === '1'; });
  bind('setStEvery', function (v) { S.story.every = clamp(Math.round(+v) || 3, 1, 30); }); bind('setStModel', function (v) { S.story.model = v; });
  bind('setMkOn', function (v) { S.maker.on = v === '1'; U.keys.maker = ''; }); bind('setMkEvery', function (v) { S.maker.every = clamp(Math.round(+v) || 4, 1, 30); }); bind('setMkModel', function (v) { S.maker.model = v; U.keys.maker = ''; });
  bind('setBounty', function (v) { w.laws.ecology.bounty = +v; U.keys.laws = ''; });
  bind('setPar', function (v) { S.parallel = clamp(Math.round(+v) || 2, 1, 8); st.par = 0; });
  bind('setBudget', function (v) { S.budget = clamp(Math.round(+v) || 40, 5, 100000); });
  bind('setEndless', function (v) { S.endless = v === '1'; });
  bind('setAuto', function (v) { S.autoWake = v === '1'; });
  $('setVol').oninput = function () { SWA.setVolume(+this.value); };
}

/* ---------- instruments ---------- */
function drawDial() {
  const c = $('dial'), g = c.getContext('2d'), n = c.width, r = n / 2 - 5, p = SW.dayPhase(w), n0 = 1 - w.laws.time.nightFraction;
  g.clearRect(0, 0, n, n); g.lineWidth = 5; g.lineCap = 'butt';
  const a = function (f) { return f * 6.2832 - 1.5708; };
  g.strokeStyle = '#f2b84b'; g.beginPath(); g.arc(n / 2, n / 2, r, a(0), a(n0)); g.stroke();
  g.strokeStyle = '#3b4b86'; g.beginPath(); g.arc(n / 2, n / 2, r, a(n0), a(1)); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(n / 2 + Math.cos(a(p)) * r, n / 2 + Math.sin(a(p)) * r, 5.5, 0, 6.2832); g.fill();
  g.fillStyle = p >= n0 ? '#9db4ff' : '#f2b84b'; g.beginPath(); g.arc(n / 2, n / 2, 7, 0, 6.2832); g.fill();
}
function drawMini() {
  const g = mini.getContext('2d'), mw = mini.width, mh = mini.height, k = mw / w.W;
  g.imageSmoothingEnabled = true; g.drawImage(miniBmp, 0, 0, mw, mh);
  g.fillStyle = 'rgba(20,60,30,0.55)';
  for (let i = 0; i < w.plants.length; i++) if (w.plants[i]) g.fillRect((i % w.W) * k + k * 0.3, Math.floor(i / w.W) * k + k * 0.3, k * 0.4, k * 0.4);
  if (nightLevel() > 0.3) { g.fillStyle = 'rgba(6,10,38,0.45)'; g.fillRect(0, 0, mw, mh); }
  w.agents.forEach(function (a) { g.fillStyle = SW.hslToHex(a.hue, 0.8, 0.62); g.beginPath(); g.arc((a.x + 0.5) * k, (a.y + 0.5) * k, U.sel && U.sel.id === a.id ? 6 : 4.5, 0, 6.2832); g.fill(); g.strokeStyle = '#05080b'; g.lineWidth = 1.5; g.stroke(); });
  const hw = W / cam.z / 2, hh = H / cam.z / 2;
  g.strokeStyle = '#f2b84b'; g.lineWidth = 2; if (!isGlobe()) { g.strokeRect((cam.x - hw) * k, (cam.y - hh) * k, hw * 2 * k, hh * 2 * k); if (w.wrap) { g.strokeRect((cam.x - hw - w.W) * k, (cam.y - hh) * k, hw * 2 * k, hh * 2 * k); g.strokeRect((cam.x - hw + w.W) * k, (cam.y - hh) * k, hw * 2 * k, hh * 2 * k); } } else { g.beginPath(); g.moveTo(cam.x * k, 0); g.lineTo(cam.x * k, mh); g.stroke(); }
}
$('panel').addEventListener('pointerdown', function () { U.panelDown = Date.now(); });
window.addEventListener('pointerup', function () { setTimeout(function () { U.panelDown = 0; }, 60); });
function updatePanels() {
  if (U.panelDown && Date.now() - U.panelDown < 1500) return; /* never rebuild under a finger */
  const c = SW.census(w);
  $('clockText').innerHTML = '<b>Day ' + SW.day(w) + '</b> · ' + SW.SEASONS[SW.season(w)] + ' · ' + SW.phaseName(w) + ' · <b>' + skyHere() + '</b>';
  drawDial();
  $('census').innerHTML = '<span class="chip glass"><i style="background:var(--accent)"></i><b>' + c.agents + '</b>beings</span><span class="chip glass"><i style="background:#c9a877"></i><b>' + c.hopper + '</b>grazers</span><span class="chip glass"><i style="background:#a68bd8"></i><b>' + c.stalker + '</b>hunters</span><span class="chip glass"><i style="background:var(--life)"></i><b>' + c.plants + '</b>plants</span><span class="chip glass"><b>' + (c.plantKinds + c.creatureKinds) + '</b>kinds</span>';
  $('meter').innerHTML = '<b>' + st.used + '</b> / ' + st.settings.budget + ' thoughts' + (st.inflight ? ' · ' + st.inflight + ' thinking' : '') + (st.on && U.pace != null && U.pace < 0.93 ? ' · <span title="The world has slowed so that every being still comes to think about once in ' + (st.settings.thinkEvery || 90) + ' moments. Change this in Setup.">time ×' + U.pace.toFixed(2) + '</span>' : '');
  if (st.notice) { const again = st.budgetHit; showNotice(st.notice, again ? { label: 'Another round', run: function () { wakeMinds(true); } } : null); st.notice = ''; syncButtons(); }
  if (st.blocked && !U.toldBlocked && st.sample === null) U.toldBlocked = true;
  syncButtons();
  if (U.tab === 'inspect') renderInspect(); else if (U.tab === 'voices') renderVoices(); else if (U.tab === 'chronicle') renderChronicle();
  else if (U.tab === 'kinds') renderKinds(); else if (U.tab === 'peoples') renderPeoples(); else if (U.tab === 'ways') renderWays(); else if (U.tab === 'laws') renderLaws(); else if (U.tab === 'story') renderStory(); else if (U.tab === 'culture') renderCulture(); else if (U.tab === 'maker') renderMaker(); else renderSettings();
}

/* ---------- saving ---------- */
let dbNS = null, dlNS = null, recBusy = false, recState = 'waiting', recDrain = false;
function recText() {
  const R = st && st.rec, n = R ? R.all.length : 0, sent = R ? R.sent : 0;
  const how = !st.settings.record ? 'Recording is off.' : !dbNS ? (recState === 'waiting' ? 'Connecting to the store…' : 'The store is not available in this view (' + recState + '), so nothing is being sent. You can still download the log.') : recState === 'ok' || recState === 'waiting' ? 'Recording.' : 'The last send failed (' + recState + '); it will be tried again.';
  return how + ' ' + sent + ' of ' + n + ' records sent. Run id: <b>' + esc(st.runId) + '</b>';
}
function recFlush(force) {
  const R = st.rec; if (!R || !dbNS || recBusy || !st.settings.record) { if (force && !dbNS) showNotice('The store is not available in this view. Use Download run log instead.'); return; }
  if (force) recDrain = true;
  const pending = R.all.length - R.sent;
  if (pending <= 0) { if (recDrain) { recDrain = false; recState1(); } return; }
  if (!recDrain && pending < 40 && Date.now() - (R.last || 0) < 45000) return;
  recBusy = true; R.last = Date.now();
  let items = R.all.slice(R.sent, R.sent + 60);
  while (items.length > 1 && JSON.stringify(items).length > 150000) items = items.slice(0, Math.ceil(items.length / 2));
  const n = R.chunk + 1, run = st.runId, world = st;
  dbNS.doc('runs/' + run + '/chunks/' + String(n).padStart(5, '0')).set({ n: n, items: items }).then(function () {
    if (world !== st) return;
    R.chunk = n; R.sent += items.length;
    return dbNS.doc('runs/' + run).set({ readme: SWM.README, run: run, generation: 21, seed: w.seed, day: SW.day(w), tick: w.tick, thoughts: st.used, alive: w.agents.length, chunks: n, records: R.sent, updated: new Date().toISOString() });
  }).then(function () { recState = 'ok'; }, function (e) { recState = (e && e.code) || 'failed'; if (/not_granted|capability|revoked/.test(recState)) dbNS = null; })
    .then(function () { recBusy = false; if ($('recNote')) $('recNote').innerHTML = recText(); if (recDrain || R.chunk % 5 === 0) recState1(); });
}
/* the state of every being, as one document that is overwritten */
function recState1() {
  if (!dbNS || recBusy) return; recBusy = true;
  const d = SWM.digest(st); let body = { digest: d };
  if (JSON.stringify(body).length > 230000) { d.beings.forEach(function (q) { q.ties = {}; if (q.body) q.body.policy = q.body.policy.slice(0, 6); }); body = { digest: d, trimmed: true }; }
  let mk = null; try { const Mk = st.maker || {}; mk = { day: SW.day(w), visits: (Mk.log || []).slice(-8), requests: (st.rec ? st.rec.all : []).filter(function (r) { return r.t === 'request'; }).slice(-30), lessons: Mk.lessons || [], heritage: SWK.legacy(st), culture: SWK.stats(st).culture }; if (JSON.stringify(mk).length > 200000) mk.visits = mk.visits.slice(-3); } catch (e) { mk = null; }
  dbNS.doc('runs/' + st.runId + '/state/latest').set(body).then(function () { return mk ? dbNS.doc('runs/' + st.runId + '/state/maker').set(mk) : null; }).then(function () { recState = 'ok'; }, function (e) { recState = (e && e.code) || 'failed'; }).then(function () { recBusy = false; if ($('recNote')) $('recNote').innerHTML = recText(); });
}
function recDownload() {
  const ex = SWM.exportRun(st); ex.heritage = SWK.legacy(st);
  const data = JSON.stringify(ex), name = 'evolu-' + st.runId + '-day' + SW.day(w) + '.json';
  if (dlNS) { dlNS.save({ filename: name, data: data }).catch(function (e) { if (!e || e.code !== 'declined') showNotice('The download could not be made here (' + ((e && e.code) || 'failed') + ').'); }); return; }
  try { const u = URL.createObjectURL(new Blob([data], { type: 'application/json' })), el = document.createElement('a'); el.href = u; el.download = name; document.body.appendChild(el); el.click(); el.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
  catch (e) { showNotice('Downloads are not available in this view.'); }
}
/* ---------- saved worlds ----------
   Every world is kept by name in this browser (IndexedDB), so one can be left and another begun or carried on.
   The single older slot in localStorage is still written, as a fallback where the library cannot be opened. */
const LIB = { db: null, list: [], legacy: null };
function libOpen() {
  return new Promise(function (res) {
    let done = false; const fin = function (v) { if (!done) { done = true; res(v); } };
    try {
      const rq = indexedDB.open('evolu', 1);
      rq.onupgradeneeded = function () { const d = rq.result; if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'id' }); if (!d.objectStoreNames.contains('snap')) d.createObjectStore('snap'); };
      rq.onsuccess = function () { LIB.db = rq.result; fin(true); }; rq.onerror = function () { fin(false); }; rq.onblocked = function () { fin(false); };
      setTimeout(function () { fin(!!LIB.db); }, 2500);
    } catch (e) { fin(false); }
  });
}
function libReq(store, mode, fn) {
  return new Promise(function (res) {
    if (!LIB.db) return res(null);
    try { const rq = fn(LIB.db.transaction(store, mode).objectStore(store)); rq.onsuccess = function () { res(rq.result === undefined ? true : rq.result); }; rq.onerror = function () { res(null); }; } catch (e) { res(null); }
  });
}
function libList() { return libReq('meta', 'readonly', function (o) { return o.getAll(); }).then(function (a) { return (Array.isArray(a) ? a : []).sort(function (p, q) { return (q.at || 0) - (p.at || 0); }); }); }
function libGet(id) { return libReq('snap', 'readonly', function (o) { return o.get(id); }).then(function (v) { return typeof v === 'string' ? v : (LIB.legacy && LIB.legacy.id === id ? LIB.legacy.str : null); }); }
function libPut(meta, str) { const k = LIB.list.findIndex(function (m) { return m.id === meta.id; }); if (k >= 0) LIB.list[k] = meta; else LIB.list.unshift(meta); return libReq('snap', 'readwrite', function (o) { return o.put(str, meta.id); }).then(function (ok) { return ok ? libReq('meta', 'readwrite', function (o) { return o.put(meta); }) : null; }); }
function libDel(id) { LIB.list = LIB.list.filter(function (m) { return m.id !== id; }); return libReq('snap', 'readwrite', function (o) { return o.delete(id); }).then(function () { return libReq('meta', 'readwrite', function (o) { return o.delete(id); }); }); }
const NAME_A = ['Ar', 'Bel', 'Cor', 'Dun', 'El', 'Fen', 'Gal', 'Har', 'Il', 'Jor', 'Kel', 'Lor', 'Mar', 'Nim', 'Or', 'Per', 'Quel', 'Ros', 'Sel', 'Tor', 'Ul', 'Val', 'Wen', 'Yar', 'Zel', 'Ash', 'Bryn', 'Thal', 'Is', 'Om'];
const NAME_B = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ou', 'en', 'an', 'or', 'ir'];
const NAME_C = ['dor', 'land', 'mere', 'vale', 'wyn', 'reth', 'mar', 'thos', 'nia', 'lund', 'gard', 'veil', 'sar', 'moor', 'heim', 'ria', 'den', 'ros', 'tide', 'fell'];
function worldName(from) { /* a name for a world: by chance for a new one, or always the same for a world that was saved without one */
  let h = 0; if (from != null) { const t = String(from); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; }
  const pick = function (arr, k) { return arr[from == null ? Math.floor(Math.random() * arr.length) : (h >>> (k * 7)) % arr.length]; };
  return pick(NAME_A, 0) + pick(NAME_B, 1) + pick(NAME_C, 2);
}
function metaOf(state) { const ww = state.world; return { id: state.runId, name: ww.name || worldName(state.runId), seed: ww.seed, day: SW.day(ww), alive: ww.agents.length, thoughts: state.total || state.used || 0, generation: 21, rim: !!ww.veil, at: Date.now() }; }
function save() {
  if (U.choosing || !st) return; /* a world not yet chosen is not kept, and replaces nothing */
  let str = null; try { str = JSON.stringify(SWM.snapshot(st)); } catch (e) { return; }
  try { localStorage.setItem(SAVE_KEY, str); } catch (e) { /* storage may be unavailable or full; the world still runs */ }
  try { sessionStorage.setItem('evolu.current', st.runId); } catch (e) {}
  libPut(metaOf(st), str);
}
function openWorld(id) {
  if (st && !U.choosing) save();
  return libGet(id).then(function (str) {
    let state = null; try { state = str ? SWM.restore(JSON.parse(str)) : null; } catch (e) { state = null; }
    if (!state) { showNotice('That world could not be opened: its save is missing or damaged.'); return false; }
    U.choosing = false; $('chooser').hidden = true; attach(state);
    if (st.settings.autoWake && st.sample && st.used < st.settings.budget) st.on = true;
    U.playing = true; $('notice').hidden = true; syncButtons(); setTab('inspect'); save();
    try { if (st.settings.sound !== false && SWA.on && SWA.reseed) SWA.reseed(w.seed); } catch (e) {}
    return true;
  });
}
function whenText(at) { if (!at) return ''; const m = Math.round((Date.now() - at) / 60000); return m < 2 ? 'just now' : m < 90 ? m + ' minutes ago' : m < 2880 ? Math.round(m / 60) + ' hours ago' : Math.round(m / 1440) + ' days ago'; }
function worldLine(m) { return 'day ' + m.day + ' · ' + m.alive + ' living' + (m.thoughts ? ' · ' + m.thoughts + ' thoughts' : '') + (m.rim === false ? ' · no unknown rim' : '') + (m.at ? ' · ' + whenText(m.at) : ''); }
function showChooser() {
  const others = LIB.list.filter(function (m) { return !st || m.id !== st.runId; });
  $('chooserList').innerHTML = others.map(function (m) { return '<div class="world"><div><b>' + esc(m.name || 'A world') + '</b><small>' + esc(worldLine(m)) + '</small></div><button class="btn" data-open="' + esc(m.id) + '">Continue</button></div>'; }).join('');
  $('chooserNew').textContent = 'Begin a new world: ' + (w.name || '');
  $('chooserNote').textContent = LIB.db ? 'Worlds are kept in this browser, by name. You can come back to any of them from Setup.' : 'This browser keeps only one world at a time: beginning a new one will replace the one saved here.';
  $('chooser').hidden = false; try { $('chooserNew').focus(); } catch (e) {}
}
$('chooser').addEventListener('click', function (e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.open) openWorld(b.dataset.open);
  else if (b.id === 'chooserNew') { U.choosing = false; U.playing = true; $('chooser').hidden = true; if (st.settings.autoWake && st.sample) st.on = true; syncButtons(); save(); }
});

/* ---------- world lifecycle ---------- */
function attach(state) {
  st = state; w = st.world; if (!w.name) w.name = worldName(st.runId); $('worldName').textContent = w.name;
  st.sample = sampleFn; st.toolsOK = toolsOK;
  st.ui = onWorldEvent;
  st.inView = function (a) { if (isGlobe() || (U.sel && U.sel.t === 'agent' && U.sel.id === a.id)) return true; return Math.abs(wrapd(a.x + 0.5 - cam.x)) * cam.z < W / 2 + 3 * cam.z && Math.abs(a.y + 0.5 - cam.y) * cam.z < H / 2 + 3 * cam.z; };
  U.sel = null; U.follow = false; U.bubbles = []; U.fx = []; U.hist = []; U.keys = {}; U.acc = 0; U.flash = 0;
  buildTerrain(); resize();
  /* open on the band of beings, filling the stage */
  cam.z = Math.max(W / w.W, H / w.H) * 1.05;
  if (w.agents.length) { cam.x = w.agents.reduce(function (s, a) { return s + a.x; }, 0) / w.agents.length + 0.5; cam.y = w.agents.reduce(function (s, a) { return s + a.y; }, 0) / w.agents.length + 0.5; }
  else { cam.x = w.W / 2; cam.y = w.H / 2; }
  clampCam(); syncButtons();
  window.SWdebug = { st: st, U: U, cam: cam, save: save, LIB: LIB, clampCam: clampCam, isGlobe: isGlobe, zGlobe: zGlobe, fitWorld: fitWorld, event: onWorldEvent, skyHere: skyHere };
}
function newWorld(seed) {
  const keep = st ? st.settings : null;
  const legacy = st ? SWK.legacy(st) : null;
  if (st && !U.choosing) save(); /* the world being left is kept under its name */
  const fresh = SWM.createState(SW.createWorld(seed), keep ? JSON.parse(JSON.stringify(keep)) : SWM.defaultSettings()); fresh.world.name = worldName(null);
  attach(fresh); U.playing = true;
  if (st.settings.autoWake && st.sample) st.on = true;
  SWK.inherit(st, legacy);
  SWM.chron(st, 'birth', w.peoples.map(function (P) { return P.name + ' (' + P.noun + ') in ' + (w.regions[P.region] ? w.regions[P.region].name : 'the land'); }).join('; ') + ': ' + w.peoples.length + ' peoples woke in different lands of a new world, a sea between them (seed ' + seed + ').', []);
  $('notice').hidden = true; save(); setTab('inspect'); if (U.choosing) showChooser();
}
function settle() {
  const made = SW.settle(w, 3);
  made.forEach(function (a) { st.minds[a.id] = SWM.newMind(a); st.names[a.id] = a.name; });
  SWM.chron(st, 'birth', 'Three new settlers arrived.', made.map(function (a) { return a.id; }));
  U.keys.inspect = '';
}
function stepWorld() {
  SW.step(w, st.emit); SWM.tick(st);
  if (w.tick % 40 === 0) { const c = SW.census(w); U.hist.push({ d: SW.day(w), a: c.agents, h: c.hopper, s: c.stalker, p: c.plants }); if (U.hist.length > 260) U.hist.shift(); if (U.tab === 'chronicle') U.keys.chronicle = ''; }
}
function frame(ts) {
  const dt = Math.min(0.1, (ts - U.last) / 1000 || 0); U.last = ts; U.time += dt;
  if (U.playing && !U.choosing) {
    U.pace = (U.pace == null ? 1 : U.pace) + (SWM.pace(st) - (U.pace == null ? 1 : U.pace)) * 0.05; /* the clock eases toward what the minds can keep up with */
    U.acc += dt * TICKS_PER_SEC * U.speed * U.pace;
    let n = 0; while (U.acc >= 1 && n < 30) { stepWorld(); U.acc -= 1; n++; }
    if (U.acc > 1) U.acc = 1;
    SWM.pump(st);
  }
  if (U.flash > 0) U.flash -= dt * 2.2;
  refreshBands();
  if (U.follow && U.sel && U.sel.t === 'agent') { const a = agentOf(U.sel.id); if (a) { cam.x += (ex(a) + 0.5 - cam.x) * 0.08; cam.y += (ey(a) + 0.5 - cam.y) * 0.08; clampCam(); } else U.follow = false; }
  draw();
  if (ts - U.lastPanel > 260) { U.lastPanel = ts; updatePanels(); }
  if (ts - U.lastMini > 400) { U.lastMini = ts; drawMini(); }
  if (ts - (U.lastRec || 0) > 5000) { U.lastRec = ts; recFlush(false); SWK.tick(st); }
  if (ts - U.lastScene > 500) { U.lastScene = ts; if (!U.eraT || ts - U.eraT > 6000) { U.eraT = ts; let er = 1; w.agents.forEach(function (a) { for (const k in a.knows) er = Math.max(er, (w.laws.tree[k] || {}).era || 1); }); U.era = er; } const R0 = SW.regionAt(w, clamp(Math.round(cam.x), 0, w.W - 1), clamp(Math.round(cam.y), 0, w.H - 1)); SWA.scene(nightLevel(), SW.season(w), skyHere(), { warm: SW.climate(w, ((Math.round(cam.x) % w.W) + w.W) % w.W, clamp(Math.round(cam.y), 0, w.H - 1)) === 1, biome: R0 ? R0.biome : 'mixed', mood: w.musicMood || 'calm', era: U.era || 1, crowd: w.settlements.length }); }
  if (ts - U.lastSave > 30000 && !U.choosing) { U.lastSave = ts; save(); }
  requestAnimationFrame(frame);
}
function start(data) {
  /* 1. the page was republished or reloaded by its host while a world ran: carry on with it.
     2. the same tab was reloaded: carry on with the world it held.
     3. worlds are saved here from before: offer them, and a new world, and wait for the choice.
     4. nothing is saved here: begin a new world, with a name of its own, and let it run. */
  let state = null;
  try { if (data && data.world) state = SWM.restore(data); } catch (e) { state = null; }
  if (state) { libOpen().then(libList).then(function (list) { (list || []).forEach(function (m) { if (!LIB.list.some(function (q) { return q.id === m.id; })) LIB.list.push(m); }); save(); }).catch(function () {}); return go(state, false); } /* the library is opened behind a world that carries on, and that world is filed in it */
  libOpen().then(libList).then(function (list) {
    LIB.list = list || [];
    let raw = null, cur = null, old = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    try { cur = sessionStorage.getItem('evolu.current'); } catch (e) {}
    if (raw) { try { old = SWM.restore(JSON.parse(raw)); } catch (e) { old = null; } }
    if (old) { /* a world saved before worlds had names is filed with the rest, so that nothing is lost */
      if (!old.world.name) old.world.name = worldName(old.runId);
      LIB.legacy = { id: old.runId, str: raw };
      if (!LIB.list.some(function (m) { return m.id === old.runId; })) { const m = metaOf(old); m.at = Date.now() - 60000; libPut(m, raw); }
    }
    if (cur && old && old.runId === cur) return go(old, false);
    if (cur && LIB.list.some(function (m) { return m.id === cur; })) return libGet(cur).then(function (str) { let s2 = null; try { s2 = str ? SWM.restore(JSON.parse(str)) : null; } catch (e) { s2 = null; } go(s2, !s2 && LIB.list.length > 0); });
    go(null, LIB.list.length > 0);
  }).catch(function () { go(null, false); });
}
function go(state, choose) {
  U.choosing = !!choose;
  if (state) attach(state);
  else newWorld(+window.EVOLU_SEED || Math.floor(Math.random() * 9999) + 1);
  if (choose) showChooser();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  if (window.claude && window.claude.use) {
    window.claude.use('sample').then(function (s) {
      sampleFn = s; st.sample = s;
      if (s && st.settings.autoWake && !st.on && st.used < st.settings.budget) { st.on = true; syncButtons(); }
      if (!s) { st.blocked = 'Claude is not available to this page in this view, so the beings run on reflexes alone.'; return; }
      if (s.limits) s.limits().then(function (l) { toolsOK = !!(l && l.tools); st.toolsOK = toolsOK; }).catch(function () {});
    }).catch(function () { sampleFn = null; });
    window.claude.use('db').then(function (d) { dbNS = d; recState = d ? 'waiting' : 'not offered'; U.keys.settings = ''; }).catch(function () { recState = 'not offered'; });
    window.claude.use('downloads').then(function (d) { dlNS = d; }).catch(function () {});
  } else recState = 'not offered';
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(function () { return SWM.snapshot(st); }); } catch (e) {}
  /* sound is on from the start unless turned off. A browser may hold it silent until the page is first touched; every touch or key then lets it through */
  const soundUp = function () { return SWA.on && SWA.ctx && SWA.ctx.state === 'running'; };
  const wake = function () { if (!st || st.settings.sound === false) return; try { if (!SWA.on) SWA.start(w.seed); else if (SWA.ctx && SWA.ctx.state !== 'running') SWA.ctx.resume(); } catch (e) {} setTimeout(syncButtons, 150); if (soundUp()) ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'].forEach(function (k) { window.removeEventListener(k, wake, true); }); };
  ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'].forEach(function (k) { window.addEventListener(k, wake, true); });
  if (st.settings.sound !== false) { try { SWA.start(w.seed); if (SWA.ctx) SWA.ctx.onstatechange = function () { syncButtons(); }; } catch (e) {} }
  if (!w.veil) setTimeout(function () { showNotice('This world was made before the world had an unknown rim to explore. It can be carried on, but only a new world (Setup, New world) has mist at its edges and land beyond.'); }, 1500);
  syncButtons(); setTab('inspect');
  requestAnimationFrame(frame);
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
else start(window.claude && window.claude.hot && window.claude.hot.data || {});
})();
