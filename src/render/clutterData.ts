/**
 * Set dressing that gets knocked about (docs/BLENDER-TODO.md, step 30):
 * loose odds and ends on each stage's floor that nobody can pick up or use,
 * kicked along by feet, thrown by hits, knockdowns and hazards, blown by the
 * storm and floated by the flood. Presentation only: the simulation never
 * sees them, so they can't change a fight. Each kind is `clutter_<id>` in
 * the stage's GLB, built round its middle; until that loads it's a grey box
 * of the same size.
 */

/**
 * How a piece moves on the floor: `roll` rolls along the stage about its
 * own z axis (a bottle or roll of tape on its side, an onion); `flat` slides
 * and spins and lands on a face (paper, a towel, a lid); `box` slides and
 * comes to rest on any side (a mug standing or knocked over, a bin).
 */
export type ClutterShape = 'roll' | 'flat' | 'box';

export interface ClutterKind {
  /** The GLB object is `clutter_<id>`. */
  readonly id: string;
  readonly shape: ClutterShape;
  /** Its size as built (x along the stage, y up, z toward the camera), metres. */
  readonly size: readonly [number, number, number];
  /** 1 is about a full mug; heavier pieces are kicked less far. */
  readonly mass: number;
  /** Floats on the flood rather than sinking. */
  readonly floats?: boolean;
}

export interface ClutterPlace {
  readonly kind: string;
  readonly x: number;
  readonly z: number;
  /** Turned about y, radians. */
  readonly yaw: number;
}

export interface StageClutter {
  readonly kinds: readonly ClutterKind[];
  readonly places: readonly ClutterPlace[];
  /** A segment (0-based) whose floor is under water, and the water's height. */
  readonly flood?: { readonly segment: number; readonly level: number };
}

/**
 * Placed clear of the start marks (±1.5) and the stage's props (the dollies
 * at ±4.6, the boombox and the desk at 0, the pot at −3, the knives at 3), within the
 * strip the feet reach (|z| under about 0.45) or just behind it, where only
 * blasts reach them.
 */
export const CLUTTER: Readonly<Record<string, StageClutter>> = {
  weather: {
    kinds: [
      { id: 'clipboard', shape: 'flat', size: [0.3, 0.03, 0.4], mass: 0.5, floats: true },
      { id: 'mug', shape: 'box', size: [0.15, 0.14, 0.11], mass: 0.8, floats: true },
      { id: 'tape', shape: 'roll', size: [0.2, 0.2, 0.07], mass: 0.5, floats: true },
    ],
    places: [
      { kind: 'clipboard', x: -2.6, z: 0.25, yaw: 0.4 },
      { kind: 'clipboard', x: 3.4, z: -0.55, yaw: -0.9 },
      { kind: 'mug', x: -0.5, z: -0.45, yaw: 1.1 },
      { kind: 'mug', x: 2.6, z: 0.3, yaw: -0.3 },
      { kind: 'tape', x: 0.8, z: 0.35, yaw: 0 },
    ],
    flood: { segment: 2, level: 0.22 },
  },
  burn: {
    kinds: [
      { id: 'dumbbell', shape: 'roll', size: [0.16, 0.16, 0.34], mass: 1.8 },
      { id: 'bottle', shape: 'roll', size: [0.09, 0.09, 0.26], mass: 0.5 },
      { id: 'towel', shape: 'flat', size: [0.5, 0.04, 0.32], mass: 0.4 },
    ],
    places: [
      { kind: 'dumbbell', x: -2.7, z: -0.4, yaw: 0 },
      { kind: 'dumbbell', x: 3.1, z: 0.3, yaw: 0 },
      { kind: 'bottle', x: -0.8, z: 0.35, yaw: 0 },
      { kind: 'bottle', x: 2.3, z: -0.5, yaw: 0 },
      { kind: 'towel', x: -3.6, z: 0.2, yaw: 0.6 },
      { kind: 'towel', x: 0.9, z: -0.55, yaw: -0.3 },
    ],
  },
  news: {
    kinds: [
      { id: 'script', shape: 'flat', size: [0.22, 0.025, 0.3], mass: 0.3 },
      { id: 'mug', shape: 'box', size: [0.15, 0.14, 0.11], mass: 0.8 },
      { id: 'bin', shape: 'box', size: [0.3, 0.36, 0.3], mass: 1.4 },
    ],
    places: [
      { kind: 'script', x: -2.4, z: 0.3, yaw: 0.5 },
      { kind: 'script', x: 0.95, z: -0.5, yaw: -1.2 },
      { kind: 'script', x: 3.0, z: 0.25, yaw: 2.2 },
      { kind: 'mug', x: -0.95, z: 0.3, yaw: 0.8 },
      { kind: 'bin', x: 4.2, z: -0.6, yaw: 0.3 },
    ],
  },
  kitchen: {
    kinds: [
      { id: 'onion', shape: 'roll', size: [0.13, 0.12, 0.13], mass: 0.5 },
      { id: 'lid', shape: 'flat', size: [0.32, 0.05, 0.32], mass: 0.8 },
      { id: 'spoon', shape: 'flat', size: [0.36, 0.03, 0.07], mass: 0.3 },
    ],
    places: [
      { kind: 'onion', x: -0.6, z: 0.35, yaw: 0 },
      { kind: 'onion', x: 0.4, z: -0.4, yaw: 0 },
      { kind: 'onion', x: 2.4, z: 0.2, yaw: 0 },
      { kind: 'lid', x: -2.2, z: -0.35, yaw: 0 },
      { kind: 'spoon', x: -3.9, z: 0.3, yaw: 0.7 },
      { kind: 'spoon', x: 3.9, z: -0.3, yaw: -0.4 },
    ],
  },
};
