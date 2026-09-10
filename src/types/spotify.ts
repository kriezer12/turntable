export interface SpotifyImage {
  url: string
  width?: number
  height?: number
}

export type SpotifyEntityType = 'track' | 'artist' | 'album' | 'playlist'

export interface CatalogResult {
  id: string
  uri: string
  kind: SpotifyEntityType
  title: string
  creator: string
  imageUrl: string | null
  contextUri: string | null
  isPlayable: boolean
  availabilityReason: string | null
  durationMs: number | null
  albumName: string | null
}

export interface CatalogPage {
  limit: number
  offset: number
  hasMore: boolean
  total?: number
}

export interface CatalogSearchResponse {
  query: string
  items: CatalogResult[]
  page: CatalogPage
  isDemoMode: boolean
  message?: string
}

export type CatalogErrorCode =
  | 'INVALID_QUERY'
  | 'CATALOG_NOT_CONFIGURED'
  | 'CATALOG_AUTH_ERROR'
  | 'CATALOG_RATE_LIMITED'
  | 'CATALOG_UNAVAILABLE'
  | 'SEARCH_ABORTED'

export interface CatalogErrorResponse {
  error: {
    code: CatalogErrorCode
    message: string
  }
}

export type CatalogSearchStatus = 'idle' | 'searching' | 'results' | 'no-results' | 'error'

export interface SearchQuery {
  text: string
  types: SpotifyEntityType[]
  limit: number
  offset: number
  status: CatalogSearchStatus
  error: string | null
}

export interface SpotifySelection {
  result: CatalogResult
  selectedAt: number
  labelArtworkUrl: string | null
  playbackUri: string
  contextUri: string | null
}

export type PlaybackStatus =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'blocked'
  | 'error'

export interface EmbeddedPlaybackSession {
  status: PlaybackStatus
  playingUri: string | null
  isPaused: boolean
  isBuffering: boolean
  positionMs: number | null
  durationMs: number | null
  errorCode: string | null
  notice: string | null
}

export type TurntableTonearm = 'lifted' | 'lowered'

export type SpotifyAccessMode = 'hidden' | 'handoff-started' | 'connected'

export interface TurntableSceneState {
  isPowered: boolean
  tonearm: TurntableTonearm
  playback: PlaybackStatus
  isRecordSpinning: boolean
  volume: number
  selection: SpotifySelection | null
  currentTrack: {
    title: string
    creator: string
    context: string | null
  } | null
  notice: string | null
}

export interface SpotifyPlaybackUpdate {
  isPaused: boolean
  isBuffering: boolean
  position: number
  duration: number
  uri: string | null
  title?: string
  creator?: string
  context?: string | null
}

export type SpotifyEmbedErrorKind = 'blocked' | 'unavailable' | 'network' | 'unknown'

export type SpotifyEmbedEvent =
  | { type: 'ready' }
  | { type: 'playback_started'; update?: SpotifyPlaybackUpdate }
  | { type: 'playback_update'; update: SpotifyPlaybackUpdate }
  | { type: 'playback_error'; message: string; kind: SpotifyEmbedErrorKind }

export interface SpotifyEmbedEventPayload {
  data?: {
    isPaused?: boolean
    isBuffering?: boolean
    position?: number
    duration?: number
    uri?: string
    track?: {
      uri?: string
      name?: string
      artists?: Array<{ name?: string }>
      album?: { name?: string }
    }
    message?: string
  }
  message?: string
}

export interface SpotifyEmbedController {
  loadUri: (uri: string) => void
  loadEntity?: (uri: string) => void
  play: () => void
  pause: () => void
  resume: () => void
  togglePlay: () => void
  restart: () => void
  seek?: (seconds: number) => void
  destroy: () => void
  addListener: (event: string, callback: (data: SpotifyEmbedEventPayload) => void) => void
  removeListener: (event: string, callback: (data: SpotifyEmbedEventPayload) => void) => void
}

export interface SpotifyIframeApi {
  createController: (
    element: object,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void
  ) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (iframeApi: SpotifyIframeApi) => void
    SpotifyIframeApi?: SpotifyIframeApi
  }
}
