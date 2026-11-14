# SIGN-OFF — best combos

Written by `npm run combos` (tests/combo-search.test.ts); do not edit by hand.

The most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against Rox Vega, measured as a share of 1000 health, with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener still gives the whole combo 2 frames early or late, everything after it moved too, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: 33% with no meter, 42% with one bar, 52% with three. The floor applies to the human routes: each bar spent, from none to one and from one to three, must add at least 4%.

| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |
| --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | 0 | frame-perfect | 8 | 30.9% | 1 | Low Pressure › ↓BP › →BP › →BP BP › ↓BP › BP › BP FK › BP FK FK |
| Dale Storm | 0 | human | 4 | 25.1% | 26 | →BP › →BP BP › BK › Heat Lightning |
| Dale Storm | 1 | frame-perfect | 9 | 41.4% | 1 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › ↓BP › BP › BP FK › Heat Lightning |
| Dale Storm | 1 | human | 7 | 38.8% | 7 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › BP › Heat Lightning |
| Dale Storm | 3 | frame-perfect | 12 | 47.1% | 1 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › ↓BP › BP › BP FK › Heat Lightning+ › BK › Heat Lightning+ › ↓BK |
| Dale Storm | 3 | human | 10 | 43.9% | 5 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › BP › Heat Lightning+ › BP › BP FK › Heat Lightning+ |
| Rox Vega | 0 | frame-perfect | 17 | 27.5% | 2 | j.BP › ↓BP › →FK › →FK BK › FK › FK FK › Leg Warmer Lariat ×2 › BK ×2 › Count of Eight ×7 |
| Rox Vega | 0 | human | 20 | 28.6% | 1 | j.BP › FK › FK FK › FK FK BP › Leg Warmer Lariat ×3 › FP › FP FP › BP ×2 › BP BP › Count of Eight ×8 |
| Rox Vega | 1 | frame-perfect | 16 | 39.1% | 3 | j.BP › ↓BP › Star Jump+ › j.BK › FP › FP FP › FP FP FK › Leg Warmer Lariat ×2 › BK ×2 › Count of Eight ×5 |
| Rox Vega | 1 | human | 10 | 33.6% | 9 | ↓BP › Star Jump+ › j.BP › j.BP FP › j.FK BK › FK › FK FK › Leg Warmer Lariat ×3 |
| Rox Vega | 3 | frame-perfect | 12 | 42.3% | 1 | ↓BP › Star Jump+ › j.BK › FP › FP FP › FP FP FK › Leg Warmer Lariat ×3 › FK › Count of Eight+ › Aerobic Dive+ |
| Rox Vega | 3 | human | 5 | 39.4% | 7 | ↓BP › Star Jump+ › Leg Warmer Lariat+ › j.BP › Aerobic Dive+ |
| Hollis Bey | 0 | frame-perfect | 5 | 27.0% | 2 | ↓BP ×2 › FK › FK FK › Night Shift |
| Hollis Bey | 0 | human | 5 | 26.9% | 7 | ↓BP ×2 › BP › BP FP › Night Shift |
| Hollis Bey | 1 | frame-perfect | 6 | 38.9% | 4 | ↓BP › BK › Key Ring+ › BP › BP FP › BP FP BK |
| Hollis Bey | 1 | human | 6 | 38.9% | 7 | ↓BP › BK › Key Ring+ › BP › BP FP › Night Shift |
| Hollis Bey | 3 | frame-perfect | 12 | 51.3% | 1 | ↓BP › BK › Key Ring+ › BP › BP FP › Night Shift+ › j.FK › j.FK BP › j.BP BK › Searchlight+ › FP › FK |
| Hollis Bey | 3 | human | 8 | 45.9% | 8 | ↓BP › BK › Key Ring+ › BP › BP FP › Flashlight+ › j.FK › Elbow Drop+ |
| Mister Mumbles | 0 | frame-perfect | 5 | 26.6% | 1 | ↓BP › ←BP › BP › BP FK › Hand Puppet |
| Mister Mumbles | 0 | human | 6 | 23.7% | 8 | FK › FK FK › FK FK FK › BP › FK › Hand Puppet |
| Mister Mumbles | 1 | frame-perfect | 8 | 38.5% | 1 | ↓BP › Knock-Knock+ › j.FP › j.BP › j.BP FK › BP › BP FK › Hand Puppet |
| Mister Mumbles | 1 | human | 8 | 38.5% | 9 | ↓BP › Knock-Knock+ › j.FP › j.BP › j.BP FK › BP › BP FK › Hand Puppet |
| Mister Mumbles | 3 | frame-perfect | 13 | 47.2% | 1 | ↓BP › Knock-Knock+ › j.FP › j.BP › j.BP FK › BP › BP FK › Hand Puppet+ › FP › FP FP › Hand Puppet+ › ↓BP › FK |
| Mister Mumbles | 3 | human | 8 | 47.9% | 6 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet+ › j.BP › j.BP FK › Cut the Strings+ › j.BK |
| Margaret Okafor | 0 | frame-perfect | 11 | 31.5% | 4 | j.BK › Cut to Commercial › ↓BP › BP › BP BP › BP BP BK › ↓BP › FP › FP FP › Breaking › Breaking BK |
| Margaret Okafor | 0 | human | 10 | 31.1% | 8 | j.BK › Cut to Commercial › Breaking › BP › BP BP › BP BP BK › BP › BP BP › BP BP BK › BK |
| Margaret Okafor | 1 | frame-perfect | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 1 | human | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 3 | frame-perfect | 13 | 46.1% | 2 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › ↓BP › FK › Breaking+ › BK › Breaking+ › FP › FP FP › Breaking |
| Margaret Okafor | 3 | human | 11 | 45.5% | 5 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › FK › Breaking+ › BK › Breaking+ › ↓BP › j.FK |
| Chef Gus Lamarre | 0 | frame-perfect | 9 | 29.3% | 1 | j.BP › j.BP BK › ↓BP › BK › Flambé ×2 › FK › Flambé › Chop Chop |
| Chef Gus Lamarre | 0 | human | 7 | 26.6% | 5 | j.BP › j.BP BK › ↓BP › BK › Tenderise ×3 |
| Chef Gus Lamarre | 1 | frame-perfect | 7 | 35.7% | 21 | ↓BP › BK › Chop Chop+ › →BP › Tenderise ×3 |
| Chef Gus Lamarre | 1 | human | 7 | 35.0% | 23 | ↓BP › BK › Chop Chop+ › BP › Tenderise ×3 |
| Chef Gus Lamarre | 3 | frame-perfect | 10 | 43.6% | 1 | ↓BP › BK › Chop Chop+ › FK › FK FP › Tenderise+ › j.FP › Belly Flop+ › FP › FP BP |
| Chef Gus Lamarre | 3 | human | 9 | 41.9% | 16 | ↓BP › BK › Chop Chop+ › FP › FP BP › Tenderise+ › BP › Chop Chop+ › BK |
| Rev. Gideon Price | 0 | frame-perfect | 6 | 29.6% | 19 | ↓BP › BP › BP BP › BP BP BK › BK › Begone |
| Rev. Gideon Price | 0 | human | 6 | 29.6% | 19 | ↓BP › BP › BP BP › BP BP BK › BK › Begone |
| Rev. Gideon Price | 1 | frame-perfect | 8 | 39.5% | 1 | ↓BP › BK › Fire and Brimstone+ › BP › BP BP › BP BP BK › Laying On of Hands › Laying On of Hands BK |
| Rev. Gideon Price | 1 | human | 6 | 35.4% | 7 | ↓BP › Fire and Brimstone+ › BP › BP BP › BP BP BK › FK |
| Rev. Gideon Price | 3 | frame-perfect | 11 | 47.6% | 1 | ↓BP › BK › Fire and Brimstone+ › BP › BP BP › BP BP BK › FK › Laying On of Hands+ › FP › Laying On of Hands+ › Begone |
| Rev. Gideon Price | 3 | human | 6 | 47.0% | 7 | ↓BP › Fire and Brimstone+ › Rapture+ › BK › Laying On of Hands+ › j.FK |
