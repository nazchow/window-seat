import { FULL_DAY_DURATION_MS, type PlaybackSpeed } from './constants'

export type TimeControllerOptions = {
  initialTime?: number
  initialSpeed?: PlaybackSpeed
  playing?: boolean
}

/**
 * Owns simulated time (0–24), playback, speed, and scrubbing.
 * All environment systems should read from this — never animate independently of it.
 */
export class TimeController {
  /** Continuous hours in [0, 24) */
  private _time: number
  private _playing: boolean
  private _speed: PlaybackSpeed
  private _scrubbing = false
  private listeners = new Set<() => void>()

  constructor(options: TimeControllerOptions = {}) {
    this._time = options.initialTime ?? 6.5
    this._speed = options.initialSpeed ?? 1
    this._playing = options.playing ?? true
  }

  get time(): number {
    return this._time
  }

  get dayProgress(): number {
    return this._time / 24
  }

  /** True when time should advance (not paused, not scrubbing). */
  get playing(): boolean {
    return this._playing && !this._scrubbing
  }

  /** Intentional pause state, ignores scrub freeze. */
  get paused(): boolean {
    return !this._playing
  }

  get speed(): PlaybackSpeed {
    return this._speed
  }

  get scrubbing(): boolean {
    return this._scrubbing
  }

  /** Effective multiplier including pause / scrub freeze */
  get effectiveSpeed(): number {
    if (!this._playing || this._scrubbing) return 0
    return this._speed
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  /**
   * Advance simulation by real delta seconds.
   * At 1×, a full 24h cycle takes FULL_DAY_DURATION_MS.
   */
  update(deltaSeconds: number): void {
    if (!this.playing) return

    const hoursPerSecond = 24 / (FULL_DAY_DURATION_MS / 1000)
    this._time = wrapHour(this._time + deltaSeconds * hoursPerSecond * this._speed)
    this.notify()
  }

  setTime(hours: number): void {
    this._time = wrapHour(hours)
    this.notify()
  }

  /** Relative scrub in hours (used by arrow keys). */
  nudge(hours: number): void {
    this.setTime(this._time + hours)
  }

  setSpeed(speed: PlaybackSpeed): void {
    this._speed = speed
    this.notify()
  }

  play(): void {
    this._playing = true
    this.notify()
  }

  pause(): void {
    this._playing = false
    this.notify()
  }

  togglePlay(): void {
    this._playing = !this._playing
    this.notify()
  }

  beginScrub(): void {
    this._scrubbing = true
    this.notify()
  }

  endScrub(): void {
    this._scrubbing = false
    this.notify()
  }

  /** Map a 0–1 scrubber position onto the 24h day. */
  scrubToProgress(progress: number): void {
    const t = ((progress % 1) + 1) % 1
    this._time = t * 24
    this.notify()
  }
}

function wrapHour(hours: number): number {
  const wrapped = hours % 24
  return wrapped < 0 ? wrapped + 24 : wrapped
}

export function formatTime(hours: number): string {
  const totalMinutes = Math.floor(wrapHour(hours) * 60) % (24 * 60)
  const h24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`
}
