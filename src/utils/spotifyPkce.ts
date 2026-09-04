// Spotify Authorization Code Flow with PKCE (Proof Key for Code Exchange)
// Secure client-side authentication for personal library access (playlist-read-private)
// No client secret is ever exposed or used in this flow.

const SPOTIFY_CLIENT_ID = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_ID || ''
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/` : ''
const TOKEN_STORAGE_KEY = 'turntable_spotify_token'
const VERIFIER_STORAGE_KEY = 'turntable_pkce_verifier'

export interface SpotifyUserProfile {
  id: string
  display_name: string
  images?: { url: string }[]
}

export interface SpotifyUserPlaylist {
  id: string
  name: string
  description: string
  images: { url: string }[]
  tracks: { total: number }
  uri: string
}

// Generate high-entropy cryptographic random string for code verifier
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values).map((x) => possible[x % possible.length]).join('')
}

// Generate SHA-256 base64url encoded challenge
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/**
 * Initiates Spotify PKCE Login
 */
export async function loginWithSpotify(customClientId?: string) {
  const clientId = customClientId || SPOTIFY_CLIENT_ID
  if (!clientId) {
    throw new Error('Please provide a Spotify Client ID to connect your library.')
  }

  const verifier = generateRandomString(128)
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier)
  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: 'playlist-read-private playlist-read-collaborative'
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

/**
 * Checks URL for OAuth authorization code and exchanges for access token
 */
export async function handleAuthCallback(customClientId?: string): Promise<string | null> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return null

  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY)
  if (!verifier) return null

  const clientId = customClientId || SPOTIFY_CLIENT_ID
  if (!clientId) return null

  // Clean the URL query params without reloading
  window.history.replaceState({}, document.title, window.location.pathname)

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      })
    })

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.statusText}`)
    }

    const data = await res.json()
    const tokenInfo = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenInfo))
    sessionStorage.removeItem(VERIFIER_STORAGE_KEY)
    return tokenInfo.accessToken
  } catch (err) {
    console.error('PKCE Token Exchange Error:', err)
    return null
  }
}

/**
 * Gets currently stored access token or null
 */
export function getStoredUserToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const tokenInfo = JSON.parse(raw)
    if (Date.now() > tokenInfo.expiresAt) {
      // Expired token
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    return tokenInfo.accessToken
  } catch {
    return null
  }
}

/**
 * Sign out / disconnect Spotify library
 */
export function disconnectSpotifyUser() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY)
}

/**
 * Fetches user profile
 */
export async function fetchUserProfile(token: string): Promise<SpotifyUserProfile | null> {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fetches user playlists
 */
export async function fetchUserPlaylists(token: string): Promise<SpotifyUserPlaylist[]> {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=30', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.items || []
  } catch {
    return []
  }
}

// Curated Demo User Library for instant testing when not connected to Spotify
export const DEMO_USER_PLAYLISTS: SpotifyUserPlaylist[] = [
  {
    id: 'demo-vinyl-classics',
    name: 'Late Night Vinyl Sessions',
    description: 'Warm analog jazz, blue note records, and midnight soul.',
    images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' }],
    tracks: { total: 14 },
    uri: 'spotify:playlist:37i9dQZF1DX4t95PAbR2U5'
  },
  {
    id: 'demo-psychedelic-pressings',
    name: '70s Gatefold Classics',
    description: 'Progressive rock masterpieces and iconic vinyl pressings.',
    images: [{ url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400&auto=format&fit=crop&q=80' }],
    tracks: { total: 18 },
    uri: 'spotify:playlist:37i9dQZF1DWZBCPUIUs2iU'
  },
  {
    id: 'demo-french-touch',
    name: 'Electronic Wax & Sampling',
    description: 'French house, disco edits, and groove-laden electronica.',
    images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }],
    tracks: { total: 22 },
    uri: 'spotify:playlist:37i9dQZF1DX8tZsk68tuED'
  }
]
