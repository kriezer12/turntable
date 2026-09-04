import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface TurntableCanvasProps {
  isPowered: boolean
  isNeedleDown: boolean
  volume: number
  onTogglePower: () => void
  onToggleNeedle: () => void
  onChangeVolume: () => void
}

// ─── Camera ──────────────────────────────────────────────────────────────
function FixedCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 7.4, 8.3)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

// ─── Album art texture (procedural placeholder) ──────────────────────────
function useAlbumArtTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext('2d')!

    const grad = ctx.createLinearGradient(0, 0, 640, 640)
    grad.addColorStop(0, '#d9cab0')
    grad.addColorStop(0.42, '#8e725f')
    grad.addColorStop(0.43, '#1d2525')
    grad.addColorStop(1, '#070b0d')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 640, 640)

    ctx.fillStyle = 'rgba(245, 231, 204, .76)'
    ctx.beginPath()
    ctx.arc(492, 116, 82, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f5ecdc'
    ctx.font = '600 36px Georgia'
    ctx.textAlign = 'center'
    ctx.fillText('YOUR ALBUM', 320, 492)
    ctx.font = '18px Arial'
    ctx.fillText('cover placeholder', 320, 530)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
}

// ─── Scale helper: scale model to target width, ground at y=0 ────────────
function useScaledModel(path: string, targetWidth: number) {
  const { scene } = useGLTF(path)
  return useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const currentWidth = Math.max(size.x, size.z)
    const s = targetWidth / currentWidth

    // Scale from center, then shift so bottom sits at y=0
    clone.scale.setScalar(s)
    clone.position.set(-center.x * s, -box.min.y * s, -center.z * s)

    return { clone, scaledSize: new THREE.Vector3(size.x * s, size.y * s, size.z * s) }
  }, [scene, targetWidth])
}

// ─── Shared vinyls GLTF context ──────────────────────────────────────────
// Both VinylsStack and SpinningVinyl need the vinyls model.
// Use a module-level cache to avoid double-loading.
const vinylsCache: { scene: THREE.Group | null } = { scene: null }

function useVinylsScene() {
  const { scene } = useGLTF('/models/vinyls_4.glb')
  if (!vinylsCache.scene) {
    vinylsCache.scene = scene
  }
  return vinylsCache.scene
}

// ─── Spinning vinyl from the vinyls_4.glb model ─────────────────────────
function SpinningVinyl({ isSpinning, platterY }: { isSpinning: boolean; platterY: number }) {
  const group = useRef<THREE.Group>(null)
  const speed = useRef(0)
  const vinylsScene = useVinylsScene()

  // Find a disc-shaped mesh
  const vinylMesh = useMemo((): THREE.Object3D | null => {
    if (!vinylsScene) return null
    let found: THREE.Object3D | null = null
    vinylsScene.traverse((child) => {
      if (found) return
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry
        if (geo instanceof THREE.CylinderGeometry || geo instanceof THREE.CircleGeometry) {
          found = child
        }
      }
    })
    if (!found) {
      vinylsScene.traverse((child) => {
        if (!found && child instanceof THREE.Mesh) found = child
      })
    }
    return found
  }, [vinylsScene])

  // Auto-scale to match a 12" record (~30cm diameter → ~1.3 in scene units)
  const vinylScale = useMemo(() => {
    if (!vinylMesh) return 1
    const geo = (vinylMesh as THREE.Mesh).geometry
    if (geo instanceof THREE.CylinderGeometry) {
      const r = (geo as any).parameters?.radiusTop || 1
      return 1.3 / (r * 2) // diameter to radius
    }
    const box = new THREE.Box3().setFromObject(vinylMesh)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.z)
    return maxDim > 0 ? 2.6 / maxDim : 1
  }, [vinylMesh])

  useFrame((_, delta) => {
    if (!group.current) return
    speed.current = THREE.MathUtils.damp(speed.current, isSpinning ? 1.55 : 0, 5, delta)
    group.current.rotation.y += speed.current * delta
  })

  if (!vinylMesh) return null

  return (
    <group ref={group} position={[0, platterY, 0]}>
      <primitive object={vinylMesh.clone()} scale={vinylScale} />
    </group>
  )
}

