# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn, with 60-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 35:65, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12379 rounds. Average round 41.0 s; 9.0% time out. The first hit wins the round 57.2% of the time. The furthest from even: Storm 61 over Okafor, Okafor 60 over Mumbles, Bey 59 over Okafor, Mumbles 58 over Price, Lamarre 58 over Storm, Vega 57 over Okafor.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 52 | 51 | 44 | 61 | 43 | 45 | **49** |
| Rox Vega | 49 | – | 51 | 55 | 57 | 53 | 53 | **53** |
| Hollis Bey | 49 | 49 | – | 45 | 59 | 54 | 50 | **51** |
| Mister Mumbles | 57 | 46 | 56 | – | 40 | 46 | 58 | **50** |
| Margaret Okafor | 40 | 43 | 42 | 60 | – | 55 | 49 | **48** |
| Chef Gus Lamarre | 58 | 47 | 46 | 55 | 46 | – | 43 | **49** |
| Rev. Gideon Price | 56 | 48 | 50 | 42 | 51 | 57 | – | **51** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.9 to 13.4; 11 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 10.2 (7.7) | **13.4 (9.3)** | 10.7 (7.7) | **12.0 (7.7)** | **12.4 (8.4)** | **13.3 (8.7)** | 920 · 12.0 · 10.3 · 77 |
| Rox Vega | 8.1 (6.3) | – | 8.8 (6.9) | 8.8 (7.5) | **7.9 (6.3)** | 8.2 (6.2) | 8.4 (6.5) | 850 · 8.4 · 9.2 · 111 |
| Hollis Bey | 9.7 (6.9) | 8.6 (6.5) | – | 8.4 (6.4) | 8.8 (6.3) | 9.3 (6.6) | 10.0 (6.9) | 1020 · 9.1 · 11.6 · 99 |
| Mister Mumbles | 8.9 (6.7) | 8.2 (6.2) | 10.4 (7.5) | – | 8.2 (6.1) | 9.3 (6.9) | 9.5 (7.0) | 870 · 9.1 · 9.5 · 102 |
| Margaret Okafor | 10.9 (4.7) | 8.4 (4.2) | 11.3 (5.0) | 8.8 (4.7) | – | 10.6 (4.5) | 11.1 (4.5) | 860 · 10.2 · 10.0 · 92 |
| Chef Gus Lamarre | 11.3 (8.2) | 9.3 (7.0) | **12.3 (9.2)** | 9.7 (7.2) | 10.4 (7.5) | – | **11.8 (8.4)** | 940 · 10.8 · 10.5 · 85 |
| Rev. Gideon Price | **12.9 (9.1)** | 10.4 (7.2) | **13.2 (8.7)** | 10.6 (7.3) | **12.3 (7.9)** | **13.3 (9.7)** | – | 960 · 12.1 · 10.7 · 75 |

### Comebacks

