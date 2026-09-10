# Contract: Spotify Embed Playback Boundary

## Purpose

Define the browser-only boundary between the custom turntable interface and Spotify's own Embed
iFrame player.

The repository already has `SpotifyEmbedPlayer.tsx`; this contract is a lifecycle correction, not
a second player implementation. The component is a hidden audio-engine boundary, not a visible
control surface. In particular, the current URI-change path must stop calling
`play()` optimistically and must report provider-confirmed state to `App`.

## Lifecycle

1. Load Spotify's official iFrame API script once.
2. Wait for Spotify's ready callback before creating the controller.
3. Create one controller for the active Embed host element.
4. Load the selected track or playlist URI through the controller without starting playback.
5. Subscribe to readiness and playback events.
6. Destroy the controller when the Embed host is permanently removed or replaced, and remove all
   event listeners during teardown.

## Supported Controller Commands

| App command | Provider operation | Required behavior |
|---|---|---|
| Load selection | `loadEntity(uri)` or `loadUri(uri)` | Load the selected track or playlist without starting false visual playback; use the method supported by the current controller typings |
| Play | `play()` or `resume()` | Attempt playback only after an explicit gesture when required |
| Pause | `pause()` | Pause and stop the record after provider state confirms it |
| Toggle | `togglePlay()` | Mirror the resulting provider state |
| Restart | `restart()` | Reset the active item and keep the room synchronized |

The implementation must not assume that next, previous, shuffle, or volume controller methods exist.
Those actions are visibly disabled in the custom layer when unsupported; the provider's native
controls remain hidden from the room.

## Provider Events

| Event | Normalized effect |
|---|---|
| `ready` | Embed session becomes ready |
| `playback_started` | Mark the active URI as playing and permit record motion |
| `playback_update` with `isPaused: false` and `isBuffering: false` | Mark playing |
| `playback_update` with `isPaused: true` | Mark paused and stop record motion |
| `playback_update` with `isBuffering: true` | Mark buffering and stop record motion until active |

Unknown, blocked, or failed provider states map to a safe stopped or error state and expose recovery
guidance. The Embed remains authoritative when the listener uses its native controls.

The adapter must expose enough event information for the application to distinguish controller
readiness from active playback. It must not assume that a successful `loadEntity`/`loadUri` call
means `playing`, and it must not invoke `play()` as a side effect of selection alone.

## Privacy Boundary

- No Spotify user token, password, or login value is passed to the custom app or its server.
- The browser communicates with the hidden Embed through Spotify's documented controller surface;
  the Embed's own UI is not exposed in the room.
- The custom app must not request direct audio, download music, or proxy playback bytes.
- The iframe must retain Spotify's playback permissions, including encrypted-media support.
