# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn, with 60-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 35:65, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12424 rounds. Average round 41.0 s; 8.8% time out. The first hit wins the round 57.5% of the time. The furthest from even: Okafor 65 over Mumbles, Storm 60 over Okafor, Price 59 over Storm, Vega 59 over Lamarre, Price 58 over Lamarre, Storm 57 over Vega.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 57 | 52 | 57 | 60 | 48 | 41 | **52** |
| Rox Vega | 43 | – | 51 | 55 | 50 | 59 | 56 | **52** |
| Hollis Bey | 49 | 49 | – | 45 | 54 | 53 | 48 | **49** |
| Mister Mumbles | 44 | 46 | 56 | – | 35 | 49 | 56 | **47** |
| Margaret Okafor | 40 | 50 | 47 | 65 | – | 54 | 44 | **50** |
| Chef Gus Lamarre | 53 | 42 | 47 | 52 | 46 | – | 42 | **47** |
| Rev. Gideon Price | 59 | 45 | 53 | 44 | 56 | 58 | – | **52** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.9 to 13.2; 14 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 9.6 (6.2) | **12.5 (7.5)** | 10.0 (6.3) | **11.5 (6.3)** | **12.3 (7.3)** | **12.8 (7.2)** | 920 · 11.4 · 10.3 · 81 |
| Rox Vega | **7.9 (6.1)** | – | 8.8 (6.9) | 8.8 (7.5) | **7.9 (6.2)** | 8.2 (6.1) | 8.5 (6.6) | 850 · 8.3 · 9.2 · 111 |
| Hollis Bey | 9.6 (6.7) | 8.6 (6.5) | – | 8.4 (6.4) | 9.0 (6.3) | 9.6 (6.6) | 9.9 (7.0) | 1020 · 9.2 · 11.5 · 98 |
| Mister Mumbles | 9.0 (6.6) | 8.2 (6.2) | 10.4 (7.5) | – | 8.3 (6.2) | 9.1 (6.8) | 9.5 (6.9) | 870 · 9.1 · 9.4 · 102 |
| Margaret Okafor | 10.6 (4.7) | 8.7 (4.2) | **11.5 (5.1)** | 9.0 (4.7) | – | 10.6 (4.6) | 11.0 (4.3) | 860 · 10.2 · 9.9 · 91 |
| Chef Gus Lamarre | **11.7 (8.4)** | 9.5 (7.1) | **12.4 (9.3)** | 9.7 (7.2) | 10.6 (7.9) | – | **11.7 (8.6)** | 940 · 10.9 · 10.5 · 84 |
| Rev. Gideon Price | **13.1 (9.5)** | 10.5 (7.3) | **13.2 (8.8)** | 10.6 (7.4) | **12.2 (8.1)** | **13.2 (9.7)** | – | 960 · 12.1 · 10.6 · 75 |

### Comebacks

Of the rounds where someone fell under 30% health, 40.5% were won by someone who had (4975 of 12292). The loser of round 1 went on to win 25.8% of the matches (1264 of 4898).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.2 (38) | 1.5 (43) | 0.6 (38) | 8.8 (45) | 29.6 (50) | 32.8 (52) | 71.5 (56) |
| Rox Vega | 0.2 (38) | – | 0.0 (36) | 0.0 (33) | 0.0 (32) | 0.2 (37) | 0.6 (39) | 0.0 (32) |
| Hollis Bey | 1.5 (43) | 0.0 (36) | – | 0.2 (36) | 0.0 (37) | 3.0 (44) | 5.1 (45) | 0.0 (38) |
| Mister Mumbles | 0.6 (38) | 0.0 (33) | 0.2 (36) | – | 0.0 (30) | 1.0 (39) | 1.2 (39) | 0.4 (33) |
| Margaret Okafor | 8.8 (45) | 0.0 (32) | 0.0 (37) | 0.0 (30) | – | 10.7 (44) | 11.9 (45) | 2.8 (40) |
| Chef Gus Lamarre | 29.6 (50) | 0.2 (37) | 3.0 (44) | 1.0 (39) | 10.7 (44) | – | 36.9 (52) | 11.8 (47) |
| Rev. Gideon Price | 32.8 (52) | 0.6 (39) | 5.1 (45) | 1.2 (39) | 11.9 (45) | 36.9 (52) | – | 59.4 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.4 | 31.4 | 27.6 | 15.6 |
| Rox Vega | 61.3 | 29.4 | 8.8 | 0.5 |
| Hollis Bey | 35.7 | 45.4 | 17.7 | 1.2 |
| Mister Mumbles | 45.9 | 39.4 | 12.5 | 2.2 |
| Margaret Okafor | 27.1 | 41.8 | 26.7 | 4.4 |
| Chef Gus Lamarre | 21.8 | 36.7 | 36.2 | 5.2 |
| Rev. Gideon Price | 28.2 | 42.9 | 26.5 | 2.4 |

