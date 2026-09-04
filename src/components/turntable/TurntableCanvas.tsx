import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Float, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import type { SpotifyTrack } from '../../types/spotify'
import { useVinylLabelTexture } from './useVinylLabelTexture'
import { playNeedleDropSound, playSwitchClickSound } from '../../utils/audioFx'

export type CameraViewPreset = 'isometric' | 'top' | 'macro' | 'front'

interface TurntableCanvasProps {
  track: SpotifyTrack | null
  isPlaying: boolean
  playbackProgress: number // 0 to 1
  rpm?: '33' | '45'
  cameraView?: CameraViewPreset
  onSeek?: (progress: number) => void
  onTogglePlay?: () => void
  onToggleRpm?: () => void
}

const CAMERA_PRESETS: Record<CameraViewPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  isometric: { pos: [0, 5.8, 6.2], target: [0, 0, 0] },
  top: { pos: [0, 8.4, 0.01], target: [0, 0, 0] },
  macro: { pos: [1.3, 1.5, 1.7], target: [0, 0.35, 0.4] },
  front: { pos: [0, 1.6, 7.2], target: [0, 0.1, 0] }
}

// GSAP Camera Controller for cinematic view transitions
function CameraController({ cameraView = 'isometric' }: { cameraView: CameraViewPreset }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraView] || CAMERA_PRESETS.isometric
    
    gsap.to(camera.position, {
      x: preset.pos[0],
      y: preset.pos[1],
      z: preset.pos[2],
      duration: 1.4,
      ease: 'power3.inOut'
    })

    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: preset.target[0],
        y: preset.target[1],
        z: preset.target[2],
        duration: 1.4,
        ease: 'power3.inOut',
        onUpdate: () => controlsRef.current.update()
      })
    }
  }, [cameraView, camera])

  return (
    <OrbitControls 
      ref={controlsRef}
      enablePan={false}
      minDistance={3}
      maxDistance={14}
      maxPolarAngle={Math.PI / 2.05}
    />
  )
}

// Sub-component for the spinning vinyl record with inertia and click-to-seek
function VinylRecord({ 
  track, 
  isPlaying,
  rpm = '33',
  onSeek
}: { 
  track: SpotifyTrack | null
  isPlaying: boolean
  rpm?: '33' | '45'
  onSeek?: (progress: number) => void
}) {
  const recordRef = useRef<THREE.Group>(null)
  const currentSpeed = useRef(0)

  // Platter Rotational Inertia Physics (smooth acceleration & coasting to stop)
  useFrame((_, delta) => {
    if (!recordRef.current) return
    const targetSpeed = isPlaying ? (rpm === '45' ? 2.35 : 1.75) : 0
    const lerpFactor = isPlaying ? 0.05 : 0.025
    currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, lerpFactor)

    if (Math.abs(currentSpeed.current) > 0.0001) {
      recordRef.current.rotation.y += delta * currentSpeed.current
    }
  })

  // Procedural + artwork-assisted vinyl center label
  const labelTexture = useVinylLabelTexture({
    artworkUrl: track?.album?.images?.[0]?.url,
    trackTitle: track?.name || 'THE TURNTABLES',
    artistName: track?.artists?.[0]?.name || 'HI-FI STEREO'
  })

  // Handle clicking on vinyl grooves to seek needle position
  const handleRecordPointerDown = (e: any) => {
    e.stopPropagation()
    if (!onSeek) return

    const point = e.point
    const radius = Math.sqrt(point.x * point.x + point.z * point.z)
    
    const innerRadius = 1.05
    const outerRadius = 2.45
    const clampedRadius = Math.max(innerRadius, Math.min(outerRadius, radius))
    
    const progress = 1.0 - (clampedRadius - innerRadius) / (outerRadius - innerRadius)
    playNeedleDropSound()
    onSeek(progress)
  }

  return (
    <group ref={recordRef} position={[0, 0.28, 0]}>
      {/* Vinyl Disc Body (Clickable to seek) */}
      <mesh 
        receiveShadow 
        castShadow 
        onPointerDown={handleRecordPointerDown}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[2.5, 2.5, 0.05, 64]} />
        <meshStandardMaterial 
          color="#111215" 
          roughness={0.25} 
          metalness={0.7} 
        />
      </mesh>

      {/* Grooves Highlight Ring */}
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 2.45, 64]} />
        <meshStandardMaterial 
          color="#1c1e26" 
          roughness={0.35} 
          metalness={0.85} 
        />
      </mesh>

      {/* Center Label (Album Artwork / Vintage Pressing Label) */}
      <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 64]} />
        <meshStandardMaterial 
          map={labelTexture} 
          roughness={0.4} 
        />
      </mesh>

      {/* Center Spindle Hole */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
    </group>
  )
}

