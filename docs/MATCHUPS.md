# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn, with 60-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 35:65, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12451 rounds. Average round 41.0 s; 8.8% time out. The first hit wins the round 57.2% of the time. The furthest from even: Storm 60 over Okafor, Price 59 over Storm, Vega 59 over Lamarre, Price 58 over Lamarre, Storm 57 over Vega, Price 56 over Okafor.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 57 | 52 | 55 | 60 | 48 | 41 | **52** |
| Rox Vega | 43 | – | 51 | 49 | 50 | 59 | 56 | **51** |
| Hollis Bey | 49 | 49 | – | 53 | 54 | 53 | 48 | **51** |
| Mister Mumbles | 46 | 52 | 47 | – | 47 | 51 | 51 | **49** |
| Margaret Okafor | 40 | 50 | 47 | 53 | – | 54 | 44 | **48** |
| Chef Gus Lamarre | 53 | 42 | 47 | 50 | 46 | – | 42 | **46** |
| Rev. Gideon Price | 59 | 45 | 53 | 50 | 56 | 58 | – | **53** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.9 to 13.2; 14 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 9.6 (6.2) | **12.5 (7.5)** | 10.2 (6.4) | **11.5 (6.3)** | **12.3 (7.3)** | **12.8 (7.2)** | 920 · 11.5 · 10.3 · 80 |
| Rox Vega | **7.9 (6.1)** | – | 8.8 (6.9) | 8.8 (7.5) | **7.9 (6.2)** | 8.2 (6.1) | 8.5 (6.6) | 850 · 8.4 · 9.2 · 111 |
| Hollis Bey | 9.6 (6.7) | 8.6 (6.5) | – | 8.5 (6.3) | 9.0 (6.3) | 9.6 (6.6) | 9.9 (7.0) | 1020 · 9.2 · 11.5 · 98 |
| Mister Mumbles | 9.1 (6.6) | 8.2 (6.2) | 10.6 (7.5) | – | 8.4 (6.2) | 9.1 (6.8) | 9.7 (7.0) | 870 · 9.2 · 9.6 · 101 |
| Margaret Okafor | 10.6 (4.7) | 8.7 (4.2) | **11.5 (5.1)** | 9.1 (4.6) | – | 10.6 (4.6) | 11.0 (4.3) | 860 · 10.2 · 9.9 · 91 |
| Chef Gus Lamarre | **11.7 (8.4)** | 9.5 (7.1) | **12.4 (9.3)** | 9.8 (7.3) | 10.6 (7.9) | – | **11.7 (8.6)** | 940 · 11.0 · 10.5 · 84 |
| Rev. Gideon Price | **13.1 (9.5)** | 10.5 (7.3) | **13.2 (8.8)** | 10.9 (7.6) | **12.2 (8.1)** | **13.2 (9.7)** | – | 960 · 12.2 · 10.6 · 75 |

### Comebacks

