# Runs

Exported records of real runs: worlds whose beings thought with Claude. Each file is what **Download run log** in Settings produces.

| File | Generation | Length | What it showed |
| --- | --- | --- | --- |
| `generation-12-run-r7-mwrsw065-day20.json` | 12 | 20 days, 553 thoughts | A comfortable world: no deaths, no children, knowledge far too fast. Led to Generation 13. |
| `generation-13-run-r7-mwrxhd1y-day30.json` | 13 | 30 days, 883 thoughts | Twelve births, seven starved, kin mating with kin, no dealings between peoples. Led to Generation 14. |

The seventh run (Generation 14, `r7-mws0f6n0`, 19 days, 605 thoughts) was cut short before its log was downloaded; what could be read of it from the artifact's store is in the design log.

The analysis of each is in [`docs/design-log.md`](../docs/design-log.md). Earlier runs were recorded but their files are not kept here.

## What a run file holds

- `_READ_ME_FIRST`: instructions to Claude for turning this run into the next generation.
- `records`: everything, in order. Each has a type `t`: `thought` (with drives, plan and state), `voice`, `chron`, `prompt` (a sampled full prompt and the raw reply), `failed`, `story`, `maker`, `request`, `grief`.
- `digest`: the final state of every being, the peoples, the lands and the tallies.
- `story`, `maker`: the chronicler's and the maker's own state: chapters, visits, predictions, lessons, ideas.
- `heritage`: every change the maker made and kept, to be folded into the next engine.
- `chronicle`, `voices`: the last entries of the world's chronicle and of what was said.

To add a run: download it from the page, name it `generation-<N>-run-<run id>-day<D>.json`, add a line to the table.
