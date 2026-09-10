import { ExternalLink, Link2Off, Music2, Radio } from 'lucide-react'
import { SPOTIFY_WEB_URL } from '../../services/spotify/connection'
import type { SpotifyAccessMode } from '../../types/spotify'

interface SpotifyConnectionRailProps {
  mode: SpotifyAccessMode
  popupBlocked: boolean
  onConnect: () => void
  onEnable: () => void
  onDisconnect: () => void
}

export function SpotifyConnectionRail({
  mode,
  popupBlocked,
  onConnect,
  onEnable,
  onDisconnect
}: SpotifyConnectionRailProps) {
  const isConnected = mode === 'connected'
  const isHandoffStarted = mode === 'handoff-started'

  return (
    <section className={`connection-rail connection-rail--${mode}`} aria-label="Spotify playback connection">
      <div className="connection-rail__identity">
        <span className="connection-rail__mark" aria-hidden="true"><Music2 /></span>
        <div>
          <span className="connection-rail__eyebrow">SPOTIFY PLAYBACK</span>
          <strong>{isConnected ? 'Playback connected' : isHandoffStarted ? 'Return from Spotify' : 'Playback disconnected'}</strong>
        </div>
      </div>

      {isConnected ? (
        <button type="button" className="connection-rail__action" onClick={onDisconnect}>
          <Link2Off aria-hidden="true" />
          Disconnect playback
        </button>
      ) : isHandoffStarted ? (
        <div className="connection-rail__actions">
          <button type="button" className="connection-rail__action" onClick={onEnable}>
            <Radio aria-hidden="true" />
            I’m back · enable playback
          </button>
          <a className="connection-rail__external" href={SPOTIFY_WEB_URL} target="_blank" rel="noreferrer">
            Open again <ExternalLink aria-hidden="true" />
          </a>
        </div>
      ) : (
        <button type="button" className="connection-rail__action connection-rail__action--connect" onClick={onConnect}>
          Connect Spotify
          <ExternalLink aria-hidden="true" />
        </button>
      )}

      {(isHandoffStarted || popupBlocked) && (
        <p className="connection-rail__note" role={popupBlocked ? 'alert' : 'status'}>
          {popupBlocked ? (
            <>Your browser blocked the new tab. <a href={SPOTIFY_WEB_URL} target="_blank" rel="noreferrer">Open Spotify directly</a>.</>
          ) : (
            'Sign in or manage entitlement on Spotify, then return here.'
          )}
        </p>
      )}
    </section>
  )
}
