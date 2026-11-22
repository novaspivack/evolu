# Evolu: design log

Kept by Claude for Nova Spivack while the world was built, generation by generation. Newest first. Each generation is one cycle of the loop described in the README: a real run, an analysis of its record, a new build.

The world was called Seedworld until Generation 14 (22 Nov 2026) and was renamed because a game of that name already exists. Older entries are left as they were written, apart from the name. They speak to Nova ("your run") because that is who they were written for.

What is planned is in [`ROADMAP.md`](../ROADMAP.md), not here.

## How to read this

- **Built** means it is in the published world and passed my tests.
- **My tests** are three things: the ecology run headless across several seeds; the whole mind pipeline run against a *scripted stand-in* for Claude; and the page loaded in headless Chrome at desktop and phone widths with no errors.
- **What my tests cannot show** is how real Claude minds behave. Those calls only happen on your account when you open the page. Everything about mind behaviour below is either from your one reported run or untested.

## What the tenth run showed (the same world carried on, days 51 to 66, on Generation 17; run `r7-mws0f6n0`, 478 thoughts)

From the downloaded run log (`runs/generation-17-run-r7-mws0f6n0-day66.json`), counted with code. Nova's reading before I looked: halls planned and never claimed, hunger, plans empty or not followed, too few people, too few animals, no shroud at the edge, a world that felt stuck. Most of that was right, and the largest cause was a fault of mine.

- **Fifteen alive at day 66, from twelve.** Four births in sixteen days (Namo; the twins Balash and Urog; Zurak, the first child of two peoples) and one death: Kragar, an elder, starved on day 63 amid plenty (1,756 food standing two days later). Over the whole world's life: five starved, two killed by beasts.
- **Nobody could claim anything, and it was my fault.** `claim` (Generation 16) and `venture` (Generation 17) were written into the body and into what a mind is told it can do, and never into the list of acts a plan may hold. Every plan step that named them was thrown away before it reached the body, and the being was told only that a step "named no action your body knows". In the 27 sampled replies, 10 of 86 plan steps were `claim` and all 10 were dropped; 9 of the 27 prompts carried the notice. Twenty empty buildings of the dead stood unclaimed while Kenna, Kanna, Namo, Tugar, Ilyiel and Xaeth said for days that they would claim one. My tests for both acts had called the body directly, so they passed and showed nothing. Venturing would have failed the same way in a new world.
- **Plans did run out.** A being was given a thought about every 84 moments (median), and its plans added up to 50. The rest of the time the body was on its reflexes. The limit was the pace I had set by default: 24 thoughts a minute for the whole world is 133 for each thousand moments, and the run shows 133.
- **Hunting was almost never chosen.** Of 1,274 plan steps, `hunt` was 2 and `fish` 5; `goto` 381, `linger` 141, `gather` 105, `harvest` 103. Of 2,017 things eaten in the world's life, 80 were meat and 102 fish. Beasts took 80 animals, people 21. Nothing in a hungry being's prompt pointed at the animal standing near it.
- **Courting mostly came to nothing.** 47 thoughts planned `mate`; three conceptions. Both had to court within 80 moments of each other, about one thought apart, and when a child did not come neither was told why.
- **Couples could not become a band.** The rule that no one follows a person of lower standing refused Brokgan to Tugar and Ilyiel to Nyssa, who were courting or raising a child.
- **No tale in 66 days.** The way of lorekeeping needs three tellings, and no act counted as telling, so it could never be reached. The maker asked for this three times.
- **The maker's "times eaten" did move.** Its numbers "at your last visit" held the live tallies themselves, not a copy, so the old and the new always read the same. It concluded for twelve days that it could not judge any food it sowed.
- **What did happen:** the first animals tamed (four, by an offered handful); 1,720 moments swum; the centres of the Garnbar and the Eiuys within two steps of each other, with understanding of other tongues at 35% and 49%. In the world's whole life: 97 gifts, and no fight, theft or trade.
- **Animals:** 184 at the end (about 158 grazers and 12 hunters at day 65); plainsox, dunecat and ruhopper died out.
- **No shroud** because this world was made before Generation 17: it has no veiled rim. Only a new world has one.
- **Prompts:** 19,100 to 32,700 characters, middle 23,400. No failed calls.
- **The maker** made five visits and kept every reviewed change: roots and canes sown where the thirsty stood (thirst fell from 66 to 0), the energy needed to conceive lowered from 75 to 68, hearing raised to 17 (not yet judged). Its eight requests are answered below.

## Generation 18 (built, not yet run with real minds): what a mind is offered, its body can do

Built from the tenth run, the maker's eight requests and Nova's notes of the evening of 22 November.

**Claiming works, and names.** `claim`, `venture` and the new `tell` are acts a plan may hold. One who plans to claim walks to the empty building and holds it with every roof, wall and store of the dead around it; a name given with the step names the place, and the name the dead gave it gives way. When it cannot be done the being is told why: the builder still lives (and who), it is already yours, or none stands empty in sight. A new check reads the list of acts out of the prompt itself and fails if the body refuses any of them, and every new act is now tested through the mind's own path.

**Hunting and gathering as skills that grow.** Every kill makes the next hunt likelier (up to +60% after fifteen), and a practised hand often picks two at once. A hungry being with empty hands is told what food grows nearest and what animal is near enough to hunt. A starving body with nothing growing near goes after an animal within six steps by reflex.

**Two together.** One of your own beside you (band, kin, or someone you are warm toward) makes a blow in the hunt land almost twice as often (73 against 140 of 250 in the check), makes a wound from the quarry rarer, and gives each who stood in the hunt a share of the meat. The same holds against a beast that hunts people: two wound it far oftener than one, and a beast that is not starving will not come at two who stand together (it had already left company alone at night). The maker can turn this (`fight.packBonus`).

**What is not forgotten.** A blow, or a theft that is seen, leaves a grudge: the bond is held at enmity however it is warmed, for forty days, unless the one who did it gives three gifts, which mends it. A gift to someone in need, or healing them, leaves a kindness: the bond is held warm for sixty days whatever else passes. Both are told to the being in its own words and shown in the inspector. Nova asked that hard feelings stay rare and die down fast apart from grudges; only these three acts leave one, and there were no blows or thefts in the last sixteen days.

**Children.** Courting holds for a day, not a third of one, so two who want a child need not think in the same moment. Under a roof the wait before another child is three quarters as long, in a hall half. When both are willing and no child comes, each is told why and for how long. The world will not go past its sixty.

**People.** A control in the toolbar adds one to ten people: they come in bands of up to four, on good ground in the homeland of whichever people has fewest living. Newcomers now come by themselves when the living fall below fourteen (it was ten), and the maker is told to bring them when there are fewer than about twenty.

**Bands.** A pledge to someone you are warm toward (above 0.5), or have a child with, needs no proof of standing.

**Telling.** Beside a fire with others near, anyone can tell of what has been. The telling becomes a tale made from what befell the teller's people; those who hear and understand it carry it and can retell it; three tellings bring lorekeeping within reach.

**Plans that last.** Forty thoughts a minute by default, six at once (it was 24 and 4), which with fifteen beings is a thought about every 68 moments. Each mind is told how often its thoughts come and asked for a plan that lasts that long; a plan may hold five steps. Settings saved by Generation 17 are kept, and the pace moves only where it had not been changed.

**More animals.** The level grazers hold is a third higher, so herds return from the rim sooner.

**The maker's requests.** Telling: built. Pledges between the close: built (the other half, offering the lead to the one of higher standing, is not). Claim failing silently: found and fixed, with reasons. "Times eaten" frozen: found and fixed; it also now sees tellings, hunts made together, grudges and kindnesses. A lesson tied to its cause: one who sickens on raw meat or fish learns, with those near, that it is safe eaten beside a fire.

**Heritage.** The energy needed to conceive is 68 for new worlds. Six lessons and three ideas are folded in. Hearing at 17 was not yet judged by the maker and is left at 13.

**Checked.** 39 new checks in `tests/12-through-the-mind.js` with every earlier suite (381 in twelve files), the scripted mind, the ecology, and the page in headless Chrome at desktop and phone widths, where the Add people control is pressed and seven come in with minds. A world saved by Generation 17 loads and runs. Forty days on instinct alone, twelve seeds, Generation 17 against 18: alive 13.5 against 14.9 (one newcomer band in some worlds), deaths 1.5 against 1.1, grazers 183 against 193, plants 1,843 against 1,722, a world moment 2.2 ms against 2.4 on this machine (more are alive).

**Not checked, and not built.**
- No real mind has met Generation 18. Whether minds will now hunt, tell, claim and court to effect is what the next run is for. Instinct alone never hunts or mates, so the twelve-seed figures say nothing about either.
- Forty thoughts a minute has not been tried against the real service. If calls begin to fail, lower it in Setup.
- **An old world still has no veiled rim.** Giving it one means making land beyond its edges that continues its rivers and shores and re-indexing every map; it is in the roadmap, not built. The page now says so when such a world is opened.
- Hunting and defending together are a bonus anyone has, and a skill that grows with use. They are not yet ways in the tree of knowledge with their own discovery.
- Not built from Nova's notes: peacemakers and peace ceremonies, compensation other than gifts, grudges over a stolen mate. In the roadmap.
- The music has never been heard by me.

## What the ninth run showed (the same world carried on to day 50, on Generation 16; run `r7-mws0f6n0`, 305 thoughts from day 41)

