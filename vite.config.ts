import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig(({ command }) => ({
  // Project Pages URL: https://nazchow.github.io/window-seat/
  base: command === 'build' ? '/window-seat/' : '/',
  plugins: [glsl()],
}))
