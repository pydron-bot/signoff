# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn, with 60-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 30:70, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12456 rounds. Average round 37.2 s; 8.0% time out. The first hit wins the round 61.2% of the time. The furthest from even: Okafor 67 over Vega, Lamarre 66 over Price, Mumbles 66 over Bey, Lamarre 66 over Okafor, Okafor 63 over Mumbles, Storm 62 over Lamarre.

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

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 7 to 10 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 6.1 to 14.3; 23 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 8.3 (5.6) | **13.1 (8.4)** | 9.1 (6.1) | **11.8 (7.1)** | **13.4 (8.2)** | **13.2 (8.1)** | 990 · 11.5 · 10.5 · 74 |
| Rox Vega | **6.9 (5.3)** | – | 7.2 (5.5) | **6.2 (5.3)** | **6.1 (4.7)** | **6.7 (5.1)** | **7.0 (5.4)** | 660 · 6.7 · 7.2 · 135 |
| Hollis Bey | **10.2 (7.3)** | **6.5 (5.0)** | – | 7.1 (5.6) | 8.5 (6.1) | 9.1 (6.4) | 9.4 (7.0) | 980 · 8.5 · 10.7 · 100 |
| Mister Mumbles | 8.5 (6.3) | **6.1 (4.4)** | 9.1 (6.5) | – | 7.3 (5.4) | 8.4 (6.2) | 8.6 (6.3) | 740 · 8.0 · 8.0 · 111 |
| Margaret Okafor | **11.0 (5.1)** | **6.5 (3.4)** | **10.6 (4.9)** | 7.5 (4.1) | – | 10.0 (4.9) | **10.6 (4.7)** | 820 · 9.4 · 9.3 · 94 |
| Chef Gus Lamarre | **11.8 (8.7)** | 7.2 (5.4) | **11.6 (8.7)** | 8.2 (6.2) | 10.0 (7.2) | – | **11.8 (8.5)** | 940 · 10.1 · 9.9 · 85 |
| Rev. Gideon Price | **14.3 (10.4)** | 8.5 (5.6) | **12.9 (8.7)** | 9.5 (6.5) | **12.1 (7.7)** | **11.9 (8.8)** | – | 940 · 11.5 · 10.1 · 75 |

### Comebacks

Of the rounds where someone fell under 30% health, 37.9% were won by someone who had (4657 of 12279). The loser of round 1 went on to win 27.0% of the matches (1324 of 4897).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (31) | 3.2 (44) | 0.0 (35) | 11.6 (47) | 24.9 (51) | 38.4 (54) | 84.7 (59) |
| Rox Vega | 0.0 (31) | – | 0.0 (27) | 0.0 (22) | 0.0 (24) | 0.0 (29) | 0.0 (31) | 0.0 (19) |
| Hollis Bey | 3.2 (44) | 0.0 (27) | – | 0.0 (30) | 0.2 (35) | 2.1 (42) | 0.8 (42) | 0.0 (36) |
| Mister Mumbles | 0.0 (35) | 0.0 (22) | 0.0 (30) | – | 0.0 (27) | 0.2 (34) | 0.4 (35) | 0.0 (25) |
| Margaret Okafor | 11.6 (47) | 0.0 (24) | 0.2 (35) | 0.0 (27) | – | 4.0 (41) | 12.8 (45) | 1.6 (36) |
| Chef Gus Lamarre | 24.9 (51) | 0.0 (29) | 2.1 (42) | 0.2 (34) | 4.0 (41) | – | 26.1 (50) | 12.5 (48) |
| Rev. Gideon Price | 38.4 (54) | 0.0 (31) | 0.8 (42) | 0.4 (35) | 12.8 (45) | 26.1 (50) | – | 52.4 (56) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.1 | 32.0 | 27.4 | 15.5 |
| Rox Vega | 59.9 | 29.9 | 9.5 | 0.7 |
| Hollis Bey | 35.5 | 45.3 | 17.8 | 1.4 |
| Mister Mumbles | 44.5 | 39.8 | 13.1 | 2.6 |
| Margaret Okafor | 27.5 | 43.7 | 25.2 | 3.5 |
| Chef Gus Lamarre | 22.1 | 36.7 | 37.4 | 3.8 |
| Rev. Gideon Price | 26.9 | 42.9 | 27.6 | 2.6 |

