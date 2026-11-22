/* Required Notice: Copyright (c) 2026 Nova Spivack (https://github.com/novaspivack/evolu)
   Evolu is licensed under the PolyForm Noncommercial License 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0

   Evolu engine: a deterministic world whose laws are data.
   Everything the simulation does reads from world.laws (the rule registry).
   No DOM, no AI: runs the same in a browser, in Node, and inside an agent's
   imagined forecast. */
(function (root) {
'use strict';
const SW = {};
const T = { WATER: 0, SAND: 1, GRASS: 2, FOREST: 3, ROCK: 4, SHALLOWS: 5, MARSH: 6, DESERT: 7, SNOW: 8, VOID: 9 };
SW.T = T;
SW.TERRAIN = ['water', 'sand', 'grass', 'forest', 'rock', 'shallows', 'marsh', 'desert', 'snow', 'the unknown'];
SW.SEASONS = ['spring', 'summer', 'autumn', 'winter'];
SW.DIRS = { N: [0, -1], NE: [1, -1], E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1] };
const noop = function () {};

/* ---------- deterministic randomness (state lives in the world) ---------- */
function rnd(w) {
  w.rng = (w.rng + 0x6D2B79F5) | 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function ri(w, n) { return Math.floor(rnd(w) * n); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function cheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
function sign(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
SW.rnd = rnd; SW.cheb = cheb; SW.clamp = clamp;

/* ---------- the rule registry ---------- */
SW.defaultLaws = function () {
  return {
    time: { dayLength: 240, nightFraction: 0.35, seasonDays: 3, winterGrowth: 0.25, winterCold: 0.06, winterWither: 0.0025, springGrowth: 1.3, harvestGrowth: 1.1 },
    body: {
      baseDrain: 0.085, moveCost: 0.045, restFactor: 0.55, nightCold: 0.07, shelterShield: 0.9,
      healRate: 0.06, healAbove: 50, lifespan: 19200, carryMax: 6, sight: 7, hearing: 9,
      speechCost: 0.02, foresightCost: 2, biteSeedChance: 0.3, thirstRate: 0.25, thirstHarm: 0.04, thirstWound: 0.12
    },
    fight: { agentDamage: 14, angerBonus: 0.5, huntChance: 0.45, predatorKillChance: 0.25, predatorBite: 14, fleshFood: 3, fleshEnergy: 18, stealChance: 0.6, noticeChance: 0.6 },
    mate: { minEnergy: 70, cost: 25, childEnergy: 55, minAgeFraction: 0.14, cooldown: 900, maxPopulation: 60, twinChance: 0.2, sexes: 1, plentyCooldown: 0.6 },
    /* when the living fall below a floor, a small band comes into the land from beyond its edge: of the people that has fewest left */
    arrivals: { floor: 10, size: 4, gapDays: 4 },
    /* the known world ends in mist. One who stands at it may venture in: a band has a few attempts, then its will must return */
    explore: { chance: 0.5, pushes: 3, restDays: 5, cost: 8, depth: 10, length: 40, finds: 3, beasts: 0.5, strangers: 0.2 },
    /* standing among others: what earns it, what loses it, and how much of it one needs before another will follow */
    status: { wealth: 1, deeds: 1, knowledge: 1, children: 1, works: 1, followers: 1, giving: 1, renown: 1, shame: 1, leadNeeds: 1.2, shameFade: 0.9 },
    /* how ways are come to: what a being has suffered sharpens it toward the ways that would answer it; what it already knows in a line helps with the next */
    discovery: { needBoost: 0.6, kinBoost: 0.04, floor: 0.35, pressFade: 0.85, pressMax: 3 },
    culture: { faithComfort: 0.004, faithStanding: 0.2, tameTrust: 0.6 },
    age: { childUntil: 0.1, elderFrom: 0.8, childStrength: 0.45, elderStrength: 0.7, childDrain: 0.75, elderMove: 1.5, elderTeach: 1.5, childLearn: 1.5 },
    water: { swim: 1, swimDrain: 0.15, fishChance: 0.09, fishFood: 14, fishRecover: 300, winterFish: 0.5, riverFert: 0.25, oreSeams: 0.1 },
    disease: { rawChance: 0.05, marshChance: 0.0005, spread: 0.008, drain: 0.045, harm: 0.035, length: 480, immunity: 2400 },
    /* how loudly each inner drive speaks, for every being; 1 is as written, 0 silences it */
    drives: { hunger: 1, pain: 1, sickness: 1, dread: 1, cold: 1, loneliness: 1, missing: 1, resentment: 1, anger: 1, grief: 1, fear: 1, envy: 1, ambition: 1, belonging: 1, family: 1, temptation: 1, curiosity: 1, restlessness: 1, longing: 1, mortality: 1, purpose: 1, freedom: 1, jealousy: 1, selfdoubt: 1, compassion: 1, guilt: 1, awe: 1, insecurity: 1, pride: 1, gratitude: 1, loyalty: 1, betrayal: 1, devotion: 1, guile: 1, obsession: 1, thirst: 1, deference: 1, discontent: 1, contentment: 1, homeseeking: 1, territory: 1, strangeness: 1, standing: 1, legacy: 1, beyond: 1, calling: 1, desire: 1 },
    /* kinds of building beyond a plain shelter. Each is a roof like any other, plus what it does: effects on one who spends time in it
       (once a day), bonds made between those gathered there, sight from its top, longer-lasting tools made beside it. Recipes may require one. */
    buildings: {
      hall: { wood: 6, stone: 2, bond: 0.05, fx: [{ on: 'joy', by: 0.2 }, { on: 'lonely', by: -0.4 }], hint: 'a great roof where a band gathers: those who spend time in it together grow closer' },
      shrine: { wood: 2, stone: 4, fx: [{ on: 'fear', by: -0.4 }, { on: 'grief', by: -0.3 }, { on: 'joy', by: 0.2 }], hint: 'a still place set apart: it eases fear and grief in one who spends time there' },
      workshop: { way: 'tools', wood: 5, stone: 2, craft: 0.6, fx: [{ on: 'learning', times: 1.3, for: 240 }], hint: 'a place for making: tools crafted in or beside it last much longer' },
      tower: { way: 'masonry', wood: 4, stone: 4, sight: 5, fx: [{ on: 'fear', by: -0.2 }], hint: 'a height to watch from: one who stands in it sees much farther' },
      kiln: { way: 'pottery', wood: 2, stone: 6, craft: 0.3, hint: 'a fire-house for baking clay hard' },
      school: { way: 'schooling', wood: 6, stone: 4, bond: 0.03, fx: [{ on: 'learning', times: 1.6, for: 480 }], hint: 'a place of teaching: one who spends time there learns far more from a teacher' },
      forge: { way: 'smelting', wood: 4, stone: 8, craft: 1, hint: 'a great fire for metal: tools made in or beside it last twice as long' },
      mill: { way: 'milling', wood: 8, stone: 6, hint: 'grinding-stones under a roof: grain becomes bread here' },
      well: { way: 'wells', wood: 2, stone: 8, water: 1, hint: 'a shaft down to water: one beside it never thirsts' },
      stone: { way: 'monuments', wood: 0, stone: 8, fx: [{ on: 'joy', by: 0.15 }, { on: 'fear', by: -0.2 }], hint: 'a standing stone, raised to mark that a people was here' },
      statue: { way: 'monuments', wood: 2, stone: 18, bond: 0.04, fx: [{ on: 'joy', by: 0.3 }, { on: 'grief', by: -0.2 }], hint: 'a great figure in stone. A great work: many hands, many days' },
      moot: { way: 'law', wood: 10, stone: 6, bond: 0.06, fx: [{ on: 'anger', by: -0.5 }], hint: 'a house where quarrels are settled: anger cools in it and those who meet there grow closer' },
      dock: { way: 'sailing', wood: 12, stone: 4, hint: 'a landing for boats' },
      observatory: { way: 'mathematics', wood: 6, stone: 14, sight: 8, fx: [{ on: 'learning', times: 1.5, for: 480 }], hint: 'a place to watch the sky and reckon' },
      temple: { way: 'architecture', wood: 10, stone: 30, bond: 0.08, fx: [{ on: 'fear', by: -0.6 }, { on: 'grief', by: -0.5 }, { on: 'joy', by: 0.4 }], hint: 'a great house for what a people holds sacred. A great work' },
      pyramid: { way: 'architecture', wood: 0, stone: 60, bond: 0.06, fx: [{ on: 'joy', by: 0.5 }, { on: 'fear', by: -0.4 }], hint: 'a mountain raised by hands. The greatest of works: a whole people, a whole season' },
      market: { way: 'cities', wood: 10, stone: 8, bond: 0.05, fx: [{ on: 'joy', by: 0.2 }], hint: 'a place where peoples meet to trade: those who meet there grow closer' },
      infirmary: { way: 'surgery', wood: 8, stone: 6, fx: [{ on: 'health', by: 25 }, { on: 'sick', by: -1 }], hint: 'a house of healing: the hurt and the sick mend there' },
      windmill: { way: 'mechanics', wood: 14, stone: 8, craft: 0.5, hint: 'sails that turn stones: it does the work of many hands' },
      press: { way: 'printing', wood: 12, stone: 6, fx: [{ on: 'lore', by: 0.2 }, { on: 'learning', times: 1.8, for: 720 }], hint: 'a printing-house: what is known is set down in many copies' },
      enginehouse: { way: 'steam', wood: 10, stone: 20, craft: 1.5, hint: 'fire made to work' },
      library: { way: 'scholarship', wood: 10, stone: 10, fx: [{ on: 'learning', times: 1.8, for: 720 }], bond: 0.03, hint: 'a house of what is known. A great work' },
      barracks: { way: 'armour', wood: 8, stone: 4, fx: [{ on: 'strength', times: 1.3, for: 480 }, { on: 'fear', by: -0.3 }], hint: 'a house for those who fight: one who spends time there strikes harder' },
      university: { way: 'science', wood: 12, stone: 24, fx: [{ on: 'learning', times: 2.2, for: 720 }, { on: 'lore', by: 0.2 }], bond: 0.04, hint: 'a great house of learning. A great work' },
      factory: { way: 'steam', wood: 10, stone: 16, craft: 2, hint: 'many hands and one engine: what is made here lasts three times as long. A great work' },
      hospital: { way: 'genetics', wood: 10, stone: 20, fx: [{ on: 'health', by: 40 }, { on: 'sick', by: -1 }], hint: 'a great house of healing. A great work' },
      airport: { way: 'flight', wood: 6, stone: 30, sight: 6, hint: 'a ground for machines that fly. A great work' },
      spaceport: { way: 'spaceflight', wood: 10, stone: 70, sight: 10, fx: [{ on: 'joy', by: 0.5 }, { on: 'lore', by: 0.3 }], hint: 'a ground for ships that leave the world. The greatest of works' },
      powerhouse: { way: 'electricity', wood: 10, stone: 30, sight: 4, fx: [{ on: 'joy', by: 0.3 }], hint: 'light without flame'  }
    },
    land: { rockMove: 1.8, marshMove: 1.6, snowMove: 1.6, shallowsMove: 3, forestMove: 1.1, desertThirst: 0.03, snowCold: 0.05 },
    build: { shelterWood: 3, wallWood: 2, razeChance: 0.25, woodChance: 0.5, woodMax: 6, fellChance: 0.25, treeRegrow: 0.5 },
    weather: { meanDuration: 200, rainGrowth: 1.6, droughtGrowth: 0.35, rainCold: 0.015, stormCold: 0.08, snowCold: 0.03, droughtThirst: 0.02, strikeChance: 0.006, strikeDamage: 24, fogSight: 4, bloom: 0.08, blight: 0.05, herd: 0.05, pack: 0.03, disaster: 0.04 },
    mood: { decay: 0.996 },
    device: { life: 3600, wood: 2, stone: 1, strike: 9, holdMax: 6 },
    home: { minStructures: 2, reach: 4, margin: 3, heal: 1.5 },
    magic: { wane: 0.22, loreToCast: 5, loreToLearnArt: 2.5, cost: 6, duration: 720, maxRadius: 5, maxFields: 12, teachGain: 0.25, greatLore: 10, greatArts: 2, greatHelpers: 2, greatCost: 50, helperCost: 10, greatDuration: 480 },
    ecology: { seeding: 0.75, bounty: 0.6, springBreeding: 1.4, grazerTarget: 90, herdReturn: 0.012, lodeRegrow: 0.01, tameChance: 0.3, leash: 4, pairRange: 5, milkEnergy: 12, rideCost: 0.4, rideCarry: 4, grazeWear: 0.006, pastureHeal: 0.0005, crowding: 4, dormantSeeds: 0.12, wildMutation: 0.004, maxPlantKinds: 44, maxCreatureKinds: 30, grazerCap: 260, hunterCap: 20 },
    craft: { cultivateSkill: 3, cultivateCost: 8, markWood: 1, markLife: 2400, signLife: 5, fireLife: 360, fireWarmth: 0.3, fireReach: 2, cookBonus: 1.5, storeMax: 20, farmGrowth: 1.6, sturdy: 0.4, toolPower: 1.3, toolGrowth: 1.15, toolLore: 0.12, toolWear: 60, maxTools: 3, maxDesigns: 60, stoneMax: 6, oreMax: 4, clayMax: 4, oreChance: 0.35, metalPower: 1.25, metalWear: 3, potWater: 3, potCarry: 2, potMax: 2, potClay: 2 },
    /* what lies in the ground, each in its own kind of land. Deep ones cannot be won by hand. Every one is a thing that can be carried, given, traded and made into other things. */
    minerals: {
      flint: { deep: 0, hue: 28, hint: 'a hard stone that takes an edge' },
      obsidian: { deep: 0, hue: 270, hint: 'black glass from the mountain, the sharpest edge there is' },
      salt: { deep: 0, hue: 200, hint: 'a white crust every body craves, that keeps meat from spoiling' },
      gold: { deep: 0, hue: 46, hint: 'a soft bright metal that never dulls' },
      amber: { deep: 0, hue: 36, hint: 'a golden stone that holds old light' },
      shell: { deep: 0, hue: 330, hint: 'bright shells from the shallows' },
      peat: { deep: 0, hue: 20, hint: 'dark turf that burns slow and hot' },
      tin: { deep: 1, hue: 190, hint: 'a pale ore that, melted with copper, makes a far harder metal' },
      iron: { deep: 1, hue: 8, hint: 'a red-brown ore, the hardest metal, that only a great heat will free' },
      gems: { deep: 1, hue: 150, hint: 'clear coloured stones from deep in the rock' },
      coal: { deep: 1, hue: 240, hint: 'black stone that burns far hotter than wood' },
      oil: { deep: 1, hue: 280, sees: 'science', hint: 'black oil under the ground' },
      uranium: { deep: 1, hue: 100, sees: 'science', hint: 'a heavy ore that is warm to the hand' },
      diamond: { deep: 1, hue: 190, hint: 'the hardest and clearest of stones' }
    },
    /* designs of made things: empty at the start; every entry is something a being invented */
    tools: {},
    plants: {
      berry:  { growth: 0.004, maxFood: 4, regrow: 0.003, nutrition: 14, seedRate: 0.003, seedRadius: 2, lifespan: 4200, root: 'berry', soil: { grass: 1, forest: 0.7 },
        look: { anim: 'none', shapes: [{ t: 'circle', s: 0.34, fill: '#2f6b3a' }, { t: 'circle', x: -0.1, y: -0.1, s: 0.2, fill: '#3f8a4b' }, { t: 'ring', n: 4, d: 0.2, s: 0.085, fill: '#d8324a', per: 'food' }] } },
      grain:  { growth: 0.008, maxFood: 2, regrow: 0.0045, nutrition: 8,  seedRate: 0.006,  seedRadius: 3, lifespan: 1600, root: 'grain', soil: { grass: 1, sand: 0.3 },
        look: { anim: 'sway', shapes: [{ t: 'line', x: -0.14, y: 0.32, x2: -0.2, y2: -0.16, lw: 0.05, stroke: '#a98c35' }, { t: 'line', x: 0, y: 0.32, x2: 0, y2: -0.26, lw: 0.05, stroke: '#b99a3a' }, { t: 'line', x: 0.14, y: 0.32, x2: 0.2, y2: -0.16, lw: 0.05, stroke: '#a98c35' }, { t: 'ring', n: 2, d: 0.2, y: -0.24, s: 0.08, fill: '#f2d263', per: 'food' }] } },
      redcap: { growth: 0.006, maxFood: 3, regrow: 0.005,  nutrition: -5, seedRate: 0.0022, seedRadius: 2, lifespan: 3000, root: 'cap', soil: { forest: 1, marsh: 0.8, grass: 0.4 },
        look: { anim: 'none', shapes: [{ t: 'rect', y: 0.14, w: 0.06, h: 0.16, fill: '#e9e2d0' }, { t: 'ellipse', y: -0.08, w: 0.32, h: 0.19, fill: '#c22a2a' }, { t: 'ring', n: 3, d: 0.15, y: -0.1, s: 0.04, fill: '#fff4e0', per: 'food' }] } },
      thornpear: { growth: 0.003, maxFood: 3, regrow: 0.002, nutrition: 12, seedRate: 0.002, seedRadius: 3, lifespan: 6000, root: 'pear', hardy: 1, soil: { desert: 1, sand: 0.5 },
        look: { anim: 'none', shapes: [{ t: 'ellipse', y: 0.08, w: 0.16, h: 0.3, fill: '#5f9a55' }, { t: 'ellipse', x: -0.2, y: 0, w: 0.09, h: 0.17, rot: -25, fill: '#6aa860' }, { t: 'ellipse', x: 0.2, y: -0.04, w: 0.09, h: 0.17, rot: 25, fill: '#6aa860' }, { t: 'ring', n: 3, d: 0.2, y: -0.2, s: 0.07, fill: '#e85c9a', per: 'food' }] } },
      mudroot: { growth: 0.005, maxFood: 2, regrow: 0.004, nutrition: 18, seedRate: 0.004, seedRadius: 2, lifespan: 2600, root: 'root', hardy: 1, soil: { marsh: 1 },
        look: { anim: 'sway', shapes: [{ t: 'ellipse', x: -0.12, y: 0, w: 0.07, h: 0.3, rot: -18, fill: '#5d7f3a' }, { t: 'ellipse', x: 0.12, y: 0, w: 0.07, h: 0.3, rot: 18, fill: '#6b9144' }, { t: 'ellipse', y: -0.04, w: 0.06, h: 0.34, fill: '#7aa24f' }, { t: 'ring', n: 2, d: 0.14, y: 0.26, s: 0.09, fill: '#c9a26b', per: 'food' }] } },
      frostmoss: { growth: 0.004, maxFood: 3, regrow: 0.004, nutrition: 6, seedRate: 0.004, seedRadius: 2, lifespan: 5000, root: 'moss', hardy: 1, soil: { snow: 1 },
        look: { anim: 'none', shapes: [{ t: 'ellipse', w: 0.36, h: 0.2, fill: '#7fb7b0' }, { t: 'ellipse', x: 0.08, y: -0.06, w: 0.2, h: 0.12, fill: '#a5d6cf' }, { t: 'ring', n: 3, d: 0.18, s: 0.05, fill: '#e9fbff', per: 'food' }] } },
      ironnut: { growth: 0.002, maxFood: 2, regrow: 0.0015, nutrition: 22, seedRate: 0.0015, seedRadius: 3, lifespan: 9000, root: 'nut', hardy: 1, soil: { forest: 1 },
        look: { anim: 'none', shapes: [{ t: 'rect', y: 0.2, w: 0.05, h: 0.16, fill: '#5a3d26' }, { t: 'circle', y: -0.1, s: 0.3, fill: '#1f5a3a' }, { t: 'circle', x: -0.1, y: -0.18, s: 0.16, fill: '#2a7048' }, { t: 'ring', n: 2, d: 0.16, y: -0.06, s: 0.075, fill: '#8a5a2b', per: 'food' }] } },
      sunleaf: { growth: 0.006, maxFood: 2, regrow: 0.004, nutrition: 2, heal: 14, seedRate: 0.003, seedRadius: 2, lifespan: 2000, root: 'leaf', soil: { grass: 0.8, forest: 0.5 },
        look: { anim: 'sway', shapes: [{ t: 'line', x: 0, y: 0.32, x2: 0, y2: -0.05, lw: 0.04, stroke: '#4f8a3a' }, { t: 'ring', n: 6, d: 0.16, y: -0.12, s: 0.085, fill: '#f6d24a' }, { t: 'circle', y: -0.12, s: 0.08, fill: '#e58a2a' }, { t: 'ring', n: 2, d: 0.2, y: 0.18, s: 0.05, fill: '#9fe07a', per: 'food' }] } },
      dreamcap: { growth: 0.005, maxFood: 2, regrow: 0.003, nutrition: -4, lore: 0.3, joy: 0.4, seedRate: 0.002, seedRadius: 2, lifespan: 2400, root: 'cap', soil: { marsh: 1, forest: 0.5 },
        look: { anim: 'pulse', shapes: [{ t: 'rect', y: 0.16, w: 0.04, h: 0.16, fill: '#d8cfe8' }, { t: 'ellipse', y: -0.06, w: 0.26, h: 0.18, fill: '#6b4bd8' }, { t: 'ring', n: 4, d: 0.13, y: -0.07, s: 0.035, fill: '#9ff0ff', per: 'food' }] } },
      sapcane: { growth: 0.004, maxFood: 3, regrow: 0.003, nutrition: 3, fx: [{ on: 'thirst', by: -70 }], seedRate: 0.002, seedRadius: 3, lifespan: 5000, root: 'cane', hardy: 1, biomes: ['desert'], soil: { desert: 1, sand: 0.6 }, form: { form: 'stalk', hue: 95 } },
      sunfig: { growth: 0.003, maxFood: 4, regrow: 0.002, nutrition: 20, seedRate: 0.002, seedRadius: 2, lifespan: 8000, root: 'fig', biomes: ['desert'], soil: { grass: 1, sand: 0.3 }, form: { form: 'frond', hue: 30 } },
      cloudberry: { growth: 0.004, maxFood: 3, regrow: 0.003, nutrition: 12, seedRate: 0.003, seedRadius: 2, lifespan: 4000, root: 'cloud', hardy: 1, biomes: ['tundra'], soil: { snow: 0.8, grass: 0.7 }, form: { form: 'rosette', hue: 40 } },
      hazel: { growth: 0.003, maxFood: 3, regrow: 0.002, nutrition: 16, seedRate: 0.002, seedRadius: 3, lifespan: 8000, root: 'hazel', hardy: 1, biomes: ['woodland'], soil: { forest: 1, grass: 0.4 }, form: { form: 'bush', hue: 28 } },
      reedbulb: { growth: 0.006, maxFood: 3, regrow: 0.004, nutrition: 11, seedRate: 0.004, seedRadius: 2, lifespan: 2600, root: 'reed', hardy: 1, biomes: ['lakeland'], soil: { grass: 0.8, sand: 0.8, marsh: 0.6 }, form: { form: 'reed', hue: 60 } },
      plainsroot: { growth: 0.004, maxFood: 2, regrow: 0.003, nutrition: 13, seedRate: 0.003, seedRadius: 2, lifespan: 4000, root: 'plainsroot', hardy: 1, biomes: ['steppe', 'highland'], soil: { grass: 0.8 }, form: { form: 'rosette', hue: 20 } },
      goldgrass: { growth: 0.008, maxFood: 3, regrow: 0.005, nutrition: 9, seedRate: 0.006, seedRadius: 3, lifespan: 1800, root: 'goldgrass', biomes: ['steppe'], soil: { grass: 1 }, form: { form: 'stalk', hue: 48 } },
      highbloom: { growth: 0.004, maxFood: 2, regrow: 0.003, nutrition: 3, heal: 10, fx: [{ on: 'warmth', times: 1.4, for: 480 }], seedRate: 0.002, seedRadius: 2, lifespan: 3000, root: 'bloom', biomes: ['highland'], soil: { grass: 0.9, forest: 0.4 }, form: { form: 'flower', hue: 280 } },
      bitterleaf: { growth: 0.005, maxFood: 2, regrow: 0.003, nutrition: 1, fx: [{ on: 'sick', by: -1 }, { on: 'joy', by: -0.1 }], seedRate: 0.003, seedRadius: 2, lifespan: 2400, root: 'bitter', biomes: ['marsh'], soil: { marsh: 1, grass: 0.3 }, form: { form: 'vine', hue: 170 } },
      emberroot: { growth: 0.004, maxFood: 2, regrow: 0.003, nutrition: 8, anger: 0.4, hurt: 3, seedRate: 0.002, seedRadius: 2, lifespan: 3200, root: 'ember', soil: { desert: 1, sand: 0.3 },
        look: { anim: 'none', shapes: [{ t: 'star', n: 6, s: 0.3, fill: '#8a2a1a' }, { t: 'star', n: 6, s: 0.18, rot: 30, fill: '#e2552f' }, { t: 'ring', n: 2, d: 0.1, s: 0.05, fill: '#ffd24a', per: 'food' }] } }
    },
    creatures: {
      hopper: {
        predator: 0, drain: 0.06, speed: 0.68, maxEnergy: 60, breedAt: 44, breedCost: 22, breedChance: 0.002,
        matureAge: 300, lifespan: 3200, meat: 2, meatEnergy: 16, fleeRange: 5, wary: 2, grazeGain: 11,
        grazeSpare: 1, minPop: 8, migrate: 0.004, room: 46, root: 'hopper', wool: 1, home: ['grass', 'forest'],
        look: { anim: 'bob', shapes: [{ t: 'ellipse', w: 0.26, h: 0.18, fill: '#c9a877' }, { t: 'ellipse', x: -0.08, y: -0.24, w: 0.05, h: 0.13, rot: -12, fill: '#b8956a' }, { t: 'ellipse', x: 0.06, y: -0.24, w: 0.05, h: 0.13, rot: 12, fill: '#b8956a' }, { t: 'circle', x: 0.13, y: -0.04, s: 0.035, fill: '#2a1c10' }] }
      },
      skit: {
        predator: 0, drain: 0.045, speed: 0.92, maxEnergy: 30, breedAt: 22, breedCost: 10, breedChance: 0.003,
        matureAge: 200, lifespan: 1800, meat: 1, meatEnergy: 10, fleeRange: 5, wary: 4, grazeGain: 8,
        grazeSpare: 1, minPop: 5, migrate: 0.005, room: 30, roams: 0.35, root: 'skit', spreads: 0.25, home: ['grass', 'sand', 'desert'],
        look: { anim: 'bob', shapes: [{ t: 'ellipse', w: 0.15, h: 0.11, fill: '#e6c34a' }, { t: 'tri', x: -0.17, y: 0, s: 0.09, rot: -90, fill: '#c99a2a' }, { t: 'tri', x: 0.17, y: -0.01, s: 0.05, rot: 90, fill: '#e2552f' }, { t: 'circle', x: 0.07, y: -0.03, s: 0.025, fill: '#1a1408' }] }
      },
      hornback: {
        predator: 0, drain: 0.05, speed: 0.35, maxEnergy: 120, breedAt: 92, breedCost: 45, breedChance: 0.0012,
        matureAge: 800, lifespan: 7000, meat: 6, meatEnergy: 16, fleeRange: 2, wary: 1, grazeGain: 14,
        grazeSpare: 1, minPop: 4, migrate: 0.004, room: 18, roams: 0.5, root: 'hornback', tough: 3, gore: 12, milk: 1, ride: 1, home: ['grass', 'marsh'],
        look: { anim: 'sway', shapes: [{ t: 'ellipse', w: 0.46, h: 0.3, fill: '#6b5a4a' }, { t: 'ellipse', x: 0.36, y: -0.06, w: 0.18, h: 0.16, fill: '#7a6858' }, { t: 'tri', x: 0.5, y: -0.2, s: 0.09, rot: 30, fill: '#efe6d2' }, { t: 'circle', x: 0.42, y: -0.08, s: 0.03, fill: '#140e08' }, { t: 'rect', x: -0.2, y: 0.3, w: 0.05, h: 0.1, fill: '#4f4236' }, { t: 'rect', x: 0.16, y: 0.3, w: 0.05, h: 0.1, fill: '#4f4236' }] }
      },
      stalker: {
        predator: 1, drain: 0.05, speed: 0.6, maxEnergy: 80, breedAt: 66, breedCost: 34, breedChance: 0.004,
        matureAge: 600, lifespan: 5200, meat: 3, meatEnergy: 16, range: 5, killChance: 0.3, gain: 26,
        agentHunger: 28, minPop: 2, migrate: 0.0015, room: 9, root: 'stalker', home: ['forest', 'grass', 'rock'],
        look: { anim: 'sway', shapes: [{ t: 'line', x: -0.26, y: 0.02, x2: -0.46, y2: -0.14, lw: 0.06, stroke: '#3b2a4d' }, { t: 'ellipse', w: 0.32, h: 0.19, fill: '#3b2a4d' }, { t: 'tri', x: 0.3, y: 0, s: 0.17, rot: 90, fill: '#4a3560' }, { t: 'circle', x: 0.3, y: -0.05, s: 0.04, fill: '#ffd23f' }] }
      },
      ridgecat: {
        predator: 1, drain: 0.045, speed: 0.75, maxEnergy: 100, breedAt: 82, breedCost: 40, breedChance: 0.002,
        matureAge: 900, lifespan: 7000, meat: 4, meatEnergy: 16, range: 6, killChance: 0.6, gain: 30,
        agentHunger: 65, bite: 20, minPop: 1, migrate: 0.001, room: 5, root: 'cat', tough: 3, home: ['snow', 'rock'],
        look: { anim: 'sway', shapes: [{ t: 'line', x: -0.3, y: 0.04, x2: -0.52, y2: 0.16, lw: 0.07, stroke: '#cfd6dc' }, { t: 'ellipse', w: 0.38, h: 0.21, fill: '#dfe5ea' }, { t: 'circle', x: 0.32, y: -0.06, s: 0.15, fill: '#eef2f5' }, { t: 'tri', x: 0.24, y: -0.2, s: 0.07, fill: '#b9c2ca' }, { t: 'tri', x: 0.4, y: -0.2, s: 0.07, fill: '#b9c2ca' }, { t: 'circle', x: 0.36, y: -0.07, s: 0.035, fill: '#3fd0ff' }, { t: 'ring', n: 4, d: 0.14, x: -0.04, s: 0.035, fill: '#9aa4ad' }] }
      },
      plainsox: { predator: 0, drain: 0.05, speed: 0.45, maxEnergy: 120, breedAt: 92, breedCost: 45, breedChance: 0.0014, matureAge: 800, lifespan: 7000, meat: 6, meatEnergy: 16, fleeRange: 3, wary: 2, grazeGain: 14, grazeSpare: 1, minPop: 4, migrate: 0.004, room: 22, roams: 0.6, root: 'ox', tough: 3, gore: 8, milk: 1, ride: 1, home: ['grass'], biomes: ['steppe'], form: { build: 'stocky', head: 'curved', pattern: 'saddle', hue: 24 } },
      tusker: { predator: 0, drain: 0.05, speed: 0.3, maxEnergy: 170, breedAt: 130, breedCost: 60, breedChance: 0.001, matureAge: 1000, lifespan: 9000, meat: 9, meatEnergy: 16, fleeRange: 2, wary: 1, grazeGain: 16, grazeSpare: 1, minPop: 3, migrate: 0.003, room: 10, roams: 0.5, root: 'tusker', tough: 5, gore: 18, wool: 1, home: ['snow', 'grass'], biomes: ['tundra'], form: { build: 'stocky', head: 'tusks', pattern: 'hump', hue: 20 } },
      sandstrider: { predator: 0, drain: 0.035, speed: 0.85, maxEnergy: 70, breedAt: 54, breedCost: 26, breedChance: 0.002, matureAge: 600, lifespan: 5000, meat: 3, meatEnergy: 14, fleeRange: 5, wary: 3, grazeGain: 10, grazeSpare: 1, minPop: 3, migrate: 0.004, room: 14, roams: 0.6, root: 'strider', ride: 1, home: ['desert', 'sand', 'grass'], biomes: ['desert'], form: { build: 'tall', head: 'none', tail: 'line', hue: 40 } },
      fenfowl: { predator: 0, drain: 0.045, speed: 0.9, maxEnergy: 30, breedAt: 22, breedCost: 10, breedChance: 0.003, matureAge: 200, lifespan: 1800, meat: 1, meatEnergy: 10, fleeRange: 5, wary: 4, grazeGain: 8, grazeSpare: 1, minPop: 5, migrate: 0.005, room: 26, roams: 0.3, root: 'fowl', home: ['marsh', 'grass', 'sand'], biomes: ['marsh', 'lakeland'], form: { build: 'small', head: 'crest', tail: 'up', hue: 182 } },
      bristleboar: { predator: 0, drain: 0.05, speed: 0.55, maxEnergy: 80, breedAt: 60, breedCost: 30, breedChance: 0.002, matureAge: 500, lifespan: 5000, meat: 4, meatEnergy: 16, fleeRange: 2, wary: 1, grazeGain: 12, grazeSpare: 1, minPop: 3, migrate: 0.004, room: 14, roams: 0.3, root: 'boar', tough: 2, gore: 10, home: ['forest', 'grass'], biomes: ['woodland'], form: { build: 'stocky', head: 'tusks', tail: 'stub', pattern: 'stripes', hue: 14 } },
      frostfang: { predator: 1, drain: 0.05, speed: 0.65, maxEnergy: 80, breedAt: 66, breedCost: 34, breedChance: 0.004, matureAge: 600, lifespan: 5200, meat: 3, meatEnergy: 16, range: 5, killChance: 0.3, gain: 26, agentHunger: 28, minPop: 2, migrate: 0.0015, room: 7, root: 'fang', home: ['snow', 'grass', 'forest'], biomes: ['tundra'], form: { build: 'slim', head: 'fangs', tail: 'bushy', hue: 205 } },
      dunecat: { predator: 1, drain: 0.045, speed: 0.75, maxEnergy: 100, breedAt: 82, breedCost: 40, breedChance: 0.002, matureAge: 900, lifespan: 7000, meat: 4, meatEnergy: 16, range: 6, killChance: 0.6, gain: 30, agentHunger: 65, bite: 20, minPop: 1, migrate: 0.001, room: 4, root: 'dunecat', tough: 3, home: ['desert', 'sand', 'rock'], biomes: ['desert'], form: { build: 'long', head: 'ears', pattern: 'spots', hue: 36 } }
    },
    /* Paths of knowledge. Each is a capability the world allows; what a being makes of it (its name, idea and look) is its own. */
/* things that can be made or done, each opened by a way. Beings discover that they exist by coming to the way. */
    recipes: {
      cloak: { way: 'weaving', needs: { thing: 'wool', thingN: 2 }, gives: { thing: 'cloak' }, hint: 'Wool worked into a cloak: while you hold it the cold bites far less, winter and night alike.' },
      trailcake: { way: null, needs: { food: 'any', foodN: 3, fire: true }, gives: { food: { k: 'trailcake', n: 44, count: 1 } }, hint: 'Three foods pressed and dried at a fire into one cake: it takes one place in the hands, feeds like three, and keeps.' },
      bow: { way: 'archery', needs: { wood: 3 }, gives: { thing: 'bow' }, hint: 'A bow: while you hold it hunting goes better and your blows land harder.' },
      shield: { way: 'armour', needs: { wood: 4 }, gives: { thing: 'shield' }, hint: 'A shield: while you hold it blows land on you less hard.' },
      armour: { way: 'armour', needs: { ore: 3, fire: true }, gives: { thing: 'armour' }, hint: 'Armour of metal: while you wear it blows land on you far less hard.' },
      ram: { way: 'siegecraft', needs: { wood: 12, thing: 'cart' }, gives: { thing: 'ram' }, hint: 'A ram on wheels: with it walls and buildings come down three times as fast.' },
      catapult: { way: 'siegecraft', needs: { wood: 16, stone: 6, thing: 'cart' }, gives: { thing: 'catapult' }, hint: 'An engine that throws stones: walls come down five times as fast.' },
      musket: { way: 'firearms', needs: { ore: 2, thing: 'iron', at: 'forge' }, gives: { thing: 'musket' }, hint: 'A gun for the hand.' },
      cannon: { way: 'firearms', needs: { ore: 6, thing: 'iron', thingN: 4, at: 'forge' }, gives: { thing: 'cannon' }, hint: 'A great gun for sieges.' },
      basket: { way: 'weaving', needs: { wood: 2 }, gives: { thing: 'basket' }, hint: 'A woven basket: while you hold one you carry 2 more.' },
      cart: { way: 'wheel', needs: { wood: 6 }, gives: { thing: 'cart' }, hint: 'A cart on wheels: while you have one you carry 6 more.' },
      raft: { way: 'rafts', needs: { wood: 6 }, gives: { thing: 'raft' }, hint: 'Logs lashed into a raft: with one you can cross deep water, slowly.' },
      boat: { way: 'boats', needs: { wood: 10, tool: 'build' }, gives: { thing: 'boat' }, hint: 'A hollowed, rowed boat: deep water at a walking pace, and 3 more carried while afloat.' },
      sail: { way: 'weaving', needs: { thing: 'wool', thingN: 3 }, gives: { thing: 'sail' }, hint: 'Cloth to catch the wind.' },
      ship: { way: 'sailing', needs: { wood: 24, thing: 'sail', at: 'dock' }, gives: { thing: 'ship' }, hint: 'A sailed ship, built at a dock: fast on the water, 10 more carried while afloat.' },
      warship: { way: 'sailing', needs: { wood: 24, ore: 2, thing: 'sail', at: 'dock' }, gives: { thing: 'warship' }, hint: 'A ship to fight from: on the water your blows land half again as hard.' },
      chariot: { way: 'riding', needs: { wood: 4, thing: 'cart' }, gives: { thing: 'chariot' }, hint: 'A fighting cart: on land your blows land harder.' },
      steamship: { way: 'steam', needs: { wood: 20, ore: 4, thing: 'coal', thingN: 4, at: 'dock' }, gives: { thing: 'steamship' }, hint: 'A ship driven by fire.' },
      ironclad: { way: 'steam', needs: { ore: 4, thing: 'iron', thingN: 6, at: 'dock' }, gives: { thing: 'ironclad' }, hint: 'An armoured ship driven by fire.' },
      engine: { way: 'railways', needs: { ore: 4, thing: 'iron', thingN: 4, at: 'enginehouse' }, gives: { thing: 'engine' }, hint: 'A cart that pulls itself.' },
      airship: { way: 'flight', needs: { wood: 10, thing: 'sail', thingN: 3, at: 'powerhouse' }, gives: { thing: 'airship' }, hint: 'A vessel of the air.' },
      bread: { way: 'milling', needs: { food: 'grain', foodN: 2, at: 'mill' }, gives: { food: { k: 'bread', n: 30, count: 2 } }, hint: 'Grain ground at a mill and baked: two loaves, each worth far more than the grain.' },
      saltmeat: { way: 'storage', needs: { food: 'meat', thing: 'salt' }, gives: { food: { k: 'saltmeat', n: 24, count: 1 } }, hint: 'Meat rubbed with salt: it feeds well and never sickens.' },
      charm: { way: 'tools', needs: { thing: 'amber' }, gives: { thing: 'amber charm' }, hint: 'Amber shaped into a charm. A thing to wear, to give, to trade.' },
      talisman: { way: 'tools', needs: { thing: 'flint' }, gives: { thing: 'flint talisman' }, hint: 'Flint knapped into a talisman and worn: its bearer is a little luckier, and it is a thing others notice.' },
      'shell talisman': { way: null, needs: { thing: 'shell' }, gives: { thing: 'shell talisman' }, hint: 'A shell pierced and worn: its bearer tires a little less, and it is a thing others notice.' },
      'obsidian talisman': { way: 'tools', needs: { thing: 'obsidian' }, gives: { thing: 'obsidian talisman' }, hint: 'Black glass shaped and worn: blows land a little less hard on its bearer, and it is a thing others notice.' },
      carving: { way: 'tools', needs: { stone: 3, tool: 'build' }, gives: { thing: 'carved figure' }, hint: 'Stone worked into a figure of a person, a beast or something never seen. It does nothing but be looked at, kept, given and remembered.' },
      shellstring: { way: 'tools', needs: { thing: 'shell', thingN: 2 }, gives: { thing: 'shell string' }, hint: 'Shells strung together. A thing to wear, to give, to trade.' },
      coin: { way: 'currency', needs: { thing: 'gold', fire: true }, gives: { thing: 'coin', n: 3 }, hint: 'Gold struck into three coins: small, lasting, and the same everywhere. Something to trade with.' },
      jewel: { way: 'smelting', needs: { thing: 'gems', fire: true }, gives: { thing: 'jewel' }, hint: 'A cut stone set in metal. A thing of great worth to give or trade.' },
      lens: { way: 'glass', needs: { clay: 2, fire: true }, gives: { thing: 'lens', fx: [{ on: 'learning', times: 1.4, for: 720 }] }, hint: 'Clear glass that makes small things large.' },
      firepot: { way: 'gunpowder', needs: { thing: 'coal', clay: 1 }, gives: { thing: 'firepot', fx: [{ on: 'strength', times: 2, for: 240 }] }, hint: 'A clay pot of black powder: for a while, your blows land twice as hard.' }
    },
    /* made things that help just by being held */
    goods: {
      basket: { carry: 2 }, cart: { carry: 6 },
      cloak: { boons: { warmth: 1.6 }, status: 0.15, hint: 'worn: the cold bites far less' },
      hidewrap: { boons: { warmth: 1.4 }, hint: 'worn: the cold bites less' },
      'amber charm': { status: 0.3 }, 'flint talisman': { boons: { luck: 1.15 }, status: 0.3 }, 'shell talisman': { boons: { vigor: 1.1 }, status: 0.3 }, 'obsidian talisman': { boons: { toughness: 1.1 }, status: 0.3 }, 'carved figure': { status: 0.35 }, 'shell string': { status: 0.3 }, jewel: { status: 0.8 }, coin: { status: 0.1 }, amberknot: { status: 0.25 }, bead: { status: 0.1 }, ironward: { boons: { toughness: 1.3 }, status: 0.3 },
      bow: { fight: 1.25, boons: { luck: 1.35 }, hint: 'strikes from a distance: hunting goes better, and blows land harder' },
      shield: { boons: { toughness: 1.35 }, hint: 'held: blows land on you less hard' },
      armour: { boons: { toughness: 1.7 }, status: 0.3, hint: 'worn: blows land on you far less hard' },
      ram: { land: 1, raze: 3, hint: 'a great log on wheels: walls and buildings come down three times as fast' },
      catapult: { land: 1, raze: 5, fight: 1.3, hint: 'an engine that throws stones' },
      musket: { fight: 2.2, hint: 'fire and iron in the hand' },
      cannon: { land: 1, raze: 8, fight: 1.6, hint: 'a great gun' },
      raft: { float: 2.6, hint: 'logs lashed together: slow, but it crosses deep water' },
      boat: { float: 1, carry: 3, hint: 'a rowed boat: deep water at a walking pace, and room for cargo' },
      ship: { float: 0.5, carry: 10, hint: 'a sailed ship: fast on the water, with a hold' },
      warship: { float: 0.6, carry: 4, fight: 1.5, hint: 'a ship built to fight from' },
      chariot: { land: 1, fight: 1.4, carry: 2, hint: 'a fighting cart' },
      steamship: { float: 0.3, carry: 16, hint: 'a ship driven by fire' },
      ironclad: { float: 0.4, carry: 6, fight: 2, hint: 'an armoured ship driven by fire' },
      engine: { land: 1, carry: 14, hint: 'a cart that pulls itself' },
      airship: { float: 0.3, carry: 6, fight: 1.3, hint: 'a vessel of the air: water is nothing to it' }
    },
    /* the ways. Each has a line it belongs to, an age of the world it belongs to, the ways that must come first, the understanding it takes,
       and the practice it takes. Coming to a way the first time is slow; one who has watched it done needs half; one who is taught needs only to understand the teacher. */
    tree: {
      tools:    { tree: 'craft',   era: 1, needs: [],                 lore: 0,   stat: 'wood',    n: 8,  hint: 'making things that extend the hand. Once you have it you can invent tools of your own design, for hunting, fishing, fighting, guarding, gathering, harvesting, planting or building, and better them over time' },
      fire:     { tree: 'craft',   era: 1, needs: ['tools'],          lore: 1,   stat: 'wood',    n: 16, hint: 'a kept flame: warmth, light, beasts that keep their distance, and meat and fish that feed more and never sicken when eaten beside it' },
      fishing:  { tree: 'life',    era: 1, needs: [],                 lore: 0.5, stat: 'fished',  n: 6,  hint: 'weirs and lines: you catch fish twice as often' },
      farming:  { tree: 'life',    era: 1, needs: [],                 lore: 0.5, stat: 'planted', n: 8,  hint: 'tending what you sow: it grows faster and harvest never kills it' },
      herding:  { tree: 'life',    era: 1, needs: [],                 lore: 1,   stat: 'tamed',   n: 2,  hint: 'keeping animals: those that are yours can be milked and sheared' },
      signs:    { tree: 'mind',    era: 1, needs: [],                 lore: 1.5, stat: 'marks',   n: 4,  hint: 'marks that last and teach their words to whoever reads them' },
      customs:  { tree: 'society', era: 1, needs: [],                 lore: 1,   stat: 'led',     n: 1,  hint: 'declaring customs that your whole band lives by' },
      storage:  { tree: 'society', era: 1, needs: ['tools'],          lore: 1,   stat: 'built',   n: 3,  hint: 'a store that keeps food for you and your band through the lean season (plan step build with what: store, 2 wood, on bare ground; then stash while standing on it to put carried food in, take to draw it out); with salt, meat that keeps' },
      medicine: { tree: 'life',    era: 1, needs: ['farming'],        lore: 2,   stat: 'healed',  n: 4,  hint: 'using healing plants on yourself and on others' },
      weaving:  { tree: 'craft',   era: 1, needs: ['tools'],          lore: 1.5, stat: 'wood',    n: 14, hint: 'working fibre and wool: baskets to carry more, cloaks against the cold' },
      pottery:  { tree: 'craft',   era: 1, needs: ['fire'],           lore: 2,   stat: 'clay',    n: 5,  hint: 'fired clay: beside a fire, craft a pot (plan step craft with what: pot) from 2 clay; each pot lets you carry 2 more food and three drinks of water' },
      masonry:  { tree: 'craft',   era: 1, needs: ['tools'],          lore: 2,   stat: 'built',   n: 8,  hint: 'building that lasts: cheaper walls that are hard to tear down, towers to watch from' },
      mining:   { tree: 'craft',   era: 1, needs: ['tools'],          lore: 2,   stat: 'mined',   n: 6,  hint: 'working the earth: the deep deposits (tin, iron, gems, coal) can be won, and every deposit yields faster' },
      devices:  { tree: 'craft',   era: 1, needs: ['tools'],          lore: 2.5, stat: 'crafted', n: 4,  hint: 'made things that act by themselves. You give a thing its own rules and set it in the ground: a snare, an alarm, a gate, a post that shares food' },
      rafts:    { tree: 'craft',   era: 1, needs: ['tools'],          lore: 1,   stat: 'wood',    n: 20, hint: 'lashing logs into a raft (plan step make with what: raft): with one, deep water can be crossed, slowly' },
      lorekeeping: { tree: 'mind', era: 1, needs: [],                 lore: 1,   stat: 'told',    n: 3,  hint: 'the keeping of tales, songs and poems: what you tell reaches everyone in earshot, and is remembered' },
      archery:  { tree: 'craft',   era: 1, needs: ['tools'],          lore: 1.5, stat: 'hunted',  n: 6,  hint: 'the bow (make with what: bow): hunting goes better and blows land harder' },
      bridges:  { tree: 'craft',   era: 2, needs: ['masonry', 'rafts'], lore: 3.5, stat: 'built', n: 10, hint: 'spanning water (plan step bridge, 3 wood a step, from the bank or the end of a bridge): what is bridged can be walked by anyone' },
      armour:   { tree: 'craft',   era: 2, needs: ['weaving'],        lore: 3,   stat: 'crafted', n: 6,  hint: 'shields and, with metal, armour: blows land less hard' },
      signals:  { tree: 'mind',    era: 2, needs: ['fire', 'signs'],  lore: 3,   stat: 'marks',   n: 6,  hint: 'smoke and fire read from afar' },
      siegecraft: { tree: 'craft', era: 3, needs: ['masonry', 'wheel'], lore: 6.5, stat: 'raised', n: 20, hint: 'engines against walls: the ram and the catapult' },
      alchemy:  { tree: 'mind',    era: 3, needs: ['medicine', 'pottery'], lore: 6, stat: 'healed', n: 12, hint: 'the mixing of substances: stronger cures and stranger things' },
      scholarship: { tree: 'mind', era: 3, needs: ['writing', 'schooling'], lore: 7, stat: 'taught', n: 14, hint: 'learning kept and argued over: a library can be raised' },
      firearms: { tree: 'craft',   era: 4, needs: ['gunpowder', 'iron'], lore: 12, stat: 'crafted', n: 30, hint: 'guns for the hand and for the siege' },
      science:  { tree: 'mind',    era: 4, needs: ['scholarship', 'mathematics', 'printing'], lore: 12, stat: 'taught', n: 24, hint: 'the testing of every claim: a university can be raised. Where it is known, the old workings of the world grow weak' },
      chemistry: { tree: 'mind',   era: 4, needs: ['alchemy', 'science'], lore: 13, stat: 'healed', n: 30, hint: 'what substances are made of and how they change: the root of fuels, medicines and new materials' },
      physics:  { tree: 'mind',    era: 4, needs: ['mathematics', 'science'], lore: 13, stat: 'taught', n: 30, hint: 'the laws of motion, heat and light: the root of every engine after steam' },
      biology:  { tree: 'life',    era: 4, needs: ['science', 'surgery'], lore: 13, stat: 'healed', n: 30, hint: 'how living things are built and inherit: the root of all later medicine' },
      atomics:  { tree: 'mind',    era: 5, needs: ['physics', 'chemistry'], lore: 17, stat: 'taught', n: 40, hint: 'the second physics: what matter is made of' },
      biochemistry: { tree: 'life', era: 5, needs: ['biology', 'chemistry'], lore: 16, stat: 'healed', n: 40, hint: 'the chemistry of life' },
      quantum:  { tree: 'mind',    era: 6, needs: ['atomics', 'computing'], lore: 22, stat: 'taught', n: 60, hint: 'the third physics: the ground of things' },
      oil:      { tree: 'craft',   era: 5, needs: ['steam', 'chemistry'], lore: 14, stat: 'mined', n: 80, has: { oil: 2 }, hint: 'fire drawn from under the ground' },
      radio:    { tree: 'mind',    era: 5, needs: ['electricity', 'signals'], lore: 16, stat: 'marks', n: 40, hint: 'speech sent through the air' },
      genetics: { tree: 'life',    era: 5, needs: ['biochemistry'], lore: 17, stat: 'healed', n: 40, hint: 'the reading of what makes a body: living things can be changed' },
      nuclear:  { tree: 'craft',   era: 6, needs: ['electricity', 'atomics'], lore: 19, stat: 'mined', n: 120, has: { uranium: 2 }, hint: 'the fire inside matter' },
      internet: { tree: 'mind',    era: 6, needs: ['computing', 'radio'], lore: 21, stat: 'taught', n: 60, hint: 'every reckoning machine joined to every other' },
      spaceflight: { tree: 'craft', era: 6, needs: ['rocketry', 'computing'], lore: 23, stat: 'crafted', n: 80, hint: 'a spaceport can be raised, and what comes down to it comes from other worlds' },
      zeropoint: { tree: 'craft',  era: 6, needs: ['nuclear', 'quantum'], lore: 26, stat: 'mined', n: 200, has: { diamond: 2 }, hint: 'power from the ground of things' },
      boats:    { tree: 'craft',   era: 2, needs: ['rafts', 'fire'],  lore: 3,   stat: 'wood',    n: 40, hint: 'a hollowed, rowed boat (make with what: boat): deep water at a walking pace, with room for cargo' },
      riding:   { tree: 'life',    era: 2, needs: ['herding'],        lore: 3,   stat: 'tamed',   n: 4,  hint: 'mounting an animal that can bear you: twice the ground, half the effort, more carried' },
      schooling:{ tree: 'mind',    era: 2, needs: ['signs'],          lore: 3,   stat: 'taught',  n: 5,  hint: 'teaching that carries twice as far; a school can be raised' },
      smelting: { tree: 'craft',   era: 2, needs: ['fire', 'mining'], lore: 3,   stat: 'ore',     n: 4,  hint: 'metal: anything you craft beside a fire while carrying ore comes out in metal, works a quarter better and lasts three times as long; a forge can be raised' },
      milling:  { tree: 'life',    era: 2, needs: ['farming', 'masonry'], lore: 3.5, stat: 'planted', n: 16, hint: 'a mill can be raised, and grain ground there becomes bread worth far more' },
      wheel:    { tree: 'craft',   era: 2, needs: ['masonry'],        lore: 3.5, stat: 'built',   n: 12, hint: 'the wheel: a cart that carries six more' },
      roads:    { tree: 'society', era: 2, needs: ['masonry', 'wheel'], lore: 4, stat: 'built',   n: 14, hint: 'paving the ground (plan step pave, 1 stone a step): on a road, walking costs half' },
      wells:    { tree: 'craft',   era: 2, needs: ['masonry', 'mining'], lore: 4, stat: 'mined',  n: 12, hint: 'a well can be raised anywhere: water where there was none' },
      writing:  { tree: 'mind',    era: 2, needs: ['signs', 'storage'], lore: 4, stat: 'marks',   n: 10, hint: 'a full written record: signs that hold long texts, accounts and histories' },
      calendar: { tree: 'mind',    era: 2, needs: ['writing'],        lore: 4.5, stat: 'seasons', n: 6,  hint: 'the count of days: you always know how long until each season turns' },
      monuments:{ tree: 'society', era: 2, needs: ['masonry', 'customs'], lore: 4, stat: 'built', n: 12, hint: 'works raised to be seen: a standing stone, a statue. Great works are raised by many hands over many days' },
      currency: { tree: 'society', era: 2, needs: ['smelting', 'customs'], lore: 5, stat: 'trades', n: 6, hint: 'gold struck into coin, the same everywhere, to trade with' },
      law:      { tree: 'society', era: 2, needs: ['customs', 'writing'], lore: 5, stat: 'led',   n: 3,  hint: 'customs set down in writing; a moot-house can be raised where a band settles its quarrels' },
      bronze:   { tree: 'craft',   era: 3, needs: ['smelting'],       lore: 6,   stat: 'crafted', n: 10, has: { tin: 1 }, hint: 'tin melted with copper: carry tin as well as ore when you craft at a fire and the tool comes out in bronze, far better than copper' },
      sailing:  { tree: 'craft',   era: 3, needs: ['boats', 'weaving'], lore: 6, stat: 'wood',    n: 60, hint: 'sails: a dock can be raised, and ships built there, for trade or for war' },
      glass:    { tree: 'craft',   era: 3, needs: ['pottery', 'mining'], lore: 6.5, stat: 'clay', n: 16, hint: 'sand and ash melted clear: lenses' },
      architecture: { tree: 'society', era: 3, needs: ['masonry', 'monuments', 'writing'], lore: 7, stat: 'raised', n: 30, hint: 'the great works: temples and pyramids, raised by a whole people' },
      iron:     { tree: 'craft',   era: 3, needs: ['bronze'],         lore: 7.5, stat: 'crafted', n: 16, has: { iron: 1 }, hint: 'the hardest metal: carry iron when you craft at a forge and the tool comes out in iron' },
      mathematics: { tree: 'mind', era: 3, needs: ['writing', 'calendar'], lore: 7.5, stat: 'taught', n: 10, hint: 'number and measure, the root of every later craft; an observatory can be raised' },
      cities:   { tree: 'society', era: 3, needs: ['law', 'roads', 'storage'], lore: 8, stat: 'raised', n: 40, hint: 'a market can be raised, where peoples meet to trade' },
      surgery:  { tree: 'life',    era: 3, needs: ['medicine', 'writing'], lore: 8, stat: 'healed', n: 20, hint: 'healing by the hand: an infirmary can be raised where the hurt and sick mend fast' },
      mechanics:{ tree: 'craft',   era: 4, needs: ['wheel', 'iron', 'mathematics'], lore: 10, stat: 'crafted', n: 24, hint: 'gears and levers: a windmill can be raised that does the work of many' },
      printing: { tree: 'mind',    era: 4, needs: ['writing', 'mechanics'], lore: 11, stat: 'marks', n: 24, hint: 'the press: a printing-house can be raised, and what is known there spreads to all who visit' },
      gunpowder:{ tree: 'craft',   era: 4, needs: ['mining', 'mathematics'], lore: 11, stat: 'mined', n: 40, has: { coal: 1 }, hint: 'black powder' },
      steam:    { tree: 'craft',   era: 4, needs: ['mechanics', 'iron'], lore: 12, stat: 'crafted', n: 30, has: { coal: 2 }, hint: 'fire made to work: an engine-house can be raised' },
      railways: { tree: 'society', era: 4, needs: ['steam', 'roads'], lore: 13, stat: 'paved', n: 60, hint: 'iron roads' },
      electricity: { tree: 'craft', era: 5, needs: ['steam', 'glass', 'physics'], lore: 15, stat: 'crafted', n: 40, hint: 'the hidden fire in things: a power-house can be raised' },
      flight:   { tree: 'craft',   era: 5, needs: ['electricity', 'mechanics'], lore: 17, stat: 'crafted', n: 50, hint: 'leaving the ground' },
      computing:{ tree: 'mind',    era: 5, needs: ['electricity', 'mathematics'], lore: 18, stat: 'taught', n: 40, hint: 'machines that reckon' },
      rocketry: { tree: 'craft',   era: 5, needs: ['flight', 'gunpowder'], lore: 20, stat: 'crafted', n: 60, hint: 'leaving the world' }
    }
  };
};

/* ---------- time ---------- */
SW.day = function (w) { return Math.floor(w.tick / w.laws.time.dayLength) + 1; };
SW.dayPhase = function (w) { return (w.tick % w.laws.time.dayLength) / w.laws.time.dayLength; };
SW.isNight = function (w) { return SW.dayPhase(w) >= 1 - w.laws.time.nightFraction; };
SW.season = function (w) {
  const year = 4 * w.laws.time.seasonDays * w.laws.time.dayLength;
  return Math.floor(((w.tick % year) / year) * 4);
};
SW.phaseName = function (w) {
  const p = SW.dayPhase(w), n = 1 - w.laws.time.nightFraction;
  if (p >= n) return 'night';
  if (p < 0.08) return 'dawn';
  if (p > n - 0.1) return 'dusk';
  return 'day';
};

SW.WEATHERS = ['clear', 'rain', 'storm', 'drought', 'fog', 'snow'];
SW.sight = function (w) { return w.weather && w.weather.kind === 'fog' ? Math.min(w.laws.body.sight, w.laws.weather.fogSight) : w.laws.body.sight; };

/* ---------- geometry ---------- */
function idx(w, x, y) { return y * w.W + x; }
function inb(w, x, y) { return x >= 0 && y >= 0 && x < w.W && y < w.H; }
function rootOf(w, a) {
  let cur = a;
  for (let k = 0; k < 6 && cur && cur.leader != null; k++) {
    let nx = null;
    for (let i = 0; i < w.agents.length; i++) if (w.agents[i].id === cur.leader && !w.agents[i].dead) { nx = w.agents[i]; break; }
    if (!nx) break; cur = nx;
  }
  return cur;
}
SW.rootOf = rootOf;
function allied(w, a, otherId) {
  if (a.id === otherId) return true;
  let o = null;
  for (let i = 0; i < w.agents.length; i++) if (w.agents[i].id === otherId) { o = w.agents[i]; break; }
  if (!o || o.dead) return false;
  return rootOf(w, a) === rootOf(w, o);
}
SW.allied = allied;
/* how a's band stands toward o's band: own, ally, enemy or neutral. The leader decides. */
function stanceToward(w, a, o) {
  const ra = rootOf(w, a), ro = rootOf(w, o);
  if (ra === ro) return 'own';
  return ra.stances[ro.id] || 'neutral';
}
SW.stanceToward = stanceToward;
function passable(w, x, y, e) {
  if (!inb(w, x, y)) return false;
  const i = idx(w, x, y);
  const t = w.terrain[i];
  if (t === T.VOID) return false;
  if (t === T.WATER) return (w.roads && w.roads[i] === 2) || !!(e && e.policy && e.things && floatOf(w, e) > 0) || !!(e && e.policy && w.narrow && w.narrow[i] && w.laws.water.swim && e.e > 20 && e.stage !== 'child'); /* a grown being can swim water that is narrow: a river, not a lake or the sea */
  if (t === T.SHALLOWS && w.roads && w.roads[i] === 2) return true;
  if (t === T.SHALLOWS && !(e && e.policy)) return !!(w.river && w.river[i]); /* beings can wade anywhere; animals ford rivers only */
  if (w.walls[i]) return !!(e && e.policy && allied(w, e, w.walls[i]));
  const dv = w.devices[i]; if (dv && dv.barred) return !!(e && e.policy && allied(w, e, dv.by));
  return true;
}
SW.idx = idx; SW.passable = passable;
/* deep water within two steps of ground is narrow enough to swim: channels up to four wide can be crossed, open water cannot */
function narrowWater(w) { const N = {}; for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) { const i = y * w.W + x; if (w.terrain[i] !== T.WATER) continue; let ok = false; for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w.W || Y >= w.H) continue; const t = w.terrain[Y * w.W + X]; if (t !== T.WATER && t !== T.VOID) ok = true; } if (ok) N[i] = 1; } w.narrow = N; }
SW.narrowWater = narrowWater;
/* the nearest tile of the unknown within sight of a being, or null */
SW.edgeNear = function (w, a) { const V = w.veil; if (!V) return null; const R = SW.sight(w); let best = null, bd = 99; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = a.x + dx, y = a.y + dy; if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue; if (V.t[y * w.W + x] != null) { const d = Math.max(Math.abs(dx), Math.abs(dy)); if (d < bd) { bd = d; best = { x: x, y: y, d: d }; } } } return best; };
/* a place at the rim of the known world, where animals and newcomers come in */
function edgeSpot(w) { for (let t = 0; t < 30; t++) { const side = ri(w, 4); let x = ri(w, w.W), y = ri(w, w.H), dx = 0, dy = 0; if (side === 0) { y = 0; dy = 1; } else if (side === 1) { y = w.H - 1; dy = -1; } else if (side === 2) { x = 0; dx = 1; } else { x = w.W - 1; dx = -1; } for (let k = 0; k < Math.max(w.W, w.H); k++) { if (!inb(w, x, y)) break; if (w.terrain[idx(w, x, y)] !== T.VOID) return { x: x, y: y }; x += dx; y += dy; } } return { x: w.W >> 1, y: w.H >> 1 }; }

const HEAD = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
SW.COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function tryMove(w, e, dx, dy) {
  const nx = e.x + dx, ny = e.y + dy;
  if (!(dx || dy) || !passable(w, nx, ny, e)) return false;
  if (!e.rush) {
    if (e.calm > 0) return false;
    /* about to step back to where it stood a moment ago, having just come from here: that is pacing. Stand still a while instead. */
    if (nx === e.qx && ny === e.qy && e.rx === e.x && e.ry === e.y) { e.calm = 3 + ri(w, 5); return false; }
  }
  e.x = nx; e.y = ny; if (dx) e.f = dx; return true;
}
/* called once at the start of each mover's turn: remember the last two places it stood */
function beginTurn(e) { e.rx = e.qx; e.ry = e.qy; e.qx = e.px; e.qy = e.py; e.px = e.x; e.py = e.y; if (e.calm > 0) e.calm--; e.rush = 0; }
function stepDir(w, e, dx, dy) {
  if (!dx && !dy) return false;
  if (tryMove(w, e, dx, dy)) return true;
  if (dx && dy) { if (tryMove(w, e, dx, 0) || tryMove(w, e, 0, dy)) return true; }
  else if (dx) { const s = rnd(w) < 0.5 ? 1 : -1; if (tryMove(w, e, dx, s) || tryMove(w, e, dx, -s) || tryMove(w, e, 0, s)) return true; }
  else { const s = rnd(w) < 0.5 ? 1 : -1; if (tryMove(w, e, s, dy) || tryMove(w, e, -s, dy) || tryMove(w, e, s, 0)) return true; }
  return false;
}
function stepToward(w, e, tx, ty) { return stepDir(w, e, sign(tx - e.x), sign(ty - e.y)); }
/* Flee to whichever neighbouring tile puts the most ground between you and the threat, without doubling back. Cornered, hold still. */
function stepAway(w, e, tx, ty) {
  const cur = (e.x - tx) * (e.x - tx) + (e.y - ty) * (e.y - ty);
  let best = -1, bs = cur + 0.5;
  for (let k = 0; k < 8; k++) {
    const nx = e.x + HEAD[k][0], ny = e.y + HEAD[k][1];
    if (!passable(w, nx, ny, e)) continue;
    let sc = (nx - tx) * (nx - tx) + (ny - ty) * (ny - ty) + rnd(w) * 0.4;
    if (nx === e.qx && ny === e.qy) sc -= 3;
    if (sc > bs) { bs = sc; best = k; }
  }
  if (best < 0) return false;
  e.x += HEAD[best][0]; e.y += HEAD[best][1]; if (HEAD[best][0]) e.f = HEAD[best][0];
  return true;
}
/* Breadth-first search over walkable tiles within R of the mover.
   goal(x, y) says whether a tile ends the search. Returns the first step, or null if nothing is reachable. */
function bfsStep(w, e, goal, R) {
  const size = 2 * R + 1, seen = new Int8Array(size * size), qx = [e.x], qy = [e.y], first = [-1];
  seen[R * size + R] = 1;
  for (let h = 0; h < qx.length; h++) {
    const x = qx[h], y = qy[h];
    if (h > 0 && goal(x, y)) return HEAD[first[h]];
    for (let d = 0; d < 8; d++) {
      const nx = x + HEAD[d][0], ny = y + HEAD[d][1], lx = nx - e.x + R, ly = ny - e.y + R;
      if (lx < 0 || ly < 0 || lx >= size || ly >= size || seen[ly * size + lx] || !passable(w, nx, ny, e)) continue;
      seen[ly * size + lx] = 1; qx.push(nx); qy.push(ny); first.push(h === 0 ? d : first[h]);
    }
  }
  return null;
}
function pathToward(w, e, tx, ty, stop) {
  const R = w.laws.body.sight + 2;
  if (cheb(e.x, e.y, tx, ty) > R) {
    const size = 2 * R + 1, seen = new Int8Array(size * size), qx = [e.x], qy = [e.y], first = [-1];
    let best = -1, bd = cheb(e.x, e.y, tx, ty);
    seen[R * size + R] = 1;
    for (let h = 0; h < qx.length; h++) {
      const x = qx[h], y = qy[h], d = cheb(x, y, tx, ty);
      if (h > 0 && d < bd) { bd = d; best = h; }
      for (let k = 0; k < 8; k++) {
        const nx = x + HEAD[k][0], ny = y + HEAD[k][1], lx = nx - e.x + R, ly = ny - e.y + R;
        if (lx < 0 || ly < 0 || lx >= size || ly >= size || seen[ly * size + lx] || !passable(w, nx, ny, e)) continue;
        seen[ly * size + lx] = 1; qx.push(nx); qy.push(ny); first.push(h === 0 ? k : first[h]);
      }
    }
    return best >= 0 ? tryMove(w, e, HEAD[first[best]][0], HEAD[first[best]][1]) : false;
  }
  const s = bfsStep(w, e, function (x, y) { return cheb(x, y, tx, ty) <= stop; }, R);
  return s ? tryMove(w, e, s[0], s[1]) : false;
}
function wanderStep(w, e) {
  for (let k = 0; k < 4; k++) if (tryMove(w, e, ri(w, 3) - 1, ri(w, 3) - 1)) return true;
  return false;
}
/* Roaming with a heading covers ground; a pure random walk barely leaves home. */
function roamStep(w, e) {
  if (e.hd == null) e.hd = ri(w, 8);
  if (rnd(w) < 0.18) e.hd = (e.hd + (rnd(w) < 0.5 ? 1 : 7)) % 8;
  for (let k = 0; k < 3; k++) {
    if (tryMove(w, e, HEAD[e.hd][0], HEAD[e.hd][1])) return true;
    e.hd = ri(w, 8);
  }
  return false;
}

/* ---------- looks: every kind of thing carries a drawing spec in the registry ---------- */
SW.SHAPES = ['circle', 'ellipse', 'rect', 'tri', 'line', 'ring', 'star'];
SW.ANIMS = ['none', 'bob', 'pulse', 'sway', 'spin'];
function num(v, lo, hi, dflt) { v = Number(v); return isFinite(v) ? clamp(Math.round(v * 1000) / 1000, lo, hi) : dflt; }
function colour(v) { return typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim()) ? v.trim().toLowerCase() : null; }
SW.sanitizeLook = function (look) {
  if (!look) return null;
  const list = Array.isArray(look) ? look : look.shapes;
  if (!Array.isArray(list)) return null;
  const out = [];
  for (let k = 0; k < list.length && out.length < 12; k++) {
    const q = list[k]; if (!q || SW.SHAPES.indexOf(q.t) < 0) continue;
    const f = colour(q.fill), st = colour(q.stroke);
    if (!f && !st) continue;
    const o = { t: q.t };
    if (q.x != null) o.x = num(q.x, -1, 1, 0);
    if (q.y != null) o.y = num(q.y, -1, 1, 0);
    if (q.s != null) o.s = num(q.s, 0.01, 1, 0.2);
    if (q.w != null) o.w = num(q.w, 0.01, 1, 0.2);
    if (q.h != null) o.h = num(q.h, 0.01, 1, 0.2);
    if (q.d != null) o.d = num(q.d, 0, 1, 0.2);
    if (q.x2 != null) o.x2 = num(q.x2, -1, 1, 0);
    if (q.y2 != null) o.y2 = num(q.y2, -1, 1, 0);
    if (q.lw != null) o.lw = num(q.lw, 0.01, 0.3, 0.05);
    if (q.rot != null) o.rot = num(q.rot, -360, 360, 0);
    if (q.n != null) o.n = Math.round(num(q.n, 1, 12, 4));
    if (f) o.fill = f; if (st) o.stroke = st;
    if (q.per === 'food') o.per = 'food';
    out.push(o);
  }
  if (!out.length) return null;
  return { anim: SW.ANIMS.indexOf(look.anim) >= 0 ? look.anim : 'none', shapes: out };
};
function hexToHsl(hex) {
  let h = hex.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60; if (hh < 0) hh += 360;
  }
  return [hh, s, l];
}
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const seg = Math.floor(h / 60) % 6, rgb = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
  return '#' + rgb.map(function (v) { const n = Math.round(clamp(v + m, 0, 1) * 255); return (n < 16 ? '0' : '') + n.toString(16); }).join('');
}
SW.hslToHex = hslToHex;
/* An inherited look drifts: hue turns, proportions shift, and now and then a part is gained or lost. */
SW.mutateLook = function (w, look, amount) {
  if (!look) return null;
  const turn = (rnd(w) - 0.5) * 2 * 70 * amount, out = { anim: look.anim, shapes: [] };
  const tint = function (c) { if (!c) return c; const q = hexToHsl(c); return hslToHex((q[0] + turn + 360) % 360, clamp(q[1] * (0.85 + 0.3 * rnd(w)), 0, 1), clamp(q[2] * (0.9 + 0.2 * rnd(w)), 0.08, 0.92)); };
  for (let k = 0; k < look.shapes.length; k++) {
    const q = look.shapes[k], o = {};
    for (const key in q) o[key] = q[key];
    if (o.fill) o.fill = tint(o.fill); if (o.stroke) o.stroke = tint(o.stroke);
    const j = 1 + (rnd(w) - 0.5) * 0.4 * amount;
    ['s', 'w', 'h', 'd'].forEach(function (key) { if (o[key] != null) o[key] = num(o[key] * j, 0.01, 1, o[key]); });
    if (o.t === 'ring' && !o.per && rnd(w) < 0.3 * amount) o.n = clamp((o.n || 4) + (rnd(w) < 0.5 ? 1 : -1), 2, 12);
    out.shapes.push(o);
  }
  if (rnd(w) < 0.35 * amount && out.shapes.length < 10) {
    const base = out.shapes[0], c = tint(base.fill || base.stroke || '#cccccc'), kind = ['ring', 'star', 'circle', 'tri'][ri(w, 4)];
    const add = { t: kind, x: num((rnd(w) - 0.5) * 0.4, -1, 1, 0), y: num((rnd(w) - 0.5) * 0.4, -1, 1, 0), s: num(0.04 + rnd(w) * 0.1, 0.01, 1, 0.06), fill: c };
    if (kind === 'ring') { add.n = 3 + ri(w, 5); add.d = num(0.12 + rnd(w) * 0.2, 0, 1, 0.2); add.x = 0; add.y = 0; }
    if (kind === 'star') add.n = 4 + ri(w, 4);
    out.shapes.push(add);
  }
  if (rnd(w) < 0.15 * amount) out.anim = SW.ANIMS[ri(w, SW.ANIMS.length)];
  return out;
};
/* Every being is born with a body of its own: form, colours, markings and head-gear follow its nature. */
SW.bornLook = function (w, hue, t, F) {
  /* a small upright figure: legs, a torso or robe, arms, a head, and something worn on it. Each people has its own build, skin, head and dress. */
  F = F || {};
  const body = hslToHex(hue, 0.42, 0.42), dark = hslToHex(hue, 0.4, 0.24), skin = hslToHex(F.skinHue != null ? F.skinHue : (hue + 20) % 360, F.skinS != null ? F.skinS : 0.26, F.skinL != null ? F.skinL : 0.68);
  const accent = hslToHex((hue + 140 + ri(w, 80)) % 360, 0.62, 0.56), ink = '#17131c', bone = '#e8dcc0';
  const sh = [], build = F.build != null ? F.build : ri(w, 3), half = build === 1 ? 0.2 : 0.14;
  const own = t.bold > 0.62 ? 'horns' : t.curious > 0.68 ? 'feathers' : t.gentle > 0.62 ? 'hood' : ['horns', 'feathers', 'hood', 'crest'][ri(w, 4)], gear = F.gear ? F.gear : own;
  sh.push({ t: 'line', x: -0.07, y: 0.16, x2: -0.1, y2: 0.4, lw: build === 1 ? 0.09 : 0.075, stroke: dark });
  sh.push({ t: 'line', x: 0.07, y: 0.16, x2: 0.1, y2: 0.4, lw: build === 1 ? 0.09 : 0.075, stroke: dark });
  if (F.tail) sh.push({ t: 'line', x: -0.08, y: 0.18, x2: -0.3, y2: 0.3, lw: 0.04, stroke: skin });
  if (build === 2) sh.push({ t: 'tri', y: 0.1, s: 0.33, fill: body }); else sh.push({ t: 'ellipse', y: 0.02, w: half, h: 0.23, fill: body });
  const mark = F.mark != null ? F.mark : ri(w, 3);
  if (mark === 0) sh.push({ t: 'line', x: -0.11, y: -0.12, x2: 0.11, y2: 0.14, lw: 0.05, stroke: accent });
  else if (mark === 1) sh.push({ t: 'rect', y: 0.1, w: half * 0.95, h: 0.025, fill: accent });
  else sh.push({ t: 'circle', y: -0.03, s: 0.055, fill: accent });
  sh.push({ t: 'line', x: -half * 0.9, y: -0.1, x2: -half - 0.1, y2: 0.1, lw: 0.055, stroke: F.bare ? skin : dark });
  sh.push({ t: 'line', x: half * 0.9, y: -0.1, x2: half + 0.1, y2: 0.1, lw: 0.055, stroke: F.bare ? skin : dark });
  if (gear === 'hood') sh.push({ t: 'ellipse', y: -0.3, w: 0.17, h: 0.17, fill: dark });
  else if (gear === 'fur') sh.push({ t: 'ellipse', y: -0.17, w: 0.21, h: 0.08, fill: bone });
  else if (gear === 'ears') sh.push({ t: 'ellipse', y: -0.33, w: 0.24, h: 0.045, fill: skin });
  if (F.head === 'long') sh.push({ t: 'ellipse', y: -0.31, w: 0.1, h: 0.15, fill: skin }); else if (F.head === 'wide') sh.push({ t: 'ellipse', y: -0.29, w: 0.16, h: 0.115, fill: skin }); else sh.push({ t: 'circle', y: -0.3, s: 0.125, fill: skin });
  if (gear === 'horns') { sh.push({ t: 'tri', x: -0.1, y: -0.43, s: 0.075, rot: -25, fill: bone }); sh.push({ t: 'tri', x: 0.1, y: -0.43, s: 0.075, rot: 25, fill: bone }); }
  else if (gear === 'feathers') { sh.push({ t: 'line', x: -0.04, y: -0.4, x2: -0.1, y2: -0.56, lw: 0.035, stroke: accent }); sh.push({ t: 'line', x: 0.04, y: -0.4, x2: 0.1, y2: -0.56, lw: 0.035, stroke: accent }); }
  else if (gear === 'crest') sh.push({ t: 'star', y: -0.46, s: 0.09, n: 5, fill: accent });
  else if (gear === 'braid') sh.push({ t: 'line', x: 0.1, y: -0.34, x2: 0.16, y2: -0.02, lw: 0.04, stroke: ink });
  sh.push({ t: 'circle', x: -0.045, y: -0.31, s: 0.022, fill: ink }); sh.push({ t: 'circle', x: 0.05, y: -0.31, s: 0.022, fill: ink });
  return SW.sanitizeLook({ anim: 'bob', shapes: sh });
};
/* ---------- peoples: those who begin together share a body, a tongue, a way of naming and something known since before memory ---------- */
SW.PEOPLE_KINDS = {
  woodland: { noun: 'Wood-folk', genes: { vigor: 1.15, luck: 1.1 }, way: 'fire', custom: 'No fire is left untended, and no one is refused a place at it.', form: { build: 0, head: 'round', gear: 'feathers', skinHue: 95, skinS: 0.3, skinL: 0.52, tall: 1 } },
  highland: { noun: 'Stone-folk', genes: { strength: 1.2, warmth: 1.3, vigor: 0.92 }, way: 'tools', custom: 'What a hand has made belongs to that hand until it is given.', form: { build: 1, head: 'wide', gear: 'horns', skinHue: 212, skinS: 0.16, skinL: 0.6, tall: 0.9 } },
  lakeland: { noun: 'Lake-folk', genes: { luck: 1.25, learning: 1.15, strength: 0.9 }, way: 'fishing', custom: 'The first catch of the day is shared.', form: { build: 2, head: 'long', gear: 'hood', tail: 1, skinHue: 176, skinS: 0.3, skinL: 0.72, tall: 1.06 } },
  steppe: { noun: 'Plains-folk', genes: { vigor: 1.3, appetite: 1.08 }, way: 'herding', custom: 'A herd is its keeper\'s, and the pasture is everyone\'s.', form: { build: 0, head: 'round', gear: 'braid', tail: 1, skinHue: 16, skinS: 0.5, skinL: 0.55, tall: 1.04 } },
  desert: { noun: 'Sand-folk', genes: { thirst: 0.6, appetite: 0.88, warmth: 0.8 }, way: 'signs', custom: 'Water is never denied to one who asks.', form: { build: 0, head: 'long', gear: 'crest', bare: 1, skinHue: 30, skinS: 0.5, skinL: 0.44, tall: 1.1 } },
  marsh: { noun: 'Fen-folk', genes: { learning: 1.2, appetite: 0.94 }, way: 'farming', custom: 'The sick are fed first.', form: { build: 2, head: 'round', gear: 'ears', skinHue: 70, skinS: 0.3, skinL: 0.56, tall: 0.96 } },
  tundra: { noun: 'Snow-folk', genes: { warmth: 1.6, strength: 1.1, appetite: 1.1 }, way: 'fire', custom: 'No one sleeps alone in the cold.', form: { build: 1, head: 'wide', gear: 'fur', skinHue: 20, skinS: 0.2, skinL: 0.82, tall: 0.98 } }
};
SW.TONGUES = [
  { a: ['Ma', 'Ta', 'Se', 'Bru', 'Os', 'Ke', 'Lu', 'Ve', 'Na', 'Ru', 'Ar', 'Ye', 'Du', 'Si', 'Ha', 'Pe', 'Mi', 'Zo', 'El', 'Ka'], b: ['ren', 'vi', 'nna', 'ndo', 'kel', 'lon', 'sha', 'ri', 'mo', 'la', 'tha', 'ba', 'dra', 'wen', 'ku', 'su', 'ya', 'nde', 'ro', 'li'], syl: ['ma', 'ta', 'se', 'lu', 've', 'na', 'ru', 'ye', 'du', 'si', 'ha', 'mi', 'el', 'ka', 'ren', 'vi', 'lon', 'sha', 'mo', 'la'] },
  { a: ['Gor', 'Thak', 'Ur', 'Bal', 'Krag', 'Dru', 'Hrok', 'Vor', 'Tug', 'Mor', 'Skar', 'Ol', 'Garn', 'Rak', 'Brok', 'Zur'], b: ['uk', 'ar', 'og', 'im', 'ash', 'ek', 'ul', 'gan', 'dor', 'ak', 'um', 'rin', 'ok', 'ath'], syl: ['gor', 'ak', 'ur', 'dru', 'vor', 'tug', 'mor', 'ok', 'ash', 'um', 'kra', 'thu', 'bar', 'gan', 'dor', 'rek'] },
  { a: ['Ae', 'Ily', 'Ssa', 'Thi', 'Ves', 'Oi', 'Lae', 'Zhi', 'Ny', 'Eiu', 'Cy', 'Ishi', 'Uve', 'Xa', 'Ely', 'Phi'], b: ['ssa', 'eth', 'iel', 'yn', 'ae', 'ith', 'ua', 'ess', 'ir', 'ael', 'ys', 'ine', 'oa', 'is'], syl: ['ae', 'il', 'ssa', 'thi', 've', 'oi', 'zhi', 'ny', 'eth', 'iel', 'yn', 'ith', 'ua', 'ess', 'ael', 'ys'] },
  { a: ['Ton', 'Wa', 'Ki', 'Pa', 'Chu', 'Nau', 'Tla', 'Ho', 'Qui', 'Me', 'Sho', 'Ya', 'Te', 'Co', 'Zi', 'Hua'], b: ['tli', 'wa', 'ka', 'que', 'ma', 'hua', 'pan', 'chi', 'lo', 'ni', 'tec', 'xo', 'ya', 'mi'], syl: ['ton', 'wa', 'ki', 'pa', 'chu', 'tla', 'ho', 'qui', 'me', 'sho', 'te', 'co', 'tli', 'hua', 'pan', 'xo'] }
];
const PEOPLE_HUES = [22, 205, 285, 140, 48, 330];
function newPeople(w, kind, rid) {
  const id = w.peoples.length, usedT = w.peoples.map(function (q) { return q.tongue; }); let tongue = { highland: 1, tundra: 1, woodland: 0, steppe: 3, lakeland: 2, marsh: 2, desert: 3 }[kind]; if (tongue == null || usedT.indexOf(tongue) >= 0) { tongue = 0; while (usedT.indexOf(tongue) >= 0 && tongue < SW.TONGUES.length - 1) tongue++; }
  const T0 = SW.TONGUES[tongue], K = SW.PEOPLE_KINDS[kind] || SW.PEOPLE_KINDS.woodland;
  const nm = T0.a[ri(w, T0.a.length)] + T0.syl[ri(w, T0.syl.length)];
  const p = { id: id, name: 'the ' + nm, noun: K.noun, kind: kind, tongue: tongue, hue: PEOPLE_HUES[id % PEOPLE_HUES.length], genes: K.genes, way: K.way, custom: K.custom, form: K.form, region: rid == null ? null : rid };
  w.peoples.push(p); return p;
}
SW.newPeople = newPeople;
SW.peopleOf = function (w, a) { return a.people != null && w.peoples ? w.peoples[a.people] || null : null; };
/* how much of a tongue one understands: all of one's own, and of another's only what has been learned by hearing it */
SW.understands = function (a, lang) { return lang == null || a.lang == null || lang === a.lang ? 1 : (a.tongues && a.tongues[lang]) || 0; };
SW.garble = function (w, text, lang, u) {
  if (u >= 0.95 || lang == null) return String(text); const T0 = SW.TONGUES[lang % SW.TONGUES.length];
  return String(text).replace(/[A-Za-z']+/g, function (wd) {
    if (w.names[wd] || wd.length < 2) return wd; const h = strSeed(wd.toLowerCase() + '|' + lang); if ((h % 100) / 100 < u) return wd;
    const n = Math.min(3, 1 + Math.floor(wd.length / 4)); let o = ''; for (let k = 0; k < n; k++) o += T0.syl[(h >>> (k * 5 + 3)) % T0.syl.length];
    return /^[A-Z]/.test(wd) ? o.charAt(0).toUpperCase() + o.slice(1) : o;
  });
};
/* hearing a tongue teaches a little of it; being spoken to directly teaches more. Returns what was understood before this hearing. */
SW.learnTongue = function (w, a, o, amt) { if (!a || !o || a.lang == null || o.lang == null || a.lang === o.lang) return; a.tongues = a.tongues || {}; a.tongues[o.lang] = Math.min(1, Math.round(((a.tongues[o.lang] || 0) + amt * boon(a, 'learning')) * 1000) / 1000); w.tally.tongue = w.tally.tongue || {}; };
SW.hear = function (w, a, speaker, direct) {
  if (!a || !speaker || a.lang == null || speaker.lang == null || a.lang === speaker.lang) return 1;
  a.tongues = a.tongues || {}; const u = a.tongues[speaker.lang] || 0; if (u < 0.4) SW.press(w, a, 'strangers', 0.15); a.tongues[speaker.lang] = Math.min(1, Math.round((u + (direct ? 0.045 : 0.02) * boon(a, 'learning')) * 1000) / 1000); return u;
};
/* ---------- a library of parts: every new kind of animal or plant is composed from these, seeded by its name ---------- */
function strSeed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
function seeded(seed) { let s0 = seed >>> 0; return function () { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
SW.BEAST_PARTS = { build: ['slim', 'stocky', 'long', 'small', 'tall'], head: ['none', 'horn', 'antlers', 'tusks', 'curved', 'ears', 'longears', 'fangs', 'crest'], tail: ['none', 'line', 'bushy', 'up', 'stub'], pattern: ['none', 'stripes', 'spots', 'saddle', 'hump', 'belly'] };
SW.PLANT_PARTS = { form: ['bush', 'stalk', 'cap', 'flower', 'rosette', 'reed', 'frond', 'vine'] };
SW.genBeast = function (seedStr, predator, form) {
  const R = seeded(strSeed(String(seedStr))), pick = function (a) { return a[Math.floor(R() * a.length)]; }, F = form || {}, P = SW.BEAST_PARTS, has = function (k, v) { return P[k].indexOf(v) >= 0 ? v : null; };
  const hue = (typeof F.hue === 'number' ? F.hue : (predator ? pick([262, 18, 0, 205, 300, 36]) : pick([30, 42, 88, 14, 52, 182, 330, 24, 120])) + R() * 22) % 360;
  const sat = predator ? 0.16 + R() * 0.26 : 0.24 + R() * 0.36, lit = predator ? 0.27 + R() * 0.22 : 0.38 + R() * 0.26;
  const body = hslToHex(hue, sat, lit), dark = hslToHex(hue, sat, lit * 0.58), pale = hslToHex((hue + 18) % 360, sat * 0.6, Math.min(0.86, lit + 0.26)), bone = '#e6dcc4';
  const build = has('build', F.build) || pick(P.build), headgear = has('head', F.head) || (predator ? pick(['none', 'ears', 'fangs', 'crest', 'ears']) : pick(['none', 'horn', 'antlers', 'tusks', 'curved', 'ears', 'longears', 'crest'])), tail = has('tail', F.tail) || pick(P.tail), pattern = has('pattern', F.pattern) || pick(P.pattern);
  const bw = { slim: 0.26, stocky: 0.36, long: 0.4, small: 0.16, tall: 0.24 }[build], bh = { slim: 0.1, stocky: 0.2, long: 0.11, small: 0.09, tall: 0.14 }[build], leg = { slim: 0.2, stocky: 0.18, long: 0.13, small: 0.1, tall: 0.3 }[build];
  const by = -leg * 0.3, hs = (build === 'small' ? 0.065 : 0.085) + R() * 0.05, hx = bw + hs * 0.55, hy = by - bh * (build === 'tall' ? 1.5 : 0.45), core = [], extra = [];
  (build === 'small' ? [-bw * 0.5, bw * 0.45] : [-bw * 0.68, -bw * 0.3, bw * 0.28, bw * 0.62]).forEach(function (x) { core.push({ z: 1, q: { t: 'line', x: x, y: by + bh * 0.4, x2: x + (R() - 0.5) * 0.05, y2: by + bh * 0.4 + leg, lw: Math.max(0.035, bh * 0.36), stroke: dark } }); });
  core.push({ z: 2, q: { t: 'ellipse', y: by, w: bw, h: bh, fill: body } });
  core.push({ z: 5, q: R() < 0.5 ? { t: 'circle', x: hx, y: hy, s: hs, fill: predator ? dark : body } : { t: 'ellipse', x: hx, y: hy, w: hs * 1.3, h: hs * 0.85, fill: predator ? dark : body } });
  core.push({ z: 8, q: { t: 'circle', x: hx + hs * 0.35, y: hy - hs * 0.15, s: 0.021, fill: predator ? pick(['#f0c93a', '#2fb8e6', '#ff5a48', '#b6ff6a']) : '#14100c' } });
  if (build === 'tall') extra.push({ z: 4, q: { t: 'line', x: bw * 0.7, y: by - bh * 0.3, x2: hx - hs * 0.3, y2: hy + hs * 0.3, lw: 0.075, stroke: body } });
  if (pattern === 'stripes') { extra.push({ z: 3, q: { t: 'line', x: -bw * 0.3, y: by - bh * 0.85, x2: -bw * 0.2, y2: by + bh * 0.8, lw: 0.035, stroke: dark } }); extra.push({ z: 3, q: { t: 'line', x: bw * 0.15, y: by - bh * 0.9, x2: bw * 0.25, y2: by + bh * 0.8, lw: 0.035, stroke: dark } }); }
  else if (pattern === 'spots') { extra.push({ z: 3, q: { t: 'circle', x: -bw * 0.35, y: by - bh * 0.2, s: bh * 0.3, fill: pale } }); extra.push({ z: 3, q: { t: 'circle', x: bw * 0.2, y: by + bh * 0.15, s: bh * 0.26, fill: pale } }); }
  else if (pattern === 'saddle') extra.push({ z: 3, q: { t: 'ellipse', y: by - bh * 0.3, w: bw * 0.5, h: bh * 0.55, fill: pale } });
  else if (pattern === 'hump') extra.push({ z: 3, q: { t: 'circle', x: bw * 0.3, y: by - bh * 0.65, s: bh * 0.9, fill: dark } });
  else if (pattern === 'belly') extra.push({ z: 3, q: { t: 'ellipse', y: by + bh * 0.45, w: bw * 0.72, h: bh * 0.42, fill: pale } });
  if (headgear === 'horn') extra.push({ z: 6, q: { t: 'tri', x: hx + hs * 0.3, y: hy - hs * 1.15, s: hs * 0.62, rot: 15, fill: bone } });
  else if (headgear === 'antlers') { extra.push({ z: 6, q: { t: 'line', x: hx - hs * 0.1, y: hy - hs * 0.7, x2: hx - hs * 0.9, y2: hy - hs * 2.4, lw: 0.028, stroke: bone } }); extra.push({ z: 6, q: { t: 'line', x: hx - hs * 0.5, y: hy - hs * 1.5, x2: hx + hs * 0.5, y2: hy - hs * 2.3, lw: 0.026, stroke: bone } }); }
  else if (headgear === 'tusks') extra.push({ z: 6, q: { t: 'tri', x: hx + hs * 0.95, y: hy + hs * 0.35, s: hs * 0.5, rot: 60, fill: bone } });
  else if (headgear === 'curved') extra.push({ z: 6, q: { t: 'line', x: hx, y: hy - hs * 0.8, x2: hx - hs * 1.5, y2: hy - hs * 0.9, lw: 0.04, stroke: bone } });
  else if (headgear === 'ears') { extra.push({ z: 6, q: { t: 'tri', x: hx - hs * 0.45, y: hy - hs * 0.95, s: hs * 0.5, fill: dark } }); extra.push({ z: 6, q: { t: 'tri', x: hx + hs * 0.35, y: hy - hs * 0.95, s: hs * 0.5, fill: dark } }); }
  else if (headgear === 'longears') { extra.push({ z: 6, q: { t: 'ellipse', x: hx - hs * 0.35, y: hy - hs * 1.6, w: hs * 0.24, h: hs * 0.95, rot: -12, fill: dark } }); extra.push({ z: 6, q: { t: 'ellipse', x: hx + hs * 0.25, y: hy - hs * 1.6, w: hs * 0.24, h: hs * 0.95, rot: 12, fill: dark } }); }
  else if (headgear === 'fangs') extra.push({ z: 7, q: { t: 'tri', x: hx + hs * 0.75, y: hy + hs * 0.75, s: hs * 0.36, rot: 180, fill: '#f4f0e6' } });
  else if (headgear === 'crest') extra.push({ z: 6, q: { t: 'tri', x: hx - hs * 0.1, y: hy - hs * 1.2, s: hs * 0.7, fill: hslToHex((hue + 150) % 360, 0.6, 0.55) } });
  if (tail === 'line') extra.push({ z: 0, q: { t: 'line', x: -bw * 0.9, y: by, x2: -bw - 0.17, y2: by + 0.09, lw: 0.04, stroke: dark } });
  else if (tail === 'up') extra.push({ z: 0, q: { t: 'line', x: -bw * 0.9, y: by, x2: -bw - 0.1, y2: by - 0.2, lw: 0.04, stroke: dark } });
  else if (tail === 'bushy') extra.push({ z: 0, q: { t: 'ellipse', x: -bw - 0.07, y: by - 0.02, w: 0.11, h: 0.065, rot: -20, fill: pale } });
  else if (tail === 'stub') extra.push({ z: 0, q: { t: 'circle', x: -bw - 0.01, y: by - 0.02, s: 0.04, fill: pale } });
  const all = core.concat(extra.slice(0, 12 - core.length)).sort(function (a, b) { return a.z - b.z; }).map(function (e) { return e.q; });
  return SW.sanitizeLook({ anim: predator ? 'sway' : pick(['bob', 'sway']), shapes: all });
};
SW.genPlant = function (seedStr, form) {
  const R = seeded(strSeed(String(seedStr))), pick = function (a) { return a[Math.floor(R() * a.length)]; }, F = form || {};
  const lh = 70 + R() * 85, leaf = hslToHex(lh, 0.3 + R() * 0.3, 0.3 + R() * 0.2), dark = hslToHex(lh, 0.35, 0.2 + R() * 0.08), fh = typeof F.hue === 'number' ? F.hue % 360 : pick([350, 20, 45, 280, 200, 320, 60, 0, 170]) + R() * 16, fruit = hslToHex(fh % 360, 0.7, 0.55), pale = hslToHex(fh % 360, 0.45, 0.8);
  const kind = SW.PLANT_PARTS.form.indexOf(F.form) >= 0 ? F.form : pick(SW.PLANT_PARTS.form), n = 3 + Math.floor(R() * 3), sh = [];
  if (kind === 'bush') { sh.push({ t: 'circle', y: 0.04, s: 0.3 + R() * 0.06, fill: dark }); sh.push({ t: 'circle', x: -0.09, y: -0.08, s: 0.19, fill: leaf }); sh.push({ t: 'ring', n: n, d: 0.19, s: 0.07, fill: fruit, per: 'food' }); }
  else if (kind === 'stalk') { [-0.12, 0, 0.12].forEach(function (x) { sh.push({ t: 'line', x: x, y: 0.34, x2: x * 1.5, y2: -0.2 - R() * 0.1, lw: 0.035, stroke: leaf }); }); sh.push({ t: 'ring', n: n, d: 0.17, y: -0.24, s: 0.055, fill: fruit, per: 'food' }); }
  else if (kind === 'cap') { sh.push({ t: 'rect', y: 0.14, w: 0.055, h: 0.17, fill: pale }); sh.push({ t: 'ellipse', y: -0.08, w: 0.26 + R() * 0.1, h: 0.15 + R() * 0.06, fill: fruit }); sh.push({ t: 'ring', n: n, d: 0.14, y: -0.1, s: 0.038, fill: pale, per: 'food' }); }
  else if (kind === 'flower') { sh.push({ t: 'line', y: 0.36, x2: 0, y2: -0.05, lw: 0.04, stroke: leaf }); sh.push({ t: 'ellipse', x: -0.12, y: 0.18, w: 0.12, h: 0.05, rot: -25, fill: leaf }); sh.push({ t: 'star', y: -0.12, s: 0.2, n: 5 + Math.floor(R() * 4), fill: fruit }); sh.push({ t: 'ring', n: n, d: 0.1, y: -0.12, s: 0.04, fill: pale, per: 'food' }); }
  else if (kind === 'rosette') { sh.push({ t: 'star', y: 0.08, s: 0.34, n: 6 + Math.floor(R() * 4), fill: dark }); sh.push({ t: 'star', y: 0.08, s: 0.22, n: 5, rot: 30, fill: leaf }); sh.push({ t: 'ring', n: n, d: 0.1, y: 0.08, s: 0.05, fill: fruit, per: 'food' }); }
  else if (kind === 'reed') { [-0.16, -0.05, 0.07, 0.17].forEach(function (x) { sh.push({ t: 'line', x: x, y: 0.36, x2: x + (R() - 0.5) * 0.12, y2: -0.3 - R() * 0.12, lw: 0.03, stroke: leaf }); }); sh.push({ t: 'ring', n: n, d: 0.16, y: -0.3, s: 0.045, fill: fruit, per: 'food' }); }
  else if (kind === 'frond') { sh.push({ t: 'ellipse', x: -0.14, y: 0.02, w: 0.2, h: 0.07, rot: -35, fill: leaf }); sh.push({ t: 'ellipse', x: 0.14, y: 0.02, w: 0.2, h: 0.07, rot: 35, fill: leaf }); sh.push({ t: 'ellipse', y: -0.1, w: 0.07, h: 0.22, fill: dark }); sh.push({ t: 'ring', n: n, d: 0.13, y: 0.14, s: 0.05, fill: fruit, per: 'food' }); }
  else { sh.push({ t: 'line', x: -0.3, y: 0.2, x2: 0.3, y2: -0.1, lw: 0.04, stroke: dark }); sh.push({ t: 'ellipse', x: -0.12, y: 0.02, w: 0.1, h: 0.055, rot: 30, fill: leaf }); sh.push({ t: 'ellipse', x: 0.12, y: -0.1, w: 0.1, h: 0.055, rot: -30, fill: leaf }); sh.push({ t: 'ring', n: n, d: 0.2, s: 0.055, fill: fruit, per: 'food' }); }
  return SW.sanitizeLook({ anim: kind === 'reed' || kind === 'stalk' || kind === 'flower' ? 'sway' : 'none', shapes: sh });
};
/* looks for the founding animals, drawn as beasts and not as toys */
SW.BEAST_LOOKS = {
  hopper: { anim: 'bob', shapes: [{ t: 'line', x: -0.1, y: 0.06, x2: -0.16, y2: 0.2, lw: 0.05, stroke: '#7d6a4c' }, { t: 'line', x: 0.1, y: 0.06, x2: 0.12, y2: 0.2, lw: 0.04, stroke: '#7d6a4c' }, { t: 'ellipse', w: 0.21, h: 0.12, fill: '#a08a66' }, { t: 'circle', x: -0.12, y: 0.01, s: 0.11, fill: '#93805e' }, { t: 'circle', x: 0.2, y: -0.07, s: 0.08, fill: '#a9936e' }, { t: 'ellipse', x: 0.17, y: -0.22, w: 0.025, h: 0.1, rot: -10, fill: '#8a7655' }, { t: 'ellipse', x: 0.23, y: -0.21, w: 0.025, h: 0.1, rot: 12, fill: '#8a7655' }, { t: 'circle', x: 0.23, y: -0.08, s: 0.02, fill: '#1a140c' }] },
  skit: { anim: 'bob', shapes: [{ t: 'tri', x: -0.16, y: 0.01, s: 0.08, rot: -90, fill: '#8a6f2a' }, { t: 'ellipse', w: 0.13, h: 0.085, fill: '#c9a640' }, { t: 'ellipse', x: -0.03, y: -0.02, w: 0.1, h: 0.05, rot: -18, fill: '#96792c' }, { t: 'circle', x: 0.11, y: -0.04, s: 0.055, fill: '#d2b04a' }, { t: 'tri', x: 0.19, y: -0.035, s: 0.04, rot: 90, fill: '#b5532a' }, { t: 'circle', x: 0.12, y: -0.05, s: 0.016, fill: '#15110a' }] },
  hornback: { anim: 'sway', shapes: [{ t: 'line', x: -0.26, y: 0.14, x2: -0.27, y2: 0.36, lw: 0.08, stroke: '#3f3228' }, { t: 'line', x: -0.1, y: 0.16, x2: -0.1, y2: 0.36, lw: 0.08, stroke: '#3f3228' }, { t: 'line', x: 0.14, y: 0.16, x2: 0.14, y2: 0.36, lw: 0.08, stroke: '#3f3228' }, { t: 'line', x: 0.28, y: 0.12, x2: 0.29, y2: 0.36, lw: 0.08, stroke: '#3f3228' }, { t: 'ellipse', w: 0.42, h: 0.22, fill: '#5e4a3a' }, { t: 'circle', x: 0.14, y: -0.14, s: 0.2, fill: '#4b3a2d' }, { t: 'ellipse', x: 0.42, y: 0.03, w: 0.13, h: 0.13, fill: '#52402f' }, { t: 'tri', x: 0.43, y: -0.14, s: 0.07, rot: 20, fill: '#e2d6bc' }, { t: 'circle', x: 0.46, y: 0.01, s: 0.022, fill: '#120c08' }] },
  stalker: { anim: 'sway', shapes: [{ t: 'line', x: -0.3, y: -0.02, x2: -0.5, y2: 0.08, lw: 0.055, stroke: '#3a3140' }, { t: 'line', x: -0.2, y: 0.06, x2: -0.22, y2: 0.26, lw: 0.05, stroke: '#3a3140' }, { t: 'line', x: 0.16, y: 0.06, x2: 0.18, y2: 0.26, lw: 0.05, stroke: '#3a3140' }, { t: 'ellipse', w: 0.32, h: 0.12, fill: '#4b4052' }, { t: 'ellipse', x: 0.32, y: -0.06, w: 0.12, h: 0.085, fill: '#554a5c' }, { t: 'tri', x: 0.45, y: -0.04, s: 0.06, rot: 90, fill: '#554a5c' }, { t: 'tri', x: 0.27, y: -0.16, s: 0.05, fill: '#3a3140' }, { t: 'tri', x: 0.36, y: -0.16, s: 0.05, fill: '#3a3140' }, { t: 'circle', x: 0.36, y: -0.07, s: 0.022, fill: '#f0c93a' }] },
  ridgecat: { anim: 'sway', shapes: [{ t: 'line', x: -0.34, y: 0, x2: -0.56, y2: -0.1, lw: 0.06, stroke: '#b9c0c6' }, { t: 'line', x: -0.22, y: 0.07, x2: -0.24, y2: 0.27, lw: 0.06, stroke: '#aab2b9' }, { t: 'line', x: 0.2, y: 0.07, x2: 0.22, y2: 0.27, lw: 0.06, stroke: '#aab2b9' }, { t: 'ellipse', w: 0.36, h: 0.14, fill: '#d3d9de' }, { t: 'line', x: -0.14, y: -0.12, x2: -0.1, y2: 0.1, lw: 0.03, stroke: '#8f989f' }, { t: 'line', x: 0.02, y: -0.13, x2: 0.06, y2: 0.1, lw: 0.03, stroke: '#8f989f' }, { t: 'circle', x: 0.34, y: -0.06, s: 0.12, fill: '#dfe4e8' }, { t: 'tri', x: 0.27, y: -0.19, s: 0.055, fill: '#aab2b9' }, { t: 'tri', x: 0.41, y: -0.19, s: 0.055, fill: '#aab2b9' }, { t: 'circle', x: 0.38, y: -0.07, s: 0.024, fill: '#2fb8e6' }] }
};
/* a world made before these looks existed is brought up to them: founding beasts, and beings still wearing the body they were born with */
SW.refreshLooks = function (w) {
  if (w.lookV === 5) return false;
  for (const k in SW.BEAST_LOOKS) if (w.laws.creatures[k]) w.laws.creatures[k].look = JSON.parse(JSON.stringify(SW.BEAST_LOOKS[k]));
  w.agents.forEach(function (a) {
    const old = a.look && a.look.shapes.some(function (q) { return q.t === 'circle' && q.s === 0.075 && q.fill === '#ffffff'; });
    if (!a.look || old) a.look = SW.bornLook(w, a.hue, a.temperament, (SW.peopleOf(w, a) || {}).form);
  });
  w.lookV = 5; return true;
};
const BASE_KINDS = { berry: 1, grain: 1, redcap: 1, thornpear: 1, mudroot: 1, frostmoss: 1, ironnut: 1, sunleaf: 1, dreamcap: 1, emberroot: 1, hopper: 1, stalker: 1, skit: 1, hornback: 1, ridgecat: 1 };
function kindName(w, table, root) {
  for (let k = 0; k < 40; k++) { const n = SYL_A[ri(w, SYL_A.length)].toLowerCase() + root; if (!table[n]) return n; }
  return root + w.nextId++;
}
function vary(w, v, spread, lo, hi) { return clamp(Math.round(v * (1 - spread + 2 * spread * rnd(w)) * 10000) / 10000, lo, hi); }
/* A new plant variety: a copy of its parent's law with shifted numbers and a shifted look. */
function plantVariety(w, parent, o) {
  const L = w.laws, P = L.plants[parent]; o = o || {};
  if (!P || Object.keys(L.plants).length >= L.ecology.maxPlantKinds) return null;
  const sp = {
    growth: vary(w, P.growth, 0.2, 0.002, 0.014), maxFood: P.maxFood, regrow: vary(w, P.regrow, 0.2, 0.0015, 0.009),
    nutrition: clamp(P.nutrition + Math.round((rnd(w) - 0.5) * 4), -12, 24), seedRate: vary(w, P.seedRate, 0.2, 0.001, 0.009),
    seedRadius: P.seedRadius, lifespan: Math.round(vary(w, P.lifespan, 0.2, 800, 9000)), root: P.root || parent, from: parent
  };
  if (P.hardy) sp.hardy = 1;
  sp.soil = {}; for (const g in (P.soil || { grass: 1 })) sp.soil[g] = P.soil[g];
  if (rnd(w) < 0.3) { const g = ['grass', 'forest', 'marsh', 'desert', 'snow', 'sand'][ri(w, 6)]; sp.soil[g] = Math.round(clamp((sp.soil[g] || 0) + 0.4, 0, 1) * 10) / 10; } /* it learns a new ground */
  ['heal', 'hurt', 'lore', 'joy', 'anger', 'calm'].forEach(function (k) { if (P[k]) sp[k] = Math.round(P[k] * (0.7 + 0.6 * rnd(w)) * 100) / 100; });
  if (rnd(w) < 0.12) { /* now and then a plant turns up with a property nobody planned */
    const k = ['heal', 'lore', 'joy', 'anger', 'calm', 'hurt'][ri(w, 6)];
    sp[k] = k === 'heal' ? 6 + ri(w, 14) : k === 'hurt' ? 2 + ri(w, 6) : k === 'lore' ? 0.2 + 0.3 * rnd(w) : 0.2 + 0.4 * rnd(w);
    sp[k] = Math.round(sp[k] * 100) / 100;
  }
  if (rnd(w) < 0.25) sp.maxFood = clamp(P.maxFood + (rnd(w) < 0.5 ? 1 : -1), 1, 6);
  /* A breeder chooses a direction, and pays for it elsewhere. */
  switch (o.aim) {
    case 'richer': sp.nutrition = clamp(P.nutrition + 3, -12, 24); sp.regrow = clamp(P.regrow * 0.8, 0.0015, 0.009); break;
    case 'faster': sp.growth = clamp(P.growth * 1.3, 0.002, 0.014); sp.regrow = clamp(P.regrow * 1.2, 0.0015, 0.009); sp.nutrition = clamp(P.nutrition - 2, -12, 24); break;
    case 'fuller': sp.maxFood = clamp(P.maxFood + 1, 1, 6); sp.growth = clamp(P.growth * 0.75, 0.002, 0.014); break;
    case 'spreading': sp.seedRate = clamp(P.seedRate * 1.4, 0.001, 0.009); sp.lifespan = Math.round(clamp(P.lifespan * 0.75, 800, 6000)); break;
    case 'hardy': sp.lifespan = Math.round(clamp(P.lifespan * 1.4, 800, 6000)); sp.seedRate = clamp(P.seedRate * 0.75, 0.001, 0.009); break;
  }
  sp.look = o.look || SW.genPlant(parent + ':' + w.tick + ':' + ri(w, 9999));
  if (o.by) { sp.by = o.by; sp.byName = o.byName; }
  let name = o.name && !L.plants[o.name] && !L.creatures[o.name] ? o.name : kindName(w, L.plants, sp.root);
  L.plants[name] = sp;
  return name;
}
function creatureVariety(w, parent) {
  const L = w.laws, P = L.creatures[parent];
  if (!P || Object.keys(L.creatures).length >= L.ecology.maxCreatureKinds) return null;
  const sp = {};
  for (const key in P) sp[key] = P[key];
  sp.speed = vary(w, P.speed, 0.15, 0.35, 0.9); sp.drain = vary(w, P.drain, 0.15, 0.03, 0.1);
  sp.lifespan = Math.round(vary(w, P.lifespan, 0.15, 1500, 8000)); sp.breedChance = vary(w, P.breedChance, 0.2, 0.0008, 0.01);
  sp.meat = clamp(P.meat + (rnd(w) < 0.3 ? (rnd(w) < 0.5 ? 1 : -1) : 0), 1, 4);
  sp.minPop = 0; sp.migrate = 0; sp.from = parent; sp.root = P.root || parent;
  if (P.home && rnd(w) < 0.3) { const g = ['grass', 'forest', 'marsh', 'desert', 'snow', 'rock', 'sand'][ri(w, 7)]; sp.home = P.home.indexOf(g) < 0 ? P.home.concat([g]) : P.home.slice(); }
  if (rnd(w) < 0.2) sp.tough = clamp((P.tough || 1) + (rnd(w) < 0.5 ? 1 : -1), 1, 4);
  sp.look = SW.genBeast(parent + ':' + w.tick + ':' + ri(w, 9999), !!sp.predator);
  const name = kindName(w, L.creatures, sp.root);
  L.creatures[name] = sp;
  return name;
}
SW.pruneKinds = function (w) {
  const L = w.laws, used = {};
  for (let i = 0; i < w.plants.length; i++) if (w.plants[i]) used[w.plants[i].sp] = 1;
  for (let k = 0; k < w.creatures.length; k++) used[w.creatures[k].sp] = 1;
  for (let k = 0; k < w.agents.length; k++) w.agents[k].seeds.forEach(function (sd) { used[sd] = 1; });
  const gone = [];
  for (const n in L.plants) if (!used[n] && !BASE_KINDS[n]) { delete L.plants[n]; gone.push(n); }
  for (const n in L.creatures) if (!used[n] && !BASE_KINDS[n]) { delete L.creatures[n]; gone.push(n); }
  return gone;
};

/* ---------- world generation ---------- */
function noiseGrid(w, cw, ch) { const g = []; for (let i = 0; i < cw * ch; i++) g.push(rnd(w)); return { g: g, cw: cw, ch: ch }; }
function sampleNoise(n, u, v) {
  const x = u * (n.cw - 1), y = v * (n.ch - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, n.cw - 1), y1 = Math.min(y0 + 1, n.ch - 1);
  let fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = n.g[y0 * n.cw + x0], b = n.g[y0 * n.cw + x1], c = n.g[y1 * n.cw + x0], d = n.g[y1 * n.cw + x1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
/* ---------- regions: the world is a patchwork of lands that differ, each with its own ground, plants, animals and riches ---------- */
SW.BIOMES = {
  woodland: { dh: 0.01, noun: 'Woods', minerals: ['amber', 'flint'], say: 'deep forest; wood without end, nuts and game, little open ground' },
  desert: { dh: 0.03, noun: 'Sands', minerals: ['gold', 'salt'], say: 'dry sand under a hard sun; water only at the oases, and thirst comes fast' },
  lakeland: { dh: -0.085, noun: 'Lakes', minerals: ['shell'], say: 'lakes and rivers everywhere; fish, reeds, clay and rich banks' },
  highland: { dh: 0.12, noun: 'Heights', minerals: ['obsidian', 'tin', 'iron', 'gems', 'coal'], say: 'mountains and bare rock; stone, ore and caves, thin food, snow on the peaks' },
  marsh: { dh: -0.045, noun: 'Fens', minerals: ['peat'], say: 'wet fenland; roots, clay and healing plants, and sickness in the night air' },
  steppe: { dh: 0.02, noun: 'Plains', minerals: ['flint', 'coal'], say: 'open grassland; herds, grain and far sight, few trees and little stone' },
  tundra: { dh: 0.03, noun: 'Snows', minerals: ['iron', 'salt'], say: 'snow and cold; hardy moss and great beasts, and a winter that never quite leaves' },
  mixed: { dh: 0, noun: 'Land', minerals: ['flint'], say: 'a mixed country' }
};
const BIOME_ROWS = [['tundra', 'highland', 'woodland'], ['lakeland', 'steppe', 'marsh'], ['desert', 'woodland', 'highland']];
const REG_A = ['Va', 'Ko', 'Um', 'Ess', 'Tor', 'Il', 'Ash', 'Mer', 'Dun', 'Ael', 'Oro', 'Sil', 'Bra', 'Yen', 'Hal', 'Ix'], REG_B = ['ra', 'th', 'en', 'mar', 'oss', 'ia', 'ul', 'dan', 'eth', 'or', 'im', 'ka'];
function genRegions(w) {
  const cols = Math.max(1, Math.round(w.W / 48)), rows = Math.max(1, Math.round(w.H / 32)), regs = [], used = {};
  if (cols * rows < 4) { w.regions = [{ id: 0, name: 'the Land', biome: 'mixed', x: w.W >> 1, y: w.H >> 1 }]; return; }
  const rowB = BIOME_ROWS.map(function (r) { const a = r.slice(); for (let k = a.length - 1; k > 0; k--) { const j = ri(w, k + 1), t = a[k]; a[k] = a[j]; a[j] = t; } return a; });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const biome = rowB[Math.min(2, Math.floor(r * 3 / rows))][c % 3]; let nm = '';
    for (let t = 0; t < 30; t++) { nm = REG_A[ri(w, REG_A.length)] + REG_B[ri(w, REG_B.length)]; if (!used[nm]) break; } used[nm] = 1;
    regs.push({ id: regs.length, name: 'the ' + nm + ' ' + SW.BIOMES[biome].noun, short: nm, biome: biome, x: Math.round((c + 0.25 + 0.5 * rnd(w)) * w.W / cols), y: Math.round((r + 0.25 + 0.5 * rnd(w)) * w.H / rows) });
  }
  w.regions = regs;
}
SW.regionAt = function (w, x, y) { return w.regions && w.region ? w.regions[w.region[idx(w, x, y)]] || null : null; };
function genTerrain(w) {
  const sc = Math.max(1, w.W / 44), g = function (a, b) { return noiseGrid(w, Math.round(a * sc) + 1, Math.round(b * sc) + 1); };
  const e1 = g(5, 4), e2 = g(12, 9), e3 = g(28, 20), m1 = g(5, 4), m2 = g(13, 9), t1 = g(4, 3), wa = g(7, 5), wb = g(7, 5), hs = [];
  genRegions(w); w.region = [];
  const regs = w.regions, one = regs.length === 1;
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
    const u = x / (w.W - 1), v = y / (w.H - 1);
    let h = 0.56 * sampleNoise(e1, u, v) + 0.3 * sampleNoise(e2, u, v) + 0.14 * sampleNoise(e3, u, v);
    const m = 0.65 * sampleNoise(m1, u, v) + 0.35 * sampleNoise(m2, u, v);
    let t, f, B = 'mixed', rid = 0;
    if (!one) {
      /* which land this is: the nearest region heart, with the borders bent so no line is straight */
      const wx = x + (sampleNoise(wa, u, v) - 0.5) * 22, wy = y + (sampleNoise(wb, u, v) - 0.5) * 22; let d1 = 1e9, d2 = 1e9, r1 = 0, r2 = 0;
      for (let k = 0; k < regs.length; k++) { const d = Math.hypot(wx - regs[k].x, (wy - regs[k].y) * 1.15); if (d < d1) { d2 = d1; r2 = r1; d1 = d; r1 = k; } else if (d < d2) { d2 = d; r2 = k; } }
      rid = r1; B = regs[r1].biome; const wgt = 0.5 + 0.5 * clamp((d2 - d1) / 9, 0, 1);
      h += SW.BIOMES[B].dh * wgt + SW.BIOMES[regs[r2].biome].dh * (1 - wgt);
    }
    if (h < 0.33) { t = T.WATER; f = 0; }
    else if (h < 0.368) { t = T.SHALLOWS; f = 0; }
    else if (h < 0.39) { t = T.SAND; f = 0.15; }
    else if (B === 'woodland') { if (h > 0.74) { t = T.ROCK; f = 0; } else if (m < 0.26) { t = T.GRASS; f = 0.75; } else { t = T.FOREST; f = 0.45; } }
    else if (B === 'desert') { if (h > 0.7) { t = T.ROCK; f = 0; } else if (m > 0.8) { t = T.GRASS; f = 0.5; } else if (m > 0.66) { t = T.SAND; f = 0.15; } else { t = T.DESERT; f = 0.14; } }
    else if (B === 'lakeland') { if (m > 0.72 && h < 0.46) { t = T.MARSH; f = 0.7; } else if (m > 0.58) { t = T.FOREST; f = 0.45; } else { t = T.GRASS; f = 0.85; } }
    else if (B === 'highland') { if (h > 0.83) { t = T.SNOW; f = 0.12; } else if (h > 0.6) { t = T.ROCK; f = 0; } else if (m > 0.56) { t = T.FOREST; f = 0.4; } else { t = T.GRASS; f = 0.55; } }
    else if (B === 'marsh') { if (m > 0.84) { t = T.FOREST; f = 0.45; } else if (m > 0.36) { t = T.MARSH; f = 0.7; } else { t = T.GRASS; f = 0.7; } }
    else if (B === 'steppe') { if (h > 0.76) { t = T.ROCK; f = 0; } else if (m > 0.8) { t = T.FOREST; f = 0.45; } else { t = T.GRASS; f = 0.5 + 0.4 * m; } }
    else if (B === 'tundra') { if (h > 0.72) { t = T.ROCK; f = 0; } else if (m > 0.7) { t = T.FOREST; f = 0.35; } else if (m > 0.52) { t = T.GRASS; f = 0.4; } else { t = T.SNOW; f = 0.14; } }
    else {
      const temp = clamp(0.1 + 0.8 * v + (sampleNoise(t1, u, v) - 0.5) * 0.4 - Math.max(0, h - 0.55) * 1.1, 0, 1);
      if (h > 0.655) { if (temp < 0.4) { t = T.SNOW; f = 0.12; } else { t = T.ROCK; f = 0; } }
      else if (temp < 0.165) { t = T.SNOW; f = 0.14; }
      else if (temp > 0.66 && m < 0.47) { t = T.DESERT; f = 0.14; }
      else if (m > 0.6 && h < 0.5) { t = T.MARSH; f = 0.7; }
      else if (m > 0.52) { t = T.FOREST; f = 0.45; }
      else { t = T.GRASS; f = 0.55 + 0.45 * m / 0.52; }
    }
    hs.push(h); w.terrain.push(t); w.fert.push(Math.round(f * 100) / 100); w.region.push(rid);
    w.plants.push(null); w.shelters.push(0); w.walls.push(0); w.fires.push(0); w.stores.push(null);
  }
  /* a sea divides the world: deep water that cannot be waded, with islands in it. Whoever would know the far side must learn to cross. */
  if (!one) {
    const vert = w.W >= w.H, span = vert ? w.H : w.W, across = vert ? w.W : w.H, base = across * (rnd(w) < 0.5 ? 0.36 : 0.64), ph = rnd(w) * 6.28, ph2 = rnd(w) * 6.28;
    const isles = [span * (0.22 + 0.12 * rnd(w)), span * (0.66 + 0.12 * rnd(w))], mid = function (s0) { return base + Math.sin(s0 / span * 8.2 + ph) * across * 0.05 + Math.sin(s0 / 5 + ph2) * 1.4; };
    w.sea = { vertical: vert, at: Math.round(base) };
    for (let s0 = 0; s0 < span; s0++) {
      let half = 2.8 + 1.3 * Math.sin(s0 / 9 + ph); isles.forEach(function (q) { half += 5.5 * Math.exp(-(s0 - q) * (s0 - q) / 22); });
      const c = mid(s0);
      for (let d = -Math.ceil(half) - 1; d <= Math.ceil(half) + 1; d++) { const q = Math.round(c + d); if (q < 0 || q >= across) continue; const i = vert ? idx(w, q, s0) : idx(w, s0, q); if (Math.abs(d) <= half) { w.terrain[i] = T.WATER; w.fert[i] = 0; hs[i] = 0.2; } else if (w.terrain[i] !== T.WATER && w.terrain[i] !== T.ROCK) { w.terrain[i] = T.SAND; w.fert[i] = 0.15; } }
    }
    w.isles = [];
    isles.forEach(function (q) { const s0 = Math.round(q), c = Math.round(mid(s0)), cx = vert ? c : s0, cy = vert ? s0 : c; if (!inb(w, cx, cy)) return; w.isles.push({ x: cx, y: cy });
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { if (!inb(w, cx + dx, cy + dy)) continue; const i = idx(w, cx + dx, cy + dy), d2 = dx * dx + dy * dy * 1.2 + (rnd(w) - 0.5) * 3; if (d2 <= 6) { w.terrain[i] = rnd(w) < 0.3 ? T.FOREST : T.GRASS; w.fert[i] = 0.85; hs[i] = 0.5; } else if (d2 <= 10) { w.terrain[i] = T.SAND; w.fert[i] = 0.15; hs[i] = 0.4; } } });
  }
  /* rivers run from the heights down to the sea and green their banks; some rock holds seams of ore */
  w.river = {}; w.ore = {};
  const nR = Math.max(2, Math.round(w.W * w.H / 1100));
  for (let r = 0; r < nR; r++) {
    let x = -1, y = -1;
    for (let t = 0; t < 80; t++) { const qx = ri(w, w.W), qy = ri(w, w.H); if (hs[idx(w, qx, qy)] > 0.62) { x = qx; y = qy; break; } }
    if (x < 0) continue;
    const seen = {};
    for (let n = 0; n < 160; n++) {
      const i = idx(w, x, y), t = w.terrain[i];
      if (t === T.WATER || t === T.SHALLOWS) break; /* the sea, or another river */
      seen[i] = 1;
      if (n > 1) { w.terrain[i] = T.SHALLOWS; w.fert[i] = 0; w.river[i] = 1; }
      let best = null, bh = 9;
      for (let d = 0; d < 8; d++) {
        const nx = x + HEAD[d][0], ny = y + HEAD[d][1]; if (!inb(w, nx, ny) || seen[idx(w, nx, ny)]) continue;
        const hh = hs[idx(w, nx, ny)] + rnd(w) * 0.012 + (d % 2 ? 0.004 : 0);
        if (hh < bh) { bh = hh; best = [nx, ny]; }
      }
      if (!best) break;
      x = best[0]; y = best[1];
    }
  }
  for (const k in w.river) {
    const i = +k, x = i % w.W, y = Math.floor(i / w.W);
    for (let d = 0; d < 8; d++) {
      const nx = x + HEAD[d][0], ny = y + HEAD[d][1]; if (!inb(w, nx, ny)) continue;
      const j = idx(w, nx, ny), t = w.terrain[j];
      if (t === T.DESERT) { w.terrain[j] = T.GRASS; w.fert[j] = 0.6; }
      else if (t === T.GRASS) w.fert[j] = Math.min(1, Math.round((w.fert[j] + w.laws.water.riverFert) * 100) / 100);
    }
  }
  for (let i = 0; i < w.W * w.H; i++) if (w.terrain[i] === T.ROCK && rnd(w) < w.laws.water.oreSeams * (one ? 1 : regs[w.region[i]].biome === 'highland' ? 1.6 : 0.25)) w.ore[i] = 2 + ri(w, 4);
  /* no land is left without water: where the nearest water is too far, a spring rises (in the sands, an oasis) */
  for (let n = 0; n < 24; n++) {
    WF.delete(w.terrain); const fl = waterField(w); let bi = -1, bv = 11;
    for (let i = 0; i < fl.length; i++) if (fl[i] > bv && fl[i] < 9000) { const x = i % w.W, y = (i - x) / w.W; if (x > 2 && y > 2 && x < w.W - 3 && y < w.H - 3) { bv = fl[i]; bi = i; } }
    if (bi < 0) break;
    const px = bi % w.W, py = (bi - px) / w.W;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = idx(w, px + dx, py + dy), d2 = dx * dx + dy * dy; if (d2 <= 1) { w.terrain[j] = T.SHALLOWS; w.fert[j] = 0; delete w.ore[j]; } else if (d2 <= 5 && (w.terrain[j] === T.DESERT || w.terrain[j] === T.SAND || w.terrain[j] === T.GRASS)) { w.terrain[j] = T.GRASS; w.fert[j] = 0.8; } }
  }
  WF.delete(w.terrain);
  w.trees = w.terrain.map(function (t) { return t === T.FOREST ? 3 : 0; });
  /* riches lie where their land puts them: each region holds its own deposits, and the heights hold caves */
  w.lodes = {}; w.bkind = w.bkind || {};
  regs.forEach(function (R) {
    let kinds = SW.BIOMES[R.biome].minerals.slice(); if (R.biome === 'highland' && rnd(w) < 0.6) kinds.push('diamond'); if ((R.biome === 'desert' || R.biome === 'steppe' || R.biome === 'marsh') && rnd(w) < 0.7) kinds.push('oil'); if ((R.biome === 'highland' || R.biome === 'tundra') && rnd(w) < 0.5) kinds.push('uranium'); if (kinds.length > 4) { while (kinds.length > 4) kinds.splice(ri(w, kinds.length), 1); }
    R.minerals = kinds;
    kinds.forEach(function (k) {
      const deep = w.laws.minerals[k] && w.laws.minerals[k].deep, want = 2 + ri(w, 2); let made = 0;
      for (let t = 0; t < 900 && made < want; t++) { const i = ri(w, w.W * w.H), tt = w.terrain[i]; if (w.region[i] !== R.id || tt === T.WATER || tt === T.SHALLOWS || w.lodes[i] || w.ore[i]) continue; if (deep ? tt !== T.ROCK && t < 600 : tt === T.FOREST && t < 600) continue; w.lodes[i] = { k: k, n: deep ? 60 + ri(w, 100) : 16 + ri(w, 20) }; if (made === 0) w.lodes[i].n = deep ? 400 : 120; made++; }
    });
    if (R.biome === 'highland') { let made = 0; for (let t = 0; t < 1500 && made < 4; t++) { const i = ri(w, w.W * w.H); if (w.region[i] !== R.id || w.terrain[i] !== T.ROCK || w.lodes[i] || w.shelters[i]) continue; const x = i % w.W, y = (i - x) / w.W; let open = false; for (let d = 0; d < 8; d++) { const nx = x + HEAD[d][0], ny = y + HEAD[d][1]; if (inb(w, nx, ny)) { const t2 = w.terrain[idx(w, nx, ny)]; if (t2 === T.GRASS || t2 === T.FOREST) open = true; } } if (!open) continue; w.shelters[i] = -1; w.bkind[i] = 'cave'; made++; } }
  });
}
/* a place in the world that suits a kind of plant or animal: the right ground, in the right kind of land */
function fitsLand(w, s, x, y) { const i = idx(w, x, y); if (s.home && s.home.indexOf(SW.TERRAIN[w.terrain[i]]) < 0) return false; if (s.biomes && w.regions && w.regions.length > 1 && s.biomes.indexOf(w.regions[w.region[i]].biome) < 0) return false; return true; }
function landFor(w, s) { for (let k = 0; k < 900; k++) { const x = ri(w, w.W), y = ri(w, w.H), t = w.terrain[idx(w, x, y)]; if (t === T.WATER || t === T.SHALLOWS) continue; if (fitsLand(w, s, x, y)) return { x: x, y: y }; } return randomLand(w, s.home); }
function randomLand(w, want) {
  for (let k = 0; k < 600; k++) {
    const x = ri(w, w.W), y = ri(w, w.H), t = w.terrain[idx(w, x, y)];
    if (t === T.WATER || t === T.SHALLOWS) continue;
    if (want === 'fertile' && t !== T.GRASS) continue;
    if (Array.isArray(want) && want.indexOf(SW.TERRAIN[t]) < 0) continue;
    return { x: x, y: y };
  }
  return null;
}
function soilOf(w, kind, i) { const s = w.laws.plants[kind]; if (!s) return 1; const v = s.soil ? (s.soil[SW.TERRAIN[w.terrain[i]]] || 0) : 1; return s.biomes && w.regions && w.regions.length > 1 && s.biomes.indexOf(w.regions[w.region[i]].biome) < 0 ? v * 0.02 : v; }
SW.soilOf = soilOf;
function kindFor(w, i) { /* a kind of plant that can live in this ground, weighted by how well */
  const L = w.laws.plants, names = Object.keys(L); let total = 0; const ws = [];
  for (let k = 0; k < names.length; k++) { const v = soilOf(w, names[k], i); ws.push(v); total += v; }
  if (total <= 0) return null;
  let at = rnd(w) * total;
  for (let k = 0; k < names.length; k++) { at -= ws[k]; if (at <= 0) return names[k]; }
  return names[names.length - 1];
}
function newPlant(w, sp, g, i, tended) {
  const s = w.laws.plants[sp], soil = i == null ? 1 : soilOf(w, sp, i);
  const p = { sp: sp, g: g, food: g >= 1 ? Math.max(1, s.maxFood * (0.4 + 0.6 * rnd(w))) : 0, age: 0, life: Math.round(s.lifespan * (0.7 + 0.6 * rnd(w))), s: tended ? Math.max(0.5, soil) : Math.max(0.3, soil) };
  if (tended === 2) p.t = 1;
  return p;
}
const SYL_A = ['Ma', 'Ta', 'Se', 'Bru', 'Os', 'Ke', 'Lu', 'Ve', 'Na', 'Ru', 'Ar', 'Ye', 'Du', 'Si', 'Ha', 'Pe', 'Mi', 'Zo', 'El', 'Ka'];
const SYL_B = ['ren', 'vi', 'nna', 'ndo', 'kel', 'lon', 'sha', 'ri', 'mo', 'la', 'tha', 'ba', 'dra', 'wen', 'ku', 'su', 'ya', 'nde', 'ro', 'li'];
function newName(w, lang) {
  const TA = lang != null ? SW.TONGUES[lang % SW.TONGUES.length].a : SYL_A, TB = lang != null ? SW.TONGUES[lang % SW.TONGUES.length].b : SYL_B;
  for (let k = 0; k < 50; k++) {
    const n = TA[ri(w, TA.length)] + TB[ri(w, TB.length)];
    if (!w.names[n]) { w.names[n] = 1; return n; }
  }
  const n = 'N' + w.nextId; w.names[n] = 1; return n;
}
SW.instinctPolicy = function () {
  return [
    { if: [['predator_dist', '<', 4]], do: 'flee', from: 'predator', urgent: true, why: 'instinct: run from beasts that hunt' },
    { if: [['energy', '<', 70], ['plant_here', '>=', 1]], do: 'eat', why: 'instinct: eat what is underfoot' },
    { if: [['energy', '<', 45], ['food_carried', '>', 0]], do: 'eat', why: 'instinct: eat what I carry' },
    { if: [['energy', '<', 70], ['food_dist', '<', 99]], do: 'seek', target: 'food', why: 'instinct: walk to food I can see' },
    { if: [['energy', '<', 50]], do: 'wander', why: 'instinct: hungry and nothing in sight, so search' },
    { if: [['night', '==', 1], ['sheltered', '==', 0], ['shelter_dist', '<', 99]], do: 'seek', target: 'shelter', why: 'instinct: shelter at night' },
    { if: [], do: 'linger', why: 'instinct: with nothing pressing, stay where I am' }
  ];
};
SW.CALLINGS = ['hero', 'leader', 'hunter', 'warrior', 'sage', 'merchant', 'healer', 'builder', 'bard', 'explorer'];
/* a people keeps near as many women as men */
function sexFor(w, people) { let f = 0, m = 0; const all = w.agents.concat(w.newborn || []); for (let k = 0; k < all.length; k++) if (all[k].people === people) { if (all[k].sex === 'f') f++; else if (all[k].sex === 'm') m++; } return f < m ? 'f' : m < f ? 'm' : (rnd(w) < 0.5 ? 'f' : 'm'); }
function newAgent(w, x, y, o) {
  o = o || {};
  const life = Math.round(w.laws.body.lifespan * (0.85 + 0.3 * rnd(w)));
  return {
    id: w.nextId++, name: newName(w, o.lang), x: x, y: y, px: x, py: y, people: o.people != null ? o.people : null, lang: o.lang != null ? o.lang : null, tongues: o.tongues || {}, genes: o.genes || null, tall: o.tall || 1, things: {},
    e: o.e || 80, hp: 100, age: o.adult ? Math.round(life * 0.2) : 0, life: life, born: w.tick,
    carry: [], seeds: [], wood: 0, ore: 0, clay: 0, pots: 0, sick: 0, immune: 0,
    policy: o.policy || SW.instinctPolicy(), intent: null,
    habits: o.habits || { avoid: [], spare: 0 },
    rel: {}, seen: {},
    temperament: o.temperament || { bold: 0.5, sociable: 0.5, curious: 0.5, gentle: 0.5, honest: 0.5, greedy: 0.5 },
    hue: o.hue != null ? o.hue : ri(w, 360), gen: o.gen || 1, parents: o.parents || [],
    mateCd: 0, court: null, lowFlag: false, resting: false, sheltered: 0, doing: 'waking',
    look: o.look || null, shelterLook: o.shelterLook || null, wallLook: o.wallLook || null, emblem: o.emblem || null,
    mood: { anger: 0, fear: 0, grief: 0, joy: 0, lonely: 0 }, leader: null, bandName: '', offer: null, lore: o.lore || 0, arts: [], teachers: [], knows: {}, glimpsed: {}, press: {}, faith: null, sex: o.sex || sexFor(w, o.people), calling: SW.CALLINGS[ri(w, SW.CALLINGS.length)], tools: [], designs: {}, stone: 0, read: {}, stances: {}, customs: [], plan: [], seenAt: {}, spook: 0,
    stats: { bites: 0, kills: 0, kids: 0, gifts: 0, planted: 0, built: 0, bred: 0, stolen: 0, trades: 0, wood: 0, marks: 0, taught: 0, hunted: 0, healed: 0, led: 0, invented: 0, crafted: 0, fished: 0, ore: 0, clay: 0, tamed: 0, rallied: 0, mined: 0, made: 0, seasons: 0, paved: 0, milk: 0, wool: 0, ride: 0, raised: 0 }
  };
}
function newCreature(w, sp, x, y, o) {
  o = o || {};
  const s = w.laws.creatures[sp];
  return {
    id: w.nextId++, sp: sp, x: x, y: y, px: x, py: y,
    e: o.e != null ? o.e : s.maxEnergy * (0.5 + 0.3 * rnd(w)), age: o.age != null ? o.age : ri(w, s.matureAge),
    life: Math.round(s.lifespan * (0.8 + 0.4 * rnd(w))),
    size: o.size || 0.85 + 0.3 * rnd(w), quick: o.quick || 0.85 + 0.3 * rnd(w)
  };
}

/* The world is made larger than what is known. Its rim is veiled: the true ground is kept, and shown as the unknown until someone ventures in. */
function veil(w, M) {
  const V = w.veil = { t: {}, f: {}, lodes: {}, ore: {}, river: {}, caves: [], m: M }; (w.regions || []).forEach(function (R) { R.openLand = 0; });
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) { const i = y * w.W + x;
    if (x >= M && y >= M && x < w.W - M && y < w.H - M) { const tt = w.terrain[i], R = w.regions && w.regions[w.region[i]]; if (R && (tt === T.GRASS || tt === T.FOREST || tt === T.SAND || tt === T.MARSH)) R.openLand++; continue; }
    V.t[i] = w.terrain[i]; V.f[i] = w.fert[i]; w.terrain[i] = T.VOID; w.fert[i] = 0;
    if (w.lodes[i]) { V.lodes[i] = w.lodes[i]; delete w.lodes[i]; } if (w.ore && w.ore[i]) { V.ore[i] = w.ore[i]; delete w.ore[i]; } if (w.river && w.river[i]) { V.river[i] = w.river[i]; delete w.river[i]; }
    if (w.shelters[i] === -1) { V.caves.push(i); w.shelters[i] = 0; if (w.bkind) delete w.bkind[i]; } }
  w.sites = (w.sites || []).filter(function (q) { return w.terrain[q.y * w.W + q.x] !== T.VOID; });
  w.openTiles = (w.W - 2 * M) * (w.H - 2 * M);
}
/* someone has pushed into the unknown: a wide strip of it becomes land, with what was always there and a little more */
SW.openStrip = function (w, x, y, emit) {
  emit = emit || noop; const V = w.veil; if (!V) return null; const E = w.laws.explore || {}, D = E.depth || 10, Lh = Math.round((E.length || 40) / 2);
  let dir = null, bd = 9; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { for (let k = 1; k <= 3; k++) { const X = x + d[0] * k, Y = y + d[1] * k; if (!inb(w, X, Y)) break; if (V.t[Y * w.W + X] != null) { if (k < bd) { bd = k; dir = d; } break; } } });
  if (!dir) return null;
  const x0 = Math.max(0, dir[0] ? (dir[0] > 0 ? x + 1 : x - D - 2) : x - Lh), x1 = Math.min(w.W - 1, dir[0] ? (dir[0] > 0 ? x + D + 2 : x - 1) : x + Lh), y0 = Math.max(0, dir[1] ? (dir[1] > 0 ? y + 1 : y - D - 2) : y - Lh), y1 = Math.min(w.H - 1, dir[1] ? (dir[1] > 0 ? y + D + 2 : y - 1) : y + Lh);
  let n = 0; const land = [], found = {};
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { const i = Y * w.W + X; if (V.t[i] == null) continue; w.terrain[i] = V.t[i]; w.fert[i] = V.f[i]; delete V.t[i]; delete V.f[i]; n++;
    if (V.lodes[i]) { w.lodes[i] = V.lodes[i]; found[w.lodes[i].k] = 1; delete V.lodes[i]; } if (V.ore[i]) { w.ore[i] = V.ore[i]; delete V.ore[i]; } if (V.river && V.river[i]) { w.river[i] = V.river[i]; delete V.river[i]; }
    const tt = w.terrain[i]; if (tt !== T.WATER && tt !== T.SHALLOWS) { land.push(i); if (w.fert[i] > 0.1 && rnd(w) < 0.16 + w.fert[i] * 0.3) { const k = kindFor(w, i); if (k) w.plants[i] = newPlant(w, k, 1, i); } } }
  if (!n) return null;
  V.caves = V.caves.filter(function (i) { if (w.terrain[i] !== T.VOID) { w.shelters[i] = -1; w.bkind[i] = 'cave'; return false; } return true; });
  w.openTiles = (w.openTiles || 0) + n; narrowWater(w); WF.delete(w.terrain);
  const rich = Object.keys(w.laws.minerals).filter(function (k) { return !w.laws.minerals[k].deep; });
  for (let q = 0; q < (E.finds || 3) && land.length && rich.length; q++) { const i = land[ri(w, land.length)]; if (w.lodes[i] || w.plants[i] || w.shelters[i]) continue; const k = rich[ri(w, rich.length)]; w.lodes[i] = { k: k, n: 150, m: 150 }; found[k] = 1; }
  const gz = Object.keys(w.laws.creatures).filter(function (k) { return !w.laws.creatures[k].predator && !w.laws.creatures[k].retired; }); let herd = 0, hk = null;
  for (let t = 0; t < 60 && herd < 6 && land.length; t++) { const i = land[ri(w, land.length)], X = i % w.W, Y = Math.floor(i / w.W); if (!hk) { const c = gz.filter(function (k) { return fitsLand(w, w.laws.creatures[k], X, Y); }); if (!c.length) continue; hk = c[ri(w, c.length)]; } if (fitsLand(w, w.laws.creatures[hk], X, Y)) { w.creatures.push(newCreature(w, hk, X, Y, { age: w.laws.creatures[hk].matureAge })); herd++; } }
  let beasts = 0; if (rnd(w) < (E.beasts == null ? 0.5 : E.beasts)) { const pk = Object.keys(w.laws.creatures).filter(function (k) { return w.laws.creatures[k].predator && !w.laws.creatures[k].retired; }); for (let t = 0; t < 30 && beasts < 2 && pk.length && land.length; t++) { const i = land[ri(w, land.length)], X = i % w.W, Y = Math.floor(i / w.W), k = pk[ri(w, pk.length)]; if (fitsLand(w, w.laws.creatures[k], X, Y)) { w.creatures.push(newCreature(w, k, X, Y, { age: w.laws.creatures[k].matureAge })); beasts++; } } } /* unknown land is wilder */
  w.opened = (w.opened || 0) + 1; const R = w.regions && w.regions[w.region[Math.min(w.H - 1, Math.max(0, (y0 + y1) >> 1)) * w.W + ((x0 + x1) >> 1)]];
  /* now and then the new land is not empty: a band of another people lives there, with its own tongue, ways and customs */
  let strangers = null; if (R && land.length > 60 && w.peoples.length < 8 && w.agents.length < w.laws.mate.maxPopulation - 4 && rnd(w) < (E.strangers == null ? 0.2 : E.strangers)) { const kinds = Object.keys(SW.PEOPLE_KINDS), P = newPeople(w, SW.PEOPLE_KINDS[R.biome] ? R.biome : kinds[ri(w, kinds.length)], R.id), made = SW.arrive(w, 4, P), era = SW.eraOf(w), ways = Object.keys(w.laws.tree).filter(function (k) { return (w.laws.tree[k].era || 1) <= era + 1 && !(w.laws.tree[k].needs || []).length; }), b = land[ri(w, land.length)];
    made.forEach(function (o, k) { for (let t = 0; t < 30; t++) { const X = (b % w.W) + ri(w, 7) - 3, Y = Math.floor(b / w.W) + ri(w, 7) - 3; if (passable(w, X, Y, o)) { o.x = X; o.y = Y; o.px = X; o.py = Y; break; } } for (let q = 0; q < 2 && ways.length; q++) { const k2 = ways[ri(w, ways.length)]; if (!o.knows[k2]) o.knows[k2] = { name: k2, idea: '', look: null, tick: w.tick, by: null, byName: null }; } });
    if (made.length) strangers = P.name; }
  const ev = { type: 'opened', x0: x0, y0: y0, x1: x1, y1: y1, tiles: n, found: Object.keys(found), herd: herd ? hk : null, n: herd, beasts: beasts, strangers: strangers, land: R ? R.name : '' };
  emit(ev); return ev;
};
SW.createWorld = function (seed, opts) {
  opts = opts || {};
  const w = {
    v: 2, seed: seed, rng: (seed * 2654435761) | 0, tick: 0, W: (opts.W || 144) + 2 * (opts.margin != null ? opts.margin : 20), H: (opts.H || 96) + 2 * (opts.margin != null ? opts.margin : 20),
    terrain: [], fert: [], plants: [], shelters: [], walls: [], fires: [], stores: [], sturdy: {},
    relics: [], faiths: {}, culture: { seq: 1, items: {}, log: [], days: [], rites: {} },
    creatures: [], agents: [], graves: [], marks: [], places: [], inventions: [], edicts: [], devices: {}, settlements: [], looks: {}, wars: [], fished: {}, river: {}, ore: {}, sites: [], fields: [], regions: [], region: [], lodes: {}, bkind: {}, roads: {}, works: {}, peoples: [], tally: { made: {}, eaten: {}, built: {} }, weather: { kind: 'clear', until: 160 }, names: {},
    laws: SW.defaultLaws(), nextId: 1
  };
  genTerrain(w);
  { const Mg = opts.margin != null ? opts.margin : 20; if (Mg > 0) veil(w, Mg); narrowWater(w); w.tally.lived = 0; }
  for (let i = 0; i < w.W * w.H; i++) {
    if (w.fert[i] > 0.1 && rnd(w) < 0.1 + w.fert[i] * 0.2) { const k = kindFor(w, i); if (k) w.plants[i] = newPlant(w, k, rnd(w) < 0.75 ? 1 : 0.4, i); }
  }
  const area = (w.openTiles || w.W * w.H) / 1320, stock = { hopper: 7, skit: 4, hornback: 2, stalker: 1.2, ridgecat: 0.5, plainsox: 1.6, tusker: 0.9, sandstrider: 1.1, fenfowl: 2, bristleboar: 1.3, frostfang: 0.45, dunecat: 0.4 };
  for (const sp in stock) {
    const cs = w.laws.creatures[sp]; if (!cs) continue; if (cs.biomes && w.regions.length < 2) continue;
    const n = Math.max(1, Math.round(stock[sp] * area * 0.8));
    for (let k = 0; k < n; k++) { const p = landFor(w, cs); if (p) w.creatures.push(newCreature(w, sp, p.x, p.y)); }
  }
  for (const ck in w.laws.creatures) { const cs = w.laws.creatures[ck]; if (!cs.look) cs.look = SW.genBeast(ck, !!cs.predator, cs.form); }
  for (const pk in w.laws.plants) { const ps = w.laws.plants[pk]; if (!ps.look) ps.look = SW.genPlant(pk, ps.form); }
  for (const bk in SW.BEAST_LOOKS) if (w.laws.creatures[bk]) w.laws.creatures[bk].look = JSON.parse(JSON.stringify(SW.BEAST_LOOKS[bk]));
  w.lookV = 5;
  const bands = opts.bands != null ? opts.bands : 3, per = opts.agents != null ? opts.agents : 5, chosen = [];
  for (let b = 0; b < bands; b++) {
    let P;
    if (w.regions.length > 1) {
      let best = null, bs = -1e9;
      w.regions.forEach(function (R) {
        if (!SW.PEOPLE_KINDS[R.biome] || chosen.indexOf(R) >= 0 || (R.openLand != null && R.openLand < 120)) return;
        let sc = rnd(w) * 20 + (R.biome === 'tundra' || R.biome === 'desert' ? -12 : 0), near = 999;
        chosen.forEach(function (C) { near = Math.min(near, Math.hypot(C.x - R.x, C.y - R.y)); if (C.biome === R.biome) sc -= 60; });
        if (near < 999) sc += near;
        if (w.sea && chosen.length) { const side = function (Q) { return (w.sea.vertical ? Q.x : Q.y) > w.sea.at; }; if (chosen.every(function (C) { return side(C) !== side(R); })) sc += 45; }
        if (sc > bs) { bs = sc; best = R; }
      });
      if (!best) best = w.regions[ri(w, w.regions.length)]; chosen.push(best); P = newPeople(w, best.biome, best.id);
    } else P = newPeople(w, ['woodland', 'highland', 'lakeland', 'steppe', 'marsh'][b % 5], null);
    if (per >= 4) { SW.settle(w, Math.ceil(per / 2), P); SW.settle(w, Math.floor(per / 2), P); } else SW.settle(w, per, P);
  }
  return w;
};

/* bold, sociable, curious, gentle, honest, greedy: a taker, a carer, a seeker, a schemer, a hermit, an enforcer... */
const ARCHETYPES = [[0.88, 0.3, 0.4, 0.12, 0.5, 0.88], [0.25, 0.85, 0.5, 0.9, 0.88, 0.12], [0.5, 0.5, 0.95, 0.6, 0.7, 0.3], [0.72, 0.85, 0.4, 0.25, 0.1, 0.8], [0.2, 0.12, 0.7, 0.7, 0.8, 0.4], [0.8, 0.6, 0.3, 0.15, 0.75, 0.5], [0.4, 0.9, 0.8, 0.5, 0.3, 0.6], [0.9, 0.5, 0.7, 0.5, 0.6, 0.7], [0.55, 0.7, 0.85, 0.75, 0.6, 0.2]];
const HUES = [18, 200, 285, 48, 150, 330, 95, 240, 0, 170, 310, 70];
/* Place a founding band close together, well away from any band already there, so peoples begin apart and meet later. */
/* newcomers: a small band of the people with fewest living comes into the land */
SW.arrive = function (w, n, people, emit) {
  emit = emit || noop; const L = w.laws.arrivals || {};
  if (!people) { const cnt = {}; (w.peoples || []).forEach(function (p) { cnt[p.id] = 0; }); w.agents.forEach(function (a) { if (cnt[a.people] != null) cnt[a.people]++; }); let best = null, bn = 1e9; (w.peoples || []).forEach(function (p) { if (cnt[p.id] < bn) { bn = cnt[p.id]; best = p; } }); people = best; }
  const before = w.agents.length, made = SW.settle(w, Math.max(1, Math.min(6, n || L.size || 3)), people) || w.agents.slice(before);
  w.tally.lived = (w.tally.lived || 0) + made.length;
  made.forEach(function (a) { a.arrived = w.tick; a.carry = a.carry || []; while (a.carry.length < 3) a.carry.push({ k: 'berry', n: 14 }); });
  w.lastArrival = w.tick; if (made.length) { w.arrivedQ = w.arrivedQ || []; w.arrivedQ.push({ ids: made.map(function (a) { return a.id; }), people: people ? people.id : null }); }
  return made;
};
SW.settle = function (w, n, people) {
  const multi = w.regions && w.regions.length > 1;
  if (!people) { let rid = null, kind = ['woodland', 'highland', 'lakeland', 'steppe', 'marsh'][w.peoples.length % 5]; if (multi) { const R = w.regions[ri(w, w.regions.length)]; rid = R.id; if (SW.PEOPLE_KINDS[R.biome]) kind = R.biome; } people = newPeople(w, kind, rid); }
  const fl = waterField(w); let home = null, best = -1e9; const own = [];
  if (multi && people.region != null) { for (let i = 0; i < w.region.length; i++) { const tt = w.terrain[i]; if (w.region[i] === people.region && (tt === T.GRASS || tt === T.FOREST || tt === T.SAND || tt === T.MARSH)) own.push(i); } }
  for (let k = 0; k < 160; k++) {
    let c = null;
    if (own.length) { const i = own[ri(w, own.length)]; c = { x: i % w.W, y: Math.floor(i / w.W) }; }
    if (!c) c = randomLand(w, 'fertile'); if (!c) continue;
    let score = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = c.x + dx, y = c.y + dy; if (!inb(w, x, y)) continue;
      const i = idx(w, x, y); if (w.terrain[i] === T.GRASS) score++; if (w.plants[i] && w.laws.plants[w.plants[i].sp].nutrition > 0) score += 2; if (w.terrain[i] === T.FOREST) score += 0.6; if (w.terrain[i] === T.VOID) score -= 8;
    }
    score -= Math.max(0, fl[idx(w, c.x, c.y)] - 3) * 5; if (c.x < 8 || c.y < 8 || c.x > w.W - 9 || c.y > w.H - 9) score -= 120;
    if (own.length) [[-5, 0], [5, 0], [0, -5], [0, 5]].forEach(function (q) { if (!inb(w, c.x + q[0], c.y + q[1]) || w.region[idx(w, c.x + q[0], c.y + q[1])] !== people.region) score -= 45; });
    [[-14, 0], [14, 0], [0, -14], [0, 14], [-10, -10], [10, 10], [-10, 10], [10, -10]].forEach(function (q) { const X = c.x + q[0], Y = c.y + q[1]; if (!inb(w, X, Y) || w.terrain[idx(w, X, Y)] === T.VOID) score -= 70; }); /* a home is made well inside the known world */
    let nearOther = 999, nearOwn = 999;
    for (let i = 0; i < w.agents.length; i++) { const o = w.agents[i], d = cheb(c.x, c.y, o.x, o.y); if (o.people === people.id) nearOwn = Math.min(nearOwn, d); else nearOther = Math.min(nearOther, d); }
    if (nearOther < 999) score += Math.min(nearOther, 40) * 4 - (nearOther < 24 ? 300 : 0);
    if (nearOwn < 999) score -= Math.abs(nearOwn - 11) * 6 + (nearOwn < 7 ? 80 : 0); /* a people's second camp: near enough to find, far enough to be its own place */
    if (score > best) { best = score; home = c; }
  }
  if (!home) home = { x: w.W >> 1, y: w.H >> 1 };
  const made = [], base = w.agents.length + w.graves.length;
  for (let k = 0; k < n; k++) {
    let x = home.x, y = home.y;
    for (let t = 0; t < 40; t++) { const cx = home.x + ri(w, 7) - 3, cy = home.y + ri(w, 7) - 3; if (inb(w, cx, cy) && w.terrain[idx(w, cx, cy)] !== T.WATER && w.terrain[idx(w, cx, cy)] !== T.SHALLOWS && w.terrain[idx(w, cx, cy)] !== T.VOID) { x = cx; y = cy; break; } }
    const t = ARCHETYPES[(base + k) % ARCHETYPES.length], j = function (v) { return Math.round(clamp(v + (rnd(w) - 0.5) * 0.12, 0, 1) * 100) / 100; };
    const genes = {}; for (const g in people.genes) genes[g] = Math.round(people.genes[g] * (0.96 + 0.08 * rnd(w)) * 100) / 100;
    const a = newAgent(w, x, y, { adult: true, hue: (people.hue + ri(w, 41) - 20 + 360) % 360, people: people.id, lang: people.tongue, genes: genes, tall: Math.round(((people.form && people.form.tall) || 1) * (0.97 + 0.06 * rnd(w)) * 100) / 100, temperament: { bold: j(t[0]), sociable: j(t[1]), curious: j(t[2]), gentle: j(t[3]), honest: j(t[4]), greedy: j(t[5]) } });
    a.look = SW.bornLook(w, a.hue, a.temperament, people.form);
    if (people.way && w.laws.tree[people.way]) a.knows[people.way] = { name: 'the old way of ' + people.way, idea: 'known to ' + people.name + ' since before memory', look: null, tick: 0, by: 0, byName: people.name };
    w.agents.push(a); made.push(a);
  }
  made.forEach(function (a) { made.forEach(function (o) { if (o !== a) a.seen[o.id] = w.tick || 1; }); });
  return made;
};

/* ---------- feelings ---------- */
function feel(a, k, d) { if (a && a.mood) a.mood[k] = clamp(a.mood[k] + d, 0, 1); }
SW.feel = feel;

/* ---------- weather and fortune: things that happen to everyone, for good and ill ---------- */
const SKY = [
  [['clear', 42], ['rain', 31], ['storm', 10], ['fog', 10], ['gale', 7]],
  [['clear', 44], ['drought', 16], ['heat', 12], ['rain', 13], ['storm', 15]],
  [['clear', 32], ['rain', 26], ['fog', 20], ['storm', 13], ['gale', 9]],
  [['clear', 37], ['snow', 38], ['storm', 17], ['gale', 8]]
];
function stepWeather(w, emit) {
  const L = w.laws, W = L.weather, wx = w.weather;
  if (w.tick >= wx.until) {
    const table = SKY[SW.season(w)]; let total = 0, pickAt = rnd(w), kind = 'clear';
    table.forEach(function (r) { total += r[1]; }); pickAt *= total;
    for (let k = 0; k < table.length; k++) { pickAt -= table[k][1]; if (pickAt <= 0) { kind = table[k][0]; break; } }
    const was = wx.kind; wx.kind = kind; wx.until = w.tick + Math.round(W.meanDuration * (0.5 + rnd(w)));
    if (kind !== was) emit({ type: 'weather', kind: kind, was: was });
  }
  if (wx.kind === 'storm' && rnd(w) < W.strikeChance) {
    const x = ri(w, w.W), y = ri(w, w.H), i = idx(w, x, y), hit = [];
    if (w.plants[i]) w.plants[i] = null;
    for (let k = 0; k < w.creatures.length; k++) { const c = w.creatures[k]; if (c.x === x && c.y === y) c.dead = true; }
    for (let k = 0; k < w.agents.length; k++) {
      const a = w.agents[k]; if (a.dead) continue;
      const d = cheb(a.x, a.y, x, y);
      if (d <= 1 && !w.shelters[idx(w, a.x, a.y)]) { hit.push(a.id); feel(a, 'fear', 0.6); }
      else if (d <= SW.sight(w)) feel(a, 'fear', 0.25);
    }
    emit({ type: 'lightning', x: x, y: y, hit: hit });
    for (let k = 0; k < w.agents.length; k++) { const a = w.agents[k]; if (hit.indexOf(a.id) >= 0) hurtAgent(w, a, Math.round(W.strikeDamage * (0.6 + 0.8 * rnd(w))), 'struck by lightning', emit); }
  }
  /* each dawn, fortune may turn */
  if (w.tick > 1 && w.tick % L.time.dayLength === 1) {
    const roll = rnd(w);
    if (roll < W.bloom) {
      let n = 0;
      for (let k = 0; k < 400 && n < 60; k++) { const j = ri(w, w.plants.length); if (!w.plants[j] && !w.shelters[j] && !w.walls[j] && w.fert[j] > 0.1) { const kd = kindFor(w, j); if (kd) { w.plants[j] = newPlant(w, kd, 0.5, j); n++; } } }
      emit({ type: 'fortune', kind: 'bloom', n: n });
    } else if (roll < W.bloom + W.blight) {
      const tally = {}; for (let i = 0; i < w.plants.length; i++) if (w.plants[i]) tally[w.plants[i].sp] = (tally[w.plants[i].sp] || 0) + 1;
      const big = Object.keys(tally).filter(function (k) { return tally[k] >= 20; });
      if (big.length) {
        const kind = big[ri(w, big.length)]; let n = 0;
        for (let i = 0; i < w.plants.length; i++) if (w.plants[i] && w.plants[i].sp === kind && rnd(w) < 0.5) { w.plants[i] = null; n++; }
        emit({ type: 'fortune', kind: 'blight', plant: kind, n: n });
      }
    } else if (roll < W.bloom + W.blight + W.herd + W.pack) {
      const pack = roll >= W.bloom + W.blight + W.herd, kind = pack ? 'stalker' : 'hopper', n = pack ? 2 : 6;
      const side = ri(w, 4); let made = 0;
      for (let k = 0; k < 40 && made < n; k++) {
        let x = ri(w, w.W), y = ri(w, w.H);
        if (side === 0) y = 0; else if (side === 1) y = w.H - 1; else if (side === 2) x = 0; else x = w.W - 1;
        if (passable(w, x, y) && L.creatures[kind]) { w.creatures.push(newCreature(w, kind, x, y, { age: L.creatures[kind].matureAge })); made++; }
      }
      if (made) emit({ type: 'fortune', kind: pack ? 'pack' : 'herd', n: made, side: ['north', 'south', 'west', 'east'][side] });
    }
  }
}

/* ---------- plants ---------- */
function trySeed(w, i, spName, sp) {
  const r = sp.seedRadius, x = (i % w.W) + ri(w, 2 * r + 1) - r, y = Math.floor(i / w.W) + ri(w, 2 * r + 1) - r;
  if (!inb(w, x, y)) return;
  const j = idx(w, x, y);
  if (w.plants[j] || w.shelters[j] || w.walls[j] || w.fert[j] <= 0) return;
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && inb(w, x + dx, y + dy) && w.plants[idx(w, x + dx, y + dy)]) n++;
  }
  if (rnd(w) < w.fert[j] * (1 - n / w.laws.ecology.crowding) * soilOf(w, spName, j)) {
    let kind = spName;
    if (rnd(w) < w.laws.ecology.wildMutation) { const v = plantVariety(w, spName); if (v) { kind = v; w.fresh.push({ kind: v, from: spName, x: x, y: y, flora: true }); } }
    w.plants[j] = newPlant(w, kind, 0.02, j);
  }
}
function stepPlants(w) {
  const L = w.laws, season = SW.season(w);
  const sky = w.weather.kind;
  const bty = (L.ecology.bounty == null ? 1 : L.ecology.bounty), sm = bty > 0 ? Math.max(1, (L.ecology.seeding || 1) / bty) : 1; /* bounty is how fast food comes back on a plant; how readily plants seed is its own law */
  const gm = bty * (season === 3 ? L.time.winterGrowth : season === 0 ? (L.time.springGrowth || 1) : season === 1 ? 1.15 : (L.time.harvestGrowth || 1)) * (sky === 'rain' ? L.weather.rainGrowth : sky === 'storm' ? 1.2 : sky === 'drought' ? L.weather.droughtGrowth : sky === 'snow' ? 0.6 : 1);
  /* The soil keeps dormant seed, so a stripped land is slow to return but never dead for good. */
  if (rnd(w) < L.ecology.dormantSeeds * gm * sm) {
    const j = ri(w, w.plants.length);
    if (!w.plants[j] && !w.shelters[j] && !w.walls[j] && w.fert[j] > 0.1) { const kd = kindFor(w, j); if (kd) w.plants[j] = newPlant(w, kd, 0.02, j); }
  }
  for (let i = 0; i < w.plants.length; i++) {
    const p = w.plants[i]; if (!p) continue;
    const sp = L.plants[p.sp];
    p.age++;
    if (!sp || p.age > p.life) { w.plants[i] = null; continue; }
    const lf = w.fields.length ? fieldFactor(w, 'growth', i % w.W, Math.floor(i / w.W)) : 1;
    if (p.g < 1) {
      p.g += sp.growth * (0.4 + w.fert[i]) * (sp.hardy ? Math.max(gm, 0.3) : gm) * lf * (p.s || 1) * (p.t ? L.craft.farmGrowth : 1);
      if (p.g >= 1) { p.g = 1; p.food = Math.max(p.food, 1); }
    } else {
      if (season === 3 && !sp.hardy && !p.t) p.food = Math.max(0, p.food - (L.time.winterWither || 0));
      else if (sky === 'drought') p.food = Math.max(0.2, p.food - 0.0008);
      else if (lf < 1 && sky !== 'drought' && p.food > 0.2 && lf < 0.6) p.food = Math.max(0.2, p.food - 0.0006 / lf);
      else if (p.food < sp.maxFood) p.food = Math.min(sp.maxFood, p.food + sp.regrow * (sp.hardy ? Math.max(gm, 0.3) : gm) * lf * (p.t ? L.craft.farmGrowth : 1));
      if (rnd(w) < sp.seedRate * gm * sm) trySeed(w, i, p.sp, sp);
    }
  }
}

/* ---------- creatures ---------- */
function nearestCreature(w, x, y, range, pred, maxTough) {
  let best = null, bd = range + 1;
  for (let k = 0; k < w.creatures.length; k++) {
    const c = w.creatures[k], cs = w.laws.creatures[c.sp]; if (c.dead || !cs || !!cs.predator !== pred) continue;
    if (maxTough && (cs.tough || 1) > maxTough) continue;
    const d = cheb(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function exposedAgent(w, x, y, range) {
  let best = null, bd = range + 1;
  for (let k = 0; k < w.agents.length; k++) {
    const a = w.agents[k]; if (a.dead || a.sheltered) continue;
    const d = cheb(x, y, a.x, a.y); if (d >= bd || fireNear(w, a.x, a.y, 3)) continue;
    let company = false;
    for (let j = 0; j < w.agents.length && !company; j++) { const o = w.agents[j]; company = o !== a && !o.dead && cheb(o.x, o.y, a.x, a.y) <= 2; }
    if (!company) { bd = d; best = a; }
  }
  return best;
}
function nearestAgentTo(w, x, y, range) {
  let best = null, bd = range + 1;
  for (let k = 0; k < w.agents.length; k++) {
    const a = w.agents[k]; if (a.dead) continue;
    const d = cheb(x, y, a.x, a.y); if (d < bd) { bd = d; best = a; }
  }
  return best;
}
function nearestGraze(w, c, s, range) {
  let best = null, bd = range + 1;
  for (let dy = -range; dy <= range; dy++) for (let dx = -range; dx <= range; dx++) {
    const x = c.x + dx, y = c.y + dy; if (!inb(w, x, y)) continue;
    const p = w.plants[idx(w, x, y)];
    if (!p || p.g < 1 || w.laws.plants[p.sp].nutrition <= 0 || p.food < 1 + s.grazeSpare) continue;
    const d = Math.max(Math.abs(dx), Math.abs(dy)); if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  return best;
}
/* a life has three stages: a child is small, cheap to feed and quick to learn; an elder is slow and weak but teaches well */
SW.stage = function (w, a) { const A = w.laws.age; return a.age < a.life * A.childUntil ? 'child' : a.age >= a.life * A.elderFrom ? 'elder' : 'adult'; };
function strengthOf(w, a) { const g = SW.stage(w, a); let f = 1; if (a.things && w.laws.goods) { const tt = w.terrain[idx(w, a.x, a.y)], wet = tt === T.WATER || tt === T.SHALLOWS; for (const k in w.laws.goods) { const G = w.laws.goods[k]; if (G.fight && a.things[k] > 0 && (G.float ? wet : !wet) && G.fight > f) f = G.fight; } } return f * (g === 'child' ? w.laws.age.childStrength : g === 'elder' ? w.laws.age.elderStrength : 1); }
SW.strengthOf = strengthOf;
function cap(w, a) { let g = 0; if (a.things && w.laws.goods) { const tt = w.terrain[idx(w, a.x, a.y)], wet = tt === T.WATER || tt === T.SHALLOWS; for (const k in w.laws.goods) { const G = w.laws.goods[k]; if (a.things[k] > 0 && G.carry && (G.float ? wet : !wet || !G.land)) g += G.carry; } } return w.laws.body.carryMax + (a.pots || 0) * w.laws.craft.potCarry + (a.mount ? w.laws.ecology.rideCarry || 0 : 0) + g; }
SW.carryCap = cap;
function sicken(w, a, from, emit) {
  if (a.dead || a.sick > 0 || (a.immune || 0) > w.tick) return false;
  a.sick = Math.round(w.laws.disease.length * (0.7 + 0.6 * rnd(w))); feel(a, 'fear', 0.2);
  SW.press(w, a, 'sickness', 1);
  emit({ type: 'sick', a: a.id, from: from });
  return true;
}
SW.sicken = sicken;
function warBetween(w, p, q) {
  const list = w.wars || [];
  for (let k = 0; k < list.length; k++) { const r = list[k]; if (r.ended == null && ((r.a === p && r.b === q) || (r.a === q && r.b === p))) return r; }
  return null;
}
SW.warBetween = warBetween;
function hurtAgent(w, a, dmg, cause, emit) {
  a.hp -= dmg; if (/^killed by a /.test(cause)) a.biteT = w.tick;
  if (/^(killed|gored) by a /.test(cause)) SW.press(w, a, 'beasts', 0.5);
  if (a.hp <= 0 && !a.dead) killAgent(w, a, cause, emit);
}
function killAgent(w, a, cause, emit) {
  if (!a.dead) { const TL = w.tally; TL.deaths = TL.deaths || {}; TL.deaths[cause] = (TL.deaths[cause] || 0) + 1; TL.died = (TL.died || 0) + 1; }
  a.dead = true; a.cause = cause;
  (w.wars || []).forEach(function (r) { if (r.ended == null && (r.a === a.id || r.b === a.id)) { r.ended = w.tick; r.how = 'the death of ' + a.name; emit({ type: 'warend', war: r }); } });
  if (a.carry.length) { const di = idx(w, a.x, a.y); if (!w.shelters[di] && !w.walls[di]) { if (!w.stores[di]) w.stores[di] = { by: 0, items: [] }; while (a.carry.length && w.stores[di].items.length < w.laws.craft.storeMax) w.stores[di].items.push(a.carry.pop()); } }
  w.graves.push({ id: a.id, name: a.name, x: a.x, y: a.y, tick: w.tick, cause: cause, hue: a.hue });
  if (w.graves.length > 30) w.graves.shift();
  const seenBy = [];
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k];
    if (o === a || o.dead) continue;
    if (cheb(a.x, a.y, o.x, o.y) <= SW.sight(w)) {
      seenBy.push(o.id);
      const r = o.rel[a.id] || 0;
      feel(o, 'grief', 0.2 + 0.6 * Math.max(0, r)); if (r < -0.3) feel(o, 'joy', 0.35);
    }
  }
  { let alone = true, band = []; for (let k = 0; k < w.agents.length; k++) { const o = w.agents[k]; if (o === a || o.dead) continue; if (cheb(a.x, a.y, o.x, o.y) <= 8) alone = false; if (rootOf(w, o) === rootOf(w, a) || (a.parents || []).indexOf(o.id) >= 0 || (o.parents || []).indexOf(a.id) >= 0 || o.people === a.people && cheb(a.x, a.y, o.x, o.y) <= 30) band.push(o.id); }
    { const kd = cause === 'starved' ? 'famine' : /by a /.test(cause) ? 'beasts' : /cold|froze/.test(cause) ? 'cold' : /sick|plague/.test(cause) ? 'sickness' : /thirst/.test(cause) ? 'thirst' : null, told = {}; seenBy.concat(band).forEach(function (id) { if (told[id]) return; told[id] = 1; const o = agentById(w, id); if (!o) return; SW.press(w, o, 'loss', 1); if (kd) SW.press(w, o, kd, 1); }); }
    emit({ type: 'death', a: a.id, cause: cause, x: a.x, y: a.y, seenBy: seenBy, band: band, ctx: { alone: alone, child: SW.stage(w, a) === 'child', mated: a.mateT != null && w.tick - a.mateT < w.laws.time.dayLength * 2, season: SW.SEASONS[SW.season(w)], roof: !!a.sheltered, hunted: a.spook > 0 || !!(a.seenAt && a.biteT && w.tick - a.biteT < 240), thirst: Math.round(a.thirst || 0), sick: a.sick > 0, built: a.stats.built, land: (SW.regionAt(w, a.x, a.y) || {}).name || '' } }); }
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k];
    if (o !== a && !o.dead && o.leader === a.id) { o.leader = null; a.customs.forEach(function (c) { if (o.customs.indexOf(c) < 0 && o.customs.length < 6) o.customs.push(c); }); feel(o, 'grief', 0.3); feel(o, 'fear', 0.2); emit({ type: 'leaderless', a: o.id, b: a.id }); }
  }
}
function wanderHome(w, c, s) {
  const ox = c.x, oy = c.y;
  if (s.roams && rnd(w) < s.roams) { /* herds drift south for autumn and winter, north for spring and summer */
    if (!stepDir(w, c, ri(w, 3) - 1, SW.season(w) >= 2 ? 1 : -1)) return false;
  } else if (!roamStep(w, c)) return false;
  if (s.home && s.home.indexOf(SW.TERRAIN[w.terrain[idx(w, c.x, c.y)]]) < 0 && rnd(w) < 0.85) { c.x = ox; c.y = oy; return false; }
  return true;
}
function stepCreatures(w, emit) {
  const L = w.laws, counts = {}, AS = Math.max(1, (w.openTiles || w.W * w.H) / 6144);
  const cls = { 0: 0, 1: 0 };
  for (let k = 0; k < w.creatures.length; k++) { const c = w.creatures[k]; counts[c.sp] = (counts[c.sp] || 0) + 1; if (L.creatures[c.sp]) cls[L.creatures[c.sp].predator ? 1 : 0]++; }
  const list = w.creatures, born = [], predL = [], grazL = [];
  const ssn = SW.season(w), sprB = ssn === 0 ? (L.ecology.springBreeding || 1) : ssn === 3 ? 0.6 : 1, gTarget = (L.ecology.grazerTarget || 90) * AS, grF = clamp(gTarget / Math.max(20, cls[0]), 0.7, 1.8), prF = clamp(cls[0] / Math.max(1, cls[1]) / 8, 0.4, 1.6); /* few grazers breed faster; hunters breed by how much prey there is for each */
  for (let k = 0; k < list.length; k++) { const c0 = list[k], cs0 = L.creatures[c0.sp]; if (cs0 && !c0.dead) (cs0.predator ? predL : grazL).push(c0); }
  const nearIn = function (arr, x, y, range, maxTough) { let best = null, bd = range + 1; for (let q = 0; q < arr.length; q++) { const o = arr[q]; if (o.dead) continue; const d = cheb(x, y, o.x, o.y); if (d >= bd) continue; if (maxTough && ((L.creatures[o.sp] || {}).tough || 1) > maxTough) continue; bd = d; best = o; } return best; };
  for (let k = 0; k < list.length; k++) {
    const c = list[k]; if (c.dead) continue;
    const s = L.creatures[c.sp]; if (!s) { c.dead = true; continue; }
    beginTurn(c); c.age++;
    c.e -= s.drain * c.size * (0.6 + 0.4 * c.quick);
    if (c.e <= 0 || c.age > c.life) { c.dead = true; continue; }
    const moves = rnd(w) < s.speed * c.quick;
    if (!s.predator) {
      const threat = nearIn(predL, c.x, c.y, s.fleeRange) || nearestAgentTo(w, c.x, c.y, s.wary);
      if (threat) { c.rush = 1; if (moves) stepAway(w, c, threat.x, threat.y); }
      else if (c.e < s.maxEnergy * 0.75) {
        const i = idx(w, c.x, c.y), p = w.plants[i];
        if (p && p.g >= 1 && L.plants[p.sp].nutrition > 0 && p.food >= 1 + s.grazeSpare) {
          p.food -= 1; c.e = Math.min(s.maxEnergy, c.e + s.grazeGain);
          if (w.fert[i] > 0.2) { const gw = L.ecology.grazeWear || 0; w.fert[i] = Math.round((w.fert[i] - gw) * 1000) / 1000; w.worn = w.worn || {}; w.worn[i] = (w.worn[i] || 0) + gw; }
          /* some animals carry seed far from where they fed */
          if (s.spreads && rnd(w) < s.spreads) { const tx = c.x + ri(w, 17) - 8, ty = c.y + ri(w, 17) - 8; if (inb(w, tx, ty)) { const j = idx(w, tx, ty); if (!w.plants[j] && !w.shelters[j] && !w.walls[j] && w.fert[j] > 0.1 && rnd(w) < soilOf(w, p.sp, j)) w.plants[j] = newPlant(w, p.sp, 0.02, j); } }
        }
        else if (moves) { const g = nearestGraze(w, c, s, 5); if (!g || !stepToward(w, c, g.x, g.y)) wanderHome(w, c, s); }
      } else if (moves && rnd(w) < 0.12) wanderHome(w, c, s);
    } else {
      const prey = nearIn(grazL, c.x, c.y, s.range, s.tough || 1);
      const lone = SW.isNight(w) && c.e < s.maxEnergy * 0.75 ? exposedAgent(w, c.x, c.y, s.range) : null;
      if (lone) {
        c.rush = 1; const dd = cheb(c.x, c.y, lone.x, lone.y);
        if (dd <= 1 || (dd === 2 && rnd(w) < 0.4)) { c.e += 10; feel(lone, 'fear', 0.6); emit({ type: 'bitten', a: lone.id, by: c.sp, stalked: true }); hurtAgent(w, lone, s.bite || L.fight.predatorBite, 'killed by a ' + c.sp, emit); }
        else if (moves && !stepToward(w, c, lone.x, lone.y)) wanderHome(w, c, s);
      } else if (prey && c.e < s.maxEnergy * 0.85) {
        c.rush = 1;
        if (cheb(c.x, c.y, prey.x, prey.y) <= 1) {
          const ps = L.creatures[prey.sp];
          if (rnd(w) < s.killChance * c.quick / prey.quick / ((ps && ps.tough) || 1)) { prey.dead = true; c.e = Math.min(s.maxEnergy, c.e + s.gain * prey.size); emit({ type: 'preykill', x: prey.x, y: prey.y, by: c.sp, prey: prey.sp }); }
        } else if (moves && !stepToward(w, c, prey.x, prey.y)) wanderHome(w, c, s);
      } else if (c.e < s.agentHunger) {
        const a = nearestAgentTo(w, c.x, c.y, 4);
        if (a && !a.sheltered && !fireNear(w, a.x, a.y, 3)) {
          if (cheb(c.x, c.y, a.x, a.y) <= 1) { c.e += 10; feel(a, 'fear', 0.5); emit({ type: 'bitten', a: a.id, by: c.sp }); hurtAgent(w, a, s.bite || L.fight.predatorBite, 'killed by a ' + c.sp, emit); }
          else if (moves) stepToward(w, c, a.x, a.y);
        } else if (moves) wanderHome(w, c, s);
      } else if (moves && rnd(w) < 0.25) wanderHome(w, c, s);
    }
    /* a tamed animal keeps near its keeper; walls hold it where it is penned */
    if (c.owner != null) { let kp = null; for (let k = 0; k < w.agents.length; k++) if (w.agents[k].id === c.keeper) kp = w.agents[k]; if (!kp || kp.dead) { c.owner = null; c.keeper = null; } else if (kp.mount === c.id) { c.px = c.x; c.py = c.y; c.x = kp.x; c.y = kp.y; } else if (cheb(c.x, c.y, kp.x, kp.y) > (L.ecology.leash || 4) && rnd(w) < 0.8) stepToward(w, c, kp.x, kp.y); }
    let mate = null;
    if (c.e > s.breedAt && c.age > s.matureAge && cls[s.predator ? 1 : 0] < (s.predator ? L.ecology.hunterCap : L.ecology.grazerCap) && rnd(w) < 1.7 * s.breedChance * sprB * (s.predator ? prF : grF) * Math.max(0, 1 - (counts[c.sp] || 0) / ((s.room || 40) * AS))) for (let k = 0; k < list.length && !mate; k++) { const o = list[k]; if (o !== c && !o.dead && o.sp === c.sp && o.age > s.matureAge && cheb(o.x, o.y, c.x, c.y) <= (L.ecology.pairRange || 4)) mate = o; }
    if (mate) {
      c.e -= s.breedCost;
      const m = function (v) { return clamp(v * (0.92 + 0.16 * rnd(w)), 0.6, 1.6); };
      let kind = c.sp;
      if (rnd(w) < L.ecology.wildMutation * 6) { const v = creatureVariety(w, c.sp); if (v) { kind = v; w.fresh.push({ kind: v, from: c.sp, x: c.x, y: c.y, flora: false }); } }
      const kid = newCreature(w, kind, c.x, c.y, { e: s.breedCost * 0.9, age: 0, size: m((c.size + mate.size) / 2), quick: m((c.quick + mate.quick) / 2) }); if (c.owner != null && c.owner === mate.owner) { kid.owner = c.owner; kid.keeper = c.keeper; }
      wanderStep(w, kid); kid.px = c.x; kid.py = c.y; born.push(kid); cls[s.predator ? 1 : 0]++; counts[kind] = (counts[kind] || 0) + 1;
    }
  }
  w.creatures = list.filter(function (c) { return !c.dead; }).concat(born);
  /* when grazers are few, a herd comes in from the rim; when hunters are few for the prey there is, a pair follows */
  if (cls[0] < 0.6 * gTarget && rnd(w) < (L.ecology.herdReturn || 0)) { const ks = Object.keys(L.creatures).filter(function (k) { return !L.creatures[k].predator && !L.creatures[k].retired && L.creatures[k].minPop; }); for (let t = 0; t < 20 && ks.length; t++) { const es = edgeSpot(w), k = ks[ri(w, ks.length)], sp0 = L.creatures[k]; if (!passable(w, es.x, es.y) || !fitsLand(w, sp0, es.x, es.y)) continue; let n = 0; for (let q = 0; q < 12 && n < 6; q++) { const X = es.x + ri(w, 7) - 3, Y = es.y + ri(w, 7) - 3; if (passable(w, X, Y) && fitsLand(w, sp0, X, Y)) { w.creatures.push(newCreature(w, k, X, Y, { age: sp0.matureAge })); n++; } } if (n) emit({ type: 'herdcame', kind: k, n: n, x: es.x, y: es.y }); break; } }
  if (cls[0] > 60 * AS && cls[1] < cls[0] / 14 && cls[1] < L.ecology.hunterCap && rnd(w) < (L.ecology.herdReturn || 0) * 0.4) { const ks = Object.keys(L.creatures).filter(function (k) { return L.creatures[k].predator && !L.creatures[k].retired && L.creatures[k].minPop; }); for (let t = 0; t < 20 && ks.length; t++) { const es = edgeSpot(w), k = ks[ri(w, ks.length)]; if (passable(w, es.x, es.y) && fitsLand(w, L.creatures[k], es.x, es.y)) { w.creatures.push(newCreature(w, k, es.x, es.y, { age: L.creatures[k].matureAge })); w.creatures.push(newCreature(w, k, es.x, es.y, { age: L.creatures[k].matureAge })); break; } } }
  for (const sp in L.creatures) {
    const s = L.creatures[sp], n = counts[sp] || 0;
    const want = s.predator ? cls[0] > 10 : true;
    if (s.minPop && n < s.minPop * AS && want && rnd(w) < s.migrate * AS) {
      for (let t = 0; t < 12; t++) {
        const es = edgeSpot(w), x = es.x, y = es.y;
        if (passable(w, x, y) && fitsLand(w, s, x, y)) { w.creatures.push(newCreature(w, sp, x, y, { age: s.matureAge })); break; }
      }
    }
  }
}

/* ---------- agents: senses ---------- */
function bitesFor(a, p) {
  if (!p || p.g < 1) return 0;
  if (a.habits.avoid.indexOf(p.sp) >= 0) return 0;
  return Math.max(0, Math.floor(p.food + 1e-9) - (a.habits.spare || 0));
}
SW.findAgentByName = function (w, name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  for (let k = 0; k < w.agents.length; k++) if (!w.agents[k].dead && w.agents[k].name.toLowerCase() === n) return w.agents[k];
  return null;
};
function senses(w, a) {
  const L = w.laws, R = SW.sight(w), near = {}, vars = {};
  let fd = 99, td = 99, sd = 99, fired = 99, stod = 99, wd = 99, rud = 99;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = a.x + dx, y = a.y + dy; if (!inb(w, x, y)) continue;
    const i = idx(w, x, y), d = Math.max(Math.abs(dx), Math.abs(dy));
    const p = w.plants[i];
    if (p && d < fd && bitesFor(a, p) > 0) { fd = d; near.food = { x: x, y: y, d: d }; }
    if (d < td && w.terrain[i] === T.FOREST && w.trees[i] > 0) { td = d; near.tree = { x: x, y: y, d: d }; }
    if (d < sd && w.shelters[i]) { sd = d; near.shelter = { x: x, y: y, d: d }; }
    if (w.shelters[i] > 0 && d < rud && !isAlive(w, w.shelters[i])) { rud = d; near.ruin = { x: x, y: y, d: d, kind: (w.bkind && w.bkind[i]) || 'shelter' }; }
    if (d < fired && w.fires[i] > w.tick) { fired = d; near.fire = { x: x, y: y, d: d }; }
    if (d < stod && w.stores[i]) { stod = d; near.store = { x: x, y: y, d: d }; }
    if (d < wd && (w.terrain[i] === T.WATER || w.terrain[i] === T.SHALLOWS)) { wd = d; near.water = { x: x, y: y, d: d, name: 'water' }; }
  }
  let pd = 99, qd = 99;
  for (let k = 0; k < w.creatures.length; k++) {
    const c = w.creatures[k]; if (c.dead) continue;
    const d = cheb(a.x, a.y, c.x, c.y); if (d > R) continue;
    if (L.creatures[c.sp].predator) { if (d < qd) { qd = d; near.predator = c; } }
    else if (d < pd) { pd = d; near.prey = c; }
  }
  let ad = 99, frd = 99, fod = 99, crowd = 0, ld = 99, fol = 0, ed = 99, ald = 99, bandNear = 0;
  for (let k = 0; k < w.agents.length; k++) if (!w.agents[k].dead && w.agents[k].leader === a.id) fol++;
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k]; if (o === a || o.dead) continue;
    const d = cheb(a.x, a.y, o.x, o.y); if (d > R) continue;
    crowd++; a.seenAt[o.id] = [o.x, o.y, w.tick];
    if (d < ad) { ad = d; near.agent = o; }
    const r = a.rel[o.id] || 0;
    if (r > 0.3 && d < frd) { frd = d; near.friend = o; }
    if (r < -0.3 && d < fod) { fod = d; near.foe = o; }
    if (a.leader === o.id) { ld = d; near.leader = o; }
    const st = stanceToward(w, a, o);
    if (st === 'own') bandNear++;
    else if (st === 'enemy' && d < ed) { ed = d; near.enemy = o; }
    else if (st === 'ally' && d < ald) { ald = d; near.ally = o; }
  }
  const here = w.plants[idx(w, a.x, a.y)];
  vars.energy = a.e; vars.health = a.hp; vars.age = a.age / a.life;
  vars.food_carried = a.carry.length; vars.seeds = a.seeds.length; vars.wood = a.wood; vars.stone = a.stone; vars.tools = a.tools.length;
  vars.on_rock = w.terrain[idx(w, a.x, a.y)] === T.ROCK ? 1 : 0; vars.on_forest = w.terrain[idx(w, a.x, a.y)] === T.FOREST ? 1 : 0;
  vars.sick = a.sick > 0 ? 1 : 0; vars.thirst = a.thirst || 0; vars.suffering = a.suffer || 0; vars.happiness = a.happy == null ? 0.4 : a.happy; vars.satisfaction = a.sat == null ? 0.5 : a.sat; vars.water_dist = wd; vars.ore = a.ore || 0; vars.clay = a.clay || 0;
  vars.night = SW.isNight(w) ? 1 : 0; vars.winter = SW.season(w) === 3 ? 1 : 0;
  vars.sheltered = w.shelters[idx(w, a.x, a.y)] ? 1 : 0;
  vars.plant_here = bitesFor(a, here);
  vars.food_dist = fd; vars.prey_dist = pd; vars.predator_dist = qd; vars.agent_dist = ad;
  vars.friend_dist = frd; vars.foe_dist = fod; vars.tree_dist = td; vars.shelter_dist = sd;
  vars.crowd = crowd; vars.random = rnd(w);
  vars.leader_dist = ld; vars.followers = fol; vars.lore = a.lore; if (fol > a.stats.led) a.stats.led = fol;
  vars.enemy_dist = ed; vars.ally_dist = ald; vars.band_near = bandNear; vars.fire_dist = fired; vars.store_dist = stod;
  const hm = w.settlements.length ? homeOf(w, a) : null;
  if (hm) { const hd = cheb(a.x, a.y, hm.x, hm.y); vars.home_dist = hd; vars.in_home = hd <= hm.r ? 1 : 0; near.home = { x: hm.x, y: hm.y, d: hd }; } else { vars.home_dist = 99; vars.in_home = 0; }
  let inField = 0; for (let k = 0; k < w.fields.length; k++) if (cheb(a.x, a.y, w.fields[k].x, w.fields[k].y) <= w.fields[k].r) inField = 1;
  vars.in_working = inField;
  vars.anger = a.mood.anger; vars.fear = a.mood.fear; vars.grief = a.mood.grief; vars.joy = a.mood.joy; vars.lonely = a.mood.lonely;
  const sky = w.weather.kind;
  vars.wet = sky === 'rain' || sky === 'storm' ? 1 : 0; vars.storm = sky === 'storm' ? 1 : 0; vars.fog = sky === 'fog' ? 1 : 0; vars.drought = sky === 'drought' ? 1 : 0;
  return { vars: vars, near: near };
}
SW.senses = senses;
SW.VARS = ['energy', 'health', 'age', 'food_carried', 'seeds', 'wood', 'stone', 'tools', 'on_rock', 'on_forest', 'night', 'winter', 'sheltered', 'plant_here',
  'food_dist', 'prey_dist', 'predator_dist', 'agent_dist', 'friend_dist', 'foe_dist', 'leader_dist', 'tree_dist', 'shelter_dist', 'crowd', 'followers', 'random',
  'anger', 'fear', 'grief', 'joy', 'lonely', 'wet', 'storm', 'fog', 'drought', 'lore', 'in_working', 'enemy_dist', 'ally_dist', 'band_near', 'fire_dist', 'store_dist', 'home_dist', 'in_home', 'sick', 'water_dist', 'ore', 'clay', 'thirst', 'suffering', 'happiness', 'satisfaction'];
SW.OPS = ['<', '<=', '>', '>=', '==', '!='];
SW.ACTIONS = ['eat', 'harvest', 'plant', 'gather', 'build', 'raze', 'rest', 'wander', 'hunt', 'seek', 'flee', 'attack', 'steal', 'goto', 'explore', 'follow', 'give', 'trade', 'mate', 'mark', 'cultivate', 'heal', 'stash', 'take', 'linger', 'craft', 'place', 'fish', 'drop', 'make', 'tame', 'rally', 'milk', 'shear', 'ride', 'pave', 'bridge', 'dismantle'];
SW.AIMS = ['richer', 'faster', 'fuller', 'spreading', 'hardy'];

function test(vars, c) {
  const v = vars[c[0]], n = c[2];
  switch (c[1]) {
    case '<': return v < n; case '<=': return v <= n; case '>': return v > n;
    case '>=': return v >= n; case '==': return v === n; case '!=': return v !== n;
  }
  return false;
}
function matches(vars, rule) {
  const cs = rule.if || [];
  for (let k = 0; k < cs.length; k++) if (!test(vars, cs[k])) return false;
  return true;
}

const RIDES = { seek: 1, goto: 1, explore: 1, follow: 1, flee: 1, wander: 1 };
/* ---------- agents: actions. Each returns true if it did something. ---------- */
function move(w, a, ok) {
  if (ok) {
    const L = w.laws.land, t = w.terrain[idx(w, a.x, a.y)];
    const fl0 = (t === T.SHALLOWS || t === T.WATER) ? floatOf(w, a) : 0;
    const m = w.roads && w.roads[idx(w, a.x, a.y)] ? 0.5 : fl0 ? Math.min(fl0, L.shallowsMove) : t === T.ROCK ? L.rockMove : t === T.MARSH ? L.marshMove : t === T.SNOW ? L.snowMove : t === T.FOREST ? L.forestMove : (t === T.SHALLOWS || t === T.WATER) ? L.shallowsMove : 1;
    a.e -= w.laws.body.moveCost * m * (SW.stage(w, a) === 'elder' ? w.laws.age.elderMove : 1) * (a.mount ? w.laws.ecology.rideCost : 1) / boon(a, 'vigor');
  }
  return ok;
}
function fireNear(w, x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (inb(w, x + dx, y + dy) && w.fires[idx(w, x + dx, y + dy)] > w.tick) return true; }
  return false;
}
SW.fireNear = fireNear;
function targetOf(w, a, S, kind, name) {
  if (name) {
    const o = SW.findAgentByName(w, name);
    if (!o || o === a) return null;
    if (cheb(a.x, a.y, o.x, o.y) <= SW.sight(w)) return o;
    /* out of sight: walk to where they were last seen, and give up on arriving if they are gone */
    const m = a.seenAt[o.id];
    if (!m || w.tick - m[2] > 2400) return null;
    if (cheb(a.x, a.y, m[0], m[1]) <= 1) { delete a.seenAt[o.id]; return null; }
    return { ghost: true, id: o.id, name: o.name, x: m[0], y: m[1], carry: [0], seeds: [], wood: 0, offer: null, court: null, dead: false };
  }
  return S.near[kind] || null;
}
function strike(w, a, o, emit) {
  const L = w.laws, dmg = Math.round(L.fight.agentDamage * (0.6 + 0.8 * rnd(w)) * (1 + L.fight.angerBonus * a.mood.anger) * (w.fields.length ? fieldFactor(w, 'harm', o.x, o.y) : 1) * useTool(w, a, 'fight', emit) / useTool(w, o, 'guard', emit) / boon(o, 'toughness') * strengthOf(w, a) * (1 + Math.min(0.2, (a.stats.blows || 0) * 0.01)) * boon(a, 'strength') / boon(o, 'toughness')); a.stats.blows = (a.stats.blows || 0) + 1; /* each fight hardens the arm a little */
  o.rel[a.id] = clamp((o.rel[a.id] || 0) - 0.5, -1, 1);
  feel(o, 'anger', 0.5); feel(o, 'fear', 0.35); feel(a, 'anger', -0.15); SW.press(w, o, 'strife', 1); SW.press(w, a, 'strife', 0.5); /* those who fight, and those who are fought, come sooner to weapons and defences */
  if (rootOf(w, a) !== rootOf(w, o)) emit({ type: 'bandhit', a: a.id, b: o.id });
  const war = warBetween(w, rootOf(w, a).id, rootOf(w, o).id); if (war) war.blows++;
  for (let k = 0; k < w.agents.length; k++) { const q = w.agents[k]; if (q !== a && q !== o && !q.dead && cheb(q.x, q.y, o.x, o.y) <= SW.sight(w)) feel(q, 'fear', 0.15); }
  emit({ type: 'attack', a: a.id, b: o.id, dmg: dmg });
  hurtAgent(w, o, dmg, 'killed by ' + a.name, emit);
  if (o.dead) {
    a.stats.kills++; if (war) war.dead++;
    for (let k = 0; k < L.fight.fleshFood && a.carry.length < cap(w, a); k++) a.carry.push({ k: 'flesh', n: L.fight.fleshEnergy });
    while (o.carry.length && a.carry.length < cap(w, a)) a.carry.push(o.carry.pop());
  }
}
SW.TOOL_USES = ['hunt', 'fight', 'guard', 'gather', 'harvest', 'plant', 'build', 'fish'];
/* The best tool a being carries for a job. Using it wears it; worn out, it breaks. Returns its power, or 1 with bare hands. */
function useTool(w, a, use, emit) {
  let bi = -1, bp = 1;
  for (let k = 0; k < a.tools.length; k++) { const d = w.laws.tools[a.tools[k].k]; if (d && d.use === use) { const p = d.power * (a.tools[k].m ? w.laws.craft.metalPower * (a.tools[k].m === 3 ? 1.7 : a.tools[k].m === 2 ? 1.3 : 1) : 1); if (p > bp) { bp = p; bi = k; } } }
  if (bi < 0) return 1;
  w.tally.toolUse = w.tally.toolUse || {}; w.tally.toolUse[use] = (w.tally.toolUse[use] || 0) + 1;
  const t = a.tools[bi]; t.wear--;
  if (t.wear <= 0) { a.tools.splice(bi, 1); (emit || noop)({ type: 'toolbroke', a: a.id, kind: t.k }); }
  return bp;
}
/* ---------- effects: one language for what foods, mixes, places and made things do to a being ----------
   An effect is {on, by} for something that happens at once, or {on, times, for} for a boon or a burden that lasts.
   Nothing here knows what a herb, a spirit or a ceremony is: those are just lists of effects attached to things. */
const FX_NOW = { thirst: [-100, 100], energy: [-60, 60], health: [-40, 40], lore: [-1, 1], anger: [-1, 1], fear: [-1, 1], grief: [-1, 1], joy: [-1, 1], lonely: [-1, 1] };
const FX_BOON = { strength: 'your blows', toughness: 'how blows land on you', vigor: 'the cost of walking', appetite: 'how fast you burn energy', warmth: 'how cold bites you', luck: 'hunting and fishing', learning: 'what you take from a teacher', thirst: 'how fast you thirst' };
SW.FX_NOW = Object.keys(FX_NOW).concat(['sick']); SW.FX_BOON = Object.keys(FX_BOON);
SW.sanitizeFx = function (list) {
  const out = [];
  (Array.isArray(list) ? list : []).slice(0, 5).forEach(function (f) {
    if (!f || typeof f !== 'object') return; const on = String(f.on);
    if (FX_NOW[on]) { const v = clamp(Number(f.by) || 0, FX_NOW[on][0], FX_NOW[on][1]); if (v) out.push({ on: on, by: Math.round(v * 100) / 100 }); }
    else if (on === 'sick') out.push({ on: 'sick', by: Number(f.by) > 0 ? 1 : -1 });
    else if (FX_BOON[on]) { const x = clamp(Number(f.times) || 1, 0.4, 2.5); if (Math.abs(x - 1) > 0.02) out.push({ on: on, times: Math.round(x * 100) / 100, for: clamp(Math.round(Number(f.for) || 240), 20, 720) }); }
  });
  return out;
};
function boon(a, k) { const b = a.boons; let m = a.genes && a.genes[k] ? a.genes[k] : 1; if (a.worn && a.worn[k]) m *= a.worn[k]; if (!b || !b.length) return m; for (let i = 0; i < b.length; i++) if (b[i].k === k) m *= b[i].v; return m; }
SW.boon = boon;
function applyFx(w, a, fx, emit, from) {
  const said = [];
  (fx || []).forEach(function (f) {
    if (a.dead) return;
    if (f.times) { a.boons = (a.boons || []).filter(function (q) { return q.k !== f.on || q.src !== from; }); a.boons.push({ k: f.on, v: f.times, until: w.tick + f.for, src: from }); said.push(FX_BOON[f.on] + (f.times > 1 ? ' grew ' : ' shrank ') + '(' + f.on + ' x' + f.times + ' for ' + f.for + ' moments)'); }
    else if (f.on === 'sick') { if (f.by > 0) sicken(w, a, from, emit); else if (a.sick > 0) { a.sick = 1; said.push('your sickness lifted'); } }
    else if (f.on === 'thirst') { a.thirst = clamp((a.thirst || 0) + f.by, 0, 100); said.push(f.by < 0 ? 'your thirst eased' : 'your mouth dried'); }
    else if (f.on === 'energy') { a.e = clamp(a.e + f.by, 1, 100); said.push('energy ' + (f.by > 0 ? '+' : '') + f.by); }
    else if (f.on === 'health') { if (f.by < 0) hurtAgent(w, a, -f.by, 'killed by ' + from, emit); else a.hp = Math.min(100, a.hp + f.by); said.push('health ' + (f.by > 0 ? '+' : '') + f.by); }
    else if (f.on === 'lore') { a.loreWhy = 'something eaten, made or met'; a.lore = Math.max(0, Math.round((a.lore + f.by) * 10) / 10); said.push(f.by > 0 ? 'your mind opened' : 'your mind clouded'); }
    else { a.mood[f.on] = clamp(a.mood[f.on] + f.by, 0, 1); said.push((f.on === 'lonely' ? 'loneliness' : f.on) + (f.by > 0 ? ' rose in you' : ' eased')); }
  });
  if (said.length) emit({ type: 'fx', a: a.id, from: from, text: said.join('; ') });
}
SW.applyFx = applyFx;
/* what a food does beyond feeding, and what two foods do together when eaten close in time */
function afterEat(w, a, kind, emit) {
  const s = w.laws.plants[kind];
  if (s && s.fx && s.fx.length) applyFx(w, a, s.fx, emit, 'eating ' + kind);
  const ate = a.ate = a.ate || {}, mixes = w.laws.mixes || [];
  for (let i = 0; i < mixes.length; i++) {
    const m = mixes[i], other = m.of[0] === kind ? m.of[1] : m.of[1] === kind ? m.of[0] : null;
    if (other && other !== kind && ate[other] != null && w.tick - ate[other] <= (m.within || 60)) { applyFx(w, a, m.fx, emit, 'eating ' + other + ' and ' + kind + ' close together'); a.stats.mixed = (a.stats.mixed || 0) + 1; }
  }
  ate[kind] = w.tick;
}
const WF = new WeakMap();
function waterField(w) {
  let f = WF.get(w.terrain); if (f) return f;
  f = new Int16Array(w.W * w.H).fill(9999); let q = [];
  for (let i = 0; i < f.length; i++) if (w.terrain[i] === T.WATER || w.terrain[i] === T.SHALLOWS) { f[i] = 0; q.push(i); }
  while (q.length) { const nq = []; for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w.W, y = (i - x) / w.W; for (let d = 0; d < 8; d++) { const nx = x + HEAD[d][0], ny = y + HEAD[d][1]; if (!inb(w, nx, ny)) continue; const j = idx(w, nx, ny); if (f[j] > f[i] + 1) { f[j] = f[i] + 1; nq.push(j); } } } q = nq; }
  WF.set(w.terrain, f); return f;
}
SW.waterField = waterField;
function waterStep(w, a) {
  const f = waterField(w); let best = -1, bv = f[idx(w, a.x, a.y)];
  for (let d = 0; d < 8; d++) { const nx = a.x + HEAD[d][0], ny = a.y + HEAD[d][1]; if (!passable(w, nx, ny, a)) continue; const v = f[idx(w, nx, ny)] + rnd(w) * 0.3; if (v < bv) { bv = v; best = d; } }
  if (best < 0) return false;
  return move(w, a, stepDir(w, a, HEAD[best][0], HEAD[best][1]));
}
function isAlive(w, id) { if (w.aliveT !== w.tick || !w.aliveM) { w.aliveM = {}; for (let k = 0; k < w.agents.length; k++) if (!w.agents[k].dead) w.aliveM[w.agents[k].id] = 1; w.aliveT = w.tick; } return !!w.aliveM[id]; }
SW.isAlive = isAlive;
function agentById(w, id) { for (let k = 0; k < w.agents.length; k++) if (w.agents[k].id === id) return w.agents[k]; return null; }
/* what a spot offers to one who would live there */
SW.siteQuality = function (w, x, y) {
  const P = w.laws.plants, riches = {}; let food = 0, wood = 0, rock = 0, caves = 0;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { if (!inb(w, x + dx, y + dy)) continue; const i = idx(w, x + dx, y + dy), p = w.plants[i], t = w.terrain[i]; if (p && P[p.sp] && P[p.sp].nutrition > 0) food++; if (t === T.FOREST && w.trees[i] > 0) wood++; else if (t === T.ROCK) rock++; if (w.lodes && w.lodes[i]) riches[w.lodes[i].k] = 1; if (w.ore[i]) riches.ore = 1; if (w.bkind && w.bkind[i] === 'cave') caves++; }
  return { water: waterField(w)[idx(w, x, y)], food: food, wood: wood, stone: rock, riches: Object.keys(riches), caves: caves };
};
/* a world saved by an older version gains what newer versions expect */
SW.upgrade = function (w) {
  if (!w.regions || !w.regions.length) { w.regions = [{ id: 0, name: 'the Land', biome: 'mixed', x: w.W >> 1, y: w.H >> 1 }]; w.region = []; for (let i = 0; i < w.W * w.H; i++) w.region.push(0); }
  ['lodes', 'bkind', 'roads', 'works'].forEach(function (k) { if (!w[k]) w[k] = {}; });
  if (!w.peoples) w.peoples = []; if (!w.tally) w.tally = { made: {}, eaten: {}, built: {} }; ['made', 'eaten', 'built'].forEach(function (k) { if (!w.tally[k]) w.tally[k] = {}; });
  const D = SW.defaultLaws(); ['minerals', 'goods', 'recipes', 'buildings', 'drives', 'status', 'discovery', 'culture', 'arrivals', 'explore'].forEach(function (g) { if (!w.laws[g]) w.laws[g] = D[g]; else for (const k in D[g]) if (w.laws[g][k] == null && g !== 'recipes') w.laws[g][k] = D[g][k]; });
  for (const g in D) if (D[g] && typeof D[g] === 'object' && !Array.isArray(D[g]) && w.laws[g] && ['plants', 'creatures', 'tools', 'tree', 'recipes', 'buildings', 'minerals', 'goods'].indexOf(g) < 0) for (const k in D[g]) if (w.laws[g][k] == null) w.laws[g][k] = D[g][k];
  w.agents.forEach(function (a) { if (!a.things) a.things = {}; if (!a.tongues) a.tongues = {}; if (a.tall == null) a.tall = 1; if (!a.press) a.press = {}; });
  w.agents.forEach(function (a, k) { if (!a.sex) a.sex = sexFor(w, a.people); if (!a.calling) a.calling = SW.CALLINGS[(a.id + k) % SW.CALLINGS.length]; }); if (!w.narrow) narrowWater(w);
  /* laws that were re-tuned after a world was made: a world still at the old value takes the new one; a value its maker changed is left alone */
  if ((w.tuned || 0) < 16) { w.tuned = 16; const L = w.laws;
    [['time', 'winterGrowth', 0.1, 0.2], ['time', 'winterWither', 0.005, 0.0025], ['time', 'winterWither', 0.004, 0.0025], ['mate', 'cooldown', 1500, 900], ['mate', 'minAgeFraction', 0.2, 0.14], ['mate', 'maxPopulation', 40, 60], ['age', 'childUntil', 0.14, 0.1], ['age', 'elderFrom', 0.78, 0.8]].forEach(function (q) { if (L[q[0]] && L[q[0]][q[1]] === q[2]) L[q[0]][q[1]] = q[3]; });
    if (L.tree && L.tree.storage && L.tree.storage.n === 4) L.tree.storage.n = 3;
    if (L.body && L.body.lifespan === 14400) { L.body.lifespan = 19200; w.agents.forEach(function (a) { if (a.life && a.life < 18000) a.life = Math.round(a.life * 19200 / 14400); }); } }
  if (!w.relics) w.relics = []; if (!w.faiths) w.faiths = {}; if (!w.culture) w.culture = { seq: 1, items: {}, log: [], days: [], rites: {} };
  return w;
};
/* the best vessel a being holds: the cost of a step on deep water with it, or 0 if it has none */
function floatOf(w, a) { let f = 0; const G = w.laws.goods; if (a.things && G) for (const k in G) if (G[k].float && a.things[k] > 0 && (!f || G[k].float < f)) f = G[k].float; return f; }
SW.floatOf = floatOf;
/* standing: how others weigh a being. Earned by what one holds, has done, knows, has built, by children, followers, giving and renown; lost through shame. */
SW.status = function (w, a) {
  if (a.stat && w.tick - a.stat.t < 60) return a.stat.v;
  const S = w.laws.status || {}, st = a.stats, G = w.laws.goods || {}, th = a.things || {}; let wealth = a.carry.length * 0.04 + a.tools.length * 0.12 + (a.pots || 0) * 0.1 + (a.wood + a.stone) * 0.01, prized = 0;
  for (const k in th) if (th[k] > 0) { wealth += Math.min(6, th[k]) * 0.06; if (G[k] && G[k].status) prized += G[k].status; }
  for (let k = 0; k < w.creatures.length; k++) if (w.creatures[k].keeper === a.id) wealth += 0.2;
  let ways = 0, first = 0; for (const k in a.knows) { ways++; if (a.knows[k].by === a.id) first++; }
  let fol = 0; for (let k = 0; k < w.agents.length; k++) if (w.agents[k].leader === a.id) fol++;
  const v = (S.wealth || 0) * Math.min(2.5, wealth + prized) + (S.deeds || 0) * Math.min(2.5, (st.kills || 0) * 0.06 + (st.invented || 0) * 0.15 + first * 0.35 + (st.raised || 0) * 0.03 + (st.tamed || 0) * 0.15 + (st.won || 0) * 0.5 + (st.found || 0) * 0.5)
    + (S.knowledge || 0) * (a.lore * 0.25 + ways * 0.12) + (S.children || 0) * Math.min(1.5, (st.kids || 0) * 0.3) + (S.works || 0) * Math.min(2, (st.built || 0) * 0.08)
    + (S.followers || 0) * fol * 0.6 + (S.giving || 0) * Math.min(1.2, ((st.gifts || 0) + (st.taught || 0)) * 0.04) + (S.renown || 0) * Math.min(2.5, (a.sung || 0) * 0.25 + (SW.roleOf(w, a) ? 0.4 : 0))
    + ((w.faiths || {})[a.faith] && w.faiths[a.faith].by === a.id ? ((w.laws.culture || {}).faithStanding || 0) * Math.min(8, Math.max(0, w.faiths[a.faith].n - 1)) : 0)
    - (S.shame || 0) * (a.shame || 0);
  a.stat = { t: w.tick, v: Math.round(Math.max(0, v) * 100) / 100 }; return a.stat.v;
};
/* what a being has become known as, from what it has mostly done */
SW.roleOf = function (w, a) {
  const st = a.stats, k = a.knows; if (k.science) return 'scientist'; if (k.scholarship && (st.taught || 0) >= 5) return 'scholar'; if (k.alchemy && (st.healed || 0) >= 8) return 'alchemist';
  let fol = 0; for (let q = 0; q < w.agents.length; q++) if (w.agents[q].leader === a.id) fol++;
  const c = [['chief', fol / 2], ['bard', (st.told || 0) / 3], ['teacher', (st.taught || 0) / 6], ['builder', (st.built || 0) / 8], ['hunter', (st.hunted || 0) / 10], ['grower', (st.planted || 0) / 16], ['fisher', (st.fished || 0) / 12], ['miner', (st.mined || 0) / 24], ['maker', (st.crafted || 0) / 6], ['herder', (st.tamed || 0) / 3], ['healer', (st.tended || 0) / 4]];
  let best = null, bv = 1; c.forEach(function (q) { if (q[1] >= bv) { bv = q[1]; best = q[0]; } }); if (a.lore >= w.laws.magic.loreToCast && bv < 2) return 'wizard'; return best;
};
/* the highest age of the world anyone has reached; as it rises, the old workings of the world grow harder */
SW.eraOf = function (w) { if (w.eraT != null && w.tick - w.eraT < 240) return w.eraMax || 1; let e = 1; for (let k = 0; k < w.agents.length; k++) for (const id in w.agents[k].knows) e = Math.max(e, (w.laws.tree[id] || {}).era || 1); w.eraMax = e; w.eraT = w.tick; return e; };
SW.magicFactor = function (w) { return clamp(1 - (w.laws.magic.wane || 0) * Math.max(0, SW.eraOf(w) - 2), 0.15, 1); };
function buildingAt(w, i) { const k = w.bkind && w.shelters[i] ? w.bkind[i] : null; return k && w.laws.buildings && w.laws.buildings[k] ? k : null; }
SW.buildingAt = buildingAt;
/* the strongest of some property among the special buildings within a step (or the kind, if asked by name) */
function nearB(w, a, prop, kind) { let v = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = a.x + dx, y = a.y + dy; if (!inb(w, x, y)) continue; const k = buildingAt(w, idx(w, x, y)); if (!k) continue; if (kind) { if (k === kind) v = 1; } else v = Math.max(v, w.laws.buildings[k][prop] || 0); } return v; }
SW.wellbeing = function (a) { return { suffering: a.suffer || 0, happiness: a.happy == null ? 0.4 : a.happy, satisfaction: a.sat == null ? 0.5 : a.sat }; };
function waterBeside(w, a) {
  if (w.terrain[idx(w, a.x, a.y)] === T.SHALLOWS) return true;
  if (w.bkind && nearB(w, a, 'water') > 0) return true;
  for (let d = 0; d < 8; d++) { const x = a.x + HEAD[d][0], y = a.y + HEAD[d][1]; if (inb(w, x, y)) { const t = w.terrain[idx(w, x, y)]; if (t === T.WATER || t === T.SHALLOWS) return true; } }
  return false;
}
/* places of power: whoever comes within reach is touched, then not again for a while */
function stepSites(w, emit) {
  const sites = w.sites || [];
  for (let i = 0; i < sites.length; i++) {
    const q = sites[i];
    for (let k = 0; k < w.agents.length; k++) {
      const a = w.agents[k]; if (a.dead || cheb(a.x, a.y, q.x, q.y) > q.r) continue;
      const met = a.met = a.met || {}; if ((met[q.id] || -1e9) + (q.cool || 480) > w.tick) continue;
      const first = met[q.id] == null; met[q.id] = w.tick;
      emit({ type: 'site', a: a.id, name: q.name, kind: q.kind, first: first, x: q.x, y: q.y });
      applyFx(w, a, first ? q.fx : (q.fx || []).filter(function (f) { return f.on !== 'lore'; }), emit, 'the ' + q.kind + ' "' + q.name + '"');
    }
  }
}
/* sowing a kind of plant across ground that suits it, and bringing animals of a kind in from the edge */
/* rare calamities. Each leaves the land and its people changed, and those who live through one remember it. */
function nearOwn(w, a) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = a.x + dx, yy = a.y + dy; if (inb(w, xx, yy)) { const i = idx(w, xx, yy); if (w.shelters[i] === a.id || w.walls[i] === a.id) return true; } } return false; }
SW.SKIES = ['clear', 'rain', 'storm', 'drought', 'fog', 'snow', 'heat', 'gale'];
SW.DISASTERS = ['wildfire', 'quake', 'plague', 'locusts', 'tornado', 'hurricane', 'blizzard', 'volcano'];
SW.pickDisaster = function (w) {
  const se = SW.season(w), dry = w.weather.kind === 'drought', r = rnd(w);
  if (r < 0.06) return 'volcano';
  if (se === 3) return r < 0.55 ? 'blizzard' : r < 0.8 ? 'plague' : 'quake';
  if (dry) return r < 0.7 ? 'wildfire' : 'locusts';
  if (se === 1) return r < 0.35 ? 'wildfire' : r < 0.55 ? 'tornado' : r < 0.75 ? 'locusts' : r < 0.9 ? 'hurricane' : 'quake';
  if (se === 2) return r < 0.3 ? 'hurricane' : r < 0.5 ? 'locusts' : r < 0.7 ? 'plague' : r < 0.85 ? 'tornado' : 'quake';
  return r < 0.35 ? 'tornado' : r < 0.6 ? 'plague' : r < 0.8 ? 'quake' : 'hurricane';
};
SW.disaster = function (w, kind, emit, x, y) {
  emit = emit || noop;
  if (kind === 'volcano') { if (w.volcano) { x = w.volcano.x; y = w.volcano.y; } else if (x == null || y == null) { let i = 0; for (let t = 0; t < 400; t++) { i = ri(w, w.W * w.H); if (w.terrain[i] === T.ROCK) break; } x = i % w.W; y = Math.floor(i / w.W); } w.volcano = { x: x, y: y }; }
  if (x == null || y == null) { let i = 0; for (let t = 0; t < 200; t++) { i = ri(w, w.W * w.H); const tt = w.terrain[i]; if (kind === 'wildfire' ? (tt === T.FOREST || tt === T.GRASS) : tt !== T.WATER) break; } x = i % w.W; y = Math.floor(i / w.W); }
  const r = kind === 'wildfire' ? 3 + ri(w, 3) : kind === 'quake' ? 8 : kind === 'locusts' ? 7 : kind === 'volcano' ? 5 : 0, hit = [];
  const day = w.laws.time.dayLength; let x2 = null, y2 = null;
  const each = function (fn) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (inb(w, xx, yy) && dx * dx + dy * dy <= r * r + 1) fn(idx(w, xx, yy), xx, yy); } };
  const raze = function (i) { if (w.shelters[i] > 0) { w.shelters[i] = 0; delete w.looks[i]; delete w.sturdy[i]; return 1; } if (w.walls[i]) { w.walls[i] = 0; delete w.looks[i]; delete w.sturdy[i]; return 1; } if (w.stores[i]) { w.stores[i] = null; return 1; } return 0; };
  let lost = 0, down = 0;
  if (kind === 'wildfire') each(function (i) { const tt = w.terrain[i]; if (tt === T.WATER || tt === T.SHALLOWS || tt === T.SNOW || tt === T.ROCK) return; if (w.plants[i]) { w.plants[i] = null; lost++; } if (tt === T.FOREST && rnd(w) < 0.7) w.trees[i] = 0; if (rnd(w) < 0.45) down += raze(i); if (rnd(w) < 0.3) w.fires[i] = w.tick + 30 + ri(w, 40); w.fert[i] = Math.min(1, w.fert[i] + 0.1); });
  else if (kind === 'quake') each(function (i) { if (rnd(w) < 0.4) down += raze(i); });
  else if (kind === 'locusts') each(function (i) { const pl = w.plants[i]; if (pl && pl.food > 0) { pl.food = 0; lost++; } });
  else if (kind === 'volcano') {
    each(function (i) { const tt = w.terrain[i]; if (tt === T.WATER) return; if (w.plants[i]) { w.plants[i] = null; lost++; } if (tt === T.FOREST && rnd(w) < 0.8) w.trees[i] = 0; if (rnd(w) < 0.7) down += raze(i); if (tt !== T.SHALLOWS && rnd(w) < 0.4) w.fires[i] = w.tick + 60 + ri(w, 80); });
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) if (inb(w, x + dx, y + dy) && dx * dx + dy * dy <= 81) { const i = idx(w, x + dx, y + dy); w.fert[i] = Math.min(1, w.fert[i] + 0.35); } /* ash makes the ground rich afterwards */
    w.weather = { kind: 'fog', until: w.tick + Math.round(day * 0.6) };
  }
  else if (kind === 'tornado') {
    let cx = x, cy = y; const h = HEAD[ri(w, 8)];
    for (let n = 0; n < 18; n++) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!inb(w, cx + dx, cy + dy)) continue; const i = idx(w, cx + dx, cy + dy); if (rnd(w) < 0.7) down += raze(i); if (w.terrain[i] === T.FOREST && rnd(w) < 0.5) w.trees[i] = 0; if (w.plants[i] && rnd(w) < 0.3) { w.plants[i] = null; lost++; } }
      w.agents.forEach(function (a) { if (a.dead || hit.indexOf(a.id) >= 0 || cheb(a.x, a.y, cx, cy) > 1) return; hit.push(a.id); feel(a, 'fear', 0.7); for (let t = 0; t < 6; t++) { const nx = a.x + ri(w, 7) - 3, ny = a.y + ri(w, 7) - 3; if (passable(w, nx, ny, a)) { a.x = nx; a.y = ny; break; } } hurtAgent(w, a, 18, 'caught in a tornado', emit); });
      w.creatures.forEach(function (c) { if (!c.dead && cheb(c.x, c.y, cx, cy) <= 1 && rnd(w) < 0.4) c.dead = true; });
      const nx = cx + h[0] + (rnd(w) < 0.3 ? ri(w, 3) - 1 : 0), ny = cy + h[1] + (rnd(w) < 0.3 ? ri(w, 3) - 1 : 0); if (!inb(w, nx, ny)) break; cx = nx; cy = ny;
    }
    x2 = cx; y2 = cy;
  }
  else if (kind === 'hurricane') {
    const f = waterField(w); w.weather = { kind: 'storm', until: w.tick + Math.round(day * 1.5) };
    for (let i = 0; i < f.length; i++) { if (f[i] < 1 || f[i] > 3) continue; if (rnd(w) < 0.35) down += raze(i); if (w.plants[i] && rnd(w) < 0.25) { w.plants[i] = null; lost++; } }
    w.agents.forEach(function (a) { if (a.dead) return; feel(a, 'fear', 0.4); if (f[idx(w, a.x, a.y)] <= 3) { hit.push(a.id); hurtAgent(w, a, a.sheltered ? 5 : 12, 'in a great storm from the sea', emit); } });
  }
  else if (kind === 'blizzard') {
    w.weather = { kind: 'snow', until: w.tick + day }; w.blizzard = w.tick + day;
    for (let i = 0; i < w.plants.length; i++) { const pl = w.plants[i]; if (pl && !(w.laws.plants[pl.sp] || {}).hardy && pl.food > 0) { pl.food = Math.floor(pl.food / 2); lost++; } }
    w.agents.forEach(function (a) { if (!a.dead && !a.sheltered) { hit.push(a.id); feel(a, 'fear', 0.3); } });
  }
  if (kind !== 'tornado' && kind !== 'hurricane' && kind !== 'blizzard') w.agents.forEach(function (a) {
    if (a.dead) return; const d2 = (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y);
    if (kind === 'plague') { if (hit.length < 3 && rnd(w) < 0.4 && sicken(w, a, 'a sickness that came on the wind', emit)) hit.push(a.id); }
    else if (d2 <= r * r + 1) { hit.push(a.id); feel(a, 'fear', 0.6); if (kind === 'wildfire') hurtAgent(w, a, 16, 'burned in a wildfire', emit); else if (kind === 'volcano') hurtAgent(w, a, 24, 'burned when the mountain broke open', emit); else if (kind === 'quake' && a.sheltered) hurtAgent(w, a, 12, 'crushed when the earth shook', emit); }
  });
  if (kind === 'wildfire' || kind === 'volcano') w.creatures.forEach(function (c) { if ((c.x - x) * (c.x - x) + (c.y - y) * (c.y - y) <= r * r && rnd(w) < 0.5) c.dead = true; });
  emit({ type: 'disaster', kind: kind, x: x, y: y, x2: x2, y2: y2, r: r, all: kind === 'hurricane' || kind === 'blizzard', hit: hit, lost: lost, down: down });
  return { kind: kind, x: x, y: y, r: r, hit: hit.length, lost: lost, down: down };
};
SW.sow = function (w, kind, n, at) {
  let made = 0;
  for (let t = 0; t < n * 60 && made < n; t++) { const i = at ? (function () { const X = at.x + ri(w, 2 * at.r + 1) - at.r, Y = at.y + ri(w, 2 * at.r + 1) - at.r; return inb(w, X, Y) ? idx(w, X, Y) : ri(w, w.W * w.H); })() : ri(w, w.W * w.H); if (!w.plants[i] && !w.shelters[i] && !w.walls[i] && w.fert[i] > 0.1 && soilOf(w, kind, i) > 0.3) { w.plants[i] = newPlant(w, kind, 0.6 + 0.4 * rnd(w), i); made++; } }
  return made;
};
SW.spawn = function (w, kind, n) {
  const s = w.laws.creatures[kind]; let made = 0; if (!s) return 0;
  for (let t = 0; t < n * 40 && made < n; t++) {
    if (s.biomes && t < n * 30) { const p = landFor(w, s); if (p && passable(w, p.x, p.y)) { w.creatures.push(newCreature(w, kind, p.x, p.y, { age: s.matureAge })); made++; } continue; }
    const es = edgeSpot(w), x = es.x, y = es.y;
    if (passable(w, x, y) && (fitsLand(w, s, x, y) || t > n * 34)) { w.creatures.push(newCreature(w, kind, x, y, { age: s.matureAge })); made++; }
  }
  return made;
};
function foodEffects(a, s) {
  const out = [];
  if (s.heal) { a.hp = Math.min(100, a.hp + s.heal); a.stats.healed++; out.push('it eased your wounds (+' + s.heal + ' health)'); if (a.sick > 0) { a.sick = Math.max(1, Math.floor(a.sick / 2)); out.push('it eased your sickness'); } }
  if (s.hurt) { a.hp = Math.max(1, a.hp - s.hurt); out.push('it burned inside you (-' + s.hurt + ' health)'); }
  if (s.lore) { a.loreWhy = 'a place of power'; a.lore = Math.round((a.lore + s.lore) * 10) / 10; out.push('your mind opened strangely'); }
  if (s.joy) { feel(a, 'joy', s.joy); out.push('a warm joy rose in you'); }
  if (s.anger) { feel(a, 'anger', s.anger); out.push('rage rose in you'); }
  if (s.calm) { feel(a, 'fear', -s.calm); feel(a, 'anger', -s.calm); out.push('you grew calm'); }
  return out.join('; ');
}
function act(w, a, r, S, emit) {
  const L = w.laws, here = idx(w, a.x, a.y);
  switch (r.do) {
    case 'eat': {
      const p = w.plants[here];
      if (bitesFor(a, p) > 0) {
        const sp = L.plants[p.sp]; p.food -= 1;
        if (sp.nutrition < 0) { feel(a, 'anger', 0.1); feel(a, 'fear', 0.05); } else if (a.e < 30) feel(a, 'joy', 0.12);
        a.e = Math.min(100, a.e + sp.nutrition); a.stats.bites++;
        const fx = foodEffects(a, sp);
        if (rnd(w) < L.body.biteSeedChance && a.seeds.length < L.body.carryMax) a.seeds.push(p.sp);
        let stripped = p.food < 1;
        if (stripped && p.t) { p.food = 0.2; stripped = false; } /* tended plants keep their root */
        if (stripped) w.plants[here] = null;
        w.tally.eaten[p.sp] = (w.tally.eaten[p.sp] || 0) + 1;
        emit({ type: 'ate', a: a.id, kind: p.sp, gain: sp.nutrition, stripped: stripped, fx: fx }); afterEat(w, a, p.sp, emit);
        a.doing = 'eating ' + p.sp; return true;
      }
      for (let k = a.carry.length - 1; k >= 0; k--) {
        if (a.habits.avoid.indexOf(a.carry[k].k) >= 0) continue;
        const it = a.carry.splice(k, 1)[0];
        const fleshy = it.k === 'meat' || it.k === 'flesh' || it.k === 'fish', cooked = fleshy && fireNear(w, a.x, a.y, 1), gain = cooked ? Math.round(it.n * L.craft.cookBonus) : it.n;
        a.e = Math.min(100, a.e + gain); a.stats.bites++;
        const fx = (L.plants[it.k] ? foodEffects(a, L.plants[it.k]) : '') + (cooked ? (L.plants[it.k] ? '; ' : '') + 'cooked at the fire, it gave more' : '');
        w.tally.eaten[it.k] = (w.tally.eaten[it.k] || 0) + 1;
        emit({ type: 'ate', a: a.id, kind: it.k, gain: gain, carried: true, fx: fx }); afterEat(w, a, it.k, emit);
        if (fleshy && !cooked && rnd(w) < L.disease.rawChance) sicken(w, a, 'eating raw ' + it.k, emit);
        a.doing = 'eating carried ' + it.k; return true;
      }
      return false;
    }
    case 'make': {
      const key = String(r.what || '').toLowerCase().trim(), rc = (L.recipes || {})[key];
      if (!rc || (rc.way && !a.knows[rc.way])) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You do not know how to make or do "' + key + '".' }); return false; }
      const N = rc.needs || {}, lack = [], th = a.things = a.things || {};
      ['wood', 'stone', 'ore', 'clay'].forEach(function (k) { if (N[k] && (a[k] || 0) < N[k]) lack.push(N[k] + ' ' + k + ' (you have ' + (a[k] || 0) + ')'); });
      if (N.food) { const have = a.carry.filter(function (c) { return N.food === 'any' || c.k === N.food; }).length; if (have < (N.foodN || 1)) lack.push((N.foodN || 1) + ' ' + N.food + ' carried'); }
      if (N.thing && (th[N.thing] || 0) < (N.thingN || 1)) lack.push((N.thingN || 1) + ' ' + N.thing);
      if (N.tool && !a.tools.some(function (q) { return L.tools[q.k] && L.tools[q.k].use === N.tool; })) lack.push('a tool for ' + N.tool + ' in your hands');
      if (N.at && !nearB(w, a, null, N.at)) lack.push('to be in or beside a ' + N.at);
      if (N.fire && !fireNear(w, a.x, a.y, 1)) lack.push('a fire beside you');
      if (N.water && !waterBeside(w, a)) lack.push('water beside you');
      if (N.night && !SW.isNight(w)) lack.push('night');
      if (N.on && SW.TERRAIN[w.terrain[here]] !== N.on) lack.push('to stand on ' + N.on);
      const near = w.agents.filter(function (o) { return o !== a && !o.dead && cheb(o.x, o.y, a.x, a.y) <= 2; });
      if (N.beings && near.length < N.beings) lack.push(N.beings + ' others within two steps (' + near.length + ' are)');
      if (lack.length) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried "' + key + '", but it needs ' + lack.join(', ') + '.' }); return false; }
      ['wood', 'stone', 'ore', 'clay'].forEach(function (k) { if (N[k]) a[k] -= N[k]; });
      if (N.food) { let n = N.foodN || 1; for (let q = a.carry.length - 1; q >= 0 && n > 0; q--) if (N.food === 'any' || a.carry[q].k === N.food) { a.carry.splice(q, 1); n--; } }
      if (N.thing) th[N.thing] -= N.thingN || 1;
      if (N.tool) useTool(w, a, N.tool, emit);
      const G = rc.gives || {};
      if (G.thing) { th[G.thing] = (th[G.thing] || 0) + (G.n || 1); if ((L.goods[G.thing] || {}).status) { w.relics = w.relics || []; for (let q = 0; q < (G.n || 1); q++) w.relics.push({ id: w.nextId++, kind: G.thing, by: a.id, byName: a.name, people: a.people, day: SW.day(w), x: a.x, y: a.y, holder: a.id, holderName: a.name, passes: [] }); if (w.relics.length > 160) w.relics.splice(0, w.relics.length - 160); } }
      if (G.food) for (let q = 0; q < (G.food.count || 1) && a.carry.length < cap(w, a); q++) a.carry.push({ k: G.food.k, n: G.food.n });
      w.tally.made[key] = (w.tally.made[key] || 0) + 1;
      a.fin = 1; a.stats.made = (a.stats.made || 0) + 1; a.doing = 'making ' + key;
      emit({ type: 'made', a: a.id, what: key, thing: G.thing || '', with: N.beings ? near.map(function (o) { return o.id; }) : [], x: a.x, y: a.y });
      if (G.fx) applyFx(w, a, G.fx, emit, '"' + key + '"');
      if (G.fxAll) near.concat([a]).forEach(function (o) { applyFx(w, o, G.fxAll, emit, '"' + key + '", done together'); if (o !== a) { o.rel[a.id] = clamp((o.rel[a.id] || 0) + 0.1, -1, 1); a.rel[o.id] = clamp((a.rel[o.id] || 0) + 0.1, -1, 1); if (o.people !== a.people) { SW.learnTongue(w, a, o, 0.05); SW.learnTongue(w, o, a, 0.05); w.tally.crossActs = (w.tally.crossActs || 0) + 1; } } });
      return true;
    }
    case 'bridge': {
      if (!a.knows.bridges) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You do not know how to span water.' }); return false; }
      if (a.wood < 3) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'A step of bridge takes 3 wood and you have ' + a.wood + '.' }); return false; }
      const want = r.dir ? SW.COMPASS.indexOf(String(r.dir).toUpperCase()) : -1; let bj = -1, bs = -1;
      for (let d0 = 0; d0 < 8; d0++) { const x = a.x + HEAD[d0][0], y = a.y + HEAD[d0][1]; if (!inb(w, x, y)) continue; const j = idx(w, x, y), tt = w.terrain[j]; if ((tt !== T.WATER && tt !== T.SHALLOWS) || w.roads[j]) continue; let sc = tt === T.WATER ? 2 : 1; if (d0 === want) sc += 10; if (a.px != null && x - a.x === a.x - a.px && y - a.y === a.y - a.py) sc += 3; if (sc > bs) { bs = sc; bj = j; } }
      if (bj < 0) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'There is no open water beside you to span. Stand on the bank, or at the end of a bridge.' }); return false; }
      a.wood -= 3; w.roads[bj] = 2; a.stats.built++; a.stats.bridged = (a.stats.bridged || 0) + 1; a.fin = 1; a.doing = 'building a bridge';
      emit({ type: 'bridged', a: a.id, x: bj % w.W, y: Math.floor(bj / w.W), n: a.stats.bridged }); return true;
    }
    case 'dismantle': {
      let ti = -1; for (let d0 = -1; d0 < 8 && ti < 0; d0++) { const x = d0 < 0 ? a.x : a.x + HEAD[d0][0], y = d0 < 0 ? a.y : a.y + HEAD[d0][1]; if (!inb(w, x, y)) continue; const j = idx(w, x, y); if (w.shelters[j] === a.id || w.walls[j] === a.id) ti = j; }
      if (ti < 0) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'Nothing you built stands here or beside you to take down.' }); return false; }
      const bk = buildingAt(w, ti), B = bk ? L.buildings[bk] : null, gw = B ? Math.floor((B.wood || 0) / 2) : w.walls[ti] ? 1 : Math.floor(L.build.shelterWood / 2), gs = B ? Math.floor((B.stone || 0) / 2) : 0, what = w.walls[ti] ? 'wall' : bk || 'shelter';
      w.shelters[ti] = 0; w.walls[ti] = 0; delete w.bkind[ti]; delete w.looks[ti]; delete w.sturdy[ti]; a.wood += gw; a.stone += gs; a.fin = 1; a.doing = 'taking down a ' + what;
      emit({ type: 'dismantled', a: a.id, what: what, wood: gw, stone: gs, x: ti % w.W, y: Math.floor(ti / w.W) }); return true;
    }
    case 'pave': {
      if (!a.knows.roads) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You do not know how to pave a road.' }); return false; }
      const tt = w.terrain[here]; if (tt === T.WATER || tt === T.SHALLOWS || w.roads[here] || a.stone < 1) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: w.roads[here] ? 'This ground is already paved. Step on and pave the next.' : a.stone < 1 ? 'Paving takes 1 stone a step and you have none.' : 'Water cannot be paved.' }); return false; }
      a.stone--; w.roads[here] = 1; if (w.plants[here] && !w.plants[here].t) w.plants[here] = null; a.stats.paved = (a.stats.paved || 0) + 1; a.fin = 1; a.doing = 'paving a road';
      emit({ type: 'paved', a: a.id, x: a.x, y: a.y, n: a.stats.paved }); return true;
    }
    case 'tame': {
      let c = null, bd = 3, far = null, fd = 9;
      for (let k = 0; k < w.creatures.length; k++) { const o = w.creatures[k], so = L.creatures[o.sp]; if (!o.dead && so && !so.predator && o.owner == null) { const d = cheb(o.x, o.y, a.x, a.y); if (d >= 3 && d < fd) { fd = d; far = o; } } }
      for (let k = 0; k < w.creatures.length; k++) { const o = w.creatures[k], so = L.creatures[o.sp]; if (!o.dead && so && !so.predator && o.owner == null) { const d = cheb(o.x, o.y, a.x, a.y); if (d < bd) { bd = d; c = o; } } }
      const fi = a.carry.findIndex(function (q) { return L.plants[q.k] && L.plants[q.k].nutrition > 0; });
      if (!c && far && fi >= 0) { far.calm = 3; if (!move(w, a, stepToward(w, a, far.x, far.y))) return false; a.doing = 'walking slowly toward a ' + far.sp + ' with food held out'; return true; }
      if (!c || fi < 0) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: !c ? 'You tried to tame an animal, but no wild grazing animal is within eight steps.' : 'You tried to tame an animal, but you carry no plant food to offer it.' }); return false; }
      a.carry.splice(fi, 1); a.fin = 1; a.doing = 'offering food to a ' + c.sp; c.fedBy = c.fedBy || {}; c.fedBy[a.id] = (c.fedBy[a.id] || 0) + 1; c.calm = 30; /* each offering is remembered: an animal fed again and again by the same hand comes to trust it */
      if (rnd(w) < (L.ecology.tameChance || 0.3) * (1 + ((L.culture || {}).tameTrust || 0) * (c.fedBy[a.id] - 1)) / ((L.creatures[c.sp].tough || 1) > 2 ? 2 : 1)) { c.owner = rootOf(w, a).id; c.keeper = a.id; a.stats.tamed = (a.stats.tamed || 0) + 1; emit({ type: 'tamed', a: a.id, kind: c.sp, n: w.creatures.filter(function (o) { return o.keeper === a.id; }).length }); }
      else emit({ type: 'fail', a: a.id, text: 'The ' + c.sp + ' took the food from your hand and drew back a little. It is not yours yet, but it knows your hand now (' + c.fedBy[a.id] + ' offering' + (c.fedBy[a.id] > 1 ? 's' : '') + '); each offering makes it likelier to stay.' });
      return true;
    }
    case 'milk': case 'shear': case 'ride': {
      const want = r.do === 'milk' ? 'milk' : r.do === 'shear' ? 'wool' : 'ride';
      if (want === 'ride' ? !a.knows.riding : !a.knows.herding) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: want === 'ride' ? 'You do not yet know how to stay on an animal\'s back. That is the way of riding, which comes to those who have kept and tamed animals a long while.' : 'You do not yet know how to ' + r.do + ' an animal. That is the way of herding, which comes to those who have tamed animals.' }); return false; }
      if (r.do === 'ride' && a.mount) { a.mount = null; a.fin = 1; a.doing = 'getting down'; emit({ type: 'rode', a: a.id, off: true }); return true; }
      let c = null;
      for (let k = 0; k < w.creatures.length && !c; k++) { const o = w.creatures[k], so = L.creatures[o.sp]; if (!o.dead && so && so[want] && o.owner != null && (o.keeper === a.id || o.owner === rootOf(w, a).id) && cheb(o.x, o.y, a.x, a.y) <= 1 && o.age > so.matureAge && (want === 'ride' || (o[want + 'At'] || -1e9) + L.time.dayLength * (want === 'wool' ? 2 : 0.5) < w.tick)) c = o; }
      if (!c) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: want === 'ride' ? 'You tried to mount, but no grown animal of yours that can bear a rider is beside you.' : 'You tried to ' + r.do + ', but no grown animal of yours that gives ' + want + ' is beside you and ready. (Not every kind gives it, and each must be left a while between.)' }); return false; }
      a.fin = 1;
      if (want === 'milk') { if (a.carry.length >= cap(w, a)) return false; c.milkAt = w.tick; c.e -= 4; a.carry.push({ k: 'milk', n: L.ecology.milkEnergy }); a.doing = 'milking a ' + c.sp; }
      else if (want === 'wool') { c.woolAt = w.tick; a.things = a.things || {}; a.things.wool = (a.things.wool || 0) + 1; a.doing = 'shearing a ' + c.sp; }
      else { a.mount = c.id; c.keeper = a.id; a.doing = 'mounting a ' + c.sp; }
      a.stats[want] = (a.stats[want] || 0) + 1;
      emit({ type: want === 'milk' ? 'milked' : want === 'wool' ? 'sheared' : 'rode', a: a.id, kind: c.sp }); return true;
    }
    case 'rally': {
      if (rootOf(w, a) !== a) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'Only one who leads a band can call it to battle.' }); return false; }
      let t = r.name ? SW.findAgentByName(w, r.name) : null;
      if (!t) { let bd = 99; w.agents.forEach(function (o) { if (!o.dead && a.stances[rootOf(w, o).id] === 'enemy') { const d = cheb(o.x, o.y, a.x, a.y); if (d < bd) { bd = d; t = o; } } }); }
      const mine = w.agents.filter(function (o) { return o !== a && !o.dead && rootOf(w, o) === a && cheb(o.x, o.y, a.x, a.y) <= L.body.hearing + 4 && SW.stage(w, o) !== 'child'; });
      if (!t || t.dead || t === a || rootOf(w, t) === a || !mine.length) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: !mine.length ? 'You called for battle, but no grown follower of yours is near enough to hear.' : 'You called for battle, but named no one who can be fought.' }); return false; }
      mine.forEach(function (o) { o.plan = [{ do: 'attack', target: 'agent', name: t.name, ticks: 120 }]; o.intent = null; feel(o, 'anger', 0.3); });
      a.plan.unshift({ do: 'attack', target: 'agent', name: t.name, ticks: 120 }); a.fin = 1; a.stats.rallied = (a.stats.rallied || 0) + 1; a.doing = 'calling the band to battle';
      emit({ type: 'rallied', a: a.id, b: t.id, with: mine.map(function (o) { return o.id; }) });
      return true;
    }
    case 'drop': {
      const k = String(r.what || '').toLowerCase().trim(); let n = 0;
      for (let q = a.carry.length - 1; q >= 0; q--) if (k ? a.carry[q].k === k : a.habits.avoid.indexOf(a.carry[q].k) >= 0) { a.carry.splice(q, 1); n++; }
      if (!n) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried to drop ' + (k || 'food your body refuses') + ', but you carry none.' }); return false; }
      a.fin = 1; a.doing = 'dropping ' + (k || 'what it will not eat'); emit({ type: 'dropped', a: a.id, n: n, kind: k || 'refused food' });
      return true;
    }
    case 'harvest': {
      const p = w.plants[here];
      if (r === a.intent && a.carry.length >= cap(w, a)) { emit({ type: 'fail', a: a.id, text: 'You tried to harvest, but YOUR HANDS ARE FULL (' + a.carry.length + ' of ' + cap(w, a) + '). Nothing more can be picked until you eat, give, stash or drop something.' }); return false; }
      if (r === a.intent && !p) { emit({ type: 'fail', a: a.id, text: 'You tried to harvest, but no plant grows where you stand, at (' + a.x + ',' + a.y + '). Walk onto the plant first.' }); return false; }
      if (bitesFor(a, p) > 0 && a.carry.length < cap(w, a)) {
        p.food -= 1; a.carry.push({ k: p.sp, n: L.plants[p.sp].nutrition });
        if (a.carry.length < cap(w, a) && rnd(w) < useTool(w, a, 'harvest', emit) - 1) a.carry.push({ k: p.sp, n: L.plants[p.sp].nutrition });
        if (p.food < 1) { if (p.t) p.food = 0.2; else { w.plants[here] = null; emit({ type: 'stripped', a: a.id, kind: p.sp }); } }
        a.doing = 'harvesting ' + p.sp; return true;
      }
      return false;
    }
    case 'plant': {
      if (!a.seeds.length || w.plants[here] || w.shelters[here] || w.walls[here] || w.fert[here] <= 0) return false;
      let si = -1;
      for (let k = a.seeds.length - 1; k >= 0; k--) {
        if (r.what ? a.seeds[k] === r.what : a.habits.avoid.indexOf(a.seeds[k]) < 0) { si = k; break; }
      }
      if (si < 0) return false;
      const sp = a.seeds.splice(si, 1)[0]; w.plants[here] = newPlant(w, sp, 0.05, here, (a.knows.farming || useTool(w, a, 'plant', emit) > 1) ? 2 : 1); a.fin = 1;
      a.stats.planted++;
      emit({ type: 'planted', a: a.id, kind: sp }); SW.glimpse(w, a, 'farming', emit); a.doing = 'planting ' + sp; return true;
    }
    case 'gather': {
      const lode = w.lodes && w.lodes[here];
      if (lode) {
        const md = L.minerals[lode.k] || {}; a.things = a.things || {};
        if (md.deep && !a.knows.mining) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'There is ' + lode.k + ' in the rock here, but it lies too deep to win with bare hands or a simple tool. It needs a way of working the earth that you do not have.' }); return false; }
        if ((a.things[lode.k] || 0) >= 12) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You carry all the ' + lode.k + ' you can (12).' }); return false; }
        if (rnd(w) < L.build.woodChance * useTool(w, a, 'gather', emit) * (a.knows.mining ? 1.5 : 1)) { a.things[lode.k] = (a.things[lode.k] || 0) + 1; a.stats.mined = (a.stats.mined || 0) + 1; lode.n--; const spent = lode.n <= 0; if (spent) { (w.spent = w.spent || []).push({ i: here, k: lode.k, m: lode.m || 20, t: w.tick }); if (w.spent.length > 200) w.spent.shift(); delete w.lodes[here]; } emit({ type: 'mined', a: a.id, kind: lode.k, first: a.stats.mined === 1, x: a.x, y: a.y, spent: spent }); SW.glimpse(w, a, 'mining', emit); }
        a.doing = 'winning ' + lode.k + ' from the ground'; return true;
      }
      const tt = w.terrain[here], rock = tt === T.ROCK, wet = tt === T.MARSH || tt === T.SHALLOWS;
      if (wet) { /* clay comes out of wet ground */
        if (a.clay >= L.craft.clayMax) return false;
        if (rnd(w) < L.build.woodChance * useTool(w, a, 'gather', emit)) { a.clay++; a.stats.clay++; emit({ type: 'clay', a: a.id, first: a.stats.clay === 1, x: a.x, y: a.y }); SW.glimpse(w, a, 'pottery', emit); }
        a.doing = 'digging clay'; return true;
      }
      if (!rock && tt !== T.FOREST) return false;
      if (!rock && !(w.trees[here] > 0)) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried to gather wood, but every tree here has been felled; only stumps stand at (' + a.x + ',' + a.y + '). Wood must be sought where trees still grow.' }); return false; }
      const seam = rock && w.ore[here] > 0 && a.ore < L.craft.oreMax;
      if (rock ? (a.stone >= L.craft.stoneMax && !seam) : a.wood >= L.build.woodMax) return false;
      if (rnd(w) < L.build.woodChance * useTool(w, a, 'gather', emit)) {
        if (!rock) { a.wood++; if (rnd(w) < L.build.fellChance) { w.trees[here]--; emit({ type: 'felled', a: a.id, x: a.x, y: a.y, left: w.trees[here] }); } } else if (a.stone < L.craft.stoneMax) a.stone++;
        a.stats.wood++;
        if (seam && rnd(w) < L.craft.oreChance) {
          a.ore++; a.stats.ore++; w.ore[here]--; if (w.ore[here] <= 0) delete w.ore[here];
          emit({ type: 'ore', a: a.id, first: a.stats.ore === 1, x: a.x, y: a.y, spent: !w.ore[here] }); SW.glimpse(w, a, 'smelting', emit);
        }
      }
      a.doing = seam ? 'breaking ore from the rock' : rock ? 'gathering stone' : 'gathering wood'; return true;
    }
    case 'fish': {
      let water = false;
      for (let d = 0; d < 8 && !water; d++) { const x = a.x + HEAD[d][0], y = a.y + HEAD[d][1]; if (inb(w, x, y)) { const t = w.terrain[idx(w, x, y)]; water = t === T.WATER || t === T.SHALLOWS; } }
      if (!water && w.terrain[here] !== T.SHALLOWS) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried to fish, but there is no water beside you.' }); return false; }
      if (a.carry.length >= cap(w, a)) return false;
      const W2 = L.water, key = (a.x >> 3) + ',' + (a.y >> 3), taken = w.fished[key] || 0, sky = w.weather.kind;
      a.doing = 'fishing';
      const chance = W2.fishChance * boon(a, 'luck') * (a.knows.fishing ? 2 : 1) * useTool(w, a, 'fish', emit) / (1 + 0.5 * taken) * (SW.season(w) === 3 ? W2.winterFish : 1) * (sky === 'storm' ? 0.5 : sky === 'rain' ? 1.3 : 1);
      if (rnd(w) < chance) {
        a.carry.push({ k: 'fish', n: W2.fishFood }); w.fished[key] = taken + 1; a.stats.fished++;
        emit({ type: 'fished', a: a.id, first: a.stats.fished === 1, x: a.x, y: a.y, thin: taken >= 3 }); SW.glimpse(w, a, 'fishing', emit);
      }
      return true;
    }
    case 'build': {
      const what = r.what === 'wall' || r.what === 'fire' || r.what === 'store' ? r.what : 'shelter';
      if (what === 'fire') {
        if (!a.knows.fire) { emit({ type: 'fail', a: a.id, text: 'You tried to make a fire, but you do not know how.' }); return false; }
        if (a.wood < 1 || w.shelters[here] || w.walls[here] || w.stores[here]) return false;
        a.wood--; a.fin = 1; w.plants[here] = null;
        { const th = a.things || {}, fuel = th.coal > 0 ? 'coal' : th.peat > 0 ? 'peat' : null; if (fuel) th[fuel]--; w.fires[here] = Math.max(w.fires[here], w.tick) + L.craft.fireLife * (fuel === 'coal' ? 4 : fuel === 'peat' ? 2.5 : 1); }
        emit({ type: 'built', a: a.id, x: a.x, y: a.y, what: 'fire' }); SW.glimpse(w, a, 'fire', emit); a.doing = 'tending a fire'; return true;
      }
      if (L.buildings && L.buildings[r.what]) {
        const B = L.buildings[r.what], bw = B.wood || 0, bs = B.stone || 0, say = function (t) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: t }); return false; };
        if (B.way && !a.knows[B.way] && !(w.works[here] && w.works[here].kind === r.what)) return say('You tried to raise a ' + r.what + ', but you do not know how. It belongs to the way of ' + B.way + '.'); /* anyone may carry to a work that one who knows has begun */
        const taken = w.shelters[here] || w.walls[here] || w.stores[here] || w.plants[here] || w.fires[here] > w.tick;
        if (bw + bs > 14) { /* a great work: begun by one, finished by whoever brings wood and stone to it */
          let W0 = w.works[here];
          if (!W0) { if (taken) return say('You tried to begin a ' + r.what + ', but this ground is taken. It needs bare ground.'); if (a.wood + a.stone < 1) return say('A ' + r.what + ' is a great work: ' + bw + ' wood and ' + bs + ' stone in all, brought over many days by as many hands as will help. Bring wood or stone to begin it.'); W0 = w.works[here] = { kind: r.what, by: a.id, wood: 0, stone: 0, hands: {}, tick: w.tick }; emit({ type: 'begun', a: a.id, kind: r.what, x: a.x, y: a.y, wood: bw, stone: bs }); }
          else if (W0.kind !== r.what) return say('A ' + W0.kind + ' is already being raised on this ground.');
          const gw = Math.min(a.wood, bw - W0.wood), gs = Math.min(a.stone, bs - W0.stone);
          if (gw + gs <= 0) return say('The ' + r.what + ' here still needs ' + (bw - W0.wood) + ' wood and ' + (bs - W0.stone) + ' stone, and you carry none of what it lacks.');
          a.wood -= gw; a.stone -= gs; W0.wood += gw; W0.stone += gs; W0.hands[a.id] = (W0.hands[a.id] || 0) + gw + gs; a.stats.raised = (a.stats.raised || 0) + gw + gs; a.fin = 1; a.doing = 'labouring on a ' + r.what;
          if (W0.wood >= bw && W0.stone >= bs) {
            delete w.works[here]; w.shelters[here] = W0.by; w.bkind[here] = r.what; delete w.looks[here]; a.stats.built++; w.tally.built[r.what] = (w.tally.built[r.what] || 0) + 1;
            const hands = Object.keys(W0.hands).map(Number); hands.forEach(function (p1) { hands.forEach(function (p2) { if (p1 === p2) return; const o = agentById(w, p1); if (o) o.rel[p2] = clamp((o.rel[p2] || 0) + 0.1, -1, 1); }); });
            emit({ type: 'built', a: a.id, x: a.x, y: a.y, what: r.what, building: true, great: true, hands: hands, began: W0.by });
          } else emit({ type: 'laboured', a: a.id, kind: r.what, x: a.x, y: a.y, gave: gw + gs, left: (bw - W0.wood) + ' wood and ' + (bs - W0.stone) + ' stone' });
          return true;
        }
        if (a.wood < bw || a.stone < bs) return say('You tried to raise a ' + r.what + ', but it takes ' + bw + ' wood and ' + bs + ' stone, and you have ' + a.wood + ' wood and ' + a.stone + ' stone.');
        if (taken) return say('You tried to raise a ' + r.what + ', but this ground is taken. It needs bare ground.');
        a.wood -= bw; a.stone -= bs; a.stats.built++; a.fin = 1; w.shelters[here] = a.id; if (!w.bkind) w.bkind = {}; w.bkind[here] = r.what; delete w.looks[here]; w.tally.built[r.what] = (w.tally.built[r.what] || 0) + 1;
        emit({ type: 'built', a: a.id, x: a.x, y: a.y, what: r.what, building: true }); a.doing = 'raising a ' + r.what; return true;
      }
      if (what === 'store' && !a.knows.storage) { emit({ type: 'fail', a: a.id, text: 'You tried to build a store, but you do not know how: that is the way of storage, which you have not yet come to. A roof (build with what: shelter) you can raise without it.' }); return false; }
      const wall = what === 'wall', hasB = a.tools.some(function (q) { return L.tools[q.k] && L.tools[q.k].use === 'build'; });
      const cost = Math.max(1, (wall ? (a.knows.masonry ? 1 : L.build.wallWood) : what === 'store' ? 2 : L.build.shelterWood) - (hasB ? 1 : 0));
      if (a.wood < cost) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried to build a ' + what + ', but it takes ' + cost + ' wood and you have ' + a.wood + '.' }); return false; }
      if (w.shelters[here] || w.walls[here] || w.stores[here] || w.plants[here] || w.fires[here] > w.tick || (w.works && w.works[here])) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried to build a ' + what + ' at (' + a.x + ',' + a.y + '), but this ground is taken (by a plant, a fire or something built). Step onto bare ground and build there.' }); return false; }
      a.wood -= cost; a.stats.built++; w.tally.built[what] = (w.tally.built[what] || 0) + 1; a.fin = 1; if (a.stats.built <= 3) a.lore = Math.round((a.lore + 0.1) * 10) / 10; if (hasB) useTool(w, a, 'build', emit);
      const mine = a.knows[wall ? 'masonry' : what === 'store' ? 'storage' : ''];
      if (wall) { w.walls[here] = a.id; if (a.knows.masonry) w.sturdy[here] = 1; if (a.wallLook) w.looks[here] = a.wallLook; else if (mine && mine.look) w.looks[here] = mine.look; else delete w.looks[here]; }
      else if (what === 'store') { w.stores[here] = { by: a.id, items: [] }; if (mine && mine.look) w.looks[here] = mine.look; else delete w.looks[here]; }
      else { w.shelters[here] = a.id; if (w.bkind) delete w.bkind[here]; if (a.shelterLook) w.looks[here] = a.shelterLook; else delete w.looks[here]; }
      emit({ type: 'built', a: a.id, x: a.x, y: a.y, what: what }); SW.glimpse(w, a, wall ? 'masonry' : what === 'store' ? 'storage' : 'tools', emit); a.doing = 'building a ' + what; return true;
    }
    case 'raze': {
      /* tear down a wall or shelter next to you that is not your own band's */
      let ti = -1;
      for (let d = 0; d < 8 && ti < 0; d++) {
        const x = a.x + HEAD[d][0], y = a.y + HEAD[d][1]; if (!inb(w, x, y)) continue;
        const j = idx(w, x, y), owner = w.walls[j] || (w.shelters[j] > 0 ? w.shelters[j] : 0) || (w.stores[j] && w.stores[j].by);
        if (owner && !allied(w, a, owner)) ti = j;
        else if (w.devices[j] && !allied(w, a, w.devices[j].by) && ti < 0) { /* a device comes apart in one go */
          const dv = w.devices[j]; delete w.devices[j]; a.fin = 1; a.doing = 'breaking a ' + dv.k;
          emit({ type: 'razed', a: a.id, b: dv.by, what: dv.k, x: x, y: y }); return true;
        }
      }
      if (ti < 0) { const j = here, owner = (w.shelters[j] > 0 ? w.shelters[j] : 0) || (w.stores[j] && w.stores[j].by); if (owner && !allied(w, a, owner)) ti = j; }
      if (ti < 0) return false;
      a.doing = 'tearing down a ' + (w.walls[ti] ? 'wall' : w.stores[ti] ? 'store' : 'shelter');
      let siege = 1; if (a.things && L.goods) for (const gk in L.goods) if (L.goods[gk].raze && a.things[gk] > 0) siege = Math.max(siege, L.goods[gk].raze);
      if (rnd(w) < L.build.razeChance * siege * (w.sturdy[ti] ? L.craft.sturdy : 1) * useTool(w, a, 'build', emit)) {
        const owner = w.walls[ti] || w.shelters[ti] || w.stores[ti].by, what = w.walls[ti] ? 'wall' : w.stores[ti] ? 'store' : 'shelter';
        if (w.stores[ti]) { while (w.stores[ti].items.length && a.carry.length < cap(w, a)) a.carry.push(w.stores[ti].items.pop()); }
        w.walls[ti] = 0; w.shelters[ti] = 0; w.stores[ti] = null; delete w.sturdy[ti]; delete w.looks[ti]; a.fin = 1;
        emit({ type: 'razed', a: a.id, b: owner, what: what, x: ti % w.W, y: Math.floor(ti / w.W) });
      }
      return true;
    }
    case 'mark': {
      if (a.wood < L.craft.markWood) { emit({ type: 'fail', a: a.id, text: 'You tried to leave a mark but had no wood to make it from.' }); return false; }
      a.wood -= L.craft.markWood; a.fin = 1;
      w.marks = w.marks.filter(function (m) { return m.x !== a.x || m.y !== a.y; });
      a.stats.marks++;
      const sign = !!a.knows.signs;
      w.marks.push({ id: w.nextId++, x: a.x, y: a.y, by: a.id, name: a.name, hue: a.hue, lang: a.lang, text: String(r.text || '').slice(0, a.knows.writing ? 420 : sign ? 160 : 60), look: (sign && a.knows.signs.look) || a.emblem || null, tick: w.tick, day: SW.day(w), sign: sign, carved: sign && (w.terrain[idx(w, a.x, a.y)] === T.ROCK || !!w.shelters[idx(w, a.x, a.y)] || nearOwn(w, a)), until: w.tick + L.craft.markLife * (sign ? L.craft.signLife : 1) * (sign && (w.terrain[idx(w, a.x, a.y)] === T.ROCK || !!w.shelters[idx(w, a.x, a.y)] || nearOwn(w, a)) ? 6 : 1) });
      if (w.marks.length > 160) w.marks.shift();
      emit({ type: 'marked', a: a.id, x: a.x, y: a.y, text: String(r.text || '').slice(0, 60) }); a.doing = 'leaving a mark'; return true;
    }
    case 'cultivate': {
      if (a.stats.planted < L.craft.cultivateSkill) {
        emit({ type: 'fail', a: a.id, text: 'You tried to breed a new variety but do not yet understand growing things well enough. You have planted ' + a.stats.planted + ' seeds so far.' });
        return false;
      }
      const tally = {}; let parent = null;
      a.seeds.forEach(function (sd) { tally[sd] = (tally[sd] || 0) + 1; });
      if (r.what && tally[r.what] >= 2) parent = r.what;
      else for (const sd in tally) if (tally[sd] >= 2 && !r.what) { parent = sd; break; }
      if (!parent || !L.plants[parent]) { emit({ type: 'fail', a: a.id, text: 'Breeding a new variety needs two seeds of the same kind' + (r.what ? ' (you asked for ' + r.what + ')' : '') + '.' }); return false; }
      if (a.e < L.craft.cultivateCost + 5) return false;
      const nm = r.name ? String(r.name).toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) : '';
      const v = plantVariety(w, parent, { aim: r.aim, name: nm.length >= 3 ? nm : null, look: SW.sanitizeLook(r.look), by: a.id, byName: a.name });
      if (!v) { emit({ type: 'fail', a: a.id, text: 'The land already holds as many kinds of plant as it can bear. No new variety took.' }); return false; }
      let left = 2; a.seeds = a.seeds.filter(function (sd) { if (sd === parent && left > 0) { left--; return false; } return true; });
      a.seeds.push(v); a.e -= L.craft.cultivateCost; a.stats.bred++; a.fin = 1; a.lore += 0.5;
      emit({ type: 'cultivated', a: a.id, kind: v, from: parent, aim: r.aim || null, x: a.x, y: a.y });
      a.doing = 'breeding ' + v; return true;
    }
    case 'rest': a.resting = true; a.doing = 'resting'; return true;
    case 'linger': a.resting = true; a.doing = 'staying put'; if (rnd(w) < 0.03) move(w, a, roamStep(w, a)); return true;
    case 'wander': move(w, a, roamStep(w, a)); a.doing = 'wandering'; return true;
    case 'hunt': {
      const c = S.near.prey; if (!c || c.dead) return false;
      a.rush = 1;
      if (cheb(a.x, a.y, c.x, c.y) <= 1) {
        const s = L.creatures[c.sp];
        if (rnd(w) < L.fight.huntChance * useTool(w, a, 'hunt', emit) * boon(a, 'luck') * (c.owner != null && c.owner === rootOf(w, a).id ? 4 : 1) / c.quick) {
          c.wounds = (c.wounds || 0) + 1;
          if (c.wounds >= (s.tough || 1)) {
            c.dead = true; const n = Math.max(1, Math.round(s.meat * c.size));
            for (let k = 0; k < n && a.carry.length < cap(w, a); k++) a.carry.push({ k: 'meat', n: s.meatEnergy });
            a.stats.kills++; a.stats.hunted++; emit({ type: 'hunted', a: a.id, kind: c.sp, n: n }); SW.glimpse(w, a, 'tools', emit);
          } else emit({ type: 'wounded', a: a.id, kind: c.sp });
        } else if (s.gore && rnd(w) < 0.5) { emit({ type: 'bitten', a: a.id, by: c.sp }); hurtAgent(w, a, s.gore, 'gored by a ' + c.sp, emit); }
      } else if (!move(w, a, pathToward(w, a, c.x, c.y, 1))) return false;
      a.doing = 'hunting'; return true;
    }
    case 'seek': {
      const kind = r.target || 'food', t = targetOf(w, a, S, kind, r.name);
      if (!t) return false;
      const d = cheb(a.x, a.y, t.x, t.y), stop = (kind === 'food' || kind === 'tree' || kind === 'shelter' || kind === 'store' || kind === 'home') ? 0 : 1;
      if (d <= stop) return false;
      let ok;
      if (kind === 'food') {
        const s = bfsStep(w, a, function (x, y) { return bitesFor(a, w.plants[idx(w, x, y)]) > 0; }, L.body.sight);
        ok = s ? tryMove(w, a, s[0], s[1]) : false;
      } else ok = pathToward(w, a, t.x, t.y, stop);
      if (!ok) return false;
      move(w, a, true); a.doing = 'going to ' + (t.name || kind); return true;
    }
    case 'flee': {
      const t = targetOf(w, a, S, r.from || 'predator', r.name);
      if (!t) return false;
      if ((r.from || 'predator') === 'predator') {
        if (a.sheltered || fireNear(w, a.x, a.y, 2)) { a.spook = 0; return false; } /* under a roof or beside a fire the beast will not come: there is nothing to run from */
        const dp = cheb(a.x, a.y, t.x, t.y); let ref = null, rd = 14;
        [S.near.shelter, S.near.fire, S.near.home].forEach(function (q) { if (!q) return; const d = cheb(a.x, a.y, q.x, q.y); if (d < rd && cheb(q.x, q.y, t.x, t.y) >= Math.min(dp, 2)) { rd = d; ref = q; } });
        if (ref && dp > 1 && (rd <= 3 || rd <= dp)) { a.rush = 1; a.spook = 5; /* only when the roof can be reached before the teeth */ if (move(w, a, pathToward(w, a, ref.x, ref.y, 0))) { a.doing = 'running for shelter'; return true; } }
      }
      a.rush = 1; a.spook = 5; move(w, a, stepAway(w, a, t.x, t.y)); a.doing = 'fleeing'; return true;
    }
    case 'attack': {
      const kind = r.target || 'agent', t = targetOf(w, a, S, kind, r.name);
      if (!t || t.dead) return false;
      a.rush = 1;
      if (cheb(a.x, a.y, t.x, t.y) <= 1) {
        if (kind === 'predator') {
          const ps = L.creatures[t.sp];
          if (rnd(w) < L.fight.predatorKillChance * Math.max(useTool(w, a, 'hunt', emit), useTool(w, a, 'fight', emit))) t.wounds = (t.wounds || 0) + 1;
          if ((t.wounds || 0) >= ((ps && ps.tough) || 1)) {
            t.dead = true; const s = L.creatures[t.sp]; a.stats.hunted++;
            for (let k = 0; k < s.meat && a.carry.length < cap(w, a); k++) a.carry.push({ k: 'meat', n: s.meatEnergy });
            a.stats.kills++; emit({ type: 'hunted', a: a.id, kind: t.sp, n: s.meat });
          } else if (rnd(w) < 0.7) { emit({ type: 'bitten', a: a.id, by: t.sp }); hurtAgent(w, a, (ps && ps.bite) || L.fight.predatorBite, 'killed by a ' + t.sp, emit); }
        } else strike(w, a, t, emit);
      } else if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false;
      a.doing = 'attacking ' + (t.name || t.sp); return true;
    }
    case 'goto': {
      const x = clamp(Math.round(+r.x || 0), 0, w.W - 1), y = clamp(Math.round(+r.y || 0), 0, w.H - 1);
      if (a.x === x && a.y === y) return false;
      if (!move(w, a, pathToward(w, a, x, y, 0))) move(w, a, roamStep(w, a));
      a.doing = 'walking to (' + x + ',' + y + ')'; return true;
    }
    case 'explore': {
      const d = SW.DIRS[r.dir] || SW.DIRS.N;
      if (!move(w, a, stepDir(w, a, d[0], d[1]))) move(w, a, roamStep(w, a));
      a.doing = 'exploring ' + (r.dir || 'N'); return true;
    }
    case 'follow': {
      const t = r.name ? targetOf(w, a, S, 'agent', r.name) : (S.near.leader || null);
      if (!t || cheb(a.x, a.y, t.x, t.y) <= 2) return false;
      if (!move(w, a, pathToward(w, a, t.x, t.y, 2))) return false;
      a.doing = 'following ' + t.name; return true;
    }
    case 'give': {
      const t = targetOf(w, a, S, 'agent', r.name); if (!t) return false;
      const what = r.what || 'food';
      if (a.things && a.things[what] > 0) { /* a made thing changes hands */
        if (cheb(a.x, a.y, t.x, t.y) > 1) { if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false; a.doing = 'bringing ' + what + ' to ' + t.name; return true; }
        if (t.ghost) return false;
        { const rl = (w.relics || []).filter(function (q) { return q.kind === what && q.holder === a.id; })[0]; if (rl) { rl.holder = t.id; rl.holderName = t.name; rl.passes.push({ day: SW.day(w), from: a.name, to: t.name, people: t.people }); } }
        a.things[what]--; t.things = t.things || {}; t.things[what] = (t.things[what] || 0) + 1; a.stats.gifts++; a.fin = 1; t.rel[a.id] = clamp((t.rel[a.id] || 0) + 0.3 * (1 + 0.08 * Math.min(5, SW.status(w, a))), -1, 1); feel(t, 'joy', 0.3); w.tally.given = w.tally.given || {}; w.tally.given[what] = (w.tally.given[what] || 0) + 1; if (a.people !== t.people) { SW.learnTongue(w, a, t, 0.07); SW.learnTongue(w, t, a, 0.07); w.tally.crossGifts = (w.tally.crossGifts || 0) + 1; }
        emit({ type: 'gave', a: a.id, b: t.id, item: 'a ' + what, thing: what }); return true;
      }
      const has = what === 'food' ? a.carry.length : what === 'seed' ? a.seeds.length : what === 'tool' ? a.tools.length : what === 'stone' ? a.stone : what === 'ore' ? a.ore : what === 'clay' ? a.clay : a.wood;
      if (!has) return false;
      if (cheb(a.x, a.y, t.x, t.y) > 1) { if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false; a.doing = 'bringing ' + what + ' to ' + t.name; return true; }
      let item = what;
      if (what === 'food') { if (t.carry.length >= cap(w, t)) return false; const it = a.carry.pop(); t.carry.push(it); item = it.k; }
      else if (what === 'seed') { if (t.seeds.length >= L.body.carryMax) return false; item = a.seeds.pop(); t.seeds.push(item); item += ' seed'; }
      else if (what === 'tool') { if (t.tools.length >= L.craft.maxTools) return false; const tl = a.tools.pop(); t.tools.push(tl); t.designs[tl.k] = 1; item = 'a ' + tl.k; }
      else if (what === 'stone') { if (t.stone >= L.craft.stoneMax) return false; a.stone--; t.stone++; }
      else if (what === 'ore') { if (t.ore >= L.craft.oreMax) return false; a.ore--; t.ore = (t.ore || 0) + 1; }
      else if (what === 'clay') { if (t.clay >= L.craft.clayMax) return false; a.clay--; t.clay = (t.clay || 0) + 1; }
      else { if (t.wood >= L.build.woodMax) return false; a.wood--; t.wood++; }
      a.stats.gifts++; a.fin = 1; t.rel[a.id] = clamp((t.rel[a.id] || 0) + 0.2, -1, 1); feel(t, 'joy', 0.25);
      if (a.people !== t.people) { SW.learnTongue(w, a, t, 0.06); SW.learnTongue(w, t, a, 0.06); w.tally.crossGifts = (w.tally.crossGifts || 0) + 1; }
      emit({ type: 'gave', a: a.id, b: t.id, item: item, cross: a.people !== t.people }); a.doing = 'giving to ' + t.name; return true;
    }
    case 'craft': {
      const key = String(r.what || '').toLowerCase().trim(), d = L.tools[key];
      if (key === 'pot' && !d) {
        const fire = fireNear(w, a.x, a.y, 1);
        if (!a.knows.pottery) { emit({ type: 'fail', a: a.id, text: 'You tried to shape a pot, but you do not know the way of fired clay.' }); return false; }
        if ((a.pots || 0) >= L.craft.potMax) { emit({ type: 'fail', a: a.id, text: 'You already carry as many pots as you can.' }); return false; }
        if (a.clay < L.craft.potClay || !fire) { emit({ type: 'fail', a: a.id, text: 'A pot takes ' + L.craft.potClay + ' clay and a fire beside you. You have ' + a.clay + ' clay' + (fire ? '' : ' and no fire beside you') + '.' }); return false; }
        a.clay -= L.craft.potClay; a.pots = (a.pots || 0) + 1; a.fin = 1; a.stats.crafted++; a.doing = 'firing a pot';
        emit({ type: 'crafted', a: a.id, kind: 'pot', use: 'carrying', pot: true }); SW.glimpse(w, a, 'pottery', emit); return true;
      }
      if (!d || !a.designs[key]) { emit({ type: 'fail', a: a.id, text: 'You do not know how to make "' + key + '".' }); return false; }
      if (d.use === 'device') { emit({ type: 'fail', a: a.id, text: 'A ' + key + ' is a device: it is not carried but set in the ground, with the action place.' }); return false; }
      if (a.wood < d.wood || a.stone < d.stone) { emit({ type: 'fail', a: a.id, text: 'Making a ' + key + ' takes ' + d.wood + ' wood and ' + d.stone + ' stone. You have ' + a.wood + ' wood and ' + a.stone + ' stone. Wood is gathered in forest, stone on rock.' }); return false; }
      if (a.tools.length >= L.craft.maxTools) a.tools.shift();
      const metal = !!(a.knows.smelting && a.ore > 0 && fireNear(w, a.x, a.y, 1)), th2 = a.things = a.things || {};
      let grade = metal ? 1 : 0, edge = 1;
      if (metal) { a.ore--; SW.glimpse(w, a, 'smelting', emit); if (a.knows.iron && th2.iron > 0 && nearB(w, a, null, 'forge')) { th2.iron--; grade = 3; } else if (a.knows.bronze && th2.tin > 0) { th2.tin--; grade = 2; } }
      else if (th2.obsidian > 0) { th2.obsidian--; edge = 1.5; } else if (th2.flint > 0) { th2.flint--; edge = 1.25; } /* a stone that takes an edge makes a tool that lasts */
      a.wood -= d.wood; a.stone -= d.stone; a.tools.push(metal ? { k: key, wear: Math.round(d.wear * L.craft.metalWear * (grade === 3 ? 2 : grade === 2 ? 1.5 : 1) * (1 + nearB(w, a, 'craft'))), m: grade } : { k: key, wear: Math.round(d.wear * edge * (1 + nearB(w, a, 'craft'))) }); a.fin = 1; a.stats.crafted++;
      a.doing = 'making a ' + key;
      emit({ type: 'crafted', a: a.id, kind: key, use: d.use, metal: metal, grade: grade, edge: edge });
      /* anyone watching can copy what they saw made */
      for (let k = 0; k < w.agents.length; k++) { const o = w.agents[k]; if (o !== a && !o.dead && !o.designs[key] && cheb(o.x, o.y, a.x, a.y) <= SW.sight(w)) { o.designs[key] = 1; emit({ type: 'sawmade', a: o.id, b: a.id, kind: key, use: d.use }); } }
      return true;
    }
    case 'place': {
      const key = String(r.what || '').toLowerCase().trim(), d = L.tools[key];
      if (!d || d.use !== 'device' || !a.designs[key]) { emit({ type: 'fail', a: a.id, text: 'You do not know how to make a device called "' + key + '".' }); return false; }
      if (a.wood < d.wood || a.stone < d.stone) { emit({ type: 'fail', a: a.id, text: 'Setting a ' + key + ' takes ' + d.wood + ' wood and ' + d.stone + ' stone. You have ' + a.wood + ' wood and ' + a.stone + ' stone.' }); return false; }
      if (w.shelters[here] || w.walls[here] || w.stores[here] || w.devices[here] || w.fires[here] > w.tick) return false;
      a.wood -= d.wood; a.stone -= d.stone; a.fin = 1; a.stats.built++; a.stats.crafted++; w.plants[here] = null;
      w.devices[here] = { k: key, by: a.id, byName: a.name, hue: a.hue, x: a.x, y: a.y, born: w.tick, cool: 0, hold: [], barred: 0 };
      a.doing = 'setting a ' + key;
      emit({ type: 'placed', a: a.id, kind: key, x: a.x, y: a.y }); SW.glimpse(w, a, 'devices', emit);
      for (let k = 0; k < w.agents.length; k++) { const o = w.agents[k]; if (o !== a && !o.dead && !o.designs[key] && cheb(o.x, o.y, a.x, a.y) <= SW.sight(w)) { o.designs[key] = 1; emit({ type: 'sawmade', a: o.id, b: a.id, kind: key, use: 'device' }); } }
      return true;
    }
    case 'heal': {
      if (!a.knows.medicine) { emit({ type: 'fail', a: a.id, text: 'You tried to tend a wound, but you do not know how.' }); return false; }
      let ki = -1; for (let k = 0; k < a.carry.length; k++) { const s = L.plants[a.carry[k].k]; if (s && s.heal) { ki = k; break; } }
      if (ki < 0) { emit({ type: 'fail', a: a.id, text: 'You have no healing plant to work with.' }); return false; }
      const t = r.name ? targetOf(w, a, S, 'agent', r.name) : a;
      if (!t) return false;
      if (t !== a && cheb(a.x, a.y, t.x, t.y) > 1) { if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false; a.doing = 'going to tend ' + t.name; return true; }
      const it = a.carry.splice(ki, 1)[0], amt = L.plants[it.k].heal * 2;
      t.hp = Math.min(100, t.hp + amt); if (t.sick > 0) t.sick = 1; a.fin = 1; a.doing = 'tending ' + (t === a ? 'its own wounds' : t.name);
      if (t !== a) { t.rel[a.id] = clamp((t.rel[a.id] || 0) + 0.3, -1, 1); feel(t, 'joy', 0.2); }
      if (t !== a) a.stats.tended = (a.stats.tended || 0) + 1;
      emit({ type: 'healed', a: a.id, b: t.id, amt: amt, with: it.k }); SW.glimpse(w, a, 'medicine', emit); return true;
    }
    case 'venture': { /* to push into the unknown at the edge of the known world */
      const V = w.veil, E = L.explore || {}; let near = false; if (V) for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) { const X = a.x + dx, Y = a.y + dy; if (inb(w, X, Y) && V.t[Y * w.W + X] != null) near = true; }
      if (!near) { const eg = SW.edgeNear(w, a); if (eg && eg.d > 2) { if (!move(w, a, pathToward(w, a, eg.x, eg.y, 1))) return false; a.doing = 'walking to the edge of the known world'; return true; } if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You meant to venture beyond the known world, but its edge is not here.' + (V ? '' : ' In this world the land ends at its rim, and nothing lies beyond.') }); return false; }
      const Rt = rootOf(w, a), X = Rt.ex = Rt.ex || { n: 0, rest: 0 };
      if (w.tick < X.rest) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'The will to push into the unknown is spent, yours and your band\'s. It returns in about ' + Math.ceil((X.rest - w.tick) / L.time.dayLength) + ' days.' }); return false; }
      if (a.e < 30) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You are too weak to push into the unknown. Eat first.' }); return false; }
      a.e -= E.cost || 0; a.fin = 1; X.n++; a.stats.ventured = (a.stats.ventured || 0) + 1; a.doing = 'venturing into the unknown';
      if (X.n >= (E.pushes || 3)) { X.n = 0; X.rest = w.tick + (E.restDays || 5) * L.time.dayLength; }
      if (rnd(w) < (E.chance == null ? 0.5 : E.chance)) { const ev = SW.openStrip(w, a.x, a.y, noop); if (ev) { ev.a = a.id; a.stats.found = (a.stats.found || 0) + 1; a.loreWhy = 'finding new land'; a.lore = Math.round((a.lore + 0.4) * 10) / 10; feel(a, 'joy', 0.6); a.stat = null; emit(ev); return true; } }
      emit({ type: 'fail', a: a.id, text: 'You pushed into the mist at the edge of the known world and found no way through this time. ' + (X.rest > w.tick ? 'Your will to try again is spent for now, and your band\'s with it.' : 'It may yet open to another try.') }); return true;
    }
    case 'claim': { /* what the dead raised stands empty: whoever claims it holds it, and everything of theirs around it */
      let ti = -1; for (let dy = -1; dy <= 1 && ti < 0; dy++) for (let dx = -1; dx <= 1 && ti < 0; dx++) { const x = a.x + dx, y = a.y + dy; if (!inb(w, x, y)) continue; const j = idx(w, x, y), own = (w.shelters[j] > 0 ? w.shelters[j] : 0) || (w.stores[j] && w.stores[j].by) || 0; if (own && !isAlive(w, own)) ti = j; }
      if (ti < 0) { if (S.near.ruin && S.near.ruin.d > 1) { if (!move(w, a, pathToward(w, a, S.near.ruin.x, S.near.ruin.y, 1))) return false; a.doing = 'going to an empty ' + S.near.ruin.kind; return true; } if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You tried to claim a building, but none stands empty here: only what the dead raised can be claimed.' }); return false; }
      let n = 0; const tx = ti % w.W, ty = Math.floor(ti / w.W), kinds = {};
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = tx + dx, y = ty + dy; if (!inb(w, x, y)) continue; const j = idx(w, x, y);
        if (w.shelters[j] > 0 && !isAlive(w, w.shelters[j])) { w.shelters[j] = a.id; n++; const kd = (w.bkind && w.bkind[j]) || 'shelter'; kinds[kd] = (kinds[kd] || 0) + 1; }
        if (w.stores[j] && w.stores[j].by && !isAlive(w, w.stores[j].by)) { w.stores[j].by = a.id; n++; kinds.store = (kinds.store || 0) + 1; }
        if (w.walls[j] && !isAlive(w, w.walls[j])) { w.walls[j] = a.id; n++; kinds.wall = (kinds.wall || 0) + 1; } }
      a.fin = 1; a.stats.claimed = (a.stats.claimed || 0) + n; a.doing = 'claiming what the dead left'; w.tally.claimed = (w.tally.claimed || 0) + n; a.stat = null;
      emit({ type: 'claimed', a: a.id, n: n, kinds: kinds, x: tx, y: ty }); return true;
    }
    case 'stash': {
      const st = w.stores[here]; if (!st || !a.carry.length || st.items.length >= L.craft.storeMax) return false;
      let n = 0; while (a.carry.length && st.items.length < L.craft.storeMax) { st.items.push(a.carry.pop()); n++; }
      a.fin = 1; a.doing = 'filling a store'; emit({ type: 'stashed', a: a.id, n: n, x: a.x, y: a.y }); return true;
    }
    case 'take': {
      const dvh = w.devices[here], st = w.stores[here] || (dvh ? { by: dvh.by, items: dvh.hold } : null); if (!st || !st.items.length || a.carry.length >= cap(w, a)) return false;
      let n = 0; while (st.items.length && a.carry.length < cap(w, a)) { a.carry.push(st.items.pop()); n++; }
      a.fin = 1; a.doing = 'taking from a store';
      const raid = !!st.by && !allied(w, a, st.by), seenBy = [];
      if (!st.by && !st.items.length && w.stores[here]) { w.stores[here] = null; delete w.looks[here]; } /* a dead one's leavings, now gone */
      if (raid) { st.missing = (st.missing || 0) + n; a.stats.stolen += n; for (let k = 0; k < w.agents.length; k++) { const o = w.agents[k]; if (o !== a && !o.dead && allied(w, o, st.by) && cheb(o.x, o.y, a.x, a.y) <= SW.sight(w)) { seenBy.push(o.id); o.rel[a.id] = clamp((o.rel[a.id] || 0) - 0.5, -1, 1); feel(o, 'anger', 0.5); } } }
      emit({ type: 'took', a: a.id, b: st.by, n: n, raid: raid, seenBy: seenBy, x: a.x, y: a.y }); return true;
    }
    case 'steal': {
      const t = targetOf(w, a, S, 'agent', r.name); if (!t || !t.carry.length || a.carry.length >= cap(w, a)) return false;
      if (cheb(a.x, a.y, t.x, t.y) > 1) { if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false; a.doing = 'creeping toward ' + t.name; return true; }
      a.fin = 1; a.doing = 'stealing from ' + t.name;
      const ok = rnd(w) < L.fight.stealChance, seen = !ok || rnd(w) < L.fight.noticeChance;
      let item = null;
      if (ok) { const it = t.carry.pop(); a.carry.push(it); item = it.k; a.stats.stolen++; }
      if (seen) { t.rel[a.id] = clamp((t.rel[a.id] || 0) - 0.5, -1, 1); feel(t, 'anger', 0.6); }
      else if (ok) feel(t, 'anger', 0.25);
      if (seen) a.shame = Math.round(((a.shame || 0) + 0.8) * 100) / 100;
      emit({ type: 'stole', a: a.id, b: t.id, ok: ok, seen: seen, item: item });
      return true;
    }
    case 'trade': {
      const t = targetOf(w, a, S, 'agent', r.name); if (!t) return false;
      const give = r.what || 'food', want = r.want || 'food';
      const has = function (q, k) { return k === 'food' ? q.carry.length : k === 'seed' ? q.seeds.length : q.wood; };
      if (!has(a, give)) return false;
      if (cheb(a.x, a.y, t.x, t.y) > 1) { if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false; a.doing = 'going to trade with ' + t.name; return true; }
      if (!a.offer || a.offer.id !== t.id || a.offer.give !== give || a.offer.want !== want || w.tick - a.offer.t > 80) emit({ type: 'offer', a: a.id, b: t.id, give: give, want: want });
      a.offer = { id: t.id, give: give, want: want, t: w.tick }; a.doing = 'offering ' + give + ' for ' + want + ' to ' + t.name;
      const o = t.offer;
      if (o && o.id === a.id && o.give === want && o.want === give && w.tick - o.t <= 80 && has(t, want)) {
        const pass = function (from, to, k) { if (k === 'food') { const it = from.carry.pop(); to.carry.push(it); return it.k; } if (k === 'seed') { const sd = from.seeds.pop(); to.seeds.push(sd); return sd + ' seed'; } from.wood--; to.wood++; return 'wood'; };
        const gave = pass(a, t, give), got = pass(t, a, want);
        a.offer = t.offer = null; a.fin = 1; a.stats.trades++; t.stats.trades++;
        a.rel[t.id] = clamp((a.rel[t.id] || 0) + 0.15, -1, 1); t.rel[a.id] = clamp((t.rel[a.id] || 0) + 0.15, -1, 1);
        feel(a, 'joy', 0.15); feel(t, 'joy', 0.15);
        emit({ type: 'traded', a: a.id, b: t.id, gave: gave, got: got });
        a.doing = 'trading with ' + t.name;
      }
      return true;
    }
    case 'mate': {
      const t = targetOf(w, a, S, 'agent', r.name); if (!t) return false;
      if (cheb(a.x, a.y, t.x, t.y) > 1) { if (!move(w, a, pathToward(w, a, t.x, t.y, 1))) return false; a.doing = 'approaching ' + t.name; return true; }
      if (!a.court || a.court.id !== t.id || w.tick - a.court.t > 80) { feel(t, 'joy', 0.12); emit({ type: 'court', a: a.id, b: t.id }); }
      a.court = { id: t.id, t: w.tick }; a.doing = 'courting ' + t.name;
      const M = L.mate;
      { const pa = a.parents || [], pt = t.parents || [], kin = pa.indexOf(t.id) >= 0 || pt.indexOf(a.id) >= 0 || pa.some(function (q) { return pt.indexOf(q) >= 0; }); if (kin) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You and ' + t.name + ' are close kin (parent and child, or children of the same parent). No child can come of it.' }); a.court = null; return false; } }
      if (M.sexes && a.sex && t.sex && a.sex === t.sex) { if (r === a.intent) emit({ type: 'fail', a: a.id, text: 'You and ' + t.name + ' are both ' + (a.sex === 'f' ? 'women' : 'men') + '. A child comes only of a woman and a man together.' }); a.court = null; return false; }
      if (t.court && t.court.id === a.id && w.tick - t.court.t <= 80 && a.e >= M.minEnergy && t.e >= M.minEnergy &&
          a.mateCd <= 0 && t.mateCd <= 0 && a.age >= a.life * M.minAgeFraction && t.age >= t.life * M.minAgeFraction &&
          w.agents.length < M.maxPopulation) {
        const plenty = a.e >= 85 && t.e >= 85 && a.hp >= 80 && t.hp >= 80 && !((a.press || {}).famine > 0.5) && !((t.press || {}).famine > 0.5) && SW.season(w) !== 3; /* well fed and well, in a kind season: the next child may come sooner */
        a.e -= M.cost; t.e -= M.cost; a.mateCd = t.mateCd = Math.round(M.cooldown * (plenty ? (M.plentyCooldown || 1) : 1)); a.court = t.court = null; a.mateT = t.mateT = w.tick; a.partner = t.id; t.partner = a.id;
        const mix = function (k) { return Math.round(clamp((a.temperament[k] + t.temperament[k]) / 2 + (rnd(w) - 0.5) * 0.3, 0, 1) * 100) / 100; };
        const nKids = rnd(w) < (M.twinChance || 0) * (plenty ? 1.5 : 1) ? 2 : 1; /* twins are a girl and a boy */
        for (let tw = 0; tw < nKids && w.agents.length + w.newborn.length < M.maxPopulation; tw++) {
        const kid = newAgent(w, a.x, a.y, {
          sex: nKids > 1 ? (tw ? 'm' : 'f') : (rnd(w) < 0.5 ? 'f' : 'm'), e: M.childEnergy, gen: Math.max(a.gen, t.gen) + 1, parents: [a.id, t.id],
          temperament: { bold: mix('bold'), sociable: mix('sociable'), curious: mix('curious'), gentle: mix('gentle'), honest: mix('honest'), greedy: mix('greedy') },
          hue: Math.round(((rnd(w) < 0.5 ? a.hue : t.hue) + ri(w, 31) - 15 + 360) % 360),
          policy: JSON.parse(JSON.stringify(a.policy)), habits: JSON.parse(JSON.stringify(t.habits)),
          look: SW.mutateLook(w, rnd(w) < 0.5 ? (a.look || t.look) : (t.look || a.look), 0.7),
          shelterLook: a.shelterLook || t.shelterLook || null, wallLook: a.wallLook || t.wallLook || null, emblem: null,
          people: a.people, lang: a.lang, tall: Math.round(((a.tall || 1) + (t.tall || 1)) / 2 * 100) / 100,
          tongues: (function () { const o = {}; [a, t].forEach(function (par) { if (par.lang != null) o[par.lang] = 1; for (const lg in (par.tongues || {})) o[lg] = Math.max(o[lg] || 0, par.tongues[lg] * 0.6); }); return o; })(),
          genes: (function () { const o = {}, ga = a.genes || {}, gt = t.genes || {}; Object.keys(ga).concat(Object.keys(gt)).forEach(function (g) { o[g] = Math.round(((ga[g] || 1) + (gt[g] || 1)) / 2 * (0.95 + 0.1 * rnd(w)) * 100) / 100; }); if (a.people !== t.people) { const ks = SW.FX_BOON, g = ks[ri(w, ks.length)], better = g === 'appetite' || g === 'thirst' ? 0.9 : 1.12; o[g] = Math.round((o[g] || 1) * better * 100) / 100; } return o; })()
        });
        if (a.people !== t.people) kid.mixed = [a.people, t.people];
        kid.leader = a.leader != null ? a.leader : (t.leader != null ? t.leader : null);
        kid.lore = Math.round((a.lore + t.lore) * 0.15 * 10) / 10; kid.teachers = [a.id, t.id];
        [a, t].forEach(function (par) { for (const dk in par.designs) kid.designs[dk] = 1; });
        [a, t].forEach(function (par) { for (const id in par.knows) if (!kid.knows[id] && rnd(w) < 0.5) { const k = par.knows[id]; kid.knows[id] = { name: k.name, idea: k.idea, look: k.look, tick: w.tick, by: k.by, byName: k.byName, via: par.id }; } });
        kid.rel[a.id] = 0.6; kid.rel[t.id] = 0.6; a.rel[kid.id] = 0.7; t.rel[kid.id] = 0.7;
        a.rel[t.id] = clamp((a.rel[t.id] || 0) + 0.3, -1, 1); t.rel[a.id] = clamp((t.rel[a.id] || 0) + 0.3, -1, 1);
        a.stats.kids++; t.stats.kids++; feel(a, 'joy', 0.6); feel(t, 'joy', 0.6); a.fin = 1;
        w.newborn.push(kid);
        w.tally.lived = (w.tally.lived || 0) + 1; w.tally.births = (w.tally.births || 0) + 1;
        emit({ type: 'birth', a: kid.id, p1: a.id, p2: t.id, twin: nKids > 1 });
        }
      }
      return true;
    }
  }
  return false;
}

function stepAgents(w, emit) {
  const L = w.laws, night = SW.isNight(w), winter = SW.season(w) === 3;
  w.newborn = [];
  for (let k = 0; k < w.agents.length; k++) {
    const a = w.agents[k]; if (a.dead) continue;
    beginTurn(a); a.age++; a.resting = false; a.fin = 0;
    { const sh = w.stores[idx(w, a.x, a.y)];
      if (sh && sh.missing && sh.by != null && allied(w, a, sh.by)) {
        const near = w.agents.filter(function (o) { return o !== a && !o.dead && !allied(w, o, sh.by) && cheb(o.x, o.y, a.x, a.y) <= 8; }).map(function (o) { return o.id; });
        emit({ type: 'robbed', a: a.id, n: sh.missing, x: a.x, y: a.y, near: near }); feel(a, 'anger', 0.4); sh.missing = 0;
      } }
    const AG = L.age, stg = SW.stage(w, a);
    if (stg !== a.stage) { if (a.stage === 'child' && stg === 'adult') emit({ type: 'grown', a: a.id }); else if (a.stage === 'adult' && stg === 'elder') emit({ type: 'aged', a: a.id }); a.stage = stg; }
    if (a.mateCd > 0) a.mateCd--;
    const dk = L.mood.decay; a.mood.anger *= dk; a.mood.fear *= dk; a.mood.grief *= dk; a.mood.joy *= dk;
    const S = senses(w, a);
    a.sheltered = S.vars.sheltered;
    let done = false;
    if (a.e < 18 && (a.carry.some(function (q) { return a.habits.avoid.indexOf(q.k) < 0; }) || S.vars.plant_here >= 1)) { done = act(w, a, { do: 'eat' }, S, emit); if (done) a.doing += ' (starving: the body ate by itself)'; }
    if (!done && a.e < 22 && !a.carry.length && S.near.store) { const sj = idx(w, S.near.store.x, S.near.store.y), so = w.stores[sj]; if (so && so.items && so.items.length && (!so.by || allied(w, a, so.by) || !isAlive(w, so.by))) { if (S.near.store.d === 0) { done = act(w, a, { do: 'take' }, S, emit); if (done) a.doing = 'taking from the store, starving'; } else if (move(w, a, pathToward(w, a, S.near.store.x, S.near.store.y, 0))) { done = true; a.doing = 'making for the store, starving'; } } }
    if (!done && a.e < 20 && !a.carry.length && !S.near.food && !(S.near.predator && cheb(a.x, a.y, S.near.predator.x, S.near.predator.y) <= 2) && (w.tick + a.id) % 2 === 0) { /* nothing to eat in sight: a starving body follows its nose to the nearest food, far off */
      if (!a.nose || w.tick - a.nose.t > 40) { let bj = -1, bd = 31; for (let dy = -30; dy <= 30; dy += 1) for (let dx = -30; dx <= 30; dx += 1) { const x = a.x + dx, y = a.y + dy; if (!inb(w, x, y)) continue; const j = idx(w, x, y), q = w.plants[j]; if (!q || q.food < 1 || !(L.plants[q.sp].nutrition > 0) || a.habits.avoid.indexOf(q.sp) >= 0) continue; const dd = Math.max(Math.abs(dx), Math.abs(dy)); if (dd < bd) { bd = dd; bj = j; } } a.nose = { t: w.tick, j: bj }; }
      if (a.nose.j >= 0 && move(w, a, pathToward(w, a, a.nose.j % w.W, Math.floor(a.nose.j / w.W), 0))) { done = true; a.doing = 'following the smell of food, starving'; } }
    if (!done && a.e < 22 && S.near.food && !(S.near.predator && cheb(a.x, a.y, S.near.predator.x, S.near.predator.y) <= 2)) { done = act(w, a, { do: 'seek', target: 'food' }, S, emit); if (done) a.doing = 'making for food, starving'; } /* a starving body goes to food it can see, whatever the plan, unless teeth are upon it */
    for (let i = 0; i < a.policy.length && !done; i++) {
      const r = a.policy[i];
      if (r.urgent && matches(S.vars, r)) done = act(w, a, r, S, emit);
    }
    if (!done && a.spook > 0) { a.spook--; if (S.near.predator) done = act(w, a, { do: 'flee', from: 'predator' }, S, emit); }
    if (!done && (a.thirst || 0) > 82 && (a.e >= 20 || a.thirst > 96) && waterStep(w, a)) { done = true; a.doing = 'making for water, parched'; } /* past bearing, the body goes by itself */
    if (!a.intent && a.plan.length) a.intent = a.plan.shift();
    if (!done && a.intent) {
      done = act(w, a, a.intent, S, emit);
      if (done && a.mount && !a.fin && RIDES[a.intent.do]) act(w, a, a.intent, senses(w, a), emit); /* mounted, twice the ground */
      a.intent.ticks = (a.intent.ticks || 1) - 1;
      if (done && a.fin) a.intent = null;
      else if (!done || a.intent.ticks <= 0) { emit({ type: 'intent_done', a: a.id, did: a.intent.do, ok: done, left: a.plan.length }); a.intent = null; }
    }
    for (let i = 0; i < a.policy.length && !done; i++) {
      const r = a.policy[i];
      if (!r.urgent && matches(S.vars, r)) done = act(w, a, r, S, emit);
    }
    if (!done) { a.doing = 'idle'; }
    if (a.dead) continue;
    if (a.boons && a.boons.length) a.boons = a.boons.filter(function (q) { return q.until > w.tick; });
    if (a.press && (w.tick + a.id) % L.time.dayLength === 0) { const fd = (L.discovery || {}).pressFade || 0.85; for (const pk in a.press) { a.press[pk] = Math.round(a.press[pk] * fd * 1000) / 1000; if (a.press[pk] < 0.05) delete a.press[pk]; } }
    if ((w.tick + a.id * 7) % 60 === 0) { const op = SW.pathsFor(w, a).open; a.openSeen = a.openSeen || {}; for (let q = 0; q < op.length; q++) if (!a.openSeen[op[q].id]) { a.openSeen[op[q].id] = w.tick; emit({ type: 'insight', a: a.id, node: op[q].id, hint: op[q].hint, why: op[q].why || '' }); } }
    if (a.loreSeen == null) a.loreSeen = a.lore;
    if (a.lore > a.loreSeen) { a.lore = Math.round((a.loreSeen + (a.lore - a.loreSeen) / (1 + a.loreSeen / 2.5)) * 100) / 100; const why = a.loreWhy || (a.intent && a.intent.do) || 'other'; if (!w.loreBy) w.loreBy = {}; w.loreBy[why] = Math.round(((w.loreBy[why] || 0) + a.lore - a.loreSeen) * 100) / 100; } a.loreWhy = null; /* each step of understanding is harder than the last */
    a.loreSeen = a.lore;
    let drain = L.body.baseDrain * (stg === 'child' ? AG.childDrain : 1) * boon(a, 'appetite'), cold = 0;
    if (night) cold += L.body.nightCold;
    if (winter) cold += L.time.winterCold;
    cold *= 1 / boon(a, 'warmth');
    const sky = w.weather.kind;
    if (sky === 'rain') cold += L.weather.rainCold; else if (sky === 'storm') cold += L.weather.stormCold; else if (sky === 'snow') cold += L.weather.snowCold; else if (sky === 'gale') cold += 0.035;
    const ground = w.terrain[idx(w, a.x, a.y)];
    if (ground === T.SNOW) cold += L.land.snowCold;
    if ((w.blizzard || 0) > w.tick) cold += 0.12;
    if (a.sheltered) cold *= (1 - L.body.shelterShield);
    if (cold > 0 && fireNear(w, a.x, a.y, L.craft.fireReach)) cold *= L.craft.fireWarmth;
    drain *= 1 + Math.min(0.1, (a.stats.blows || 0) * 0.005); /* a body hardened by fighting needs a little more food */
    if (ground === T.DESERT && !night) drain += L.land.desertThirst;
    if (ground === T.WATER && !(w.roads && w.roads[idx(w, a.x, a.y)]) && !floatOf(w, a)) { drain += L.water.swimDrain || 0; a.stats.swum = (a.stats.swum || 0) + 1; SW.press(w, a, 'water', 0.02); } /* and one who swims thinks about better ways over water */ /* swimming is hard work */
    if (w.fields.length) { cold *= fieldFactor(w, 'cold', a.x, a.y); drain *= fieldFactor(w, 'drain', a.x, a.y); }
    drain += cold;
    if (SW.season(w) === 2) SW.press(w, a, 'turning', 0.004); /* autumn: the days shorten, and everyone feels what is coming */
    if (cold > 0.09) SW.press(w, a, 'cold', 0.004); if ((sky === 'storm' || sky === 'gale' || (w.blizzard || 0) > w.tick) && !a.sheltered) SW.press(w, a, 'storms', 0.003); if ((a.thirst || 0) > 80) SW.press(w, a, 'thirst', 0.01);
    if (sky === 'drought') drain += L.weather.droughtThirst;
    a.mood.lonely = clamp(a.mood.lonely + (S.near.agent ? -0.006 : 0.002), 0, 1);
    if (a.faith && S.near.agent && S.near.agent.faith === a.faith) { a.mood.lonely = clamp(a.mood.lonely - ((L.culture || {}).faithComfort || 0), 0, 1); a.mood.fear *= 0.995; } /* beside one who holds what you hold, less alone and less afraid */
    if (a.resting) drain *= L.body.restFactor;
    a.e -= drain;
    { /* thirst: water beside you, rain or snow slakes it; a pot carries water away from the bank */
      let th = (a.thirst || 0) + L.body.thirstRate * boon(a, 'thirst') * (ground === T.DESERT && !night ? 2 : 1) * (sky === 'drought' ? 1.5 : sky === 'heat' ? 1.8 : 1) * (stg === 'child' ? 0.8 : 1);
      if (waterBeside(w, a) || ground === T.SNOW) { if (th > 30) emit({ type: 'drank', a: a.id, th: Math.round(th) }); th = 0; a.water = (a.pots || 0) * (L.craft.potWater || 3); }
      else if (sky === 'rain' || sky === 'storm' || sky === 'snow') th = Math.max(0, th - 1.2);
      else if (th > 60 && (a.water || 0) > 0) { a.water--; th -= 50; emit({ type: 'drank', a: a.id, th: Math.round(th + 50), pot: true }); }
      if (th > 70) a.e -= L.body.thirstHarm;
      if (th >= 100) { th = 100; a.hp -= L.body.thirstWound; if (a.hp <= 0) { a.thirst = th; killAgent(w, a, 'thirst', emit); continue; } }
      if (th > 75 && !a.dryFlag) { a.dryFlag = true; emit({ type: 'parched', a: a.id }); } else if (th < 40) a.dryFlag = false;
      a.thirst = th;
    }
    { /* how this being fares: suffering now, happiness over hours, satisfaction with its life over days */
      const m = a.mood, h0 = a.happy == null ? 0.4 : a.happy, s0 = a.sat == null ? 0.5 : a.sat;
      const suf = clamp(Math.max(0, (40 - a.e) / 40) * 0.5 + Math.max(0, (60 - a.hp) / 60) * 0.5 + (a.sick > 0 ? 0.25 : 0) + Math.max(0, (a.thirst - 60) / 40) * 0.4 + m.fear * 0.25 + m.grief * 0.35 + m.lonely * 0.15 + (cold > 0.1 ? 0.15 : 0), 0, 1);
      const hap = clamp(0.2 + m.joy * 0.5 + (a.e > 60 ? 0.12 : 0) + (S.near.friend ? 0.14 : 0) + (a.sheltered ? 0.08 : 0) + (S.vars.in_home ? 0.08 : 0) - suf * 0.7 - m.anger * 0.2, 0, 1);
      a.suffer = (a.suffer || 0) + (suf - (a.suffer || 0)) * 0.05; a.happy = h0 + (hap - h0) * 0.02; a.sat = s0 + ((a.happy - a.suffer + 1) / 2 - s0) * 0.002;
      if ((w.tick + a.id) % 16 === 0) for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j]; if (o === a || o.dead || cheb(a.x, a.y, o.x, o.y) > 2) continue; const r0 = a.rel[o.id] || 0;
        if ((o.suffer || 0) > 0.55 && r0 > -0.2) m.grief = clamp(m.grief + 0.1 * a.temperament.gentle * (1 + r0), 0, 1);
        else if ((o.happy || 0) > 0.6 && r0 > 0) m.joy = clamp(m.joy + 0.04, 0, 1);
        else if ((o.happy || 0) > 0.6 && r0 < -0.3) m.anger = clamp(m.anger + 0.02, 0, 1); }
      if ((w.tick + a.id) % 40 === 0 && a.lang != null) for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j]; if (o !== a && !o.dead && o.lang != null && o.lang !== a.lang && cheb(a.x, a.y, o.x, o.y) <= 6) { a.tongues = a.tongues || {}; a.tongues[o.lang] = Math.min(1, Math.round(((a.tongues[o.lang] || 0) + 0.008) * 1000) / 1000); } }
      if ((w.tick + a.id) % 16 === 0) {
        /* what is worn and held works all the time */
        const Gd = L.goods, th = a.things; let worn = null; if (th && Gd) for (const gk in Gd) if (Gd[gk].boons && th[gk] > 0) { worn = worn || {}; for (const bk in Gd[gk].boons) worn[bk] = (worn[bk] || 1) * Gd[gk].boons[bk]; } a.worn = worn;
        if (!a.lands) a.lands = {}; if (w.region && w.region.length) a.lands[w.region[idx(w, a.x, a.y)]] = 1;
        /* a parent with food in hand does not watch its own child go hungry */
        if (stg !== 'child' && a.carry.length) for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j]; if (o === a || o.dead || (o.parents || []).indexOf(a.id) < 0 || o.e >= 45 || cheb(a.x, a.y, o.x, o.y) > 2 || o.carry.length >= cap(w, o)) continue; const fi = a.carry.findIndex(function (q) { return q.n > 0 && o.habits.avoid.indexOf(q.k) < 0; }); if (fi < 0) break; const it = a.carry.splice(fi, 1)[0]; o.carry.push(it); o.rel[a.id] = clamp((o.rel[a.id] || 0) + 0.1, -1, 1); emit({ type: 'fed', a: a.id, b: o.id, item: it.k }); break; }
      }
      if (w.tick % w.laws.time.dayLength === 5 && a.shame > 0) a.shame = Math.round(a.shame * (L.status.shameFade || 0.9) * 100) / 100;
      if (S.near.leader && cheb(a.x, a.y, S.near.leader.x, S.near.leader.y) <= 6) { m.fear *= 0.985; m.lonely = clamp(m.lonely - 0.004, 0, 1); } /* near the one you follow, fear loosens */
    }
    { /* time spent in a building of some kind does what that kind does, once a day */
      const bi = idx(w, a.x, a.y), bk = buildingAt(w, bi);
      if (bk) { const B = L.buildings[bk], used = a.used = a.used || {}; if ((used[bi] || -1e9) + L.time.dayLength < w.tick) { used[bi] = w.tick; if (B.fx) applyFx(w, a, B.fx, emit, 'the ' + bk); const wth = []; if (B.bond) for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j]; if (o !== a && !o.dead && cheb(a.x, a.y, o.x, o.y) <= 2) { a.rel[o.id] = clamp((a.rel[o.id] || 0) + B.bond, -1, 1); o.rel[a.id] = clamp((o.rel[a.id] || 0) + B.bond, -1, 1); wth.push(o.id); } } emit({ type: 'used', a: a.id, kind: bk, with: wth, x: a.x, y: a.y }); } }
      if (a.mount) { let mc = null; for (let j = 0; j < w.creatures.length; j++) if (w.creatures[j].id === a.mount) mc = w.creatures[j]; if (!mc || mc.dead || mc.keeper !== a.id) a.mount = null; else if (mc.x !== a.x || mc.y !== a.y) { mc.px = mc.x; mc.py = mc.y; mc.x = a.x; mc.y = a.y; } }
    }
    if (a.e > L.body.healAbove && a.hp < 100 && !(a.sick > 0)) a.hp = Math.min(100, a.hp + L.body.healRate * (1 + 0.3 * (a.happy || 0)) * (a.knows.medicine ? 2 : 1) * (S.vars.in_home ? L.home.heal : 1));
    if (S.vars.in_home) a.mood.fear *= 0.99;
    if (w.settlements.length) { /* crossing into another band's ground is noticed */
      let inside = 0;
      for (let q = 0; q < w.settlements.length; q++) { const stl = w.settlements[q]; if (cheb(a.x, a.y, stl.x, stl.y) <= stl.r) { inside = stl.id; if (a.inSet !== stl.id && rootOf(w, a).id !== stl.root) emit({ type: 'trespass', a: a.id, set: stl }); break; } }
      a.inSet = inside;
      if (inside && done && (a.poachT || 0) + 80 < w.tick && /^(gathering|digging|breaking ore|winning|harvest|picking|fishing|hunting)/.test(a.doing)) { const stl = w.settlements.filter(function (q) { return q.id === inside; })[0]; if (stl && rootOf(w, a).id !== stl.root) { a.poachT = w.tick; emit({ type: 'poached', a: a.id, set: stl, what: a.doing }); } }
    }
    for (let j = 0; j < w.marks.length; j++) { const m = w.marks[j]; if (m.sign && m.text && m.by !== a.id && !a.read[m.id] && cheb(a.x, a.y, m.x, m.y) <= 1) { a.read[m.id] = 1; emit({ type: 'read', a: a.id, mark: m }); } }
    if (a.sick > 0) {
      const D = L.disease; a.sick--; a.e -= D.drain; a.hp -= D.harm;
      if (a.hp <= 0) { killAgent(w, a, 'sickness', emit); continue; }
      if (a.sick <= 0) { a.sick = 0; a.immune = w.tick + D.immunity; emit({ type: 'well', a: a.id }); }
      else for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j]; if (o !== a && !o.dead && !(o.sick > 0) && (o.immune || 0) <= w.tick && cheb(a.x, a.y, o.x, o.y) <= 1 && rnd(w) < D.spread) sicken(w, o, 'staying close to ' + a.name + ', who was sick', emit); }
    } else if (ground === T.MARSH && night && rnd(w) < L.disease.marshChance) sicken(w, a, 'a night in the marsh', emit);
    if (a.e <= 0) { killAgent(w, a, 'starved', emit); continue; }
    if (a.age > a.life) { killAgent(w, a, 'old age', emit); continue; }
    if (a.e < 25 && !a.lowFlag) { a.lowFlag = true; feel(a, 'fear', 0.3); SW.press(w, a, 'hunger', 1); if (winter || SW.season(w) === 2) SW.press(w, a, 'famine', 1); const hr = L.body.hearing, nearIds = [], kinIds = []; for (let j = 0; j < w.agents.length; j++) { const o = w.agents[j]; if (o === a || o.dead) continue; const dd = cheb(a.x, a.y, o.x, o.y); if (dd <= hr) nearIds.push(o.id); else if (dd <= hr * 3 && (rootOf(w, o) === rootOf(w, a) || (a.parents || []).indexOf(o.id) >= 0 || (o.parents || []).indexOf(a.id) >= 0)) kinIds.push(o.id); } emit({ type: 'low', a: a.id, near: nearIds, kin: kinIds, x: a.x, y: a.y }); }
    else if (a.e > 45) a.lowFlag = false;
    if (S.near.agent) {
      for (let j = 0; j < w.agents.length; j++) {
        const o = w.agents[j]; if (o === a || o.dead) continue;
        if (cheb(a.x, a.y, o.x, o.y) <= SW.sight(w)) {
          if (!a.seen[o.id] || w.tick - a.seen[o.id] > 400) emit({ type: 'saw', a: a.id, b: o.id, first: !a.seen[o.id] });
          a.seen[o.id] = w.tick;
        }
      }
    }
  }
  w.agents = w.agents.filter(function (a) { return !a.dead; }).concat(w.newborn);
  delete w.newborn;
}

/* ---------- the tick ---------- */
SW.step = function (w, emit) {
  emit = emit || noop;
  w.tick++;
  w.fresh = [];
  if (w.tick % (w.laws.time.dayLength * w.laws.time.seasonDays) === 0) for (let k = 0; k < w.agents.length; k++) w.agents[k].stats.seasons = (w.agents[k].stats.seasons || 0) + 1;
  stepWeather(w, emit);
  stepPlants(w);
  stepCreatures(w, emit);
  stepAgents(w, emit);
  { const AR = w.laws.arrivals; if (AR && AR.floor > 0 && w.tick % w.laws.time.dayLength === 5 && w.agents.length < AR.floor && w.agents.length < w.laws.mate.maxPopulation && w.tick - (w.lastArrival == null ? -1e9 : w.lastArrival) >= (AR.gapDays || 4) * w.laws.time.dayLength && w.tick > w.laws.time.dayLength * 2) SW.arrive(w, AR.size, null, emit); }
  if (w.tick % w.laws.time.dayLength === 9) { const rg = w.laws.ecology.lodeRegrow || 0; if (rg > 0) { for (const li in w.lodes) { const l = w.lodes[li]; if (l.m == null) l.m = l.n; if (l.n < l.m) l.n = Math.min(l.m, l.n + Math.max(1, Math.round(l.m * rg))); } if (w.spent && w.spent.length) w.spent = w.spent.filter(function (q) { if (w.tick - q.t > 8 * w.laws.time.dayLength && !w.lodes[q.i] && rnd(w) < 0.2) { w.lodes[q.i] = { k: q.k, n: Math.max(2, Math.round(q.m * 0.1)), m: q.m }; return false; } return true; }); } }
  if (w.arrivedQ && w.arrivedQ.length) { const q = w.arrivedQ; w.arrivedQ = []; q.forEach(function (e) { emit({ type: 'arrived', ids: e.ids, people: e.people }); }); }
  stepDevices(w, emit);
  if (w.tick % w.laws.time.dayLength === 77 && rnd(w) < (w.laws.weather.disaster || 0)) SW.disaster(w, SW.pickDisaster(w), emit);
  if (w.tick % 8 === 5 && w.sites && w.sites.length) stepSites(w, emit);
  if (w.tick % 40 === 9 && SW.season(w) < 2) for (let k = 0, n = Math.ceil(w.W * w.H / 40); k < n; k++) { const ti = ri(w, w.W * w.H); if (w.terrain[ti] === T.FOREST && w.trees[ti] < 3 && !w.shelters[ti] && !w.walls[ti]) { const tx = ti % w.W, ty = (ti - tx) / w.W; let near = 0; for (let d = 0; d < 8; d++) { const nx = tx + HEAD[d][0], ny = ty + HEAD[d][1]; if (inb(w, nx, ny) && w.trees[idx(w, nx, ny)] > 1) near++; } if (rnd(w) < w.laws.build.treeRegrow * (0.3 + near / 5)) w.trees[ti]++; } }
  if (w.tick % 120 === 7) SW.findSettlements(w, emit);
  if (w.tick % 60 === 31 && w.worn) for (const wk in w.worn) { const i = +wk, x = i % w.W, y = (i - x) / w.W; let lush = 0; for (let d = 0; d < 8; d++) { const nx = x + HEAD[d][0], ny = y + HEAD[d][1]; if (inb(w, nx, ny) && w.plants[idx(w, nx, ny)]) lush++; } const heal = Math.min(w.worn[i], (w.laws.ecology.pastureHeal || 0) * 60 * (0.4 + lush / 4)); w.fert[i] = Math.round((w.fert[i] + heal) * 1000) / 1000; w.worn[i] -= heal; if (w.worn[i] <= 0.0005) delete w.worn[i]; }
  if (w.tick % w.laws.time.dayLength === 3) w.agents.forEach(function (a) {
    for (const id in a.rel) { const seen = a.seenAt[id]; if (Math.abs(a.rel[id]) > 0.15 && (!seen || w.tick - seen[2] > w.laws.time.dayLength)) a.rel[id] = Math.round(a.rel[id] * 0.93 * 100) / 100; }
  });
  if (w.tick % w.laws.water.fishRecover === 0) for (const fk in w.fished) { if (--w.fished[fk] <= 0) delete w.fished[fk]; }
  if (w.tick % 1200 === 0) { const oi = ri(w, w.W * w.H); if (w.terrain[oi] === T.ROCK && !w.ore[oi]) w.ore[oi] = 2 + ri(w, 3); }
  if (w.tick % 120 === 11 && w.wars.length) w.wars.forEach(function (r) {
    if (r.ended != null) return;
    const alive = function (id) { for (let k = 0; k < w.agents.length; k++) if (w.agents[k].id === id) return !w.agents[k].dead && w.agents[k].leader == null; return false; };
    if (!alive(r.a) || !alive(r.b)) { r.ended = w.tick; r.how = 'one side breaking up'; emit({ type: 'warend', war: r }); }
  });
  for (let k = 0; k < w.fresh.length; k++) emit({ type: 'variety', kind: w.fresh[k].kind, from: w.fresh[k].from, x: w.fresh[k].x, y: w.fresh[k].y, flora: w.fresh[k].flora });
  delete w.fresh;
  if (w.fields.length) {
    const gone = w.fields.filter(function (f) { return w.tick >= f.until; });
    if (gone.length) { w.fields = w.fields.filter(function (f) { return w.tick < f.until; }); gone.forEach(function (f) { emit({ type: 'faded', field: f }); }); }
  }
  if (w.edicts.length) {
    const over = w.edicts.filter(function (e) { return w.tick >= e.until; });
    if (over.length) { w.edicts = w.edicts.filter(function (e) { return w.tick < e.until; }); over.forEach(function (e) { const pp = e.path.split('.'); w.laws[pp[0]][pp[1]] = e.base; emit({ type: 'edict_end', edict: e }); }); }
  }
  if (w.tick % 120 === 0) {
    const life = w.laws.craft.markLife;
    w.marks = w.marks.filter(function (m) { return w.tick < (m.until || m.tick + life); });
  }
  if (w.tick % 600 === 0) { const gone = SW.pruneKinds(w); for (let k = 0; k < gone.length; k++) emit({ type: 'extinct', kind: gone[k] }); }
};

SW.speak = function (w, a, to, text, emit) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  if (!text) return;
  a.e -= w.laws.body.speechCost * text.length;
  const hearers = [];
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k];
    if (o !== a && !o.dead && cheb(a.x, a.y, o.x, o.y) <= w.laws.body.hearing) { hearers.push(o.id); feel(o, 'lonely', -0.2); }
  }
  let missed = null;
  if (to && to !== 'all') { const t = SW.findAgentByName(w, to); if (!t || hearers.indexOf(t.id) < 0) missed = String(to); }
  (emit || noop)({ type: 'said', a: a.id, to: to || 'all', text: text, hearers: hearers, missed: missed });
};

/* ---------- workings: a being with enough lore can bend a law of the world within a place, for a time ---------- */
SW.FIELD_LAWS = ['growth', 'cold', 'drain', 'harm'];
function fieldFactor(w, law, x, y) {
  let f = 1;
  for (let k = 0; k < w.fields.length; k++) { const q = w.fields[k]; if (q.law === law && cheb(x, y, q.x, q.y) <= q.r) f *= q.factor; }
  return f;
}
SW.fieldFactor = fieldFactor;
SW.castCost = function (w, radius, factor) { return Math.round(w.laws.magic.cost * radius * (0.5 + 2 * Math.abs(Math.log(factor))) / SW.magicFactor(w)); };
SW.cast = function (w, a, spell, emit) {
  emit = emit || noop;
  const M = w.laws.magic;
  if (!spell || typeof spell !== 'object') return { ok: false, why: 'no working named' };
  /* one art, or two woven together by a being who has learned both */
  let laws = Array.isArray(spell.law) ? spell.law.slice(0, 2) : [spell.law];
  laws = laws.filter(function (l, i) { return SW.FIELD_LAWS.indexOf(l) >= 0 && laws.indexOf(l) === i; });
  if (!laws.length) return { ok: false, why: 'unknown law' };
  if (a.lore < M.loreToCast) return { ok: false, why: 'not enough lore' };
  for (let k = 0; k < laws.length; k++) if (a.arts.indexOf(laws[k]) < 0) return { ok: false, why: 'you have not learned the art of ' + laws[k] };
  const factor = clamp(Math.round((Number(spell.factor) || 1) * 100) / 100, 0.3, 2.5), r = clamp(Math.round(Number(spell.radius) || 2), 1, M.maxRadius + (a.arts.length >= 3 ? 2 : 0));
  if (Math.abs(factor - 1) < 0.05) return { ok: false, why: 'a factor of 1 changes nothing' };
  const cost = Math.round(SW.castCost(w, r, factor) * (laws.length > 1 ? 1.6 : 1));
  if (a.e < cost + 8) { emit({ type: 'fail', a: a.id, text: 'You reached to work the world (' + spell.law + ' x' + factor + ' within ' + r + ' steps) but lacked the strength: it costs ' + cost + ' energy and you had ' + Math.round(a.e) + '.' }); return { ok: false, why: 'too weak', cost: cost }; }
  a.e -= cost; a.lore += 0.5; a.loreWhy = 'working the world';
  let f = null;
  for (let k = 0; k < laws.length; k++) {
    f = { id: w.nextId++, x: a.x, y: a.y, r: r, law: laws[k], factor: factor, by: a.id, byName: a.name, hue: a.hue, name: String(spell.name || '').replace(/[<>]/g, '').slice(0, 28), tick: w.tick, until: w.tick + M.duration, woven: laws.length > 1 ? laws.join(' + ') : '' };
    w.fields.push(f); if (w.fields.length > M.maxFields) w.fields.shift();
  }
  emit({ type: 'cast', a: a.id, field: f, laws: laws, cost: cost });
  return { ok: true, cost: cost, field: f, laws: laws };
};

/* ---------- great workings: the deepest layer. A master, with its band around it, bends a law of the WHOLE world for a time. ---------- */
SW.GREAT_LAWS = {
  'body.baseDrain': 'how fast every body burns energy',
  'body.nightCold': 'how hard the night cold bites everyone',
  'body.healRate': 'how fast every wound closes',
  'time.nightFraction': 'how much of each day is night',
  'fight.agentDamage': 'how hard every blow lands',
  'ecology.dormantSeeds': 'how readily the bare soil sprouts'
};
SW.greatReady = function (w, a) {
  const M = w.laws.magic;
  if (a.lore < M.greatLore || a.arts.length < M.greatArts) return null;
  const helpers = w.agents.filter(function (o) { return o !== a && !o.dead && cheb(o.x, o.y, a.x, a.y) <= 3 && allied(w, a, o.id) && o.e > M.helperCost + 10; });
  return { helpers: helpers, enough: helpers.length >= M.greatHelpers };
};
SW.greatWork = function (w, a, spec, emit) {
  emit = emit || noop;
  const M = w.laws.magic, rd = SW.greatReady(w, a);
  if (!rd) return { ok: false, why: 'you are not yet a master (it takes lore ' + M.greatLore + ' and ' + M.greatArts + ' arts)' };
  if (!spec || !SW.GREAT_LAWS[spec.law]) return { ok: false, why: 'that is not a law you can reach' };
  if (!rd.enough) return { ok: false, why: 'a great working needs ' + M.greatHelpers + ' of your own band standing within 3 steps of you; you had ' + rd.helpers.length };
  if (a.e < M.greatCost + 8) return { ok: false, why: 'it costs ' + M.greatCost + ' energy and you had ' + Math.round(a.e) };
  if (w.edicts.some(function (e) { return e.path === spec.law; })) return { ok: false, why: 'that law is already bent by another working' };
  const factor = clamp(Math.round((Number(spec.factor) || 1) * 100) / 100, 0.7, 1.4);
  if (Math.abs(factor - 1) < 0.04) return { ok: false, why: 'a factor of 1 changes nothing' };
  const parts = spec.law.split('.'), base = w.laws[parts[0]][parts[1]];
  w.laws[parts[0]][parts[1]] = Math.round(base * factor * 10000) / 10000;
  a.e -= M.greatCost; a.loreWhy = 'a great working'; a.lore = Math.round((a.lore + 1) * 10) / 10;
  rd.helpers.slice(0, 4).forEach(function (o) { o.e -= M.helperCost; feel(o, 'joy', 0.3); o.lore = Math.round((o.lore + 0.5) * 10) / 10; });
  const ed = { id: w.nextId++, path: spec.law, factor: factor, base: base, by: a.id, byName: a.name, hue: a.hue, name: String(spec.name || '').replace(/[<>]/g, '').slice(0, 32), x: a.x, y: a.y, tick: w.tick, until: w.tick + M.greatDuration, helpers: rd.helpers.slice(0, 4).map(function (o) { return o.id; }) };
  w.edicts.push(ed);
  emit({ type: 'edict', a: a.id, edict: ed });
  return { ok: true, edict: ed };
};

/* A being who crosses the threshold awakens to one art, the one closest to its nature. */
SW.awaken = function (w, a) {
  if (a.arts.length) return a.arts[0];
  const t = a.temperament;
  const art = t.gentle > 0.6 ? 'growth' : (t.bold > 0.65 && t.gentle < 0.35) ? 'harm' : t.greedy > 0.62 ? 'drain' : t.curious > 0.6 ? 'cold' : SW.FIELD_LAWS[ri(w, 4)];
  a.arts.push(art); return art;
};
/* Teaching passes on understanding. What the pupil does with several teachers' arts is its own. */
SW.teach = function (w, a, t, art, emit) {
  emit = emit || noop;
  const M = w.laws.magic, out = { lore: 0, art: null, why: '' };
  if (cheb(a.x, a.y, t.x, t.y) > w.laws.body.hearing) { out.why = 'too far to hear'; return out; }
  a.stats.taught++;
  if (a.lore > t.lore) { out.lore = Math.round(Math.min(1, (a.lore - t.lore) * M.teachGain) * (a.knows.schooling ? 2 : 1) * (SW.stage(w, a) === 'elder' ? w.laws.age.elderTeach : 1) * (SW.stage(w, t) === 'child' ? w.laws.age.childLearn : 1) * boon(t, 'learning') * 10) / 10; t.lore = Math.round((t.lore + out.lore) * 10) / 10; }
  if (t.teachers.indexOf(a.id) < 0) { t.teachers.push(a.id); if (t.teachers.length >= 2) { t.loreWhy = 'learning from two teachers'; t.lore = Math.round((t.lore + 0.5) * 10) / 10; out.synthesis = t.teachers.length; } }
  a.lore = Math.round((a.lore + 0.1) * 10) / 10;
  if (art && SW.FIELD_LAWS.indexOf(art) >= 0) {
    if (a.arts.indexOf(art) < 0) out.why = 'the teacher does not know that art';
    else if (t.arts.indexOf(art) >= 0) out.why = 'already known';
    else if (t.lore < M.loreToLearnArt) out.why = 'the pupil does not yet understand enough';
    else { t.arts.push(art); out.art = art; }
  }
  t.rel[a.id] = clamp((t.rel[a.id] || 0) + 0.15, -1, 1);
  emit({ type: 'taught', a: a.id, b: t.id, lore: out.lore, art: out.art, synthesis: out.synthesis || 0 });
  return out;
};

/* ---------- paths of knowledge ---------- */
/* What a being has suffered presses on it, and fades over days. Each way answers some kinds of pressure. */
SW.PRESSURES = { hunger: 'hunger', famine: 'hunger in the lean season', cold: 'cold', thirst: 'thirst', sickness: 'sickness', beasts: 'the teeth of beasts', loss: 'the deaths of your own', water: 'water you could not cross', burden: 'more than hands can carry', strife: 'blows from your own kind', storms: 'storm and calamity', strangers: 'speech you could not understand', turning: 'the year turning toward the lean season' };
SW.SPURS = { tools: { hunger: 0.3, burden: 0.4 }, fire: { cold: 1, beasts: 0.7, sickness: 0.2 }, fishing: { hunger: 0.7, famine: 0.3 }, farming: { hunger: 0.5, famine: 0.7, turning: 0.3 }, herding: { hunger: 0.3, famine: 0.5 }, signs: { loss: 0.6, strangers: 0.3 }, customs: { strife: 0.7, loss: 0.3 },
  storage: { famine: 1.2, hunger: 0.4, turning: 1 }, medicine: { sickness: 1.2, loss: 0.3, beasts: 0.3 }, weaving: { cold: 0.8, burden: 0.6, turning: 0.3 }, pottery: { thirst: 1, burden: 0.5 }, masonry: { beasts: 0.5, cold: 0.4, strife: 0.6, storms: 0.7 }, devices: { beasts: 0.6, hunger: 0.3 },
  rafts: { water: 1.2 }, lorekeeping: { loss: 0.9 }, archery: { beasts: 0.9, hunger: 0.4, strife: 0.5 }, bridges: { water: 1 }, armour: { strife: 1, beasts: 0.5 }, signals: { strife: 0.4, loss: 0.3, strangers: 0.3 }, boats: { water: 0.8 }, salting: { famine: 0.8, turning: 0.8 }, writing: { loss: 0.5, strangers: 0.4 }, schooling: { loss: 0.4 } };
SW.press = function (w, a, k, n) { if (!a || a.dead || !SW.PRESSURES[k]) return; const P = a.press = a.press || {}, mx = (w.laws.discovery || {}).pressMax || 3; P[k] = Math.min(mx, Math.round(((P[k] || 0) + n) * 1000) / 1000); };
/* how strongly a being is pressed toward one way, and by what */
SW.needFor = function (w, a, id) {
  const n = w.laws.tree[id], sp = (n && n.spur) || SW.SPURS[id], P = a.press || {}; let v = 0, top = null, tv = 0;
  if (sp) for (const k in sp) { const x = sp[k] * (P[k] || 0); v += x; if (x > tv) { tv = x; top = k; } }
  return { v: v, by: top };
};
/* what fraction of a way's full demands this being must meet: less if it has watched the way done, if need presses, if it knows neighbouring ways, if it holds what helps */
SW.easeFor = function (w, a, id) {
  const T2 = w.laws.tree, n = T2[id], D = w.laws.discovery || {}, need = SW.needFor(w, a, id); let kin = 0;
  for (const k in a.knows) if (T2[k] && T2[k].tree === n.tree && (T2[k].era || 1) <= (n.era || 1)) kin++;
  let f = (a.glimpsed[id] ? 0.5 : 1) / (1 + (D.needBoost || 0) * need.v) * Math.max(0.8, 1 - (D.kinBoost || 0) * kin);
  if (n.helps) for (const hk in n.helps) if (((a.things || {})[hk] || 0) > 0) f *= n.helps[hk];
  return { f: Math.max(D.floor || 0.35, Math.min(1, f)), need: need.v, by: need.by, kin: kin };
};
SW.pathsFor = function (w, a) {
  const T2 = w.laws.tree, open = [], near = [];
  for (const id in T2) {
    if (a.knows[id]) continue;
    const n = T2[id], miss = [];
    n.needs.forEach(function (q) { if (!a.knows[q]) miss.push('first you would need ' + q); });
    const ez = SW.easeFor(w, a, id), seen = ez.f, needLore = Math.round(n.lore * seen * 10) / 10, needN = Math.max(1, Math.ceil(n.n * seen)), why = ez.need >= 0.5 && ez.by ? SW.PRESSURES[ez.by] : '';
    if (a.lore < needLore) miss.push('more lore (' + (Math.round(a.lore * 10) / 10) + ' of ' + needLore + ')');
    const have = a.stats[n.stat] || 0;
    if (n.has) for (const hk in n.has) if (((a.things || {})[hk] || 0) < n.has[hk]) miss.push('to hold ' + n.has[hk] + ' ' + hk);
    if (have < needN) miss.push('more practice (' + ({ tamed: 'taming animals', mined: 'winning minerals from the ground', crafted: 'making tools', seasons: 'seasons lived', raised: 'labour on great works', paved: 'paving', trades: 'trading', wood: 'gathering wood and stone', built: 'building', planted: 'planting', fished: 'catching fish', ore: 'breaking ore from rock', clay: 'digging clay', healed: 'eating healing plants', marks: 'leaving marks', taught: 'teaching', led: 'being followed' }[n.stat] || n.stat) + ': ' + have + ' of ' + needN + ')');
    if (miss.length) { if (miss.length <= 2 && !n.needs.some(function (q) { return !a.knows[q]; })) near.push({ id: id, missing: miss.join(' and ') + (why ? ' (' + why + ' has brought it closer)' : ''), hint: n.hint, glimpsed: !!a.glimpsed[id], need: ez.need, by: ez.by }); }
    else open.push({ id: id, hint: n.hint, tree: n.tree, glimpsed: !!a.glimpsed[id], need: ez.need, by: ez.by, why: why });
  }
  return { open: open, near: near };
};
SW.discover = function (w, a, id, meta, emit) {
  emit = emit || noop; meta = meta || {};
  const ok = SW.pathsFor(w, a).open.some(function (o) { return o.id === id; });
  if (!ok) return false;
  const clean = function (v, n) { return String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); };
  const k = { name: clean(meta.name, 28) || id, idea: clean(meta.idea, 160), look: SW.sanitizeLook(meta.look), tick: w.tick, by: a.id, byName: a.name };
  a.knows[id] = k; a.loreWhy = 'coming to a new way'; a.lore = Math.round((a.lore + 0.3) * 10) / 10;
  w.inventions.push({ node: id, name: k.name, idea: k.idea, look: k.look, by: a.id, byName: a.name, tick: w.tick, x: a.x, y: a.y });
  if (w.inventions.length > 80) w.inventions.shift();
  emit({ type: 'discovered', a: a.id, node: id, name: k.name, idea: k.idea });
  return true;
};
SW.teachPath = function (w, a, t, id, emit) {
  emit = emit || noop;
  const k = a.knows[id], n = w.laws.tree[id];
  if (!k || !n) return 'the teacher does not know that';
  if (t.knows[id]) return 'already known';
  if (cheb(a.x, a.y, t.x, t.y) > w.laws.body.hearing) return 'too far to hear';
  if (SW.understands(t, a.lang) < 0.4) return 'the pupil does not yet understand your tongue well enough to be taught in it';
  for (let i = 0; i < n.needs.length; i++) if (!t.knows[n.needs[i]]) return 'the pupil must first know ' + n.needs[i];
  t.knows[id] = { name: k.name, idea: k.idea, look: k.look, tick: w.tick, by: k.by, byName: k.byName, via: a.id };
  emit({ type: 'learned', a: t.id, b: a.id, node: id, name: k.name });
  return '';
};

/* ---------- devices: made things with rules of their own ---------- */
SW.DEVICE_VARS = ['night', 'predator_dist', 'creature_dist', 'stranger_dist', 'band_dist', 'hold', 'random'];
SW.DEVICE_ACTS = ['snare', 'strike', 'alarm', 'bar', 'open', 'share'];
SW.sanitizeDeviceRules = function (list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (let k = 0; k < list.length && out.length < 5; k++) {
    const r = list[k]; if (!r || SW.DEVICE_ACTS.indexOf(r.do) < 0) continue;
    const cs = Array.isArray(r.if) ? r.if : [], o = { if: [], do: r.do }; let bad = false;
    for (let i = 0; i < cs.length && o.if.length < 3; i++) {
      const c = cs[i], n = Array.isArray(c) ? (c[2] === true ? 1 : c[2] === false ? 0 : Number(c[2])) : NaN;
      if (!Array.isArray(c) || SW.DEVICE_VARS.indexOf(c[0]) < 0 || SW.OPS.indexOf(c[1]) < 0 || !isFinite(n)) { bad = true; break; }
      o.if.push([c[0], c[1], n]);
    }
    if (!bad) out.push(o);
  }
  return out;
};
function stepDevices(w, emit) {
  const L = w.laws, D = L.device;
  for (const key in w.devices) {
    const d = w.devices[key], law = L.tools[d.k];
    if (!law || w.tick - d.born > D.life) { delete w.devices[key]; emit({ type: 'devgone', by: d.by, kind: d.k, x: d.x, y: d.y }); continue; }
    if (d.cool > 0) { d.cool--; continue; }
    if ((w.tick + d.x) % 2) continue;
    let pd = 99, cd = 99, sd = 99, bd = 99, pred = null, crit = null, strg = null, mate = null;
    for (let k = 0; k < w.creatures.length; k++) {
      const c = w.creatures[k]; if (c.dead) continue;
      const dist = cheb(c.x, c.y, d.x, d.y); if (dist > 4) continue;
      if (L.creatures[c.sp] && L.creatures[c.sp].predator) { if (dist < pd) { pd = dist; pred = c; } } else if (dist < cd) { cd = dist; crit = c; }
    }
    for (let k = 0; k < w.agents.length; k++) {
      const o = w.agents[k]; if (o.dead) continue;
      const dist = cheb(o.x, o.y, d.x, d.y); if (dist > 6) continue;
      if (allied(w, o, d.by)) { if (dist < bd) { bd = dist; mate = o; } } else if (dist < sd) { sd = dist; strg = o; }
    }
    const vars = { night: SW.isNight(w) ? 1 : 0, predator_dist: pd, creature_dist: cd, stranger_dist: sd, band_dist: bd, hold: d.hold.length, random: rnd(w) };
    for (let i = 0; i < law.rules.length; i++) {
      const r = law.rules[i]; if (!matches(vars, r)) continue;
      let did = false;
      if (r.do === 'bar') { if (!d.barred) { d.barred = 1; did = true; } else continue; }
      else if (r.do === 'open') { if (d.barred) { d.barred = 0; did = true; } else continue; }
      else if (r.do === 'alarm') { const what = pred && pd <= sd ? pred.sp : strg ? strg.name : null; if (!what) continue; emit({ type: 'alarm', by: d.by, kind: d.k, x: d.x, y: d.y, what: what, stranger: strg && !(pred && pd <= sd) ? strg.id : null }); d.cool = 80; did = true; }
      else if (r.do === 'snare') {
        if (!crit || cd > 1 || d.hold.length >= D.holdMax) continue;
        const cs = L.creatures[crit.sp]; if ((cs.tough || 1) > 1) continue;
        crit.dead = true; for (let n = 0; n < cs.meat && d.hold.length < D.holdMax; n++) d.hold.push({ k: 'meat', n: cs.meatEnergy });
        emit({ type: 'snared', by: d.by, kind: d.k, prey: crit.sp, x: d.x, y: d.y }); d.cool = 30; did = true;
      }
      else if (r.do === 'strike') {
        if (pred && pd <= 1) { const cs = L.creatures[pred.sp]; pred.wounds = (pred.wounds || 0) + 1; if (pred.wounds >= (cs.tough || 1)) pred.dead = true; emit({ type: 'devstruck', by: d.by, kind: d.k, what: pred.sp, x: d.x, y: d.y }); d.cool = 8; did = true; }
        else if (strg && sd <= 1) { emit({ type: 'devstruck', by: d.by, kind: d.k, a: strg.id, what: strg.name, x: d.x, y: d.y }); strg.rel[d.by] = clamp((strg.rel[d.by] || 0) - 0.4, -1, 1); feel(strg, 'anger', 0.3); feel(strg, 'fear', 0.3); hurtAgent(w, strg, D.strike, 'killed by a ' + d.k + ' set by ' + (w.names && d.byName ? d.byName : 'another'), emit); d.cool = 8; did = true; }
        else continue;
      }
      else if (r.do === 'share') {
        if (!mate || bd > 1 || !d.hold.length || mate.e >= 50 || mate.carry.length >= cap(w, mate)) continue;
        mate.carry.push(d.hold.pop()); emit({ type: 'shared', by: d.by, a: mate.id, kind: d.k }); d.cool = 10; did = true;
      }
      if (did) break;
    }
  }
}

/* ---------- settlements: where a band has built enough in one place, the place becomes theirs ---------- */
SW.findSettlements = function (w, emit) {
  emit = emit || noop;
  const H = w.laws.home, pts = [], alive = {};
  w.agents.forEach(function (a) { if (!a.dead) alive[a.id] = rootOf(w, a).id; });
  const add = function (i, owner) { const r = alive[owner]; if (r != null) pts.push({ x: i % w.W, y: Math.floor(i / w.W), root: r, c: -1 }); };
  for (let i = 0; i < w.shelters.length; i++) {
    if (w.shelters[i] > 0) add(i, w.shelters[i]); else if (w.walls[i]) add(i, w.walls[i]); else if (w.stores[i] && w.stores[i].by) add(i, w.stores[i].by);
  }
  for (const k in w.devices) add(+k, w.devices[k].by);
  const out = []; let nc = 0;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].c >= 0) continue;
    const q = [i]; pts[i].c = nc;
    for (let h = 0; h < q.length; h++) for (let j = 0; j < pts.length; j++) if (pts[j].c < 0 && pts[j].root === pts[q[h]].root && cheb(pts[j].x, pts[j].y, pts[q[h]].x, pts[q[h]].y) <= H.reach) { pts[j].c = nc; q.push(j); }
    if (q.length >= H.minStructures) {
      let sx = 0, sy = 0; q.forEach(function (k) { sx += pts[k].x; sy += pts[k].y; });
      const cx = Math.round(sx / q.length), cy = Math.round(sy / q.length); let r = 0;
      q.forEach(function (k) { r = Math.max(r, cheb(pts[k].x, pts[k].y, cx, cy)); });
      out.push({ x: cx, y: cy, r: r + H.margin, root: pts[i].root, n: q.length });
    }
    nc++;
  }
  const old = w.settlements || [];
  out.forEach(function (st) {
    const prev = old.filter(function (o) { return o.root === st.root && cheb(o.x, o.y, st.x, st.y) <= 6; })[0];
    const root = w.agents.filter(function (a) { return a.id === st.root; })[0];
    st.id = prev ? prev.id : w.nextId++;
    let named = null, nd = 99;
    w.places.forEach(function (pl) { const d = cheb(pl.x, pl.y, st.x, st.y); if (d <= st.r && d < nd && alive[pl.by] === st.root) { nd = d; named = pl.name; } });
    st.name = named || (prev && prev.name) || ((root && root.bandName) ? 'Home of ' + root.bandName : (root ? root.name : 'Someone') + "'s Hold");
    st.since = prev ? prev.since : w.tick;
    if (!prev) emit({ type: 'settled', set: st });
  });
  old.forEach(function (o) { if (!out.some(function (st) { return st.id === o.id; })) emit({ type: 'abandoned', set: o }); });
  w.settlements = out;
};
function homeOf(w, a) {
  const r = rootOf(w, a).id; let best = null, bd = 1e9;
  for (let k = 0; k < w.settlements.length; k++) { const st = w.settlements[k]; if (st.root !== r) continue; const d = cheb(a.x, a.y, st.x, st.y); if (d < bd) { bd = d; best = st; } }
  return best;
}
SW.homeOf = homeOf;

/* ---------- invention: the world offers uses; what gets made, named and drawn is the maker's ---------- */
SW.invent = function (w, a, meta, emit) {
  emit = emit || noop; meta = meta || {};
  const C = w.laws.craft, reg = w.laws.tools;
  if (!a.knows.tools) return { ok: false, why: 'you have not yet found the way of making tools' };
  if (Object.keys(reg).length >= C.maxDesigns) return { ok: false, why: 'the world holds as many designs as it can' };
  const pk = String(meta.improves || '').toLowerCase().trim(), parent = pk && a.designs[pk] ? reg[pk] : null;
  const use = parent ? parent.use : String(meta.use || '').toLowerCase();
  if (use === 'device') {
    if (!a.knows.devices) return { ok: false, why: 'you have not yet found the way of devices' };
    const rules = SW.sanitizeDeviceRules(meta.rules);
    if (!rules.length) return { ok: false, why: 'a device needs at least one well-formed rule' };
    let dn = String(meta.name || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'device';
    if (reg[dn]) { let n = 2; while (reg[dn + ' ' + n]) n++; dn = dn + ' ' + n; }
    reg[dn] = { use: 'device', power: 1, wood: w.laws.device.wood, stone: w.laws.device.stone, wear: 0, rules: rules, look: SW.sanitizeLook(meta.look), idea: String(meta.idea || '').replace(/[<>]/g, '').slice(0, 160), by: a.id, byName: a.name, from: '', tick: w.tick };
    a.designs[dn] = 1; a.stats.invented++; a.loreWhy = 'inventing'; a.lore = Math.round((a.lore + 0.7) * 10) / 10;
    emit({ type: 'invented', a: a.id, kind: dn, use: 'device', power: 1, from: '' });
    return { ok: true, name: dn };
  }
  if (SW.TOOL_USES.indexOf(use) < 0) return { ok: false, why: 'a tool must be for one of: ' + SW.TOOL_USES.join(', ') };
  const cap = C.toolPower + a.lore * C.toolLore;
  const power = Math.round(Math.min(cap, parent ? parent.power * C.toolGrowth : C.toolPower) * 100) / 100;
  if (parent && power <= parent.power + 0.01) return { ok: false, why: 'you do not yet understand enough to better the ' + pk + ' (more lore is needed)' };
  let name = String(meta.name || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || (use + ' tool');
  if (reg[name]) { let n = 2; while (reg[name + ' ' + n]) n++; name = name + ' ' + n; }
  reg[name] = { use: use, power: power, wood: parent ? parent.wood : 1, stone: parent ? Math.min(5, parent.stone + 1) : 1, wear: Math.round(C.toolWear * (parent ? 1.1 : 1)), look: SW.sanitizeLook(meta.look), idea: String(meta.idea || '').replace(/[<>]/g, '').slice(0, 160), by: a.id, byName: a.name, from: parent ? pk : '', tick: w.tick };
  a.designs[name] = 1; a.stats.invented++; a.lore = Math.round((a.lore + 0.5) * 10) / 10;
  emit({ type: 'invented', a: a.id, kind: name, use: use, power: power, from: parent ? pk : '' });
  return { ok: true, name: name };
};
SW.teachDesign = function (w, a, t, name) {
  const key = String(name || '').toLowerCase().trim();
  if (!a.designs[key] || !w.laws.tools[key]) return 'the teacher does not know that design';
  if (t.designs[key]) return 'already known';
  if (cheb(a.x, a.y, t.x, t.y) > w.laws.body.hearing) return 'too far to hear';
  if (SW.understands(t, a.lang) < 0.4) return 'the pupil does not yet understand your tongue well enough to be taught in it';
  t.designs[key] = 1; return '';
};

/* Seeing a craft practised by one who knows it: every watcher who lacks it gets a glimpse. */
SW.glimpse = function (w, a, node, emit) {
  if (!a.knows[node]) return;
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k];
    if (o !== a && !o.dead && !o.knows[node] && !o.glimpsed[node] && cheb(o.x, o.y, a.x, a.y) <= SW.sight(w)) { o.glimpsed[node] = a.id; (emit || noop)({ type: 'glimpsed', a: o.id, b: a.id, node: node, name: a.knows[node].name }); }
  }
};

/* ---------- bands: what a people declares ---------- */
SW.declare = function (w, a, target, stance, emit) {
  emit = emit || noop;
  if (a.leader != null || ['ally', 'enemy', 'neutral'].indexOf(stance) < 0) return false;
  const name = String(target || '').toLowerCase();
  let t = SW.findAgentByName(w, target);
  if (!t) t = w.agents.filter(function (o) { return !o.dead && o.leader == null && (o.bandName || '').toLowerCase() === name; })[0];
  if (!t) return false;
  const root = rootOf(w, t); if (root === a) return false;
  if ((a.stances[root.id] || 'neutral') === stance) return false;
  if (stance === 'neutral') delete a.stances[root.id]; else a.stances[root.id] = stance;
  emit({ type: 'stance', a: a.id, b: root.id, stance: stance });
  const wr = warBetween(w, a.id, root.id);
  if (stance === 'enemy' && !wr) {
    const nm = function (q) { return q.bandName || q.name; };
    const war = { id: w.nextId++, a: a.id, b: root.id, aName: nm(a), bName: nm(root), since: w.tick, dead: 0, blows: 0, ended: null, how: '' };
    w.wars.push(war); if (w.wars.length > 40) w.wars.shift();
    emit({ type: 'war', war: war });
  } else if (stance !== 'enemy' && wr && (root.stances[a.id] || 'neutral') !== 'enemy') {
    wr.ended = w.tick; wr.how = 'a truce offered by ' + a.name; emit({ type: 'truce', war: wr, by: a.id });
  }
  return true;
};
SW.custom = function (w, a, text, emit) {
  emit = emit || noop;
  if (a.leader != null || !a.knows.customs) return false;
  text = String(text || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!text || a.customs.indexOf(text) >= 0) return false;
  a.customs.push(text); if (a.customs.length > 6) a.customs.shift();
  emit({ type: 'custom', a: a.id, text: text });
  return true;
};
SW.namePlace = function (w, a, name, emit) {
  emit = emit || noop;
  name = String(name || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  if (!name) return false;
  w.places = w.places.filter(function (p) { return cheb(p.x, p.y, a.x, a.y) > 4; });
  w.places.push({ id: w.nextId++, x: a.x, y: a.y, name: name, by: a.id, byName: a.name, tick: w.tick });
  if (w.places.length > 40) w.places.shift();
  emit({ type: 'named', a: a.id, name: name, x: a.x, y: a.y });
  return true;
};

/* ---------- allegiance: who follows whom is each being's own choice ---------- */
SW.pledge = function (w, a, name, emit) {
  emit = emit || noop;
  if (!name || /^(none|no one|nobody|null)$/i.test(String(name))) {
    if (a.leader != null) { const was = a.leader; a.leader = null; emit({ type: 'broke', a: a.id, b: was }); return true; }
    return false;
  }
  const t = SW.findAgentByName(w, name);
  if (!t || t === a || a.leader === t.id) return false;
  { const need = (w.laws.status || {}).leadNeeds || 0, ts = SW.status(w, t), as = SW.status(w, a), kin = (a.parents || []).indexOf(t.id) >= 0; if (!kin && (ts < need || ts < as)) { w.tally.pledgesRefused = w.tally.pledgesRefused || []; w.tally.pledgesRefused.push({ day: SW.day(w), who: a.name, to: t.name, theirStanding: ts, ownStanding: as, needed: need }); if (w.tally.pledgesRefused.length > 20) w.tally.pledgesRefused.shift(); emit({ type: 'fail', a: a.id, text: 'You meant to pledge yourself to ' + t.name + ', but something in you would not bend: ' + t.name + (ts < as ? ' stands no higher among others than you do' : ' has not yet the standing that draws a following') + '. People follow one who has built, given, known, won or been sung of more than they have themselves.' }); return false; } }
  let cur = t;
  for (let k = 0; k < 8 && cur; k++) { if (cur === a) return false; cur = cur.leader != null ? w.agents.filter(function (o) { return o.id === cur.leader && !o.dead; })[0] : null; }
  const was = a.leader; a.leader = t.id;
  emit({ type: 'pledged', a: a.id, b: t.id, was: was });
  return true;
};
SW.bandOf = function (w, a) {
  const root = rootOf(w, a);
  const members = w.agents.filter(function (o) { return !o.dead && rootOf(w, o) === root; });
  if (members.length < 2) return null;
  return { leader: root, name: root.bandName || root.name + "'s band", members: members, customs: root.customs, stances: root.stances };
};

/* ---------- self-programming: validate a reflex list written by a mind ---------- */
SW.sanitizeRule = function (r) {
  if (!r || typeof r !== 'object' || SW.ACTIONS.indexOf(r.do) < 0) return null;
  const out = { if: [], do: r.do };
  const cs = Array.isArray(r.if) ? r.if : [];
  for (let k = 0; k < cs.length && out.if.length < 5; k++) {
    const c = cs[k];
    if (!Array.isArray(c) || SW.VARS.indexOf(c[0]) < 0 || SW.OPS.indexOf(c[1]) < 0) return null;
    const n = c[2] === true ? 1 : c[2] === false ? 0 : Number(c[2]);
    if (!isFinite(n)) return null;
    out.if.push([c[0], c[1], n]);
  }
  const str = function (v, n) { return String(v).replace(/[^\w ,.'()-]/g, '').slice(0, n); };
  if (r.target != null) out.target = str(r.target, 12);
  if (r.from != null) out.from = str(r.from, 12);
  if (r.name != null) out.name = str(r.name, 16);
  if (r.what != null) out.what = str(r.what, 24);
  if (r.text != null) out.text = String(r.text).replace(/[<>]/g, '').slice(0, 160);
  if (r.want != null) out.want = str(r.want, 8);

  if (r.aim != null && SW.AIMS.indexOf(r.aim) >= 0) out.aim = r.aim;
  if (r.look != null) { const lk = SW.sanitizeLook(r.look); if (lk) out.look = lk; }
  if (r.dir != null) out.dir = SW.DIRS[r.dir] ? r.dir : 'N';
  if (r.x != null) out.x = Math.round(+r.x) || 0;
  if (r.y != null) out.y = Math.round(+r.y) || 0;
  if (r.urgent) out.urgent = true;
  if (r.why) out.why = String(r.why).slice(0, 90);
  return out;
};
SW.sanitizePolicy = function (list) {
  const out = []; let dropped = 0;
  if (!Array.isArray(list)) return { policy: out, dropped: 0 };
  for (let k = 0; k < list.length; k++) {
    const r = SW.sanitizeRule(list[k]);
    if (r && out.length < 12) out.push(r); else dropped++;
  }
  return { policy: out, dropped: dropped };
};
SW.sanitizePlan = function (list) {
  const out = []; let dropped = 0;
  if (!Array.isArray(list)) list = list && typeof list === 'object' ? [list] : [];
  for (let k = 0; k < list.length && out.length < 5; k++) { const it = SW.sanitizeIntent(list[k]); if (it) out.push(it); else dropped++; }
  return { plan: out, dropped: dropped };
};
SW.sanitizeIntent = function (r) {
  const s = SW.sanitizeRule(r); if (!s) return null;
  delete s.if; delete s.urgent; delete s.why;
  s.ticks = clamp(Math.round(+r.ticks) || 60, 1, 240);
  return s;
};

/* ---------- foresight: live a candidate reflex list forward in a copy of the world ---------- */
SW.clone = function (w) {
  return typeof structuredClone === 'function' ? structuredClone(w) : JSON.parse(JSON.stringify(w));
};
SW.forecast = function (w, agentId, policy, ticks) {
  const c = SW.clone(w);
  let a = null;
  for (let k = 0; k < c.agents.length; k++) if (c.agents[k].id === agentId) a = c.agents[k];
  if (!a) return { error: 'not alive' };
  a.policy = policy; a.intent = null;
  const start = a.e, bites0 = a.stats.bites;
  let minE = a.e, cause = null, lived = 0;
  const idle = { n: 0 };
  for (let t = 0; t < ticks; t++) {
    SW.step(c, function (ev) { if (ev.type === 'death' && ev.a === agentId) cause = ev.cause; });
    if (cause) break;
    lived++; if (a.e < minE) minE = a.e; if (a.doing === 'idle') idle.n++;
  }
  return {
    survived: !cause, died_of: cause, moments_lived: lived, of: ticks,
    energy_start: Math.round(start), energy_lowest: Math.round(minE), energy_end: cause ? 0 : Math.round(a.e),
    bites_eaten: a.stats.bites - bites0, moments_idle: idle.n, food_carried_end: a.carry.length, health_end: Math.round(Math.max(0, a.hp))
  };
};

/* ---------- what a being perceives, for its mind ---------- */
SW.compass = function (dx, dy) {
  if (!dx && !dy) return 'here';
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const ns = dy < 0 ? 'N' : 'S', ew = dx > 0 ? 'E' : 'W';
  if (ay > 2 * ax) return ns; if (ax > 2 * ay) return ew; return ns + ew;
};
SW.look = function (w, a) {
  const R = SW.sight(w) + (function () { const k = buildingAt(w, idx(w, a.x, a.y)); return k ? w.laws.buildings[k].sight || 0 : 0; })(), plants = [], shelters = [], creatures = [], agents = [], walls = {}, fires = [], stores = [], halls = [], lodes = [];
  let water = null, seam = null;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = a.x + dx, y = a.y + dy; if (!inb(w, x, y)) continue;
    const i = idx(w, x, y), d = Math.max(Math.abs(dx), Math.abs(dy));
    const p = w.plants[i];
    if (p) plants.push({ sp: p.sp, x: x, y: y, d: d, dir: SW.compass(dx, dy), food: p.g >= 1 ? Math.floor(p.food + 1e-9) : 0, young: p.g < 1 });
    if (w.shelters[i]) shelters.push({ x: x, y: y, d: d, dir: SW.compass(dx, dy), owner: w.shelters[i], kind: w.bkind && w.bkind[i] ? w.bkind[i] : null });
    if (w.lodes && w.lodes[i] && d <= R && !((w.laws.minerals[w.lodes[i].k] || {}).sees && !a.knows[w.laws.minerals[w.lodes[i].k].sees])) lodes.push({ x: x, y: y, d: d, dir: SW.compass(dx, dy), k: w.lodes[i].k, deep: !!(w.laws.minerals[w.lodes[i].k] || {}).deep });
    if (w.walls[i]) walls[w.walls[i]] = (walls[w.walls[i]] || 0) + 1;
    if (w.fires[i] > w.tick) fires.push({ x: x, y: y, d: d, dir: SW.compass(dx, dy), left: w.fires[i] - w.tick });
    if (w.stores[i]) stores.push({ x: x, y: y, d: d, dir: SW.compass(dx, dy), owner: w.stores[i].by, n: w.stores[i].items.length });
    if ((w.terrain[i] === T.WATER || w.terrain[i] === T.SHALLOWS) && (!water || d < water.d)) water = { x: x, y: y, d: d, dir: SW.compass(dx, dy), river: !!w.river[i] };
    if (w.ore[i] && (!seam || d < seam.d)) seam = { x: x, y: y, d: d, dir: SW.compass(dx, dy) };
  }
  for (let k = 0; k < w.creatures.length; k++) {
    const c = w.creatures[k], d = cheb(a.x, a.y, c.x, c.y);
    if (d <= R) creatures.push({ sp: c.sp, x: c.x, y: c.y, d: d, dir: SW.compass(c.x - a.x, c.y - a.y), predator: !!(w.laws.creatures[c.sp] && w.laws.creatures[c.sp].predator) });
  }
  for (let k = 0; k < w.agents.length; k++) {
    const o = w.agents[k]; if (o === a || o.dead) continue;
    const d = cheb(a.x, a.y, o.x, o.y);
    if (d <= R) agents.push({ id: o.id, name: o.name, x: o.x, y: o.y, d: d, dir: SW.compass(o.x - a.x, o.y - a.y), e: o.e, hp: o.hp, doing: o.doing, carrying: o.carry.length, young: SW.stage(w, o) === 'child', old: SW.stage(w, o) === 'elder', sick: o.sick > 0, status: SW.status(w, o), role: SW.roleOf(w, o), suffer: o.suffer || 0, happy: o.happy == null ? 0.4 : o.happy, thirst: o.thirst || 0, mounted: !!o.mount, leader: o.leader, mood: o.mood, stance: stanceToward(w, a, o), theirs: stanceToward(w, o, a), tools: o.tools.map(function (q) { return q.k; }) });
  }
  const marks = [];
  for (let k = 0; k < w.marks.length; k++) {
    const m = w.marks[k], d = cheb(a.x, a.y, m.x, m.y);
    if (d <= SW.sight(w)) marks.push({ x: m.x, y: m.y, d: d, dir: SW.compass(m.x - a.x, m.y - a.y), name: m.name, by: m.by, text: m.text });
  }
  const devices = [];
  for (const dk in w.devices) { const dv = w.devices[dk], d = cheb(a.x, a.y, dv.x, dv.y); if (d <= SW.sight(w)) devices.push({ k: dv.k, by: dv.by, byName: dv.byName, x: dv.x, y: dv.y, d: d, dir: SW.compass(dv.x - a.x, dv.y - a.y), barred: dv.barred, hold: dv.hold.length, mine: allied(w, a, dv.by) }); }
  const myRoot = rootOf(w, a).id, sets = [], wars = [];
  w.wars.forEach(function (r) { if (r.ended == null && (r.a === myRoot || r.b === myRoot)) wars.push({ name: r.a === myRoot ? r.bName : r.aName, days: Math.floor((w.tick - r.since) / w.laws.time.dayLength), dead: r.dead }); });
  for (let k = 0; k < w.settlements.length; k++) { const stl = w.settlements[k], d = cheb(a.x, a.y, stl.x, stl.y); if (d <= 36 || stl.root === myRoot) sets.push({ name: stl.name, x: stl.x, y: stl.y, d: d, dir: SW.compass(stl.x - a.x, stl.y - a.y), mine: stl.root === myRoot, root: stl.root, inside: d <= stl.r, n: stl.n }); }
  sets.sort(function (p, q) { return p.d - q.d; });
  /* the lie of the land a little beyond sight, and named places within a day's walk */
  const around = {};
  for (const dn in SW.DIRS) { const dv = SW.DIRS[dn], tx = a.x + dv[0] * 10, ty = a.y + dv[1] * 10; around[dn] = inb(w, tx, ty) ? SW.TERRAIN[w.terrain[idx(w, tx, ty)]] : 'the edge of the world'; }
  const places = [];
  for (let k = 0; k < w.places.length; k++) { const pl = w.places[k], d = cheb(a.x, a.y, pl.x, pl.y); if (d <= 30) places.push({ name: pl.name, x: pl.x, y: pl.y, d: d, dir: SW.compass(pl.x - a.x, pl.y - a.y), byName: pl.byName }); }
  places.sort(function (p, q) { return p.d - q.d; });
  const fields = [];
  for (let k = 0; k < w.fields.length; k++) {
    const f = w.fields[k], d = Math.max(0, cheb(a.x, a.y, f.x, f.y) - f.r);
    if (d <= SW.sight(w)) fields.push({ x: f.x, y: f.y, r: f.r, d: d, inside: d === 0, byName: f.byName, by: f.by, name: f.name, law: f.law, factor: f.factor, left: f.until - w.tick });
  }
  const byD = function (p, q) { return p.d - q.d; };
  marks.sort(byD);
  plants.sort(byD); creatures.sort(byD); agents.sort(byD); shelters.sort(byD);
  return { lodes: lodes, region: SW.regionAt(w, a.x, a.y), plants: plants, shelters: shelters, creatures: creatures, agents: agents, marks: marks, walls: walls, fields: fields, fires: fires, stores: stores, around: around, places: places, devices: devices, settlements: sets, water: water, seam: seam, wars: wars, sites: (w.sites || []).filter(function (q) { return cheb(q.x, q.y, a.x, a.y) <= R; }).map(function (q) { return { name: q.name, kind: q.kind, x: q.x, y: q.y, d: cheb(q.x, q.y, a.x, a.y), dir: SW.compass(q.x - a.x, q.y - a.y), met: !!(a.met && a.met[q.id] != null) }; }), terrain: SW.TERRAIN[w.terrain[idx(w, a.x, a.y)]] };
};

SW.census = function (w) {
  let plants = 0, food = 0; const c = { hopper: 0, stalker: 0 };
  const L = w.laws;
  for (let i = 0; i < w.plants.length; i++) { const p = w.plants[i]; if (p) { plants++; if (p.g >= 1 && w.laws.plants[p.sp] && w.laws.plants[p.sp].nutrition > 0) food += Math.floor(p.food); } }
  for (let k = 0; k < w.creatures.length; k++) { const s = L.creatures[w.creatures[k].sp]; if (s) c[s.predator ? 'stalker' : 'hopper']++; }
  return { agents: w.agents.length, plants: plants, food: food, hopper: c.hopper, stalker: c.stalker, plantKinds: Object.keys(L.plants).length, creatureKinds: Object.keys(L.creatures).length };
};

if (typeof module !== 'undefined' && module.exports) module.exports = SW;
root.SW = SW;
})(typeof window !== 'undefined' ? window : globalThis);
