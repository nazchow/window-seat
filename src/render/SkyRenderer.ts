import * as THREE from 'three'
import { deriveEnvironment, type EnvironmentState } from '../core/EnvironmentState'
import skyVert from './shaders/sky.vert.glsl'
import skyFrag from './shaders/sky.frag.glsl'

/**
 * Three.js sky renderer — full-window quad with custom GLSL.
 * Designed so CloudSystem / LandscapeSystem can later attach as siblings
 * in the same scene or as overlay layers.
 */
export class SkyRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.OrthographicCamera
  private material: THREE.ShaderMaterial
  private mesh: THREE.Mesh
  private container: HTMLElement
  private width = 1
  private height = 1
  private animTime = 0
  private visible = true
  private reducedMotion = false

  constructor(container: HTMLElement) {
    this.container = container

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x080d24, 1)
    this.renderer.domElement.classList.add('sky-canvas')
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    this.camera.position.z = 1

    this.material = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      uniforms: {
        uTime: { value: 0 },
        uTimeOfDay: { value: 0 },
        uSunPosition: { value: new THREE.Vector2(0.5, 0.7) },
        uMoonPosition: { value: new THREE.Vector2(0.5, 0.7) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uDaylight: { value: 1 },
        uSunsetIntensity: { value: 0 },
        uNightIntensity: { value: 0 },
        uStarVisibility: { value: 0 },
        uHorizonWarmth: { value: 0 },
        uSunVisible: { value: 1 },
        uMoonVisible: { value: 0 },
        uZenith: { value: new THREE.Color() },
        uUpper: { value: new THREE.Color() },
        uLower: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uAccent: { value: new THREE.Color() },
        uHorizonGlow: { value: new THREE.Color() },
      },
    })

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    this.scene.add(this.mesh)

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.addEventListener('visibilitychange', this.onVisibility)

    this.resize()
  }

  private onVisibility = (): void => {
    this.visible = document.visibilityState === 'visible'
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect()
    this.width = Math.max(1, Math.floor(rect.width))
    this.height = Math.max(1, Math.floor(rect.height))

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(this.width, this.height, false)
    this.material.uniforms.uResolution.value.set(this.width * dpr, this.height * dpr)
  }

  applyEnvironment(env: EnvironmentState): void {
    const u = this.material.uniforms
    u.uTimeOfDay.value = env.dayProgress
    u.uDaylight.value = env.daylight
    u.uSunsetIntensity.value = Math.max(env.sunriseIntensity, env.sunsetIntensity)
    u.uNightIntensity.value = env.nightIntensity
    u.uStarVisibility.value = env.starVisibility
    u.uHorizonWarmth.value = env.horizonWarmth
    u.uSunPosition.value.set(env.sunPosition.x, env.sunPosition.y)
    u.uMoonPosition.value.set(env.moonPosition.x, env.moonPosition.y)
    u.uSunVisible.value = env.sunPosition.visible
    u.uMoonVisible.value = env.moonPosition.visible

    setColor(u.uZenith.value, env.palette.zenith)
    setColor(u.uUpper.value, env.palette.upper)
    setColor(u.uLower.value, env.palette.lower)
    setColor(u.uHorizon.value, env.palette.horizon)
    setColor(u.uAccent.value, env.palette.accent)
    setColor(u.uHorizonGlow.value, env.horizonGlowColor)
  }

  /**
   * Render one frame. `deltaSeconds` drives subtle star twinkle / grain only —
   * sky colors come exclusively from environment state derived from simulated time.
   */
  render(timeHours: number, deltaSeconds: number): EnvironmentState {
    const env = deriveEnvironment(timeHours)
    this.applyEnvironment(env)

    if (!this.reducedMotion) {
      this.animTime += deltaSeconds
    }
    this.material.uniforms.uTime.value = this.animTime

    if (this.visible) {
      this.renderer.render(this.scene, this.camera)
    }

    return env
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.material.dispose()
    this.mesh.geometry.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

function setColor(target: THREE.Color, rgb: [number, number, number]): void {
  target.setRGB(rgb[0], rgb[1], rgb[2])
}
