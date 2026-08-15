import './style.css'
import { TimeController } from './core/TimeController'
import { SkyRenderer } from './render/SkyRenderer'
import { UIController } from './ui/UIController'
import { WindowShade } from './ui/WindowShade'

const skyRoot = document.querySelector<HTMLElement>('#sky-root')
const uiRoot = document.querySelector<HTMLElement>('#ui-root')
const shadeRoot = document.querySelector<HTMLElement>('#window-shade')

if (!skyRoot || !uiRoot || !shadeRoot) {
  throw new Error('Window Seat: missing root elements')
}

const time = new TimeController({
  initialTime: 6.5,
  initialSpeed: 1,
  playing: true,
})

const sky = new SkyRenderer(skyRoot)
const ui = new UIController(uiRoot, time)
const shade = new WindowShade(shadeRoot)

const onResize = () => sky.resize()
window.addEventListener('resize', onResize)

let last = performance.now()

function frame(now: number): void {
  const delta = Math.min(0.05, (now - last) / 1000)
  last = now

  // Time always advances — shade only covers the view
  time.update(delta)
  const env = sky.render(time.time, delta)
  ui.applyEnvironment(env)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)

export { time, sky, shade }
