import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2
} from 'lucide-react'
import { SearchDrawer } from './components/search/SearchDrawer'
import { SpotifyEmbedPlayer } from './components/player/SpotifyEmbedPlayer'
import { ListeningRoomSurface } from './components/room/ListeningRoomSurface'
import { openSpotifyHandoff } from './services/spotify/connection'
import {
  pauseEmbedSelection,
  playEmbedSelection,
  restartEmbedSelection,
  safeEmbedErrorMessage
} from './services/spotify/embed'
import type {
  EmbeddedPlaybackSession,
  PlaybackStatus,
  SpotifyAccessMode,
  SpotifyEmbedController,
  SpotifyEmbedEvent,
  SpotifySelection
} from './types/spotify'
import { playSwitchClickSound } from './utils/audioFx'

const INITIAL_PLAYBACK: EmbeddedPlaybackSession = {
  status: 'uninitialized',
  playingUri: null,
  isPaused: true,
  isBuffering: false,
  positionMs: null,
  durationMs: null,
  errorCode: null,
  notice: null
}

function statusLabel(status: PlaybackStatus) {
  if (status === 'uninitialized') return 'Awaiting a record'
  if (status === 'loading') return 'Loading into Spotify'
  if (status === 'ready') return 'Ready to play'
  if (status === 'buffering') return 'Buffering'
  if (status === 'playing') return 'Now playing'
  if (status === 'paused') return 'Paused'
  if (status === 'blocked') return 'Playback blocked'
  if (status === 'error') return 'Needs attention'
  return 'Stopped'
}

function statusTone(status: PlaybackStatus) {
  if (status === 'playing') return 'status-chip--playing'
  if (status === 'error' || status === 'blocked') return 'status-chip--warning'
  if (status === 'loading' || status === 'buffering') return 'status-chip--loading'
  return 'status-chip--quiet'
}