### Combos

197275 combos (a single hit counts as one). 1 hits 65.5%, 2 hits 12.4%, 3 hits 8.8%, 4 hits 4.0%, 5 hits 1.7%, 6–7 hits 2.1%, 8–9 hits 2.5%, 10+ hits 3.0%. Average 90 damage; 3.6% do 250 or more.

### Damage by source

normals 48.5% · air normals 2.0% · specials 20.3% · projectiles 10.8% · throws 8.1% · super 4.7% · chip 2.7% · props 3.0% · hazards 0.0%

### Mechanics, per round

boost 2.09 · tapeSkip 0.29 · jumpCancel 0.24 · relaunch 0.85 · cutAway 0.05 · flawless 3.60 · punish 2.38 · reversal 0.04 · delayedGetup 2.14 · ducked 0.76 · throw 2.49 · throwTech 1.32 · guardCrush 0.02 · counter (a read) 0.13 · counter hit 3.08 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 18% (5105/116) · Cold Front 15% (5311/14158) · Shin Poke 12% (6410/653) · Throw 5% (1240/0) · Cold Front (boosted) 5% (2030/2006)
- **Rox Vega:** Leg Warmer Lariat 20% (33890/765) · Count of Eight 8% (26805/526) · Wake-Up Jab 7% (7712/1262) · Throw 7% (2381/0) · Reps 7% (3713/393)
- **Hollis Bey:** Key Ring 14% (5982/2998) · Clocking In 14% (3088/0) · Night Shift 9% (2823/3563) · Throw 8% (1662/0) · Lights Out 6% (2211/23)
- **Mister Mumbles:** Under the Bed 10% (4497/29) · Punchline 10% (3931/77) · Ankle Biter 9% (5811/541) · Throw 8% (2718/0) · Hand Puppet 8% (4685/100)
- **Margaret Okafor:** Anchor Kick 10% (5322/2475) · Lead Paragraph 9% (5668/183) · Breaking 9% (4274/191) · Low Bulletin 9% (6147/674) · We Go Live 7% (4815/16)
- **Chef Gus Lamarre:** Flambé 16% (15346/13073) · Chop Chop 11% (3914/1376) · Cleaver 10% (3446/3255) · Skillet 8% (2926/2026) · Rolling Pin 8% (5364/541)
- **Rev. Gideon Price:** Collection Plate 14% (11553/253) · Low Offering 9% (5397/1197) · Pulpit Kick 8% (2674/4463) · Hand Raised 6% (4474/780) · Throw 6% (1343/0)

## director

12456 rounds. Average round 40.9 s; 8.4% time out. The first hit wins the round 57.6% of the time. The furthest from even: Okafor 64 over Mumbles, Storm 62 over Okafor, Storm 62 over Vega, Okafor 57 over Vega, Lamarre 57 over Mumbles, Bey 57 over Vega.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 62 | 55 | 55 | 62 | 48 | 46 | **55** |
| Rox Vega | 39 | – | 44 | 44 | 43 | 48 | 50 | **45** |
| Hollis Bey | 45 | 57 | – | 45 | 45 | 48 | 45 | **47** |
| Mister Mumbles | 45 | 56 | 55 | – | 36 | 43 | 49 | **47** |
| Margaret Okafor | 38 | 57 | 55 | 64 | – | 52 | 54 | **53** |
| Chef Gus Lamarre | 53 | 52 | 52 | 57 | 49 | – | 46 | **51** |
| Rev. Gideon Price | 54 | 50 | 55 | 51 | 46 | 54 | – | **52** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.3 to 12.9; 15 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 8.8 (5.9) | **11.9 (7.4)** | 9.5 (6.2) | 11.1 (6.1) | **11.7 (6.9)** | **12.3 (6.9)** | 920 · 10.9 · 9.8 · 85 |
| Rox Vega | **7.5 (5.9)** | – | 8.5 (6.6) | 8.3 (7.2) | **7.3 (5.7)** | **7.5 (5.9)** | **7.7 (6.1)** | 850 · 7.8 · 8.5 · 119 |
| Hollis Bey | 9.4 (6.4) | 8.0 (6.3) | – | 8.1 (6.3) | 8.7 (6.3) | 9.1 (6.5) | 9.6 (6.9) | 1020 · 8.8 · 10.8 · 102 |
| Mister Mumbles | 8.6 (6.4) | **7.8 (6.0)** | 9.8 (7.3) | – | **7.6 (6.1)** | 8.8 (6.7) | 8.8 (6.8) | 870 · 8.6 · 8.8 · 108 |
| Margaret Okafor | 9.9 (4.5) | **7.7 (4.0)** | 10.4 (4.7) | 8.0 (4.3) | – | 10.1 (4.3) | 10.1 (4.2) | 860 · 9.4 · 9.5 · 100 |
| Chef Gus Lamarre | 11.2 (8.2) | 8.7 (6.8) | **11.9 (9.0)** | 9.0 (7.0) | 10.2 (7.5) | – | 11.2 (8.0) | 940 · 10.4 · 10.0 · 89 |
| Rev. Gideon Price | **12.5 (8.9)** | 9.7 (6.9) | **12.5 (8.5)** | 10.1 (7.2) | **12.0 (8.0)** | **12.9 (9.2)** | – | 960 · 11.6 · 9.9 · 79 |

