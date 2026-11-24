# Working on Evolu (instructions for Claude)

Evolu is a self-modifying world simulation by Nova Spivack that runs as a Claude artifact. Read `README.md` for what it is. This file is how the work is done.

## The source of record

- `src/` holds the artifact, exactly as published: `index.html`, `engine.js`, `minds.js`, `maker.js`, `audio.js`, `ui.js`. No build step.
- The live artifact is titled "Evolu", slug `be8f1f8f-42db-4703-ac0d-c3e87d04f447`, owned by Nova. Publish the six files to that slug (base version = the live version). Its capabilities `sample`, `db`, `user`, `downloads` carry forward.
- Nova stops the world before he asks for work (he said so on 23 Nov 2026): when he hands over a run file or asks for a build, the world is not running and the work may be published when it passes.
- **While Nova is running a world, do nothing he can see.** Do not publish (it reloads the open page), do not send files into the conversation, do not show an artifact, do not attach or register anything. A run was cut short on 22 Nov 2026 by something of this kind. Finish every visible step before telling him a generation is ready, then stop, and wait for him to say the run is over.
- One commit per published generation, message `Generation N: <one line>`. `src/` at that commit must be what is live.

## Work in progress

`docs/overnight-plan.md` is the checklist of the waves asked for on 23 Nov 2026 (Generations 29 to 32). If it has unticked items, that is the work: read it first, tick what ships, and keep `ROADMAP.md` in step.

## When you are handed a run file

The file's `_READ_ME_FIRST` says the same thing more briefly. Do this without being asked:

1. **Analyse with code, not by skimming.** Load the JSON in Python (`python3 -I`). Count: births, deaths and causes by day; top drives; what was built, made, given, mined, tamed, traded, stolen, fought; ways learned and when; tongues understood; standing and followers; prompt sizes; failed calls. Quote the record. Put the file in `runs/` and add it to `runs/README.md`.
2. **Read the maker.** Its visits, each prediction against what happened, its lessons, and above all its `request` records: things it could not build from its parts. Answer each one, or say why not.
3. **Build the next generation** in `src/`: fixes the run calls for, the maker's requests, then items from `ROADMAP.md` in order (NOW before NEXT). Be ambitious, but do not pull FAR items forward.
4. **Fold in the heritage.** The run file's `heritage` lists every change the maker made and kept, with lessons and ideas. Add them to `K.HERITAGE` in `src/maker.js`. Drop only what the record shows did harm.
5. **Keep the two roadmaps in step:** `ROADMAP.md` and `K.SEED` in `src/maker.js`.
6. **Test**, then publish, then commit and push: `src/`, tests, `docs/design-log.md` (a "What the Nth run showed" section and a "Generation N" section, newest first), `ROADMAP.md`.
7. **Report plainly** to Nova: what the run showed with numbers, what changed and why, what was verified and what could not be. Send him the design log as a file as well.

## When a run was cut short and there is no file

The page writes each run to the artifact's store as it goes. With the artifact database tools:

- `runs` holds one document per run (generation, day, thoughts, alive). Query it with `where: {generation: N}`.
- `runs/<run id>/state/latest` is the final state of every being with the tallies and, from Generation 15, a summary of the culture. It is about 100 KB: read it once, with care for your context. From Generation 27 it is a head (brief beings, culture, verse, traditions, `parts`: how many) and the full beings are in `state/beings-0`, `state/beings-1`, ...: read a part only if a being's detail is needed.
- `runs/<run id>/state/maker` (from Generation 15) is the maker's visits, requests, lessons and heritage.
- `runs/<run id>/chunks` is the full record. Do not list it: it is megabytes. Ask Nova for the downloaded run log if the thoughts themselves are needed.

## Design rules

