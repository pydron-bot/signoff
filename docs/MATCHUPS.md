# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn, with 60-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 35:65, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12433 rounds. Average round 41.0 s; 8.8% time out. The first hit wins the round 57.1% of the time. The furthest from even: Mumbles 63 over Bey, Storm 60 over Okafor, Price 59 over Storm, Vega 59 over Lamarre, Mumbles 59 over Price, Price 58 over Lamarre.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 57 | 52 | 55 | 60 | 48 | 41 | **52** |
| Rox Vega | 43 | – | 51 | 49 | 50 | 59 | 56 | **51** |
| Hollis Bey | 49 | 49 | – | 37 | 54 | 53 | 48 | **48** |
| Mister Mumbles | 46 | 52 | 63 | – | 47 | 51 | 59 | **53** |
| Margaret Okafor | 40 | 50 | 47 | 53 | – | 54 | 44 | **48** |
| Chef Gus Lamarre | 53 | 42 | 47 | 50 | 46 | – | 42 | **46** |
| Rev. Gideon Price | 59 | 45 | 53 | 42 | 56 | 58 | – | **52** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.9 to 13.2; 14 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 9.6 (6.2) | **12.5 (7.5)** | 10.2 (6.4) | **11.5 (6.3)** | **12.3 (7.3)** | **12.8 (7.2)** | 920 · 11.5 · 10.3 · 80 |
| Rox Vega | **7.9 (6.1)** | – | 8.8 (6.9) | 8.8 (7.5) | **7.9 (6.2)** | 8.2 (6.1) | 8.5 (6.6) | 850 · 8.4 · 9.2 · 111 |
| Hollis Bey | 9.6 (6.7) | 8.6 (6.5) | – | 8.5 (6.5) | 9.0 (6.3) | 9.6 (6.6) | 9.9 (7.0) | 1020 · 9.2 · 11.5 · 98 |
| Mister Mumbles | 9.1 (6.6) | 8.2 (6.2) | 10.5 (7.6) | – | 8.4 (6.2) | 9.1 (6.8) | 9.6 (7.0) | 870 · 9.2 · 9.5 · 101 |
| Margaret Okafor | 10.6 (4.7) | 8.7 (4.2) | **11.5 (5.1)** | 9.1 (4.6) | – | 10.6 (4.6) | 11.0 (4.3) | 860 · 10.2 · 9.9 · 91 |
| Chef Gus Lamarre | **11.7 (8.4)** | 9.5 (7.1) | **12.4 (9.3)** | 9.8 (7.3) | 10.6 (7.9) | – | **11.7 (8.6)** | 940 · 11.0 · 10.5 · 84 |
| Rev. Gideon Price | **13.1 (9.5)** | 10.5 (7.3) | **13.2 (8.8)** | 10.7 (7.4) | **12.2 (8.1)** | **13.2 (9.7)** | – | 960 · 12.1 · 10.6 · 75 |

### Comebacks

