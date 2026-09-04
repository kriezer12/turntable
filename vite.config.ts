import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In-memory token cache for Spotify Client Credentials
let cachedToken: { access_token: string; expires_at: number } | null = null

async function getSpotifyToken(clientId: string, clientSecret: string) {
  const now = Date.now()
  if (cachedToken && cachedToken.expires_at > now + 60000) {
    return cachedToken.access_token
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Spotify token error: ${res.status} ${errorText}`)
  }

  const data = (await res.json()) as any
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in * 1000)
  }
  return cachedToken.access_token
}

// Curated default vinyl tracks for instant demo / mock mode
const MOCK_VINYL_ITEMS = [
  {
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
  },
  {
    id: '3TO7bbrUKrOSPGRTB5MeCz',
    name: 'Time',
    artists: [{ name: 'Pink Floyd' }],
    album: {
      name: 'The Dark Side of the Moon',
      images: [
        { url: 'https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe', width: 640, height: 640 },
        { url: 'https://i.scdn.co/image/ab67616d00001e02ea7caaff71dea1051d49b2fe', width: 300, height: 300 }
      ]
    },
    duration_ms: 413000,
    uri: 'spotify:track:3TO7bbrUKrOSPGRTB5MeCz',
    type: 'track'
  },
  {
    id: '7ILXfN4kJ3hYLitnPjOsLi',
    name: 'So What',
    artists: [{ name: 'Miles Davis' }],
    album: {
      name: 'Kind of Blue',
      images: [
        { url: 'https://i.scdn.co/image/ab67616d0000b273a00b11c129b27a88fc72f36b', width: 640, height: 640 },
        { url: 'https://i.scdn.co/image/ab67616d00001e02a00b11c129b27a88fc72f36b', width: 300, height: 300 }
      ]
    },
    duration_ms: 562000,
    uri: 'spotify:track:7ILXfN4kJ3hYLitnPjOsLi',
    type: 'track'
  },
  {
    id: '3fDDsZoNKTvm2zj6gmfD2H',
    name: 'Get Lucky',
    artists: [{ name: 'Daft Punk', }, { name: 'Pharrell Williams' }],
    album: {
      name: 'Random Access Memories',
      images: [
        { url: 'https://i.scdn.co/image/ab67616d0000b2739b52a781b0a8809403fe7b56', width: 640, height: 640 },
        { url: 'https://i.scdn.co/image/ab67616d00001e029b52a781b0a8809403fe7b56', width: 300, height: 300 }
      ]
    },
    duration_ms: 369626,
    uri: 'spotify:track:3fDDsZoNKTvm2zj6gmfD2H',
    type: 'track'
  }
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'spotify-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/spotify/search')) {
              return next()
            }

            const url = new URL(req.url, 'http://localhost')
            const query = url.searchParams.get('q')?.trim() || ''
            const clientId = env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID
            const clientSecret = env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET

            // If credentials are not configured, serve curated mock data for demonstration
            if (!clientId || !clientSecret) {
              const filtered = query
                ? MOCK_VINYL_ITEMS.filter(item => 
                    item.name.toLowerCase().includes(query.toLowerCase()) ||
                    item.artists.some(a => a.name.toLowerCase().includes(query.toLowerCase())) ||
                    item.album.name.toLowerCase().includes(query.toLowerCase())
                  )
                : MOCK_VINYL_ITEMS

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                tracks: { items: filtered },
                isDemoMode: true,
                message: 'Operating in Vinyl Crate Demo Mode. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env for live catalog search.'
              }))
              return
            }

            try {
              const token = await getSpotifyToken(clientId, clientSecret)
              const searchType = url.searchParams.get('type') || 'track'
              const limit = url.searchParams.get('limit') || '12'
              const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}&limit=${limit}`

              const spotifyRes = await fetch(spotifyUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
              })

              const data = (await spotifyRes.json()) as any
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ...data, isDemoMode: false }))
            } catch (err: any) {
              console.error('Spotify Search Proxy Error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Spotify API error' }))
            }
          })
        }
      }
    ]
  }
})
