/* audit of the trees against the run files of one world (days 12, 25, 60, 72). From Generation 27 a run file also says how each way was come by (body.came). */
const fs = require('fs'), SW = require('../../src/engine.js'), M = require('../../src/minds.js'), K = require('../../src/maker.js');
const w0 = SW.createWorld(7), st0 = M.createState(w0); K.inherit(st0, null); const L = w0.laws, T = L.tree, ways = Object.keys(T);
const out = {};
for (const [name, file] of [['day 12', '../../runs/generation-20-run-r5614-mwsokxmr-day12.json'], ['day 25', '../../runs/generation-21-run-r5614-mwsokxmr-day25.json'], ['day 60', '../../runs/generation-22-run-r5614-mwsokxmr-day60.json'], ['day 72', '../../runs/generation-26-run-r5614-mwsokxmr-day72.json']]) {
  const r = JSON.parse(fs.readFileSync(require('path').join(__dirname, file), 'utf8')), B = (r.digest.beings || []).filter(b => !b.dead);
  const held = {}, self = {}, perBeing = [];
  const KN = b => { const kn = (b.body && b.body.knows) || {}, o = {}; if (Array.isArray(kn)) kn.forEach(q => { const id = typeof q === 'string' ? q.split(' ')[0].replace(/[^a-z]/g, '') : (q.way || q.id || q.k); if (id) o[id] = q; }); else for (const k in kn) o[k] = kn[k]; return o; };
  B.forEach(b => { const kn = KN(b); let n = 0; for (const k in kn) { n++; held[k] = (held[k] || 0) + 1; const q = kn[k]; if (q && typeof q === 'object' && (q.by === b.id || q.byName === b.name)) self[k] = (self[k] || 0) + 1; if (typeof q === 'string' && /yours|own|found/.test(q)) self[k] = (self[k] || 0) + 1; } perBeing.push(n); });
  perBeing.sort((a, b) => a - b);
  const byEra = {}; ways.forEach(k => { const e = T[k].era || 1; byEra[e] = byEra[e] || { all: 0, held: 0 }; byEra[e].all++; if (held[k]) byEra[e].held++; });
  out[name] = { alive: B.length, held, self, byEra, perBeing };
  console.log(name + ': alive ' + B.length + '; ways held by someone: ' + Object.keys(held).length + ' of ' + ways.length + '; by age ' + Object.keys(byEra).map(e => e + ':' + byEra[e].held + '/' + byEra[e].all).join(' ') + '; ways per being: least ' + perBeing[0] + ', middle ' + perBeing[perBeing.length >> 1] + ', most ' + perBeing[perBeing.length - 1]);
  { const how = {}; B.forEach(b => { const c = (b.body && b.body.came) || null; if (c) for (const k in c) how[c[k]] = (how[c[k]] || 0) + 1; }); if (Object.keys(how).length) console.log('  how the ways held were come by: ' + JSON.stringify(how)); }
  if (name === 'day 60') {
    /* how each way is held: found by its holder or learned from another */
    const rows = Object.keys(held).sort((a, b) => held[b] - held[a]).map(k => k + ' ' + held[k] + '(' + (self[k] || 0) + ' found it)');
    console.log('  held: ' + rows.join(', '));
    /* never held, ages one to three: what stands in the way */
    const stats = B.map(b => (b.body && b.body.stats) || {}), knows = B.map(KN);
    ways.filter(k => !held[k] && (T[k].era || 1) <= 3).forEach(k => {
      const t = T[k], needOk = B.filter((b, i) => (t.needs || []).every(q => knows[i][q])).length, prac = t.stat ? B.filter((b, i) => (stats[i][t.stat] || 0) >= (t.n || 1)).length : B.length, lore = B.filter(b => ((b.body && b.body.lore) || 0) >= (t.lore || 0)).length, both = B.filter((b, i) => (t.needs || []).every(q => knows[i][q]) && (!t.stat || (stats[i][t.stat] || 0) >= (t.n || 1)) && ((b.body && b.body.lore) || 0) >= (t.lore || 0)).length;
      if (both > 0 || (T[k].era || 1) <= 2) console.log('  never held: ' + k + ' [' + t.tree + ' ' + (t.era || 1) + '] needs ' + JSON.stringify(t.needs || []) + ' (' + needOk + ' have them), practice ' + (t.stat ? t.stat + ' x' + t.n : 'none') + ' (' + prac + ' have it), lore ' + (t.lore || 0) + ' (' + lore + ' have it); all three: ' + both);
    });
    const built = (r.story && r.story.stats && r.story.stats.timesBuilt) || {}; console.log('  built ever (at day 37): ' + JSON.stringify(built));
  }
}
/* what stands behind each way: buildings, recipes, tools, effects in code */
const src = fs.readFileSync(require('path').join(__dirname, '../../src/engine.js'), 'utf8') + fs.readFileSync(require('path').join(__dirname, '../../src/minds.js'), 'utf8');
const behind = {}; ways.forEach(k => { behind[k] = { buildings: Object.keys(L.buildings).filter(b => L.buildings[b].way === k), recipes: Object.keys(L.recipes).filter(b => L.recipes[b].way === k), needed: ways.filter(q => (T[q].needs || []).indexOf(k) >= 0), code: (src.match(new RegExp('knows\\.' + k + '\\b|knows\\[\'' + k + '\'\\]', 'g')) || []).length }; });
const empty = ways.filter(k => !behind[k].buildings.length && !behind[k].recipes.length && !behind[k].code);
console.log('ways with nothing behind them but the next way (no building, recipe or rule in the code): ' + empty.length + ' of ' + ways.length + ': ' + empty.map(k => k + '[' + (T[k].era || 1) + ']').join(' '));
const byEra2 = {}; ways.forEach(k => { const e = T[k].era || 1; byEra2[e] = byEra2[e] || { n: 0, empty: 0 }; byEra2[e].n++; if (empty.indexOf(k) >= 0) byEra2[e].empty++; }); console.log('  by age: ' + Object.keys(byEra2).map(e => 'age ' + e + ': ' + byEra2[e].empty + ' of ' + byEra2[e].n + ' empty').join('; '));
/* how the trees lean on one another */
const cross = {}; ways.forEach(k => (T[k].needs || []).forEach(q => { if (T[q] && T[q].tree !== T[k].tree) { const key = T[q].tree + ' -> ' + T[k].tree; cross[key] = (cross[key] || 0) + 1; } })); console.log('needs that cross between trees: ' + JSON.stringify(cross));
const roots = ways.filter(k => !(T[k].needs || []).length); console.log('ways that need no other: ' + roots.length + '; deepest chain: ' + Math.max.apply(null, ways.map(function d(k) { return 1 + Math.max(0, ...(T[k].needs || []).map(q => T[q] ? d(q) : 0)); })));