Of the rounds where someone fell under 30% health, 40.7% were won by someone who had (5012 of 12301). The loser of round 1 went on to win 26.5% of the matches (1300 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.2 (38) | 1.5 (43) | 0.4 (38) | 8.8 (45) | 29.6 (50) | 32.8 (52) | 71.5 (56) |
| Rox Vega | 0.2 (38) | – | 0.0 (36) | 0.0 (33) | 0.0 (32) | 0.2 (37) | 0.6 (39) | 0.0 (32) |
| Hollis Bey | 1.5 (43) | 0.0 (36) | – | 0.0 (36) | 0.0 (37) | 3.0 (44) | 5.1 (45) | 0.0 (38) |
| Mister Mumbles | 0.4 (38) | 0.0 (33) | 0.0 (36) | – | 0.0 (31) | 0.6 (38) | 1.0 (38) | 0.4 (36) |
| Margaret Okafor | 8.8 (45) | 0.0 (32) | 0.0 (37) | 0.0 (31) | – | 10.7 (44) | 11.9 (45) | 2.8 (40) |
| Chef Gus Lamarre | 29.6 (50) | 0.2 (37) | 3.0 (44) | 0.6 (38) | 10.7 (44) | – | 36.9 (52) | 11.8 (47) |
| Rev. Gideon Price | 32.8 (52) | 0.6 (39) | 5.1 (45) | 1.0 (38) | 11.9 (45) | 36.9 (52) | – | 59.4 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.5 | 31.3 | 27.6 | 15.6 |
| Rox Vega | 61.3 | 29.4 | 8.8 | 0.5 |
| Hollis Bey | 35.7 | 45.4 | 17.7 | 1.2 |
| Mister Mumbles | 46.3 | 38.9 | 12.5 | 2.3 |
| Margaret Okafor | 27.2 | 41.7 | 26.7 | 4.4 |
| Chef Gus Lamarre | 21.9 | 36.7 | 36.2 | 5.2 |
| Rev. Gideon Price | 28.2 | 42.9 | 26.5 | 2.4 |

### Combos

198078 combos (a single hit counts as one). 1 hits 65.6%, 2 hits 12.4%, 3 hits 8.7%, 4 hits 4.1%, 5 hits 1.7%, 6–7 hits 2.1%, 8–9 hits 2.5%, 10+ hits 3.0%. Average 90 damage; 3.6% do 250 or more.

### Damage by source

normals 48.6% · air normals 2.0% · specials 20.2% · projectiles 10.7% · throws 8.2% · super 4.6% · chip 2.7% · props 3.1% · hazards 0.0%

### Mechanics, per round

boost 2.09 · tapeSkip 0.30 · jumpCancel 0.24 · relaunch 0.85 · cutAway 0.05 · flawless 3.60 · punish 2.38 · reversal 0.05 · delayedGetup 2.14 · ducked 0.76 · throw 2.50 · throwTech 1.32 · guardCrush 0.02 · counter (a read) 0.14 · counter hit 3.09 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 18% (5123/110) · Cold Front 15% (5344/14159) · Shin Poke 12% (6396/674) · Throw 5% (1229/0) · Cold Front (boosted) 5% (2025/1989)
- **Rox Vega:** Leg Warmer Lariat 20% (33858/763) · Count of Eight 8% (26946/534) · Wake-Up Jab 7% (7681/1289) · Throw 7% (2397/0) · Reps 7% (3736/411)
- **Hollis Bey:** Clocking In 14% (3124/0) · Key Ring 14% (5943/3022) · Night Shift 9% (2825/3552) · Throw 8% (1661/0) · Lights Out 6% (2187/23)
- **Mister Mumbles:** Punchline 10% (4093/74) · Under the Bed 9% (4442/26) · Ankle Biter 9% (5789/633) · Throw 8% (2812/0) · Wooden Jab 8% (6162/2520)
- **Margaret Okafor:** Anchor Kick 10% (5229/2439) · Lead Paragraph 9% (5600/176) · Breaking 9% (4220/174) · Low Bulletin 9% (6122/656) · Script Slash 7% (3391/561)
- **Chef Gus Lamarre:** Flambé 16% (15172/13023) · Chop Chop 12% (3945/1370) · Cleaver 10% (3427/3197) · Rolling Pin 8% (5426/533) · Skillet 8% (2896/2037)
- **Rev. Gideon Price:** Collection Plate 14% (11410/242) · Low Offering 9% (5470/1186) · Pulpit Kick 8% (2671/4442) · Hand Raised 6% (4473/789) · Throw 6% (1330/0)

## director

12477 rounds. Average round 40.9 s; 8.4% time out. The first hit wins the round 56.9% of the time. The furthest from even: Mumbles 64 over Vega, Storm 62 over Okafor, Storm 62 over Vega, Okafor 61 over Mumbles, Mumbles 60 over Bey, Mumbles 57 over Price.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 62 | 55 | 48 | 62 | 48 | 46 | **53** |
| Rox Vega | 39 | – | 44 | 37 | 43 | 48 | 50 | **43** |
| Hollis Bey | 45 | 57 | – | 40 | 45 | 48 | 45 | **47** |
| Mister Mumbles | 53 | 64 | 60 | – | 40 | 44 | 57 | **53** |
| Margaret Okafor | 38 | 57 | 55 | 61 | – | 52 | 54 | **53** |
| Chef Gus Lamarre | 53 | 52 | 52 | 56 | 49 | – | 46 | **51** |
| Rev. Gideon Price | 54 | 50 | 55 | 43 | 46 | 54 | – | **50** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.3 to 12.9; 15 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 8.8 (5.9) | **11.9 (7.4)** | 9.6 (6.1) | 11.1 (6.1) | **11.7 (6.9)** | **12.3 (6.9)** | 920 · 10.9 · 9.9 · 85 |
| Rox Vega | **7.5 (5.9)** | – | 8.5 (6.6) | 8.4 (7.2) | **7.3 (5.7)** | **7.5 (5.9)** | **7.7 (6.1)** | 850 · 7.8 · 8.5 · 119 |
| Hollis Bey | 9.4 (6.4) | 8.0 (6.3) | – | 8.1 (6.4) | 8.7 (6.3) | 9.1 (6.5) | 9.6 (6.9) | 1020 · 8.8 · 10.9 · 102 |
| Mister Mumbles | 8.7 (6.4) | **7.8 (6.1)** | 10.1 (7.4) | – | **7.8 (6.1)** | 8.7 (6.6) | 8.9 (6.8) | 870 · 8.7 · 8.9 · 107 |
| Margaret Okafor | 9.9 (4.5) | **7.7 (4.0)** | 10.4 (4.7) | 8.3 (4.4) | – | 10.1 (4.3) | 10.1 (4.2) | 860 · 9.4 · 9.5 · 99 |
| Chef Gus Lamarre | 11.2 (8.2) | 8.7 (6.8) | **11.9 (9.0)** | 8.9 (7.0) | 10.2 (7.5) | – | 11.2 (8.0) | 940 · 10.3 · 10.0 · 89 |
| Rev. Gideon Price | **12.5 (8.9)** | 9.7 (6.9) | **12.5 (8.5)** | 10.2 (7.3) | **12.0 (8.0)** | **12.9 (9.2)** | – | 960 · 11.6 · 10.0 · 79 |

### Comebacks

Of the rounds where someone fell under 30% health, 41.9% were won by someone who had (5178 of 12351). The loser of round 1 went on to win 27.8% of the matches (1363 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (37) | 2.1 (42) | 0.6 (38) | 10.3 (45) | 33.6 (51) | 28.8 (51) | 70.7 (56) |
| Rox Vega | 0.0 (37) | – | 0.0 (36) | 0.2 (33) | 0.0 (31) | 0.4 (38) | 0.2 (39) | 0.0 (33) |
| Hollis Bey | 2.1 (42) | 0.0 (36) | – | 0.4 (36) | 0.4 (36) | 3.5 (43) | 3.9 (45) | 0.0 (38) |
| Mister Mumbles | 0.6 (38) | 0.2 (33) | 0.4 (36) | – | 0.0 (31) | 0.4 (38) | 0.8 (38) | 0.4 (34) |
| Margaret Okafor | 10.3 (45) | 0.0 (31) | 0.4 (36) | 0.0 (31) | – | 8.2 (44) | 7.5 (45) | 3.3 (40) |
| Chef Gus Lamarre | 33.6 (51) | 0.4 (38) | 3.5 (43) | 0.4 (38) | 8.2 (44) | – | 34.5 (52) | 9.9 (46) |
| Rev. Gideon Price | 28.8 (51) | 0.2 (39) | 3.9 (45) | 0.8 (38) | 7.5 (45) | 34.5 (52) | – | 57.7 (56) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.7 | 31.8 | 27.2 | 15.2 |
| Rox Vega | 62.2 | 28.9 | 8.4 | 0.5 |
| Hollis Bey | 35.7 | 45.3 | 17.7 | 1.3 |
| Mister Mumbles | 45.8 | 39.4 | 12.7 | 2.1 |
| Margaret Okafor | 27.3 | 42.3 | 26.1 | 4.2 |
| Chef Gus Lamarre | 22.0 | 37.7 | 35.2 | 5.1 |
| Rev. Gideon Price | 28.3 | 43.6 | 25.9 | 2.2 |

### Combos

190207 combos (a single hit counts as one). 1 hits 63.3%, 2 hits 12.2%, 3 hits 9.2%, 4 hits 4.6%, 5 hits 2.0%, 6–7 hits 2.3%, 8–9 hits 2.9%, 10+ hits 3.5%. Average 95 damage; 4.3% do 250 or more.

### Damage by source

normals 48.2% · air normals 1.9% · specials 20.5% · projectiles 10.4% · throws 8.9% · super 4.6% · chip 2.5% · props 3.0% · hazards 0.0%

### Mechanics, per round

boost 1.99 · tapeSkip 0.35 · jumpCancel 0.27 · relaunch 0.92 · cutAway 0.05 · flawless 3.45 · punish 2.45 · reversal 0.04 · delayedGetup 2.20 · ducked 1.15 · throw 2.85 · throwTech 1.54 · guardCrush 0.02 · counter (a read) 0.12 · counter hit 2.89 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 17% (5176/92) · Cold Front 14% (5254/14040) · Shin Poke 11% (6313/512) · Throw 6% (1506/0) · Isobar Lasso 5% (3806/4741)
- **Rox Vega:** Leg Warmer Lariat 21% (36635/780) · Throw 7% (2511/0) · Count of Eight 7% (26991/362) · Wake-Up Jab 7% (7899/981) · Reps 6% (3611/285)
- **Hollis Bey:** Key Ring 15% (6258/2665) · Clocking In 14% (3006/0) · Throw 10% (1951/0) · Night Shift 9% (2661/3384) · Lights Out 6% (2331/27)
- **Mister Mumbles:** Punchline 11% (4505/55) · Throw 10% (3343/0) · Under the Bed 10% (4666/15) · Hand Puppet 8% (4927/62) · Wooden Jab 8% (6111/1832)
- **Margaret Okafor:** Anchor Kick 10% (5771/2279) · Breaking 10% (4849/137) · Lead Paragraph 10% (6268/124) · Low Bulletin 8% (5584/530) · We Go Live 8% (5370/11)
- **Chef Gus Lamarre:** Flambé 16% (16052/12484) · Chop Chop 13% (4421/1359) · Cleaver 10% (3796/3044) · Rolling Pin 8% (5263/462) · Skillet 7% (2762/1931)
- **Rev. Gideon Price:** Collection Plate 13% (10994/245) · Low Offering 9% (5208/1129) · Pulpit Kick 8% (2756/4375) · Throw 6% (1498/0) · Altar Call 6% (3119/51)

## The first hit's worth

The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses none). The aim: the smallest bonus that keeps the average round inside 25 to 50 seconds (and the bench passing).

| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |
| --- | --- | --- | --- | --- | --- |
| 1 bar | 40.6 | 8.1% | 60.3% | 0.09 | Price 62 over Storm, Mumbles 61 over Price, Storm 59 over Bey |
| 0.5 bar | 40.8 | 8.5% | 58.8% | 0.07 | Price 65 over Storm, Storm 64 over Vega, Mumbles 63 over Bey |
| 0 bar | 41.0 | 8.8% | 57.1% | 0.05 | Mumbles 63 over Bey, Storm 60 over Okafor, Price 59 over Storm |

## Under LIVE BROADCAST rules

The hard bench again with the segments changing each round and the hazards on. 12368 rounds; average round 40.7 s; 7.9% time out; the first hit wins the round 58.1% of the time. Hazards did 2.4% of the damage and props 1.2% (props are in studio rules too: 3.1% there).

A matchup moves 4.1 points from its studio result on average; none moves further than 10. At 100 seeds a pair, a few points either way is noise.

### Win rates, live

As in studio rules, with the change from the studio result in brackets.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 60 (+3) | 60 (+8) | 47 (-7) | 57 (-3) | 46 (-2) | 42 (+1) | **52** |
| Rox Vega | 40 (-3) | – | 44 (-7) | 51 (+2) | 43 (-7) | 51 (-7) | 50 (-5) | **46** |
| Hollis Bey | 41 (-8) | 56 (+7) | – | 36 (-1) | 52 (-1) | 46 (-7) | 52 (+5) | **47** |
| Mister Mumbles | 53 (+8) | 50 (-2) | 65 (+2) | – | 49 (+2) | 47 (-3) | 64 (+5) | **54** |
| Margaret Okafor | 43 (+3) | 57 (+7) | 48 (+2) | 51 (-2) | – | 52 (-2) | 46 (+2) | **49** |
| Chef Gus Lamarre | 55 (+2) | 49 (+8) | 55 (+8) | 53 (+4) | 48 (+2) | – | 38 (-4) | **49** |
| Rev. Gideon Price | 59 (0) | 50 (+6) | 48 (-4) | 37 (-5) | 55 (-1) | 63 (+5) | – | **52** |

### Damage by source, live

normals 48.4% · air normals 1.9% · specials 20.0% · projectiles 10.8% · throws 7.9% · super 4.7% · chip 2.6% · props 1.2% · hazards 2.4%

## The rarer mechanics by CPU level

Per round, at every CPU level (easy and normal over 30 seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.

| | easy | normal | hard | director |
| --- | --- | --- | --- | --- |
| counter hit (share of strikes) | 1.95 (7.3%) | 3.12 (10.0%) | 3.09 (9.5%) | 2.89 (8.7%) |
| reversal (tried) | 0.05 (0.11) | 0.09 (0.20) | 0.05 (0.11) | 0.04 (0.10) |
| guard crush (tried) | 0.00 (0.14) | 0.01 (0.19) | 0.02 (0.22) | 0.02 (0.24) |
| counter, a read (tried) | 0.02 (0.37) | 0.11 (0.47) | 0.14 (0.47) | 0.12 (0.43) |
| Cut Away | 0.18 | 0.12 | 0.05 | 0.05 |
| Technical Difficulties hit | 0.34 | 0.39 | 0.25 | 0.25 |
| punish | 1.45 | 1.73 | 2.38 | 2.45 |
| throw tech | 0.07 | 0.27 | 1.32 | 1.54 |
