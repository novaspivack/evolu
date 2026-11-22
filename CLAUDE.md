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
- A world saved by the previous generation must still load: extend `SW.upgrade` (engine) and the normaliser in `M.restore` (minds). Bump `settings.v` when settings change. `SAVE_KEY` keeps the old name `seedworld.save.v4` on purpose.
- Watch prompt size (`M.buildPrompt`); the middle prompt was 24,000 characters in the eighth run and the longest 36,800.
- A world may be carried on across generations (same run id). `SW.upgrade` moves a law to its re-tuned value only where the world still holds the old default; add to that table when you re-tune a law.
- Measure balance changes on at least ten seeds before believing them: three seeds swing by several deaths either way. Survival on instinct alone cannot show what minds do with stores, fire and shelter.
- Watch speed: a world moment should stay near 2 ms.
- Do not put apostrophes inside single-quoted strings in `minds.js` prompts; it has broken the file three times.
- A patch of open grass of a given length may not exist: test helpers that look for one return undefined, and every position after that is NaN. Ask for eight tiles or fewer.
- Beasts wander in from the edge of the map over time. A check that runs for hundreds of moments must keep clearing `w.creatures` if it needs beings to stay put.

## Tests

```
tests/run-all.sh                                   # needs only Node
PLAYWRIGHT=/path/to/node_modules/playwright tests/run-all.sh browser
```

All suites must pass before publishing. Every check runs against the one current engine; the numbered files are grouped by subject. Each generation adds a numbered file for what it added (`11-...js`), with checks that place beings and clear predators so they do not depend on chance. Regenerate `tests/fixtures/save-generation-<N>.json.gz` from the generation being replaced, so the save-compatibility check always covers the previous generation.

What the tests cannot show is how real minds behave. Say so in every report.

## How to write to Nova

- When posing a decision: the question, the options, the proposed answer and why.
- Separate what was built, what was tested, and what was only designed.
- No hype. Numbers from the record over impressions.
