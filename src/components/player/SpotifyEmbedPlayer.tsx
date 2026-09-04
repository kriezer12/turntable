import { useEffect, useRef } from 'react'
import type { SpotifyEmbedController } from '../../types/spotify'

interface SpotifyEmbedPlayerProps {
  uri: string | null
  onPlaybackUpdate?: (state: {
    isPaused: boolean
    isBuffering: boolean
    position: number
    duration: number
  }) => void
  onControllerReady?: (controller: SpotifyEmbedController) => void
}

export function SpotifyEmbedPlayer({
  uri,
  onPlaybackUpdate,
  onControllerReady
}: SpotifyEmbedPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SpotifyEmbedController | null>(null)

  useEffect(() => {
    let isCancelled = false

    const initEmbed = () => {
      if (!containerRef.current || !window.SpotifyIframeApi || controllerRef.current) return

      window.SpotifyIframeApi.createController(
        containerRef.current,
        {
          uri: uri || 'spotify:track:4cOdK2wGLETKBW3PvgPWqT', // Default demo track (Fleetwood Mac - Dreams)
          width: '100%',
          height: 80
        },
        (EmbedController) => {
          if (isCancelled) {
            EmbedController.destroy()
            return
          }

          controllerRef.current = EmbedController
          onControllerReady?.(EmbedController)

          EmbedController.addListener('playback_update', (e: any) => {
            if (e?.data) {
              onPlaybackUpdate?.({
                isPaused: e.data.isPaused,
                isBuffering: e.data.isBuffering,
                position: e.data.position,
                duration: e.data.duration
              })
            }
          })
        }
      )
    }

    if (window.SpotifyIframeApi) {
      initEmbed()
    } else {
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI
        initEmbed()
      }
    }

    return () => {
      isCancelled = true
    }
  }, [onControllerReady, onPlaybackUpdate])

  // Update track URI when changed
  useEffect(() => {
    if (uri && controllerRef.current) {
      controllerRef.current.loadUri(uri)
      controllerRef.current.play()
    }
  }, [uri])

  return (
    <div className="w-full">
      <div 
        ref={containerRef} 
        id="spotify-embed-iframe-container"
        className="w-full rounded-xl overflow-hidden shadow-lg bg-neutral-900 h-[80px]"
      />
    </div>
  )
}
