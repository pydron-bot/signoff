# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn, with 60-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 35:65, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12405 rounds. Average round 41.1 s; 8.9% time out. The first hit wins the round 57.7% of the time. The furthest from even: Okafor 65 over Mumbles, Storm 60 over Okafor, Price 59 over Storm, Mumbles 58 over Price, Storm 57 over Vega, Price 57 over Okafor.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 57 | 52 | 57 | 60 | 47 | 42 | **52** |
| Rox Vega | 43 | – | 51 | 55 | 50 | 53 | 53 | **51** |
| Hollis Bey | 49 | 49 | – | 45 | 54 | 54 | 50 | **50** |
| Mister Mumbles | 44 | 46 | 56 | – | 35 | 46 | 58 | **47** |
| Margaret Okafor | 40 | 50 | 47 | 65 | – | 49 | 43 | **49** |
| Chef Gus Lamarre | 54 | 47 | 46 | 55 | 51 | – | 43 | **49** |
| Rev. Gideon Price | 59 | 48 | 50 | 42 | 57 | 57 | – | **52** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.9 to 13.3; 13 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 9.6 (6.2) | **12.5 (7.5)** | 10.0 (6.3) | **11.5 (6.3)** | **12.2 (7.3)** | **12.6 (7.2)** | 920 · 11.4 · 10.3 · 81 |
| Rox Vega | **7.9 (6.1)** | – | 8.8 (6.9) | 8.8 (7.5) | **7.9 (6.2)** | 8.2 (6.2) | 8.4 (6.5) | 850 · 8.3 · 9.1 · 111 |
| Hollis Bey | 9.6 (6.7) | 8.6 (6.5) | – | 8.4 (6.4) | 9.0 (6.3) | 9.3 (6.6) | 10.0 (6.9) | 1020 · 9.1 · 11.5 · 99 |
| Mister Mumbles | 9.0 (6.6) | 8.2 (6.2) | 10.4 (7.5) | – | 8.3 (6.2) | 9.3 (6.9) | 9.5 (7.0) | 870 · 9.1 · 9.4 · 102 |
| Margaret Okafor | 10.6 (4.7) | 8.7 (4.2) | **11.5 (5.1)** | 9.0 (4.7) | – | 10.9 (4.7) | 11.2 (4.4) | 860 · 10.3 · 9.9 · 90 |
| Chef Gus Lamarre | 11.4 (8.3) | 9.3 (7.0) | **12.3 (9.2)** | 9.7 (7.2) | 10.3 (7.5) | – | **11.8 (8.4)** | 940 · 10.8 · 10.5 · 85 |
| Rev. Gideon Price | **12.9 (9.3)** | 10.4 (7.2) | **13.2 (8.7)** | 10.6 (7.3) | **12.2 (8.0)** | **13.3 (9.7)** | – | 960 · 12.1 · 10.6 · 76 |

### Comebacks