// Sub-component for the tonearm with 3D needle drop elevation & radial tracking
function Tonearm({ 
  isPlaying, 
  progress 
}: { 
  isPlaying: boolean
  progress: number 
}) {
  const armPivotRef = useRef<THREE.Group>(null)
  const armLiftRef = useRef<THREE.Group>(null)

  // Map progress (0 to 1) and needle drop physics
  useFrame(() => {
    if (!armPivotRef.current || !armLiftRef.current) return

    // 1. Horizontal Tracking Angle (Y-axis):
    // At rest (not playing): arm sits at outer edge (~0.2 rad)
    // Playing: sweeps inward as progress goes 0->1 (-0.2 to -0.5 rad)
    const targetAngleY = isPlaying 
      ? 0.2 - (progress * 0.4)
      : 0.25 // Resting perch position (raised, off the record)

    armPivotRef.current.rotation.y = THREE.MathUtils.lerp(
      armPivotRef.current.rotation.y,
      targetAngleY,
      0.04
    )

    // 2. Vertical Needle Elevation:
    // Playing: needle down on record (0)
    // Paused: needle raised (0.08 rad)
    const targetLift = isPlaying ? 0.0 : 0.08

    armLiftRef.current.rotation.x = THREE.MathUtils.lerp(
      armLiftRef.current.rotation.x,
      targetLift,
      0.06
    )
  })

  return (
    <group position={[2.0, 0.35, -1.8]}>
      {/* Tonearm Base / Gimbal Column */}
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.35, 32]} />
        <meshStandardMaterial color="#3a3d4a" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Cueing Lever Armrest Pillar */}
      <mesh position={[-0.45, 0.1, 0.4]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.3, 16]} />
        <meshStandardMaterial color="#2d303b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Cueing Lift Lever */}
      <mesh position={[-0.4, 0.25, 0.25]} rotation={[0, 0, isPlaying ? 0.2 : -0.2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Tonearm Horizontal Pivot (swings arm across the record) */}
      <group ref={armPivotRef}>
        {/* Tonearm Vertical Lift Pivot (raises/lowers the needle) */}
        <group ref={armLiftRef}>
          {/* Main S-Shaped Tone Tube - extends from pivot toward the record */}
          <mesh position={[0, 0.18, 1.5]} castShadow>
            <cylinderGeometry args={[0.038, 0.038, 3.0, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.96} roughness={0.08} />
          </mesh>

          {/* Headshell / Stylus Cartridge (at the end of the arm, over the record) */}
          <mesh position={[0, 0.12, 3.0]} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.42]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.25} />
          </mesh>

          {/* Stylus Diamond Tip Highlight */}
          <mesh position={[0, 0.05, 3.25]}>
            <coneGeometry args={[0.02, 0.04, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Stainless Counterweight (behind the pivot) */}
          <mesh position={[0, 0.18, -0.5]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.42, 32]} />
            <meshStandardMaterial color="#1f242e" metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Counterweight Calibration Ring */}
          <mesh position={[0, 0.18, -0.2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 32]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// Turntable Plinth / Chassis with physical buttons & pitch fader
function TurntableBase({ 
  isPlaying, 
  rpm, 
  onTogglePlay, 
  onToggleRpm 
}: { 
  isPlaying: boolean
  rpm: '33' | '45'
  onTogglePlay?: () => void
  onToggleRpm?: () => void
}) {
  return (
    <group position={[0, 0, 0]}>
      {/* Heavy Plinth */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.2, 0.45, 5.2]} />
        <meshStandardMaterial 
          color="#16181f" 
          roughness={0.3} 
          metalness={0.5} 
        />
      </mesh>

      {/* Brushed Metal Top Plate Accent */}
      <mesh position={[0, 0.23, 0]} receiveShadow>
        <boxGeometry args={[6.1, 0.02, 5.1]} />
        <meshStandardMaterial 
          color="#222530" 
          roughness={0.2} 
          metalness={0.7} 
        />
      </mesh>

      {/* Platter Stroboscope Rim (Outer grooved edge with speed dots) */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[2.58, 2.62, 0.16, 64]} />
        <meshStandardMaterial 
          color="#272b38" 
          metalness={0.9} 
          roughness={0.2} 
        />
      </mesh>

      {/* Strobe Illuminator Tower (Front left corner) */}
      <group position={[-2.6, 0.35, 2.0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.25, 24]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Amber Strobe Lamp Prism */}
        <mesh position={[0.1, 0.1, -0.1]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial 
            color="#f59e0b" 
            emissive="#f59e0b" 
            emissiveIntensity={isPlaying ? 1.6 : 0.2} 
          />
        </mesh>
      </group>

      {/* Physical 3D Power / Start-Stop Button */}
      <group 
        position={[-2.5, 0.26, 1.2]}
        onClick={(e) => {
          e.stopPropagation()
          playSwitchClickSound()
          onTogglePlay?.()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.35, 0.08, 32]} />
          <meshStandardMaterial color="#1e212b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Tactile Switch Top */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.06, 32]} />
          <meshStandardMaterial 
            color={isPlaying ? '#10b981' : '#f59e0b'} 
            emissive={isPlaying ? '#059669' : '#d97706'}
            emissiveIntensity={0.4}
            metalness={0.5} 
            roughness={0.3} 
          />
        </mesh>
      </group>

      {/* Physical 33/45 RPM Speed Toggle */}
      <group 
        position={[-2.5, 0.26, 0.3]}
        onClick={(e) => {
          e.stopPropagation()
          playSwitchClickSound()
          onToggleRpm?.()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.26, 0.08, 32]} />
          <meshStandardMaterial color="#1e212b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 32]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* Audiophile Pitch Slider Fader on Right Side */}
      <group position={[2.4, 0.25, 0.6]}>
        {/* Slider Well */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.35, 0.02, 1.8]} />
          <meshStandardMaterial color="#11131a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Slider Fader Knob */}
        <mesh position={[0, 0.04, rpm === '45' ? 0.3 : 0]}>
          <boxGeometry args={[0.22, 0.08, 0.12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Metal Spindle */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.3, 32]} />
        <meshStandardMaterial color="#e4e4e7" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Corner Feet / Isolators */}
      {[
        [-2.8, -0.28, -2.2],
        [2.8, -0.28, -2.2],
        [-2.8, -0.28, 2.2],
        [2.8, -0.28, 2.2]
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.3, 0.35, 0.2, 32]} />
          <meshStandardMaterial color="#2d313d" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function TurntableCanvas({ 
  track, 
  isPlaying, 
  playbackProgress,
  rpm = '33',
  cameraView = 'isometric',
  onSeek,
  onTogglePlay,
  onToggleRpm
}: TurntableCanvasProps) {
  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas
        shadows
        camera={{ position: [0, 5.8, 6.2], fov: 42 }}
        className="w-full h-full"
      >
        <color attach="background" args={['#0c0e14']} />
        
        {/* Atmospheric Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight 
          position={[6, 8, 4]} 
          intensity={2.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-4, 3, -2]} intensity={1.2} color="#f59e0b" />
        <pointLight position={[3, 2, 4]} intensity={0.6} color="#60a5fa" />
        <pointLight position={[-2.6, 0.7, 2.0]} intensity={isPlaying ? 1.5 : 0.3} color="#f59e0b" distance={2} />

        <Float speed={1.0} rotationIntensity={0.04} floatIntensity={0.08}>
          <group position={[0, -0.2, 0]} rotation={[0.06, -0.12, 0]}>
            <TurntableBase 
              isPlaying={isPlaying} 
              rpm={rpm} 
              onTogglePlay={onTogglePlay} 
              onToggleRpm={onToggleRpm} 
            />
            <VinylRecord 
              track={track} 
              isPlaying={isPlaying} 
              rpm={rpm}
              onSeek={onSeek}
            />
            <Tonearm isPlaying={isPlaying} progress={playbackProgress} />
          </group>
        </Float>

        <ContactShadows 
          position={[0, -1.2, 0]} 
          opacity={0.7} 
          scale={12} 
          blur={2} 
          far={4} 
        />
        
        {/* GSAP Driven Camera Controller */}
        <CameraController cameraView={cameraView} />
      </Canvas>

      {/* Subtle overlay hint */}
      <div className="absolute bottom-3 left-4 pointer-events-none text-[11px] text-neutral-500 font-mono tracking-wider flex items-center gap-3">
        <span>CLICK GROOVES TO DROP NEEDLE</span>
        <span>&bull;</span>
        <span>CLICK 3D DECK BUTTONS TO CONTROL</span>
      </div>
    </div>
  )
}