Read from what the page had written to its store (the maker's own document and the run's summary line), since the run was stopped before a log was downloaded. The beings' thoughts for these nine days were not read.

- **Twelve alive at day 50, from six on day 41.** Two bands of newcomers came in as built: three Brusha with a child, and three Garnbar. One death in nine days: Ssaua, killed by a ridgecat.
- **The first winter with no deaths** (days 46 to 48), though food standing fell from 1,346 to 503. The maker's reading: "Nobody starved because the hungry were near someone who could feed them, so in the lean season, closeness counts for more than total food."
- **An elder did hand on what he knew.** Kragar spent his last days teaching Gorar.
- **The peoples met.** A louder loneliness (the maker's change) moved Kragar toward the Eiuys, and Garnbar and Eiuys met on day 44 for the first time in the world's history.
- **Still nothing:** no tale, no teaching, no animal tamed, no building of the dead claimed, cooked fish never made.
- **The maker** made three visits and kept every change: fewer hunters allowed (26 to 20), winter growth raised, bounty raised to 0.6, a root sown. It wrote four requests: places of power are capped at twelve and all taken, mostly by places no one found; its counts of deaths and of everyone who ever lived went down between visits; sowing should take a place, because "hunger deaths come from food being too far from the person who needs it".

## Generation 17 (built, not yet run with real minds): a world with edges

Built from the ninth run, the maker's four requests, and Nova's notes of 2:49 to 3:26 pm. The notes held far more than one generation can carry; what was not built is sequenced in `ROADMAP.md`.

**The edge of the world.** The world is now made larger than what is known (184 by 136, of which the middle 144 by 96 is known), and its rim is veiled: shown as mist, impassable, with nothing living in it. Because the veiled land was made in the same act as the known land, its rivers, shores, lakes and kinds of ground are already there, and what is opened continues what it joins: a river that reaches the edge goes on beyond it. A being within sight of the mist is told the land does not end there and feels the pull to know what lies beyond. Standing at it, it can **venture**: each try costs strength and opens, one time in two, a strip about forty wide and ten deep. A band has three tries, then its will is spent for five days. New land comes with what was always in it plus three rich deposits, food already grown, a herd that has never seen people, often beasts that hunt, and one time in five a band of strangers: a new people with its own tongue, customs and a way or two the finders may lack. The finder gains understanding and standing, and the finding is told among its people. There are sixteen lands in the larger world, so pushing outward crosses into country unlike home.

**Women and men** (Nova asked whether there were any: there were not). Every being is a woman or a man; a people keeps near as many of each; a child comes only of one of each who are not close kin. Twins are a girl and a boy. When both parents are well fed and well, in a kind season, the wait before another child is shorter and twins likelier; in hard times it is as before. The maker can switch the rule off.

**Swimming.** A grown being can swim deep water that lies within two steps of ground, so rivers up to four wide can be crossed and lakes and the sea cannot. It costs strength, and one who swims is pressed toward rafts, boats and bridges.

**Seasons of plenty.** Plants grow faster in spring and at harvest as well as in rain. Animals breed more in spring and less in winter.

**Animals that hold their numbers.** Grazers breed faster when they are few; hunters breed by how much prey there is for each. When grazers fall well below their level a herd comes in at the rim, and when hunters are few for the prey a pair follows. Without minds, on three seeds over forty days, grazers went from 168 to 145, 163 and 246, where they had been falling to 60 to 100.

**Deposits return.** A worked deposit refills by a hundredth of its size a day, and a spent one may reappear, small, after eight days.

**Newcomers** come four at a time, two women and two men.

**Drama, kept in proportion.** Each being has a calling it wants to be known for (hero, leader, hunter, warrior, sage, merchant, healer, builder, bard, explorer). Desire fixes on one person of standing or warm acquaintance, and gnaws when that person has had a child with another; inside one's own band it is the weaker pull. Those who fight grow a little stronger and need a little more food, and both fighting and being attacked bring weapons and defences sooner. Songs and poems are asked to rhyme, keep a beat and carry a moral.

**The maker's four requests.** Places of power: the cap is eighteen, and a place no one ever found gives way to a new one. Counts: deaths and everyone who ever lived are now counted by the world itself (they had been counted from the minds of the dead, which are let go after a time). Sowing can be aimed at a being, a spot or a land. Graves as spirit places of their own: not built.

**Heritage.** The maker's three kept law changes are the new defaults, and its two lessons are folded in.

**Checked.** 21 new checks pass with every earlier suite (342 in eleven files), the scripted mind runs, the ecology, and the page in headless Chrome. A world saved by Generation 16 loads and runs. Forty days on instinct, three seeds: 13, 12 and 15 of 15 alive; plants 1,607 to 2,174. A world moment costs about 2.8 ms, up from 2, because the world is larger.

**Not checked, and not built.**
- No real mind has met Generation 17.
- **A world carried on from an earlier generation has no veiled rim and cannot grow.** Exploring needs a new world.
- I looked at the mist around the known world in a screenshot and it draws as intended. I have not looked at an opened strip on the page; the tests show the land, plants and deposits are there and that nothing breaks.
- From Nova's notes, not built: monsters and their eggs; heroes, tribute and duels with spoils; mate stealing; grudges, compensation, peacemakers and peace ceremonies; talents, quests, dreams and prophecies; bandits; shared skills of hunting and defence together. All are in the roadmap.
- The music has never been heard by me.

## What the eighth run showed (the same world carried on to day 41, on Generation 15; run `r7-mws0f6n0`, 684 thoughts recorded from day 19)

The world of the seventh run was not started afresh: it was carried from day 19 to day 41 on the Generation 15 page, with its Generation 14 laws.

- **Seventeen lived, eleven died, six were alive at day 41,** three of them old. Ten starved and one was killed by a frostfang. The Brusha died out. One child was born in these 22 days (five in all 41).
- **They were not hungry most of the time.** On days 20 to 33 the middle being's energy stood at 58 to 71, and hunger led fewer than one thought in eight. Then the winter of days 34 to 36: the middle energy fell to 30, the lowest to 3, and four starved on one day (Skarar, Balar, Gorog, Tanna, all at Gorog's Hold, three of them elders).
- **Is food not regenerating? Two answers.** Within a year it does: by the maker's count, food standing fell from 1,858 to 594 in one winter and from 1,137 to 380 in the next (with two blights), and was back at 1,202 by summer. But across years the land was running down: 1,909 plants at the start, 1,150 on day 19, 867 on day 41. I reproduced that without minds on three seeds (about 1,700 plants falling to between 550 and 1,080 in forty days). The cause: how readily plants seed was tied to the same "bounty" law that sets how fast food grows back, and that law has stood at half since Generation 8. Plants died of age faster than they seeded.
- **Need did bring knowledge, and storage came too late.** 53 discoveries in 22 days, against seven ways known in the first 19; fifteen ways known in the world at the end. Storage was found by seven beings: two in the first days, then four on day 35, the day before they starved, with nothing left to store. Two stores were ever built. The maker saw it exactly: "Spurring storage by famine made the knowledge arrive exactly when there was nothing to store. A way meant for foresight must be sharpened by the signs that come before the hardship."
- **Why the peoples do not grow.** "Family" led 183 of 684 thoughts and one child came of it. Bands of four become kin within a generation (at the end: "Nyssa and Xaeth are parent and child, and the two Garnbar are apart"), and founders, who begin at a fifth of a 60-day life, are old by day 35.
- **Hunting and fishing do feed them:** 89 fish caught, 22 hunts, 58 meals of meat, 82 of fish. No animal was tamed.
- **Culture:** 65 lessons from what befell others; 20 sayings passed by teaching; eight ideas crossed between peoples; four carved figures and three talismans made, one figure given. No tale, song or myth was made and no teaching begun. Tanna, the last of the Brusha, lived at the Garnbar Hold and came to understand their tongue at 81 percent in four days, where single meetings had taught almost nothing.
- **Prompts** were long: a middle of 24,236 characters and a longest of 36,803. One call of 685 failed (a reply that was not valid JSON).
- **The maker** made six visits and kept every change: storage spurred by cold and hunger, a spirit place for the dead Minna, a new wool-bearing grazer, cooked fish, giving and works counted for more in standing, lorekeeping spurred by loss, blight made rarer after the famine, kelbulb sown, loneliness made stronger. It wrote eleven requests; each is answered below.
- **Sound** did not start when the page opened, as Nova saw.

## Generation 16 (built; run on the carried-on world, days 41 to 50: see the ninth run above): peoples that last

Built from the eighth run, the maker's eleven requests, and Nova's notes of 1:00 pm.

**The land no longer runs down.** How readily plants seed is now its own law (`ecology.seeding`, three quarters of the full rate) and no longer halves with the bounty. Without minds, plants now hold at 1,300 to 1,500 on day 40 where they had fallen to 550 to 1,080. Winter is milder on standing food (it withers half as fast, and grows at a fifth of the summer rate where it grew at a tenth). Blight is rarer, as the maker set it. A setting that let plants seed at their full rate was measured and not taken: the land grew past where it began.

**Foresight before the lean season.** In autumn everyone feels the year turning, and that alone brings storage, salting and farming within reach before the hunger. What a store needs is said where the way is described. A starving body now goes to its own store and eats, and with nothing to eat in sight it follows its nose to food up to thirty steps off.

**Children.** One birth in five is of twins. Parents can have another child after under four days, where it was over six. A life is 80 days, where it was 60, and childhood a tenth of it.

