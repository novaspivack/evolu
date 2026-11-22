# Runs

Exported records of real runs: worlds whose beings thought with Claude. Each file is what **Download run log** in Settings produces.

| File | Generation | Length | What it showed |
| --- | --- | --- | --- |
| `generation-12-run-r7-mwrsw065-day20.json` | 12 | 20 days, 553 thoughts | A comfortable world: no deaths, no children, knowledge far too fast. Led to Generation 13. |
| `generation-13-run-r7-mwrxhd1y-day30.json` | 13 | 30 days, 883 thoughts | Twelve births, seven starved, kin mating with kin, no dealings between peoples. Led to Generation 14. |
| `generation-14-15-run-r7-mws0f6n0-day41.json` | 14, carried on under 15 | 41 days; records from day 19 (684 thoughts) | Ten of seventeen starved, most in winter; storage found on the eve of famine; the land running down; peoples too small to grow. Led to Generation 16. |
| `generation-17-run-r7-mws0f6n0-day66.json` | 17, on the same world carried on | days 51 to 66 (478 thoughts) | Fifteen alive from twelve, four births, one death. Nothing claimed although many tried: the act never reached a body. No tale told, because nothing counted as telling. Couples refused as bands. Hunting planned twice in 478 thoughts. Led to Generation 18. |

Days 41 to 50 of that world (the ninth run, on Generation 16) were stopped before a log was downloaded; what the page had written to its store is in the design log. The first 19 days of that world (the seventh run) were cut short before a log was downloaded; what could be read of them from the artifact's store is in the design log.

The analysis of each is in [`docs/design-log.md`](../docs/design-log.md). Earlier runs were recorded but their files are not kept here.

## What a run file holds

- `_READ_ME_FIRST`: instructions to Claude for turning this run into the next generation.
- `records`: everything, in order. Each has a type `t`: `thought` (with drives, plan and state), `voice`, `chron`, `prompt` (a sampled full prompt and the raw reply), `failed`, `story`, `maker`, `request`, `grief`.
- `digest`: the final state of every being, the peoples, the lands and the tallies.
- `story`, `maker`: the chronicler's and the maker's own state: chapters, visits, predictions, lessons, ideas.
- `heritage`: every change the maker made and kept, to be folded into the next engine.
- `chronicle`, `voices`: the last entries of the world's chronicle and of what was said.

To add a run: download it from the page, name it `generation-<N>-run-<run id>-day<D>.json`, add a line to the table.