### Comebacks

Of the rounds where someone fell under 30% health, 41.8% were won by someone who had (5160 of 12330). The loser of round 1 went on to win 27.5% of the matches (1347 of 4898).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (37) | 2.1 (42) | 0.4 (38) | 10.3 (45) | 33.6 (51) | 28.8 (51) | 70.7 (56) |
| Rox Vega | 0.0 (37) | – | 0.0 (36) | 0.0 (34) | 0.0 (31) | 0.4 (38) | 0.2 (39) | 0.0 (33) |
| Hollis Bey | 2.1 (42) | 0.0 (36) | – | 0.2 (35) | 0.4 (36) | 3.5 (43) | 3.9 (45) | 0.0 (38) |
| Mister Mumbles | 0.4 (38) | 0.0 (34) | 0.2 (35) | – | 0.0 (31) | 1.0 (38) | 0.2 (39) | 0.8 (35) |
| Margaret Okafor | 10.3 (45) | 0.0 (31) | 0.4 (36) | 0.0 (31) | – | 8.2 (44) | 7.5 (45) | 3.3 (40) |
| Chef Gus Lamarre | 33.6 (51) | 0.4 (38) | 3.5 (43) | 1.0 (38) | 8.2 (44) | – | 34.5 (52) | 9.9 (46) |
| Rev. Gideon Price | 28.8 (51) | 0.2 (39) | 3.9 (45) | 0.2 (39) | 7.5 (45) | 34.5 (52) | – | 57.7 (56) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.6 | 31.9 | 27.2 | 15.3 |
| Rox Vega | 62.2 | 28.9 | 8.4 | 0.5 |
| Hollis Bey | 35.8 | 45.3 | 17.6 | 1.3 |
| Mister Mumbles | 45.9 | 39.7 | 12.4 | 2.0 |
| Margaret Okafor | 27.3 | 42.4 | 26.1 | 4.2 |
| Chef Gus Lamarre | 21.9 | 37.7 | 35.2 | 5.2 |
| Rev. Gideon Price | 28.4 | 43.6 | 25.8 | 2.2 |

### Combos

189356 combos (a single hit counts as one). 1 hits 63.1%, 2 hits 12.3%, 3 hits 9.3%, 4 hits 4.5%, 5 hits 2.0%, 6–7 hits 2.4%, 8–9 hits 2.9%, 10+ hits 3.5%. Average 95 damage; 4.3% do 250 or more.

### Damage by source

normals 48.1% · air normals 1.9% · specials 20.5% · projectiles 10.4% · throws 9.0% · super 4.6% · chip 2.5% · props 3.0% · hazards 0.0%

### Mechanics, per round

