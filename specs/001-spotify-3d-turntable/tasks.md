---

description: "Actionable task list for the Spotify Turntable Listening Room"
---

# Tasks: Spotify Turntable Listening Room

**Input**: Design documents from `specs/001-spotify-3d-turntable/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Tests**: No automated test runner is currently defined and TDD was not requested. Each story
includes an independent manual test criterion; final validation uses the existing lint/build scripts
and the scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story. Existing repository foundations are adapted in
place; no second frontend, playback service, database, or user-authentication subsystem is added.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing implementation surface and keep the work aligned with the
spec-driven feature boundary.

- [X] T001 Audit the existing Spotify and turntable seams in `api/spotify/search.ts`, `vite.config.ts`, `src/App.tsx`, `src/components/player/SpotifyEmbedPlayer.tsx`, `src/components/search/SearchDrawer.tsx`, `src/components/turntable/TurntableCanvas.tsx`, `src/types/spotify.ts`, `src/utils/spotifyPkce.ts`, and `vercel.json`; record any additional compatibility constraints in `specs/001-spotify-3d-turntable/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared types, provider boundaries, and the v1 privacy boundary before any
user-story implementation begins.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Extend the existing Spotify types in `src/types/spotify.ts` with `SearchQuery`, `CatalogResult`, normalized catalog response/error types, `SpotifySelection`, `EmbeddedPlaybackSession`, and `TurntableSceneState`; preserve the rule that no browser user playback-token type exists
- [X] T003 Implement the shared catalog client and normalizer in `src/services/spotify/catalog.ts` using `/api/spotify/search`, the normalized response contract, `limit` constrained to 1-10, non-negative `offset`, safe error codes, and no browser `Authorization` header (depends on T002)
- [X] T004 Implement the typed Embed command/event adapter in `src/services/spotify/embed.ts` around the existing Spotify iFrame controller types; cover `ready`, `playback_started`, and `playback_update`, and never treat selection loading as confirmed playback (depends on T002)
- [X] T005 Remove PKCE imports, browser token storage, profile/library calls, and the “Your Playlists” surface from `src/components/search/SearchDrawer.tsx`; remove `src/utils/spotifyPkce.ts` only after confirming no in-scope reference remains, and do not introduce a replacement user-authentication flow
- [X] T006 Refactor `src/App.tsx` into the single owner of normalized selection, search status, Embed session status, power, tonearm, volume, notices, and provider command callbacks; keep the 3D canvas and Embed adapter state-free beyond typed props/callbacks (depends on T002, T003, T004, and T005)
- [X] T007 Add the shared Spotify service error/status mapping in `src/services/spotify/catalog.ts` and `src/services/spotify/embed.ts` so raw provider response bodies, passwords, access tokens, and unnecessary account details cannot enter UI state or diagnostics (depends on T003 and T004)

**Checkpoint**: Shared state, provider boundaries, and the no-PKCE v1 boundary are ready; story
implementation can proceed in priority order.

---

## Phase 3: User Story 1 - Find Music and Place It on the Turntable (Priority: P1) 🎯 MVP

**Goal**: Search public Spotify catalog content with the custom UI, select a track or playlist, and
load it into the Spotify Embed with artwork and metadata visible in the room.

**Independent Test**: Start with a loaded room, search for a known track and playlist, select each,
and verify that custom results, selected artwork/title, room status, and the Spotify Embed appear
together; selection alone must not claim that audio is playing.

### Implementation for User Story 1