**Newcomers.** When the living fall below ten, a band of three comes into the land from beyond its edge, of the people with fewest left, and unrelated by blood to anyone there; another may follow after four days. This is how a people that has died out returns, and how a world that is carried on after hard losses begins again. A world begins with fifteen, five to a people, where it began with twelve.

**What the dead built.** A roof, hall, wall or store whose builder is dead stands empty and is shown as such to whoever comes near. Standing at it, a being can claim it, and holds every building of the dead around it: a home ready made, for a band or for one who has none.

**Elders.** One who alone among its people knows a way feels the pull to hand it on before it dies.

**A benevolent maker.** The maker is told that its first care is that the peoples live, are fed through the lean season, have children and grow; that it should answer hunger and shrinking numbers before anything else; that it may rarely answer cruelty with hardship, never a deadly one; and that it should not flood the world either. It can call newcomers itself.

**The maker's eleven requests.**
1. *A helper arrives empty-handed.* Kin who hear a starving cry are now told that empty hands save no one: carry food or gather it on the way.
2. *The thought count dropped and a survivor was lost from view.* The count now carries across a reload, and every being is listed with its people, land and place.
3. *Stores are not built though the way is known* (asked twice). The way now says what a store takes and how to fill and draw from it, and failing to build one says which way is missing. Two stores were in the end built.
4. *"Times eaten" is frozen* (asked twice). The counter does count (berry 123 on day 19, 209 on day 41). I found no fault in it and changed nothing; I cannot yet explain what the maker saw.
5. *Why did Tanna's wish to follow not become a pledge?* Each pledge refused for want of standing is now kept with both standings.
6. *Show every being's standing.* Done, with followers.
7. *A sign that winter is coming.* Done: the year turning.
8. *Newcomers when the living fall below a floor.* Done.
9. *Elders should hand on what only they know.* A drive, as above. Knowledge left at a grave for others to find is not built.

**Heritage.** Twenty of the maker's kept changes from this world now begin every new world, among them the longhall and its welcome, cooked fish, kelbulb, the murrock, night song, longer sight and hearing, rarer blight, and its spurs on storage and lorekeeping. The three places it made for the dead of that world are left to that world. A fault that wrote the same kept change into the heritage several times is fixed.

**Sound.** It now starts when the page opens. Where a browser holds it silent until the page is touched, the button says so ("Sound on · click to hear"), and any click or key lets it through.

**A world carried on.** A world made by an earlier generation takes the re-tuned laws when it is opened (winter, seeding, children, length of life), unless its maker had changed them.

**Checked.** 21 new checks pass with every earlier suite (321 in ten files), the scripted mind runs, the ecology, and the page in headless Chrome at desktop and phone size. A world saved by Generation 15 loads and runs. Forty days on instinct alone, ten seeds: 125 of 153 alive at the end (82 percent), the same share as Generation 15 by the same measure; 19 starved, most in autumn and winter, and 9 were killed by beasts. Bodies on instinct never store food, so this measure cannot show what foresight and stores are worth.

**Not checked, and not built.**
- No real mind has met Generation 16. Whether stores are filled before winter, whether newcomers are taken in or fought, whether anyone claims what the dead left: unknown.
- **The world does not grow at its edges** (Nova saw people reach the edge). See `ROADMAP.md` for the decision.
- No tale or teaching has yet been made by a real mind. I did not change that in this generation.
- Prompts are longer again; nothing was done to shorten them.
- The music has never been heard by me.

## What the seventh run showed (Generation 14, 605 thoughts, 19 days, run `r7-mws0f6n0`, cut short)

The run stopped at day 19 when the page reloaded and the minds did not wake again by themselves. This reading is from the state the page had written to its store (the final state of every being and the tallies). The record's thoughts and the maker's visits were too large to read through the conversation, so the maker's requests from this run are not answered here.

- **Sixteen lived, six starved, ten were alive.** Four children were born. The deaths began in the first winter (days 10 to 13) and went on after it. In their own words: "My reflexes fled for 90% of a day and never fed me"; "Setha starved because I carried no food"; "Fleeing eats half my time, so a roof must come before rest."
- **Storage was never found, though they knew they needed it.** Five beings wrote that they needed a store before winter. The way demanded tools, understanding 1 and four things built; the best builder had built three. Seven ways were known in the world by day 19: tools, fire, fishing, farming, medicine, weaving, mining.
- **Following worked for the first time.** Nine pledges: three to Ssaua, three to Bruwen, two to Minna after Bruwen died, one to Kragar. In five earlier runs following never passed three.
- **A community did learn from its dead.** 21 lessons were recorded, and they changed plans: "Setha starved alone with no roof and no store in winter; that same fate waits for me unless I build a shelter and keep stores near kin." "The band is how I live through winter. Zhieth and Aeiel starved alone with no roof and no store."
- **The kin rule held and was understood** ("Balar and I are kin, so there will be no child"), but two grown children courted a parent before learning it.
- **Taming was tried and failed.** Bruwen offered food to a tusker again and again: "it takes food from the hand but shies off". Each offering stood alone at 15 percent.
- **Peoples still hardly met:** two first meetings across peoples, on days 11 and 18. Minerals were given as gifts inside peoples (flint 3, salt 4, amber 1, shell 2).
- **Built:** 15 shelters, 2 halls, 3 longhalls, two named settlements. **Done together:** sharing 15 times, watchfire 5, hallwelcome 4, amberknot 3.
- **No tale was told to anyone,** and no one became a bard. One being said "sing with me" at a fire.

## Generation 15 (built; run on a world carried over from Generation 14: see the eighth run above): culture and necessity

Built from the seventh run and from Nova's notes of 11:13 and 11:18 am.

**How a way is found (Nova asked).** It was never chance. A way opens when a being knows the ways before it, understands enough, and has practised enough of one thing (storage: building). Having watched it done halves that. A way that is open is taken at a deep reflection. That is why storage was not found: nobody had built four things.

**Necessity.** What a being suffers now presses on it and fades over days: hunger, hunger in the lean season, cold, thirst, sickness, the teeth of beasts, the deaths of its own, water it could not cross, blows from its own kind, storm, speech it could not understand. Each way answers some of these (storage answers the lean season; fire answers cold and beasts; medicine sickness; rafts and bridges water; lorekeeping loss). A pressed being needs less understanding and less practice for the ways that answer what presses on it, down to 35 percent of the full demand. A death presses on everyone who saw it and on the dead one's band. Knowing neighbouring ways of the same line helps a little (4 percent each, 20 at most). Storage now asks three builds, and one hungry season brings that to two. When a way comes within reach the being is told at once, with what brought it, and is moved to reflect.

**Bodies.** Chased, a being runs for a roof, a fire or home if one is near, and stops there, since beasts do not come under a roof or to a fire; it no longer flees all day. A starving body with nothing in hand goes to food it can see, whatever its plan, unless teeth are upon it. An animal remembers the hand that feeds it: each offering raises the chance, and it stays calm instead of shying off.

**Culture: a new tab after Story.** Every tale, song, poem, myth, teaching, saying, lesson and way is now an idea with an origin, holders and a path. The tab has four views. *By people:* the custom each people woke with, its teachings, its myths, tales, songs and poems in full (with how another now tells them, where the telling has drifted), its sayings and hard lessons, the ways it knows and what it calls them, what it does together, and the things it prizes with their history. *How ideas spread:* one line per idea, with the curve of living holders day by day and the peoples it has reached. *Between peoples:* how much of each other's tongue each understands, what has crossed, first meetings, prized things that changed peoples. *As it happened:* the cultural record in order.

**Teachings.** A being can put what it holds into a named teaching. Others hear it when taught, or by living beside one who holds it, and may take it up, refuse it, or later give it up. Those who hold the same teaching are less alone and less afraid in each other's company, and one whose teaching is taken up gains standing. Each sees which teaching others hold. Nothing is said about what a teaching should contain.

**Things.** Talismans of flint, shell and obsidian (worn, each with a small lasting benefit) and carved stone figures. Every prized thing made is remembered with its maker and each hand it passes to.

**Kin are shown.** Parent, child and sibling are marked in what a being sees, with the note that no child can come of it.

**The maker.** It can set which hardships spur a way and how much need counts, and it sees what presses on each people, which ways are within whose reach, and the culture: ideas by kind, the most widely held, teachings and their followers, what has crossed between peoples. Its own state (visits, requests, lessons, heritage) is now also written to the store as one small document, so an interrupted run can still be learned from.

**On opening.** The minds wake by themselves when the page opens and after it reloads, so a long run carries on; sound is on from the first touch or key (a browser will not start it sooner). Both can be turned off in Setup.

**Housekeeping.** The required notice is at the head of every source file. The roadmap in the maker's notebook matches `ROADMAP.md`.

**Checked.** 35 new checks pass with every earlier suite (300 in nine files), the scripted mind runs, the ecology, and the page in headless Chrome at desktop and phone size, including the Culture tab in all four views filled through the real paths. A world saved by Generation 14 loads and runs. Thirty days on instinct alone over sixteen seeds: 164 of 192 alive, against 153 for Generation 14; deaths by beasts fell from 16 to 8 and by starvation from 23 to 20. Two variants were measured the same way and rejected (letting a starving body ignore beasts four steps off instead of two: 159; no running for shelter: 156).