Of the rounds where someone fell under 30% health, 40.8% were won by someone who had (5029 of 12319). The loser of round 1 went on to win 27.0% of the matches (1322 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.2 (38) | 1.5 (43) | 0.4 (38) | 8.8 (45) | 29.6 (50) | 32.8 (52) | 71.5 (56) |
| Rox Vega | 0.2 (38) | – | 0.0 (36) | 0.0 (33) | 0.0 (32) | 0.2 (37) | 0.6 (39) | 0.0 (32) |
| Hollis Bey | 1.5 (43) | 0.0 (36) | – | 0.2 (35) | 0.0 (37) | 3.0 (44) | 5.1 (45) | 0.0 (38) |
| Mister Mumbles | 0.4 (38) | 0.0 (33) | 0.2 (35) | – | 0.0 (31) | 0.6 (38) | 2.2 (40) | 0.4 (36) |
| Margaret Okafor | 8.8 (45) | 0.0 (32) | 0.0 (37) | 0.0 (31) | – | 10.7 (44) | 11.9 (45) | 2.8 (40) |
| Chef Gus Lamarre | 29.6 (50) | 0.2 (37) | 3.0 (44) | 0.6 (38) | 10.7 (44) | – | 36.9 (52) | 11.8 (47) |
| Rev. Gideon Price | 32.8 (52) | 0.6 (39) | 5.1 (45) | 2.2 (40) | 11.9 (45) | 36.9 (52) | – | 59.4 (57) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.5 | 31.3 | 27.6 | 15.6 |
| Rox Vega | 61.3 | 29.4 | 8.8 | 0.5 |
| Hollis Bey | 35.6 | 45.4 | 17.7 | 1.2 |
| Mister Mumbles | 46.1 | 39.0 | 12.6 | 2.3 |
| Margaret Okafor | 27.2 | 41.7 | 26.7 | 4.4 |
| Chef Gus Lamarre | 21.9 | 36.7 | 36.2 | 5.2 |
| Rev. Gideon Price | 28.2 | 42.9 | 26.5 | 2.4 |

### Combos

198537 combos (a single hit counts as one). 1 hits 65.7%, 2 hits 12.4%, 3 hits 8.6%, 4 hits 4.0%, 5 hits 1.7%, 6–7 hits 2.1%, 8–9 hits 2.5%, 10+ hits 3.0%. Average 90 damage; 3.6% do 250 or more.

### Damage by source

normals 48.5% · air normals 2.0% · specials 20.3% · projectiles 10.7% · throws 8.2% · super 4.6% · chip 2.7% · props 3.1% · hazards 0.0%

### Mechanics, per round

boost 2.09 · tapeSkip 0.30 · jumpCancel 0.24 · relaunch 0.85 · cutAway 0.05 · flawless 3.61 · punish 2.39 · reversal 0.05 · delayedGetup 2.14 · ducked 0.76 · throw 2.51 · throwTech 1.33 · guardCrush 0.02 · counter (a read) 0.14 · counter hit 3.08 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 18% (5123/110) · Cold Front 15% (5344/14159) · Shin Poke 12% (6396/674) · Throw 5% (1229/0) · Cold Front (boosted) 5% (2025/1989)
- **Rox Vega:** Leg Warmer Lariat 20% (33858/763) · Count of Eight 8% (26946/534) · Wake-Up Jab 7% (7681/1289) · Throw 7% (2397/0) · Reps 7% (3736/411)
- **Hollis Bey:** Clocking In 15% (3251/0) · Key Ring 15% (6066/3092) · Night Shift 9% (2885/3697) · Throw 8% (1641/0) · Lights Out 6% (2176/23)
- **Mister Mumbles:** Punchline 10% (4057/73) · Under the Bed 9% (4203/29) · Ankle Biter 8% (5505/611) · Wooden Jab 8% (6138/2449) · Throw 8% (2776/0)
- **Margaret Okafor:** Anchor Kick 10% (5229/2439) · Lead Paragraph 9% (5600/176) · Breaking 9% (4220/174) · Low Bulletin 9% (6122/656) · Script Slash 7% (3391/561)
- **Chef Gus Lamarre:** Flambé 16% (15172/13023) · Chop Chop 12% (3945/1370) · Cleaver 10% (3427/3197) · Rolling Pin 8% (5426/533) · Skillet 8% (2896/2037)
- **Rev. Gideon Price:** Collection Plate 14% (11613/237) · Low Offering 9% (5454/1195) · Pulpit Kick 8% (2669/4486) · Hand Raised 6% (4509/808) · Throw 6% (1356/0)

## director

12496 rounds. Average round 40.9 s; 8.4% time out. The first hit wins the round 57.0% of the time. The furthest from even: Mumbles 64 over Vega, Storm 62 over Okafor, Storm 62 over Vega, Okafor 61 over Mumbles, Okafor 57 over Vega, Bey 57 over Vega.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 62 | 55 | 48 | 62 | 48 | 46 | **53** |
| Rox Vega | 39 | – | 44 | 37 | 43 | 48 | 50 | **43** |
| Hollis Bey | 45 | 57 | – | 46 | 45 | 48 | 45 | **48** |
| Mister Mumbles | 53 | 64 | 54 | – | 40 | 44 | 48 | **50** |
| Margaret Okafor | 38 | 57 | 55 | 61 | – | 52 | 54 | **53** |
| Chef Gus Lamarre | 53 | 52 | 52 | 56 | 49 | – | 46 | **51** |
| Rev. Gideon Price | 54 | 50 | 55 | 53 | 46 | 54 | – | **52** |

### Openings to win a round

The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is 8 to 11.5 for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run 7.3 to 12.9; 15 of 42 are outside the band.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Health · needs · gives · average opening |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 8.8 (5.9) | **11.9 (7.4)** | 9.6 (6.1) | 11.1 (6.1) | **11.7 (6.9)** | **12.3 (6.9)** | 920 · 10.9 · 9.9 · 85 |
| Rox Vega | **7.5 (5.9)** | – | 8.5 (6.6) | 8.4 (7.2) | **7.3 (5.7)** | **7.5 (5.9)** | **7.7 (6.1)** | 850 · 7.8 · 8.5 · 119 |
| Hollis Bey | 9.4 (6.4) | 8.0 (6.3) | – | 8.2 (6.4) | 8.7 (6.3) | 9.1 (6.5) | 9.6 (6.9) | 1020 · 8.8 · 10.9 · 102 |
| Mister Mumbles | 8.7 (6.4) | **7.8 (6.1)** | 10.2 (7.4) | – | **7.8 (6.1)** | 8.7 (6.6) | 9.1 (6.8) | 870 · 8.7 · 8.9 · 106 |
| Margaret Okafor | 9.9 (4.5) | **7.7 (4.0)** | 10.4 (4.7) | 8.3 (4.4) | – | 10.1 (4.3) | 10.1 (4.2) | 860 · 9.4 · 9.5 · 99 |
| Chef Gus Lamarre | 11.2 (8.2) | 8.7 (6.8) | **11.9 (9.0)** | 8.9 (7.0) | 10.2 (7.5) | – | 11.2 (8.0) | 940 · 10.3 · 10.0 · 89 |
| Rev. Gideon Price | **12.5 (8.9)** | 9.7 (6.9) | **12.5 (8.5)** | 10.3 (7.3) | **12.0 (8.0)** | **12.9 (9.2)** | – | 960 · 11.6 · 10.0 · 79 |

### Comebacks

Of the rounds where someone fell under 30% health, 42.3% were won by someone who had (5232 of 12370). The loser of round 1 went on to win 28.3% of the matches (1386 of 4899).

### Time-outs and round length by matchup

Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Mirror |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 0.0 (37) | 2.1 (42) | 0.6 (38) | 10.3 (45) | 33.6 (51) | 28.8 (51) | 70.7 (56) |
| Rox Vega | 0.0 (37) | – | 0.0 (36) | 0.2 (33) | 0.0 (31) | 0.4 (38) | 0.2 (39) | 0.0 (33) |
| Hollis Bey | 2.1 (42) | 0.0 (36) | – | 0.0 (37) | 0.4 (36) | 3.5 (43) | 3.9 (45) | 0.0 (38) |
| Mister Mumbles | 0.6 (38) | 0.2 (33) | 0.0 (37) | – | 0.0 (31) | 0.4 (38) | 0.6 (40) | 0.4 (34) |
| Margaret Okafor | 10.3 (45) | 0.0 (31) | 0.4 (36) | 0.0 (31) | – | 8.2 (44) | 7.5 (45) | 3.3 (40) |
| Chef Gus Lamarre | 33.6 (51) | 0.4 (38) | 3.5 (43) | 0.4 (38) | 8.2 (44) | – | 34.5 (52) | 9.9 (46) |
| Rev. Gideon Price | 28.8 (51) | 0.2 (39) | 3.9 (45) | 0.6 (40) | 7.5 (45) | 34.5 (52) | – | 57.7 (56) |

### Range

The share of each fighter's fighting time at each distance between the two (centre to centre): throw under 1 m, close under 1.8 m, mid under 3 m, far over 3 m.

| | throw | close | mid | far |
| --- | --- | --- | --- | --- |
| Dale Storm | 25.7 | 31.8 | 27.2 | 15.2 |
| Rox Vega | 62.2 | 28.9 | 8.4 | 0.5 |
| Hollis Bey | 35.7 | 45.4 | 17.6 | 1.3 |
| Mister Mumbles | 45.8 | 39.5 | 12.6 | 2.1 |
| Margaret Okafor | 27.3 | 42.3 | 26.1 | 4.2 |
| Chef Gus Lamarre | 22.0 | 37.7 | 35.2 | 5.1 |
| Rev. Gideon Price | 28.4 | 43.6 | 25.8 | 2.3 |

### Combos

191001 combos (a single hit counts as one). 1 hits 63.4%, 2 hits 12.2%, 3 hits 9.0%, 4 hits 4.6%, 5 hits 2.0%, 6–7 hits 2.3%, 8–9 hits 2.9%, 10+ hits 3.5%. Average 95 damage; 4.3% do 250 or more.

### Damage by source

normals 48.1% · air normals 1.9% · specials 20.5% · projectiles 10.3% · throws 9.1% · super 4.6% · chip 2.5% · props 3.0% · hazards 0.0%

### Mechanics, per round

boost 2.00 · tapeSkip 0.35 · jumpCancel 0.28 · relaunch 0.92 · cutAway 0.05 · flawless 3.46 · punish 2.47 · reversal 0.04 · delayedGetup 2.20 · ducked 1.15 · throw 2.86 · throwTech 1.53 · guardCrush 0.02 · counter (a read) 0.12 · counter hit 2.89 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 17% (5176/92) · Cold Front 14% (5254/14040) · Shin Poke 11% (6313/512) · Throw 6% (1506/0) · Isobar Lasso 5% (3806/4741)
- **Rox Vega:** Leg Warmer Lariat 21% (36635/780) · Throw 7% (2511/0) · Count of Eight 7% (26991/362) · Wake-Up Jab 7% (7899/981) · Reps 6% (3611/285)
- **Hollis Bey:** Key Ring 15% (6360/2738) · Clocking In 15% (3226/0) · Throw 9% (1929/0) · Night Shift 9% (2687/3499) · Lights Out 6% (2275/27)
- **Mister Mumbles:** Punchline 11% (4488/63) · Throw 10% (3303/0) · Under the Bed 9% (4360/18) · Wooden Jab 8% (6204/1810) · Hand Puppet 8% (4646/81)
- **Margaret Okafor:** Anchor Kick 10% (5771/2279) · Breaking 10% (4849/137) · Lead Paragraph 10% (6268/124) · Low Bulletin 8% (5584/530) · We Go Live 8% (5370/11)
- **Chef Gus Lamarre:** Flambé 16% (16052/12484) · Chop Chop 13% (4421/1359) · Cleaver 10% (3796/3044) · Rolling Pin 8% (5263/462) · Skillet 7% (2762/1931)
- **Rev. Gideon Price:** Collection Plate 13% (11086/245) · Low Offering 9% (5293/1137) · Pulpit Kick 8% (2771/4429) · Throw 6% (1550/0) · Altar Call 6% (3126/53)

## The first hit's worth

The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses none). The aim: the smallest bonus that keeps the average round inside 25 to 50 seconds (and the bench passing).

| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |
| --- | --- | --- | --- | --- | --- |
| 1 bar | 40.6 | 8.1% | 60.4% | 0.09 | Price 62 over Storm, Storm 59 over Bey, Mumbles 59 over Storm |
| 0.5 bar | 40.9 | 8.5% | 58.9% | 0.07 | Price 65 over Storm, Storm 64 over Vega, Storm 62 over Okafor |
| 0 bar | 41.0 | 8.8% | 57.2% | 0.05 | Storm 60 over Okafor, Price 59 over Storm, Vega 59 over Lamarre |

## Under LIVE BROADCAST rules

The hard bench again with the segments changing each round and the hazards on. 12388 rounds; average round 40.7 s; 7.9% time out; the first hit wins the round 58.4% of the time. Hazards did 2.4% of the damage and props 1.2% (props are in studio rules too: 3.1% there).

A matchup moves 4.2 points from its studio result on average; none moves further than 10. At 100 seeds a pair, a few points either way is noise.

### Win rates, live

As in studio rules, with the change from the studio result in brackets.

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 60 (+3) | 60 (+8) | 47 (-7) | 57 (-3) | 46 (-2) | 42 (+1) | **52** |
| Rox Vega | 40 (-3) | – | 44 (-7) | 51 (+2) | 43 (-7) | 51 (-7) | 50 (-5) | **46** |
| Hollis Bey | 41 (-8) | 56 (+7) | – | 49 (-4) | 52 (-1) | 46 (-7) | 52 (+5) | **49** |
| Mister Mumbles | 53 (+8) | 50 (-2) | 51 (+4) | – | 49 (+2) | 47 (-3) | 47 (-3) | **49** |
| Margaret Okafor | 43 (+3) | 57 (+7) | 48 (+2) | 51 (-2) | – | 52 (-2) | 46 (+2) | **49** |
| Chef Gus Lamarre | 55 (+2) | 49 (+8) | 55 (+8) | 53 (+4) | 48 (+2) | – | 38 (-4) | **49** |
| Rev. Gideon Price | 59 (0) | 50 (+6) | 48 (-4) | 53 (+4) | 55 (-1) | 63 (+5) | – | **54** |

### Damage by source, live

normals 48.3% · air normals 1.9% · specials 20.1% · projectiles 10.8% · throws 8.0% · super 4.8% · chip 2.6% · props 1.2% · hazards 2.4%

## The rarer mechanics by CPU level

Per round, at every CPU level (easy and normal over 30 seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.

| | easy | normal | hard | director |
| --- | --- | --- | --- | --- |
| counter hit (share of strikes) | 1.95 (7.3%) | 3.10 (10.0%) | 3.08 (9.5%) | 2.89 (8.7%) |
| reversal (tried) | 0.05 (0.11) | 0.09 (0.19) | 0.05 (0.11) | 0.04 (0.10) |
| guard crush (tried) | 0.00 (0.14) | 0.02 (0.19) | 0.02 (0.22) | 0.02 (0.24) |
| counter, a read (tried) | 0.02 (0.37) | 0.11 (0.47) | 0.14 (0.47) | 0.12 (0.43) |
| Cut Away | 0.18 | 0.12 | 0.05 | 0.05 |
| Technical Difficulties hit | 0.34 | 0.39 | 0.25 | 0.25 |
| punish | 1.45 | 1.74 | 2.39 | 2.47 |
| throw tech | 0.07 | 0.28 | 1.33 | 1.53 |
