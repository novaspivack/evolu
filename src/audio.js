/* Evolu soundscape: everything is synthesized, nothing is recorded.
   There is no continuous tone. Quiet music drifts in and out: slow chords that swell and fade, and a few
   single notes, in a key that turns with the hour and the season. Weather is heard only when there is weather.
   Every event in the world has a voice, tuned to the same scale. */
(function (root) {
'use strict';
const A = { on: false, ctx: null, vol: 0.6, night: 0, season: 0 };
let SCALE = [0, 2, 4, 7, 9];
/* each kind of land has its own mode, pitch and voice; the maker's mood and the age the peoples have reached colour it further */
const LANDS = {
  mixed: { scale: [0, 2, 4, 7, 9], root: 110, voice: 'bell' }, woodland: { scale: [0, 2, 4, 7, 9], root: 110, voice: 'bell' }, steppe: { scale: [0, 2, 5, 7, 9], root: 123.5, voice: 'flute' },
  lakeland: { scale: [0, 2, 4, 7, 11], root: 98, voice: 'bell' }, highland: { scale: [0, 3, 5, 7, 10], root: 82.4, voice: 'horn' }, desert: { scale: [0, 1, 4, 7, 8], root: 103.8, voice: 'pluck' },
  marsh: { scale: [0, 2, 3, 7, 8], root: 92.5, voice: 'flute' }, tundra: { scale: [0, 2, 7, 9, 10], root: 130.8, voice: 'glass' }
};
const MOODS = { calm: null, bright: { scale: [0, 2, 4, 7, 9], up: 1.122 }, solemn: { scale: [0, 3, 5, 7, 10], up: 0.891 }, tense: { scale: [0, 1, 5, 6, 10], up: 1 }, strange: { scale: [0, 2, 4, 6, 8], up: 1 }, festive: { scale: [0, 2, 4, 7, 9], up: 1.189, quick: 1 } };
let voice = 'bell', quick = 0, nextDrum = 0, era = 1;
let master, wet, music, windGain, windFilter, rainGain, rootHz = 110, recent = [], nextChord = 0, nextNote = 0, lastStep = 7;

function hz(step) { const oct = Math.floor(step / 5), deg = ((step % 5) + 5) % 5; return rootHz * Math.pow(2, oct + SCALE[deg] / 12); }
function impulse(ctx, secs) {
  const n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  return buf;
}
function noiseBuffer(ctx) {
  /* thirteen seconds, so the ear cannot hear it come round; faded at both ends so the join is silent */
  const n = Math.floor(ctx.sampleRate * 13), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), edge = Math.floor(ctx.sampleRate * 0.4);
  let last = 0;
  for (let i = 0; i < n; i++) { last = 0.97 * last + 0.03 * (Math.random() * 2 - 1); d[i] = last * 6 * Math.min(1, i / edge, (n - 1 - i) / edge); }
  return buf;
}
let noiseBuf = null;

A.start = function (seed) {
  try {
    if (!A.ctx) {
      const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
      const ctx = A.ctx = new AC();
      rootHz = [110, 98, 123.47, 130.81, 87.31][Math.abs(seed | 0) % 5];
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0; master.connect(comp);
      const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.6);
      wet = ctx.createGain(); wet.gain.value = 0.5; wet.connect(verb); verb.connect(master);
      noiseBuf = noiseBuffer(ctx);
      /* the music goes mostly through the room, so it sits far back */
      music = ctx.createGain(); music.gain.value = 0.3; music.connect(master);
      const mw = ctx.createGain(); mw.gain.value = 1.4; music.connect(mw); mw.connect(wet);
      /* wind and rain are silent unless the sky calls for them */
      const wind = ctx.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
      windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 320; windFilter.Q.value = 0.3;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); wind.start();
      const rain = ctx.createBufferSource(), rf = ctx.createBiquadFilter(), rl = ctx.createBiquadFilter(); rain.buffer = noiseBuf; rain.loop = true; rain.playbackRate.value = 1.31;
      rf.type = 'highpass'; rf.frequency.value = 2200; rl.type = 'lowpass'; rl.frequency.value = 7000;
      rainGain = ctx.createGain(); rainGain.gain.value = 0; rain.connect(rf); rf.connect(rl); rl.connect(rainGain); rainGain.connect(master); rain.start(0, 3.7);
      nextChord = ctx.currentTime + 1.5; nextNote = ctx.currentTime + 5;
    }
    A.ctx.resume();
    master.gain.cancelScheduledValues(A.ctx.currentTime);
    master.gain.setTargetAtTime(A.vol, A.ctx.currentTime, 0.4);
    A.on = true; return true;
  } catch (e) { A.on = false; return false; }
};
A.stop = function () {
  if (A.ctx && master) master.gain.setTargetAtTime(0, A.ctx.currentTime, 0.15);
  A.on = false;
};
A.setVolume = function (v) { A.vol = v; if (A.on && master) master.gain.setTargetAtTime(v, A.ctx.currentTime, 0.1); };

