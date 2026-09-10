import type {
  SpotifyEmbedController,
  SpotifyEmbedErrorKind,
  SpotifyEmbedEvent,
  SpotifyEmbedEventPayload,
  SpotifyPlaybackUpdate
} from '../../types/spotify'

function eventData(payload: SpotifyEmbedEventPayload) {
  return payload.data ?? {}
}

export function classifyEmbedError(message: string): SpotifyEmbedErrorKind {
  const normalized = message.toLowerCase()
  if (/autoplay|blocked|permission|third.party|iframe|user gesture/.test(normalized)) return 'blocked'
  if (/network|timeout|timed out|offline|connect|load failed/.test(normalized)) return 'network'
  if (/unavailable|region|premium|entitle|account|not found/.test(normalized)) return 'unavailable'
  return 'unknown'
}

export function normalizePlaybackUpdate(
  payload: SpotifyEmbedEventPayload,
  fallbackUri: string | null
): SpotifyPlaybackUpdate {
  const data = eventData(payload)
  const track = data.track
  return {
    isPaused: data.isPaused ?? true,
    isBuffering: data.isBuffering ?? false,
    position: data.position ?? 0,
    duration: data.duration ?? 0,
    uri: data.uri ?? track?.uri ?? fallbackUri,
    title: track?.name,
    creator: track?.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || undefined,
    context: track?.album?.name ?? null
  }
}

export function normalizeEmbedEvent(
  type: 'ready' | 'playback_started' | 'playback_update' | 'playback_error',
  payload: SpotifyEmbedEventPayload,
  fallbackUri: string | null
): SpotifyEmbedEvent {
  if (type === 'ready') return { type }
  if (type === 'playback_error') {
    const message = payload.data?.message ?? payload.message ?? 'Spotify could not load this selection.'
    return {
      type,
      message,
      kind: classifyEmbedError(message)
    }
  }

  const update = normalizePlaybackUpdate(payload, fallbackUri)
  return { type, update }
}

export function loadEmbedSelection(controller: SpotifyEmbedController, uri: string) {
  if (controller.loadEntity) {
    controller.loadEntity(uri)
    return
  }
  controller.loadUri(uri)
}

export function playEmbedSelection(controller: SpotifyEmbedController) {
  controller.play()
}

export function pauseEmbedSelection(controller: SpotifyEmbedController) {
  controller.pause()
}

export function resumeEmbedSelection(controller: SpotifyEmbedController) {
  controller.resume()
}

export function toggleEmbedSelection(controller: SpotifyEmbedController) {
  controller.togglePlay()
}

export function restartEmbedSelection(controller: SpotifyEmbedController) {
  controller.restart()
}

export function safeEmbedErrorMessage(message: string, kind = classifyEmbedError(message)) {
  if (kind === 'blocked') {
    return 'Spotify blocked playback in this browser. Allow playback, then retry the room control.'
  }
  if (kind === 'unavailable' || /sign|account|premium|region|available|permission/i.test(message)) {
    return 'Spotify requires an eligible account or this item is unavailable here. Choose another record or continue in Spotify.'
  }
  if (kind === 'network') return 'Spotify could not reach this record. Check your connection and retry.'
  return 'Spotify could not start this record. Retry the room control or choose another record.'
}
