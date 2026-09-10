# Implementation Plan: Spotify Turntable Listening Room

**Branch**: `001-spotify-3d-turntable` | **Date**: 2026-09-10 | **Spec**: `specs/001-spotify-3d-turntable/spec.md`

**Input**: Feature specification from `specs/001-spotify-3d-turntable/spec.md`

## Repository Progress and Refresh Delta

This feature is being brought under spec-driven development after meaningful implementation
progress. The repository is not a greenfield application, so implementation work must begin with
an audit and targeted refactor of the existing foundations:

| Existing foundation | Refresh implication |
|---|---|
| `api/spotify/search.ts` Vercel function | Keep the route, but normalize its response, add current pagination/market handling, and harden safe error mapping. |
| `vite.config.ts` `/api/spotify/search` development middleware | Keep local mock/live behavior, but make it follow the production catalog contract so development cannot drift from deployment. |
| `src/components/player/SpotifyEmbedPlayer.tsx` | Keep the component boundary, but fix readiness, event coverage, cleanup, and gesture-safe playback. |
| `src/components/search/SearchDrawer.tsx` | Keep the custom search surface, remove the v1 PKCE/library flow, and wire it to normalized public catalog results. |
| `src/components/turntable/TurntableCanvas.tsx` and the Yamaha GLB | Keep isolated as deferred legacy 3D work; do not mount them in the current app shell. |
| `src/App.tsx` | Own selection, catalog state, Embed access mode, playback status, and provider commands while rendering the flat room surface. |
| `src/types/spotify.ts` | Extend the existing provider types with normalized catalog and session types; do not add a user playback-token type. |
| `src/utils/spotifyPkce.ts` | Retire it from the v1 path, including the “Your Playlists” tab and browser token storage. It must not remain an accidental playback dependency. |
| `vercel.json` | Preserve the existing API rewrite/static fallback while validating production routing. |

The configured environment-key names already present in the codebase are `SPOTIFY_CLIENT_ID` and
`SPOTIFY_CLIENT_SECRET` for server-side catalog access. The existing `VITE_SPOTIFY_CLIENT_ID`
belongs to the PKCE path that is out of scope for v1 and must not be required by the new flow. No
environment values are recorded in this plan or source control.

## Current Iteration Plan Amendment

The approved reset changes the mounted main-view boundary: `App` now renders
`ListeningRoomSurface`, a flat DOM/CSS surface, and does not import or mount `TurntableCanvas`.
The existing R3F/GLB files remain isolated as deferred work for a future 3D rebuild issue. The
current implementation plan therefore prioritizes the Spotify connection rail, hidden-by-default
Embed lifecycle, selected artwork/metadata, confirmed playback state, and responsive no-overflow
behavior over 3D scene construction.

## Summary

Adapt the existing single-page listening-room foundation so a custom search experience selects public Spotify
tracks or playlists and loads them into one Spotify-owned Embed iFrame only after an explicit
connection handoff. The browser keeps one normalized session state shared by the search surface,
hidden Embed adapter, and flat listening-room surface. Provider events drive flat record motion and
status. Spotify's native Embed controls remain hidden; unsupported transport actions stay visibly
unavailable in the custom room.

Catalog search uses a small server-side gateway with Spotify Client Credentials for public metadata
only. The gateway never accepts or handles a listener's Spotify login, password, or playback token;
no audio bytes pass through it. Curated mock results remain available when local credentials are
absent.

## Technical Context

**Language/Version**: TypeScript 6.0.2, React 19.2.8, Vite 8.2.2

**Primary Dependencies**: React 19, Tailwind CSS 4.3, Spotify iFrame API v1, and the existing
Node-compatible server tooling (`@vercel/node` 12.0.1) for the production catalog endpoint already
present at `api/spotify/search.ts`. React Three Fiber, Three.js, and drei remain only for the
isolated deferred 3D files and are not part of the mounted main-view path.

**Storage**: None. Search queries, selection, provider state, and turntable state are in-memory
for the active page session. Server-side app-token caching is in-memory until token expiry.

**Testing**: `npm run lint`, `npm run build`, contract smoke checks for both the existing Vercel
handler and Vite development middleware, and manual browser acceptance from `quickstart.md`. No
automated test runner is currently defined in `package.json`.

**Target Platform**: Modern Chrome, Firefox, Edge, and Safari browsers with JavaScript, iframe
playback, encrypted media, and user-gesture autoplay permissions; responsive desktop and mobile
viewports. Production hosting must support the static web app plus a server-side metadata route.

