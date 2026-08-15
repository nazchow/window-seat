precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uTimeOfDay;
uniform vec2 uSunPosition;
uniform vec2 uMoonPosition;
uniform vec2 uResolution;
uniform float uDaylight;
uniform float uSunsetIntensity;
uniform float uNightIntensity;
uniform float uStarVisibility;
uniform float uHorizonWarmth;
uniform float uSunVisible;
uniform float uMoonVisible;

uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uLower;
uniform vec3 uHorizon;
uniform vec3 uAccent;
uniform vec3 uHorizonGlow;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float softCircle(vec2 uv, vec2 center, float radius, float softness) {
  float d = length(uv - center);
  return 1.0 - smoothstep(radius, radius + softness, d);
}

vec3 skyGradient(float y) {
  // y: 0 at bottom (horizon), 1 at zenith
  vec3 c;
  if (y > 0.72) {
    float t = smoothstep(0.72, 1.0, y);
    c = mix(uUpper, uZenith, t);
  } else if (y > 0.42) {
    float t = smoothstep(0.42, 0.72, y);
    c = mix(uLower, uUpper, t);
  } else if (y > 0.16) {
    float t = smoothstep(0.16, 0.42, y);
    c = mix(uHorizon, uLower, t);
  } else {
    float t = smoothstep(0.0, 0.16, y);
    c = mix(uAccent, uHorizon, t);
  }
  return c;
}

void main() {
  // Aspect-correct UV so sun/moon stay circular
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = vUv;
  vec2 cuv = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  vec2 sun = vec2((uSunPosition.x - 0.5) * aspect, uSunPosition.y - 0.5);
  vec2 moon = vec2((uMoonPosition.x - 0.5) * aspect, uMoonPosition.y - 0.5);

  vec3 color = skyGradient(uv.y);

  // Horizon atmospheric scattering — soft band near the bottom
  float horizonDist = abs(uv.y - 0.08);
  float glowMask = exp(-horizonDist * 12.0) * (0.15 + uHorizonWarmth * 0.85);
  glowMask *= 0.55 + uSunsetIntensity * 0.7;
  color += uHorizonGlow * glowMask * 0.55;

  // Extra warm bloom near sun when low on horizon
  float sunHorizonBoost = (1.0 - smoothstep(0.15, 0.55, uSunPosition.y)) * uSunVisible;
  float sunDist = length(cuv - sun);
  float sunAtmos = exp(-sunDist * 3.2) * sunHorizonBoost * (0.35 + uSunsetIntensity * 0.65);
  color += vec3(0.96, 0.65, 0.4) * sunAtmos * 0.32;

  // Sun disc + layered glow
  float sunCore = softCircle(cuv, sun, 0.028, 0.012) * uSunVisible;
  float sunInner = softCircle(cuv, sun, 0.045, 0.05) * uSunVisible;
  float sunOuter = softCircle(cuv, sun, 0.09, 0.14) * uSunVisible;

  color += vec3(1.0, 0.96, 0.81) * sunCore * 0.72;
  color += vec3(1.0, 0.85, 0.55) * sunInner * 0.38;
  color += vec3(0.96, 0.65, 0.41) * sunOuter * (0.16 + sunHorizonBoost * 0.24);

  // Moon — quiet, never icon-like
  float moonCore = softCircle(cuv, moon, 0.018, 0.008) * uMoonVisible;
  float moonGlow = softCircle(cuv, moon, 0.04, 0.06) * uMoonVisible;
  color += vec3(0.91, 0.90, 0.86) * moonCore * 0.85;
  color += vec3(0.66, 0.71, 0.82) * moonGlow * 0.18;

  // Procedural stars — denser field with a faint secondary layer
  if (uStarVisibility > 0.001) {
    float skyFade = smoothstep(0.05, 0.35, uv.y);

    // Primary stars
    vec2 grid = floor(uv * vec2(72.0 * aspect, 72.0));
    vec2 cell = fract(uv * vec2(72.0 * aspect, 72.0));
    float n = hash(grid);
    float isStar = step(0.92, n);
    float brightness = hash(grid + 17.1);
    float size = mix(0.03, 0.085, hash(grid + 3.7));
    float twinkle = 0.75 + 0.25 * sin(uTime * (0.6 + brightness * 1.8) + n * 6.28);
    float star = smoothstep(size, 0.0, length(cell - 0.5)) * isStar * brightness * twinkle;
    star *= skyFade;
    color += vec3(0.92, 0.94, 1.0) * star * uStarVisibility * 0.9;

    // Fainter dense background stars
    vec2 grid2 = floor(uv * vec2(110.0 * aspect, 110.0));
    vec2 cell2 = fract(uv * vec2(110.0 * aspect, 110.0));
    float n2 = hash(grid2 + 91.3);
    float isStar2 = step(0.88, n2);
    float brightness2 = hash(grid2 + 5.2) * 0.45;
    float size2 = mix(0.02, 0.055, hash(grid2 + 11.9));
    float twinkle2 = 0.8 + 0.2 * sin(uTime * (0.4 + n2 * 1.2) + n2 * 4.1);
    float star2 = smoothstep(size2, 0.0, length(cell2 - 0.5)) * isStar2 * brightness2 * twinkle2;
    star2 *= skyFade;
    color += vec3(0.88, 0.91, 1.0) * star2 * uStarVisibility * 0.7;
  }

  // Barely-there atmospheric grain (keep subconscious for Milestone 1)
  float grain = (hash(uv * 220.0 + uTime * 0.02) - 0.5) * 0.018;
  color += grain;

  // Soft vignette suggesting glass depth without a hard effect
  float vignette = smoothstep(1.15, 0.35, length(vec2((uv.x - 0.5) * 1.15, uv.y - 0.5)));
  color *= mix(0.92, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
