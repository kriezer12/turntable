export const SPOTIFY_WEB_URL = 'https://open.spotify.com/'

export function openSpotifyHandoff() {
  try {
    return window.open(SPOTIFY_WEB_URL, '_blank', 'noopener,noreferrer') !== null
  } catch {
    return false
  }
}