- Open and emergent. Make things possible; give them a cost and a use; never script an outcome.
- New content should be **data in the laws registry** acting through the effects language (`SW.FX_NOW`, `SW.FX_BOON`), so the maker can make more of it. Add code only for a new kind of mechanic.
- Give the maker a lever and a statistic for everything new (`K.applyOp`, `K.OPS`, `K.stats`, `LAW_GROUPS`).
- Tell a being only what it could perceive. When an act fails, say why, to that being.
- The engine is deterministic for a seed. Use `rnd(w)`, never `Math.random()`, inside the world step.
- A world saved by the previous generation must still load: extend `SW.upgrade` (engine) and the normaliser in `M.restore` (minds). Bump `settings.v` when settings change. `SAVE_KEY` keeps the old name `seedworld.save.v4` on purpose. Worlds are also kept by name in IndexedDB (`LIB` in `ui.js`: stores `meta` and `snap`, keyed by run id); never write code that begins a world without first saving the one being left, and never let an unchosen world (`U.choosing`) save over anything.
- Watch prompt size (`M.buildPrompt`); the middle prompt was 24,000 characters in the eighth run and 30,700 in the fourteenth. **Measure before promising:** split the kept prompts of a run by section and see what grew. In the fourteenth run about 19,000 characters were standing text and only 6,000 were memory, most of it already windowed, so paging history saved 800 characters where I had told Nova 5,000.
- A being's longer memory (`mind.jr`, `mind.files`, `mind.fidx`; `journal`, `M.closeYear`, `M.recall`, `M.remind`, `M.memoryIndex`) is a field of the mind and nothing else: it is saved, restored and exported with the world because the mind is. Never put a being's history in a module-level variable, in `localStorage` under its own key, or in the artifact's store outside `runs/<run id>`: it would leak between worlds. Anything new that is written to the journal goes through `journal(st, mind, text, weight)`.
- A world may be carried on across generations (same run id). `SW.upgrade` moves a law to its re-tuned value only where the world still holds the old default; add to that table when you re-tune a law.
- Measure balance changes on at least ten seeds before believing them: three seeds swing by several deaths either way. Survival on instinct alone cannot show what minds do with stores, fire and shelter.
- Watch speed: a world moment costs about 2.8 ms since the world grew a veiled rim (Generation 17); do not let it rise further. Compare generations on the same machine in the same sitting (`/tmp`-style script over twelve seeds): the cost rises with the number alive.
- **A world made since Generation 20 goes round** (`w.wrap`): x wraps, y does not. Always go through `idx(w, x, y)`, `inb`, `cheb`, `wdx` (shortest signed east-west difference), `wrapX` and `SW.compass`; never compute `y * w.W + x` from an x that may be off the map, never take `a.x - b.x` as a distance or a direction, and never clamp x to `0..W-1` for a wrapped world. `cheb` and `wdx` read the width of the world in use, which `use(w)` sets: `SW.step`, `SW.look`, `M.onEvent`, `M.apply`, `M.tick` and `K.stats` call it; a new entry point that measures distances must too. A world made before stays flat (`w.wrap` unset) and both must keep working: `tests/14` covers each.
- Kinds of plant and animal whose country may not have been seen yet are listed in `BASE_KINDS`, or `pruneKinds` strikes them from the world within three days. Add every new native kind there.
- Climate (`SW.climate`: 1 warm, 2 ice, 0 between) comes from the biome of the region and, on a round world, from latitude: a warm belt about the equator whatever the country (law `climate.belt`). It is kept beside the world in a `WeakMap` (`climArr`), never in it, and is made again when the belt or the regions change. It acts in `stepPlants`, in the cold on a body, and in the snow and leaf veils the page paints.
- The sky belongs to a place: use `skyAt(w, i)` / `SW.skyAt(w, x, y)` for anything a body, a plant or a viewer feels (snow is rain in the belt, rain is snow on the ice, the belt's winter is rain). `w.weather.kind` is only the weather of the world as a whole.
- When an act now does more for a mind's plan (as `eat` and `harvest` walk to food), gate it on `r === a.intent`, so a body on instinct alone behaves as before and balance can still be compared with the generation before.
- Terrain numbers are not in the order one would guess: `T.SAND` is 1, `T.ROCK` 4, `T.SHALLOWS` 5, `T.MARSH` 6, `T.DESERT` 7, `T.SNOW` 8. Water is 0 and 5. Never write a bare number for a terrain without looking at `T` (a check for "not water" as `0 or 1` shipped in a test and nearly in the maker in Generation 22).
- Rich ground is a list of rounds in the world (`w.rich`); which tiles they cover is kept beside it (`richArr`, like the climate). It is placed by a chance of its own (`seedRich`), so adding it did not move the world's stream of chance at creation; keep new furniture of the land that way.
- An empty body collapses and drains (`body.starveHarm`); it no longer dies at once. A check that needs a death by hunger sets `hp` low or the law high. A check that needs a being to stay hungry and still must hold its place and empty its hands each moment: a starving body follows the smell of food, begs, takes from stores and is fed by its own.
- A plan step from a mind keeps only the fields `SW.sanitizeRule` knows (`name`, `what`, `want`, `target`, `from`, ...). A new act must take its options in one of those, or the option is silently dropped: `muster` takes `what`, not `for`.
- A law re-tune in `SW.upgrade` gets its own flag on the world (`w.rich22`); do not move `w.tuned2` forward to skip a block, which also skips the older blocks for older worlds.
- Plants are stepped every other moment at double rates. A new per-moment rate in `stepPlants` must be doubled.
- On the page, `sx()` wraps and `toWorld()` returns a wrapped x; whole-map images are laid with `lay()`. The globe (`drawSpace`) is used when `isGlobe()`.
- Boxes of speech and thought are all placed (`placeBubbles`, with the panels from `hudRects`) before any is drawn, and `U.laid` holds where they went. Never place a box by itself with a fixed offset: that is how speech came to be drawn over thought. Anything new shown as a box over the map goes through the same placing; a new panel over the map is added to `hudRects`. `tests/19-boxes-of-speech-and-thought.js` (by chance scenes, in Node) and `tests/browser/bubbles.js` (on the page) check it.
- The chronicler writes from everything recorded since the last chapter (`K.span`): memory and the save keep that much (`M.kept`, `M.CHRON`). Never cut what something writes from by a fixed tail (`slice(-140)` made a chapter of the last day and a half and called the rest thin); thin it by weight and by day, and say how much was left out. A chapter written from too little can be replaced from outside through the store (`K.amend`, `runs/<run id>/state/amend`, a higher `rev` each time).
- **Never show a mind a list cut to a fixed tail.** The last six recipes hid the raft for fourteen runs; the last nine buildings hid the rest. Rank by what matters to that being now (`M.makeable`), or turn through the list, and name what is not shown in full. When something in the world is never used, read the kept prompts of those who could have used it before changing the world.
- A plan step `goto` takes `x` and `y`; `build`, `make`, `craft`, `pen`, `tend` take `what`. A check that sends a being somewhere must assert that it arrived: one of mine passed while the being walked to (0,0).
- Most water inside the known land can be swum (`w.narrow`: within two steps of a shore or of shallows). Only the heart of a lake and the sea need a vessel; a check of crossing must use open water.
- A being in the middle of a plan waits for it (`settings.planWait`, `M.ready`, `M.WEIGHTY`). An event that should break into a plan must be told with an urge of `M.WEIGHTY` (6) or more: one such event is enough (`m.weightyT`). Urges below that are never summed toward the bar; the bar of Generation 25 was a sum of 3, small things filled it, and in the seventeenth run a third of thoughts still came mid-plan.
- A building with `yields` is a work that gives food while tended (`stepYields`, `w.tended`); a pen holds kept animals (`c.pen`, `keepPenned`). Both are data in `L.buildings`.
- **Nothing may ask for more at once than hands hold** (`build.woodMax` and `craft.stoneMax`, six each): a forge of eight stone could never be raised and a boat of ten wood never made, for fourteen runs. Anything larger is a work brought to in loads (`w.works` for a building, `w.makings` for a thing). When adding a building or a recipe, check its cost against the hands; `tests/22` lists what would be impossible.
- A way is a band's when two members hold it (`culture.commonAt`, `SW.heldInCommon`); a building of that way teaches the whole band when it stands (`raised`). Kinds of building have lines of descent (`from`): the newer may be raised in place of the older and serves wherever the older is asked for (`isOfLine`), so it must give all the older gave. `SW.bandOf` is an older function with another meaning; the members of a band are `SW.bandMembers`.
- **Verse** is asked for by occasion (`M.askVerse(st, id, kind, {about, ask, tell})`; kinds dying, elegy, love, birth, deed, myth), sits in `mind.verse` until given or lapsed (`laws.verse.tries`), and is taken up in `M.apply` from the reply's `tale` (`verseMade`). Forms are data (`laws.verse.forms`). A new occasion is one more `M.askVerse` call from an event; do not add a second path for verse. The asking must stay at the head of what the mind is told and in every kind of thought: seventeen runs made no verse while the field was offered as `null or ...` among thirty others in the deep thoughts alone.
- **Traditions** are data (`laws.traditions`: `holds`, `order`, `drives`, `verse`, `offering`); a people's is `P.tradition`, chosen by `traditionFor` from the seed and the people, never from the world's stream of chance. `SW.traditionOf(w, a)`, `SW.ofTheOrder(w, a)`. They weight drives in `M.drives` only, so a body on instinct is unchanged.
- **Seas** (`opts.seas` to `SW.createWorld`; the page passes it unless `window.EVOLU_SEAS === 0`) are laid by `seaPlan` with a chance of its own; the plan is kept in `w.seas.plan`. `SW.createWorld(seed)` without it must stay as it was for every seed: every check and every balance run before Generation 27 rests on that.
- The final state is sent in parts (`M.parts(d, limit)`: a head at `state/latest` and full beings at `state/beings-N`); a document in the store may not pass 256 KiB. When reading a run from the store, read the head first: it says how many parts there are.
- How far a voice carries is `SW.reach(w, a)` (signals), not `laws.body.hearing`, wherever the one who speaks, musters or rallies is known.
- A law op on `body.lifespan` rescales the lives of the living by the same measure (`K.applyOp`).
- **Blocks and the library** (Generation 28): new structures go in `SW.LIBRARY[age]` as data (`blocks`, `buildings`), not in `defaultLaws`; `SW.openAges(w, emit)` merges an age into a world's laws when its era comes within one of it (called from `M.createState`, `SW.upgrade` and once a day in the step; it draws no chance). `SW.compose(w, names)` adds blocks into a building; the maker's op `structure` uses it. A structure's `needs` (kinds within `build.near` steps; `store` counts), `beside` (`water` or `road`) and `reach` (a voice carries) are generic: prefer them to code. A bare `SW.createWorld(seed)` has no library until a state is made or a day passes: checks that count kinds of building must say which they mean.
- Settlements: `SW.settlementKinds(w, S)`, `SW.joinedByRoad(w, A, B)` (a search along paved tiles, capped), `M.settlementsText`; a mind learns of a settlement by being within its radius plus twelve steps when a thought is applied (`mind.setts`).
- A crossing is chronicled once for each land a being lands in (`mind.crossedTo`); do not chronicle a repeated act every time it happens (28 crossings by two beings filled the chronicle of the eighteenth run).
- **Ways on the ground** (Generation 29): `w.roads[i]` is 1 paved, 2 bridge, 3 track, 4 dirt road (`SW.roadGrade`); tracks come from wear (`w.wear`, `wearAt`, `fadeWear`) and are not roads for `joinedByRoad` or `beside: 'road'`. A check on any road must say which grade it means. Searches look at road neighbours first (`roadsAny`, `bfsStep`), so a walker's path depends on the roads around it: a check that needs a straight walk must lay a road or accept a bowed line.
- **Kept hunters** (`isHound`: a kept animal whose kind has `pack` or `predator`, not penned): `houndsOf`, `feedHounds` once a day. Events `scraps`, `houndhungry`, `houndleft`.
- A settlement's name is its own (`taken` in the settlement pass): never a place's name within it.
- On the page, `bubbleAt(x, y)` and `openBubble` serve hover and click on a speech box; `U.laid` carries each box's whole text.
- **A world mostly unknown** (Generation 30; `opts.fog`, which the page passes unless `window.EVOLU_FOG === 0`): `fogIn(w)` at the end of world creation puts everything beyond `explore.start` steps of a founder under the veil; `openAround(w, a, emit)` brings into the known what one with a plan, or one in hunger, can see from the edge (`explore.see`). `w.fogDirty` batches the recount of swimmable water. A check that needs the whole known land must not pass `fog`; a check of a crossing in a seas world must not either, since the ocean starts unknown.
- **The new plants** (`SW.FLORA`, `opts.flora`) are added to a world's laws before anything is sown; never to `defaultLaws`, or every seed's land changes. A plant's kind is `p.sp`.
- **Later ages** (Generation 31): `SW.beginAt(w, age)` then `M.backfill(st, age)` begin a world old (the page does both from Setup's "Begin at", or `window.EVOLU_AGE`); `SW.beginAt` draws on a chance of its own. A structure's `clears` acts once in `landUse` (called from `raised`), `fouls` every day in `foulStep`. Works placed by `beginAt` lie within six steps of the middle so that every `needs` is within `build.near`.
- **Beyond the planet** (`U.far`, 0 to 4; `drawCosmos`, `farTo`): a picture from the seed. In `ui.js` the canvas context at module level is `cx`; inside draw functions `c` is a local alias, so a new draw function must begin `const c = cx;` and must not name anything else `cx`.
- The audit of the trees is `docs/tree-audit.md`, made by `tests/tools/tree-audit.js` from the run files. Run it again after each full run.
- When a script edits a document, end it by writing the file and check the result: the README said Generation 18 through Generation 19 because an edit was computed and never written.
- Terrain 9 is the unknown (`T.VOID`): impassable, nothing lives there, and the true ground is kept in `w.veil`. Anything that picks a tile by position and not by terrain must skip it. Animals and newcomers come in at `edgeSpot(w)`, not at the map's rim.
- Settings: a bump of `settings.v` must carry the previous version's saved settings across (see `M.restore`), moving a default only where the saved value still equals the old default.
- When Nova sends more ideas than a generation can hold, build what is cheap and safe, put the rest in `ROADMAP.md` in order, and say plainly which is which.
- Do not put apostrophes inside single-quoted strings in `minds.js` prompts; it has broken the file three times.
- **A new act is not done until a mind can reach it.** Add it to `SW.ACTIONS` as well as to `act()` and to the catalogue in `M.buildPrompt`, and test it by giving a mind a plan (`M.apply`), never by calling the body directly: `claim` and `venture` were unreachable for two generations because their tests called the body. `tests/12-through-the-mind.js` reads the acts out of the prompt and fails if the body refuses one.
- Keep a copy, not a reference, of anything shown as "before": the maker's numbers at its last visit held live tallies and so never differed from the present.
- When inserting into a list in a source file with a script, anchor on the exact closing text of that list and check the count afterwards; `],` also ends other things, and the result can still parse.
- A heritage op that places things in the world by chance (a `creature` with `n`, a sowing) is folded with `"own": 1`: `K.inherit` then places it by a chance of its own and the world's stream at birth is not moved. Without it, eight new animals at a world's birth moved four files of older checks (Generation 29).
- When a script replaces a line it found by a loose match, print the line and check it is the kind of thing meant before writing: looking for the heritage's fire spur by `way: 'fire'` found the roast recipe and replaced it (Generation 21; caught by diffing the heritage against the previous one, which is worth doing every time).
- A patch of open grass of a given length may not exist: test helpers that look for one return undefined, and every position after that is NaN. Ask for eight tiles or fewer.
- The browser checks set `window.EVOLU_SEED = 7` before the page loads, because a first visit now begins a world from a chance seed.
- Claude allows a page only so many calls at once (six was refused in the eleventh run; four ran 478 thoughts without a refusal), and refuses more often as the people and the prompts grow (forty-three alive and 30,000 characters in the fourteenth). The chronicler, the maker and foresight add to the count.
- **Never switch every mind off for something that may pass.** A refusal eases the pace (`M.ease`), the clock slows (`M.pace`), at the worst only those in view think (`st.narrow`), and it all recovers by itself (`M.recover`). Only a limit on the account, an expired session or ten faults in a row stop the minds. Anything that calls Claude from the page must try again by itself (`K.later`): in the fourteenth run the minds slept eighteen days of the world before anyone saw.
- `M.ease` and `M.recover` take the time as an argument so that checks need not wait; keep new timing code that way.
- In `K.stats` the world is `w` and its laws `w.laws`; there is no `L` there (a figure that used it broke every visit of the maker until a check called `K.stats`).
- Beasts wander in from the edge of the map over time. A check that runs for hundreds of moments must keep clearing `w.creatures` if it needs beings to stay put. Calamities move people too: set `w.laws.weather.disaster = 0` (and `herd`, `pack`) in a check that needs them still.
- A check that rests on chance (how many of forty animals stray) is measured against a control in the same check, not against a fixed number: the stream of chance shifts whenever anything in the world step changes.
- A mind sees farther than it seems (11 steps in open country): a check that lays out plants must clear 16 steps around.

## Tests

```
tests/run-all.sh                                   # needs only Node
PLAYWRIGHT=/path/to/node_modules/playwright tests/run-all.sh browser
```

All suites must pass before publishing. Every check runs against the one current engine; the numbered files are grouped by subject. Each generation adds a numbered file for what it added (`23-...js`); do not pin the generation number or the size of the heritage with `===` in it, or the next generation breaks it, with checks that place beings and clear predators so they do not depend on chance. Regenerate `tests/fixtures/save-generation-<N>.json.gz` from the generation being replaced, so the save-compatibility check always covers the previous generation.

What the tests cannot show is how real minds behave. Say so in every report.

## How to write to Nova

- When posing a decision: the question, the options, the proposed answer and why.
- Separate what was built, what was tested, and what was only designed.
- No hype. Numbers from the record over impressions.
