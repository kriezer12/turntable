export interface SpotifyImage {
  url: string
  width?: number
  height?: number
}

export interface SpotifyArtist {
  name: string
  id?: string
  uri?: string
}

export interface SpotifyAlbum {
  id?: string
  name: string
  images: SpotifyImage[]
  uri?: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  uri: string
  type: 'track' | 'playlist' | 'album'
}

export interface SpotifyPlaybackState {
  isPaused: boolean
  isBuffering: boolean
  position: number // in seconds or ms
  duration: number // in seconds or ms
  playbackSpeed: number
}

// Spotify Embed IFrame Controller definitions
export interface SpotifyEmbedController {
  loadUri: (uri: string) => void
  play: () => void
  pause: () => void
  resume: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  destroy: () => void
  addListener: (event: string, callback: (data: any) => void) => void
  removeListener: (event: string, callback: (data: any) => void) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: {
      createController: (
        element: HTMLElement,
        options: { uri?: string; width?: string | number; height?: string | number },
        callback: (controller: SpotifyEmbedController) => void
      ) => void
    }) => void
    SpotifyIframeApi?: {
      createController: (
        element: HTMLElement,
        options: { uri?: string; width?: string | number; height?: string | number },
        callback: (controller: SpotifyEmbedController) => void
      ) => void
    }
  }
}
