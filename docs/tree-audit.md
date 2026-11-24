# The trees: an audit

23 November 2026, for Nova, as the first step of the round on the trees. Written from the registry of Generation 26 and from three run files of one world (seed 5614, Wenenvale) at days 12, 25 and 60, run under Generations 20 to 22. The script is `tests/tools/tree-audit.js`; every number below comes from it or from the registry.

## What there is

- **68 ways in four trees:** craft 31, mind 18, life 10, society 9.
- **Six ages:** 17, 16, 11, 10, 9 and 5 ways.
- **How a way is reached:** the ways it needs, a count of something done (wood gathered, things built, animals tamed), and lore. It opens at a deep reflection; hardship brings some nearer. It then passes by teaching and by being watched.
- **The trees lean on one another:** 27 needs cross from one tree to another (craft to society 7, mind to craft 7, craft to mind 5, mind to life 3, mind to society 2, and one each for three more). Seven ways need no other; the longest chain is 13 ways deep.

## How far the runs got

| | Day 12 | Day 25 | Day 60 |
| --- | --- | --- | --- |
| Alive | 21 | 34 | 43 |
| Ways held by someone | 16 of 68 | 23 | 28 |
| First age (17) | 15 | 17 | 17 |
| Second age (16) | 1 | 5 | 9 |
| Third age (11) | 0 | 1 | 2 |
| Fourth to sixth (24) | 0 | 0 | 0 |
| Ways held by the middle being | 3 | 5 | 7 |
| By the one who holds most | 8 | 15 | 18 |
| By the one who holds least | 0 | 0 | 1 |

The first age was complete by day 25. After sixty days the second age was a little over half held and the third had two ways, each held by one or two beings.

## One being runs ahead

At day 60 one being held 18 ways and the middle being 7. Holders of each way among the 43 alive: tools 36, fire 32, mining 25, weaving 22, rafts 18, archery 17, herding 17, farming 16, storage 15, pottery 13, customs 12, fishing 12, signs 9, boats 9, lorekeeping 7, smelting 6, medicine 6, masonry 4, armour 4, wells 3, devices 3, schooling 3, bridges 2, sailing 2, and one each for signals, writing, calendar and alchemy.

Until Generation 26 knowledge belonged to one being and nothing a band built changed what its other members knew.

## Where it stalls

Seven ways of the second age were held by no one at day 60: riding, milling, wheel, roads, monuments, currency and law. What stood in the way:

| Way | Needs | Who had the needs | Practice asked | Who had it |
| --- | --- | --- | --- | --- |
| wheel | masonry | 4 | built 12 things | 0 |
| monuments | masonry, customs | 1 | built 12 | 0 |
| roads | masonry, wheel | 0 | built 14 | 0 |
| milling | farming, masonry | 2 | planted 16 | 1 |
| riding | herding | 17 | tamed 4 animals | 0 |
| currency | smelting, customs | 2 | 6 trades | 0 |
| law | customs, writing | 0 | led 3 | 0 |

**The line of building is the blockage.** Masonry itself asks for eight things built, and one being of 43 had done that. Wheel, monuments and roads ask for 12 and 14. In the first 37 days the whole people raised 82 buildings, about two each. Everything that hangs on masonry and the wheel (roads, monuments, architecture, cities, siegecraft, and by them most of the society tree) is out of reach at the pace beings build.

Riding asks for four animals tamed by one being, where the whole people had tamed one by day 37. Currency asks for six trades by one being, where the whole run saw one.

## What could never be done at all

Found in this audit and in the one before it; all fixed.

- **Six kinds of building could never be raised** (fixed in Generation 26): forge, mill, well, standing stone, infirmary and barracks each ask for eight wood or eight stone at once. Hands hold six, and only a building of more than fourteen in all was treated as a work brought to in loads. So smelting led to a forge no one could build, wells to a well no one could dig, and nothing that needs a forge or a mill could be made.
- **Eight things could never be made** (fixed in Generation 26): the boat (ten wood), the ship, warship and steamship (twenty and more), the airship, the ram, the catapult and the cannon.
- **No one was shown what could be made** beyond the last six recipes, nor more than the last nine kinds of building (fixed in Generation 25).