boost 1.99 · tapeSkip 0.34 · jumpCancel 0.28 · relaunch 0.93 · cutAway 0.05 · flawless 3.46 · punish 2.45 · reversal 0.04 · delayedGetup 2.20 · ducked 1.16 · throw 2.84 · throwTech 1.53 · guardCrush 0.02 · counter (a read) 0.12 · counter hit 2.88 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 17% (5159/98) · Cold Front 14% (5230/14043) · Shin Poke 11% (6318/503) · Throw 6% (1490/0) · Isobar Lasso 5% (3795/4703)
- **Rox Vega:** Leg Warmer Lariat 21% (36755/786) · Wake-Up Jab 7% (7972/1004) · Count of Eight 7% (27133/351) · Throw 7% (2510/0) · Reps 6% (3652/282)
- **Hollis Bey:** Key Ring 15% (6242/2623) · Clocking In 14% (2981/0) · Throw 10% (1957/0) · Night Shift 9% (2649/3352) · Lights Out 6% (2350/34)
- **Mister Mumbles:** Punchline 10% (4247/69) · Under the Bed 10% (4724/26) · Throw 10% (3289/0) · Hand Puppet 9% (5007/71) · Ankle Biter 8% (5307/375)
- **Margaret Okafor:** Breaking 10% (4893/138) · Anchor Kick 10% (5785/2277) · Lead Paragraph 10% (6319/137) · Low Bulletin 8% (5586/531) · We Go Live 8% (5409/9)
- **Chef Gus Lamarre:** Flambé 16% (15982/12598) · Chop Chop 13% (4432/1367) · Cleaver 10% (3763/3089) · Rolling Pin 8% (5316/482) · Skillet 7% (2764/1950)
- **Rev. Gideon Price:** Collection Plate 13% (11002/239) · Low Offering 9% (5279/1122) · Pulpit Kick 8% (2778/4383) · Throw 6% (1532/0) · Altar Call 6% (3137/51)

## The first hit's worth

The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses none). The aim: the smallest bonus that keeps the average round inside 25 to 50 seconds (and the bench passing).

| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |
| --- | --- | --- | --- | --- | --- |
| 1 bar | 40.7 | 8.2% | 60.8% | 0.09 | Price 62 over Storm, Storm 61 over Mumbles, Storm 59 over Bey |
| 0.5 bar | 40.9 | 8.5% | 59.1% | 0.07 | Price 65 over Storm, Storm 64 over Vega, Storm 62 over Okafor |
| 0 bar | 41.0 | 8.8% | 57.5% | 0.05 | Okafor 65 over Mumbles, Storm 60 over Okafor, Price 59 over Storm |

## Under LIVE BROADCAST rules

The hard bench again with the segments changing each round and the hazards on. 12405 rounds; average round 40.7 s; 7.8% time out; the first hit wins the round 58.0% of the time. Hazards did 2.4% of the damage and props 1.2% (props are in studio rules too: 3.0% there).

A matchup moves 4.2 points from its studio result on average; none moves further than 10. At 100 seeds a pair, a few points either way is noise.

### Win rates, live

As in studio rules, with the change from the studio result in brackets.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 60 (+3) | 60 (+8) | 54 (-3) | 57 (-3) | 46 (-2) | 42 (+1) | **53** |
| Rox Vega | 40 (-3) | – | 44 (-7) | 49 (-5) | 43 (-7) | 51 (-7) | 50 (-5) | **46** |
| Hollis Bey | 41 (-8) | 56 (+7) | – | 46 (+2) | 52 (-1) | 46 (-7) | 52 (+5) | **49** |
| Mister Mumbles | 47 (+3) | 51 (+6) | 54 (-1) | – | 42 (+7) | 44 (-4) | 54 (-2) | **48** |
| Margaret Okafor | 43 (+3) | 57 (+7) | 48 (+2) | 59 (-6) | – | 52 (-2) | 46 (+2) | **51** |
| Chef Gus Lamarre | 55 (+2) | 49 (+8) | 55 (+8) | 56 (+5) | 48 (+2) | – | 38 (-4) | **50** |
| Rev. Gideon Price | 59 (0) | 50 (+6) | 48 (-4) | 47 (+3) | 55 (-1) | 63 (+5) | – | **53** |

### Damage by source, live

normals 48.3% · air normals 1.9% · specials 20.0% · projectiles 10.9% · throws 8.0% · super 4.8% · chip 2.6% · props 1.2% · hazards 2.4%

## The rarer mechanics by CPU level

Per round, at every CPU level (easy and normal over 30 seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.

| | easy | normal | hard | director |
| --- | --- | --- | --- | --- |
| counter hit (share of strikes) | 1.90 (7.2%) | 3.12 (10.0%) | 3.08 (9.5%) | 2.88 (8.7%) |
| reversal (tried) | 0.05 (0.10) | 0.08 (0.18) | 0.04 (0.11) | 0.04 (0.10) |
| guard crush (tried) | 0.00 (0.14) | 0.01 (0.20) | 0.02 (0.23) | 0.02 (0.24) |
| counter, a read (tried) | 0.02 (0.37) | 0.10 (0.46) | 0.13 (0.46) | 0.12 (0.42) |
| Cut Away | 0.17 | 0.12 | 0.05 | 0.05 |
| Technical Difficulties hit | 0.34 | 0.39 | 0.25 | 0.25 |
| punish | 1.46 | 1.71 | 2.38 | 2.45 |
| throw tech | 0.07 | 0.27 | 1.32 | 1.53 |