/* The hour and the season retune the room. Call a few times a second. */
A.scene = function (night, season, sky, o) {
  if (!A.on) return;
  const ctx = A.ctx, t = ctx.currentTime;
  { const Ld = LANDS[(o && o.biome) || 'mixed'] || LANDS.mixed, Md = MOODS[(o && o.mood) || 'calm']; SCALE = Md ? Md.scale : Ld.scale; rootHz = Ld.root * (Md ? Md.up : 1); voice = Ld.voice; quick = Md && Md.quick ? 1 : 0; era = (o && o.era) || 1; A.land = (o && o.biome) || 'mixed'; A.mood = (o && o.mood) || 'calm';
    /* where peoples have settled and learned, a slow drum is heard now and then; later ages add to it */
    if (era >= 2 && o && o.crowd > 0 && t >= nextDrum) { const beats = era >= 4 ? [0, 0.5, 1, 1.5, 2, 2.5] : era >= 3 ? [0, 0.75, 1.5, 1.875] : [0, 1.1]; beats.forEach(function (b, k) { tone({ f: k % 2 ? 62 : 55, to: 40, dur: 0.5, gain: 0.05, attack: 0.008, at: b * (quick ? 0.6 : 1), wet: 0.3 }); }); if (era >= 3) chime({ f: hz(5), gain: 0.012, at: 0.4 }); nextDrum = t + (quick ? 9 : 18) + Math.random() * (quick ? 10 : 30); }
  }
  A.night = night; A.season = season;
  const dark = night > 0.5, winter = season === 3;
  /* a chord that swells and fades, then silence before the next */
  if (t >= nextChord) {
    const sets = dark ? [[5, 8, 12], [3, 7, 10], [5, 9, 12]] : winter ? [[10, 13, 17], [8, 12, 15]] : [[5, 7, 10], [7, 10, 12], [5, 8, 12], [8, 10, 14]];
    const ch = sets[Math.floor(Math.random() * sets.length)], len = 9 + Math.random() * 6;
    ch.forEach(function (st, k) { swell({ f: hz(st), dur: len, gain: (dark ? 0.03 : 0.036) / (1 + k * 0.25), pan: (k - 1) * 0.35, at: k * 0.7 }); });
    if (!dark && Math.random() < 0.5) swell({ f: hz(ch[0] - 5), dur: len * 1.1, gain: 0.02, pan: 0 });
    nextChord = t + len * 0.75 + 5 + Math.random() * (dark ? 14 : 8);
  }
  /* now and then a few single notes, stepping to neighbours in the scale */
  if (t >= nextNote) {
    const count = Math.random() < 0.35 ? 1 : 2 + Math.floor(Math.random() * 3); let at = 0;
    for (let k = 0; k < count; k++) {
      lastStep = Math.max(9, Math.min(17, lastStep + [-2, -1, -1, 1, 1, 2, 3][Math.floor(Math.random() * 7)]));
      chime({ f: hz(lastStep), gain: dark ? 0.02 : 0.028, pan: Math.random() * 1.2 - 0.6, at: at });
      at += 0.9 + Math.random() * 1.6;
    }
    nextNote = t + at + (quick ? 2 : 6) + Math.random() * (dark ? 20 : quick ? 5 : 11);
  }
  windGain.gain.setTargetAtTime(sky === 'gale' ? 0.15 : sky === 'storm' ? 0.11 : sky === 'snow' ? 0.05 : winter || A.land === 'tundra' || A.land === 'highland' ? 0.03 : A.land === 'desert' || A.land === 'steppe' ? 0.018 : 0, t, 3);
  if (sky === 'gale') windFilter.frequency.setTargetAtTime(520 + 260 * Math.sin(t * 0.4), t, 0.6);
  if (sky === 'heat' && Math.random() < 0.25) { const f = 5200 + Math.random() * 900; for (let k = 0; k < 6; k++) tone({ f: f, dur: 0.02, gain: 0.006, pan: Math.random() * 2 - 1, at: k * 0.04, wet: 0.1 }); }
  if (A.land === 'marsh' && night > 0.5 && Math.random() < 0.12) tone({ f: 180 + Math.random() * 60, to: 120, dur: 0.16, gain: 0.02, pan: Math.random() * 2 - 1, wet: 0.3 });
  if (A.land === 'lakeland' && night < 0.4 && Math.random() < 0.06) tone({ f: 900 + Math.random() * 300, to: 700, dur: 0.22, gain: 0.012, pan: Math.random() * 2 - 1, wet: 0.5 });
  rainGain.gain.setTargetAtTime(sky === 'storm' ? 0.1 : sky === 'rain' ? 0.045 : 0, t, 2.5);
  if (sky === 'rain' || sky === 'storm') { if (Math.random() < 0.5) tone({ f: 1800 + Math.random() * 2600, dur: 0.03, gain: 0.006 + Math.random() * 0.006, pan: Math.random() * 2 - 1, wet: 0.4 }); return; }
  if (sky === 'fog' || sky === 'snow') return;
  windFilter.frequency.setTargetAtTime(280 + 120 * Math.sin(t * 0.05), t, 2);
  if (night > 0.6 && season !== 3 && Math.random() < 0.3) {
    const f = 4100 + Math.random() * 700, pan = Math.random() * 2 - 1;
    for (let k = 0; k < 3; k++) tone({ f: f, dur: 0.035, gain: 0.012, pan: pan, at: k * 0.07, wet: 0.2 });
  } else if (night < 0.2 && season < 2 && Math.random() < 0.07) {
    const pan = Math.random() * 2 - 1, n = 2 + Math.floor(Math.random() * 3), base = 1700 + Math.random() * 1300;
    for (let k = 0; k < n; k++) tone({ f: base * (1 + 0.12 * Math.random()), to: base * (1.2 + 0.3 * Math.random()), dur: 0.09, gain: 0.018, pan: pan, at: k * 0.13, wet: 0.5 });
  }
};

