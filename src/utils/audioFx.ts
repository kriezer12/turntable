// Procedural Vinyl Sound FX using Web Audio API
// Generates authentic needle-drop thud, surface crackle, and tactile mechanical switch clicks.

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Plays a realistic vinyl needle drop sound:
 * 1. Warm low-frequency mechanical "thud" when the stylus touches the vinyl surface.
 * 2. Subtle burst of dust crackle in the lead-in groove.
 */
export function playNeedleDropSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // 1. Stylus Contact Thump (low-pass filtered damped sine wave)
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(90, now)
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.12)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(160, now)

  oscGain.gain.setValueAtTime(0.001, now)
  oscGain.gain.linearRampToValueAtTime(0.28, now + 0.015)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

  osc.connect(filter)
  filter.connect(oscGain)
  oscGain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.2)

  // 2. Micro Surface Crackle (Filtered white noise burst)
  const bufferSize = ctx.sampleRate * 0.25
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    // Sparse clicks and pops
    const rand = Math.random()
    if (rand > 0.985) {
      output[i] = (Math.random() * 2 - 1) * 0.35
    } else if (rand > 0.94) {
      output[i] = (Math.random() * 2 - 1) * 0.08
    } else {
      output[i] = (Math.random() * 2 - 1) * 0.015
    }
  }

  const whiteNoise = ctx.createBufferSource()
  whiteNoise.buffer = noiseBuffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.setValueAtTime(2200, now)
  noiseFilter.Q.setValueAtTime(1.8, now)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.001, now)
  noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.03)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

  whiteNoise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)

  whiteNoise.start(now)
  whiteNoise.stop(now + 0.26)
}

/**
 * Mechanical switch toggle click for tactile buttons
 */
export function playSwitchClickSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.03)

  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.04)
}
