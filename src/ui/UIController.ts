import {
  formatTime,
  type TimeController,
} from '../core/TimeController'
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '../core/constants'
import type { EnvironmentState } from '../core/EnvironmentState'

/**
 * Understated experimental UI: time readout, scrubber, play/pause, speeds.
 * Keyboard: Space, ←/→, Shift+←/→
 */
export class UIController {
  private root: HTMLElement
  private time: TimeController
  private timeEl: HTMLElement
  private scrubber: HTMLElement
  private thumb: HTMLElement
  private playBtn: HTMLButtonElement
  private speedButtons = new Map<PlaybackSpeed, HTMLButtonElement>()
  private frameEl: HTMLElement | null
  private dragging = false

  constructor(root: HTMLElement, time: TimeController) {
    this.root = root
    this.time = time
    this.frameEl = document.querySelector('.window-frame')

    this.root.innerHTML = `
      <div class="controls">
        <div class="time-readout" data-time>6:30 AM</div>
        <div
          class="scrubber"
          data-scrubber
          role="slider"
          aria-label="Time of day"
          aria-valuemin="0"
          aria-valuemax="24"
          tabindex="0"
        >
          <div class="scrubber-track">
            <div class="scrubber-fill" data-fill></div>
            <div class="scrubber-thumb" data-thumb></div>
          </div>
          <div class="scrubber-marks" aria-hidden="true">
            <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
          </div>
        </div>
        <div class="transport">
          <button type="button" class="text-btn" data-nudge="-0.25" aria-label="Rewind">◀</button>
          <button type="button" class="text-btn play-btn" data-play aria-label="Pause">❚❚</button>
          <button type="button" class="text-btn" data-nudge="0.25" aria-label="Forward">▶</button>
        </div>
        <div class="speeds" data-speeds></div>
      </div>
    `

    this.timeEl = this.root.querySelector('[data-time]')!
    this.scrubber = this.root.querySelector('[data-scrubber]')!
    this.thumb = this.root.querySelector('[data-thumb]')!
    this.playBtn = this.root.querySelector('[data-play]')!

    const speedsEl = this.root.querySelector('[data-speeds]')!
    for (const speed of PLAYBACK_SPEEDS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'text-btn speed-btn'
      btn.textContent = `${formatSpeed(speed)}×`
      btn.dataset.speed = String(speed)
      btn.addEventListener('click', () => {
        this.time.setSpeed(speed)
        if (this.time.paused) this.time.play()
      })
      speedsEl.appendChild(btn)
      this.speedButtons.set(speed, btn)
    }

    this.playBtn.addEventListener('click', () => this.time.togglePlay())

    this.root.querySelectorAll<HTMLButtonElement>('[data-nudge]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const amount = Number(btn.dataset.nudge)
        this.time.nudge(amount)
      })
    })

    this.bindScrubber()
    this.bindKeyboard()
    this.time.subscribe(() => this.sync())
    this.sync()
  }

  private bindScrubber(): void {
    const onPointer = (clientX: number) => {
      const rect = this.scrubber.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      this.time.scrubToProgress(progress)
    }

    const start = (e: PointerEvent) => {
      this.dragging = true
      this.time.beginScrub()
      this.scrubber.classList.add('is-dragging')
      this.timeEl.classList.add('is-scrubbing')
      this.scrubber.setPointerCapture(e.pointerId)
      onPointer(e.clientX)
    }

    const move = (e: PointerEvent) => {
      if (!this.dragging) return
      onPointer(e.clientX)
    }

    const end = (e: PointerEvent) => {
      if (!this.dragging) return
      this.dragging = false
      this.time.endScrub()
      this.scrubber.classList.remove('is-dragging')
      this.timeEl.classList.remove('is-scrubbing')
      try {
        this.scrubber.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }

    this.scrubber.addEventListener('pointerdown', start)
    this.scrubber.addEventListener('pointermove', move)
    this.scrubber.addEventListener('pointerup', end)
    this.scrubber.addEventListener('pointercancel', end)
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        this.time.togglePlay()
        return
      }

      const step = e.shiftKey ? 1.0 : 0.15
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        this.time.nudge(-step)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        this.time.nudge(step)
      }
    })
  }

  sync(): void {
    const hours = this.time.time
    this.timeEl.textContent = formatTime(hours)

    const progress = this.time.dayProgress
    this.thumb.style.left = `${progress * 100}%`
    const fill = this.root.querySelector<HTMLElement>('[data-fill]')
    if (fill) fill.style.width = `${progress * 100}%`

    this.scrubber.setAttribute('aria-valuenow', hours.toFixed(2))
    this.scrubber.setAttribute('aria-valuetext', formatTime(hours))

    const isPaused = this.time.paused
    this.playBtn.textContent = isPaused ? '▶' : '❚❚'
    this.playBtn.setAttribute('aria-label', isPaused ? 'Play' : 'Pause')
    this.playBtn.classList.toggle('is-paused', isPaused)

    for (const [speed, btn] of this.speedButtons) {
      btn.classList.toggle('is-active', speed === this.time.speed)
    }
  }

  /** Optional cabin warmth reflection driven by environment */
  applyEnvironment(env: EnvironmentState): void {
    if (!this.frameEl) return
    const warmth = env.horizonWarmth
    const tint = `rgba(242, 168, 120, ${warmth * 0.12})`
    this.frameEl.style.setProperty('--cabin-warmth', tint)
  }
}

function formatSpeed(speed: number): string {
  return Number.isInteger(speed) ? String(speed) : speed.toFixed(1)
}
