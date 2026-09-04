import type { VercelRequest, VercelResponse } from '@vercel/node'

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

  const data = await res.json() as any
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
    artists: [{ name: 'Daft Punk' }, { name: 'Pharrell Williams' }],
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const query = Array.isArray(req.query.q) ? req.query.q[0] : (req.query.q as string)
  const trimmedQuery = query?.trim() || ''
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  // If credentials are not configured, serve curated mock data for demonstration
  if (!clientId || !clientSecret) {
    const filtered = trimmedQuery
      ? MOCK_VINYL_ITEMS.filter(item =>
          item.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          item.artists.some(a => a.name.toLowerCase().includes(trimmedQuery.toLowerCase())) ||
          item.album.name.toLowerCase().includes(trimmedQuery.toLowerCase())
        )
      : MOCK_VINYL_ITEMS

    return res.status(200).json({
      tracks: { items: filtered },
      isDemoMode: true,
      message: 'Operating in Vinyl Crate Demo Mode. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET as Vercel environment variables for live catalog search.'
    })
  }

  try {
    const token = await getSpotifyToken(clientId, clientSecret)
    const searchType = Array.isArray(req.query.type) ? req.query.type[0] : (req.query.type as string) || 'track'
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : (req.query.limit as string)
    const limit = Math.min(50, Math.max(1, parseInt(rawLimit || '12', 10) || 12))
    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmedQuery)}&type=${encodeURIComponent(searchType)}&limit=${limit}`

    const spotifyRes = await fetch(spotifyUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await spotifyRes.json() as any
    return res.status(200).json({ ...data, isDemoMode: false })
  } catch (err: any) {
    console.error('Spotify Search Proxy Error:', err)
    return res.status(500).json({ error: err.message || 'Spotify API error' })
  }
}
