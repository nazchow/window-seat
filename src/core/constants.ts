/** Duration of one full simulated 24h cycle at 1× speed (ms). Adjust freely. */
export const FULL_DAY_DURATION_MS = 5 * 60 * 1000

/** Available playback speeds (Milestone 1 + 0.5× from the time-system spec). */
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10] as const

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

/** Cabin / frame palette */
export const CABIN = {
  background: '#F4F5F7',
  outerFrame: '#E4E6EA',
  innerShadow: '#C4C7CE',
  deepInset: '#A8ADB6',
  text: '#3A3D44',
  textSecondary: '#6E737C',
} as const

/** Approximate solar day window used for celestial arcs */
export const SUNRISE_HOUR = 5.75
export const SUNSET_HOUR = 18.75
