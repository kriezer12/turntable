# Research: Spotify 3D Turntable Listening Room

## Refresh Findings: Existing Repository Foundation

The repository already contains the main integration seams described by this feature: a Vercel
catalog handler at `api/spotify/search.ts`, matching Vite development middleware in `vite.config.ts`,
an Embed wrapper at `src/components/player/SpotifyEmbedPlayer.tsx`, a custom search drawer at
`src/components/search/SearchDrawer.tsx`, a fixed-camera Yamaha scene at
`src/components/turntable/TurntableCanvas.tsx`, and Spotify types in `src/types/spotify.ts`.
The implementation plan therefore refactors these files in place and adds only the smallest shared
adapter layer needed to prevent production and development behavior from diverging.

The audit found five concrete gaps that shape the refreshed plan:

1. Both catalog handlers currently use a legacy `type` query, return raw provider-shaped objects,
   default to 12 results, permit up to 50, and omit the normalized pagination, market, and safe
   error contract. They must be brought to the current provider request limit of 10 and a single
   client-facing response shape.
2. The existing Embed wrapper calls `play()` immediately after a URI change and subscribes only to
   `playback_update`. It must load without implying playback, observe readiness and playback-start
   events, preserve the iframe permissions, and destroy the controller on teardown.
3. The existing search drawer still imports the browser PKCE helper, stores a user token, and
   exposes a personal-playlists tab. The accepted clarification removes that path from v1; public
   catalog search and Spotify's own Embed entitlement are the only authentication-adjacent flows.
4. The existing `App` owns local power, tonearm, and volume only. It must become the single owner of
   catalog selection and confirmed provider status before the 3D scene can accurately spin or stop.
5. The existing `VITE_SPOTIFY_CLIENT_ID` is tied to the retired PKCE path. v1 uses the already-wired
   server-side `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` names only; values remain outside
   source control and are not repeated in design artifacts.

These findings do not change the core research decisions below. They change the implementation
starting point and make retirement of the PKCE/library flow a first-class task.

## Decision 1: Use Spotify Embeds as the playback boundary

- **Decision**: Use Spotify's Embed iFrame API as the only playback surface. The app owns the
  room presentation and sends supported commands to the Embed controller; it does not implement
  an audio stream or use the Web Playback SDK.
- **Rationale**: The feature explicitly requires playback to remain inside Spotify's own Embed
  iFrame and forbids the Turntable server from handling the listener's playback credentials. The
  official iFrame API provides entity loading, play, pause, resume, toggle, restart, and playback
  state events without requiring the app to receive a user access token.
- **Alternatives considered**: The Web Playback SDK was rejected because it is a separate playback
  surface that requires user authorization and an access token. Direct audio or a custom proxy was
  rejected because it violates the product privacy and licensing boundary.
- **Evidence**: [Spotify iFrame API reference](https://developer.spotify.com/documentation/embeds/references/iframe-api),
  [Spotify Embeds overview](https://developer.spotify.com/documentation/embeds).

## Decision 2: Use an app-only server gateway for public catalog search

- **Decision**: Route custom search requests through `/api/spotify/search`. The server uses Spotify
  Client Credentials only for public catalog metadata, keeps that app token in server memory, and
  returns a normalized response containing only search UI data and Spotify references.
- **Rationale**: Spotify's Search endpoint requires authorization, while Client Credentials is the
  documented server-to-server flow for endpoints that do not access user information. Search for
  public tracks, artists, albums, and playlists fits that boundary. This keeps the client secret and
  app token out of browser code while remaining separate from the listener's playback session.
- **Alternatives considered**: Browser-side Client Credentials was rejected because a client secret
  cannot be protected in a public web bundle. User OAuth or PKCE was rejected for v1 because custom
  search does not need private libraries or profile data and the user explicitly forbids the
  Turntable server handling the playback access token. A client-only search with no token was
  rejected because the Web API requires authorization.
- **Operational boundary**: The server may see an app-only catalog token. It MUST never see the
  listener's Spotify password, login, or user playback token. Live search requires an app-configured
  `SPOTIFY_MARKET`; development mode falls back to curated mock results when credentials are absent.
- **Evidence**: [Search for Item](https://developer.spotify.com/documentation/web-api/reference/search),
  [Client Credentials Flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow),
  [Authorization guidance](https://developer.spotify.com/documentation/web-api/concepts/authorization).

## Decision 3: Make the custom control layer capability-aware

- **Decision**: Map the room's play or pause, selection loading, and restart action to documented
  Embed controller methods. Keep Spotify's native Embed controls hidden; next, previous, shuffle,
  and volume remain visibly unavailable in the custom layer because the official iFrame API
  reference does not document controller methods for those actions.
- **Rationale**: This preserves the interactable turntable twist without promising unsupported
  cross-origin control. The Embed remains the source of truth when the listener uses its native
  controls, and the room listens to `playback_started` and `playback_update` before showing motion.
- **Alternatives considered**: Recreating playlist sequencing in the app was rejected because public
  playlist item access is not a safe v1 assumption, and it would split playback authority. Replacing
  the Embed with the Web Playback SDK was rejected by the playback boundary. Exposing native Embed
  controls was rejected because they duplicate the room's custom transport UI and break the
  Virtual Vinyl-style presentation.
- **Evidence**: [iFrame API methods and events](https://developer.spotify.com/documentation/embeds/references/iframe-api),
  [February 2026 Web API migration guidance](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).

## Decision 4: Treat Embed readiness, autoplay, and encrypted media as explicit states

- **Decision**: The room has separate loading, ready, buffering, playing, paused, stopped, blocked,
  and error states. A user gesture is required before attempting play when the browser requires it.
  The Embed iframe permissions must preserve autoplay and encrypted-media support.
- **Rationale**: Spotify documents that programmatic play may be blocked by browser autoplay policy
  and that removing `allow="encrypted-media"` can reduce playback to a preview. Modeling these
  states prevents the record from spinning when no audio is active and makes recovery visible.
- **Alternatives considered**: Optimistically starting the record on selection was rejected because
  it creates a false playback state. Treating every Embed failure as a generic error was rejected
  because blocked autoplay and unavailable content have different recovery actions.
- **Evidence**: [iFrame API notes](https://developer.spotify.com/documentation/embeds/references/iframe-api),
  [Embed troubleshooting](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting).

## Decision 5: Use transient, normalized data only

- **Decision**: Keep the query, selected result, Embed session state, and turntable state in memory
  for the active page session. Do not persist Spotify account data, playback tokens, raw Web API
  responses, or user libraries.
- **Rationale**: The feature needs only enough metadata to render search results, the label, and
  current status. Transient state minimizes privacy exposure and keeps the turntable state owned by
  the app boundary.
- **Alternatives considered**: Persisting recent searches or selections was rejected for v1 because
  it adds retention and deletion requirements without supporting the primary listening flow.

## Decision 6: Preserve the existing scene architecture

- **Decision**: Keep `App` as the state owner, keep `TurntableCanvas` as a presentation boundary,
  and connect the Embed and search surfaces through typed callbacks and normalized domain types.
  Reuse the imported Yamaha model, fixed camera, procedural label placeholder, and existing sound
  utility where they remain compatible.
- **Rationale**: This aligns with the project constitution and the existing scene design while
  isolating Spotify integration from 3D rendering. Asset and playback failures can then degrade
  independently.
- **Alternatives considered**: Moving Spotify state into the 3D canvas was rejected because it would
  duplicate application state and make browser validation harder. Replacing the scene with a
  dashboard was rejected because it removes the feature's defining interaction.
