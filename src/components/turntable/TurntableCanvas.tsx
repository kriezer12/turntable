import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useVinylLabelTexture } from './useVinylLabelTexture'

interface TurntableCanvasProps {
  isPowered: boolean
  isNeedleDown: boolean
  isRecordSpinning: boolean
  volume: number
  artworkUrl?: string
  trackTitle?: string
  artistName?: string
  onTogglePower: () => void
  onToggleNeedle: () => void
  onChangeVolume: () => void
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return reducedMotion
}

function FixedCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 7.4, 8.3)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

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

function Tonearm({ isDown, onToggle }: { isDown: boolean; onToggle: () => void }) {
  const armRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!armRef.current) return
    const target = isDown ? -0.06 : 0.2
    armRef.current.rotation.z = THREE.MathUtils.damp(armRef.current.rotation.z, target, 8, delta)
  })

  return (
    <group position={[1.02, 3.32, -0.48]} rotation={[0, -0.26, 0]}>
      <mesh position={[0, -0.06, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
        <meshStandardMaterial color="#22252a" metalness={0.8} roughness={0.26} />
      </mesh>
      <group ref={armRef}>
        <mesh position={[0, 0.04, -0.58]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 1.2, 16]} />
          <meshStandardMaterial color="#c3c1b9" metalness={0.82} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.03, -1.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.06, 0.22, 16]} />
          <meshStandardMaterial color="#3c4044" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.02, -1.19]} castShadow>
          <boxGeometry args={[0.12, 0.08, 0.18]} />
          <meshStandardMaterial color="#d3a849" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <mesh
        position={[0, 0.06, -0.58]}
        onClick={(event) => { event.stopPropagation(); onToggle() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <boxGeometry args={[0.36, 0.3, 1.4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function TurntableModel({
  isNeedleDown,
  onToggleNeedle,
  onTogglePower,
  onChangeVolume
}: Pick<TurntableCanvasProps, 'isNeedleDown' | 'onToggleNeedle' | 'onTogglePower' | 'onChangeVolume'>) {
  const { scene } = useGLTF('/models/yamaha_tt-300_record_player.glb')

  const clone = useMemo(() => {
    const clonedScene = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clonedScene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 4.5 / Math.max(size.x, size.z)
    clonedScene.scale.setScalar(scale)
    clonedScene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
    return clonedScene
  }, [scene])

  return (
    <group position={[0, 2.75, 0]}>
      <primitive object={clone} />
      <Tonearm isDown={isNeedleDown} onToggle={onToggleNeedle} />
      <mesh
        position={[-1.45, 0.33, 0.52]}
        onClick={(event) => { event.stopPropagation(); onTogglePower() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <boxGeometry args={[0.42, 0.42, 0.48]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh
        position={[0.82, 0.33, 0.58]}
        onClick={(event) => { event.stopPropagation(); onChangeVolume() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.45, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function Table() {
  const woodColor = '#5a3a22'
  const legColor = '#4a2e18'

  return (
    <group>
      <mesh position={[0, 2.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.15, 3.2]} />
        <meshStandardMaterial color={woodColor} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.62, 1.6]}>
        <boxGeometry args={[5.5, 0.06, 0.06]} />
        <meshStandardMaterial color={legColor} roughness={0.6} />
      </mesh>
      {[
        [-2.5, 1.35, -1.4],
        [2.5, 1.35, -1.4],
        [-2.5, 1.35, 1.4],
        [2.5, 1.35, 1.4]
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow>
          <boxGeometry args={[0.12, 2.7, 0.12]} />
          <meshStandardMaterial color={legColor} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[4.8, 0.08, 0.08]} />
        <meshStandardMaterial color={legColor} roughness={0.6} />
      </mesh>
    </group>
  )
}

function SpinningVinyl({
  isSpinning,
  artworkUrl,
  trackTitle,
  artistName,
  reducedMotion
}: {
  isSpinning: boolean
  artworkUrl?: string
  trackTitle?: string
  artistName?: string
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const speed = useRef(0)
  const labelTexture = useVinylLabelTexture({ artworkUrl, trackTitle, artistName })

  useFrame((_, delta) => {
    if (!group.current) return
    const targetSpeed = reducedMotion ? 0 : isSpinning ? 1.55 : 0
    speed.current = THREE.MathUtils.damp(speed.current, targetSpeed, 5, delta)
    group.current.rotation.y += speed.current * delta
  })

  return (
    <group ref={group} position={[0, 2.88, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.03, 64]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 64]} />
        <meshStandardMaterial map={labelTexture} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}

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

function Deck(props: TurntableCanvasProps) {
  const reducedMotion = useReducedMotionPreference()
  return (
    <group>
      <Table />
      <TurntableModel
        isNeedleDown={props.isNeedleDown}
        onToggleNeedle={props.onToggleNeedle}
        onTogglePower={props.onTogglePower}
        onChangeVolume={props.onChangeVolume}
      />
      <SpinningVinyl
        isSpinning={props.isRecordSpinning}
        artworkUrl={props.artworkUrl}
        trackTitle={props.trackTitle}
        artistName={props.artistName}
        reducedMotion={reducedMotion}
      />
      <AlbumSleeve />
    </group>
  )
}

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
      <mesh position={[0, -0.42, 0]} receiveShadow>
        <boxGeometry args={[15, 0.7, 11]} />
        <meshStandardMaterial color="#7a4a2f" roughness={0.62} />
      </mesh>
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

export function TurntableCanvas(props: TurntableCanvasProps) {
  return (
    <div className="turntable-canvas" aria-label="Interactive 3D turntable">
      <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 39, position: [0, 7.4, 8.3] }}>
        <Suspense fallback={null}>
          <TabletopScene {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/yamaha_tt-300_record_player.glb')
