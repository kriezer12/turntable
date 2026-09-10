# Spotify Connection Handoff Design

Date: 2026-09-10
Status: Implemented; browser-verified on desktop and 360px mobile

## Intent

Remove Spotify's preview gate and redundant provider controls from the default Turntables room
presentation while preserving Spotify's official Embed as the hidden playback engine. Give
listeners a visible connection option above the sidebar search when they want to use their Spotify
session for full playback.

The connection affordance is a handoff, not an application login. Turntables must not receive,
store, validate, or proxy a Spotify password, login value, or playback access token.

## Main-view reset

The current iteration intentionally removes the mounted R3F canvas and GLB objects from the main
view. `App` renders a flat DOM/CSS listening-room surface with the selected artwork, metadata, and
confirmed playback motion. The previous `TurntableCanvas` implementation and model assets remain
isolated in the repository for a future, separately planned 3D rebuild; they are not imported or
mounted by the current app shell.

## Interaction design

Use the approved slim sidebar rail directly above the catalog search.

The rail has three local UI modes:

| Mode | Sidebar treatment | Player treatment |
| --- | --- | --- |
| `hidden` | `CONNECT SPOTIFY` | The Spotify playback engine is not mounted; show a clean connection hint instead of the preview gate |
| `handoff-started` | `I'M BACK — ENABLE PLAYBACK` | The playback engine remains disconnected while the listener completes the official Spotify handoff |
| `connected` | `DISCONNECT PLAYBACK` | Mount the official Spotify Embed as a visually hidden audio engine; expose only custom room controls |

Selecting a track or playlist does not change the mode or mount the Embed. If the listener has
already chosen `connected`, selecting another item loads it into the existing hidden Embed
lifecycle without starting playback. Disconnecting playback pauses it first when a controller is
available, then removes the iframe.

The connection rail remains above search on desktop and mobile. Its copy must never claim that
Turntables verified authentication; it may say that the listener chose to open Spotify or reveal
the player.

## Official handoff

The primary action opens `https://open.spotify.com/` in a new tab from the user's click. Spotify
owns any sign-in, account, Premium, region, or entitlement interaction. The Turntables tab does
not read Spotify cookies or inspect the new tab.

After the click, the rail changes to `I'M BACK — SHOW PLAYER`. This is an explicit return action,
not an authentication callback. If the browser blocks the new tab, render a normal external link
fallback with `target="_blank"` and `rel="noreferrer"`.

When the listener enables playback, the app mounts `SpotifyEmbedPlayer` as a visually hidden
engine and keeps the existing rules: one controller, documented iFrame commands/events, no forced
`play()` on load, and record motion only after confirmed `playback_started` or active
`playback_update`. The cross-origin provider controls are never part of the visible room layout.

## Component and state boundaries

- `App` owns `spotifyAccessMode`, the current selection, controller reference, notices, and
  playback state.
- A focused connection-rail component renders the sidebar action and calls App callbacks. It does
  not inspect credentials or the Embed DOM.
- `SearchDrawer` keeps public catalog search and renders the connection rail above its search form.
- `SpotifyEmbedPlayer` remains responsible only for the official iframe lifecycle and normalized
  provider events. It is conditionally mounted when the access mode is `connected`, and its host is
  visually hidden while preserving the controller lifecycle.
- `ListeningRoomSurface` renders the current flat main view and receives typed selection metadata
  plus confirmed playback state. It does not own Spotify access or iframe lifecycle.
- `TurntableCanvas` and its model assets are deferred legacy implementation files; they are not
  mounted by `App` in this iteration.

No server endpoint or Spotify catalog contract changes are required for this feature. The existing
server-only Client Credentials flow remains limited to public catalog metadata and never becomes a
user-authentication flow.

## Error and recovery behavior

- Empty selection: the rail remains available, while the playback hint explains that a record must
  be selected before Spotify playback can be connected.
- Popup blocked: show the external Spotify fallback link and keep the rail in
  `handoff-started`.
- User returns without signing in: connecting the hidden Embed is still allowed; Spotify may report
  its own preview or entitlement state, which remains provider-controlled and is mapped to the
  existing safe playback status copy.
- Embed blocked, unavailable, or offline: preserve the selected artwork and metadata, show the
  existing safe recovery notice, and let the listener hide/reveal the Embed or choose another item.
- Disconnecting playback: pause through the controller when possible and stop custom record motion
  before teardown.

## Validation

Manual browser validation will confirm:

1. Track and playlist selection show the flat listening-room surface and no Spotify preview iframe
   while mode is `hidden`.
2. The connection rail appears above search at desktop and 360px mobile widths.
3. The official Spotify tab opens from the rail, and the return action enables hidden playback.
4. Connecting playback does not autoplay; the custom room play action is required before the record spins.
5. Disconnecting playback pauses playback and removes the hidden iframe.
6. Popup fallback, provider entitlement messaging, search recovery, privacy/network inspection,
   zero mounted canvas elements, and no-horizontal-scroll behavior remain safe.

The design deliberately does not promise that the Turntables UI can style Spotify-owned content
inside a cross-origin iframe. It keeps that provider surface visually hidden and exposes only the
Turntables controls in the room while Spotify remains authoritative for audio and playback events.
