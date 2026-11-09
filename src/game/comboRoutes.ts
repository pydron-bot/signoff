// Written by `npm run combos:guides` (tests/combo-search.test.ts); do not edit by hand.
import type { ComboGuide } from './comboGuides';

export const COMBO_ROUTES: Readonly<Record<string, readonly ComboGuide[]>> = {
  dale: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [11, 'BP'], [27, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [24, 'BP'], [48, 'FP'], [71, 'FP'], [96, 'FP'], [112, 'FP'], [127, 'BK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [29, 'd BP'], [42, 'BK'], [70, 'f SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'f BP'], [24, 'BP'], [48, 'BK'], [78, 'b SP'], [81, 'SP'], [122, 'd BP'], [135, 'BP'], [159, 'FK']] },
  ],
  rox: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'FP'], [23, 'FK'], [38, 'b SP'], [82, 'BP'], [118, 'FP'], [138, 'FK'], [154, 'FK'], [173, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [11, 'b SP'], [52, 'BP'], [88, 'FP'], [108, 'FK'], [124, 'FK'], [143, 'b SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f FK'], [20, 'BK'], [41, 'BP'], [65, 'b SP'], [116, 'd BP'], [128, 'FP'], [147, 'FP'], [160, 'FK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [12, 'BP'], [49, 'FK'], [64, 'FK'], [83, 'BP'], [106, 'b SP'], [149, 'BP'], [172, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [12, 'SP'], [15, 'SP'], [64, 'f FK'], [84, 'BK'], [105, 'BP'], [123, 'BP'], [140, 'b SP'], [184, 'BK']] },
  ],
  hollis: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [12, 'BK'], [34, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [13, 'd SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [26, 'b SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [31, 'd BP'], [59, 'd BP'], [74, 'BP'], [100, 'FP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [15, 'BK'], [49, 'd SP'], [52, 'SP'], [96, 'BP'], [112, 'FP'], [134, 'BK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [15, 'BK'], [49, 'SP'], [52, 'SP'], [96, 'BP'], [112, 'b SP'], [115, 'SP'], [139, 'd SP'], [142, 'SP']] },
  ],
  mumbles: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'FP'], [24, 'FP'], [40, 'BK']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [11, 'BK'], [29, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'b BP'], [22, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [41, 'FP'], [65, 'FP'], [75, 'FP'], [95, 'FP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [41, 'FP'], [60, 'BP'], [77, 'SP'], [80, 'SP'], [110, 'b BP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [12, 'd SP'], [15, 'SP'], [70, 'b BP'], [92, 'SP'], [95, 'SP'], [136, 'BP'], [149, 'SP'], [152, 'SP'], [189, 'd BP']] },
  ],
  margaret: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'SP'], [54, 'BP'], [69, 'BP'], [89, 'BK'], [111, 'BP'], [136, 'BP'], [156, 'BK'], [178, 'BK']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'SP'], [56, 'BP'], [71, 'BP'], [91, 'BK'], [113, 'BK'], [142, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [23, 'SP'], [72, 'BP'], [87, 'BP'], [107, 'BK'], [129, 'FP'], [151, 'FP'], [165, 'd SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [13, 'BP'], [39, 'BP'], [60, 'BK'], [81, 'BP'], [103, 'BP'], [123, 'BK'], [145, 'FK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [13, 'BK'], [43, 'd SP'], [46, 'SP'], [76, 'BP'], [99, 'BP'], [119, 'BK'], [141, 'FP'], [160, 'FK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [13, 'BK'], [43, 'd SP'], [46, 'SP'], [76, 'BP'], [99, 'BP'], [119, 'BK'], [141, 'FP'], [160, 'FP'], [174, 'SP'], [177, 'SP'], [189, 'BK'], [216, 'SP'], [219, 'SP'], [250, 'd BP']] },
  ],
  gus: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [12, 'BP'], [31, 'f SP'], [101, 'BP'], [118, 'f SP'], [169, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [13, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [25, 'f SP'], [75, 'FK'], [89, 'FP'], [108, 'BP'], [128, 'FP'], [152, 'BP'], [171, 'BK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [14, 'BK'], [46, 'f SP'], [100, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [14, 'BK'], [46, 'd SP'], [49, 'SP'], [92, 'd BP'], [106, 'BP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [14, 'BK'], [46, 'd SP'], [49, 'SP'], [92, 'd BP'], [106, 'BP'], [132, 'SP'], [135, 'SP'], [157, 'FP'], [179, 'SP'], [182, 'SP'], [211, 'b BP']] },
  ],
  gideon: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [11, 'FK'], [27, 'BK'], [48, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'd SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [24, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [29, 'd BP'], [42, 'BP'], [67, 'BP'], [92, 'BK'], [114, 'FK'], [138, 'BK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [13, 'BP'], [41, 'BP'], [67, 'BK'], [88, 'BP'], [112, 'f SP'], [115, 'SP']] },
  ],
};
