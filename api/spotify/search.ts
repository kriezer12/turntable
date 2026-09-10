import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  catalogError,
  clampCatalogLimit,
  filterDemoCatalog,
  normalizeSpotifySearchPayload,
  parseCatalogOffset,
  parseCatalogTypes,
  type SpotifySearchPayload
} from '../../src/services/spotify/catalog'

const MAX_QUERY_LENGTH = 120
const TOKEN_REFRESH_BUFFER_MS = 60_000

let cachedToken: { accessToken: string; expiresAt: number } | null = null

class SpotifyGatewayError extends Error {
  readonly code: 'CATALOG_AUTH_ERROR' | 'CATALOG_RATE_LIMITED' | 'CATALOG_UNAVAILABLE'
  readonly status: 429 | 502

  constructor(
    code: 'CATALOG_AUTH_ERROR' | 'CATALOG_RATE_LIMITED' | 'CATALOG_UNAVAILABLE',
    status: 429 | 502
  ) {
    super(code)
    this.name = 'SpotifyGatewayError'
    this.code = code
    this.status = status
  }
}

async function getSpotifyToken(clientId: string, clientSecret: string) {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
    return cachedToken.accessToken
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    throw new SpotifyGatewayError('CATALOG_AUTH_ERROR', 502)
  }

  const data = await response.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) {
    throw new SpotifyGatewayError('CATALOG_AUTH_ERROR', 502)
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000
  }
  return cachedToken.accessToken
}

function queryValue(query: VercelRequest['query'], key: string) {
  const value = query[key]
  return Array.isArray(value) ? value[0] : value
}

function errorMessage(code: SpotifyGatewayError['code']) {
  if (code === 'CATALOG_AUTH_ERROR') return 'Spotify catalog authorization is unavailable. Try again later.'
  if (code === 'CATALOG_RATE_LIMITED') return 'Spotify search is busy. Wait a moment and retry.'
  return 'Spotify catalog search is unavailable. Try again later.'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json(catalogError('CATALOG_UNAVAILABLE', 'Search only supports GET requests.'))

  const query = queryValue(req.query, 'q')?.trim() ?? ''
  if (!query) return res.status(400).json(catalogError('INVALID_QUERY', 'Enter a song, artist, album, or playlist to search.'))
  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json(catalogError('INVALID_QUERY', `Keep searches under ${MAX_QUERY_LENGTH} characters.`))
  }

  const types = parseCatalogTypes(queryValue(req.query, 'types') ?? queryValue(req.query, 'type'))
  const limit = clampCatalogLimit(queryValue(req.query, 'limit'))
  const offset = parseCatalogOffset(queryValue(req.query, 'offset'))
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(200).json(filterDemoCatalog(query, types, limit, offset))
  }

  try {
    const token = await getSpotifyToken(clientId, clientSecret)
    const market = process.env.SPOTIFY_MARKET?.trim().toUpperCase()
    const params = new URLSearchParams({
      q: query,
      type: types.join(','),
      limit: String(limit),
      offset: String(offset)
    })
    if (market) params.set('market', market)

    const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.status === 401 || response.status === 403) {
      throw new SpotifyGatewayError('CATALOG_AUTH_ERROR', 502)
    }
    if (response.status === 429) {
      throw new SpotifyGatewayError('CATALOG_RATE_LIMITED', 429)
    }
    if (!response.ok) {
      throw new SpotifyGatewayError('CATALOG_UNAVAILABLE', 502)
    }

    const payload = await response.json() as SpotifySearchPayload
    return res.status(200).json(normalizeSpotifySearchPayload(payload, query, types, limit, offset))
  } catch (error) {
    const gatewayError = error instanceof SpotifyGatewayError
      ? error
      : new SpotifyGatewayError('CATALOG_UNAVAILABLE', 502)
    console.error('[spotify-catalog]', gatewayError.code)
    return res.status(gatewayError.status).json(catalogError(gatewayError.code, errorMessage(gatewayError.code)))
  }
}
