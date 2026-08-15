/**
 * Airplane window shade — drag down to close, drag up to open.
 * On touch / coarse pointers, a tap toggles fully open ↔ closed.
 * Does not affect simulated time.
 */
export class WindowShade {
  private root: HTMLElement
  private amount = 0
  private dragging = false
  private pointerId: number | null = null
  private startY = 0
  private startAmount = 0
  private moved = false
  private preferTapToggle: boolean

  constructor(root: HTMLElement) {
    this.root = root
    this.preferTapToggle = window.matchMedia('(pointer: coarse)').matches

    this.root.style.setProperty('--shade', '0')
    this.root.setAttribute('aria-valuenow', '0')

    this.root.addEventListener('pointerdown', this.onPointerDown)
    this.root.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
  }

  get closedAmount(): number {
    return this.amount
  }

  private setAmount(value: number, animate = false): void {
    this.amount = Math.min(1, Math.max(0, value))
    this.root.classList.toggle('is-animating', animate)
    this.root.style.setProperty('--shade', this.amount.toFixed(4))
    this.root.setAttribute('aria-valuenow', this.amount.toFixed(2))
    this.root.setAttribute(
      'aria-valuetext',
      this.amount < 0.05 ? 'open' : this.amount > 0.95 ? 'closed' : `${Math.round(this.amount * 100)}% closed`,
    )
  }

  private toggle(): void {
    this.setAmount(this.amount < 0.5 ? 1 : 0, true)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      this.setAmount(this.amount + 0.1, true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      this.setAmount(this.amount - 0.1, true)
    } else if (e.key === 'Home') {
      e.preventDefault()
      e.stopPropagation()
      this.setAmount(0, true)
    } else if (e.key === 'End') {
      e.preventDefault()
      e.stopPropagation()
      this.setAmount(1, true)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      this.toggle()
    }
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    e.preventDefault()
    this.dragging = true
    this.moved = false
    this.pointerId = e.pointerId
    this.startY = e.clientY
    this.startAmount = this.amount
    this.root.classList.add('is-dragging')
    this.root.classList.remove('is-animating')
    this.root.setPointerCapture(e.pointerId)
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return

    const rect = this.root.getBoundingClientRect()
    const delta = (e.clientY - this.startY) / Math.max(rect.height, 1)
    if (Math.abs(e.clientY - this.startY) > 6) this.moved = true
    this.setAmount(this.startAmount + delta)
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return

    this.dragging = false
    this.pointerId = null
    this.root.classList.remove('is-dragging')

    try {
      this.root.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    // Mobile / touch: tap toggles; small drags still snap
    if (this.preferTapToggle && !this.moved) {
      this.toggle()
      return
    }

    // Snap near ends for a tactile close/open
    if (this.amount < 0.08) this.setAmount(0, true)
    else if (this.amount > 0.92) this.setAmount(1, true)
    else this.setAmount(this.amount, true)
  }

  dispose(): void {
    this.root.removeEventListener('pointerdown', this.onPointerDown)
    this.root.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
  }
}
