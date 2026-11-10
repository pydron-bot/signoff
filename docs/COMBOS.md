# SIGN-OFF — best combos

Written by `npm run combos` (tests/combo-search.test.ts); do not edit by hand.

The most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against Rox Vega (1000 health), with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener still gives the whole combo 2 frames early or late, everything after it moved too, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: 33% with no meter, 42% with one bar, 52% with three.

| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |
| --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | 0 | frame-perfect | 6 | 28.2% | 1 | ↓BP › →BP › →BP BP › BP › BP FK › BP FK FK |
| Dale Storm | 0 | human | 4 | 23.6% | 26 | →BP › →BP BP › BK › Heat Lightning |
| Dale Storm | 1 | frame-perfect | 8 | 37.2% | 2 | →BP › →BP BP › ↓BP › BP › Isobar Lasso+ › ↓BP › BK › Heat Lightning |
| Dale Storm | 1 | human | 8 | 38.7% | 13 | →BP › →BP BP › BK › Isobar Lasso+ › ↓BP › BP › BP FK › Heat Lightning |
| Dale Storm | 3 | frame-perfect | 7 | 37.9% | 7 | →BP › →BP BP › ↓BP › BP › Isobar Lasso+ › BK › Cold Front+ |
| Dale Storm | 3 | human | 7 | 38.8% | 6 | ↓BP › Isobar Lasso+ › →BP › →BP BP › BP › Cold Front+ ×2 |
| Rox Vega | 0 | frame-perfect | 16 | 30.7% | 3 | ↓BP › →FK › →FK BK › FK › Leg Warmer Lariat ×2 › ↓BP › FP › Count of Eight ×8 |
| Rox Vega | 0 | human | 17 | 30.5% | 10 | ↓BP › FP › FK › FK FK › FK FK BP › Leg Warmer Lariat ×3 › BK ×2 › Count of Eight ×7 |
| Rox Vega | 1 | frame-perfect | 4 | 30.3% | 6 | ↓BP › Star Jump+ › j.BK › Aerobic Dive |
| Rox Vega | 1 | human | 17 | 38.2% | 9 | ↓BP › Star Jump+ › FK › FP › FP FP › Leg Warmer Lariat ×3 › BP › Count of Eight ×8 |
| Rox Vega | 3 | frame-perfect | 17 | 49.4% | 1 | ↓BP › Star Jump+ › j.BK › Aerobic Dive+ › FK › Leg Warmer Lariat ×3 › →FK › Count of Eight ×3 › Count of Eight+ ×5 |
| Rox Vega | 3 | human | 10 | 46.2% | 9 | ↓BP › Star Jump+ › j.BK › Aerobic Dive+ › ↓BP › FK › Leg Warmer Lariat ×3 › Count of Eight+ |
| Hollis Bey | 0 | frame-perfect | 4 | 24.4% | 3 | ↓BP › BP › BP FP › BP FP BK |
| Hollis Bey | 0 | human | 3 | 23.4% | 26 | ↓BP › BK › Night Shift |
| Hollis Bey | 1 | frame-perfect | 5 | 38.1% | 1 | ↓BP › BK › Key Ring+ › →BP › Night Shift |
| Hollis Bey | 1 | human | 5 | 37.4% | 9 | ↓BP › BK › Key Ring+ › BP › Night Shift |
| Hollis Bey | 3 | frame-perfect | 9 | 50.9% | 3 | ↓BP › BK › Night Shift+ › BP › BP FP › Flashlight+ › FK › Key Ring+ › ↓BK |
| Hollis Bey | 3 | human | 7 | 47.1% | 7 | ↓BP › BK › Key Ring+ › BP › BP FP › Night Shift+ › Flashlight+ |
| Mister Mumbles | 0 | frame-perfect | 5 | 29.4% | 1 | ↓BP › ←BP › BP › BP FK › Hand Puppet |
| Mister Mumbles | 0 | human | 6 | 26.0% | 8 | FK › FK FK › FK FK FK › BP › FK › Hand Puppet |
| Mister Mumbles | 1 | frame-perfect | 7 | 40.5% | 1 | ↓BP › Knock-Knock+ › BP › FK › FK FK › FK FK FK › FP |
| Mister Mumbles | 1 | human | 4 | 33.7% | 7 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet |
| Mister Mumbles | 3 | frame-perfect | 11 | 50.0% | 1 | ↓BP › Knock-Knock+ › FK › FK FK › FK FK FK › FP › Hand Puppet+ › ←BP › Hand Puppet+ › BP › BP FK |
| Mister Mumbles | 3 | human | 7 | 49.6% | 7 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet+ › BP › Hand Puppet+ › j.BK |
| Margaret Okafor | 0 | frame-perfect | 10 | 30.5% | 4 | →BP › Breaking › BP › BP BP › BP BP BK › BP › BP BP › BP BP BK › →FK › Breaking |
| Margaret Okafor | 0 | human | 7 | 30.3% | 12 | →BP › Breaking › BP › BP BP › BP BP BK › BK › Lead Story |
| Margaret Okafor | 1 | frame-perfect | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 1 | human | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 3 | frame-perfect | 11 | 47.5% | 1 | ↓BP › BK › Lead Story+ › →BP › Breaking+ › BP › BP BP › BP BP BK › Breaking+ › FP › FP FK |
| Margaret Okafor | 3 | human | 12 | 45.5% | 13 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking+ › BK › Breaking+ › FK |
| Chef Gus Lamarre | 0 | frame-perfect | 9 | 27.3% | 1 | Cleaver Toss › ↓BP › BK › Flambé ×2 › FP › FP FP › Flambé › Chop Chop |
| Chef Gus Lamarre | 0 | human | 7 | 23.9% | 7 | ↓BP › BK › Flambé ×2 › ↓FP › Flambé › BP |
| Chef Gus Lamarre | 1 | frame-perfect | 7 | 35.2% | 21 | ↓BP › BK › Chop Chop+ › →BP › Tenderise ×3 |
| Chef Gus Lamarre | 1 | human | 7 | 34.5% | 23 | ↓BP › BK › Chop Chop+ › BP › Tenderise ×3 |
| Chef Gus Lamarre | 3 | frame-perfect | 5 | 36.0% | 22 | ↓BP › BK › Chop Chop+ › →BP › Tenderise+ |
| Chef Gus Lamarre | 3 | human | 9 | 41.4% | 16 | ↓BP › BK › Chop Chop+ › FP › FP BP › Tenderise+ › BP › Chop Chop+ › BK |
| Rev. Gideon Price | 0 | frame-perfect | 7 | 29.0% | 7 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate ×2 |
| Rev. Gideon Price | 0 | human | 7 | 30.1% | 10 | BP › BP BP › BP BP BK › BK › Collection Plate ×2 › Fire and Brimstone (blessed) |
| Rev. Gideon Price | 1 | frame-perfect | 8 | 36.7% | 5 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate+ ×2 › Fire and Brimstone (blessed) |
| Rev. Gideon Price | 1 | human | 9 | 30.4% | 13 | BP › BP BP › BP BP BK › BK › Collection Plate ×2 › Collection Plate+ ×2 › FK |
| Rev. Gideon Price | 3 | frame-perfect | 8 | 36.7% | 5 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate+ ×2 › Fire and Brimstone (blessed) |
| Rev. Gideon Price | 3 | human | 9 | 30.4% | 13 | BP › BP BP › BP BP BK › BK › Collection Plate ×2 › Collection Plate+ ×2 › FK |
