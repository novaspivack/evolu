# Working on Evolu (instructions for Claude)

Evolu is a self-modifying world simulation by Nova Spivack that runs as a Claude artifact. Read `README.md` for what it is. This file is how the work is done.

## The source of record

- `src/` holds the artifact, exactly as published: `index.html`, `engine.js`, `minds.js`, `maker.js`, `audio.js`, `ui.js`. No build step.
- The live artifact is titled "Evolu", slug `be8f1f8f-42db-4703-ac0d-c3e87d04f447`, owned by Nova. Publish the six files to that slug (base version = the live version). Its capabilities `sample`, `db`, `user`, `downloads` carry forward.
- **While Nova is running a world, do nothing he can see.** Do not publish (it reloads the open page), do not send files into the conversation, do not show an artifact, do not attach or register anything. A run was cut short on 22 Nov 2026 by something of this kind. Finish every visible step before telling him a generation is ready, then stop, and wait for him to say the run is over.
- One commit per published generation, message `Generation N: <one line>`. `src/` at that commit must be what is live.

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
- `runs/<run id>/state/latest` is the final state of every being with the tallies and, from Generation 15, a summary of the culture. It is about 100 KB: read it once, with care for your context.
- `runs/<run id>/state/maker` (from Generation 15) is the maker's visits, requests, lessons and heritage.
- `runs/<run id>/chunks` is the full record. Do not list it: it is megabytes. Ask Nova for the downloaded run log if the thoughts themselves are needed.

## Design rules

- Open and emergent. Make things possible; give them a cost and a use; never script an outcome.
- New content should be **data in the laws registry** acting through the effects language (`SW.FX_NOW`, `SW.FX_BOON`), so the maker can make more of it. Add code only for a new kind of mechanic.
- Give the maker a lever and a statistic for everything new (`K.applyOp`, `K.OPS`, `K.stats`, `LAW_GROUPS`).
- Tell a being only what it could perceive. When an act fails, say why, to that being.
- The engine is deterministic for a seed. Use `rnd(w)`, never `Math.random()`, inside the world step.
- A world saved by the previous generation must still load: extend `SW.upgrade` (engine) and the normaliser in `M.restore` (minds). Bump `settings.v` when settings change. `SAVE_KEY` keeps the old name `seedworld.save.v4` on purpose. Worlds are also kept by name in IndexedDB (`LIB` in `ui.js`: stores `meta` and `snap`, keyed by run id); never write code that begins a world without first saving the one being left, and never let an unchosen world (`U.choosing`) save over anything.
- Watch prompt size (`M.buildPrompt`); the middle prompt was 24,000 characters in the eighth run and the longest 36,800.
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
- When a script edits a document, end it by writing the file and check the result: the README said Generation 18 through Generation 19 because an edit was computed and never written.
- Terrain 9 is the unknown (`T.VOID`): impassable, nothing lives there, and the true ground is kept in `w.veil`. Anything that picks a tile by position and not by terrain must skip it. Animals and newcomers come in at `edgeSpot(w)`, not at the map's rim.
- Settings: a bump of `settings.v` must carry the previous version's saved settings across (see `M.restore`), moving a default only where the saved value still equals the old default.
- When Nova sends more ideas than a generation can hold, build what is cheap and safe, put the rest in `ROADMAP.md` in order, and say plainly which is which.
- Do not put apostrophes inside single-quoted strings in `minds.js` prompts; it has broken the file three times.
- **A new act is not done until a mind can reach it.** Add it to `SW.ACTIONS` as well as to `act()` and to the catalogue in `M.buildPrompt`, and test it by giving a mind a plan (`M.apply`), never by calling the body directly: `claim` and `venture` were unreachable for two generations because their tests called the body. `tests/12-through-the-mind.js` reads the acts out of the prompt and fails if the body refuses one.
- Keep a copy, not a reference, of anything shown as "before": the maker's numbers at its last visit held live tallies and so never differed from the present.
- When inserting into a list in a source file with a script, anchor on the exact closing text of that list and check the count afterwards; `],` also ends other things, and the result can still parse.
- When a script replaces a line it found by a loose match, print the line and check it is the kind of thing meant before writing: looking for the heritage's fire spur by `way: 'fire'` found the roast recipe and replaced it (Generation 21; caught by diffing the heritage against the previous one, which is worth doing every time).
- A patch of open grass of a given length may not exist: test helpers that look for one return undefined, and every position after that is NaN. Ask for eight tiles or fewer.
- The browser checks set `window.EVOLU_SEED = 7` before the page loads, because a first visit now begins a world from a chance seed.
- Claude allows a page only so many calls at once (six was refused in the eleventh run; four ran 478 thoughts without a refusal). The chronicler, the maker and foresight add to the count.
- Beasts wander in from the edge of the map over time. A check that runs for hundreds of moments must keep clearing `w.creatures` if it needs beings to stay put. Calamities move people too: set `w.laws.weather.disaster = 0` (and `herd`, `pack`) in a check that needs them still.
- A check that rests on chance (how many of forty animals stray) is measured against a control in the same check, not against a fixed number: the stream of chance shifts whenever anything in the world step changes.
- A mind sees farther than it seems (11 steps in open country): a check that lays out plants must clear 16 steps around.

## Tests

```
tests/run-all.sh                                   # needs only Node
PLAYWRIGHT=/path/to/node_modules/playwright tests/run-all.sh browser
```

All suites must pass before publishing. Every check runs against the one current engine; the numbered files are grouped by subject. Each generation adds a numbered file for what it added (`17-...js`); do not pin the generation number or the size of the heritage with `===` in it, or the next generation breaks it, with checks that place beings and clear predators so they do not depend on chance. Regenerate `tests/fixtures/save-generation-<N>.json.gz` from the generation being replaced, so the save-compatibility check always covers the previous generation.

What the tests cannot show is how real minds behave. Say so in every report.

## How to write to Nova

- When posing a decision: the question, the options, the proposed answer and why.
- Separate what was built, what was tested, and what was only designed.
- No hype. Numbers from the record over impressions.