### Combos

180127 combos (a single hit counts as one). 1 hits 66.0%, 2 hits 13.1%, 3 hits 8.7%, 4 hits 3.8%, 5 hits 2.0%, 6–7 hits 2.0%, 8–9 hits 1.8%, 10+ hits 2.5%. Average 92 damage; 4.1% do 250 or more.

### Damage by source

normals 48.3% · air normals 2.1% · specials 20.5% · projectiles 10.4% · throws 8.3% · super 4.6% · chip 2.6% · props 3.3% · hazards 0.0%

### Mechanics, per round

boost 2.63 · tapeSkip 0.36 · jumpCancel 0.23 · relaunch 0.71 · cutAway 0.08 · flawless 3.63 · punish 2.20 · reversal 0.04 · delayedGetup 1.91 · ducked 0.61 · throw 2.15 · throwTech 1.13 · guardCrush 0.02 · counter (a read) 0.12 · counter hit 2.83 · superHit 0.24

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 20% (5331/152) · Cold Front 12% (4974/14744) · Shin Poke 11% (5923/631) · Cold Front (boosted) 6% (2757/2896) · Throw 6% (1217/0)
- **Rox Vega:** Leg Warmer Lariat 21% (24867/519) · Throw 8% (1604/0) · Wake-Up Jab 7% (6236/956) · Count of Eight 7% (19061/334) · Toe Tap 7% (3763/635)
- **Hollis Bey:** Key Ring 13% (5271/2480) · Clocking In 13% (2589/0) · Night Shift 8% (2378/3053) · Throw 8% (1557/0) · Lights Out 6% (2140/32)
- **Mister Mumbles:** Punchline 10% (3402/71) · Under the Bed 9% (3434/33) · Throw 8% (2283/0) · Ankle Biter 8% (4463/495) · Wooden Jab 8% (4889/1733)
- **Margaret Okafor:** Lead Paragraph 10% (5517/218) · Breaking 10% (4153/165) · Low Bulletin 9% (5971/638) · Anchor Kick 9% (4594/2756) · We Go Live 7% (4616/16)
- **Chef Gus Lamarre:** Flambé 16% (14766/13885) · Chop Chop 11% (3638/1358) · Cleaver 10% (3475/3793) · Skillet 8% (2876/2268) · Rolling Pin 8% (5016/484)
- **Rev. Gideon Price:** Collection Plate 10% (9081/159) · Pulpit Kick 9% (2595/4710) · Low Offering 8% (5119/1097) · Hand Raised 6% (4602/687) · Throw 6% (1251/0)

## director

12501 rounds. Average round 36.9 s; 7.4% time out. The first hit wins the round 60.9% of the time. The furthest from even: Okafor 70 over Vega, Okafor 68 over Mumbles, Price 68 over Mumbles, Storm 67 over Okafor, Lamarre 67 over Price, Lamarre 66 over Okafor.

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

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 7 to 10 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 5.6 to 13.6; 26 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 7.7 (5.4) | **12.7 (8.1)** | 8.6 (5.9) | **11.3 (6.7)** | **12.8 (7.8)** | **12.7 (7.8)** | 990 · 11.0 · 10.0 · 78 |
| Rox Vega | **6.6 (5.2)** | – | **6.9 (5.4)** | **5.9 (5.0)** | **5.6 (4.5)** | **6.2 (4.9)** | **6.4 (5.2)** | 660 · 6.2 · 6.7 · 144 |
| Hollis Bey | 9.9 (7.2) | **6.2 (4.7)** | – | **6.8 (5.4)** | 8.2 (5.9) | 8.8 (6.3) | 9.2 (6.8) | 980 · 8.2 · 10.2 · 104 |
| Mister Mumbles | 8.2 (6.2) | **5.7 (4.3)** | 8.6 (6.4) | – | **6.8 (5.2)** | 8.2 (6.1) | 8.2 (6.1) | 740 · 7.6 · 7.4 · 117 |
| Margaret Okafor | **10.2 (4.7)** | **5.8 (3.1)** | 9.6 (4.6) | **6.6 (3.8)** | – | 8.8 (4.5) | **10.2 (4.5)** | 820 · 8.6 · 8.8 · 104 |
| Chef Gus Lamarre | **11.3 (8.3)** | **6.8 (5.1)** | **11.2 (8.4)** | 7.9 (5.9) | 9.5 (6.9) | – | **11.2 (8.2)** | 940 · 9.7 · 9.3 · 89 |
| Rev. Gideon Price | **13.6 (9.7)** | 7.9 (5.3) | **12.2 (8.2)** | 8.7 (6.0) | **11.6 (7.4)** | **11.2 (8.2)** | – | 940 · 10.9 · 9.6 · 79 |

