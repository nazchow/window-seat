import { SUNRISE_HOUR, SUNSET_HOUR } from './constants'

export type RGB = [number, number, number]

export type SkyPalette = {
  zenith: RGB
  upper: RGB
  lower: RGB
  horizon: RGB
  accent: RGB
}

export type EnvironmentState = {
  time: number
  dayProgress: number
  daylight: number
  sunriseIntensity: number
  sunsetIntensity: number
  nightIntensity: number
  starVisibility: number
  horizonWarmth: number
  sunPosition: { x: number; y: number; visible: number }
  moonPosition: { x: number; y: number; visible: number }
  palette: SkyPalette
  horizonGlowColor: RGB
}

const hex = (value: string): RGB => {
  const n = parseInt(value.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as RGB
}

/** Keyframed sky palettes keyed by hour-of-day. */
const PALETTE_KEYS: { hour: number; palette: SkyPalette }[] = [
  {
    hour: 0,
    palette: {
      zenith: hex('#080D24'),
      upper: hex('#101B3F'),
      lower: hex('#1C2851'),
      horizon: hex('#29345A'),
      accent: hex('#29345A'),
    },
  },
  {
    hour: 4.5,
    palette: {
      zenith: hex('#111832'),
      upper: hex('#252A50'),
      lower: hex('#51466A'),
      horizon: hex('#88677A'),
      accent: hex('#A07A88'),
    },
  },
  {
    hour: 6,
    palette: {
      zenith: hex('#536F9F'),
      upper: hex('#8997B5'),
      lower: hex('#D99A92'),
      horizon: hex('#F2B27D'),
      accent: hex('#FFD29B'),
    },
  },
  {
    hour: 8,
    palette: {
      zenith: hex('#73A8D8'),
      upper: hex('#9BC4E3'),
      lower: hex('#C7D9E5'),
      horizon: hex('#F2D6B6'),
      accent: hex('#F7E4CE'),
    },
  },
  {
    hour: 12,
    palette: {
      zenith: hex('#428BC4'),
      upper: hex('#69A8D5'),
      lower: hex('#A6CCE4'),
      horizon: hex('#D7E5E9'),
      accent: hex('#E4EEF0'),
    },
  },
  {
    hour: 16,
    palette: {
      zenith: hex('#548FC2'),
      upper: hex('#82ADD0'),
      lower: hex('#B8C9D4'),
      horizon: hex('#E4C7A7'),
      accent: hex('#EED4B5'),
    },
  },
  {
    hour: 17.5,
    palette: {
      zenith: hex('#617EA8'),
      upper: hex('#A18EA5'),
      lower: hex('#DD9A82'),
      horizon: hex('#F3B06E'),
      accent: hex('#FFD38A'),
    },
  },
  {
    hour: 18.5,
    palette: {
      zenith: hex('#455B88'),
      upper: hex('#866E91'),
      lower: hex('#C67882'),
      horizon: hex('#F4B06B'),
      accent: hex('#FFD18A'),
    },
  },
  {
    hour: 19.5,
    palette: {
      zenith: hex('#17264A'),
      upper: hex('#34426B'),
      lower: hex('#665579'),
      horizon: hex('#9A6479'),
      accent: hex('#CB7B73'),
    },
  },
  {
    hour: 21,
    palette: {
      zenith: hex('#090F27'),
      upper: hex('#111D3D'),
      lower: hex('#223158'),
      horizon: hex('#354263'),
      accent: hex('#3A4768'),
    },
  },
  {
    hour: 24,
    palette: {
      zenith: hex('#080D24'),
      upper: hex('#101B3F'),
      lower: hex('#1C2851'),
      horizon: hex('#29345A'),
      accent: hex('#29345A'),
    },
  },
]

const GLOW_KEYS: { hour: number; color: RGB }[] = [
  { hour: 0, color: hex('#29345A') },
  { hour: 4.5, color: hex('#D98783') },
  { hour: 6, color: hex('#FFD6A0') },
  { hour: 8, color: hex('#F5E2C8') },
  { hour: 12, color: hex('#E8F0F2') },
  { hour: 16, color: hex('#F0D4B0') },
  { hour: 17.5, color: hex('#FFD08A') },
  { hour: 18.5, color: hex('#FFB06B') },
  { hour: 19.5, color: hex('#D98783') },
  { hour: 21, color: hex('#354263') },
  { hour: 24, color: hex('#29345A') },
]

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function lerpPalette(a: SkyPalette, b: SkyPalette, t: number): SkyPalette {
  const e = easeInOut(t)
  return {
    zenith: lerpRGB(a.zenith, b.zenith, e),
    upper: lerpRGB(a.upper, b.upper, e),
    lower: lerpRGB(a.lower, b.lower, e),
    horizon: lerpRGB(a.horizon, b.horizon, e),
    accent: lerpRGB(a.accent, b.accent, e),
  }
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

function sampleKeyed<T>(
  keys: { hour: number; value: T }[],
  hour: number,
  lerpFn: (a: T, b: T, t: number) => T,
): T {
  const h = ((hour % 24) + 24) % 24
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (h >= a.hour && h <= b.hour) {
      const span = b.hour - a.hour || 1
      return lerpFn(a.value, b.value, (h - a.hour) / span)
    }
  }
  return keys[0].value
}

function celestialArc(
  hour: number,
  rise: number,
  set: number,
): { x: number; y: number; visible: number } {
  const span = set - rise
  const progress = (hour - rise) / span

  if (progress < -0.05 || progress > 1.05) {
    return { x: 0.5, y: -0.2, visible: 0 }
  }

  const clamped = Math.min(1, Math.max(0, progress))
  const x = lerp(0.12, 0.88, clamped)
  // Soft sine arc — high near midday, low near horizon
  const y = 0.18 + Math.sin(clamped * Math.PI) * 0.62
  const visible =
    smoothstep(-0.02, 0.06, progress) * (1 - smoothstep(0.94, 1.04, progress))

  return { x, y, visible }
}

/**
 * Derive all environmental values from a single simulated time.
 * Later systems (clouds, landscape, cabin) should consume this object.
 */
export function deriveEnvironment(time: number): EnvironmentState {
  const dayProgress = time / 24

  const sunriseIntensity =
    smoothstep(4.2, 5.8, time) * (1 - smoothstep(6.8, 8.2, time))
  const sunsetIntensity =
    smoothstep(16.8, 17.6, time) * (1 - smoothstep(19.2, 20.4, time))
  const daylight =
    smoothstep(5.2, 7.2, time) * (1 - smoothstep(18.2, 20.2, time))
  const nightIntensity = 1 - daylight
  // Stars fade in at twilight, hold through midnight, fade before sunrise
  const starVisibility =
    time >= 19.0 || time < 5.5
      ? time >= 19.0
        ? smoothstep(19.0, 20.5, time)
        : 1 - smoothstep(4.0, 5.5, time)
      : 0

  const horizonWarmth = Math.max(sunriseIntensity, sunsetIntensity)

  const sun = celestialArc(time, SUNRISE_HOUR, SUNSET_HOUR)
  // Moon mirrors the sun — opposite half of the day
  const moonHour = (time + 12) % 24
  const moon = celestialArc(moonHour, SUNRISE_HOUR, SUNSET_HOUR)
  // Soften moon during bright daylight bleed
  moon.visible *= nightIntensity * 0.95 + 0.05

  const palette = sampleKeyed(
    PALETTE_KEYS.map((k) => ({ hour: k.hour, value: k.palette })),
    time,
    lerpPalette,
  )

  const horizonGlowColor = sampleKeyed(
    GLOW_KEYS.map((k) => ({ hour: k.hour, value: k.color })),
    time,
    (a, b, t) => lerpRGB(a, b, easeInOut(t)),
  )

  return {
    time,
    dayProgress,
    daylight,
    sunriseIntensity,
    sunsetIntensity,
    nightIntensity,
    starVisibility,
    horizonWarmth,
    sunPosition: sun,
    moonPosition: moon,
    palette,
    horizonGlowColor,
  }
}
