# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 30:70, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12411 rounds. Average round 37.1 s; 8.2% time out. The first hit wins the round 61.4% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 38 | 38 | 51 | 68 | 60 | 43 | **50** |
| Rox Vega | 62 | – | 70 | 58 | 32 | 50 | 47 | **53** |
| Hollis Bey | 63 | 31 | – | 38 | 47 | 56 | 52 | **47** |
| Mister Mumbles | 50 | 43 | 63 | – | 31 | 68 | 41 | **49** |
| Margaret Okafor | 32 | 68 | 54 | 69 | – | 32 | 42 | **49** |
| Chef Gus Lamarre | 40 | 50 | 44 | 33 | 68 | – | 62 | **49** |
| Rev. Gideon Price | 57 | 53 | 49 | 59 | 58 | 39 | – | **52** |

### Combos

180311 combos (a single hit counts as one). 1 hits 65.6%, 2 hits 13.7%, 3 hits 7.4%, 4 hits 5.0%, 5 hits 2.0%, 6–7 hits 2.0%, 8–9 hits 1.8%, 10+ hits 2.5%. Average 92 damage; 4.0% do 250 or more.

### Damage by source

normals 48.7% · air normals 2.0% · specials 24.1% · projectiles 10.3% · throws 7.7% · super 4.5% · chip 2.6%

### Mechanics, per round

boost 2.68 · tapeSkip 0.35 · jumpCancel 0.24 · relaunch 0.71 · cutAway 0.09 · flawless 3.74 · punish 2.30 · reversal 0.04 · delayedGetup 1.83 · ducked 0.59 · throw 2.01 · throwTech 1.05 · guardCrush 0.02 · counter 0.12 · superHit 0.23

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 20% (5590/154) · Cold Front 12% (5064/14547) · Shin Poke 11% (5640/608) · Cold Front (boosted) 5% (2614/2852) · Throw 5% (1128/0)
- **Rox Vega:** Leg Warmer Lariat 21% (25346/518) · Throw 8% (1633/0) · Wake-Up Jab 7% (6306/1038) · Count of Eight 6% (18282/318) · Toe Tap 6% (3844/624)
- **Hollis Bey:** Key Ring 13% (5144/2584) · Clocking In 11% (2338/0) · Night Shift 8% (2208/3008) · Throw 7% (1329/0) · Lights Out 7% (2368/20)
- **Mister Mumbles:** Punchline 9% (3294/78) · Under the Bed 9% (3430/37) · Ankle Biter 8% (4445/524) · Wooden Jab 8% (4766/1813) · Throw 8% (2185/0)
- **Margaret Okafor:** Lead Paragraph 10% (5630/197) · Breaking 9% (3904/181) · Low Bulletin 9% (5776/632) · Anchor Kick 8% (4423/2855) · We Go Live 7% (4597/19)
- **Chef Gus Lamarre:** Flambé 15% (15142/15190) · Tenderise 11% (8554/594) · Skillet 9% (3724/2493) · Cleaver 8% (2425/4023) · Rolling Pin 7% (4844/539)
- **Rev. Gideon Price:** Collection Plate 10% (9310/198) · Pulpit Kick 8% (2646/4878) · Low Offering 8% (5313/1094) · Hand Raised 6% (4729/715) · Altar Call 6% (2808/41)

## director

12366 rounds. Average round 36.9 s; 7.3% time out. The first hit wins the round 60.6% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 36 | 42 | 48 | 62 | 52 | 37 | **46** |
| Rox Vega | 65 | – | 62 | 51 | 30 | 51 | 46 | **51** |
| Hollis Bey | 58 | 38 | – | 36 | 43 | 44 | 55 | **46** |
| Mister Mumbles | 53 | 49 | 64 | – | 32 | 55 | 38 | **48** |
| Margaret Okafor | 39 | 70 | 58 | 69 | – | 31 | 40 | **51** |
| Chef Gus Lamarre | 48 | 49 | 56 | 45 | 70 | – | 69 | **56** |
| Rev. Gideon Price | 64 | 54 | 46 | 62 | 61 | 32 | – | **53** |

### Combos

172411 combos (a single hit counts as one). 1 hits 62.8%, 2 hits 13.9%, 3 hits 7.9%, 4 hits 5.9%, 5 hits 2.4%, 6–7 hits 2.1%, 8–9 hits 2.1%, 10+ hits 2.9%. Average 97 damage; 4.7% do 250 or more.

### Damage by source

normals 47.9% · air normals 1.9% · specials 24.7% · projectiles 10.0% · throws 8.6% · super 4.4% · chip 2.5%

### Mechanics, per round

boost 2.58 · tapeSkip 0.42 · jumpCancel 0.27 · relaunch 0.78 · cutAway 0.09 · flawless 3.57 · punish 2.31 · reversal 0.04 · delayedGetup 1.90 · ducked 0.83 · throw 2.39 · throwTech 1.30 · guardCrush 0.02 · counter 0.10 · superHit 0.23

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 20% (5612/126) · Cold Front 12% (4791/14193) · Shin Poke 10% (5471/527) · Throw 6% (1326/0) · Cold Front (boosted) 5% (2562/2809)
- **Rox Vega:** Leg Warmer Lariat 22% (26630/516) · Throw 8% (1799/0) · Wake-Up Jab 7% (6289/802) · Count of Eight 6% (18800/238) · Toe Tap 6% (3369/418)
- **Hollis Bey:** Key Ring 14% (5374/2526) · Clocking In 11% (2241/0) · Throw 8% (1594/0) · Night Shift 8% (2254/2932) · Lights Out 8% (2658/17)
- **Mister Mumbles:** Punchline 10% (3517/84) · Under the Bed 9% (3647/24) · Throw 9% (2628/0) · Hand Puppet 8% (3843/64) · Wooden Jab 7% (4580/1423)
- **Margaret Okafor:** Lead Paragraph 10% (6212/155) · Breaking 10% (4420/118) · Anchor Kick 9% (4838/2492) · We Go Live 8% (5210/17) · Low Bulletin 8% (5113/510)
- **Chef Gus Lamarre:** Flambé 15% (16528/13856) · Tenderise 13% (9859/513) · Skillet 9% (4025/2333) · Cleaver 8% (2344/3807) · Rolling Pin 7% (4840/522)
- **Rev. Gideon Price:** Collection Plate 9% (8860/216) · Pulpit Kick 8% (2623/4602) · Low Offering 8% (5049/939) · Hand Raised 6% (4698/587) · Throw 6% (1450/0)
