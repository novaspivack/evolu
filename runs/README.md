# Runs

Exported records of real runs: worlds whose beings thought with Claude. Each file is what **Download run log** in Settings produces.

| File | Generation | Length | What it showed |
| --- | --- | --- | --- |
| `generation-12-run-r7-mwrsw065-day20.json` | 12 | 20 days, 553 thoughts | A comfortable world: no deaths, no children, knowledge far too fast. Led to Generation 13. |
| `generation-13-run-r7-mwrxhd1y-day30.json` | 13 | 30 days, 883 thoughts | Twelve births, seven starved, kin mating with kin, no dealings between peoples. Led to Generation 14. |
| `generation-14-15-run-r7-mws0f6n0-day41.json` | 14, carried on under 15 | 41 days; records from day 19 (684 thoughts) | Ten of seventeen starved, most in winter; storage found on the eve of famine; the land running down; peoples too small to grow. Led to Generation 16. |
| `generation-17-run-r7-mws0f6n0-day66.json` | 17, on the same world carried on | days 51 to 66 (478 thoughts) | Fifteen alive from twelve, four births, one death. Nothing claimed although many tried: the act never reached a body. No tale told, because nothing counted as telling. Couples refused as bands. Hunting planned twice in 478 thoughts. Led to Generation 18. |
| `generation-18-run-r7-mwsfrgn7-day4.json` | 18, a new world | 4 days, 130 thoughts | Six strips of unknown land opened in three days (22% of the rim) and the south reached the end of the map; one refused call put every mind to sleep; hunting chosen at last (11 kills). Led to Generation 19. |
| `generation-20-run-r5614-mwsokxmr-day12.json` | 20, a new world on the globe | 12 days, 662 thoughts | Twenty-one alive from fifteen: seven births, four newcomers, five deaths. Four of one band starved in two days of winter on the North Ice beside food five steps away, walking to plants with nothing on them. 111 gifts planned, no trade ever tried: only food, seed and wood could be traded. Snow lay on most of the equator. No call refused in 662. Led to Generation 21. |
| `generation-21-run-r5614-mwsokxmr-day25.json` | 21, the same world carried on from day 12 | 13 more days, 898 more thoughts | Thirty-four alive from twenty-one: five births, eleven newcomers in three bands, three deaths (two starved, one gored). No call refused. Harvest and eat that walk to food worked; the two who starved died of distance and time, not of empty plants. Six offers of trade, none answered. One asked for a hunt side by side, walked alone and was gored. Led to Generation 22. |
| `generation-22-run-r5614-mwsokxmr-day60.json` | 22, the same world carried on from day 25 | 35 more days, 1,369 more thoughts | Forty-three alive. **The minds were asleep from day 40 to day 57**: five refusals in two minutes on day 39 switched them all off, and the world ran eighteen days on reflexes. Both deaths by hunger fell in those days. Awake, no one starved: 19 begged, 23 were fed by another, 69 portions were drawn from stores by the hungry, 18 calls to hunt together, the first trade, the first deaths of old age. The maker and the chronicler were each refused on day 58 and did not try again. Led to Generation 23. |

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