/* a slow note: fades in over seconds, fades out over more; several partials, slightly spread, so it is soft and not a pure whistle */
function swell(o) {
  const ctx = A.ctx; if (!ctx || !music) return;
  const t = ctx.currentTime + (o.at || 0), g = ctx.createGain(), up = o.dur * 0.42;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + up); g.gain.setTargetAtTime(0.0001, t + up, o.dur * 0.22);
  [[1, 1], [2, 0.22], [3, 0.07]].forEach(function (h, k) {
    const osc = ctx.createOscillator(), hg = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = o.f * h[0]; osc.detune.value = (k - 1) * 3; hg.gain.value = h[1];
    osc.connect(hg); hg.connect(g); osc.start(t); osc.stop(t + o.dur * 1.5 + 0.2);
  });
  let node = g;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan || 0)); g.connect(p); node = p; }
  node.connect(music);
}
/* a single soft struck note with a long tail */
function chime(o) {
  const ctx = A.ctx; if (!ctx || !music) return;
  const t = ctx.currentTime + (o.at || 0), g = ctx.createGain();
  const V = { bell: { att: 0.04, tail: 1.1, parts: [[1, 1], [2.01, 0.18], [4.2, 0.04]], type: 'sine' }, flute: { att: 0.22, tail: 0.7, parts: [[1, 1], [2, 0.06]], type: 'sine' }, horn: { att: 0.3, tail: 1.3, parts: [[1, 1], [2, 0.3], [3, 0.12]], type: 'triangle' }, pluck: { att: 0.008, tail: 0.35, parts: [[1, 1], [2, 0.35], [3, 0.15], [5.1, 0.05]], type: 'triangle' }, glass: { att: 0.02, tail: 1.8, parts: [[1, 0.8], [2.76, 0.3], [5.4, 0.08]], type: 'sine' } }[voice] || { att: 0.04, tail: 1.1, parts: [[1, 1], [2.01, 0.18]], type: 'sine' };
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + V.att); g.gain.setTargetAtTime(0.0001, t + V.att, V.tail);
  V.parts.forEach(function (h) {
    const osc = ctx.createOscillator(), hg = ctx.createGain(); osc.type = V.type; osc.frequency.value = o.f * h[0]; hg.gain.value = h[1];
    osc.connect(hg); hg.connect(g); osc.start(t); osc.stop(t + 6);
  });
  let node = g;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan || 0)); g.connect(p); node = p; }
  node.connect(music);
}
function tone(o) {
  const ctx = A.ctx; if (!ctx) return;
  const t = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
  const peak = (o.gain || 0.05), att = o.attack || 0.006;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + att + o.dur);
  let node = g;
  osc.connect(g);
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); node = f; }
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan || 0)); node.connect(p); node = p; }
  node.connect(master);
  if (o.wet) { const w = ctx.createGain(); w.gain.value = o.wet; node.connect(w); w.connect(wet); }
  osc.start(t); osc.stop(t + att + o.dur + 0.05);
}
function burst(o) {
  const ctx = A.ctx; if (!ctx) return;
  const t = ctx.currentTime + (o.at || 0), src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  src.buffer = noiseBuf; f.type = o.type || 'bandpass'; f.frequency.value = o.f || 900; f.Q.value = o.q || 1;
  g.gain.setValueAtTime(o.gain || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f); f.connect(g);
  let node = g;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan || 0)); g.connect(p); node = p; }
  node.connect(master);
  src.start(t, 0.5 + Math.random() * 11); src.stop(t + o.dur + 0.05);
}
function allow(minor) {
  const now = Date.now(); recent = recent.filter(function (x) { return now - x < 1000; });
  if (recent.length >= (minor ? 4 : 10)) return false;
  recent.push(now); return true;
}
function voiceStep(hue) { return 5 + Math.round((hue % 360) / 360 * 9); }