function ControlButton({
  label,
  onClick,
  children,
  disabled = false,
  tone = 'quiet'
}: {
  label: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  tone?: 'quiet' | 'accent'
}) {
  return (
    <button
      type="button"
      className={`player-control player-control--${tone}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function playbackUpdateFromEvent(event: SpotifyEmbedEvent) {
  if (event.type === 'playback_started') return event.update
  if (event.type === 'playback_update') return event.update
  return undefined
}

export function App() {
  const [selection, setSelection] = useState<SpotifySelection | null>(null)
  const [spotifyAccessMode, setSpotifyAccessMode] = useState<SpotifyAccessMode>('hidden')
  const [spotifyPopupBlocked, setSpotifyPopupBlocked] = useState(false)
  const [volume, setVolume] = useState(0.65)
  const [playback, setPlayback] = useState<EmbeddedPlaybackSession>(INITIAL_PLAYBACK)
  const [notice, setNotice] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<{ title: string; creator: string; context: string | null } | null>(null)
  const controllerRef = useRef<SpotifyEmbedController | null>(null)

  const handleSelectSelection = useCallback((nextSelection: SpotifySelection) => {
    setSelection(nextSelection)
    setCurrentTrack({
      title: nextSelection.result.title,
      creator: nextSelection.result.creator,
      context: nextSelection.result.kind === 'track' ? nextSelection.result.albumName : nextSelection.result.title
    })
    const isSpotifyConnected = spotifyAccessMode === 'connected'
    setNotice(isSpotifyConnected
      ? 'Record selected. Waiting for Spotify to confirm the player state.'
      : 'Record selected. Connect Spotify above when you want playback.')
    setPlayback({
      ...INITIAL_PLAYBACK,
      status: isSpotifyConnected ? 'loading' : 'ready',
      notice: isSpotifyConnected
        ? 'Record loaded. Playback starts only after a deliberate action.'
        : 'Playback disconnected. Connect Spotify above when you are ready.'
    })
  }, [spotifyAccessMode])

  const handleConnectSpotify = useCallback(() => {
    playSwitchClickSound()
    const opened = openSpotifyHandoff()
    setSpotifyAccessMode('handoff-started')
    setSpotifyPopupBlocked(!opened)
    setNotice(opened
      ? 'Spotify opened in a new tab. Return here when you are ready.'
      : 'Spotify could not open in a new tab. Use the direct link in the sidebar.')
  }, [])

  const handleEnableSpotifyPlayback = useCallback(() => {
    playSwitchClickSound()
    setSpotifyPopupBlocked(false)
    setSpotifyAccessMode('connected')
    if (selection) {
      setPlayback({
        ...INITIAL_PLAYBACK,
        status: 'loading',
        notice: 'Spotify playback connected. Press play on the room controls when it is ready.'
      })
      setNotice('Spotify playback connected. Press play when it is ready.')
    } else {
      setNotice('Spotify playback connected. Choose a public pressing from the catalog.')
    }
  }, [selection])

  const runControllerCommand = useCallback((command: (controller: SpotifyEmbedController) => void, waitingNotice: string) => {
    const controller = controllerRef.current
    if (!controller) {
      setNotice(waitingNotice)
      return false
    }
    try {
      command(controller)
      return true
    } catch {
      setNotice('Spotify could not complete that action. Try the room control again.')
      return false
    }
  }, [])

  const handleDisconnectSpotifyPlayback = useCallback(() => {
    playSwitchClickSound()
    runControllerCommand(pauseEmbedSelection, 'Spotify playback is still loading. Disconnecting anyway.')
    setSpotifyAccessMode('hidden')
    setPlayback((current) => ({
      ...current,
      status: current.status === 'uninitialized' ? 'uninitialized' : 'paused',
      isPaused: true,
      isBuffering: false,
      notice: 'Spotify playback disconnected. Connect it again when you want playback.'
    }))
    setNotice('Spotify playback disconnected. Your selection is still loaded.')
  }, [runControllerCommand])

  const handleControllerReady = useCallback((controller: SpotifyEmbedController) => {
    controllerRef.current = controller
    setPlayback((current) => current.status === 'loading' ? { ...current, status: 'ready', notice: null } : current)
  }, [])

  const handleControllerDestroyed = useCallback(() => {
    controllerRef.current = null
  }, [])

  const handleEmbedEvent = useCallback((event: SpotifyEmbedEvent) => {
    if (event.type === 'ready') {
      setPlayback((current) => ({ ...current, status: current.status === 'playing' ? 'playing' : 'ready', notice: null }))
      return
    }

    if (event.type === 'playback_error') {
      const status: PlaybackStatus = event.kind === 'blocked' ? 'blocked' : 'error'
      const message = safeEmbedErrorMessage(event.message, event.kind)
      setPlayback((current) => ({
        ...current,
        status,
        isPaused: true,
        isBuffering: false,
        errorCode: `EMBED_${event.kind.toUpperCase()}`,
        notice: message
      }))
      setNotice(message)
      return
    }

    const update = playbackUpdateFromEvent(event)
    if (!update) return

    const status: PlaybackStatus = event.type === 'playback_started'
      ? 'playing'
      : update.isBuffering
        ? 'buffering'
        : update.isPaused
          ? 'paused'
          : 'playing'

    setPlayback((current) => ({
      ...current,
      status,
      playingUri: update.uri ?? current.playingUri,
      isPaused: update.isPaused,
      isBuffering: update.isBuffering,
      positionMs: update.position,
      durationMs: update.duration,
      errorCode: null,
      notice: null
    }))

    if (update.title || update.creator || update.context) {
      setCurrentTrack((current) => ({
        title: update.title ?? current?.title ?? selection?.result.title ?? 'Current track',
        creator: update.creator ?? current?.creator ?? selection?.result.creator ?? 'Spotify',
        context: update.context ?? current?.context ?? null
      }))
    }
  }, [selection])

  const togglePlay = useCallback(() => {
    if (!selection) {
      setNotice('Choose a record from the catalog first.')
      return
    }
    if (spotifyAccessMode !== 'connected') {
      setNotice('Connect Spotify above before starting playback.')
      return
    }
    playSwitchClickSound()
    const command = playback.status === 'playing' ? pauseEmbedSelection : playEmbedSelection
    const started = runControllerCommand(command, 'Spotify playback is still preparing.')
    if (started) setNotice(playback.status === 'playing' ? 'Pause requested. Waiting for Spotify to confirm.' : 'Play requested. Waiting for Spotify to confirm.')
  }, [playback.status, runControllerCommand, selection, spotifyAccessMode])

  const restart = useCallback(() => {
    playSwitchClickSound()
    const completed = runControllerCommand(restartEmbedSelection, 'Connect Spotify before restarting playback.')
    if (completed) {
      setNotice('Playback returned to the beginning.')
      setPlayback((current) => ({ ...current, status: 'ready', isPaused: true, isBuffering: false, positionMs: 0 }))
    }
  }, [runControllerCommand])

  const changeVolume = useCallback(() => {
    playSwitchClickSound()
    setVolume((current) => current >= 0.95 ? 0.15 : Number((current + 0.1).toFixed(2)))
    setNotice('Volume setting changed. Spotify owns audible volume for this session.')
  }, [])

  const displayStatus = selection ? playback.status : 'uninitialized'
  const canControlPlayback = Boolean(selection && spotifyAccessMode === 'connected')

  return (
    <main className="listening-room" aria-label="The Turntables Spotify listening room">
      <SearchDrawer
        onSelectSelection={handleSelectSelection}
        currentSelectionUri={selection?.playbackUri}
        spotifyAccessMode={spotifyAccessMode}
        spotifyPopupBlocked={spotifyPopupBlocked}
        onConnectSpotify={handleConnectSpotify}
        onEnableSpotifyPlayback={handleEnableSpotifyPlayback}
        onDisconnectSpotifyPlayback={handleDisconnectSpotifyPlayback}
      />

      <section className="room-stage" aria-label="2D listening room stage">
        <ListeningRoomSurface
          artworkUrl={selection?.labelArtworkUrl}
          trackTitle={currentTrack?.title}
          artistName={currentTrack?.creator}
          context={currentTrack?.context}
          playbackStatus={displayStatus}
        />

        <div className="stage-status" aria-live="polite">
          <div className={`status-chip ${statusTone(displayStatus)}`}>
            <span className="status-chip__dot" aria-hidden="true" />
            {statusLabel(displayStatus)}
          </div>
          <p>{notice ?? playback.notice ?? 'Search the crate, then connect Spotify when you want to listen.'}</p>
        </div>

        <section className="player-dock" aria-label="Current record and playback controls">
          <div className="player-dock__header">
            <div className="current-record">
              <div className="current-record__art" aria-hidden="true">
                {selection?.labelArtworkUrl ? <img src={selection.labelArtworkUrl} alt="" /> : <span>Ø</span>}
              </div>
              <div className="current-record__copy">
                <span className="current-record__eyebrow">CURRENT PRESSING</span>
                <strong>{currentTrack?.title ?? 'No record selected'}</strong>
                <small>{currentTrack?.creator ?? 'Choose a track or playlist from the catalog'}</small>
              </div>
            </div>

            <div className="player-controls" aria-label="Playback controls">
              <ControlButton label="Previous track is unavailable in the room controls" onClick={() => undefined} disabled>
                <SkipBack aria-hidden="true" />
              </ControlButton>
              <ControlButton label={playback.status === 'playing' ? 'Pause playback' : 'Play playback'} onClick={togglePlay} tone="accent" disabled={!canControlPlayback}>
                {playback.status === 'playing' ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              </ControlButton>
              <ControlButton label="Restart current record" onClick={restart} disabled={!canControlPlayback}>
                <RotateCcw aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Next track is unavailable in the room controls" onClick={() => undefined} disabled>
                <SkipForward aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Shuffle is unavailable in the room controls" onClick={() => undefined} disabled>
                <Shuffle aria-hidden="true" />
              </ControlButton>
            </div>
          </div>

          <div className="player-dock__body">
            {selection && spotifyAccessMode === 'connected' ? (
              <>
                <div className="playback-engine-status" role="status">
                  <span className="playback-engine-status__dot" aria-hidden="true" />
                  {playback.status === 'loading' ? 'Connecting playback…' : 'Playback connected'}
                </div>
                <SpotifyEmbedPlayer
                  key="spotify-embed"
                  uri={selection.playbackUri}
                  onEvent={handleEmbedEvent}
                  onControllerReady={handleControllerReady}
                  onControllerDestroyed={handleControllerDestroyed}
                />
              </>
            ) : (
              <div className="embed-placeholder">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>{selection ? 'Spotify playback is disconnected.' : 'Spotify playback is waiting.'}</strong>
                  <span>{selection ? 'Use the connection rail above to enable the room controls.' : 'Choose a public pressing, then connect when you want playback.'}</span>
                </div>
              </div>
            )}
            <button type="button" className="volume-readout" aria-label={`Volume setting ${Math.round(volume * 100)} percent`} onClick={changeVolume}>
              <Volume2 aria-hidden="true" />
              <span>{String(Math.round(volume * 100)).padStart(3, '0')}</span>
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