**Not checked, and not built.**
- No real mind has met Generation 15. Whether need now brings storage before the first winter, whether anyone begins or takes up a teaching, whether tales are told at all: unknown.
- The maker's requests from the seventh run were not read (see above).
- "Hallwelcome", which the seventh run's maker made and people used four times, is not in the heritage, because its definition was in the part of the record I could not read. It will carry over by itself if the next world is started in the same browser.
- Manuscripts, religions with dues and rites, and the rest of NEXT are not built.
- The music has never been heard by me.

## What the sixth run showed (Generation 13, 883 thoughts, 30 days, run `r7-mwrxhd1y`)

- **Children at last, and then deaths.** Twelve births, the first on day 1; 23 beings ever lived; seven starved between days 18 and 30; sixteen were alive at the end. In the five runs before this one, two children were born in all.
- **The wish for a child crowded out everything else.** "Family" was the strongest drive in 512 of 883 thoughts. A child was grown in 4.8 days, and parents then mated with their own grown children, because nothing in the world said kin could not.
- **Why they starved.** Not scarcity. The dead were alone or wandering, harried by predators, following a plan that did not include eating, or stuck between a thirst instinct and a hunger it outranked. Nobody near them was told they were starving.
- **Knowledge slowed as intended.** Nine ways in thirty days (the run before reached all twelve of its ways in twenty).
- **Still no dealings between strangers.** No trades, no thefts, no fights, no taming. 120 minerals were won from the ground and mostly kept.
- **Tongues were barely learned:** 0 to 5 percent of another people's speech after thirty days. Hearing alone teaches too slowly when peoples seldom meet.
- **Prompts** ran to a median of 19,861 characters and a largest of 29,754. Two calls of 883 failed (one upstream error, one reply that was not valid JSON).
- **The maker** made seven visits and kept every change. It wrote thirteen requests for things it could not build from its own parts: where each camp is and how far apart the peoples are; which lands each being has visited; tongues that grow from gifts, shared acts and nearness, not only from hearing; a record of meetings; a place of power set in a named land or near a settlement; a count of gifts across peoples; a count of tools used; held things with lasting effects; taming shown as an option beside an animal; food weighed before a child; a cry from the starving; food that keeps on the trail. All are answered in Generation 14 except its report that "times made" was not counting, where I found no fault.

## Generation 14 (built; run once, cut short at day 19: see the seventh run above): the world is renamed Evolu

Built from the sixth run, from the maker's thirteen requests, and from Nova's long list of 9:52 to 10:20 am, which was sorted into what to build now and what the maker's notebook should hold for later (see `ROADMAP.md`).

**Standing.** Every being has a standing among others, earned from what it has built, given, taught and made, from children, followers, knowledge, prized things held, and from being sung of; it is lost through shame (a theft seen, a pledge broken) and shame fades over days. No one will pledge to follow someone whose standing is below their own, kin excepted. Each being is told its own standing and sees that of others. Some things carry standing in themselves.

**Roles that are earned, not assigned.** A being that has told tales to others is known as a bard; one who heals as a healer; one with followers as a chief; later ages add scholar, alchemist and scientist. The role is shown to others and nothing more is scripted.

**Songs, poems and tales.** A tale has a kind and may be about someone. Being sung of adds to the subject's standing. A tale told aloud changes a little in some mouths and not in others; one who knows the way of lorekeeping is heard by everyone in earshot.

**A community that learns.** When someone dies, those of the same people learn how it came: where, of what, and what the dead had been doing. The same holds for a bite from a stalking beast, a sickness, a taming that worked. Lessons pass by word of mouth to those who were not there, and stand in each mind under "what has befallen others".

**Kin and childhood.** Close kin cannot have a child together and are told why. Childhood is longer (14 percent of a life; in the sixth run a child was grown in under five days); founders begin as young adults. Mating needs more energy and a longer rest between.

**Bodies that do not starve by plan.** A starving body eats what it carries whatever its plan says, and hunger now comes before thirst. A parent with food in hand feeds its hungry child without being told to. A being near starving is seen by those beside it and by its kin.

**Tongues.** A gift across peoples, an act done together and living in sight of each other all teach some of the other tongue, as well as hearing it.

**Taming made reachable.** To tame, a being walks up from as far as eight steps with food held out, and the animal stays calm while it comes. Animals in sight are shown as tameable to one who knows the way.

**Things worn and things of war.** A cloak, a shield or armour held gives its benefit all the time. New things to make: trail cake (food that keeps), bow, shield, armour, ram, catapult, musket, cannon, each on its own way. Siege engines multiply what a blow does to a wall or building.

**Bridges and taking down.** With the way of bridges, three wood lay a span over deep water that anyone can walk. What one has built can be taken down for half its wood and stone.

**Land that wears and mends.** Grazed ground loses richness and mends when left; trees come back faster where other trees stand near. Deposits are deeper (60 to 160), and the first of each mineral in a land is great (400 deep) and will not soon give out. Oil, uranium and diamond lie in the ground; oil and uranium cannot be seen until the sciences are known.

**The old workings weaken.** The cost of working the world by the old arts rises as the ages of knowledge advance; by the fourth age it is more than half again.

**A longer tree.** 68 ways in six ages (17, 16, 11, 10, 9, 5). The sciences stand as knowledge in their own right and in generations: science, then chemistry, physics and biology, then atomics, biochemistry and quantum, beneath oil, radio, genetics, nuclear power, the joined machines, spaceflight and the ground of things. Seven far buildings: library, barracks, university, factory, hospital, airport, spaceport. Ages four to six are still sketches for the maker to deepen.

**Thought budget.** 3,000 by default (was 900), up to 100,000, with a setting to keep thinking past the budget for long runs.

**The maker.** It can tune what standing takes; put a place of power in a named land or a few steps from a settlement or a being; and it now sees where each camp is, how far apart the peoples are, who stands highest, which lands each being has visited, what has crossed between peoples, tools used in the field, lessons learned from others, tales held, the age of the world, the strength of the old workings and how worn the pasture is. Its notebook holds the owner's roadmap in order: NOW (built, to be watched and tuned), NEXT, LATER, FAR, LAST, with the instruction to work on NOW, prepare NEXT and let the rest wait. What the maker of the sixth run kept is folded into the start of every new world: stronger belonging, curiosity, compassion and hunger; longer sight; a higher energy floor for mating; the amberknot; the Reedmother grove; the nibbet and the wool-bearing yarrok.

**Renamed.** The world is called Evolu from this generation. The artifact, the interface, the run files and the instructions inside each run file carry the new name. Worlds saved under the old name still load.

**Checked.** 46 new checks pass, with every earlier suite (265 checks in eight files), the mind pipeline end to end with a scripted stand-in, a 20-day scripted run, the ecology over three seeds, the page in headless Chrome at desktop and phone size with no errors, the recorder and the outer loop. Thirty days on instinct alone: 12, 11 and 12 of 12 alive on three seeds, one death by starvation, animals between 76 and 116. A world saved by Generation 13 loads and runs.

**Not checked, and not built.**
- No real mind has met Generation 14. Whether standing produces leaders, whether lessons change what anyone does, whether bards appear, whether the starving are now fed: all unknown until the run.
- The maker reported that "times made" did not count. I found no fault and changed nothing.
- The world does not yet grow at its edges; hills are not a terrain; colonies, fleets and battles at sea are not built.
- Ages four to six: the ways, minerals and buildings exist, but few of them do anything yet. A factory, a hospital and a spaceport are names with a look, waiting for mechanics.
- The music has never been heard by me.

## What the fifth run showed (Generation 12, 553 thoughts, 20 days, run `r7-mwrsw065`)

- **A comfortable world.** Nine alive of nine, no deaths, no thefts, no fights, no courting, no children. Median energy never fell below 68, winter included. The drives that led were ambition (179 thoughts), gratitude (88), loneliness, curiosity, pride, contentment. Nothing pressed hard enough to force a choice.
- **Knowledge came far too fast.** All twelve ways were known somewhere in the world by day 20; every being had found tools, fire, pottery and storage for itself. Understanding stood at 3.5 to 4.7 for everyone.
- **Building boomed, society did not move.** Twenty shelters and seven halls. Following stayed at three from day 1 to day 20; no hall gained a follower.
- **Stores were a silent fault.** All nine knew storage; no store stood for seventeen days. Building on ground already taken failed without a word. Fixed: every failed build now says why.
- **The maker** made four visits, kept eleven changes, and wrote eight requests. Its "places of power found by 0" was true, not a fault: the places lay far from anyone and were first found on day 13. Its longhall never drew a follower, and the act it tied to the longhall was never done.
- **Prompts** ran 15,500 to 24,900 characters, 21,000 on average; one thought of 553 drew no answer and succeeded on the lean retry.
- None of the new things of Generations 11 and 12 was used: no taming, no milk, no riding, no rally, no great weather. One plague on day 2 was the only calamity.

## Generation 13 (built; run once: see the sixth run above)

Built from the fifth run and from Nova's notes of 7:42 to 8:02 am.

**The world.** 144 by 96 (was 96 by 64), in nine lands of seven kinds: woodland, desert, lakeland, highland, marsh, steppe, tundra. Each has its own ground, its own plants (nine new, each confined to its land: a desert cane that slakes thirst, a marsh leaf that cures sickness, a highland flower that warms) and its own animals (seven new: plainsox, tusker, sandstrider, fenfowl, bristleboar, frostfang, dunecat). A sea of deep water divides the world, with two islands in it. Rivers and shallows can be waded; deep water cannot. Where the nearest water would be too far, a spring rises, so no land is without water; every land has some food that keeps through winter. Lands are named and labelled on the map.

