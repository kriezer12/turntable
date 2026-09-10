import { Disc3, Music2, Radio } from 'lucide-react'
import type { PlaybackStatus } from '../../types/spotify'

interface ListeningRoomSurfaceProps {
  artworkUrl?: string | null
  trackTitle?: string
  artistName?: string
  context?: string | null
  playbackStatus: PlaybackStatus
}

export function ListeningRoomSurface({
  artworkUrl,
  trackTitle,
  artistName,
  context,
  playbackStatus
}: ListeningRoomSurfaceProps) {
  const isPlaying = playbackStatus === 'playing'

  return (
    <div className="flat-room" aria-label="2D listening room surface">
      <div className="flat-room__grid" aria-hidden="true" />
      <div className="flat-room__header">
        <span>LISTENING ROOM / 02</span>
        <span className="flat-room__header-line" />
        <span>FLAT PRESSING</span>
      </div>

      <div className="flat-room__copy">
        <span className="flat-room__kicker"><Radio aria-hidden="true" /> Spotify listening room</span>
        <h1>{trackTitle ?? 'Start with a clean side.'}</h1>
        <p>{artistName ? `${artistName}${context ? ` · ${context}` : ''}` : 'Choose a public Spotify pressing from the catalog.'}</p>
      </div>

      <div className={`flat-record${isPlaying ? ' flat-record--playing' : ''}`} aria-label={isPlaying ? 'Record artwork, currently playing' : 'Record artwork, paused'}>
        <div className="flat-record__grooves" aria-hidden="true" />
        <div className="flat-record__label">
          {artworkUrl ? (
            <img src={artworkUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          ) : (
            <Disc3 aria-hidden="true" />
          )}
          <span className="flat-record__hole" aria-hidden="true" />
        </div>
      </div>

      <div className="flat-room__footer">
        <span><Music2 aria-hidden="true" /> Flat listening surface</span>
        <span>THE TURN­TABLES / ORIGINAL SURFACE</span>
      </div>
    </div>
  )
}
