# SIGN-OFF — matchups

Written by `npm run matchups` (tests/matchups.test.ts); do not edit by hand.

The CPU against itself: every ordered pair of fighters, 20 seeds each, studio rules (one segment, no hazards), the stages in turn. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than 30:70, an average round outside 25 to 50 seconds, or more than 10% of rounds timing out.

## hard

2410 rounds. Average round 39.3 s; 2.4% time out. The first hit wins the round 59.2% of the time.

### Win rates

The row fighter's share of the matches against the column, both sides counted (40 matches a pair).

| | Storm | Vega | Bey | Mumbles | Okafor | Lamarre | Price | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | – | 38 | 45 | 50 | 80 | 55 | 8 | **46** |
| Rox Vega | 63 | – | 83 | 50 | 40 | 78 | 30 | **57** |
| Hollis Bey | 55 | 18 | – | 43 | 70 | 33 | 30 | **41** |
| Mister Mumbles | 50 | 50 | 58 | – | 45 | 65 | 25 | **49** |
| Margaret Okafor | 20 | 60 | 30 | 55 | – | 8 | 3 | **29** |
| Chef Gus Lamarre | 45 | 23 | 68 | 35 | 93 | – | 45 | **51** |
| Rev. Gideon Price | 93 | 70 | 70 | 75 | 98 | 55 | – | **77** |

### Combos

48311 combos (a single hit counts as one). 1 hits 68.7%, 2 hits 19.0%, 3 hits 6.8%, 4 hits 2.5%, 5 hits 1.0%, 6–7 hits 0.9%, 8–9 hits 1.0%, 10+ hits 0.1%. Average 78 damage; 1.5% do 250 or more.

### Damage by source

normals 43.1% · air normals 1.5% · specials 21.8% · projectiles 19.4% · throws 6.7% · super 6.1% · chip 1.5%

### Mechanics, per round

boost 4.20 · tapeSkip 0.00 · jumpCancel 0.00 · relaunch 0.36 · cutAway 0.04 · flawless 3.22 · punish 2.27 · reversal 0.10 · delayedGetup 1.94 · ducked 0.32 · throw 1.60 · throwTech 0.68 · guardCrush 0.04 · counter 0.16 · superHit 0.34

### What each fighter lands

Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over 35% is marked: the fighter may be one move.

- **Dale Storm:** Cold Front 15% (1798/857) · Heat Lightning 10% (642/21) · Cold Front (boosted) 6% (840/138) · Pressure Drop 6% (449/111) · Isobar Lasso 6% (764/1230)
- **Rox Vega:** Count of Eight 8% (3115/171) · Reps 7% (884/163) · Warm-Up 7% (1105/147) · Toe Tap 6% (848/67) · Technical Difficulties 6% (118/60)
- **Hollis Bey:** Clocking In 17% (799/0) · Key Ring 14% (1215/4) · Night Shift 14% (926/293) · Technical Difficulties 7% (130/51) · Clocking In (boosted) 5% (167/0)
- **Mister Mumbles:** Head Bonk 8% (551/281) · Ha-Ha 8% (1147/112) · Clatter 7% (760/86) · Tap Dance 7% (813/54) · Technical Difficulties 7% (128/75)
- **Margaret Okafor:** Technical Difficulties 8% (140/56) · Field Report 8% (741/361) · Pointed Shoe 8% (795/278) · Anchor Kick 7% (493/712) · Low Bulletin 7% (956/66)
- **Chef Gus Lamarre:** Flambé 21% (4426/5) · Mise en Place 10% (870/1313) · Flambé (boosted) 9% (2283/1) · Cleaver 7% (536/645) · Skillet 6% (510/383)
- **Rev. Gideon Price:** Collection Plate 30% (5229/749) · Collection Plate (boosted) 17% (2116/142) · Pulpit Kick 8% (619/573) · Fire and Brimstone (blessed) 6% (325/356) · Technical Difficulties 5% (96/44)