**Project Type**: Single-project web application with a server-side catalog-search adapter.

**Performance Goals**: Keep the flat listening-room surface responsive; show healthy search results
within 3 seconds; show selected artwork and metadata within 5 seconds; run one active Embed
controller and one active search request at a time.

**Constraints**: Spotify Embed is the only playback source. Do not use the Web Playback SDK, direct
audio, or a playback proxy. The browser must not receive a server client secret or app token, and
the server must not receive a listener playback token. Preserve Spotify iframe permissions for
autoplay and encrypted media. Limit live catalog searches to 10 results per request, use an
app-configured market, handle rate limits, and preserve mock or graceful failure behavior.

**Scale/Scope**: One room page, one active selection and Embed session per browser, public track
and playlist selection, and artist or album metadata search. No private library, account profile,
local upload, DJ mixing, arbitrary camera navigation, or custom audio stream in v1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Intentional Composition and Scope** — PASS. The approved flat-surface exception preserves a
  fixed, display-first room and keeps the record treatment as the primary visual surface.
- **II. Single-Owner State** — PASS. `App` owns selection, access mode, volume, and normalized
  provider status; the flat surface and Embed adapter communicate through typed props and callbacks.
- **III. Graceful Degradation and Asset Stewardship** — PASS. Mock search, missing-art placeholders,
  Embed error states, and isolated legacy model assets keep failures contained; attribution remains
  in project documentation.
- **IV. Deliberate and Inclusive Interaction** — PASS. Custom controls have accessible names,
  keyboard and pointer or touch paths, visible non-color status, responsive layout, and reduced
  motion handling. Sound is tied to deliberate local actions.
- **V. Verification Before Ready** — PASS. The plan includes lint, build, endpoint contract checks,
  and settled-state browser validation across desktop and mobile sizes.
- **Technical and Safety Constraints** — PASS. Only public catalog metadata uses server credentials;
  Spotify owns authentication and playback inside the Embed, and no user playback token crosses the
  Turntable boundary.
- **Development Workflow and Quality Gates** — PASS. The feature spec, research, data model,
  contracts, and quickstart are recorded before implementation.

## Historical Foundation Audit

The following audit records the pre-reset source gaps that motivated the original implementation.
The current iteration's reset delta is recorded above and in the change-request tasks below:

1. The production and Vite search handlers currently return raw Spotify-shaped data, use the legacy
   `type` query shape, default to 12 results, allow up to 50, omit market/offset handling, and expose
   raw upstream failure behavior. They must converge on the normalized catalog contract with the
   current provider limit of 10 and safe client-facing errors.
2. `SpotifyEmbedPlayer` creates the right kind of controller, but it currently calls `play()` as
   soon as a URI changes, listens only to `playback_update`, and does not destroy the controller on
   ordinary unmount. Selection loading must not imply playback; readiness and provider events must
   drive visible state.
3. `SearchDrawer` currently imports `spotifyPkce.ts`, handles a browser-stored user token, and
   exposes “Your Playlists.” Those paths contradict the accepted v1 clarification and must be
   removed from the feature flow.
4. `App` previously owned only power, tonearm, and volume; it now owns normalized selection,
   connection mode, Embed status, and provider commands.
5. `TurntableCanvas` remains available as deferred legacy work. The current mounted view uses
   `ListeningRoomSurface` and does not import or mount the legacy 3D scene.

## Project Structure

### Documentation (this feature)

```text
specs/001-spotify-3d-turntable/
├── plan.md                    # This file
├── research.md                # Phase 0 decisions and evidence
├── data-model.md              # Session entities and state transitions
├── quickstart.md              # End-to-end validation scenarios
├── contracts/
│   ├── spotify-catalog.md     # Catalog gateway request/response/security contract
│   ├── spotify-embed.md       # Embed controller and event boundary
│   └── turntable-ui.md        # Scene state and action contract
├── checklists/requirements.md # Specification quality review
└── tasks.md                   # Phase 2 output from $speckit-tasks
```

### Source Code (repository root)

