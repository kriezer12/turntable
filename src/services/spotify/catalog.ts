import type {
  CatalogErrorCode,
  CatalogErrorResponse,
  CatalogResult,
  CatalogSearchResponse,
  SpotifyEntityType
} from '../../types/spotify.js'

const DEFAULT_TYPES: SpotifyEntityType[] = ['track', 'artist', 'album', 'playlist']
const DEFAULT_LIMIT = 10
const MAX_QUERY_LENGTH = 120
const SUPPORTED_TYPES = new Set<SpotifyEntityType>(['track', 'artist', 'album', 'playlist'])

export const DEMO_CATALOG_ITEMS: CatalogResult[] = [
  {
    id: '4cOdK2wGLETKBW3PvgPWqT',
    uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    kind: 'track',
    title: 'Never Gonna Give You Up',
    creator: 'Rick Astley',
    imageUrl: null,
    contextUri: null,
    isPlayable: true,
    availabilityReason: null,
    durationMs: 257800,
    albumName: 'Whenever You Need Somebody'
  },
  {
    id: '3TO7bbrUKrOSPGRTB5MeCz',
    uri: 'spotify:track:3TO7bbrUKrOSPGRTB5MeCz',
    kind: 'track',
    title: 'Time',
    creator: 'Pink Floyd',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe',
    contextUri: null,
    isPlayable: true,
    availabilityReason: null,
    durationMs: 413000,
    albumName: 'The Dark Side of the Moon'
  },
  {
    id: 'late-night-vinyl-sessions',
    uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
    kind: 'playlist',
    title: 'Late Night Vinyl Sessions',
    creator: 'Turntable Crate',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    contextUri: 'spotify:playlist:37i9dQZF1DX4t95PAbR2U5',
    isPlayable: true,
    availabilityReason: null,
    durationMs: null,
    albumName: '14 tracks'
  },
  {
    id: '70s-gatefold-classics',
    uri: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U',
    kind: 'playlist',
    title: '70s Gatefold Classics',
    creator: 'Turntable Crate',
    imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80',
    contextUri: 'spotify:playlist:37i9dQZF1DWZBCPUIUs2iU',
    isPlayable: true,
    availabilityReason: null,
    durationMs: null,
    albumName: '18 tracks'
  }
]

interface SpotifySearchCollection<T> {
  items?: T[]
  next?: string | null
  total?: number
}

interface SpotifySearchTrack {
  id?: string
  uri?: string
  name?: string
  duration_ms?: number
  is_playable?: boolean
  artists?: Array<{ name?: string }>
  album?: { name?: string; uri?: string; images?: Array<{ url?: string }> }
}

interface SpotifySearchArtist {
  id?: string
  uri?: string
  name?: string
  images?: Array<{ url?: string }>
}

interface SpotifySearchAlbum {
  id?: string
  uri?: string
  name?: string
  artists?: Array<{ name?: string }>
  images?: Array<{ url?: string }>
}

interface SpotifySearchPlaylist {
  id?: string
  uri?: string
  name?: string
  owner?: { display_name?: string | null }
  images?: Array<{ url?: string }>
  tracks?: { total?: number }
}

export interface SpotifySearchPayload {
  tracks?: SpotifySearchCollection<SpotifySearchTrack>
  artists?: SpotifySearchCollection<SpotifySearchArtist>
  albums?: SpotifySearchCollection<SpotifySearchAlbum>
  playlists?: SpotifySearchCollection<SpotifySearchPlaylist>
}

function firstImage(images?: Array<{ url?: string }>) {
  return images?.find((image) => typeof image.url === 'string' && image.url.length > 0)?.url ?? null
}

function safeText(value: string | null | undefined, fallback: string) {
  const text = value?.trim()
  return text || fallback
}

function makeResult(
  result: Omit<CatalogResult, 'isPlayable' | 'availabilityReason'> &
    Partial<Pick<CatalogResult, 'isPlayable' | 'availabilityReason'>>
): CatalogResult {
  const isPlayable = result.isPlayable ?? Boolean(result.uri)
  return {
    ...result,
    isPlayable,
    availabilityReason: result.availabilityReason ?? (isPlayable ? null : 'Spotify reports this item as unavailable.')
  }
}

function normalizeTrack(track: SpotifySearchTrack): CatalogResult | null {
  if (!track.uri || !track.name) return null
  return makeResult({
    id: track.id || track.uri,
    uri: track.uri,
    kind: 'track',
    title: track.name,
    creator: safeText(track.artists?.map((artist) => artist.name).filter(Boolean).join(', '), 'Unknown artist'),
    imageUrl: firstImage(track.album?.images),
    contextUri: track.album?.uri ?? null,
    durationMs: track.duration_ms ?? null,
    albumName: track.album?.name ?? null,
    isPlayable: track.is_playable ?? true
  })
}

function normalizeArtist(artist: SpotifySearchArtist): CatalogResult | null {
  if (!artist.uri || !artist.name) return null
  return makeResult({
    id: artist.id || artist.uri,
    uri: artist.uri,
    kind: 'artist',
    title: artist.name,
    creator: 'Artist',
    imageUrl: firstImage(artist.images),
    contextUri: artist.uri,
    durationMs: null,
    albumName: null
  })
}

function normalizeAlbum(album: SpotifySearchAlbum): CatalogResult | null {
  if (!album.uri || !album.name) return null
  return makeResult({
    id: album.id || album.uri,
    uri: album.uri,
    kind: 'album',
    title: album.name,
    creator: safeText(album.artists?.map((artist) => artist.name).filter(Boolean).join(', '), 'Unknown artist'),
    imageUrl: firstImage(album.images),
    contextUri: album.uri,
    durationMs: null,
    albumName: album.name
  })
}

