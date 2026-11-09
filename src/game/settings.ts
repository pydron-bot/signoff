/**
 * Player settings, kept in localStorage under signoff.settings: how heavy
 * the broadcast censoring is, how strong the VHS look is, motion, music
 * volume, and the touch buttons' size and side. Each is an index into its
 * options, so a menu row can show and change it. No DOM here beyond storage.
 */
export interface Settings {
  /** Broadcast standards: 0 strict (the finisher is heard, not seen), 1 normal, 2 late night (a glimpse through the static). */
  censor: number;
  /** VHS look: 0 off, 1 low, 2 full. */
  vhs: number;
  /** Reduce Motion: 0 as the system says, 1 on, 2 off. */
  motion: number;
  /** Music: 0 off, 1 low, 2 full. */
  music: number;
  /** Touch buttons: 0 small, 1 medium, 2 large. */
  touchSize: number;
  /** Touch buttons: 0 on the right, 1 on the left (the stick swaps over). */
  touchSide: number;
  /** The input display down the side: 0 off, 1 in Training (and combo showcases), 2 always. */
  inputs: number;
}

export const SETTINGS_KEY = 'signoff.settings';

export const OPTIONS: Readonly<Record<keyof Settings, readonly string[]>> = {
  censor: ['STRICT', 'NORMAL', 'LATE NIGHT'],
  vhs: ['OFF', 'LOW', 'FULL'],
  motion: ['SYSTEM', 'REDUCED', 'FULL'],
  music: ['OFF', 'LOW', 'FULL'],
  touchSize: ['SMALL', 'MEDIUM', 'LARGE'],
  touchSide: ['RIGHT', 'LEFT'],
  inputs: ['OFF', 'TRAINING', 'ALWAYS'],
};

export const LABELS: Readonly<Record<keyof Settings, string>> = {
  censor: 'BROADCAST STANDARDS',
  vhs: 'VHS LOOK',
  motion: 'MOTION',
  music: 'MUSIC',
  touchSize: 'TOUCH BUTTONS',
  touchSide: 'BUTTONS ON THE',
  inputs: 'INPUT DISPLAY',
};

export function defaults(): Settings {
  return { censor: 1, vhs: 2, motion: 0, music: 2, touchSize: 1, touchSide: 0, inputs: 1 };
}

/** Anything stored that isn't a valid index falls back to the default. */
export function parseSettings(raw: unknown): Settings {
  const s = defaults();
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(s) as (keyof Settings)[]) {
      const v = (raw as Record<string, unknown>)[k];
      if (Number.isInteger(v) && (v as number) >= 0 && (v as number) < OPTIONS[k].length) s[k] = v as number;
    }
  }
  return s;
}

export function loadSettings(): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    return defaults();
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // private mode: settings last until reload
  }
}

/** Reduce Motion as it applies: the system's preference unless overridden. */
export function reducedMotion(s: Settings, system: boolean): boolean {
  return s.motion === 0 ? system : s.motion === 1;
}

export const MUSIC_VOLUME = [0, 0.45, 1] as const;
export const TOUCH_SCALE = [0.85, 1, 1.2] as const;
