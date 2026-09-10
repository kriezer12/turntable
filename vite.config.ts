import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  catalogError,
  clampCatalogLimit,
  filterDemoCatalog,
  normalizeSpotifySearchPayload,
  parseCatalogOffset,
  parseCatalogTypes,
  type SpotifySearchPayload
} from './src/services/spotify/catalog.js'

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

  if (!response.ok) throw new SpotifyGatewayError('CATALOG_AUTH_ERROR', 502)
  const data = await response.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new SpotifyGatewayError('CATALOG_AUTH_ERROR', 502)

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000
  }
  return cachedToken.accessToken
}

function writeJson(response: import('node:http').ServerResponse, status: number, payload: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

function errorMessage(code: SpotifyGatewayError['code']) {
  if (code === 'CATALOG_AUTH_ERROR') return 'Spotify catalog authorization is unavailable. Try again later.'
  if (code === 'CATALOG_RATE_LIMITED') return 'Spotify search is busy. Wait a moment and retry.'
  return 'Spotify catalog search is unavailable. Try again later.'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'spotify-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
            if (!request.url?.startsWith('/api/spotify/search')) return next()
            if (request.method === 'OPTIONS') return writeJson(response, 204, {})
            if (request.method !== 'GET') return writeJson(response, 405, catalogError('CATALOG_UNAVAILABLE', 'Search only supports GET requests.'))

            const url = new URL(request.url, 'http://localhost')
            const query = url.searchParams.get('q')?.trim() ?? ''
            if (!query) return writeJson(response, 400, catalogError('INVALID_QUERY', 'Enter a song, artist, album, or playlist to search.'))
            if (query.length > MAX_QUERY_LENGTH) return writeJson(response, 400, catalogError('INVALID_QUERY', `Keep searches under ${MAX_QUERY_LENGTH} characters.`))

            const types = parseCatalogTypes(url.searchParams.get('types') ?? url.searchParams.get('type'))
            const limit = clampCatalogLimit(url.searchParams.get('limit'))
            const offset = parseCatalogOffset(url.searchParams.get('offset'))
            const clientId = env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID
            const clientSecret = env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET

            if (!clientId || !clientSecret) {
              return writeJson(response, 200, filterDemoCatalog(query, types, limit, offset))
            }

            try {
              const token = await getSpotifyToken(clientId, clientSecret)
              const market = (env.SPOTIFY_MARKET || process.env.SPOTIFY_MARKET)?.trim().toUpperCase()
              const params = new URLSearchParams({
                q: query,
                type: types.join(','),
                limit: String(limit),
                offset: String(offset)
              })
              if (market) params.set('market', market)

              const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
              })

              if (spotifyResponse.status === 401 || spotifyResponse.status === 403) throw new SpotifyGatewayError('CATALOG_AUTH_ERROR', 502)
              if (spotifyResponse.status === 429) throw new SpotifyGatewayError('CATALOG_RATE_LIMITED', 429)
              if (!spotifyResponse.ok) throw new SpotifyGatewayError('CATALOG_UNAVAILABLE', 502)

              const payload = await spotifyResponse.json() as SpotifySearchPayload
              return writeJson(response, 200, normalizeSpotifySearchPayload(payload, query, types, limit, offset))
            } catch (error) {
              const gatewayError = error instanceof SpotifyGatewayError
                ? error
                : new SpotifyGatewayError('CATALOG_UNAVAILABLE', 502)
              console.error('[spotify-catalog]', gatewayError.code)
              return writeJson(response, gatewayError.status, catalogError(gatewayError.code, errorMessage(gatewayError.code)))
            }
          })
        }
      }
    ]
  }
})