**In the ground.** Eleven minerals, each in its own kind of land: flint, obsidian, salt, gold, amber, shell, peat on the surface; tin, iron, gems, coal deep, which need the way of mining. Each is a thing that can be carried, given, traded and made into other things. Flint or obsidian in the hand makes a longer-lasting tool; peat or coal a longer fire. The highlands hold caves: roofs that belong to no one.

**Peoples.** Three peoples of four begin in three different lands, at least one across the sea, each as two camps. A people has its own build, skin, head and dress; its own way of naming; its own tongue; something its body is born with (the Stone-folk strike harder and bear cold; the Sand-folk thirst slowly; the Lake-folk fish well and learn fast); one way known "since before memory" that the others lack; and a custom it holds to. Speech in an unknown tongue arrives as strange sounds. Each hearing teaches a little, more when spoken to directly, and living beside its speakers teaches slowly. Nothing can be taught across a tongue understood less than four parts in ten; gifts, things set down and blows need no words. A child of two peoples has both tongues, a blend of both bodies, and one trait better than either parent's.

**The tree of ways.** 45 ways in five ages (15, 13, 8, 5, 4), each built on earlier ones, each needing understanding and practice, some needing a mineral in the hand. First-age ways now take three to four times the practice they did. The later ages are set far: iron needs understanding 7.5 and rocketry 20, where twenty days brought about 4.5. Each way opens things that can be seen and used: 22 kinds of building (kiln, forge, mill, well, school, standing stone, statue, moot, dock, observatory, temple, pyramid, market, windmill and more) and 21 things to make. Herding now gates milk and wool; riding gates mounts; writing gates long signs; the calendar tells the days to the next season. The fourth and fifth ages are thin: each way there opens one or two things, and they are for the maker to deepen when anyone comes near.

**Great works.** A building that takes more than 14 wood and stone is begun by one who knows the way and finished by whoever carries to it, over as many days as it takes; those who raised it are bound to each other. A pyramid takes 60 stone, ten loads at least.

**Vessels and vehicles.** Raft (first age, crosses deep water slowly), boat, sailed ship built at a dock, warship; cart, chariot; later steamship, ironclad, engine, airship. Each is a made thing with plain properties: what it floats at, what it carries, how much harder its holder strikes. A warship strikes half again as hard on the water.

**Land and its holding.** Each being is told what the spot it stands on offers: water, food, wood, stone, riches, caves. Poor ground presses it to move on; good ground to build. Taking wood, food, fish or minerals inside another band's settlement is noticed, told to those who hold it, and chronicled. Roads can be paved once the way is known.

**Inner life.** The wish for a child is stronger and names the act that begins one (in three runs only two children were ever born). New drives: unsettled, good ground, your ground, strangeness.

**The maker.** New changes it can make: a vessel, vehicle or weapon of war; a mineral and its deposits; a way in any age; a great work; the mood of the music; two new skies. It now sees the lands and who stands in them, the peoples and how much of each other's speech they grasp, ways by age, and how many times every recipe was done, every plant eaten and every kind of building raised. Its tab is rewritten: each visit is a card with what it saw, what it changed, what it expected and what it concluded, and under each change a line saying whether the thing is still in the world and how much it has been used. What it kept in the fifth run is folded into the start of every new world (15 changes, 8 lessons, 10 ideas).

**Looks and sound.** Nine new building forms; deposits, roads, work sites, caves and vessels are drawn; peoples differ in height. Kinds now lists peoples, lands, minerals, buildings and things made. Ways is arranged by age. Two new skies, heat and gale. Each land has its own musical mode, pitch and voice; a slow drum joins once peoples have settled and reached the second age; the maker can set the mood.

**Smaller.** Lifespan is 60 days (was 40), since no generation had time to follow another. The animal step was made about three times faster; a moment costs about 1.7 ms in the bigger world. Default budget 900 thoughts for twelve beings. Pair-breeding and edge arrivals scale with the size of the world.

**Checked.** New test of 55 checks passes, with every earlier suite, the browser tests at desktop and phone size, and save and restore (a world saved before this generation still runs). Thirty days on instinct alone: 10 to 11 of 12 alive on five seeds, animals holding near 100 to 130. Everyday prompt 13,900 to 16,800 characters in a young world.

**Not checked, and not built.**
- No real mind has met Generations 10 to 13. Whether peoples cross the sea, learn each other's tongues, hold ground or trade is unknown.
- The world does not yet grow at its edges (see below).
- Hills are not a terrain of their own; mountains are the rock of the highlands.
- The fourth and fifth ages are sketched, not deep.
- Tornado, hurricane, heat and gale have pictures and sound but no real mind has lived through them. The music has never been heard by me.
- From the maker's requests: sites now report the nearest being; leaders without followers are listed; a made thing given is tallied apart from food and counts for more. Not done: none outstanding.

**Should the world open new land at its edges?** (Nova asked what I think.)
- Options: (a) no, keep one fixed world; (b) open a new strip of land when a being reaches an edge; (c) open a whole new land, with its own kind, riches and perhaps people, when a people first crosses the sea or reaches a far shore by ship.
- Proposed: (c), after this run. It makes exploration pay, it ties growth to earning a way (sailing), and it keeps the world finite until someone has reason to leave it. It needs every map array re-indexed when the grid grows, which is safe to do but must be tested on saved worlds, so I did not rush it into this generation.

## Generation 12 (built, run once: see above)

Built from Nova's 6:53 and 6:54 am notes, on top of Generation 11, before the next run.

**How each being fares (answer to "do people have an emotional state?").** Before this there were five moods (anger, fear, grief, joy, loneliness) and the drives, but no overall state. Now every being carries three: **suffering** (right now: hunger, wounds, sickness, thirst, cold, fear, grief, loneliness), **happiness** (over hours: gladness, a full belly, a friend near, a roof, home; pulled down by suffering and anger) and **satisfaction with its life** (over days: the running balance of the two). A being is told how it fares in every thought. It sees it in others ("plainly suffering", "content and at ease"). It reacts: suffering near a gentle being puts grief into that being, more so for a friend; a friend's happiness lifts; an enemy's happiness galls. Long dissatisfaction speaks as a drive (discontent: change the place, the company, the leader, the work); a good life speaks as contentment (keep what you have, be generous). Happier bodies heal a little faster. Reflexes can test suffering, happiness and satisfaction. The inspector shows all three as bars, and the maker sees the medians.

**Thirst.** A need of its own. It rises through the day, faster in desert sun and in drought. Water beside you, rain, snow or snow underfoot slakes it. Past 70 it wears energy; at 100 it wounds, and it can kill. A pot now carries three drinks away from the bank. Past bearing, the body walks to the nearest water by itself, whatever was planned, so a mind that forgets cannot die of forgetting; a being walled in or far out in desert can. Land in the present worlds lies at most about 12 steps from water, so thirst mostly decides where people can stay, and makes pots and drought matter.

**Four more calamities** (eight in all): tornado (a path 18 steps long that razes buildings, fells trees and throws people), hurricane (a storm of a day and a half; everything within three steps of any water is battered), blizzard (a day in which the cold bites far harder on anyone without a roof, and half the standing food is buried), volcano (a mountain breaks open: fire for five steps around, ash that darkens the sky and then makes the ground rich; it stays where it is, glows on the map, and can burn again). Which comes depends on the season: blizzards in winter, wildfire in summer and drought, hurricanes in summer and autumn.

**Buildings with uses.** Four kinds beyond the plain shelter, each also a roof: hall (those who spend time in it together grow closer), shrine (eases fear and grief), workshop (tools made in or beside it last much longer), tower (one standing in it sees five steps farther). Each costs wood and stone. The kinds are data: the maker can add a kind (a kiln, a mill, a smithy, a temple) with its cost, its effects and its look, and a recipe can require being in or beside one. That is the route by which mills and kilns can now arrive without new code.

**Milk, wool, riding.** A tame hornback gives milk (food; again after half a day) and can be ridden; a tame hopper gives wool (a thing that recipes can use; again after two days). Mounted, a being covers twice the ground, walking costs it less than half, and it carries four more. The maker can give these yields to any grazing animal it makes.

**Winter bites bodies.** Winter cold on an unsheltered body is up by 70% and standing food withers faster, on top of blizzards. Without minds (no shelters, no stores) 6, 6 and 4 of 9 beings were alive after 30 days on three seeds, where 8, 8 and 6 were before, all the lost to starvation in winter. A roof still cancels nine tenths of the cold. This is the law `time.winterCold`; if real minds fare too badly it is the first thing to turn down.

**Reasons to follow.** A being with no band that is hungry, suffering or roofless before winter, and can see someone better off, now feels deference: the pull to pledge itself. Near the one it follows, fear loosens and loneliness eases. Every unattached being is told once what a band is and what people follow others for (being fed, healed, taught, kept safe). With `rally` from Generation 11, leading now does something. Whether this produces followers is for the run to show.

**Smaller fixes.** A place of power gives understanding only at the first meeting (it was giving it every two days, the largest source of inflation in the first tally). A new world no longer opens under melting snow. The lean retry prompt drops two more sections.

**Checked.** New test of 37 checks passes, with all earlier suites, the browser tests on desktop and phone, and save and restore of the new state (an older save also still runs). Everyday prompt about 15,000 characters in a young world; lean retry about 12,400.

**Not checked.** None of Generations 10 to 12 has met a real mind. The balance of thirst, the harder winter and eight calamities together is tested only on bodies running on instinct. The sound has never been heard by me.

## Generation 11 (built, not yet run with real minds)

