# SIGN-OFF — best combos

Written by `npm run combos` (tests/combo-search.test.ts); do not edit by hand.

The most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against Rox Vega, measured as a share of 1000 health, with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener still gives the whole combo 2 frames early or late, everything after it moved too, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: 33% with no meter, 42% with one bar, 52% with three. The floor applies to the human routes: each bar spent, from none to one and from one to three, must add at least 4%.

| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |
| --- | --- | --- | --- | --- | --- | --- |
| Dale Storm | 0 | frame-perfect | 7 | 30.0% | 1 | Low Pressure › ↓BP › →BP › →BP BP › BP › BP FK › BP FK FK |
| Dale Storm | 0 | human | 4 | 25.1% | 26 | →BP › →BP BP › BK › Heat Lightning |
| Dale Storm | 1 | frame-perfect | 9 | 41.4% | 1 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › ↓BP › BP › BP FK › Heat Lightning |
| Dale Storm | 1 | human | 7 | 38.8% | 7 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › BP › Heat Lightning |
| Dale Storm | 3 | frame-perfect | 12 | 47.1% | 1 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › ↓BP › BP › BP FK › Heat Lightning+ › BK › Heat Lightning+ › ↓BK |
| Dale Storm | 3 | human | 10 | 43.9% | 5 | ↓BP › BK › Heat Lightning+ › →BP › →BP BP › BP › Heat Lightning+ › BP › BP FK › Heat Lightning+ |
| Rox Vega | 0 | frame-perfect | 17 | 33.0% | 1 | j.BP › ↓BP › →FK › →FK BK › →BP › ↓FK › Leg Warmer Lariat ×2 › FK › Count of Eight ×8 |
| Rox Vega | 0 | human | 17 | 30.0% | 10 | ↓BP › FP › FK › FK FK › FK FK BP › Leg Warmer Lariat ×3 › BK ×2 › Count of Eight ×7 |
| Rox Vega | 1 | frame-perfect | 14 | 38.7% | 3 | ↓BP › Star Jump+ › →FK › →FK BK › FK › FK FK › Leg Warmer Lariat ×2 › BK ×2 › Count of Eight ×4 |
| Rox Vega | 1 | human | 10 | 36.2% | 7 | ↓BP › Star Jump+ › →FK › →FK BK › FK › Leg Warmer Lariat ×3 › BK ×2 |
| Rox Vega | 3 | frame-perfect | 13 | 50.7% | 2 | ↓BP › Star Jump+ › j.BK › Splits Drop+ › →FK › →FK BK › →BP › Leg Warmer Lariat ×2 › BK ×2 › Count of Eight+ › Aerobic Dive |
| Rox Vega | 3 | human | 13 | 49.7% | 3 | ↓BP › Star Jump+ › j.BK › Aerobic Dive+ › FK › Leg Warmer Lariat ×2 › BK ×2 › Count of Eight+ › FP › FP FP › FP FP FK |
| Hollis Bey | 0 | frame-perfect | 5 | 27.0% | 2 | ↓BP ×2 › FK › FK FK › Night Shift |
| Hollis Bey | 0 | human | 5 | 26.9% | 7 | ↓BP ×2 › BP › BP FP › Night Shift |
| Hollis Bey | 1 | frame-perfect | 6 | 40.1% | 3 | ↓BP › BK › Night Shift+ › BP › BP FP › BP FP BK |
| Hollis Bey | 1 | human | 7 | 41.7% | 9 | ↓BP › BK › Night Shift+ › j.BP › j.BP BK › BP › Key Ring |
| Hollis Bey | 3 | frame-perfect | 9 | 51.7% | 1 | ↓BP › BK › Night Shift+ › BP › BP FP › Flashlight+ › j.BK › Elbow Drop+ › ↓BK |
| Hollis Bey | 3 | human | 9 | 48.5% | 5 | ↓BP › BK › Key Ring+ › BP › BP FP › Night Shift+ › BK › Key Ring+ › FK |
| Mister Mumbles | 0 | frame-perfect | 13 | 31.0% | 2 | j.BP › FK › FK FK › FK FK FK › j.FP › j.BP › j.BP FK › ↓BP ×2 › FP › FP FP › FP FP FP › Hand Puppet |
| Mister Mumbles | 0 | human | 7 | 27.7% | 4 | j.BP › j.BP FK › BP › FP › FP FP › FP FP FP › FP FP FP BK |
| Mister Mumbles | 1 | frame-perfect | 7 | 40.6% | 3 | ↓BP › Knock-Knock+ › j.BP › j.BP FK › BP › BP FK › Hand Puppet |
| Mister Mumbles | 1 | human | 7 | 39.0% | 4 | ↓BP › Knock-Knock+ › j.FK › j.BK › Puppet Drop › FP › FP FP |
| Mister Mumbles | 3 | frame-perfect | 7 | 50.0% | 3 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet+ › j.FK › j.BK › Puppet Drop+ |
| Mister Mumbles | 3 | human | 7 | 49.1% | 6 | ↓BP › Knock-Knock+ › ←BP › Hand Puppet+ › j.BP › j.BP FK › Cut the Strings+ |
| Margaret Okafor | 0 | frame-perfect | 11 | 31.5% | 4 | j.BK › Cut to Commercial › ↓BP › BP › BP BP › BP BP BK › ↓BP › FP › FP FP › Breaking › Breaking BK |
| Margaret Okafor | 0 | human | 10 | 31.1% | 8 | j.BK › Cut to Commercial › Breaking › BP › BP BP › BP BP BK › BP › BP BP › BP BP BK › BK |
| Margaret Okafor | 1 | frame-perfect | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 1 | human | 9 | 39.4% | 14 | ↓BP › BK › Lead Story+ › BP › BP BP › BP BP BK › FP › FP FP › Breaking |
| Margaret Okafor | 3 | frame-perfect | 13 | 46.1% | 2 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › ↓BP › FK › Breaking+ › BK › Breaking+ › FP › FP FP › Breaking |
| Margaret Okafor | 3 | human | 11 | 45.5% | 6 | ↓BP › Lead Story+ › BP › BP BP › BP BP BK › FK › Breaking+ › BK › Breaking+ › ↓BP › j.FK |
| Chef Gus Lamarre | 0 | frame-perfect | 7 | 27.1% | 2 | j.BP › Cleaver Toss › ↓BP › BK › Flambé › FK › Chop Chop |
| Chef Gus Lamarre | 0 | human | 7 | 26.6% | 6 | j.BP › j.BP BK › ↓BP › BK › Tenderise ×3 |
| Chef Gus Lamarre | 1 | frame-perfect | 7 | 35.9% | 1 | ↓BP › BK › Chop Chop+ › j.FK › j.FK FP › j.BP BK › Belly Flop |
| Chef Gus Lamarre | 1 | human | 7 | 35.0% | 23 | ↓BP › BK › Chop Chop+ › BP › Tenderise ×3 |
| Chef Gus Lamarre | 3 | frame-perfect | 9 | 44.6% | 1 | ↓BP › BK › Chop Chop+ › j.FK › j.FK FP › Belly Flop+ › ←BP › Tenderise+ › ↓BK |
| Chef Gus Lamarre | 3 | human | 9 | 41.9% | 16 | ↓BP › BK › Chop Chop+ › FP › FP BP › Tenderise+ › BP › Chop Chop+ › BK |
| Rev. Gideon Price | 0 | frame-perfect | 6 | 29.6% | 19 | ↓BP › BP › BP BP › BP BP BK › BK › Begone |
| Rev. Gideon Price | 0 | human | 6 | 29.6% | 19 | ↓BP › BP › BP BP › BP BP BK › BK › Begone |
| Rev. Gideon Price | 1 | frame-perfect | 8 | 39.5% | 1 | ↓BP › BK › Fire and Brimstone+ › BP › BP BP › BP BP BK › Laying On of Hands › Laying On of Hands BK |
| Rev. Gideon Price | 1 | human | 6 | 35.4% | 7 | ↓BP › Fire and Brimstone+ › BP › BP BP › BP BP BK › FK |
| Rev. Gideon Price | 3 | frame-perfect | 11 | 47.6% | 1 | ↓BP › BK › Fire and Brimstone+ › BP › BP BP › BP BP BK › FK › Laying On of Hands+ › FP › Laying On of Hands+ › Begone |
| Rev. Gideon Price | 3 | human | 6 | 45.7% | 8 | ↓BP › Fire and Brimstone+ › Rapture+ › BP › BP BP › Laying On of Hands+ |
