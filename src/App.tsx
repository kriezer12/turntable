import { useState, useCallback, useEffect } from 'react'
import { Disc, Play, Pause, Radio, Menu, Eye, Volume2 } from 'lucide-react'
import { TurntableCanvas, type CameraViewPreset } from './components/turntable/TurntableCanvas'
import { SearchDrawer } from './components/search/SearchDrawer'
import { SpotifyEmbedPlayer } from './components/player/SpotifyEmbedPlayer'
import type { SpotifyTrack, SpotifyEmbedController } from './types/spotify'
import { playNeedleDropSound, playSwitchClickSound } from './utils/audioFx'

const INITIAL_DEMO_TRACK: SpotifyTrack = {
  id: '4cOdK2wGLETKBW3PvgPWqT',
  name: 'Dreams',
  artists: [{ name: 'Fleetwood Mac' }],
  album: {
    name: 'Rumours',
    images: [
      { url: 'https://i.scdn.co/image/ab67616d0000b273e970a2569566ba7b746813a3', width: 640, height: 640 },
      { url: 'https://i.scdn.co/image/ab67616d00001e02e970a2569566ba7b746813a3', width: 300, height: 300 }
    ]
  },
  duration_ms: 257800,
  uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
  type: 'track'
}

// Bouncing Analog Stereo VU-Meter Component
function VuMeter({ isPlaying }: { isPlaying: boolean }) {
  const [leftLevel, setLeftLevel] = useState(12)
  const [rightLevel, setRightLevel] = useState(10)

  useEffect(() => {
    if (!isPlaying) {
      setLeftLevel(4)
      setRightLevel(4)
      return
    }

    const interval = setInterval(() => {
      // Dynamic bouncing needle simulation
      const base = 45 + Math.random() * 35
      setLeftLevel(Math.min(95, Math.max(10, base + (Math.random() * 20 - 10))))
      setRightLevel(Math.min(95, Math.max(10, base + (Math.random() * 20 - 10))))
    }, 120)

    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 bg-[#141620] rounded-lg border border-white/5 font-mono text-[9px] text-neutral-400">
      <div className="flex items-center gap-1">
        <span className="text-neutral-500 font-bold">L</span>
        <div className="w-12 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-100"
            style={{ width: `${leftLevel}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-neutral-500 font-bold">R</span>
        <div className="w-12 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-100"
            style={{ width: `${rightLevel}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function App() {
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack>(INITIAL_DEMO_TRACK)
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [positionMs, setPositionMs] = useState(0)
  const [durationMs, setDurationMs] = useState(INITIAL_DEMO_TRACK.duration_ms)
  const [controller, setController] = useState<SpotifyEmbedController | null>(null)
  const [rpm, setRpm] = useState<'33' | '45'>('33')
  const [cameraView, setCameraView] = useState<CameraViewPreset>('isometric')

  const handlePlaybackUpdate = useCallback((state: {
    isPaused: boolean
    isBuffering: boolean
    position: number
    duration: number
  }) => {
    setIsPlaying(!state.isPaused)
    setPositionMs(state.position)
    if (state.duration > 0) {
      setDurationMs(state.duration)
      setPlaybackProgress(state.position / state.duration)
    }
  }, [])

  const handleSelectTrack = (track: SpotifyTrack) => {
    playSwitchClickSound()
    playNeedleDropSound()
    setCurrentTrack(track)
    setPositionMs(0)
    setPlaybackProgress(0)
    setDurationMs(track.duration_ms || 180000)
    // Dolly in camera slightly on track selection
    if (cameraView === 'isometric') {
      setCameraView('macro')
      setTimeout(() => setCameraView('isometric'), 2400)
    }
  }

  const togglePlayback = useCallback(() => {
    playSwitchClickSound()
    if (!isPlaying) {
      playNeedleDropSound()
    }
    if (controller) {
      controller.togglePlay()
    } else {
      setIsPlaying(prev => !prev)
    }
  }, [controller, isPlaying])

  const toggleRpm = useCallback(() => {
    playSwitchClickSound()
    setRpm(prev => prev === '33' ? '45' : '33')
  }, [])

  const handleSeek = (progressFraction: number) => {
    const clampedProgress = Math.max(0, Math.min(1, progressFraction))
    const targetMs = clampedProgress * (durationMs || currentTrack.duration_ms || 180000)
    setPlaybackProgress(clampedProgress)
    setPositionMs(targetMs)
    if (controller) {
      controller.seek(Math.floor(targetMs / 1000))
    }
  }

  // Keyboard Shortcuts (Space to play/pause, C for Crate, 1-4 for camera)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayback()
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        playSwitchClickSound()
        setIsDrawerOpen(prev => !prev)
      } else if (e.key === '1') {
        setCameraView('isometric')
      } else if (e.key === '2') {
        setCameraView('top')
      } else if (e.key === '3') {
        setCameraView('macro')
      } else if (e.key === '4') {
        setCameraView('front')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayback])

  const formatTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000))
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen max-h-screen max-w-full flex flex-col overflow-hidden bg-[#0a0c12] text-neutral-100 font-sans select-none">
      {/* Top Brushed Hi-Fi Bar */}
      <header className="h-14 shrink-0 border-b border-white/5 bg-[#0f1118]/90 backdrop-blur-md px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              playSwitchClickSound()
              setIsDrawerOpen(!isDrawerOpen)
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-mono uppercase tracking-wider"
            title="Toggle Vinyl Crate (Key: C)"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Crate</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Disc className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            </div>
            <div className="flex items-center">
              <span className="font-heading font-extrabold tracking-tight text-base text-white">THE TURNTABLES</span>
              <span className="hidden sm:inline-block text-[10px] font-mono ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Direct Browser Audio
              </span>
            </div>
          </div>
        </div>

        {/* Center: Camera View Perspective Switcher */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-[#141620] rounded-lg border border-white/5 text-[11px] font-mono">
          <span className="px-1.5 text-neutral-500 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>VIEW:</span>
          </span>
          {(['isometric', 'top', 'macro', 'front'] as CameraViewPreset[]).map((v, i) => (
            <button
              key={v}
              onClick={() => {
                playSwitchClickSound()
                setCameraView(v)
              }}
              className={`px-2 py-0.5 rounded capitalize transition-all ${
                cameraView === v 
                  ? 'bg-amber-400 text-black font-semibold shadow-sm' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Key ${i + 1}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Right: Tactile Status, VU Meter & RPM */}
        <div className="flex items-center gap-3 lg:gap-4">
          <VuMeter isPlaying={isPlaying} />

          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span className="text-neutral-500 hidden sm:inline">SPEED:</span>
            <button 
              onClick={toggleRpm}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-amber-400 border border-white/5 font-semibold text-xs transition-colors"
            >
              {rpm} RPM
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-600'}`} />
            <span className="text-neutral-400 text-[11px] uppercase tracking-wider">
              {isPlaying ? 'PLAYING' : 'STANDBY'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Area (Strictly zero viewport scroll) */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Search / Vinyl Crate Drawer */}
        <div 
          className={`transition-all duration-300 ease-in-out z-10 h-full overflow-hidden shrink-0 ${
            isDrawerOpen ? 'w-80 md:w-96' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden opacity-0 pointer-events-none'
          }`}
        >
          <SearchDrawer 
            onSelectTrack={handleSelectTrack} 
            currentTrackId={currentTrack?.id} 
          />
        </div>

        {/* 3D Turntable Center Stage */}
        <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-radial from-[#151824] via-[#0d0f15] to-[#07080b]">
          {/* Active Track Overlay Banner */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none max-w-sm">
            <div className="glass-panel px-3.5 py-2.5 rounded-xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] tracking-wider uppercase mb-0.5">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Now On Turntable</span>
              </div>
              <h2 className="text-base font-bold text-white truncate tracking-tight">
                {currentTrack.name}
              </h2>
              <p className="text-[11px] text-neutral-400 truncate">
                {currentTrack.artists.map(a => a.name).join(', ')} &bull; {currentTrack.album.name}
              </p>
            </div>
          </div>

          {/* 3D Turntable Scene (Fills remaining height perfectly) */}
          <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden">
            <TurntableCanvas 
              track={currentTrack} 
              isPlaying={isPlaying} 
              playbackProgress={playbackProgress} 
              rpm={rpm}
              cameraView={cameraView}
              onSeek={handleSeek}
              onTogglePlay={togglePlayback}
              onToggleRpm={toggleRpm}
            />
          </div>

          {/* Fixed-Height Bottom Audio Transport & Spotify Embed Player */}
          <div className="shrink-0 h-[96px] border-t border-white/5 bg-[#0f1118]/95 backdrop-blur-xl px-4 py-2 flex items-center justify-between gap-4 z-20">
            {/* Custom Transport Controls */}
            <div className="flex items-center gap-3 shrink-0 min-w-0">
              <button
                onClick={togglePlayback}
                className="w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform active:scale-95 shrink-0"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="hidden sm:block min-w-0">
                <div className="text-xs font-semibold text-white truncate max-w-[140px] lg:max-w-[190px]">
                  {currentTrack.name}
                </div>
                <div className="text-[11px] text-neutral-400 truncate max-w-[140px] lg:max-w-[190px]">
                  {currentTrack.artists[0]?.name}
                </div>
              </div>
            </div>

            {/* Tactile Needle Position Scrubber */}
            <div className="hidden md:flex flex-col flex-1 max-w-xs px-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                <span>{formatTime(positionMs)}</span>
                <span className="text-[9px] text-amber-400/80 uppercase tracking-widest flex items-center gap-1">
                  <Volume2 className="w-2.5 h-2.5" />
                  <span>NEEDLE POSITION</span>
                </span>
                <span>{formatTime(durationMs)}</span>
              </div>
              <div 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const frac = (e.clientX - rect.left) / rect.width
                  playNeedleDropSound()
                  handleSeek(frac)
                }}
                className="w-full h-2 bg-[#1b1e2a] rounded-full overflow-hidden cursor-pointer relative group border border-white/5"
                title="Click to place needle"
              >
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100 relative"
                  style={{ width: `${Math.min(100, Math.max(0, playbackProgress * 100))}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_6px_#f59e0b] border border-amber-500 scale-0 group-hover:scale-100 transition-transform" />
                </div>
              </div>
            </div>

            {/* Compact Spotify Embed IFrame (Plays audio directly in browser) */}
            <div className="flex-1 max-w-md lg:max-w-lg h-[80px] overflow-hidden">
              <SpotifyEmbedPlayer
                uri={currentTrack.uri}
                onPlaybackUpdate={handlePlaybackUpdate}
                onControllerReady={setController}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
