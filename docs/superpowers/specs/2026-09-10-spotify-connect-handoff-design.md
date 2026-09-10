# Spotify Connection Handoff Design

Date: 2026-09-10
Status: Approved design; implementation pending written-spec review

## Intent

Remove Spotify's preview gate from the default Turntables room presentation while preserving
Spotify's official Embed as the only playback surface. Give listeners a visible connection option
above the sidebar search when they want to use their Spotify session for full playback.

The connection affordance is a handoff, not an application login. Turntables must not receive,
store, validate, or proxy a Spotify password, login value, or playback access token.

## Interaction design

Use the approved slim sidebar rail directly above the catalog search.

The rail has three local UI modes:

| Mode | Sidebar treatment | Player treatment |
| --- | --- | --- |
| `hidden` | `CONNECT SPOTIFY` | The Spotify Embed is not mounted; show a clean connection hint instead of the preview gate |
| `handoff-started` | `I'M BACK — SHOW PLAYER` | The Embed remains hidden while the listener completes the official Spotify handoff |
| `embed-visible` | `HIDE PLAYER` | Mount the official Spotify Embed and expose provider-confirmed playback state |

Selecting a track or playlist does not change the mode or mount the Embed. If the listener has
already chosen `embed-visible`, selecting another item loads it into the existing Embed lifecycle
without starting playback. Hiding the player pauses it first when a controller is available, then
removes the iframe.

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

When the listener reveals the player, the app mounts `SpotifyEmbedPlayer` and keeps the existing
rules: one controller, documented iFrame commands/events, no forced `play()` on load, and record
motion only after confirmed `playback_started` or active `playback_update`.

## Component and state boundaries

- `App` owns `spotifyAccessMode`, the current selection, controller reference, notices, and
  playback state.
- A focused connection-rail component renders the sidebar action and calls App callbacks. It does
  not inspect credentials or the Embed DOM.
- `SearchDrawer` keeps public catalog search and renders the connection rail above its search form.
- `SpotifyEmbedPlayer` remains responsible only for the official iframe lifecycle and normalized
  provider events. It is conditionally mounted when the access mode is `embed-visible`.
- `TurntableCanvas` receives the same typed selection and confirmed playback props as before; it
  does not know whether the Embed is hidden because of the handoff mode.

No server endpoint or Spotify catalog contract changes are required for this feature. The existing
server-only Client Credentials flow remains limited to public catalog metadata and never becomes a
user-authentication flow.

## Error and recovery behavior

- Empty selection: the rail remains available, while the player hint explains that a record must be
  selected before the Spotify player can be revealed.
- Popup blocked: show the external Spotify fallback link and keep the rail in
  `handoff-started`.
- User returns without signing in: revealing the Embed is still allowed; Spotify may show its own
  preview or entitlement message, which remains provider-controlled and is mapped to the existing
  safe playback status copy.
- Embed blocked, unavailable, or offline: preserve the selected artwork and metadata, show the
  existing safe recovery notice, and let the listener hide/reveal the Embed or choose another item.
- Hiding the player: pause through the controller when possible and stop custom record motion before
  teardown.

## Validation

Manual browser validation will confirm:

1. Track and playlist selection show no Spotify preview iframe while mode is `hidden`.
2. The connection rail appears above search at desktop and 360px mobile widths.
3. The official Spotify tab opens from the rail, and the return action reveals the Embed.
4. Revealing the Embed does not autoplay; explicit play is required before the record spins.
5. Hiding the player pauses playback and removes the iframe.
6. Popup fallback, provider entitlement messaging, search recovery, privacy/network inspection, and
   no-horizontal-scroll behavior remain safe.

The design deliberately does not promise that the Turntables UI can suppress Spotify-owned content
inside a cross-origin iframe. It suppresses the preview experience from the default custom room and
offers an explicit provider handoff instead.
