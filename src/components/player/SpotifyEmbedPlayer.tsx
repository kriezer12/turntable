import { useEffect, useRef } from 'react'
import type {
  SpotifyEmbedController,
  SpotifyEmbedEvent,
  SpotifyEmbedEventPayload,
  SpotifyIframeApi
} from '../../types/spotify'
import { loadEmbedSelection, normalizeEmbedEvent } from '../../services/spotify/embed'

interface SpotifyEmbedPlayerProps {
  uri: string
  onEvent?: (event: SpotifyEmbedEvent) => void
  onControllerReady?: (controller: SpotifyEmbedController) => void
  onControllerDestroyed?: () => void
}

function spotifyUriToEmbedUrl(uri: string) {
  const [, type, id] = uri.split(':')
  return type && id
    ? `https://open.spotify.com/embed/${type}/${id}`
    : 'https://open.spotify.com/'
}

export function SpotifyEmbedPlayer({
  uri,
  onEvent,
  onControllerReady,
  onControllerDestroyed
}: SpotifyEmbedPlayerProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fallbackRef = useRef<HTMLIFrameElement | null>(null)
  const controllerRef = useRef<SpotifyEmbedController | null>(null)
  const currentUriRef = useRef(uri)
  const initialUriRef = useRef(uri)
  const lastLoadedUriRef = useRef<string | null>(null)
  const onEventRef = useRef(onEvent)
  const onControllerReadyRef = useRef(onControllerReady)
  const onControllerDestroyedRef = useRef(onControllerDestroyed)

  useEffect(() => {
    currentUriRef.current = uri
  }, [uri])

  useEffect(() => {
    onEventRef.current = onEvent
    onControllerReadyRef.current = onControllerReady
    onControllerDestroyedRef.current = onControllerDestroyed
  }, [onEvent, onControllerReady, onControllerDestroyed])

  useEffect(() => {
    let isCancelled = false
    let subscribedController: SpotifyEmbedController | null = null
    const subscriptions: Array<{ event: string; callback: (payload: SpotifyEmbedEventPayload) => void }> = []
    const frame = frameRef.current
    if (!frame) return

    const embedContainer = document.createElement('div')
    embedContainer.setAttribute('aria-hidden', 'true')
    const staticFallback = document.createElement('iframe')
    staticFallback.title = 'Spotify Embed player'
    staticFallback.src = spotifyUriToEmbedUrl(initialUriRef.current)
    staticFallback.loading = 'lazy'
    staticFallback.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
    staticFallback.allowFullscreen = true
    frame.append(embedContainer, staticFallback)
    containerRef.current = embedContainer
    fallbackRef.current = staticFallback

    const initEmbed = (iframeApi: SpotifyIframeApi) => {
      if (!containerRef.current || controllerRef.current || isCancelled) return

      iframeApi.createController(
        containerRef.current,
        { uri: initialUriRef.current, width: '100%', height: 152 },
        (controller) => {
          if (isCancelled) {
            controller.destroy()
            return
          }

          controllerRef.current = controller
          subscribedController = controller
          staticFallback.remove()

          const subscribe = (
            eventName: string,
            normalizedType: 'ready' | 'playback_started' | 'playback_update' | 'playback_error'
          ) => {
            const callback = (payload: SpotifyEmbedEventPayload) => {
              onEventRef.current?.(normalizeEmbedEvent(normalizedType, payload, currentUriRef.current))
            }
            controller.addListener(eventName, callback)
            subscriptions.push({ event: eventName, callback })
          }

          subscribe('ready', 'ready')
          subscribe('playback_started', 'playback_started')
          subscribe('playback_update', 'playback_update')
          subscribe('playback_error', 'playback_error')
          // Spotify may resume an Embed when it is created from a user selection.
          // Loading a record must remain distinct from the listener's play action.
          try {
            controller.pause()
          } catch {
            // The provider will surface any unavailable state through its events.
          }
          onControllerReadyRef.current?.(controller)
        }
      )
    }

    const handleApiReady = (iframeApi: SpotifyIframeApi) => {
      window.SpotifyIframeApi = iframeApi
      initEmbed(iframeApi)
    }

    if (window.SpotifyIframeApi) {
      initEmbed(window.SpotifyIframeApi)
    } else {
      const previousHandler = window.onSpotifyIframeApiReady
      window.onSpotifyIframeApiReady = handleApiReady

      return () => {
        isCancelled = true
        if (window.onSpotifyIframeApiReady === handleApiReady) {
          window.onSpotifyIframeApiReady = previousHandler
        }
        if (subscribedController) {
          subscriptions.forEach(({ event, callback }) => subscribedController?.removeListener(event, callback))
          subscribedController.destroy()
          controllerRef.current = null
          onControllerDestroyedRef.current?.()
        }
        containerRef.current = null
        fallbackRef.current = null
        frame.replaceChildren()
      }
    }

    return () => {
      isCancelled = true
      if (subscribedController) {
        subscriptions.forEach(({ event, callback }) => subscribedController?.removeListener(event, callback))
        subscribedController.destroy()
        controllerRef.current = null
        onControllerDestroyedRef.current?.()
      }
      containerRef.current = null
      fallbackRef.current = null
      frame.replaceChildren()
    }
  }, [])

  useEffect(() => {
    if (fallbackRef.current && !fallbackRef.current.hidden) {
      fallbackRef.current.src = spotifyUriToEmbedUrl(uri)
    }
    const controller = controllerRef.current
    if (!controller || lastLoadedUriRef.current === uri) return
    loadEmbedSelection(controller, uri)
    lastLoadedUriRef.current = uri
  }, [uri])

  return (
    <section className="spotify-playback-engine" aria-hidden="true">
      <div
        ref={frameRef}
        id="spotify-embed-iframe-container"
        className="spotify-playback-engine__frame"
      />
    </section>
  )
}