- [X] T008 [US1] Refactor the production catalog gateway in `api/spotify/search.ts` to accept the catalog request contract, translate `types` to Spotify search parameters, apply the server-configured market and current provider limit of 10, normalize track/artist/album/playlist results, return pagination, and map upstream failures to safe error responses using only server-side `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- [X] T009 [P] [US1] Refactor the Vite development middleware in `vite.config.ts` to mirror `api/spotify/search.ts`, including mock/live parity, normalized results, `types`, `limit` 1-10, `offset`, market handling, and safe error codes (depends on T008)
- [X] T010 [US1] Update `src/components/search/SearchDrawer.tsx` to use `src/services/spotify/catalog.ts`, debounce editable public searches for songs, artists, albums, and playlists, render artwork/title/creator/playability, and pass a normalized `SpotifySelection` to `App` without any PKCE or personal-library state (depends on T003, T005, and T006)
- [X] T011 [US1] Refactor `src/components/player/SpotifyEmbedPlayer.tsx` to create one Spotify iFrame controller, load the selected track or playlist without forced `play()`, preserve autoplay/encrypted-media iframe permissions, subscribe to `ready`, `playback_started`, and `playback_update`, and destroy listeners/controller on teardown (depends on T004)
- [X] T012 [US1] Connect the selection and Embed lifecycle in `src/App.tsx` so loading a normalized track or playlist updates the current selection, metadata, provider status, and recovery notice without optimistic playback (depends on T006, T010, and T011)
- [X] T013 [US1] Pass selected artwork, title, creator, context, and confirmed playback state from `src/App.tsx` into `src/components/turntable/TurntableCanvas.tsx` and `src/components/turntable/useVinylLabelTexture.ts`, rendering the selected label artwork or a recognizable placeholder (depends on T012)

**Checkpoint**: A listener can search and select public track or playlist content, see it on the
turntable, and use Spotify's own Embed without the custom app receiving a listener playback token.

---

## Phase 4: User Story 2 - Control Playback Through the Virtual Turntable (Priority: P1)

**Goal**: Make the power control, tonearm, and transport controls behave like one connected
turntable while Spotify remains authoritative for audible playback.

**Independent Test**: Load a known playable track, exercise power, tonearm, play/pause, restart,
volume, and supported context controls, and verify that the record spins only during confirmed
playback and stops whenever Spotify reports paused, stopped, buffering, blocked, or error.

### Implementation for User Story 2

- [X] T014 [US2] Implement synchronized record and tonearm visuals in `src/components/turntable/TurntableCanvas.tsx`, including a visible lowered/lifted tonearm, record motion driven only by confirmed `playing`, and stable reduced-motion behavior (depends on T013)
- [X] T015 [US2] Wire power and tonearm commands in `src/App.tsx` to `pause`, `play`, or `resume` through the Embed adapter, enforcing that power-off pauses and stops the record and lowering the tonearm while powered is the only physical start request (depends on T012 and T014)
- [X] T016 [US2] Add custom play/pause and restart controls plus provider-confirmed status handling in `src/components/player/SpotifyEmbedPlayer.tsx` and `src/App.tsx`, using only documented iFrame operations and never forcing playback on selection (depends on T011 and T015)
- [X] T017 [US2] Implement the visible volume control and capability-aware previous, next, and shuffle behavior in `src/App.tsx`, `src/components/player/SpotifyEmbedPlayer.tsx`, and `src/components/search/SearchDrawer.tsx`; keep unsupported operations visibly unavailable and defer provider-native operations to Spotify’s Embed controls (depends on T016)
- [X] T018 [US2] Update current-track/context synchronization in `src/types/spotify.ts`, `src/App.tsx`, and `src/components/turntable/TurntableCanvas.tsx` so playlist transitions update the label, title, creator, context, and record state together when Embed events provide new metadata (depends on T016 and T017)

**Checkpoint**: The room's physical metaphor controls and Spotify's native controls remain
synchronized, with no false spinning state and no custom audio path.

---

## Phase 5: User Story 3 - Understand and Recover From Playback State (Priority: P2)

**Goal**: Make empty results, unavailable content, blocked playback, artwork failure, service
outages, and authentication/entitlement requirements understandable and recoverable.

**Independent Test**: Exercise empty/long/space-only queries, failed search, unavailable content,
blocked autoplay, failed artwork, blocked Embed, and network loss; verify a clear non-color status
message and at least one retry, alternate selection, or Spotify recovery action for each case.

### Implementation for User Story 3

- [X] T019 [US3] Add empty-query, whitespace, long-query, no-results, retry, and failed-search states in `src/components/search/SearchDrawer.tsx` using safe messages from `src/services/spotify/catalog.ts` while keeping the query editable and avoiding raw provider output
- [X] T020 [US3] Map Embed readiness, buffering, blocked autoplay, unavailable content, third-party restrictions, and network failures in `src/components/player/SpotifyEmbedPlayer.tsx` and `src/services/spotify/embed.ts` to the normalized playback statuses and recovery callbacks in `src/App.tsx`
- [X] T021 [US3] Add visible loading, playing, paused, stopped, blocked, and error notices with retry/alternate-selection/continue-in-Spotify actions in `src/App.tsx`, `src/components/search/SearchDrawer.tsx`, and `src/components/player/SpotifyEmbedPlayer.tsx`; never render a custom Spotify password form or request `/v1/me`
- [X] T022 [P] [US3] Harden artwork and scene degradation in `src/components/turntable/useVinylLabelTexture.ts` and `src/components/turntable/TurntableCanvas.tsx` so missing, malformed, or failed artwork, model loading failure, and reduced-motion preferences retain a recognizable and usable room
- [X] T023 [P] [US3] Apply accessible names, visible focus, keyboard/pointer/touch activation, non-color playback cues, responsive mobile layout, and no-horizontal-scroll behavior in `src/components/search/SearchDrawer.tsx`, `src/components/player/SpotifyEmbedPlayer.tsx`, `src/components/turntable/TurntableCanvas.tsx`, and `src/index.css`
- [X] T024 [US3] Audit diagnostic and server logging paths in `api/spotify/search.ts`, `vite.config.ts`, `src/services/spotify/catalog.ts`, and `src/services/spotify/embed.ts` so events contain only safe status/error codes and no Spotify password, playback access token, or unnecessary account detail

**Checkpoint**: Every defined failure state is understandable, preserves the last safe visual state,
and offers a recovery path without weakening the Spotify privacy boundary.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete feature against the contracts, constitution, and browser scenarios.

- [X] T025 [P] Add lightweight normalized catalog contract smoke checks in `scripts/verify-spotify-contract.mjs` covering mock mode, live response shape, pagination, limit 10, and safe error mapping for both `api/spotify/search.ts` and `vite.config.ts`
- [X] T026 [P] Review existing interaction audio and motion behavior in `src/utils/audioFx.ts`, `src/components/turntable/TurntableCanvas.tsx`, and `src/index.css` so sounds remain tied to deliberate local controls and motion respects reduced-motion preferences
- [X] T027 Run `npm run lint` and `npm run build` from `package.json`; record command results, browser/viewport coverage, and known Spotify provider limitations in `specs/001-spotify-3d-turntable/quickstart.md`
- [X] T028 Execute every scenario in `specs/001-spotify-3d-turntable/quickstart.md` at 360px mobile and representative desktop widths, including privacy/network checks, and resolve any mismatch before marking the feature ready

## Change Request — Spotify Handoff and 2D Main-View Reset

T013-T018, T022-T023, and T026 remain checked historical records from the prior 3D iteration.
They are superseded for the mounted main view by T029-T032; the legacy 3D files remain isolated
for a future separately scoped rebuild.

- [X] T029 [US1] Add the typed Spotify access-mode state and the sidebar connection rail above search in `src/types/spotify.ts`, `src/components/search/SpotifyConnectionRail.tsx`, and `src/components/search/SearchDrawer.tsx`
- [X] T030 [US2] Add the official Spotify handoff, popup-blocked fallback, explicit return/reveal action, hidden-by-default Embed mount, and hide-player teardown in `src/services/spotify/connection.ts`, `src/App.tsx`, and `src/components/player/SpotifyEmbedPlayer.tsx`
- [X] T031 [US1] Replace the mounted 3D main view with the flat DOM/CSS `src/components/room/ListeningRoomSurface.tsx`, retaining selected artwork, metadata, and provider-confirmed record motion
- [X] T032 [US3] Validate the reset at desktop and 360×748 mobile widths, including connection rail placement, no preview iframe before reveal, iframe removal after hide, zero mounted canvas elements, and no horizontal overflow; record results in `specs/001-spotify-3d-turntable/quickstart.md`
- [X] T033 [US2] Hide the mounted Spotify provider surface behind a clipped playback-engine host, rename the connected state, keep room play/pause/restart as the visible controls, and remove copy that directs listeners to native Embed controls

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 establishes the repository baseline.
- **Foundational (Phase 2)**: T002-T007 depend on the baseline and block all user stories.
- **User Story 1 (Phase 3)**: T008-T013 depend on the foundational phase and deliver the MVP.
- **User Story 2 (Phase 4)**: T014-T018 depend on the loaded-selection and Embed flow from User Story 1.
- **User Story 3 (Phase 5)**: T019-T024 depends on the shared flow and can be implemented after the P1 stories.
- **Polish (Phase 6)**: T025-T028 depends on all desired story checkpoints.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational; it is the MVP increment.
- **User Story 2 (P1)**: Depends on User Story 1's selection and Embed lifecycle, especially T012 and T013.
- **User Story 3 (P2)**: Depends on the shared state and provider paths from User Stories 1 and 2 so it can harden their real states.

### Parallel Opportunities

- T002, T004, and T005 can begin in parallel after T001 because they target separate type/provider/UI boundaries.
- T008 and T009 are separate production/development adapters after the shared catalog types and client are ready.
- T022, T023, and T025-T026 target separate files and can run in parallel once their story dependencies are complete.
- The user stories are not independent in this feature because playback controls require a loaded selection; deliver P1 User Story 1 before P1 User Story 2, then add P2 recovery hardening.

## Implementation Strategy

### MVP First

1. Complete T001-T007 to establish the existing-code baseline, typed state, provider boundaries, and no-PKCE v1 scope.
2. Complete T008-T013 for public search, selection loading, artwork, metadata, and one Spotify Embed.
3. Stop at the User Story 1 checkpoint and validate the intentional play action independently.

### Incremental Delivery

1. Add User Story 2 for physical controls and confirmed playback synchronization.
2. Add User Story 3 for failure states, recovery, accessibility, privacy-safe diagnostics, and responsive behavior.
3. Run the contract smoke checks, lint/build, and all quickstart scenarios before release review.

### Notes

- Every task uses the required checkbox, sequential ID, optional `[P]` marker, story label where applicable, and an exact repository file path.
- Existing files are refactored in place unless a new shared service or smoke-check script removes duplication or makes a contract executable.
- The v1 implementation must not reintroduce browser PKCE, personal libraries, Spotify profile retrieval, custom audio, or a listener playback token.