Of the rounds where someone fell under 30% health, 40.3% were won by someone who had (4937 of 12249). The loser of round 1 went on to win 26.6% of the matches (1302 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.2 (38) | 1.5 (43) | 0.6 (38) | 8.8 (45) | 28.1 (51) | 31.2 (52) | 71.5 (56) |
| Rox Vega | 0.2 (38) | – | 0.0 (36) | 0.0 (33) | 0.0 (32) | 0.4 (37) | 0.2 (38) | 0.0 (32) |
| Hollis Bey | 1.5 (43) | 0.0 (36) | – | 0.2 (36) | 0.0 (37) | 4.2 (44) | 5.5 (45) | 0.0 (38) |
| Mister Mumbles | 0.6 (38) | 0.0 (33) | 0.2 (36) | – | 0.0 (30) | 0.8 (39) | 1.6 (39) | 0.4 (33) |
| Margaret Okafor | 8.8 (45) | 0.0 (32) | 0.0 (37) | 0.0 (30) | – | 10.6 (45) | 12.7 (46) | 2.8 (40) |
| Chef Gus Lamarre | 28.1 (51) | 0.4 (37) | 4.2 (44) | 0.8 (39) | 10.6 (45) | – | 41.5 (53) | 10.0 (47) |
| Rev. Gideon Price | 31.2 (52) | 0.2 (38) | 5.5 (45) | 1.6 (39) | 12.7 (46) | 41.5 (53) | – | 57.8 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.2 | 31.4 | 27.8 | 15.6 |
| Rox Vega | 61.2 | 29.4 | 8.9 | 0.6 |
| Hollis Bey | 35.6 | 45.1 | 18.1 | 1.2 |
| Mister Mumbles | 45.8 | 39.5 | 12.6 | 2.2 |
| Margaret Okafor | 26.9 | 41.7 | 27.0 | 4.4 |
| Chef Gus Lamarre | 21.3 | 36.1 | 37.5 | 5.1 |
| Rev. Gideon Price | 27.5 | 42.9 | 27.3 | 2.3 |

### Combos

196464 combos (a single hit counts as one). 1 hits 65.9%, 2 hits 12.6%, 3 hits 8.5%, 4 hits 3.8%, 5 hits 1.7%, 6–7 hits 2.1%, 8–9 hits 2.5%, 10+ hits 2.9%. Average 90 damage; 3.7% do 250 or more.

### Damage by source

normals 48.1% · air normals 2.0% · specials 20.3% · projectiles 10.9% · throws 8.2% · super 4.6% · chip 2.7% · props 3.1% · hazards 0.0%

### Mechanics, per round

boost 2.11 · tapeSkip 0.27 · jumpCancel 0.23 · relaunch 0.85 · cutAway 0.05 · flawless 3.57 · punish 2.37 · reversal 0.05 · delayedGetup 2.14 · ducked 0.72 · throw 2.49 · throwTech 1.31 · guardCrush 0.02 · counter (a read) 0.13 · counter hit 3.05 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 18% (5072/122) · Cold Front 15% (5269/14377) · Shin Poke 12% (6411/626) · Throw 5% (1223/0) · Cold Front (boosted) 5% (2062/2024)
- **Rox Vega:** Leg Warmer Lariat 20% (33962/761) · Count of Eight 8% (26473/508) · Wake-Up Jab 7% (7705/1222) · Throw 7% (2398/0) · Reps 7% (3629/378)
- **Hollis Bey:** Clocking In 14% (3128/0) · Key Ring 14% (5947/2936) · Night Shift 9% (2769/3565) · Throw 8% (1710/0) · Lights Out 6% (2205/26)
- **Mister Mumbles:** Under the Bed 10% (4456/25) · Punchline 10% (3865/72) · Ankle Biter 9% (5757/539) · Throw 8% (2762/0) · Hand Puppet 8% (4647/105)
- **Margaret Okafor:** Anchor Kick 10% (5267/2493) · Lead Paragraph 9% (5669/188) · Breaking 9% (4251/200) · Low Bulletin 9% (6145/673) · We Go Live 7% (4822/16)
- **Chef Gus Lamarre:** Flambé 16% (15823/14032) · Chop Chop 12% (4290/1471) · Cleaver 10% (3527/3585) · Skillet 9% (3197/2300) · Rolling Pin 9% (5805/635)
- **Rev. Gideon Price:** Collection Plate 14% (11730/238) · Low Offering 9% (5546/1322) · Pulpit Kick 8% (2696/5170) · Hand Raised 6% (4378/686) · Throw 6% (1317/0)

## director

12475 rounds. Average round 41.0 s; 8.7% time out. The first hit wins the round 57.7% of the time. The furthest from even: Okafor 64 over Mumbles, Storm 62 over Okafor, Storm 62 over Vega, Lamarre 60 over Mumbles, Price 60 over Bey, Okafor 57 over Vega.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 62 | 55 | 55 | 62 | 46 | 46 | **54** |
| Rox Vega | 39 | – | 44 | 44 | 43 | 47 | 53 | **45** |
| Hollis Bey | 45 | 57 | – | 45 | 45 | 50 | 41 | **47** |
| Mister Mumbles | 45 | 56 | 55 | – | 36 | 41 | 56 | **48** |
| Margaret Okafor | 38 | 57 | 55 | 64 | – | 56 | 56 | **54** |
| Chef Gus Lamarre | 54 | 54 | 51 | 60 | 45 | – | 47 | **51** |
| Rev. Gideon Price | 55 | 48 | 60 | 45 | 45 | 54 | – | **51** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.3 to 12.7; 15 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 8.8 (5.9) | **11.9 (7.4)** | 9.5 (6.2) | 11.1 (6.1) | **11.9 (7.0)** | **12.3 (7.0)** | 920 · 10.9 · 9.8 · 85 |
| Rox Vega | **7.5 (5.9)** | – | 8.5 (6.6) | 8.3 (7.2) | **7.3 (5.7)** | **7.5 (5.9)** | **7.7 (6.1)** | 850 · 7.8 · 8.4 · 119 |
| Hollis Bey | 9.4 (6.4) | 8.0 (6.3) | – | 8.1 (6.3) | 8.7 (6.3) | 9.1 (6.5) | 9.6 (6.9) | 1020 · 8.8 · 10.7 · 102 |
| Mister Mumbles | 8.6 (6.4) | **7.8 (6.0)** | 9.8 (7.3) | – | **7.6 (6.1)** | 8.6 (6.7) | 8.8 (6.8) | 870 · 8.5 · 8.8 · 108 |
| Margaret Okafor | 9.9 (4.5) | **7.7 (4.0)** | 10.4 (4.7) | 8.0 (4.3) | – | 9.8 (4.2) | 10.1 (4.2) | 860 · 9.3 · 9.5 · 100 |
| Chef Gus Lamarre | 11.3 (8.3) | 8.6 (6.5) | **11.6 (8.7)** | 8.9 (6.9) | 10.3 (7.5) | – | 11.0 (8.0) | 940 · 10.3 · 9.9 · 90 |
| Rev. Gideon Price | **12.4 (8.8)** | 9.7 (6.9) | **12.3 (8.3)** | 10.0 (7.0) | **12.0 (7.9)** | **12.7 (8.9)** | – | 960 · 11.5 · 9.9 · 80 |

### Comebacks

Of the rounds where someone fell under 30% health, 42.0% were won by someone who had (5190 of 12352). The loser of round 1 went on to win 27.9% of the matches (1364 of 4897).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (37) | 2.1 (42) | 0.4 (38) | 10.3 (45) | 31.6 (51) | 31.5 (52) | 70.7 (56) |
| Rox Vega | 0.0 (37) | – | 0.0 (36) | 0.0 (34) | 0.0 (31) | 0.2 (38) | 0.2 (38) | 0.0 (33) |
| Hollis Bey | 2.1 (42) | 0.0 (36) | – | 0.2 (35) | 0.4 (36) | 4.2 (43) | 3.5 (45) | 0.0 (38) |
| Mister Mumbles | 0.4 (38) | 0.0 (34) | 0.2 (35) | – | 0.0 (31) | 1.0 (39) | 1.3 (39) | 0.8 (35) |
| Margaret Okafor | 10.3 (45) | 0.0 (31) | 0.4 (36) | 0.0 (31) | – | 8.8 (43) | 10.8 (45) | 3.3 (40) |
| Chef Gus Lamarre | 31.6 (51) | 0.2 (38) | 4.2 (43) | 1.0 (39) | 8.8 (43) | – | 36.7 (52) | 11.5 (46) |
| Rev. Gideon Price | 31.5 (52) | 0.2 (38) | 3.5 (45) | 1.3 (39) | 10.8 (45) | 36.7 (52) | – | 56.0 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.5 | 31.9 | 27.4 | 15.2 |
| Rox Vega | 62.1 | 28.8 | 8.5 | 0.6 |
| Hollis Bey | 35.8 | 45.2 | 17.8 | 1.3 |
| Mister Mumbles | 45.7 | 39.7 | 12.5 | 2.0 |
| Margaret Okafor | 27.3 | 42.4 | 26.1 | 4.1 |
| Chef Gus Lamarre | 21.9 | 37.5 | 35.6 | 5.0 |
| Rev. Gideon Price | 27.9 | 43.6 | 26.4 | 2.1 |

### Combos

189010 combos (a single hit counts as one). 1 hits 63.5%, 2 hits 12.3%, 3 hits 9.0%, 4 hits 4.4%, 5 hits 2.0%, 6–7 hits 2.4%, 8–9 hits 3.0%, 10+ hits 3.5%. Average 96 damage; 4.4% do 250 or more.

### Damage by source

normals 47.8% · air normals 1.9% · specials 20.5% · projectiles 10.5% · throws 9.0% · super 4.7% · chip 2.5% · props 3.0% · hazards 0.0%

### Mechanics, per round

boost 2.02 · tapeSkip 0.32 · jumpCancel 0.27 · relaunch 0.93 · cutAway 0.05 · flawless 3.40 · punish 2.42 · reversal 0.04 · delayedGetup 2.20 · ducked 1.11 · throw 2.85 · throwTech 1.54 · guardCrush 0.02 · counter (a read) 0.11 · counter hit 2.84 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 17% (5154/105) · Cold Front 14% (5237/14222) · Shin Poke 11% (6368/521) · Throw 6% (1498/0) · Isobar Lasso 5% (3823/4763)
- **Rox Vega:** Leg Warmer Lariat 21% (36966/835) · Count of Eight 7% (27502/350) · Wake-Up Jab 7% (8050/981) · Throw 7% (2503/0) · Reps 6% (3678/289)
- **Hollis Bey:** Key Ring 15% (6176/2697) · Clocking In 14% (2941/0) · Throw 10% (1924/0) · Night Shift 9% (2672/3401) · Lights Out 6% (2355/33)
- **Mister Mumbles:** Under the Bed 10% (4852/29) · Punchline 10% (4300/67) · Throw 10% (3385/0) · Hand Puppet 9% (5110/83) · Ankle Biter 8% (5419/367)
- **Margaret Okafor:** Breaking 10% (4934/138) · Anchor Kick 10% (5825/2346) · Lead Paragraph 10% (6366/145) · Low Bulletin 8% (5599/521) · We Go Live 8% (5458/11)
- **Chef Gus Lamarre:** Flambé 16% (16083/12938) · Chop Chop 13% (4647/1397) · Cleaver 10% (3803/3358) · Rolling Pin 8% (5596/544) · Skillet 8% (3013/2047)
- **Rev. Gideon Price:** Collection Plate 13% (10905/249) · Low Offering 9% (5367/1315) · Pulpit Kick 8% (2658/4976) · Throw 7% (1589/0) · Altar Call 6% (3133/35)

## The first hit's worth

The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses none). The aim: the smallest bonus that keeps the average round inside 25 to 50 seconds (and the bench passing).

| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |
| --- | --- | --- | --- | --- | --- |
| 1 bar | 40.9 | 8.6% | 59.9% | 0.09 | Storm 61 over Mumbles, Vega 60 over Lamarre, Storm 59 over Bey |
| 0.5 bar | 40.9 | 9.0% | 59.4% | 0.07 | Storm 64 over Vega, Bey 64 over Lamarre, Vega 63 over Lamarre |
| 0 bar | 41.1 | 8.9% | 57.7% | 0.05 | Okafor 65 over Mumbles, Storm 60 over Okafor, Price 59 over Storm |

## Under LIVE BROADCAST rules

The hard bench again with the segments changing each round and the hazards on. 12395 rounds; average round 40.8 s; 8.2% time out; the first hit wins the round 58.0% of the time. Hazards did 2.4% of the damage and props 1.2% (props are in studio rules too: 3.1% there).

A matchup moves 3.4 points from its studio result on average; none moves further than 10. At 100 seeds a pair, a few points either way is noise.

### Win rates, live

As in studio rules, with the change from the studio result in brackets.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 60 (+3) | 60 (+8) | 54 (-3) | 57 (-3) | 48 (+2) | 51 (+9) | **55** |
| Rox Vega | 40 (-3) | – | 44 (-7) | 49 (-5) | 43 (-7) | 51 (-2) | 50 (-3) | **46** |
| Hollis Bey | 41 (-8) | 56 (+7) | – | 46 (+2) | 52 (-1) | 53 (-1) | 51 (+1) | **50** |
| Mister Mumbles | 47 (+3) | 51 (+6) | 54 (-1) | – | 42 (+7) | 45 (0) | 59 (+1) | **50** |
| Margaret Okafor | 43 (+3) | 57 (+7) | 48 (+2) | 59 (-6) | – | 54 (+5) | 44 (+1) | **51** |
| Chef Gus Lamarre | 52 (-1) | 49 (+2) | 47 (+1) | 55 (+1) | 47 (-4) | – | 41 (-2) | **48** |
| Rev. Gideon Price | 50 (-9) | 51 (+3) | 50 (0) | 41 (-1) | 57 (0) | 59 (+2) | – | **51** |

### Damage by source, live

normals 47.9% · air normals 1.9% · specials 20.1% · projectiles 11.1% · throws 7.9% · super 4.9% · chip 2.6% · props 1.2% · hazards 2.4%

## The rarer mechanics by CPU level

Per round, at every CPU level (easy and normal over 30 seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.

| | easy | normal | hard | director |
| --- | --- | --- | --- | --- |
| counter hit (share of strikes) | 1.87 (7.1%) | 3.14 (10.2%) | 3.05 (9.5%) | 2.84 (8.6%) |
| reversal (tried) | 0.06 (0.11) | 0.08 (0.17) | 0.05 (0.11) | 0.04 (0.10) |
| guard crush (tried) | 0.00 (0.14) | 0.01 (0.19) | 0.02 (0.22) | 0.02 (0.23) |
| counter, a read (tried) | 0.02 (0.36) | 0.10 (0.45) | 0.13 (0.46) | 0.11 (0.41) |
| Cut Away | 0.17 | 0.12 | 0.05 | 0.05 |
| Technical Difficulties hit | 0.34 | 0.40 | 0.25 | 0.25 |
| punish | 1.45 | 1.71 | 2.37 | 2.42 |
| throw tech | 0.07 | 0.27 | 1.31 | 1.54 |
