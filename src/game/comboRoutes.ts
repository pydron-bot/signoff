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
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'FP'], [23, 'FK'], [38, 'FK'], [56, 'b SP'], [99, 'FK'], [123, 'b SP'], [154, 'BP'], [180, 'BP'], [195, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [11, 'FK'], [25, 'b SP'], [54, 'FP'], [93, 'FK'], [111, 'FK'], [130, 'BP'], [153, 'b SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f FK'], [20, 'BK'], [41, 'FK'], [66, 'b SP'], [134, 'FP'], [148, 'FP'], [161, 'FK'], [176, 'BK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [12, 'FP'], [40, 'FK'], [58, 'FK'], [77, 'BP'], [100, 'b SP'], [143, 'BP'], [176, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [12, 'SP'], [15, 'SP'], [64, 'f FK'], [84, 'BK'], [105, 'FK'], [124, 'b SP'], [168, 'BK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [12, 'SP'], [15, 'SP'], [64, 'f FK'], [84, 'BK'], [105, 'FK'], [124, 'b SP'], [168, 'BK'], [204, 'd SP'], [207, 'SP'], [220, 'SP'], [223, 'SP']] },
  ],
  hollis: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [12, 'FP'], [30, 'BP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [13, 'd SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [26, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [31, 'd BP'], [46, 'BP'], [72, 'FP'], [95, 'b SP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [15, 'BK'], [49, 'd SP'], [52, 'SP'], [96, 'BP'], [112, 'FP'], [134, 'BK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [15, 'BK'], [49, 'd SP'], [52, 'SP'], [96, 'BP'], [112, 'FP'], [134, 'SP'], [137, 'SP'], [159, 'b SP'], [162, 'SP']] },
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
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [10, 'SP'], [54, 'BP'], [69, 'BP'], [89, 'BK'], [111, 'BK'], [140, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'SP'], [56, 'BP'], [71, 'BP'], [91, 'BK'], [113, 'BP'], [138, 'BP'], [158, 'BK'], [180, 'BK']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [23, 'SP'], [72, 'BP'], [87, 'BP'], [107, 'BK'], [129, 'BK'], [158, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [13, 'BP'], [39, 'BP'], [60, 'BK'], [81, 'BP'], [103, 'BP'], [123, 'BK'], [145, 'FK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [13, 'BK'], [43, 'd SP'], [46, 'SP'], [76, 'BP'], [99, 'BP'], [119, 'BK'], [141, 'FP'], [160, 'FK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [13, 'BK'], [43, 'd SP'], [46, 'SP'], [76, 'BP'], [99, 'BP'], [119, 'BK'], [141, 'FP'], [160, 'FP'], [174, 'SP'], [177, 'SP'], [189, 'BK'], [216, 'SP'], [219, 'SP'], [250, 'd BP']] },
  ],
  gus: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [12, 'BP'], [31, 'f SP'], [101, 'BP'], [118, 'f SP'], [169, 'd SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [13, 'SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [25, 'f SP'], [75, 'FK'], [89, 'FP'], [108, 'BP'], [128, 'FP'], [152, 'BP'], [171, 'BK']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [14, 'BK'], [46, 'f SP'], [100, 'd FP'], [129, 'BP']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [14, 'BK'], [46, 'd SP'], [49, 'SP'], [79, 'BP'], [105, 'f SP']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [14, 'BK'], [46, 'd SP'], [49, 'SP'], [92, 'd BP'], [106, 'BP'], [132, 'SP'], [135, 'SP'], [157, 'FP'], [179, 'SP'], [182, 'SP'], [211, 'b BP']] },
  ],
  gideon: [
    { name: 'From your jab', bars: 0, presses: [[0, 'FP'], [11, 'FK'], [27, 'BK'], [48, 'SP']] },
    { name: 'From a low', bars: 0, presses: [[0, 'd FK'], [12, 'd SP']] },
    { name: 'From your overhead', bars: 0, presses: [[0, 'f BP'], [24, 'SP']] },
    { name: 'Punish', bars: 0, presses: [[0, 'd BP'], [29, 'd BP'], [42, 'BP'], [67, 'BP'], [92, 'BK'], [114, 'FK'], [138, 'BK']] },
    { name: 'One bar', bars: 1, presses: [[0, 'd BP'], [13, 'SP'], [16, 'SP'], [72, 'BP'], [87, 'BP'], [111, 'BK'], [134, 'FK']] },
    { name: 'Full meter', bars: 3, presses: [[0, 'd BP'], [13, 'SP'], [16, 'SP'], [72, 'BP'], [87, 'BP'], [111, 'BK'], [134, 'd SP'], [137, 'SP'], [170, 'd BP'], [183, 'FP'], [204, 'd SP'], [207, 'SP'], [221, 'BK']] },
  ],
};