// ─── Tonearm click overlay (invisible, captures clicks) ──────────────────
function TonearmOverlay({ onToggle }: { onToggle: () => void }) {
  return (
    <group position={[1.95, 0.9, -1.0]} rotation={[0, -0.3, 0]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <boxGeometry args={[0.6, 0.4, 2.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}

// ─── Album sleeve (procedural texture on a box) ─────────────────────────
function AlbumSleeve() {
  const texture = useAlbumArtTexture()
  return (
    <group position={[-3.55, 1.1, -1.65]} rotation={[0.02, 0.22, -0.07]}>
      <mesh castShadow>
        <boxGeometry args={[2.3, 2.3, 0.09]} />
        <meshStandardMaterial map={texture} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, -0.055]}>
        <boxGeometry args={[2.43, 2.43, 0.025]} />
        <meshStandardMaterial color="#d2c6b2" roughness={0.82} />
      </mesh>
    </group>
  )
}

// ─── Real-world size ratios (console = reference) ────────────────────────
// Console: ~145cm wide → targetWidth = 6
// Turntable: ~43cm wide → 6 * (43/145) = 1.78
// Speaker: ~18cm wide → 6 * (18/145) = 0.74
// Vinyl: ~30cm diameter → 6 * (30/145) = 1.24
const CONSOLE_W = 6
const TURNTABLE_W = 1.78
const SPEAKER_W = 0.74
const VINYL_W = 1.24

function ConsoleTable() {
  const { clone } = useScaledModel('/models/zenith_console_-_mid_century_modern.glb', CONSOLE_W)
  return <primitive object={clone} position={[0, 0, 0]} />
}

function TurntableModel() {
  const { clone } = useScaledModel('/models/yamaha_tt-300_record_player.glb', TURNTABLE_W)
  // Place on top of console (console top is at scaledSize.y of the console)
  // Console height ≈ 6 * (66/145) ≈ 2.73
  const consoleTopY = CONSOLE_W * (66 / 145)
  return <primitive object={clone} position={[0, consoleTopY, 0]} />
}

function Speaker({ side }: { side: 'left' | 'right' }) {
  const { clone } = useScaledModel('/models/microlab_solo_5c_speakers.glb', SPEAKER_W)
  const x = side === 'left' ? -3.8 : 3.8
  if (side === 'right') clone.scale.x *= -1
  return <primitive object={clone} position={[x, 0, 0.5]} />
}

function VinylsStack() {
  const { clone } = useScaledModel('/models/vinyls_4.glb', VINYL_W)
  return <primitive object={clone} position={[2.8, 0, -1.5]} rotation={[0, 0.4, 0]} />
}

// ─── Deck (assembled scene) ──────────────────────────────────────────────
function Deck({ isPowered, isNeedleDown, onToggleNeedle }: TurntableCanvasProps) {
  const consoleTopY = CONSOLE_W * (66 / 145)
  const turntableTopY = consoleTopY + TURNTABLE_W * (38 / 43) // approx turntable height
  const platterY = turntableTopY - 0.1 // slightly below top surface

  return (
    <group>
      <ConsoleTable />
      <TurntableModel />
      <Speaker side="left" />
      <Speaker side="right" />
      <VinylsStack />
      <SpinningVinyl isSpinning={isPowered && isNeedleDown} platterY={platterY} />
      <TonearmOverlay onToggle={onToggleNeedle} />
      <AlbumSleeve />
    </group>
  )
}

// ─── Full scene ──────────────────────────────────────────────────────────
function TabletopScene(props: TurntableCanvasProps) {
  return (
    <>
      <color attach="background" args={['#29221d']} />
      <fog attach="fog" args={['#29221d', 10, 24]} />
      <ambientLight intensity={1.1} />
      <spotLight
        position={[-4, 8, 4]}
        angle={0.56}
        penumbra={0.65}
        intensity={480}
        color="#f5d2a4"
        castShadow
      />
      <pointLight position={[4, 3, -2]} intensity={22} color="#e6aa69" distance={7} />

      {/* Floor */}
      <mesh position={[0, -0.42, 0]} receiveShadow>
        <boxGeometry args={[15, 0.7, 11]} />
        <meshStandardMaterial color="#7a4a2f" roughness={0.62} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, -0.055, -4.9]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 4]} />
        <meshStandardMaterial color="#362a24" roughness={0.95} />
      </mesh>

      <Deck {...props} />
      <ContactShadows position={[0, -0.05, 0]} opacity={0.55} scale={11} blur={2.8} far={5} />
      <Environment preset="apartment" />
      <FixedCamera />
    </>
  )
}

// ─── Exported canvas wrapper ─────────────────────────────────────────────
export function TurntableCanvas(props: TurntableCanvasProps) {
  return (
    <div className="turntable-canvas">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 39, position: [0, 7.4, 8.3] }}
      >
        <Suspense fallback={null}>
          <TabletopScene {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Preload models
useGLTF.preload('/models/yamaha_tt-300_record_player.glb')
useGLTF.preload('/models/zenith_console_-_mid_century_modern.glb')
useGLTF.preload('/models/microlab_solo_5c_speakers.glb')
useGLTF.preload('/models/vinyls_4.glb')