function normalizePlaylist(playlist: SpotifySearchPlaylist): CatalogResult | null {
  if (!playlist.uri || !playlist.name) return null
  return makeResult({
    id: playlist.id || playlist.uri,
    uri: playlist.uri,
    kind: 'playlist',
    title: playlist.name,
    creator: safeText(playlist.owner?.display_name, 'Spotify playlist'),
    imageUrl: firstImage(playlist.images),
    contextUri: playlist.uri,
    durationMs: null,
    albumName: playlist.tracks?.total ? `${playlist.tracks.total} tracks` : null
  })
}

export function normalizeSpotifySearchPayload(
  payload: SpotifySearchPayload,
  query: string,
  types: SpotifyEntityType[],
  limit: number,
  offset: number,
  isDemoMode = false,
  message?: string
): CatalogSearchResponse {
  const normalizers: Record<SpotifyEntityType, () => Array<CatalogResult | null>> = {
    track: () => (payload.tracks?.items ?? []).map(normalizeTrack),
    artist: () => (payload.artists?.items ?? []).map(normalizeArtist),
    album: () => (payload.albums?.items ?? []).map(normalizeAlbum),
    playlist: () => (payload.playlists?.items ?? []).map(normalizePlaylist)
  }

  const items = types
    .flatMap((type) => normalizers[type]())
    .filter((item): item is CatalogResult => Boolean(item))
    .slice(0, limit)
  const collections = types.map((type) => payload[`${type}s` as keyof SpotifySearchPayload] as SpotifySearchCollection<unknown> | undefined)
  const hasMore = collections.some((collection) => Boolean(collection?.next))
  const total = collections.reduce((sum, collection) => sum + (collection?.total ?? 0), 0) || undefined

  return {
    query,
    items,
    page: { limit, offset, hasMore, total },
    isDemoMode,
    ...(message ? { message } : {})
  }
}

export function filterDemoCatalog(query: string, types: SpotifyEntityType[], limit = DEFAULT_LIMIT, offset = 0): CatalogSearchResponse {
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = DEMO_CATALOG_ITEMS.filter((item) => {
    const typeMatches = types.includes(item.kind)
    const textMatches = !normalizedQuery || `${item.title} ${item.creator} ${item.albumName ?? ''}`.toLowerCase().includes(normalizedQuery)
    return typeMatches && textMatches
  })

  return {
    query: query.trim(),
    items: filtered.slice(offset, offset + limit),
    page: { limit, offset, hasMore: offset + limit < filtered.length, total: filtered.length },
    isDemoMode: true,
    message: 'Vinyl Crate Demo Mode · add server Spotify keys for live catalog search.'
  }
}

export class CatalogSearchError extends Error {
  readonly code: CatalogErrorCode

  constructor(code: CatalogErrorCode, message: string) {
    super(message)
    this.name = 'CatalogSearchError'
    this.code = code
  }
}

export function catalogError(code: CatalogErrorCode, message: string): CatalogErrorResponse {
  return { error: { code, message } }
}

export function parseCatalogTypes(value: string | null | undefined): SpotifyEntityType[] {
  const types = value
    ?.split(',')
    .map((type) => type.trim())
    .filter((type): type is SpotifyEntityType => SUPPORTED_TYPES.has(type as SpotifyEntityType))
  return types?.length ? [...new Set(types)] : DEFAULT_TYPES
}

export function clampCatalogLimit(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(DEFAULT_LIMIT, Math.max(1, parsed))
}

export function parseCatalogOffset(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

export async function searchCatalog(
  query: string,
  options: { types?: SpotifyEntityType[]; limit?: number; offset?: number; signal?: AbortSignal } = {}
): Promise<CatalogSearchResponse> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return filterDemoCatalog('', options.types ?? DEFAULT_TYPES)
  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    throw new CatalogSearchError('INVALID_QUERY', `Keep searches under ${MAX_QUERY_LENGTH} characters.`)
  }

  const types = options.types?.length ? options.types : DEFAULT_TYPES
  const limit = Math.min(DEFAULT_LIMIT, Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT)))
  const offset = Math.max(0, Math.floor(options.offset ?? 0))
  const params = new URLSearchParams({
    q: trimmedQuery,
    types: types.join(','),
    limit: String(limit),
    offset: String(offset)
  })

  let response: Response
  try {
    response = await fetch(`/api/spotify/search?${params.toString()}`, { signal: options.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new CatalogSearchError('SEARCH_ABORTED', 'Search cancelled.')
    }
    throw new CatalogSearchError('CATALOG_UNAVAILABLE', 'Catalog search is unavailable. Check your connection and retry.')
  }

  let data: CatalogSearchResponse | CatalogErrorResponse
  try {
    data = await response.json() as CatalogSearchResponse | CatalogErrorResponse
  } catch {
    throw new CatalogSearchError('CATALOG_UNAVAILABLE', 'Catalog search returned an unreadable response. Retry the search.')
  }
  if (!response.ok || 'error' in data) {
    const errorData = data as CatalogErrorResponse
    throw new CatalogSearchError(errorData.error?.code ?? 'CATALOG_UNAVAILABLE', errorData.error?.message ?? 'Catalog search is unavailable.')
  }
  return data
}

export { DEFAULT_TYPES, DEFAULT_LIMIT, MAX_QUERY_LENGTH }