Together these mean that no run so far could have gone past the second age in craft, whatever its beings did.

## Ways with nothing behind them

A way has something behind it if a building belongs to it, a recipe needs it, or a rule in the code asks for it. Fifteen of 68 have nothing but the next way:

| Age | Ways | Empty |
| --- | --- | --- |
| 1 | 17 | 0 |
| 2 | 16 | 1 (signals) |
| 3 | 11 | 1 (alchemy) |
| 4 | 10 | 3 (chemistry, physics, biology) |
| 5 | 9 | 6 (atomics, biochemistry, oil, radio, computing, rocketry) |
| 6 | 5 | 4 (quantum, nuclear, internet, zeropoint) |

The first three ages are furnished. From the fourth on, the tree is mostly names.

## What this audit could not measure

- **Who found a way and who was taught it:** the final state of a run keeps the names of the ways a being knows, not how it came by each.
- **Whether a way, once held, changed what its holder did.** That needs the plans before and after, way by way.
- **Anything about Generations 23 to 26,** which have not had a full run with real minds.

## What I propose for the next generation, for Nova to decide

1. **Count practice for the band, not only the being.** What a band has built together counts toward each member's practice of building; so with taming and trading. This fits the rule that a community advances together and removes the blockage at masonry without lowering any number by hand.
2. **Count labour on a work as building.** Carrying to a forge or a hall is building; today only the one who finishes it is counted.
3. **Give riding and currency a reachable start:** riding from two tamed; currency from three trades. Or leave them and watch, now that trades and taming are easier than they were.
4. **Furnish or fold the empty ways.** Signals and alchemy in the first three ages should do something. From the fourth age on, decide with the libraries by age: either each way gets a building, a recipe or a rule, or it waits in a file that is not loaded yet.
5. **Record how each way was come by** (found, taught, watched, learned from a building), so the next audit can answer what this one could not.

## Added after the seventeenth run (day 72, under Generation 26)

Run again with the fourth run file of the same world (`node tests/tools/tree-audit.js`).

| | day 12 | day 25 | day 60 | day 72 |
| --- | --- | --- | --- | --- |
| alive | 21 | 34 | 43 | 36 |
| ways held by someone, of 68 | 16 | 23 | 28 | 27 |
| second age, of 16 | 1 | 5 | 9 | 9 |
| third age, of 11 | 0 | 1 | 2 | 1 |
| ways held by the middle being | 3 | 5 | 7 | 10 |

- **A way was lost.** Alchemy had one holder at day 60 and none at day 72: its holder died of age and had taught no one. Signals has one holder, bridges one, and wells, sailing, devices, writing and the calendar two each. With eleven elders among thirty-six, more will go the same way unless they are taught on. Nothing in the world yet makes an elder teach before dying beyond the line it is told when it grows old; the death poem of Generation 27 is asked for at the same moment and may or may not help.
- **Knowledge spread among the living** (the middle being went from seven ways to ten) while its frontier stood still: no new way in ten days.
- **Nine held smelting and no forge was raised,** though since Generation 26 two holders are enough for any of the band to raise one in place of a workshop. Ten days is short; it is the first thing to look for in the next run.
- **Riding and currency:** left as they were by Nova's choice, and now tracked. No trade was done in the ten days (six thefts). The maker reads `reachOfRidingAndCurrency` at every visit.

What Generation 27 did with the audit's proposals: (1) the practice of a band counts toward a way for each member (`culture.bandPractice`, half); (2) every six units carried to a work count as one building; (3) thresholds left alone and tracked; (4) signals carry a voice two and a half times as far and alchemy makes a tonic and a wakefire, so the ways with nothing behind them fell from 15 to 13 of 68, all of the fourth age and after; (5) how each way was come by is recorded on the being (`knows[way].how`: people, parents, taught, found, building) and in the final state (`body.came`), and the audit tool counts it for any run file that has it.

