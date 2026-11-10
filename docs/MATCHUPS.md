# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 30:70, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12456 rounds. Average round 37.2 s; 8.0% time out. The first hit wins the round 61.2% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 49 | 58 | 56 | 58 | 62 | 53 | **56** |
| Rox Vega | 52 | – | 48 | 58 | 34 | 43 | 57 | **48** |
| Hollis Bey | 42 | 52 | – | 35 | 51 | 57 | 62 | **50** |
| Mister Mumbles | 44 | 42 | 66 | – | 38 | 61 | 38 | **48** |
| Margaret Okafor | 42 | 67 | 49 | 63 | – | 35 | 44 | **50** |
| Chef Gus Lamarre | 38 | 58 | 43 | 40 | 66 | – | 66 | **52** |
| Rev. Gideon Price | 47 | 44 | 38 | 62 | 56 | 34 | – | **47** |

### Combos

180129 combos (a single hit counts as one). 1 hits 66.0%, 2 hits 13.1%, 3 hits 8.7%, 4 hits 3.8%, 5 hits 2.0%, 6–7 hits 2.0%, 8–9 hits 1.8%, 10+ hits 2.5%. Average 92 damage; 4.1% do 250 or more.

### Damage by source

normals 48.3% · air normals 2.1% · specials 23.8% · projectiles 10.4% · throws 8.3% · super 4.6% · chip 2.6%

### Mechanics, per round

boost 2.63 · tapeSkip 0.36 · jumpCancel 0.23 · relaunch 0.71 · cutAway 0.08 · flawless 3.63 · punish 2.20 · reversal 0.04 · delayedGetup 1.91 · ducked 0.61 · throw 2.15 · throwTech 1.13 · guardCrush 0.02 · counter 0.12 · superHit 0.24

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 19% (5331/152) · Cold Front 12% (4974/14744) · Shin Poke 11% (5923/631) · Cold Front (boosted) 6% (2757/2896) · Throw 5% (1217/0)
- **Rox Vega:** Leg Warmer Lariat 21% (24867/519) · Throw 8% (1604/0) · Wake-Up Jab 7% (6236/956) · Count of Eight 7% (19061/334) · Toe Tap 6% (3763/635)
- **Hollis Bey:** Key Ring 13% (5271/2480) · Clocking In 12% (2589/0) · Night Shift 8% (2378/3053) · Throw 8% (1557/0) · Lights Out 6% (2140/32)
- **Mister Mumbles:** Punchline 10% (3402/71) · Under the Bed 9% (3434/33) · Throw 8% (2283/0) · Ankle Biter 8% (4463/495) · Wooden Jab 8% (4889/1733)
- **Margaret Okafor:** Lead Paragraph 9% (5517/218) · Breaking 9% (4153/165) · Low Bulletin 9% (5971/638) · Anchor Kick 8% (4594/2756) · We Go Live 7% (4616/16)
- **Chef Gus Lamarre:** Flambé 16% (14766/13885) · Chop Chop 11% (3638/1358) · Cleaver 10% (3475/3793) · Skillet 8% (2876/2268) · Rolling Pin 8% (5016/484)
- **Rev. Gideon Price:** Collection Plate 10% (9081/159) · Pulpit Kick 8% (2595/4710) · Low Offering 8% (5119/1097) · Hand Raised 6% (4602/687) · Throw 6% (1251/0)

## director

12501 rounds. Average round 36.9 s; 7.4% time out. The first hit wins the round 60.9% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 47 | 52 | 62 | 67 | 64 | 50 | **57** |
| Rox Vega | 54 | – | 46 | 51 | 31 | 52 | 48 | **47** |
| Hollis Bey | 49 | 55 | – | 42 | 47 | 48 | 61 | **50** |
| Mister Mumbles | 39 | 50 | 59 | – | 32 | 50 | 33 | **43** |
| Margaret Okafor | 33 | 70 | 53 | 68 | – | 35 | 40 | **50** |
| Chef Gus Lamarre | 37 | 49 | 53 | 51 | 66 | – | 67 | **53** |
| Rev. Gideon Price | 51 | 53 | 40 | 68 | 60 | 33 | – | **51** |

### Combos

173240 combos (a single hit counts as one). 1 hits 63.9%, 2 hits 12.9%, 3 hits 9.3%, 4 hits 4.4%, 5 hits 2.3%, 6–7 hits 2.3%, 8–9 hits 2.1%, 10+ hits 2.8%. Average 97 damage; 4.8% do 250 or more.

### Damage by source

normals 47.3% · air normals 2.0% · specials 24.3% · projectiles 10.1% · throws 9.3% · super 4.6% · chip 2.4%

### Mechanics, per round

boost 2.54 · tapeSkip 0.41 · jumpCancel 0.26 · relaunch 0.77 · cutAway 0.08 · flawless 3.49 · punish 2.23 · reversal 0.04 · delayedGetup 1.95 · ducked 0.86 · throw 2.51 · throwTech 1.36 · guardCrush 0.02 · counter 0.10 · superHit 0.24

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 19% (5602/111) · Cold Front 12% (5062/14184) · Shin Poke 11% (5848/542) · Throw 6% (1482/0) · Cold Front (boosted) 6% (2789/2911)
- **Rox Vega:** Leg Warmer Lariat 22% (26321/503) · Throw 9% (1826/0) · Wake-Up Jab 7% (6186/763) · Count of Eight 6% (19148/239) · Toe Tap 6% (3311/422)
- **Hollis Bey:** Key Ring 14% (5531/2372) · Clocking In 12% (2521/0) · Throw 9% (1806/0) · Night Shift 8% (2328/2933) · Lights Out 7% (2352/25)
- **Mister Mumbles:** Punchline 10% (3503/79) · Under the Bed 9% (3627/19) · Throw 9% (2615/0) · Hand Puppet 8% (3869/67) · Wooden Jab 7% (4556/1354)
- **Margaret Okafor:** Lead Paragraph 10% (5987/168) · Breaking 10% (4523/141) · Anchor Kick 9% (4946/2537) · Low Bulletin 8% (5323/521) · We Go Live 8% (5073/19)
- **Chef Gus Lamarre:** Flambé 16% (15304/13436) · Chop Chop 11% (3986/1342) · Cleaver 10% (3834/3681) · Skillet 8% (2817/2178) · Rolling Pin 7% (4897/464)
- **Rev. Gideon Price:** Collection Plate 9% (8758/180) · Pulpit Kick 8% (2599/4430) · Low Offering 7% (4934/1052) · Throw 7% (1557/0) · Altar Call 6% (3164/44)
