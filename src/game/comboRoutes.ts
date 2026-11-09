// Written by `npm run combos:guides` (tests/combo-search.test.ts); do not edit by hand.
import type { ComboGuide } from './comboGuides';

export const COMBO_ROUTES: Readonly<Record<string, readonly ComboGuide[]>> = {
  dale: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'f BP'], [24, 'BP'], [45, 'BK'], [69, 'SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [21, 'b SP'], [24, 'SP'], [51, 'f BP'], [75, 'BP'], [96, 'BP'], [116, 'FK'], [136, 'SP']] },
  ],
  rox: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'd BP'], [12, 'BP'], [43, 'FK'], [58, 'FK'], [77, 'BP'], [100, 'b SP'], [133, 'FP'], [162, 'd SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [20, 'SP'], [23, 'SP'], [53, 'f FK'], [73, 'BK'], [94, 'BP'], [112, 'BP'], [129, 'b SP'], [177, 'BK']] },
  ],
  hollis: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'd BP'], [25, 'd BP'], [40, 'BP'], [63, 'FP'], [83, 'SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [15, 'BK'], [49, 'SP'], [52, 'SP'], [77, 'd BP'], [92, 'BP'], [115, 'FP']] },
  ],
  mumbles: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'FK'], [11, 'FK'], [28, 'FK'], [47, 'BP'], [82, 'FK'], [96, 'SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [32, 'BK'], [59, 'SP'], [62, 'SP'], [79, 'b BP'], [101, 'SP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [20, 'd SP'], [23, 'SP'], [68, 'SP'], [71, 'SP'], [88, 'b BP'], [116, 'SP'], [119, 'SP'], [136, 'b BP'], [158, 'SP']] },
  ],
  margaret: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'f BP'], [23, 'SP'], [64, 'BP'], [81, 'BP'], [101, 'BK'], [123, 'BP'], [142, 'BP'], [162, 'BK'], [184, 'BK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [21, 'd SP'], [24, 'SP'], [61, 'BP'], [74, 'BP'], [94, 'BK'], [116, 'FP'], [132, 'FP'], [148, 'BP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [21, 'd SP'], [24, 'SP'], [58, 'BK'], [83, 'SP'], [86, 'SP'], [111, 'BP'], [124, 'BP'], [144, 'BK']] },
  ],
  gus: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'd BP'], [14, 'BK'], [40, 'f SP'], [91, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [14, 'BK'], [48, 'SP'], [51, 'SP'], [72, 'd BP'], [96, 'b BP']] },
  ],
  gideon: [
    { name: 'Bread and butter', bars: 0, presses: [[0, 'BP'], [15, 'BP'], [36, 'BK'], [59, 'BK'], [82, 'f SP'], [124, 'SP']] },
  ],
};