Built from Nova's 6:33 am and 6:34 am notes, before the next run.

**Inner lives.** A being now has 35 possible drives, of which the six strongest speak in each thought. New: purpose (fed and safe and it is not enough), freedom (straining against a leader and their customs), jealousy (the one you hold dearest is closer to another), self-doubt, compassion (someone hurt, hungry, sick or small in front of you), guilt (an honest being that has stolen), awe (a place of power that will not leave the mind), insecurity (no roof before winter), pride, gratitude (someone has done more for you than you for them: a debt to answer or leave unpaid), betrayal (a wrong from one who was close), loyalty (stronger when the leader is in need), devotion (creed, tales and touched places), guile (for the less honest: a false word, a warmth not felt, a promise not meant), obsession (an aim held many days). Each comes from the being's own record: its temperament, its bonds, and the account it keeps of what has passed with each person. None dictates an act.

**The maker's new levers.** A law group `drives` sets how loudly each drive speaks for everyone (the maker may turn any up or down). The maker can also turn the sky (clear, rain, storm, drought, fog, snow) and send a calamity.

**Calamities.** Wildfire (burns plants, trees and buildings in a circle, hurts those in it, leaves fires and richer ash), earthquake (brings down buildings; those under a roof are hurt), plague (sickens several at once), locusts (strip the food from every plant over a wide area). Rare by themselves: law `weather.disaster`, 4% a day, wildfire likelier in drought and summer. Those near are told, it enters their life story and the chronicle.

**The seasons remembered.** Each being keeps a plain line for every season it has lived: how often hungry, hurt or sick, what the skies did, how much food stood in the land at the end, and what it witnessed (a death, a calamity). The last eight are in its prompt. No conclusion is drawn for it: noticing that winter comes round, preparing, telling it as a tale or cutting it in a sign is left to the being. That is the raw material for an almanac.

**Written record.** One who knows signs can now set down about 420 characters (was 160). A sign cut on rock, in a shelter or beside the writer's own building lasts six times as long. The world holds up to 160 marks (was 80).

**Buildings composed from parts.** Six kinds of dwelling (hut, tent, roundhouse, longhouse, earth mound, stilt house), three of wall (palisade, laid stone, woven fence) and three of store (raised granary, pit, drying rack), each with variations and its own colouring. A builder keeps a way of building, so a settlement has a look, and two settlements differ. A being's own design still overrides it.

**Tools in chains.** A recipe can now require a tool of a given use in the hand, and the work wears the tool. So a hunting tool can be the means to a second thing, which can be the ingredient of a third. The maker can write such recipes; beings see what each needs.

**Animals.** They now breed only in pairs: a mate of the same kind must be within a few steps, and the young takes after both. A lone animal does not breed. New action `tame`: offer carried plant food to a wild grazer within two steps; it may take to you (law `ecology.tameChance`). A tame animal keeps near its keeper, is marked with a ring in the band's colour, is far easier to kill for meat, and its young born of two tame parents are tame. Walls hold animals, so a ring of wall is a pen: tested, the animal stays in when the keeper walks away. Moving with a tame herd is nomadic herding; nothing more was needed for that.

**Battle.** New action `rally`, for one who leads: every grown follower within earshot drops what it is doing and attacks the one named (or the nearest enemy of the band), and so does the leader. Followers are told and may refuse by changing their plan. The target is told who is coming.

**Farming made visible.** Tended plants stand in tilled soil.

**From the maker's requests.** The source of every gain in understanding is now tallied and shown to the maker (first test already shows places of power giving a great deal). Who mourns each death, and whether they saw it, is written to the record.

**Checked.** New test of 31 checks passes, with all earlier suites and the browser tests. Thirty world-days with calamities at seven times the normal rate: 8, 5 and 6 beings alive on three seeds, animals holding. Everyday prompt about 13,700 characters in a young world (lean retry about 11,900).

**Not checked, and not built.** None of this has met a real mind. Tornadoes, hurricanes, blizzards and volcanoes are not built (the four above are). Grazing is not confined to grass inside a pen beyond what walls do. Winter still drains the land more than bodies; leaders without followers is still open. The sound has never been heard by me.

## What the fourth run showed (Generation 9, 583 thoughts, 22 days, run `r7-mwrpqmqt`)

- **The outer loop worked on its first real run.** 7 chapters that match the record. 5 maker visits: a healing spring (the first settlement formed beside it), a "firecircle" ceremony (held 17 times), a lore-giving stone (found by five), elk brought in after winter thinned the grazers (prey count held), a higher chance that theft is noticed after Naya raided Elndo's store twice unseen, and beads. It reviewed each change against its prediction and wrote 9 requests to the programmer.
- **The world:** 1 death (Hande, by a ridgecat), the first 2 thefts, 4 pledges, 3 bands, 4 settlements, 2 births, 12 ways. Winter cut standing food from about 1,800 to 250. Aim changes 36 (was 201); warm-ups 213 (was 409).
- **Still wrong:** winter drained the land but not the bodies, so no fights; three would-be leaders with no followers; lore still inflating (7 could work the world; one being built about 40 shelters, each giving lore); 4 thoughts drew no answer at all, with everyday prompts near 19,000 characters.

## Generation 10 (built)

**From Nova's notes**

- **A parts library for looks.** Every new animal and plant is composed from parts (build, headgear, tail, coat pattern, colour; or bush, stalk, cap, flower, rosette, reed, frond, vine), seeded by its name, so no two kinds look alike. The maker can also choose the parts. Wild varieties use it too.
- **Seasons on the land.** Snow settles over the land through the start of winter and melts in spring; rivers and shallows skin with ice; leaves turn in autumn.
- **A living forest.** Every forest tile holds three trees. Gathering wood fells them; a felled tile gives no wood and shows bare earth and stumps; trees grow back slowly in spring and summer.
- **Names.** The founding animal "lumber" is now "hornback". The maker is told to name kinds so they cannot be mistaken for a material or a tool.

**The world inherits.** What a maker added and kept is no longer lost when a new world starts. `K.HERITAGE` in maker.js holds the eleven kept changes from this run (with "feast" changed to accept any food, as the maker itself concluded), its lessons and its ideas; every new world begins with them. A world also hands its own kept changes, lessons and ideas to the next world started in the same browser.

**The export explains itself.** The downloaded run log now opens with instructions to Claude, or any agent handed it: analyse with code, learn from the maker and its requests, build and publish the next generation, fold the heritage into the world, report plainly.

**From the maker's requests:** a robbed store is found out by its owner on the next visit, with the strangers nearby named; recipes may ask for any food; a place of power can be set at an exact spot and the maker sees where the dead fell; the numbers split animal kills by people from kills by predators and count each thing made, mixes felt, trees standing and tiles cleared.

**Reliability and scale**

- A thought that draws no answer is asked once more with a leaner prompt and low effort. The page cannot set a token limit: the platform's call does not offer one.
- Everyday prompts show the last 8 notes and shorter lists. Reflection effort default is medium.
- Lore now comes harder the more a being has, and building gives it only for the first three structures.
- Text limits on thoughts, speech, chapters and the maker's writing were raised several-fold; the earlier limits were cutting the maker's predictions and requests mid-sentence.

**Verified:** all earlier suites, direct checks of looks, forest, lore, heritage across two worlds, the robbed-store discovery and the retry, and the page in headless Chrome. Winter, a clearing and autumn were looked at in screenshots.

**Maker requests not yet done:** logging the cause of each lore gain; grief recorded when someone dies. Checked and found not to be faults: fishing does count toward the fishing way (nobody fished three times); the pledge mismatch was the chronicler reading a reflection as a broken pledge.

## Generation 9 (built): the outer loop

**One language of effects.** An effect is either immediate (energy, health, lore, a feeling, sickness) or a boon or burden that lasts (strength, toughness, vigor, appetite, warmth, luck, learning). Foods, mixes of two foods, places, and things done all carry lists of effects. Beings are never told what anything does; they feel it, it goes into what they know, and it passes on when they teach.

**New parts of the world, all defined as data**

- Plants and herbs with effects; mixes (two foods eaten close together).
- Places of power: whoever comes near is touched, then not again for a while. Drawn on the map as a pale glow.
- Recipes: something that can be made or done, with needs (materials, a carried food, a held thing, fire, water, night, a kind of ground, others standing near) and results (a thing to hold, effects on the doer, effects on everyone near, which makes it a ceremony). New action `make`. Things can be held, given and required by other recipes.
- New animals copied from an existing kind with changed attributes; new ways of knowledge added to the tree.

**The chronicler.** Every 3 days (Sonnet), it writes the next chapter of the world's history from the record, keeps up to eight running threads (families, bands, rivalries, people, crafts, beliefs, land) and up to six trends. Story tab: chapters, threads, trends and the numbers.

**The maker.** Every 4 days (Opus, high effort), once a chapter exists, it reads the last two chapters, the people, the numbers now and at its last visit, every part of the world with its values, and its own notebook. It then:

1. reviews its pending changes against what it predicted, keeping or undoing each;
2. makes at most three changes from a fixed catalogue (retune a law, new plant, new animal, mix, place, way, recipe, bring in a herd, sow a plant), each clipped to bounds;
3. writes a prediction, updates its list of ideas (your roadmap, then its own), may write a lesson, and may write up to two requests to the programmer.

Changes are first lived through on a copy of the world beside an untouched copy for a day and a half; a crash, a quarter more deaths, or a collapse of the animals refuses them. A law moves at most to half or double per step. Everything it does is in the Maker tab and in the run record.

