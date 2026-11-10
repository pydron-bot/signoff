# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 100 seeds each, studio rules (one segment, no hazards), the stages in turn. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 30:70, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

12171 rounds. Average round 39.3 s; 5.4% time out. The first hit wins the round 57.8% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 7 | 22 | 23 | 44 | 36 | 22 | **25** |
| Rox Vega | 94 | – | 87 | 44 | 52 | 91 | 73 | **73** |
| Hollis Bey | 79 | 13 | – | 13 | 49 | 50 | 60 | **44** |
| Mister Mumbles | 78 | 56 | 88 | – | 49 | 80 | 63 | **69** |
| Margaret Okafor | 57 | 49 | 52 | 51 | – | 29 | 30 | **44** |
| Chef Gus Lamarre | 65 | 10 | 51 | 20 | 71 | – | 60 | **46** |
| Rev. Gideon Price | 78 | 27 | 40 | 38 | 70 | 40 | – | **49** |

### Combos

193656 combos (a single hit counts as one). 1 hits 64.7%, 2 hits 13.7%, 3 hits 8.1%, 4 hits 5.0%, 5 hits 2.1%, 6–7 hits 2.0%, 8–9 hits 1.8%, 10+ hits 2.7%. Average 94 damage; 4.8% do 250 or more.

### Damage by source

normals 47.7% · air normals 1.8% · specials 23.7% · projectiles 12.2% · throws 7.9% · super 4.8% · chip 2.0%

### Mechanics, per round

boost 2.88 · tapeSkip 0.38 · jumpCancel 0.26 · relaunch 0.83 · cutAway 0.09 · flawless 3.81 · punish 2.38 · reversal 0.06 · delayedGetup 2.00 · ducked 0.47 · throw 2.41 · throwTech 1.30 · guardCrush 0.02 · counter 0.13 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 20% (5326/135) · Cold Front 13% (5174/12923) · Shin Poke 10% (5294/589) · Cold Front (boosted) 6% (2693/2649) · Throw 5% (1071/0)
- **Rox Vega:** Leg Warmer Lariat 20% (29069/542) · Throw 8% (2103/0) · Wake-Up Jab 7% (7495/1045) · Count of Eight 7% (22810/362) · Toe Tap 6% (4402/648)
- **Hollis Bey:** Key Ring 14% (5585/2704) · Clocking In 10% (2209/0) · Night Shift 8% (2374/3299) · Throw 8% (1552/0) · Lights Out 7% (2578/15)
- **Mister Mumbles:** Under the Bed 10% (4399/39) · Throw 9% (3064/0) · Punchline 9% (3573/67) · Ankle Biter 9% (5682/523) · Hand Puppet 8% (4458/82)
- **Margaret Okafor:** Lead Paragraph 10% (6236/234) · Breaking 9% (4263/167) · Anchor Kick 8% (4990/3130) · Low Bulletin 8% (5936/648) · We Go Live 7% (5210/24)
- **Chef Gus Lamarre:** Flambé 15% (16466/11048) · Tenderise 11% (8657/544) · Mise en Place 9% (3564/3515) · Skillet 9% (3791/2138) · Cleaver 8% (2607/3668)
- **Rev. Gideon Price:** Collection Plate 16% (12722/179) · Pulpit Kick 8% (2785/4477) · Low Offering 7% (5198/963) · Hand Raised 6% (4596/582) · Collection Plate (boosted) 5% (3017/67)

## director

12164 rounds. Average round 39.3 s; 5.1% time out. The first hit wins the round 58.3% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (200 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 8 | 25 | 21 | 41 | 35 | 21 | **25** |
| Rox Vega | 93 | – | 88 | 46 | 56 | 88 | 75 | **74** |
| Hollis Bey | 76 | 13 | – | 17 | 51 | 42 | 57 | **42** |
| Mister Mumbles | 80 | 55 | 83 | – | 45 | 81 | 59 | **67** |
| Margaret Okafor | 59 | 45 | 50 | 56 | – | 33 | 29 | **45** |
| Chef Gus Lamarre | 65 | 12 | 58 | 20 | 67 | – | 61 | **47** |
| Rev. Gideon Price | 79 | 25 | 43 | 41 | 71 | 39 | – | **50** |

### Combos

186691 combos (a single hit counts as one). 1 hits 63.3%, 2 hits 13.4%, 3 hits 8.1%, 4 hits 5.5%, 5 hits 2.4%, 6–7 hits 2.2%, 8–9 hits 2.0%, 10+ hits 3.1%. Average 98 damage; 5.5% do 250 or more.

### Damage by source

normals 46.1% · air normals 2.0% · specials 24.1% · projectiles 11.8% · throws 9.5% · super 4.7% · chip 1.8%

### Mechanics, per round

boost 2.78 · tapeSkip 0.42 · jumpCancel 0.32 · relaunch 0.90 · cutAway 0.10 · flawless 3.67 · punish 2.35 · reversal 0.06 · delayedGetup 2.10 · ducked 0.39 · throw 3.13 · throwTech 1.77 · guardCrush 0.02 · counter 0.12 · superHit 0.25

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Heat Lightning 19% (5419/93) · Cold Front 12% (5134/13048) · Shin Poke 10% (5235/539) · Throw 6% (1407/0) · Cold Front (boosted) 5% (2528/2644)
- **Rox Vega:** Leg Warmer Lariat 21% (30939/621) · Throw 11% (2832/0) · Wake-Up Jab 7% (7341/776) · Count of Eight 6% (23129/262) · Reps 5% (3527/185)
- **Hollis Bey:** Key Ring 14% (5592/2595) · Throw 10% (2020/0) · Clocking In 9% (1954/0) · Night Shift 8% (2462/3352) · Lights Out 7% (2691/11)
- **Mister Mumbles:** Throw 12% (3944/0) · Under the Bed 10% (4393/27) · Punchline 9% (3672/66) · Hand Puppet 8% (4610/71) · Ankle Biter 8% (5032/383)
- **Margaret Okafor:** Lead Paragraph 10% (6765/167) · Breaking 9% (4737/119) · Anchor Kick 8% (5305/2759) · We Go Live 8% (5756/23) · Developing Story 7% (6362/17)
- **Chef Gus Lamarre:** Flambé 16% (17413/10319) · Tenderise 11% (9347/469) · Skillet 9% (3984/2026) · Cleaver 8% (2677/3351) · Mise en Place 8% (3251/3079)
- **Rev. Gideon Price:** Collection Plate 16% (12479/204) · Pulpit Kick 8% (2881/4368) · Low Offering 7% (4908/928) · Throw 7% (1662/0) · Technical Difficulties 5% (493/259)