```text
api/
└── spotify/search.ts                 # Existing production gateway; normalize and harden in place

src/
├── App.tsx                           # Single owner of selection and playback/turntable state
├── components/
│   ├── room/ListeningRoomSurface.tsx  # Current flat main-view surface
│   ├── player/SpotifyEmbedPlayer.tsx # Existing Spotify iFrame host; refactor lifecycle/events
│   ├── search/SearchDrawer.tsx       # Existing custom search UI; remove PKCE/library tab
│   └── turntable/
│       ├── TurntableCanvas.tsx        # Deferred legacy 3D scene and hit targets
│       └── useVinylLabelTexture.ts    # Deferred legacy artwork texture boundary
├── services/spotify/
│   ├── catalog.ts                     # Client gateway client and response normalization
│   └── embed.ts                       # Typed wrapper around the iFrame controller/events
├── types/spotify.ts                   # Catalog, selection, and provider state types
├── utils/
│   ├── audioFx.ts                     # Deliberate local interaction sounds
│   └── spotifyPkce.ts                 # Existing legacy utility; retire from v1 and delete when unused
└── index.css                          # Responsive layout, Embed host, focus, and reduced-motion styles

vite.config.ts                        # Existing local catalog gateway/mock adapter; keep contract-aligned
public/models/yamaha_tt-300_record_player.glb
```

**Structure Decision**: Keep the existing single Vite/React project and its current component
boundaries. Refactor the existing production and development catalog adapters in place, add a thin
`services/spotify` layer only where it removes duplication between them and the UI, and mount the
flat surface from `App`. Keep the old 3D behavior isolated behind `TurntableCanvas` for a future
governed rebuild; do not introduce a second frontend, a playback service, a database, or a
user-authentication subsystem.

## Phase 0: Research Output

Research resolved the technical unknowns before design:

1. Spotify's official iFrame API is the playback boundary. Its documented controller supports
   entity loading, play, pause, resume, toggle, restart, and playback events.
2. Public catalog search uses server-side Client Credentials, not user OAuth. The gateway returns
   normalized metadata and URIs only; it never handles user playback credentials.
3. The custom control layer is capability-aware. Power, tonearm, play or pause, selection, and
   restart use documented Embed methods. Native Embed controls cover unsupported next, previous,
   shuffle, and volume behavior.
4. Provider readiness, buffering, autoplay blocking, encrypted-media support, and content failure
   are explicit state transitions rather than optimistic visual states.
5. Session data remains transient and the existing `App` plus typed presentation boundaries are
   retained; the current mounted room is flat and DOM/CSS-based.
6. The repository audit confirms that implementation begins with adaptation, not scaffolding:
   server catalog keys are already wired by name, the Embed/search/scene components already exist,
   and the PKCE/library path is deliberately excluded from the v1 target.

See `research.md` for rationale, alternatives, and primary documentation links.

## Phase 1: Design Output

The implementation should follow this dependency order, starting from the existing code:

1. Audit and extend the existing Spotify types and `App` state model for normalized catalog,
   selection, Embed session, and turntable state; confirm no browser playback-token type is needed.
2. Remove the PKCE imports, token storage, profile/library calls, and “Your Playlists” surface from
   the v1 search flow; retire `spotifyPkce.ts` once no in-scope code references it.
3. Align the existing Vite mock middleware and production catalog gateway to
   `contracts/spotify-catalog.md`, including current provider limits, market configuration, result
   normalization, pagination, and safe error mapping.
4. Refactor the existing Embed component around the single controller lifecycle and event adapter described in
   `contracts/spotify-embed.md`; preserve Spotify's iframe playback permissions.
5. Wire `App` as the state owner and connect search selection, the Spotify handoff/reveal flow,
   Embed commands, and provider events without moving shared state into a presentation component.
6. Render selected artwork and safe placeholders on the flat record label, synchronize record
   motion to confirmed playback, and keep the provider's visual controls outside the room layout.
7. Add accessible names/focus, responsive layout, reduced-motion behavior, recovery notices, and
   deliberate local sound effects.
8. Run the endpoint contract checks, `npm run lint`, `npm run build`, and every browser scenario in
   `quickstart.md`, recording viewport and provider limitations.

See `data-model.md` for validation rules and transitions, and `contracts/` for the boundaries that
must remain stable during implementation.

## Post-Design Constitution Recheck

- **Scope**: PASS. The design is one room page with one active Embed and a governed flat-surface
  replacement for the mounted 3D view.
- **State ownership**: PASS. Provider events flow into the application owner and then into the
  flat surface; the surface does not own authentication or playback state.
- **Graceful degradation**: PASS. Search, artwork, model, Embed, autoplay, and network failures
  have explicit safe states and recovery paths.
- **Safety and privacy**: PASS. The only server-side token is an app-only catalog token; no user
  playback credential or audio stream is introduced.
- **Accessibility and verification**: PASS. UI contracts require keyboard/pointer/touch behavior,
  non-color status, reduced motion, lint/build gates, and settled browser validation.

No constitution violations or unresolved technical questions remain.
