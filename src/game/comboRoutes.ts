// Written by `npm run combos:guides` (tests/combo-search.test.ts); do not edit by hand.
import type { ComboGuide } from './comboGuides';

export const COMBO_ROUTES: Readonly<Record<string, readonly ComboGuide[]>> = {
  dale: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [11, 'BP'], [29, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [24, 'BP'], [45, 'FP'], [62, 'FP'], [92, 'FP'], [107, 'FP'], [124, 'BK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [23, 'd BP'], [36, 'BK'], [61, 'f SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'f BP'], [24, 'BP'], [45, 'BK'], [69, 'b SP'], [72, 'SP'], [105, 'd BP'], [118, 'BP'], [139, 'FK']] },
  ],
  rox: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'FP'], [25, 'FK'], [42, 'b SP'], [90, 'BP'], [120, 'FP'], [142, 'FK'], [158, 'FK'], [177, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [11, 'b SP'], [58, 'BP'], [88, 'FP'], [110, 'FK'], [126, 'FK'], [145, 'b SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f FK'], [20, 'BK'], [41, 'BP'], [59, 'BP'], [83, 'b SP'], [125, 'd BP'], [137, 'FP'], [153, 'FP'], [168, 'FK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [12, 'BP'], [43, 'FK'], [58, 'FK'], [77, 'BP'], [100, 'b SP'], [147, 'BP'], [164, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [12, 'BP'], [30, 'SP'], [33, 'SP'], [55, 'b SP'], [93, 'f FK'], [113, 'BK'], [134, 'FK'], [151, 'FK']] },
  ],
  hollis: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [12, 'BK'], [34, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [13, 'd SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [26, 'b SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [25, 'd BP'], [50, 'd BP'], [65, 'BP'], [88, 'FP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [15, 'BK'], [43, 'SP'], [46, 'SP'], [75, 'd BP'], [90, 'BP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [15, 'BK'], [43, 'd SP'], [46, 'SP'], [79, 'BP'], [95, 'SP'], [98, 'SP'], [129, 'd BP'], [144, 'd SP'], [147, 'SP'], [178, 'FK']] },
  ],
  mumbles: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'FP'], [26, 'FP'], [44, 'BK']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [11, 'BK'], [29, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'b BP'], [22, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [32, 'FP'], [62, 'FP'], [72, 'FP'], [94, 'FP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [32, 'BP'], [49, 'SP'], [52, 'SP'], [74, 'b BP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [12, 'd SP'], [15, 'SP'], [48, 'f SP'], [51, 'SP'], [88, 'b BP'], [116, 'SP'], [119, 'SP']] },
  ],
  margaret: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'SP'], [51, 'BP'], [68, 'BP'], [88, 'BK'], [110, 'BP'], [129, 'BP'], [149, 'BK'], [171, 'BK']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'SP'], [53, 'BP'], [70, 'BP'], [90, 'BK'], [112, 'BK'], [135, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [23, 'SP'], [64, 'BP'], [81, 'BP'], [101, 'BK'], [123, 'FP'], [139, 'FP'], [155, 'd SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [13, 'BP'], [33, 'BP'], [54, 'BK'], [75, 'BP'], [94, 'BP'], [114, 'BK'], [136, 'FK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [13, 'BK'], [37, 'd SP'], [40, 'SP'], [67, 'BP'], [84, 'BP'], [104, 'BK'], [126, 'FP'], [142, 'FK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [13, 'BK'], [37, 'd SP'], [40, 'SP'], [67, 'BP'], [84, 'BP'], [104, 'BK'], [126, 'FP'], [142, 'FP'], [158, 'SP'], [161, 'SP'], [175, 'BK'], [196, 'SP'], [199, 'SP'], [214, 'BP']] },
  ],
  gus: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [12, 'BP'], [33, 'f SP'], [103, 'BP'], [120, 'f SP'], [168, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [13, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [25, 'f SP'], [72, 'FK'], [86, 'FP'], [105, 'BP'], [127, 'FP'], [145, 'BP'], [166, 'BK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [14, 'BK'], [40, 'f SP'], [91, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [14, 'BK'], [40, 'd SP'], [43, 'SP'], [78, 'd BP'], [92, 'BP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [14, 'BK'], [40, 'd SP'], [43, 'SP'], [78, 'd BP'], [92, 'BP'], [115, 'd SP'], [118, 'SP'], [137, 'SP'], [140, 'SP']] },
  ],
  gideon: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [11, 'FK'], [29, 'BK'], [50, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'd SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [24, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [23, 'd BP'], [36, 'BP'], [58, 'BP'], [80, 'BK'], [102, 'FK'], [123, 'BK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [13, 'BP'], [35, 'BP'], [58, 'BK'], [79, 'BP'], [100, 'f SP'], [103, 'SP']] },
  ],
};
