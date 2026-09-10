import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Clock3,
  Disc3,
  ListMusic,
  Music2,
  RefreshCcw,
  Search,
  Sparkles
} from 'lucide-react'
import {
  CatalogSearchError,
  DEFAULT_TYPES,
  DEMO_CATALOG_ITEMS,
  searchCatalog
} from '../../services/spotify/catalog'
import type { CatalogResult, CatalogSearchStatus, SpotifyAccessMode, SpotifySelection } from '../../types/spotify'
import { SpotifyConnectionRail } from './SpotifyConnectionRail'

interface SearchDrawerProps {
  onSelectSelection: (selection: SpotifySelection) => void
  currentSelectionUri?: string | null
  spotifyAccessMode: SpotifyAccessMode
  spotifyPopupBlocked: boolean
  onConnectSpotify: () => void
  onEnableSpotifyPlayback: () => void
  onDisconnectSpotifyPlayback: () => void
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return 'CONTEXT'
  const totalSeconds = Math.floor(durationMs / 1000)
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function kindLabel(kind: CatalogResult['kind']) {
  if (kind === 'playlist') return 'Playlist'
  if (kind === 'album') return 'Album'
  if (kind === 'artist') return 'Artist'
  return 'Track'
}

function createSelection(result: CatalogResult): SpotifySelection {
  return {
    result,
    selectedAt: Date.now(),
    labelArtworkUrl: result.imageUrl,
    playbackUri: result.uri,
    contextUri: result.contextUri
  }
}

export function SearchDrawer({
  onSelectSelection,
  currentSelectionUri,
  spotifyAccessMode,
  spotifyPopupBlocked,
  onConnectSpotify,
  onEnableSpotifyPlayback,
  onDisconnectSpotifyPlayback
}: SearchDrawerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogResult[]>(DEMO_CATALOG_ITEMS)
  const [status, setStatus] = useState<CatalogSearchStatus>('results')
  const [error, setError] = useState<string | null>(null)
  const [demoNotice, setDemoNotice] = useState<string | null>('Demo crate loaded · search to browse Spotify')
  const [lastQuery, setLastQuery] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) {
        setResults(DEMO_CATALOG_ITEMS)
        setStatus('results')
        setError(null)
        setLastQuery('')
        setDemoNotice('Demo crate loaded · search to browse Spotify')
        return
      }

      setStatus('searching')
      setError(null)
      setLastQuery(trimmedQuery)
      try {
        const response = await searchCatalog(trimmedQuery, {
          types: DEFAULT_TYPES,
          limit: 10,
          offset: 0,
          signal: controller.signal
        })
        setResults(response.items)
        setStatus(response.items.length > 0 ? 'results' : 'no-results')
        setDemoNotice(response.isDemoMode ? response.message ?? 'Demo mode' : null)
      } catch (cause) {
        if (controller.signal.aborted) return
        const message = cause instanceof CatalogSearchError
          ? cause.message
          : 'Catalog search is unavailable. Check your connection and retry.'
        setError(message)
        setResults([])
        setStatus('error')
        setDemoNotice(null)
      }
    }, 320)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const retrySearch = () => {
    setQuery('')
    window.requestAnimationFrame(() => setQuery(lastQuery))
  }

  return (
    <aside className="catalog-panel" aria-label="Spotify catalog search">
      <header className="catalog-header">
        <div className="catalog-kicker">
          <span className="catalog-kicker__dot" aria-hidden="true" />
          THE TURNTABLES / 01
        </div>
        <div className="catalog-heading-row">
          <div>
            <h1>Find your side</h1>
            <p>Public Spotify catalog · custom controls stay here</p>
          </div>
          <div className="catalog-mark" aria-hidden="true"><Disc3 /></div>
        </div>
      </header>

      <SpotifyConnectionRail
        mode={spotifyAccessMode}
        popupBlocked={spotifyPopupBlocked}
        onConnect={onConnectSpotify}
        onEnable={onEnableSpotifyPlayback}
        onDisconnect={onDisconnectSpotifyPlayback}
      />

      <form className="catalog-search" onSubmit={(event) => event.preventDefault()}>
        <Search className="catalog-search__icon" aria-hidden="true" />
        <label className="sr-only" htmlFor="catalog-query">Search Spotify catalog</label>
        <input
          id="catalog-query"
          type="search"
          value={query}
          maxLength={120}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a song, artist, album..."
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="catalog-search__clear"
            aria-label="Clear catalog search"
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
      </form>

      {demoNotice && (
        <div className="catalog-notice catalog-notice--demo" role="status">
          <Sparkles aria-hidden="true" />
          <span>{demoNotice}</span>
        </div>
      )}

      <div className="catalog-divider" />
      <div className="catalog-meta" aria-live="polite">
        <span>{query.trim() ? `RESULTS FOR “${query.trim()}”` : 'CURATED CRATE'}</span>
        <span>{status === 'searching' ? 'SCANNING...' : `${results.length} PRESSINGS`}</span>
      </div>

      <div className="catalog-results" role="list" aria-label="Spotify search results">
        {status === 'searching' && (
          <div className="catalog-state" role="status">
            <span className="catalog-loader" aria-hidden="true" />
            <span>Browsing the record room...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="catalog-state catalog-state--error" role="alert">
            <AlertCircle aria-hidden="true" />
            <strong>{error}</strong>
            <button type="button" className="text-button" onClick={retrySearch}>
              <RefreshCcw aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {status === 'no-results' && (
          <div className="catalog-state">
            <Music2 aria-hidden="true" />
            <strong>No matches found.</strong>
            <span>Keep the query editable and try another pressing.</span>
          </div>
        )}

        {status !== 'searching' && status !== 'error' && status !== 'no-results' && results.map((item) => {
          const isSelected = item.uri === currentSelectionUri
          return (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className={`catalog-result${isSelected ? ' catalog-result--selected' : ''}`}
              aria-label={`${item.title} by ${item.creator}${isSelected ? ' (selected)' : ''}`}
              disabled={!item.isPlayable}
              onClick={() => onSelectSelection(createSelection(item))}
            >
              <div className="catalog-result__art">
                <Music2 aria-hidden="true" />
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={(event) => { event.currentTarget.style.display = 'none' }}
                  />
                )}
                <span className="catalog-result__type">{kindLabel(item.kind)}</span>
              </div>
              <div className="catalog-result__copy">
                <strong>{item.title}</strong>
                <span>{item.creator}</span>
                <small>
                  {item.kind === 'track' ? <Clock3 aria-hidden="true" /> : <ListMusic aria-hidden="true" />}
                  {formatDuration(item.durationMs)}
                  {item.albumName && <><i />{item.albumName}</>}
                </small>
                {!item.isPlayable && <em>{item.availabilityReason}</em>}
              </div>
              {isSelected && <Disc3 className="catalog-result__selected-icon" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <footer className="catalog-footer">
        <span><span className="keycap">↵</span> select a pressing</span>
        <span><span className="keycap">⌘</span> public catalog</span>
      </footer>
    </aside>
  )
}