Of the rounds where someone fell under 30% health, 41.4% were won by someone who had (5057 of 12207). The loser of round 1 went on to win 26.3% of the matches (1289 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (36) | 1.6 (42) | 0.0 (37) | 9.6 (46) | 27.0 (50) | 27.8 (51) | 78.4 (58) |
| Rox Vega | 0.0 (36) | – | 0.0 (36) | 0.0 (33) | 0.0 (32) | 0.4 (37) | 0.2 (38) | 0.0 (32) |
| Hollis Bey | 1.6 (42) | 0.0 (36) | – | 0.2 (36) | 0.4 (37) | 4.2 (44) | 5.5 (45) | 0.0 (38) |
| Mister Mumbles | 0.0 (37) | 0.0 (33) | 0.2 (36) | – | 0.0 (32) | 0.8 (39) | 1.6 (39) | 0.4 (33) |
| Margaret Okafor | 9.6 (46) | 0.0 (32) | 0.4 (37) | 0.0 (32) | – | 11.0 (44) | 13.2 (47) | 1.6 (39) |
| Chef Gus Lamarre | 27.0 (50) | 0.4 (37) | 4.2 (44) | 0.8 (39) | 11.0 (44) | – | 41.5 (53) | 10.0 (47) |
| Rev. Gideon Price | 27.8 (51) | 0.2 (38) | 5.5 (45) | 1.6 (39) | 13.2 (47) | 41.5 (53) | – | 57.8 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.7 | 31.1 | 27.0 | 16.3 |
| Rox Vega | 61.8 | 28.9 | 8.7 | 0.5 |
| Hollis Bey | 36.1 | 45.2 | 17.6 | 1.2 |
| Mister Mumbles | 46.1 | 39.3 | 12.4 | 2.2 |
| Margaret Okafor | 28.1 | 43.4 | 24.5 | 4.1 |
| Chef Gus Lamarre | 21.7 | 36.6 | 36.9 | 4.8 |
| Rev. Gideon Price | 27.6 | 43.4 | 26.7 | 2.3 |

### Combos

198203 combos (a single hit counts as one). 1 hits 65.4%, 2 hits 13.0%, 3 hits 9.3%, 4 hits 3.9%, 5 hits 1.7%, 6–7 hits 2.0%, 8–9 hits 1.8%, 10+ hits 2.8%. Average 90 damage; 3.6% do 250 or more.

### Damage by source

normals 47.9% · air normals 2.0% · specials 19.5% · projectiles 11.8% · throws 8.3% · super 4.8% · chip 2.6% · props 3.1% · hazards 0.0%

### Mechanics, per round

boost 2.15 · tapeSkip 0.25 · jumpCancel 0.23 · relaunch 0.86 · cutAway 0.05 · flawless 3.79 · punish 2.38 · reversal 0.05 · delayedGetup 2.10 · ducked 0.72 · throw 2.48 · throwTech 1.29 · guardCrush 0.02 · counter (a read) 0.13 · counter hit 3.14 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Cold Front 23% (8764/13941) · Shin Poke 13% (7095/559) · Heat Lightning 13% (3608/130) · Cold Front (boosted) 5% (2083/2086) · Technical Difficulties 5% (393/273)
- **Rox Vega:** Leg Warmer Lariat 20% (34220/715) · Count of Eight 7% (26434/499) · Wake-Up Jab 7% (7760/1225) · Throw 7% (2402/0) · Reps 7% (3662/369)
- **Hollis Bey:** Clocking In 15% (3191/0) · Key Ring 14% (5897/3009) · Night Shift 9% (2731/3581) · Throw 9% (1758/0) · Lights Out 6% (2153/27)
- **Mister Mumbles:** Under the Bed 10% (4507/26) · Punchline 10% (4002/67) · Ankle Biter 9% (5827/522) · Throw 9% (2875/0) · Hand Puppet 8% (4726/108)
- **Margaret Okafor:** Low Bulletin 10% (6767/733) · Lead Paragraph 10% (5801/226) · Breaking 9% (4273/214) · Anchor Kick 9% (4876/3108) · We Go Live 7% (4921/13)
- **Chef Gus Lamarre:** Flambé 16% (15760/13729) · Chop Chop 13% (4398/1503) · Cleaver 10% (3552/3640) · Rolling Pin 9% (5929/615) · Skillet 9% (3220/2334)
- **Rev. Gideon Price:** Collection Plate 14% (11322/249) · Low Offering 9% (5685/1323) · Pulpit Kick 9% (2807/5275) · Hand Raised 6% (4435/698) · Throw 6% (1337/0)

## director

12432 rounds. Average round 40.8 s; 7.8% time out. The first hit wins the round 57.6% of the time. The furthest from even: Okafor 60 over Vega, Lamarre 60 over Mumbles, Price 60 over Bey, Price 58 over Storm, Lamarre 57 over Storm, Storm 57 over Vega.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 57 | 50 | 51 | 52 | 43 | 42 | **49** |
| Rox Vega | 44 | – | 44 | 44 | 41 | 47 | 53 | **45** |
| Hollis Bey | 50 | 57 | – | 45 | 55 | 50 | 41 | **49** |
| Mister Mumbles | 49 | 56 | 55 | – | 45 | 41 | 56 | **50** |
| Margaret Okafor | 49 | 60 | 45 | 55 | – | 55 | 54 | **53** |
| Chef Gus Lamarre | 57 | 54 | 51 | 60 | 46 | – | 47 | **52** |
| Rev. Gideon Price | 58 | 48 | 60 | 45 | 46 | 54 | – | **52** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.4 to 13.2; 16 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 9.5 (7.4) | **12.8 (9.3)** | 10.2 (7.5) | **11.6 (7.5)** | **12.2 (8.3)** | **13.2 (8.7)** | 920 · 11.6 · 9.8 · 80 |
| Rox Vega | **7.6 (6.0)** | – | 8.5 (6.6) | 8.3 (7.2) | **7.4 (5.8)** | **7.5 (5.9)** | **7.7 (6.1)** | 850 · 7.8 · 8.5 · 119 |
| Hollis Bey | 9.5 (6.6) | 8.0 (6.3) | – | 8.1 (6.3) | 8.8 (6.2) | 9.1 (6.5) | 9.6 (6.9) | 1020 · 8.9 · 10.9 · 102 |
| Mister Mumbles | 8.6 (6.5) | **7.8 (6.0)** | 9.8 (7.3) | – | **7.7 (6.1)** | 8.6 (6.7) | 8.8 (6.8) | 870 · 8.6 · 8.9 · 108 |
| Margaret Okafor | 9.9 (4.4) | **7.6 (4.0)** | 10.6 (4.8) | 8.0 (4.5) | – | 9.9 (4.4) | 10.1 (4.2) | 860 · 9.3 · 9.6 · 100 |
| Chef Gus Lamarre | 10.9 (8.0) | 8.6 (6.5) | **11.6 (8.7)** | 8.9 (6.9) | 10.0 (7.3) | – | 11.0 (8.0) | 940 · 10.1 · 10.0 · 91 |
| Rev. Gideon Price | **12.2 (8.7)** | 9.7 (6.9) | **12.3 (8.3)** | 10.0 (7.0) | **11.9 (7.5)** | **12.7 (8.9)** | – | 960 · 11.5 · 10.1 · 80 |

### Comebacks

Of the rounds where someone fell under 30% health, 42.8% were won by someone who had (5264 of 12297). The loser of round 1 went on to win 27.2% of the matches (1334 of 4898).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (36) | 1.4 (41) | 0.6 (38) | 7.5 (44) | 22.2 (49) | 22.2 (50) | 74.7 (57) |
| Rox Vega | 0.0 (36) | – | 0.0 (36) | 0.0 (34) | 0.0 (32) | 0.2 (38) | 0.2 (38) | 0.0 (33) |
| Hollis Bey | 1.4 (41) | 0.0 (36) | – | 0.2 (35) | 0.4 (37) | 4.2 (43) | 3.5 (45) | 0.0 (38) |
| Mister Mumbles | 0.6 (38) | 0.0 (34) | 0.2 (35) | – | 0.0 (32) | 1.0 (39) | 1.3 (39) | 0.8 (35) |
| Margaret Okafor | 7.5 (44) | 0.0 (32) | 0.4 (37) | 0.0 (32) | – | 9.2 (43) | 9.4 (45) | 1.2 (38) |
| Chef Gus Lamarre | 22.2 (49) | 0.2 (38) | 4.2 (43) | 1.0 (39) | 9.2 (43) | – | 36.7 (52) | 11.5 (46) |
| Rev. Gideon Price | 22.2 (50) | 0.2 (38) | 3.5 (45) | 1.3 (39) | 9.4 (45) | 36.7 (52) | – | 56.0 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 26.2 | 32.3 | 26.1 | 15.4 |
| Rox Vega | 62.5 | 28.6 | 8.4 | 0.5 |
| Hollis Bey | 36.2 | 45.4 | 17.2 | 1.1 |
| Mister Mumbles | 46.0 | 39.6 | 12.4 | 2.1 |
| Margaret Okafor | 28.2 | 44.0 | 23.8 | 4.0 |
| Chef Gus Lamarre | 22.3 | 38.1 | 35.0 | 4.7 |
| Rev. Gideon Price | 28.0 | 44.2 | 25.8 | 2.0 |

### Combos

190639 combos (a single hit counts as one). 1 hits 62.8%, 2 hits 12.8%, 3 hits 10.0%, 4 hits 4.4%, 5 hits 2.0%, 6–7 hits 2.4%, 8–9 hits 2.1%, 10+ hits 3.4%. Average 95 damage; 4.4% do 250 or more.

### Damage by source

normals 47.4% · air normals 2.0% · specials 19.9% · projectiles 11.5% · throws 9.0% · super 4.8% · chip 2.4% · props 3.0% · hazards 0.0%

### Mechanics, per round

boost 2.04 · tapeSkip 0.31 · jumpCancel 0.27 · relaunch 0.95 · cutAway 0.05 · flawless 3.59 · punish 2.39 · reversal 0.04 · delayedGetup 2.16 · ducked 1.08 · throw 2.83 · throwTech 1.51 · guardCrush 0.02 · counter (a read) 0.11 · counter hit 2.98 · superHit 0.26

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Cold Front 24% (9168/13418) · Shin Poke 13% (6990/425) · Heat Lightning 12% (3607/95) · Technical Difficulties 5% (396/273) · Cold Front (boosted) 5% (1913/2049)
- **Rox Vega:** Leg Warmer Lariat 21% (37380/770) · Count of Eight 7% (27709/357) · Wake-Up Jab 7% (8076/953) · Throw 7% (2510/0) · Reps 6% (3658/282)
- **Hollis Bey:** Key Ring 15% (6232/2750) · Clocking In 13% (2951/0) · Throw 10% (1940/0) · Night Shift 9% (2719/3394) · Lights Out 6% (2369/34)
- **Mister Mumbles:** Punchline 10% (4357/71) · Under the Bed 10% (4856/27) · Throw 10% (3431/0) · Hand Puppet 9% (5124/90) · Ankle Biter 8% (5449/367)
- **Margaret Okafor:** Breaking 10% (4985/157) · Lead Paragraph 10% (6528/164) · Anchor Kick 9% (5391/2798) · Low Bulletin 9% (6344/592) · We Go Live 8% (5629/28)
- **Chef Gus Lamarre:** Flambé 16% (16127/12770) · Chop Chop 13% (4708/1459) · Cleaver 11% (3926/3414) · Rolling Pin 8% (5643/574) · Skillet 8% (3095/2088)
- **Rev. Gideon Price:** Collection Plate 13% (10569/244) · Low Offering 9% (5454/1274) · Pulpit Kick 8% (2714/5002) · Throw 7% (1600/0) · Altar Call 6% (3182/40)

## The first hit's worth

The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses none). The aim: the smallest bonus that keeps the average round inside 25 to 50 seconds (and the bench passing).

| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |
| --- | --- | --- | --- | --- | --- |
| 1 bar | 40.7 | 8.1% | 59.5% | 0.10 | Price 63 over Storm, Vega 60 over Lamarre, Lamarre 60 over Storm |
| 0.5 bar | 40.9 | 8.8% | 58.6% | 0.07 | Bey 64 over Lamarre, Storm 63 over Okafor, Vega 63 over Lamarre |
| 0 bar | 41.0 | 9.0% | 57.2% | 0.05 | Storm 61 over Okafor, Okafor 60 over Mumbles, Bey 59 over Okafor |

## Under LIVE BROADCAST rules

The hard bench again with the segments changing each round and the hazards on. 12397 rounds; average round 40.7 s; 8.0% time out; the first hit wins the round 58.6% of the time. Hazards did 2.4% of the damage and props 1.2% (props are in studio rules too: 3.1% there).

A matchup moves 3.5 points from its studio result on average; further than 10: Okafor against Vega +13. At 100 seeds a pair, a few points either way is noise.

### Win rates, live

As in studio rules, with the change from the studio result in brackets.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 58 (+6) | 54 (+3) | 48 (+5) | 56 (-5) | 47 (+4) | 42 (-2) | **51** |
| Rox Vega | 43 (-6) | – | 44 (-7) | 49 (-5) | 44 (-13) | 51 (-2) | 50 (-3) | **47** |
| Hollis Bey | 47 (-2) | 56 (+7) | – | 46 (+2) | 56 (-2) | 53 (-1) | 51 (+1) | **51** |
| Mister Mumbles | 52 (-4) | 51 (+6) | 54 (-1) | – | 35 (-5) | 45 (0) | 59 (+1) | **49** |
| Margaret Okafor | 45 (+5) | 56 (+13) | 44 (+3) | 66 (+6) | – | 58 (+3) | 47 (-2) | **52** |
| Chef Gus Lamarre | 54 (-4) | 49 (+2) | 47 (+1) | 55 (+1) | 43 (-3) | – | 41 (-2) | **48** |
| Rev. Gideon Price | 58 (+3) | 51 (+3) | 50 (0) | 41 (-1) | 53 (+2) | 59 (+2) | – | **52** |

### Damage by source, live

normals 47.6% · air normals 1.9% · specials 19.4% · projectiles 11.9% · throws 8.0% · super 5.0% · chip 2.5% · props 1.2% · hazards 2.4%

## The rarer mechanics by CPU level

Per round, at every CPU level (easy and normal over 30 seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.

| | easy | normal | hard | director |
| --- | --- | --- | --- | --- |
| counter hit (share of strikes) | 1.89 (7.1%) | 3.19 (10.4%) | 3.14 (9.9%) | 2.98 (9.1%) |
| reversal (tried) | 0.06 (0.12) | 0.08 (0.17) | 0.05 (0.11) | 0.04 (0.10) |
| guard crush (tried) | 0.00 (0.14) | 0.01 (0.20) | 0.02 (0.22) | 0.02 (0.24) |
| counter, a read (tried) | 0.02 (0.40) | 0.09 (0.43) | 0.13 (0.49) | 0.11 (0.44) |
| Cut Away | 0.18 | 0.11 | 0.05 | 0.05 |
| Technical Difficulties hit | 0.34 | 0.41 | 0.25 | 0.26 |
| punish | 1.44 | 1.67 | 2.38 | 2.39 |
| throw tech | 0.07 | 0.26 | 1.29 | 1.51 |
