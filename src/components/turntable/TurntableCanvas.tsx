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

// ─── Album art texture ───────────────────────────────────────────────────
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

// ─── Yamaha TT-300 (the only imported model) ─────────────────────────────
function TurntableModel({ onToggleNeedle }: { onToggleNeedle: () => void }) {
  const { scene } = useGLTF('/models/yamaha_tt-300_record_player.glb')

  const clone = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    // Scale to ~4.5 units wide
    const s = 4.5 / Math.max(size.x, size.z)
    c.scale.setScalar(s)
    c.position.set(-center.x * s, -box.min.y * s, -center.z * s)
    return c
  }, [scene])

  return (
    <group position={[0, 2.75, 0]}>
      <primitive object={clone} />
      {/* Invisible tonearm click overlay */}
      <mesh
        position={[1.0, 0.4, -0.45]}
        rotation={[0, -0.3, 0]}
        onClick={(e) => { e.stopPropagation(); onToggleNeedle() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <boxGeometry args={[0.3, 0.2, 1.3]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}

// ─── Procedural table ────────────────────────────────────────────────────
function Table() {
  const woodColor = '#5a3a22'
  const legColor = '#4a2e18'

  return (
    <group>
      {/* Tabletop */}
      <mesh position={[0, 2.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.15, 3.2]} />
        <meshStandardMaterial color={woodColor} roughness={0.55} />
      </mesh>
      {/* Front edge trim */}
      <mesh position={[0, 2.62, 1.6]}>
        <boxGeometry args={[5.5, 0.06, 0.06]} />
        <meshStandardMaterial color={legColor} roughness={0.6} />
      </mesh>
      {/* Legs */}
      {[
        [-2.5, 1.35, -1.4],
        [2.5, 1.35, -1.4],
        [-2.5, 1.35, 1.4],
        [2.5, 1.35, 1.4],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.12, 2.7, 0.12]} />
          <meshStandardMaterial color={legColor} roughness={0.6} />
        </mesh>
      ))}
      {/* Cross brace */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[4.8, 0.08, 0.08]} />
        <meshStandardMaterial color={legColor} roughness={0.6} />
      </mesh>
    </group>
  )
}

// ─── Procedural spinning vinyl ───────────────────────────────────────────
function SpinningVinyl({ isSpinning }: { isSpinning: boolean }) {
  const group = useRef<THREE.Group>(null)
  const speed = useRef(0)
  const labelTexture = useAlbumArtTexture()

  useFrame((_, delta) => {
    if (!group.current) return
    speed.current = THREE.MathUtils.damp(speed.current, isSpinning ? 1.55 : 0, 5, delta)
    group.current.rotation.y += speed.current * delta
  })

  return (
    <group ref={group} position={[0, 2.88, 0]}>
      {/* Vinyl disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.03, 64]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Center label */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 64]} />
        <meshStandardMaterial map={labelTexture} roughness={0.7} />
      </mesh>
      {/* Center hole */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}

// ─── Procedural album sleeve ─────────────────────────────────────────────
function AlbumSleeve() {
  const texture = useAlbumArtTexture()
  return (
    <group position={[-3.4, 1.1, -1.4]} rotation={[0.02, 0.22, -0.07]}>
      <mesh castShadow>
        <boxGeometry args={[2.1, 2.1, 0.08]} />
        <meshStandardMaterial map={texture} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[2.2, 2.2, 0.02]} />
        <meshStandardMaterial color="#d2c6b2" roughness={0.82} />
      </mesh>
    </group>
  )
}

// ─── Deck (assembled scene) ──────────────────────────────────────────────
function Deck({ isPowered, isNeedleDown, onToggleNeedle }: TurntableCanvasProps) {
  return (
    <group>
      <Table />
      <TurntableModel onToggleNeedle={onToggleNeedle} />
      <SpinningVinyl isSpinning={isPowered && isNeedleDown} />
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

useGLTF.preload('/models/yamaha_tt-300_record_player.glb')