### Comebacks

Of the rounds where someone fell under 30% health, 38.9% were won by someone who had (4806 of 12348). The loser of round 1 went on to win 28.1% of the matches (1376 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (30) | 1.5 (44) | 0.0 (35) | 7.8 (45) | 21.8 (50) | 39.2 (53) | 85.1 (59) |
| Rox Vega | 0.0 (30) | – | 0.0 (27) | 0.0 (22) | 0.0 (24) | 0.0 (29) | 0.0 (31) | 0.0 (19) |
| Hollis Bey | 1.5 (44) | 0.0 (27) | – | 0.0 (31) | 0.0 (35) | 2.9 (42) | 2.4 (42) | 0.0 (36) |
| Mister Mumbles | 0.0 (35) | 0.0 (22) | 0.0 (31) | – | 0.0 (26) | 1.0 (35) | 0.4 (35) | 0.0 (27) |
| Margaret Okafor | 7.8 (45) | 0.0 (24) | 0.0 (35) | 0.0 (26) | – | 3.2 (40) | 8.9 (45) | 2.0 (34) |
| Chef Gus Lamarre | 21.8 (50) | 0.0 (29) | 2.9 (42) | 1.0 (35) | 3.2 (40) | – | 18.2 (48) | 9.1 (46) |
| Rev. Gideon Price | 39.2 (53) | 0.0 (31) | 2.4 (42) | 0.4 (35) | 8.9 (45) | 18.2 (48) | – | 51.8 (55) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.3 | 32.8 | 26.7 | 15.3 |
| Rox Vega | 60.3 | 29.6 | 9.5 | 0.7 |
| Hollis Bey | 35.6 | 45.3 | 17.8 | 1.3 |
| Mister Mumbles | 44.4 | 39.9 | 13.2 | 2.5 |
| Margaret Okafor | 27.8 | 44.2 | 24.6 | 3.3 |
| Chef Gus Lamarre | 22.3 | 38.2 | 36.1 | 3.4 |
| Rev. Gideon Price | 27.3 | 43.5 | 26.7 | 2.5 |

### Combos

173241 combos (a single hit counts as one). 1 hits 63.9%, 2 hits 12.9%, 3 hits 9.3%, 4 hits 4.4%, 5 hits 2.3%, 6–7 hits 2.3%, 8–9 hits 2.1%, 10+ hits 2.8%. Average 97 damage; 4.8% do 250 or more.

### Damage by source

normals 47.3% · air normals 2.0% · specials 21.1% · projectiles 10.1% · throws 9.3% · super 4.6% · chip 2.4% · props 3.2% · hazards 0.0%

### Mechanics, per round

boost 2.54 · tapeSkip 0.41 · jumpCancel 0.26 · relaunch 0.77 · cutAway 0.08 · flawless 3.49 · punish 2.23 · reversal 0.04 · delayedGetup 1.95 · ducked 0.86 · throw 2.51 · throwTech 1.36 · guardCrush 0.02 · counter (a read) 0.10 · counter hit 2.69 · superHit 0.24

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 20% (5602/111) · Cold Front 12% (5062/14184) · Shin Poke 11% (5848/542) · Throw 7% (1482/0) · Cold Front (boosted) 6% (2789/2911)
- **Rox Vega:** Leg Warmer Lariat 23% (26321/503) · Throw 9% (1826/0) · Wake-Up Jab 7% (6186/763) · Count of Eight 7% (19148/239) · Toe Tap 6% (3311/422)
- **Hollis Bey:** Key Ring 14% (5531/2372) · Clocking In 12% (2521/0) · Throw 9% (1806/0) · Night Shift 8% (2328/2933) · Lights Out 7% (2352/25)
- **Mister Mumbles:** Punchline 10% (3503/79) · Under the Bed 10% (3627/19) · Throw 10% (2615/0) · Hand Puppet 8% (3869/67) · Wooden Jab 8% (4556/1354)
- **Margaret Okafor:** Lead Paragraph 10% (5987/168) · Breaking 10% (4523/141) · Anchor Kick 9% (4946/2537) · Low Bulletin 8% (5323/521) · We Go Live 8% (5073/19)
- **Chef Gus Lamarre:** Flambé 16% (15304/13436) · Chop Chop 12% (3986/1342) · Cleaver 11% (3834/3681) · Skillet 8% (2817/2178) · Rolling Pin 8% (4897/464)
- **Rev. Gideon Price:** Collection Plate 10% (8758/180) · Pulpit Kick 9% (2599/4430) · Low Offering 8% (4934/1052) · Throw 7% (1557/0) · Altar Call 6% (3164/44)

## The first hit's worth

The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses 1 bar). The aim: the smallest bonus that keeps the average round inside 25 to 50 seconds (and the bench passing).

| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |
| --- | --- | --- | --- | --- | --- |
| 1 bar | 37.2 | 8.0% | 61.2% | 0.08 | Okafor 67 over Vega, Lamarre 66 over Price, Mumbles 66 over Bey |
| 0.5 bar | 37.4 | 8.8% | 60.0% | 0.06 | Mumbles 71 over Bey, Storm 70 over Okafor, Lamarre 69 over Okafor |
| 0 bar | 37.6 | 8.9% | 58.1% | 0.04 | Storm 68 over Okafor, Lamarre 67 over Okafor, Mumbles 65 over Bey |

## Under LIVE BROADCAST rules

The hard bench again with the segments changing each round and the hazards on. 12391 rounds; average round 37.1 s; 7.7% time out; the first hit wins the round 62.6% of the time. Hazards did 2.3% of the damage and props 1.2% (props are in studio rules too: 3.3% there).

A matchup moves 3.3 points from its studio result on average; none moves further than 10. At 100 seeds a pair, a few points either way is noise.

### Win rates, live

As in studio rules, with the change from the studio result in brackets.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 44 (-4) | 60 (+2) | 61 (+5) | 60 (+2) | 60 (-2) | 48 (-5) | **55** |
| Rox Vega | 56 (+5) | – | 49 (+1) | 53 (-5) | 29 (-4) | 47 (+5) | 50 (-7) | **47** |
| Hollis Bey | 41 (-1) | 51 (-1) | – | 37 (+2) | 53 (+2) | 49 (-8) | 64 (+2) | **49** |
| Mister Mumbles | 40 (-4) | 48 (+6) | 64 (-2) | – | 35 (-3) | 57 (-4) | 40 (+2) | **47** |
| Margaret Okafor | 41 (-1) | 71 (+5) | 48 (-1) | 66 (+3) | – | 30 (-4) | 44 (0) | **50** |
| Chef Gus Lamarre | 40 (+2) | 53 (-4) | 51 (+8) | 44 (+4) | 70 (+5) | – | 68 (+2) | **54** |
| Rev. Gideon Price | 53 (+6) | 51 (+7) | 37 (-1) | 61 (-1) | 56 (0) | 32 (-2) | – | **48** |

### Damage by source, live

normals 48.1% · air normals 2.0% · specials 20.5% · projectiles 10.4% · throws 8.2% · super 4.7% · chip 2.5% · props 1.2% · hazards 2.3%

## The rarer mechanics by CPU level

Per round, at every CPU level (easy and normal over 30 seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.

| | easy | normal | hard | director |
| --- | --- | --- | --- | --- |
| counter hit (share of strikes) | 1.79 (7.5%) | 2.82 (10.4%) | 2.83 (10.2%) | 2.69 (9.6%) |
| reversal (tried) | 0.05 (0.11) | 0.07 (0.16) | 0.04 (0.10) | 0.04 (0.09) |
| guard crush (tried) | 0.00 (0.12) | 0.01 (0.18) | 0.02 (0.21) | 0.02 (0.23) |
| counter, a read (tried) | 0.02 (0.34) | 0.08 (0.41) | 0.12 (0.46) | 0.10 (0.42) |
| Cut Away | 0.24 | 0.18 | 0.08 | 0.08 |
| Technical Difficulties hit | 0.32 | 0.38 | 0.24 | 0.24 |
| punish | 1.32 | 1.50 | 2.20 | 2.23 |
| throw tech | 0.07 | 0.25 | 1.13 | 1.36 |