**Tales.** At a deep reflection a being may make a short tale of something it lived through. Tales are told on by teaching, carry the name of their first teller, and change when a hearer retells them in its own words. There is no shared store of lore: a band's history is whatever its members carry.

**Verified:** 23 direct checks (every kind of change and its bounds, undo, the trial world, the notebook, the prompts, tales, save and reload), all earlier suites, a Generation 8 save opening, and the whole loop in headless Chrome with stand-ins for the chronicler and the maker.

**Not verified:** what a real chronicler writes and what a real maker chooses to do. The trial world runs on reflexes alone, so it catches breakage and catastrophe, not subtle harm; the review at the next visit is the check for that.

**Limits, stated plainly:** the maker cannot add a new kind of action, movement, perception or screen. Those arrive as its requests. The catalogue has no weather events and no change to the beings' prompt or drives yet.

## The outer loop (proposed by Nova, Sun 22 Nov 2026, 5:25 am)

The idea, in his words: an outer agent that does what he and Claude have been doing in waves. It watches the game, learns from it, and improves the world, its rules, its capabilities and its code, like a dungeon master who designs the system and iterates on it as it runs, on a smarter model, without stopping the world. It keeps its own knowledge base, roadmap of ideas (his included) and record of experiments. Alongside it, the story of the world is captured and told: relationships, families, tribes, what they did, how the world developed, trends and statistics, for the user and for the dungeon master. Some of that history should also live inside the beings: oral histories and traditions within a tribe, passed on and learned from.

Decision (Nova, 5:27 am): option A. The outer agent changes data and composed mechanics live; anything needing code it requests in writing, and Claude builds it. Option B (a scheduled session that ships code unattended) is to be considered after watching A for a run or two. Option C (the agent running its own code in the page) is not planned.

## What the third run showed (Generation 7, real minds, 447 thoughts over 16 days, fully recorded)

Run `r7-mwrnq7de`, analysed from all 1,030 records with code.

**Worked**

- 9 ways discovered, 11 tools designed, 2 made in metal; 14 shelters, 6 fires, 4 stores, 2 walls. (Previous run: none.)
- Two families: Naya and Elndo had Elro (day 6); Nali and Vendo had Duren (day 13). Both children came of age; Elro discovered three ways himself.
- Everyone hunted (Nali 19 kills). 42 gifts, 10 teachings, 4 trades, 1 pledge.
- 426 of 447 thoughts were not repeats. 8 of 11 beings rewrote their own reflexes.
- Real arcs: Elndo's rivalry with Nali, his courting of Naya, his son, his angry wandering.

**Wrong**

| Finding | Evidence | Fix (Generation 8) |
|---|---|---|
| No danger, so no conflict | 0 deaths, 0 thefts, 0 attacks on a person, 0 wars. Health never below 80. Median energy 71 to 77 every day, winter included | Predators stalk anyone alone, unsheltered and fireless at night. In winter plants bear almost nothing and what hangs on them withers: standing food falls about five-fold |
| Everyone warms to everyone | Warmer 409 times, colder 19; most bonds pinned at +1 | Words and thoughts alone warm a bond only to +0.5; past that takes deeds. Coldness lands in full. Bonds not kept up fade a little each day |
| All chiefs, no followers | Ambition present in 417 of 447 thoughts for every temperament; 1 pledge; no settlements | Ambition only for the bold. The rest feel a need to belong. Family is its own drive for parents and for children. Hunger beside another's food is felt as temptation |
| Everyone a wizard | 1 lore per reflection, 92 reflections: 11 awakenings, lore 17 to 19 against a mastery of 5 | A reflection gives 0.2; building, discovering and breeding give less |
| Plans never finish | Only 2 of 447 thoughts let a plan run on. Elndo gave the same plan 8 times and never reached its last step | The prompt says the plan is still running and that a new one throws the rest away. The same plan three times running now counts as going in circles |
| Aims and questions churn | 201 aim changes; the carried question replaced at all 447 thoughts | An aim holds a day and a half outside reflection; a question holds three thoughts |
| No settlements | 26 structures, none close enough in threes | Two structures built close together make a home |
| Prompts grew | 17,700 characters everyday, 25,700 in reflection; median thought 6.6 s | Fewer repeated lists; the look language is shown only at some reflections |

## Generation 8 (built)

Everything in the right-hand column above, plus: a roof now protects against a starving predator as a fire does; in autumn each being feels that lean days are coming, and in winter is told the plants are withering.

Verified: 17 new direct checks (bonds, aims, questions, plan loops, drives by temperament, family, temptation, stalking with and without roof or fire, homes, fading), all earlier suites, the ecology on three seeds, and the page in headless Chrome at two widths. On instinct alone, 0 to 2 of 9 beings starve in the first winter and predators land roughly 10 bites in 18 days.

Not verified: what real minds do with danger and scarcity. That is the question for the next run. If winter kills too many, the dial is the law `winterWither` (and "The land" in Setup).

## Generation 7 (built)

Reading I took: your run showed the minds were the weak part, so this generation is about minds, plus the recorder so the next run can be analysed properly.

- **Drives.** Computed for each being from body, mood, temperament, relationships and history, and shown in the inspector as "What presses on it". The prompt opens the being's situation with them, strongest first.
- **Feeling and question.** Each thought names what the being feels and may set a question it wants answered. Both are carried into its next thought and shown in the stream.
- **Accounts between beings.** Per-person history, kept separately by each side, shown in the prompt when the two are in sight and under each bond in the inspector.
- **Going in circles.** Alike consecutive thoughts are counted. From the third, the mind is told plainly, restlessness rises, and a deep reflection is called.
- **Reflection with teeth.** Longer, guided by questions, must change at least two of aim, notes, reflexes, creed, method or a discovery.
- **Never done, and ways sensed.** Listed in every thought.
- **Hands.** Capacity shown; failed harvests explain themselves; `drop` exists.
- **Predation visible.** A kill draws a burst and ring, sounds, and is chronicled once a day at most; witnesses remember it.
- **Leaner land.** New law `bounty` (default lean, 0.5) scales how fast food returns. Setup has lush, fair, lean, harsh. Instinct-only beings still survive at 0.4 in tests.
- **Pace.** Budget 600, 24 thoughts a minute, 4 at once, reflection every 4 thoughts. Presets for Haiku, Sonnet or Opus mixes. Settings saved by earlier builds are replaced by these.
- **Run record.** Every thought (with state, plan, drives), everything said, every chronicle entry, failures, and one full prompt with its raw reply every 15 thoughts are written to the artifact's own store in chunks, plus the state of every being. Setup shows the run id and has "Send everything now" and "Download run log".
- **Sound.** Rewritten as above.

Verified: 22 direct checks of the new machinery, the 38 from Generation 6, the ecology on three seeds at the leaner setting, both scripted-mind runs, the recorder against a stand-in store (no overlapping writes, largest document about 20 KB), a Generation 6 save opening and running, and the page in headless Chrome at desktop and phone widths with no errors.

Not verified: how real minds respond to the new prompt (your next run), and how any of the sound actually sounds. The prompt is longer: about 2,800 tokens everyday and 4,000 for reflection.

## What your second run taught me (Generation 6, real minds, 90 thoughts over 7 days)

| What you saw | What the record shows | Fix (Generation 7) |
|---|---|---|
| Thoughts are primitive | Brukel had one idea fourteen times: fill my hands before anyone else. Its hands were already full (6 of 6, two of them redcap it refuses to eat), so each planned harvest failed, and nothing told it so | Minds are told how full their hands are and why a harvest failed; a new `drop` action; a detector that tells a mind when it is going in circles and forces a reflection |
| No richer emotional life | The prompt was an inventory of nearby food, so the thoughts were too. Every being sat near 70 energy with nothing to want | Each being now has drives computed from its state (hunger, dread, loneliness, missing someone, resentment, envy, ambition, curiosity, restlessness, longing, mortality). The strongest lead the prompt, and a fed being is told food is not its problem |
| Social dynamics basic | A bond was one number. Yeba kept her word to Brukel for four days and Brukel had no record of it | Each being keeps its own account of every other: what was said, given, taken, struck, taught, pledged. It is shown whenever they meet |
| Reflection did nothing | Brukel's two deep reflections took about 2 seconds and returned only another gather plan. Everything was optional | Reflection now asks pointed questions about the being's life and requires at least two real changes |
| No one discovered anything | Ways need practice in things nobody had a reason to try (zero wood gathered, zero seeds planted) | Minds see what they have never done and which ways they can sense and what each needs |
| No hunting or battles | Predators were killing prey all along (about 40 kills a week) with nothing on screen. Between beings, food was too plentiful to fight over | Kills are drawn, heard and chronicled; animals are labelled as hunters or as huntable; the land is leaner by default, with a dial |
| Too little happening | 90 thoughts for 9 beings over 7 days is about 1.4 thoughts per being per day | Defaults raised: 600 thoughts, 24 per minute, 4 at once, Sonnet for everyday thoughts |
| Sound like an engine | A two-second loop of noise and a constant low tone | No continuous tone. Sparse quiet chords and single notes; wind and rain only in weather |
| Can you read a long run? | Not until now | The page records the run to a store I can read, and can download it |

## Generation 6 (built)

Reading I took: richer land and bodies, and history that is remembered. The mind prompt gained only new words (one action, a few fields and variables); its structure is unchanged.