/* o: { pan: -1..1, near: 0..1 (how present on screen), hue, text, bold, gentle } */
A.event = function (type, o) {
  if (!A.on || !A.ctx) return;
  o = o || {};
  const near = o.near == null ? 1 : o.near; if (near <= 0.02) return;
  const pan = o.pan || 0, v = function (g) { return g * (0.25 + 0.75 * near); };
  const step = voiceStep(o.hue || 0);
  switch (type) {
    case 'said': {
      if (!allow()) return;
      const words = String(o.text || '').split(/\s+/).length, n = Math.max(2, Math.min(14, Math.round(words * 1.5)));
      const wave = o.bold > 0.62 ? 'sawtooth' : o.gentle > 0.62 ? 'sine' : 'triangle';
      let s = step, seed = 0; const txt = String(o.text || '');
      for (let k = 0; k < n; k++) {
        seed = (seed * 31 + txt.charCodeAt(k % Math.max(1, txt.length))) % 97;
        s += (seed % 3) - 1; s = Math.max(step - 3, Math.min(step + 4, s));
        tone({ f: hz(s), to: hz(s) * (seed % 2 ? 1.04 : 0.97), type: wave, dur: 0.075, gain: v(0.07), pan: pan, at: k * 0.092, lp: 2400, wet: 0.25 });
      }
      break;
    }
    case 'thought': if (allow()) { tone({ f: hz(step + 5), dur: 0.9, gain: v(0.018), pan: pan, wet: 0.7 }); tone({ f: hz(step + 7) * 1.003, dur: 1.2, gain: v(0.022), pan: pan, at: 0.08, wet: 0.7 }); } break;
    case 'deep': if (allow()) [0, 2, 4, 7].forEach(function (d, k) { tone({ f: hz(step + 3 + d), dur: 1.8, gain: v(0.03), pan: pan, at: k * 0.16, wet: 0.9 }); }); break;
    case 'rewrite': if (allow()) { tone({ f: hz(step), to: hz(step + 10), type: 'triangle', dur: 0.7, gain: v(0.05), pan: pan, wet: 0.8 }); tone({ f: hz(step + 10), dur: 1.4, gain: v(0.03), pan: pan, at: 0.7, wet: 0.9 }); } break;
    case 'ate': if (allow(true)) tone({ f: hz(step - 2), to: hz(step - 4), type: 'triangle', dur: 0.09, gain: v(0.03), pan: pan, lp: 1200 }); break;
    case 'poison': if (allow()) tone({ f: hz(step), to: hz(step - 6) * 0.94, type: 'sawtooth', dur: 0.5, gain: v(0.05), pan: pan, lp: 900, wet: 0.3 }); break;
    case 'planted': if (allow(true)) tone({ f: hz(step - 3), to: hz(step + 2), dur: 0.12, gain: v(0.035), pan: pan }); break;
    case 'attack': if (allow()) { burst({ f: 1400, dur: 0.16, gain: v(0.16), pan: pan, q: 0.8 }); tone({ f: 82, to: 50, dur: 0.25, gain: v(0.14), pan: pan }); } break;
    case 'bitten': if (allow()) { burst({ f: 2200, dur: 0.1, gain: v(0.12), pan: pan }); tone({ f: 120, to: 70, dur: 0.2, gain: v(0.1), pan: pan }); } break;
    case 'hunted': if (allow()) tone({ f: 96, to: 60, type: 'triangle', dur: 0.22, gain: v(0.12), pan: pan }); break;
    case 'death': if (allow()) { tone({ f: hz(-2), dur: 3.2, gain: v(0.11), pan: pan, wet: 1 }); tone({ f: hz(-2) * 2.76, dur: 2.2, gain: v(0.035), pan: pan, wet: 1 }); tone({ f: hz(1), dur: 2.6, gain: v(0.03), pan: pan, at: 0.4, wet: 1 }); } break;
    case 'birth': if (allow()) [0, 2, 4, 7].forEach(function (d, k) { tone({ f: hz(step + d), type: 'triangle', dur: 0.5, gain: v(0.06), pan: pan, at: k * 0.11, wet: 0.7 }); }); break;
    case 'court': if (allow()) { tone({ f: hz(step + 2), dur: 0.25, gain: v(0.05), pan: pan, wet: 0.6 }); tone({ f: hz(step + 4), dur: 0.4, gain: v(0.05), pan: pan, at: 0.22, wet: 0.6 }); } break;
    case 'gave': if (allow()) { tone({ f: hz(step + 4), dur: 0.2, gain: v(0.045), pan: pan, wet: 0.5 }); tone({ f: hz(step + 6), dur: 0.3, gain: v(0.04), pan: pan, at: 0.12, wet: 0.5 }); } break;
    case 'built': if (allow()) [0, 0.16, 0.3].forEach(function (at, k) { burst({ f: 520 + k * 60, dur: 0.07, gain: v(0.2), pan: pan, at: at, q: 4 }); }); break;
    case 'marked': if (allow()) { burst({ f: 640, dur: 0.07, gain: v(0.18), pan: pan, q: 4 }); tone({ f: hz(step + 6), dur: 0.6, gain: v(0.035), pan: pan, at: 0.08, wet: 0.7 }); } break;
    case 'variety': if (allow()) [9, 11, 12, 14, 16].forEach(function (d, k) { tone({ f: hz(d), dur: 0.35, gain: v(0.035), pan: pan + (k - 2) * 0.1, at: k * 0.06, wet: 0.9 }); }); break;
    case 'extinct': if (allow()) tone({ f: hz(4), to: hz(-3), dur: 1.6, gain: 0.04, wet: 0.9 }); break;
    case 'thunder': burst({ f: 140, type: 'lowpass', dur: 2.6, gain: 0.9 * (0.4 + 0.6 * near), pan: pan, q: 0.5 }); burst({ f: 2600, dur: 0.12, gain: v(0.25), pan: pan }); break;
    case 'cast': [-5, 0, 4, 7, 11].forEach(function (d, k) { tone({ f: hz(step + d), type: k % 2 ? 'sine' : 'triangle', dur: 2.4, gain: v(0.045), pan: pan, at: k * 0.09, wet: 1 }); }); tone({ f: hz(step + 12), to: hz(step + 20), dur: 1.2, gain: v(0.03), pan: pan, at: 0.5, wet: 1 }); break;
    case 'awakened': [0, 2, 4, 5, 7, 9, 10, 12].forEach(function (d, k) { tone({ f: hz(5 + d), dur: 2.2, gain: v(0.035), pan: pan, at: k * 0.1, wet: 1 }); }); break;
    case 'stole': if (allow()) { tone({ f: hz(step + 3), to: hz(step - 1), type: 'triangle', dur: 0.12, gain: v(0.04), pan: pan }); tone({ f: hz(step - 2), dur: 0.2, gain: v(0.03), pan: pan, at: 0.14 }); } break;
    case 'pledged': if (allow()) { tone({ f: hz(step - 5), type: 'sawtooth', dur: 0.5, gain: v(0.05), pan: pan, lp: 900, wet: 0.6 }); tone({ f: hz(step - 2), type: 'sawtooth', dur: 0.9, gain: v(0.05), pan: pan, at: 0.35, lp: 900, wet: 0.6 }); } break;
    case 'razed': if (allow()) { burst({ f: 300, type: 'lowpass', dur: 0.6, gain: v(0.5), pan: pan }); burst({ f: 900, dur: 0.25, gain: v(0.2), pan: pan, at: 0.05 }); } break;
    case 'taught': if (allow()) [0, 2, 4].forEach(function (d, k) { tone({ f: hz(step + 5 + d), dur: 0.5, gain: v(0.035), pan: pan, at: k * 0.16, wet: 0.8 }); }); break;
    case 'law': tone({ f: hz(-5), dur: 3.5, gain: 0.14, wet: 1 }); tone({ f: hz(-5) * 2.4, dur: 2.5, gain: 0.04, wet: 1 }); break;
    case 'wake': [0, 2, 4, 7, 9].forEach(function (d, k) { tone({ f: hz(5 + d), dur: 1.2, gain: 0.04, at: k * 0.12, wet: 0.9 }); }); break;
  }
};
root.SWA = A;
})(typeof window !== 'undefined' ? window : globalThis);
