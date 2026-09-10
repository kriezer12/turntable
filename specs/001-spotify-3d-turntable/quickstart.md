# Quickstart: Spotify Turntable Listening Room

This guide validates the feature end to end after implementation. It covers the custom search
gateway, Spotify Embed playback, privacy boundary, and the flat listening-room surface. See [data-model.md](data-model.md)
for state definitions and [contracts/](contracts/) for interface details.

## Prerequisites

- Node.js and npm installed.
- A modern browser with JavaScript, iframe playback, encrypted media, and autoplay permissions.
- For live catalog search, a Spotify developer app with server-side `SPOTIFY_CLIENT_ID`,
  `SPOTIFY_CLIENT_SECRET`, and an app-configured `SPOTIFY_MARKET` environment value.
- For local feature work without credentials, use the curated mock search mode.

The listener does not enter a Spotify password or playback access token into the Turntable site.
If Spotify requests sign-in or entitlement, that interaction remains inside Spotify's Embed.

## Existing Foundation Checks

Before implementation validation, confirm that the work is extending the existing repository:

- `api/spotify/search.ts` and the `/api/spotify/search` Vite middleware are both present.
- `src/components/player/SpotifyEmbedPlayer.tsx`, `src/components/search/SearchDrawer.tsx`,
  `src/components/search/SpotifyConnectionRail.tsx`, and `src/components/room/ListeningRoomSurface.tsx`
  are present. The legacy `TurntableCanvas.tsx` and Yamaha model may remain isolated, but are not
  mounted by the current app shell.
- The server-side key names are `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`; do not print or
  commit their values. `VITE_SPOTIFY_CLIENT_ID` is legacy PKCE configuration and must not be needed
  for v1.
- The final search UI has no “Your Playlists” tab, browser token storage, profile request, or
  personal-library request.

## Setup

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Without Spotify app credentials, confirm that the app announces
demo mode and provides at least one selectable track and playlist fixture.

## Validation Scenarios

1. **Room shell**
   - Open the app at a desktop viewport and a 360-pixel-wide mobile viewport.
   - Confirm the flat room, record artwork treatment, connection rail above search, current-status
     area, and primary controls are visible without horizontal page scrolling.
2. **Search and selection**
   - Search for a known song, artist, album, and playlist.
   - Confirm results show title, creator, artwork or placeholder, and playability.
   - Select a track, then a playlist; confirm the label and room metadata update without a page
     reload.
3. **Embed playback boundary**
   - Select a result while the player is hidden and confirm no Spotify iframe is mounted; the flat
     surface and record artwork still update.
   - Choose Connect Spotify, use the return action, and confirm Spotify's playback engine connects.
   - Confirm Spotify's native player card and controls are not visible in the room.
   - Confirm connecting does not call `play()` or spin the record by itself.
   - Start playback from an explicit user gesture and confirm the record spins only after audio is
     active.
   - Inspect browser network requests and server logs: no listener password, playback access token,
     or custom audio request is present.
4. **Room controls**
   - Confirm play and restart remain disabled until a selection and connected playback exist.
   - Start playback from an explicit user gesture and confirm the flat record spins only after
     Spotify reports active playback.
   - Disconnect playback and confirm it pauses when possible, removes the iframe, and retains the
     selected metadata.
   - Use restart and confirm the Embed and room return to the beginning.
5. **Failure states**
   - Search with an empty query and a query with no matches.
   - Simulate missing credentials, a failed search, blocked autoplay, unavailable content, failed
     artwork, and a blocked or unavailable Embed.
   - Confirm every case has a clear message and retry, alternate selection, or Spotify recovery path.
6. **Quality gates**

```powershell
npm run lint
npm run build
```

Record the browser, viewport sizes, scenarios exercised, and any known provider limitations in the
implementation review evidence.

## Implementation Review Evidence — 2026-09-10

- `npm run lint` passed.
- `npm run build` passed. Vite reports the expected large Three.js bundle warning; it does not fail
  the build.
- `npm run verify:spotify` passed against the local `/api/spotify/search` gateway, including safe
  invalid-query, method, limit, offset, normalized-response, and provider-error checks.
- Browser coverage passed in Codex In-app Browser at the default desktop viewport and at 360×748:
  demo crate rendering, track selection, Spotify Embed mounting, selection-without-autoplay,
  deliberate play/pause, power-off pause, tonearm state, responsive control visibility, and
  `scrollWidth === innerWidth` with the Embed loaded.
- The current live catalog request returned the normalized safe `CATALOG_UNAVAILABLE` state during
  one search validation. No credential values or provider response bodies were inspected or logged;
  repeat live-search validation when the Spotify developer app and market configuration are available.
- The refreshed 2D main view was browser-verified with zero mounted `<canvas>` elements and no
  horizontal overflow at the default desktop viewport and 360×748. Selecting a track while
  playback was disconnected updated the flat surface without mounting an iframe; connecting
  playback mounted the official Spotify Embed as a visually hidden engine; disconnecting removed
  the iframe while retaining selection data.
- In the Codex In-app Browser, `target="_blank"` handoffs were blocked as expected for that
  environment; the connection rail displayed its direct `https://open.spotify.com/` fallback and
  the return action remained usable. The Spotify login destination was verified separately without
  entering credentials.