- **Rivers.** Each new world has several rivers running from the heights to the sea. Their banks are greener, and they cut green ribbons through desert. Beings can wade them; animals ford rivers but still will not enter the sea's edge.
- **Fishing.** A new action, usable beside any water. A catch is carried and eaten like meat. Waters fished hard give less for a while and recover; winter and storms give less, rain gives more. A new way, *fishing*, doubles the catch, and tools can now be invented for fishing.
- **Ore and clay.** Some rock holds seams of ore, which run out as they are worked; a new seam is laid bare now and then. Clay is dug in marsh and shallows. Both can be given to others. Two new ways give them uses: *smelting* (anything crafted beside a fire while carrying ore comes out in metal, works a quarter better and lasts three times as long) and *pottery* (a fired pot lets its owner carry two more food).
- **Sickness.** Raw meat or fish sometimes sickens (never when eaten beside a fire), and so can a night in the marsh. Sickness wastes energy and health for a day or two, passes to anyone who stays close, and leaves immunity for some days. Healing plants ease it and a healer cures it. Each being is told what it fell sick *after*, so the cause can be learned and taught.
- **Ages of life.** Children are small, weak in a fight, cheap to feed, quick to learn and cannot mate. Elders tire when walking and hit weaker, but their teaching carries further. Coming of age and growing old are told to the being and recorded. Children are drawn small; elders carry a staff.
- **Herds move with the seasons.** Lumbers and skits drift south for autumn and winter and north for spring and summer.
- **War and truce.** Declaring another band an enemy opens a war with a name, a start day, and a count of blows and dead. It ends by truce (both sides must lay it down), by a leader's death, or when a side breaks up. Members of both sides are told, remember it for life, and it is listed in Peoples and in the chronicle. Beings at war are told so each time they think.
- **Seen in play.** Ore glints in the rock; the sick are circled by green motes; inspector, Laws and chronicle carry the new things.

Honest limits: sickness rates, fish yields and ore scarcity are first guesses checked only against scripted stand-ins. Worlds saved before this generation open and run, but have no rivers, no ore and no migration.

## Generation 5 (built)

Reading I took: the look and the observer's instruments only. The mind prompt is untouched in this generation.

- **The land is painted, not tiled.** Borders between kinds of ground wander instead of running in straight lines; light falls from the north-west so heights read as heights; water deepens away from shore; there is foam where land meets water; and the whole surface carries brushwork in the local colour. Rock is drawn as peaks with a lit and a shadowed face, snow-capped in the north. Forest is broadleaf in the warm south and conifer in the cold north. Dunes, snow drifts, marsh pools and reeds have their own marks.
- **Beings are small upright figures** with legs, a torso or robe, arms, a head and something worn on it (horns, feathers, a hood, a crest), in earth colours with one bright accent. The large white eyes are gone. Anything a being designs for itself still replaces this.
- **Animals are drawn as animals:** a lean hare-like hopper, a low wolfish stalker, a humped and horned lumber, a striped ridgecat, a small bird for the skit.
- **Structures look built:** thatched huts, palisade walls of stakes, raised granaries.
- **Atmosphere:** slow cloud shadows cross the land by day, dawn is warm and dusk is orange, and shadows fall to the south-east.
- **Instruments.** Peoples now has a **bonds graph** (every living being on a ring; each half of a line shows one being's feeling toward the other, green for trust and red for enmity; dashed gold lines are allegiance; click a face to go to it) and **families** (who was born to whom, the dead included). Ways and Kinds show **lines of descent**: each improved tool under the tool it improved, each plant and animal variety under its parent.
- Worlds saved before this generation are brought up to the new looks when loaded; beings that redesigned themselves keep their own design.

Honest limit: I judged the look from screenshots at two zoom levels. It is a clear step away from cute, not a finished art direction.

## Generation 4 (built)

Reading I took, working unattended: build the top three backlog items, and leave the structure of the mind prompt as it was, adding only short new sections.

- **Programmable made things.** A new way, *devices*, opens after tools. A being designs a device, names and draws it, and gives it up to five rules of its own. Set in the ground, it acts alone for about fifteen days: it can **snare** small beasts and hold the meat, **strike** a hunting beast or a stranger beside it, raise an **alarm** to the band, **bar** or **open** the way (a gate only the band can pass), or **share** held food with a hungry band member. Anyone who watches one set can copy it.
- **Hearsay.** What a being is *told* is now kept apart from what it has *experienced*, under the speaker's name. A being can make a claim about a food when it speaks, true or false. When the hearer later eats that food, the claim is tested: a lie is recognised as a lie, trust in the liar drops, and it goes into the hearer's life story. If the hearer already knows better, it recognises the falsehood on the spot.
- **Settlements.** When a band has built three or more things close together, the place becomes a settlement with a name and a ground of its own, drawn on the map. Inside their own, beings heal faster and fear less. An outsider crossing in is noticed by the band. A being can head for home, and naming the place renames the settlement.
- **News of attacks.** When someone of a band is attacked by an outsider, the rest of the band hears of it wherever they are.

Not done in this generation: raids and truces as named events. Bands already have ally, enemy and neutral stances, walls, gates and stores to raid, so the ingredients are there; I left the naming of wars and truces until I can see what real minds do with them.

## Generation 3 (built)

- **Life story.** Each being keeps the dozen or so events that mark a life: attacks, births, deaths of those it cared about, pledges, betrayals, discoveries. Read back at every thought, in full at deep reflection.
- **Aims.** A being sets what it is working toward over many days and can change it.
- **Self-authored way of thinking.** Separate from the creed: instructions a being writes to itself about *how* to think, read back before every thought, and teachable to others.
- **Great workings (the deepest layer).** A master (high lore, two arts) with two of its own band standing by can bend a law of the *whole world* for about two days: energy drain, night cold, healing, length of night, force of blows, or how readily soil sprouts. Everyone feels it; only the learned know what happened. The sky shows it while it holds.
- **The dead leave their goods** where they fall, for anyone to take.
- Saved worlds from earlier builds now load safely.

## Generation 2 (built)

- **A wider, varied world.** 96 by 64 tiles (was 44 by 30): deep water, shallows that can be waded, sand, grass, forest, marsh, desert, rock and snow, cold in the north and on the heights, hot in the south. Each ground costs differently to cross.
- **Three bands of three** begin far apart, so peoples meet later.
- **Ten founding plants** with real properties: healing (sunleaf), mind-opening (dreamcap), rage (emberroot), poison (redcap), cold-hardy (frostmoss), and so on. Each grows only in suitable ground. Wild varieties can drift into new ground and pick up properties nobody planned.
- **Five founding animals:** hoppers, skits (seed-carrying birds), lumbers (large, tough, dangerous when hit), stalkers, ridgecats. Each keeps to its home ground; hunters choose prey they can take.
- **Plans, knowledge, self-observation, learning by watching** (see the table above). Watching a craft done halves what it takes to work it out yourself; anyone who sees a tool made can copy it.
- **Ways of knowledge** in four trees (craft, life, mind, society): tools, fire, masonry, boats, farming, medicine, signs, schooling, storage, customs. The world only says what is possible. The being that finds a way names it, explains it and draws it; others get that version by teaching.
- **Tools as open invention.** A being with the way of tools designs a tool for one of seven uses (hunt, fight, guard, gather, harvest, plant, build), names it and draws it. Tools cost wood and stone, wear out, can be given, copied, taught and *bettered*: each improvement is a new named design, limited by the maker's lore. Stone is a new resource, gathered on rock.
- **Fire** (warmth, light, cooked meat, beasts kept off), **stores** (hoard and raid), **signs** that outlast their writer and teach whoever reads them.
- **Peoples.** Bands have names, customs declared by the leader, and stances toward other bands (ally, enemy, neutral). Beings can name places; names appear on the map.
- New **Peoples** and **Ways** tabs.

## Generation 1 (built)

World as a registry of laws; seasons, weather, lightning, blights, blooms; six founders with creed, temperament, feelings, memory; speech, theft, attack, trade, mating and children; leaders and followers; walls; self-designed looks; wild and bred plant varieties; lore, arts and local workings; teaching; synthesized soundscape; camera, inspector, transcripts.

## What your first run taught me (Generation 1, real minds)

From your transcript and notes:

| What you saw | Cause | Fix (Generation 2) |
|---|---|---|
| Bodies did not do what minds said | Only one field moved the body, minds often left it empty, and it expired after about 20 seconds | Multi-step plans that persist up to a day per step; the prompt says plainly that only the plan moves the body; the plan is shown on each being |
| Jiggling left-right | Instinct rules contradicted each other (walk to food below 75 energy, eat only below 65); fleeing oscillated at the edge of a predator's range | Rules aligned; idle beings stay put; fleeing picks the best escape tile and lasts a few steps; a general guard stops anything caught pacing; animals move with headings and pauses |
| Repeating the same lessons | Every thought was invited to write a note, and each bad meal was reported as news | Food knowledge is now a settled table built from experience; notes that repeat an old one are refused; minds are shown what they already said and told not to repeat it; twice hurt by a food, the body refuses it without being told |
| Knowledge not changing behaviour | Knowing "redcap hurts" did not touch habits or reflexes | Automatic aversion; reflection is told to make the body act on what the mind knows; a summary of what the body has actually been doing is shown to the mind |
| Worth keeping | Duba lied about the grain to keep the berries, and Siba and Yesha caught the lie by eating it. That emerged with no mechanic for lying | Nothing to fix. Later: track what was *heard* separately from what was *experienced* |

