# SIGN-OFF — best combos

Written by `npm run combos` (tests/combo-search.test.ts); do not edit by hand.

The most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against Rox Vega (1000 health), with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener must also give the same hit 2 frames early and 2 late, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: 33% with no meter, 42% with one bar, 52% with three.

| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |
| --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | 0 | frame-perfect | 6 | 28.2% | 2 | ↓BP › →BP › →BP BP › BP › BP FK › BP FK FK |
| Dale Storm | 0 | human | 5 | 27.8% | 4 | →BP › →BP BP › ↓BP › BK › Heat Lightning |
| Dale Storm | 1 | frame-perfect | 7 | 32.8% | 2 | →BP › →BP BP › ↓BP › BP › BP FK › Cold Front+ ×2 |
| Dale Storm | 1 | human | 5 | 29.7% | 5 | →BP › →BP BP › ↓BP › BK › Cold Front+ |
| Dale Storm | 3 | frame-perfect | 7 | 39.4% | 1 | ↓BP › Isobar Lasso+ › →BP › →BP BP › BK › Cold Front+ ×2 |
| Dale Storm | 3 | human | 7 | 38.2% | 2 | ↓BP › Isobar Lasso+ › →BP › →BP BP › FK › Cold Front+ ×2 |
| Rox Vega | 0 | frame-perfect | 11 | 30.6% | 2 | ↓BP › →FK › →FK BK › BP › BP BP › Leg Warmer Lariat ×3 › FP › FP FP › FP FP FK |
| Rox Vega | 0 | human | 17 | 32.7% | 5 | ↓BP › →FK › →FK BK › BP › BP BP › Leg Warmer Lariat ×3 › FP FP › Count of Eight ×8 |
| Rox Vega | 1 | frame-perfect | 17 | 41.2% | 1 | ↓BP › Star Jump+ › →FK › →FK BK › BP › BP BP › Leg Warmer Lariat ×3 › FP FP › Count of Eight ×7 |
| Rox Vega | 1 | human | 14 | 40.3% | 3 | ↓BP › Star Jump+ › →FK › →FK BK › BP › BP BP › Leg Warmer Lariat ×3 › BK ×2 › Count of Eight ×3 |
| Rox Vega | 3 | frame-perfect | 17 | 41.2% | 1 | ↓BP › Star Jump+ › →FK › →FK BK › BP › BP BP › Leg Warmer Lariat ×3 › FP FP › Count of Eight ×7 |
| Rox Vega | 3 | human | 14 | 40.3% | 3 | ↓BP › Star Jump+ › →FK › →FK BK › BP › BP BP › Leg Warmer Lariat ×3 › BK ×2 › Count of Eight ×3 |
| Hollis Bey | 0 | frame-perfect | 4 | 24.4% | 3 | ↓BP › BP › BP FP › BP FP BK |
| Hollis Bey | 0 | human | 5 | 26.9% | 7 | ↓BP ×2 › BP › BP FP › Night Shift |
| Hollis Bey | 1 | frame-perfect | 5 | 38.1% | 1 | ↓BP › BK › Key Ring+ › →BP › Night Shift |
| Hollis Bey | 1 | human | 6 | 39.3% | 4 | ↓BP › BK › Key Ring+ › BP › BP FP › BP FP BK |
| Hollis Bey | 3 | frame-perfect | 9 | 50.7% | 1 | ↓BP › BK › Night Shift+ › BP › BP FP › Flashlight+ › FK › Key Ring+ › ↓BK |
| Hollis Bey | 3 | human | 7 | 49.1% | 5 | ↓BP › BK › Night Shift+ › →BP › Flashlight+ › BK › Key Ring+ |
| Mister Mumbles | 0 | frame-perfect | 6 | 29.1% | 4 | ↓BP › ←BP › FP › FP FP › FP FP FP › FP FP FP BK |
| Mister Mumbles | 0 | human | 6 | 29.1% | 6 | ↓BP › ←BP › FP › FP FP › FP FP FP › FP FP FP BK |
| Mister Mumbles | 1 | frame-perfect | 9 | 39.9% | 1 | ↓BP › ←BP › FK › FK FK › FK FK FK › Hand Puppet+ › BP › BP FK › Hand Puppet |
| Mister Mumbles | 1 | human | 10 | 38.5% | 2 | ↓BP › ←BP › FK › Hand Puppet+ › ↓BP ×2 › FP › FP FP › FP FP FP › Hand Puppet |
| Mister Mumbles | 3 | frame-perfect | 12 | 51.1% | 2 | ↓BP › Knock-Knock+ › ←BP › FP › FP FP › FP FP FP › Hand Puppet+ › ↓BP › BP › Hand Puppet+ › BP › BP FK |
| Mister Mumbles | 3 | human | 7 | 51.1% | 6 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet+ › Strings Attached+ › BP › Hand Puppet |
| Margaret Okafor | 0 | frame-perfect | 8 | 31.0% | 2 | →BP › Breaking › ↓BP › BP › BP BP › BP BP BK › FK › FK BK |
| Margaret Okafor | 0 | human | 10 | 30.5% | 4 | →BP › Breaking › BP › BP BP › BP BP BK › BP › BP BP › BP BP BK › →FK › Breaking |
| Margaret Okafor | 1 | frame-perfect | 9 | 39.4% | 3 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 1 | human | 7 | 38.4% | 5 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › BK › Breaking |
| Margaret Okafor | 3 | frame-perfect | 13 | 46.1% | 1 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › ↓BP › FK › Breaking+ › BK › Breaking+ › FP › FP FP › Breaking |
| Margaret Okafor | 3 | human | 12 | 45.1% | 3 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › ↓BP › FP › Breaking+ › BK › Breaking+ › ↓BP › FK |
| Chef Gus Lamarre | 0 | frame-perfect | 7 | 26.1% | 2 | ↓BP › →BP › Flambé ×2 › BP › Flambé › BP BK |
| Chef Gus Lamarre | 0 | human | 7 | 26.0% | 1 | ↓BP › BK › Flambé ×2 › ←BP › Flambé › Chop Chop |
| Chef Gus Lamarre | 1 | frame-perfect | 7 | 35.2% | 3 | ↓BP › BK › Chop Chop+ › →BP › Tenderise ×3 |
| Chef Gus Lamarre | 1 | human | 5 | 31.1% | 6 | ↓BP › BK › Tenderise+ › BP › BP BK |
| Chef Gus Lamarre | 3 | frame-perfect | 5 | 36.0% | 2 | ↓BP › BK › Chop Chop+ › →BP › Tenderise+ |
| Chef Gus Lamarre | 3 | human | 5 | 31.9% | 1 | ↓BP › BP › Tenderise+ › →BP › Flambé+ |
| Rev. Gideon Price | 0 | frame-perfect | 7 | 29.0% | 6 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate ×2 |
| Rev. Gideon Price | 0 | human | 7 | 30.1% | 10 | BP › BP BP › BP BP BK › BK › Collection Plate ×2 › Fire and Brimstone (blessed) |
| Rev. Gideon Price | 1 | frame-perfect | 8 | 36.7% | 1 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate+ ×2 › Fire and Brimstone (blessed) |
| Rev. Gideon Price | 1 | human | 8 | 34.7% | 3 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate+ ×2 › FK |
| Rev. Gideon Price | 3 | frame-perfect | 8 | 36.7% | 1 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate+ ×2 › Fire and Brimstone (blessed) |
| Rev. Gideon Price | 3 | human | 8 | 35.4% | 3 | BP › BP BP › BP BP BK › ↓BP › BK › Collection Plate+ ×3 |
