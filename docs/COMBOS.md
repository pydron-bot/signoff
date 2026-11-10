# SIGN-OFF — best combos

Written by `npm run combos` (tests/combo-search.test.ts); do not edit by hand.

The most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against Rox Vega, measured as a share of 1000 health, with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener still gives the whole combo 2 frames early or late, everything after it moved too, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: 33% with no meter, 42% with one bar, 52% with three. The floor applies to the human routes: each bar spent, from none to one and from one to three, must add at least 4%.

| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |
| --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | 0 | frame-perfect | 9 | 32.0% | 1 | →BP › →BP BP › BK › Isobar Lasso › Isobar Lasso BP › ↓BP › FP › FP BP › Heat Lightning |
| Dale Storm | 0 | human | 8 | 31.0% | 16 | →BP › →BP BP › BK › Isobar Lasso › Isobar Lasso BP › BP › BP FK › Heat Lightning |
| Dale Storm | 1 | frame-perfect | 9 | 39.5% | 1 | →BP › →BP BP › ↓BP › BK › Heat Lightning+ › BP › BP FK › BP FK FK › Heat Lightning |
| Dale Storm | 1 | human | 7 | 38.0% | 7 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › BP › Heat Lightning |
| Dale Storm | 3 | frame-perfect | 13 | 48.5% | 1 | ↓BP › BK › Isobar Lasso+ › →BP › →BP BP › BP › BP FK › Heat Lightning+ › FK › Heat Lightning+ › ↓BP › FP › Heat Lightning |
| Dale Storm | 3 | human | 9 | 45.3% | 5 | ↓BP › BK › Isobar Lasso+ › →BP › →BP BP › Heat Lightning+ › BP › BP FK › Heat Lightning+ |
| Rox Vega | 0 | frame-perfect | 17 | 31.4% | 1 | ↓BP › →FK › →FK BK › →BP › ↓FK › Leg Warmer Lariat ×3 › FK › Count of Eight ×8 |
| Rox Vega | 0 | human | 17 | 30.0% | 10 | ↓BP › FP › FK › FK FK › FK FK BP › Leg Warmer Lariat ×3 › BK ×2 › Count of Eight ×7 |
| Rox Vega | 1 | frame-perfect | 16 | 39.4% | 5 | ↓BP › Star Jump+ › j.FP › j.FK › j.FK BK › FP › FP FP › FP FP FK › Count of Eight ×8 |
| Rox Vega | 1 | human | 16 | 39.4% | 9 | ↓BP › Star Jump+ › j.FP › j.FK › j.FK BK › FP › FP FP › FP FP FK › Count of Eight ×8 |
| Rox Vega | 3 | frame-perfect | 17 | 51.1% | 2 | ↓BP › Star Jump+ › j.BK › Aerobic Dive+ › j.FP › j.FK › j.FK BK › FP › Leg Warmer Lariat+ › →BP › Count of Eight ×7 |
| Rox Vega | 3 | human | 17 | 49.8% | 6 | ↓BP › Star Jump+ › j.BK › Aerobic Dive+ › j.FP › j.FK › j.FK BK › FP › FP FP › Count of Eight ×2 › Count of Eight+ ×6 |
| Hollis Bey | 0 | frame-perfect | 7 | 29.5% | 1 | ↓BP ×2 › BK › Key Ring › Key Ring BP › ↓FP › ↓FP FK |
| Hollis Bey | 0 | human | 6 | 28.3% | 18 | BK › Key Ring › Key Ring BP › FK › FK FK › Night Shift |
| Hollis Bey | 1 | frame-perfect | 7 | 39.3% | 1 | ↓BP › BK › Night Shift+ › BP › Key Ring › Key Ring BP › ↓FP |
| Hollis Bey | 1 | human | 5 | 37.4% | 9 | ↓BP › BK › Key Ring+ › BP › Night Shift |
| Hollis Bey | 3 | frame-perfect | 9 | 51.7% | 1 | ↓BP › BK › Night Shift+ › BP › BP FP › Flashlight+ › j.BK › Elbow Drop+ › ↓BK |
| Hollis Bey | 3 | human | 8 | 47.7% | 9 | ↓BP › BK › Night Shift+ › j.BP › j.BP BK › BP › Key Ring+ › Flashlight+ |
| Mister Mumbles | 0 | frame-perfect | 5 | 29.4% | 1 | ↓BP › ←BP › BP › BP FK › Hand Puppet |
| Mister Mumbles | 0 | human | 6 | 26.0% | 8 | FK › FK FK › FK FK FK › BP › FK › Hand Puppet |
| Mister Mumbles | 1 | frame-perfect | 7 | 40.5% | 1 | ↓BP › Knock-Knock+ › BP › FK › FK FK › FK FK FK › FP |
| Mister Mumbles | 1 | human | 7 | 39.0% | 4 | ↓BP › Knock-Knock+ › j.FK › j.BK › Puppet Drop › FP › FP FP |
| Mister Mumbles | 3 | frame-perfect | 9 | 49.8% | 1 | ↓BP › Knock-Knock+ › BP › FK › FK FK › Hand Puppet+ › ←BP › Hand Puppet+ › j.BK |
| Mister Mumbles | 3 | human | 8 | 50.9% | 6 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet+ › j.BP › j.BP FK › Cut the Strings+ › j.FK |
| Margaret Okafor | 0 | frame-perfect | 12 | 32.3% | 3 | →BP › Breaking › BP › BP BP › BP BP BK › BK › Breaking › Breaking BK › →FK › Breaking › Breaking BK › FK |
| Margaret Okafor | 0 | human | 7 | 30.3% | 12 | →BP › Breaking › BP › BP BP › BP BP BK › BK › Lead Story |
| Margaret Okafor | 1 | frame-perfect | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 1 | human | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 3 | frame-perfect | 13 | 43.3% | 1 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › Breaking › Breaking BK › FP › FP FP › Breaking+ › BK › Breaking+ › On the Wire |
| Margaret Okafor | 3 | human | 12 | 45.5% | 13 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking+ › BK › Breaking+ › FK |
| Chef Gus Lamarre | 0 | frame-perfect | 11 | 29.3% | 1 | Cleaver Toss › ↓BP › BK › Flambé › Flambé BP › FP › FP FP › Flambé › BP › Flambé › BP BK |
| Chef Gus Lamarre | 0 | human | 7 | 23.9% | 7 | ↓BP › BK › Flambé ×2 › ↓FP › Flambé › BP |
| Chef Gus Lamarre | 1 | frame-perfect | 10 | 37.1% | 8 | ↓BP › BK › Chop Chop+ › BP › Flambé › Flambé BP › Flambé › FP FP › Flambé › FP FP BK |
| Chef Gus Lamarre | 1 | human | 7 | 35.0% | 23 | ↓BP › BK › Chop Chop+ › BP › Tenderise ×3 |
| Chef Gus Lamarre | 3 | frame-perfect | 10 | 38.1% | 12 | ↓BP › BK › Chop Chop+ › BP › Flambé › Flambé BP › Flambé › FP FP › Flambé › Tenderise+ |
| Chef Gus Lamarre | 3 | human | 9 | 41.9% | 16 | ↓BP › BK › Chop Chop+ › FP › FP BP › Tenderise+ › BP › Chop Chop+ › BK |
| Rev. Gideon Price | 0 | frame-perfect | 8 | 30.0% | 3 | BP › BP BP › BP BP BK › BK › Laying On of Hands › Laying On of Hands BK › FK › FK BK |
| Rev. Gideon Price | 0 | human | 8 | 29.7% | 17 | ↓BP › BP › BP BP › BP BP BK › Laying On of Hands › Laying On of Hands BK › FK › FK BK |
| Rev. Gideon Price | 1 | frame-perfect | 8 | 39.5% | 1 | ↓BP › BK › Fire and Brimstone+ › BP › BP BP › BP BP BK › Laying On of Hands › Laying On of Hands BK |
| Rev. Gideon Price | 1 | human | 6 | 35.4% | 7 | ↓BP › Fire and Brimstone+ › BP › BP BP › BP BP BK › FK |
| Rev. Gideon Price | 3 | frame-perfect | 10 | 48.3% | 1 | ↓BP › BK › Fire and Brimstone+ › BP › BP BP › BP BP BK › FK › Laying On of Hands+ › Begone+ › →BP |
| Rev. Gideon Price | 3 | human | 6 | 43.9% | 8 | ↓BP › Fire and Brimstone+ › BP › BP BP › Laying On of Hands+ › Rapture+ |
