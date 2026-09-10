# Feature Specification: Spotify Turntable Listening Room

**Feature Branch**: `001-spotify-3d-turntable`

**Created**: 2026-09-10

**Status**: Implemented — 2D main-view reset, opt-in Spotify playback, and custom controls

**Input**: User description: "Create a website app that plays music from a 3D room with a turntable connected to Spotify. Playback runs entirely inside Spotify's own Embed IFrame player, while the Turntable server never sees the user's Spotify login, password, or playback access token. Provide a custom search bar and a virtual turntable experience with a spinning record, tonearm, and track or playlist artwork rendered on the vinyl label. Use Virtual Vinyl as a system-flow reference, but make the turntable interactable."

## Current Iteration Reset — 2026-09-10

This iteration supersedes the earlier 3D-main-view requirements while preserving the Spotify
playback boundary. The mounted application now uses a flat DOM/CSS listening-room surface; no R3F
canvas, GLB model, tonearm, or other 3D object is rendered by `App`. The prior 3D implementation
remains isolated for a future separately scoped rebuild and is not part of the current acceptance
surface.

Playback is opt-in: selecting a public catalog result updates the flat surface and metadata
without mounting Spotify's playback engine. A sidebar connection rail above search opens Spotify's
official site in a new tab, offers a return action, and only then mounts a visually hidden official
Embed as the audio engine. Spotify's native play, pause, progress, and volume controls never appear
in the room; Turntables owns the visible transport UI while Spotify remains the playback authority.
Turntables does not receive Spotify login credentials, passwords, or playback access tokens.

## Clarifications

### Session 2026-09-10

- Q: Should this feature build on the repository's existing Spotify and turntable progress,
  including configured environment keys? → A: Yes. Treat the existing 3D scene and model,
  Spotify search route and mock path, Embed player, search drawer, Spotify types, Vercel routing,
  and environment-key wiring as foundations to audit, preserve where compatible, and extend under
  this specification rather than recreate from zero. The existing key names are
  `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `VITE_SPOTIFY_CLIENT_ID`; their values MUST
  remain outside source control and are intentionally not recorded here.
- Q: Should the existing browser-side PKCE "Your Playlists" login and library flow remain in v1?
  → A: No. Remove it from this feature; v1 uses public catalog search and Spotify's own Embed
  authentication or entitlement experience only. The existing PKCE utility and playlist tab are
  out of scope and must not be used for playback.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find Music and Place It on the Turntable (Priority: P1)

As a listener, I want to search for a song or playlist and place my selection into the
listening-room surface so that I can begin listening through a tactile, editorial interface.

**Why this priority**: Finding and starting music is the minimum valuable experience.

**Independent Test**: Start with a loaded room, search for a known track, select a playable
result, and verify that the selected artwork and metadata appear on the flat surface without
mounting Spotify's playback engine until the listener connects it.

**Acceptance Scenarios**:

1. **Given** the listening room is loaded with no selection, **When** the listener enters a
   song, artist, album, or playlist query, **Then** the custom search experience shows matching
   results with artwork, title, creator, and availability state.
2. **Given** a playable track result is shown, **When** the listener selects it, **Then** the
   track is loaded into the flat listening-room surface, its artwork appears on the record label,
   and its title and artist appear in the room status; Spotify playback remains disconnected by default.
3. **Given** a playable playlist result is shown, **When** the listener selects it, **Then**
   the playlist artwork appears on the record label and playlist metadata is shown; Spotify's
    playback remains disconnected until the listener chooses to connect it.
4. **Given** the browser requires a user gesture to start sound, **When** the listener uses an
   explicit play action after the connection handoff, **Then** playback starts through the
   embedded player and the room changes to its playing state.

---

### User Story 2 - Connect Official Spotify Playback Without Provider Controls (Priority: P1)

As a listener, I want to connect Spotify without displaying its redundant provider controls so
that the room's custom transport UI remains the only visible playback interface.

**Why this priority**: The opt-in handoff is the product's privacy and playback boundary.

**Independent Test**: Select a result, connect to Spotify, start playback through the room controls,
then disconnect playback and verify the hidden engine iframe is removed.

**Acceptance Scenarios**:

1. **Given** the connection rail is visible above search, **When** the listener chooses Connect
   Spotify, **Then** the app opens Spotify's official site or presents a direct-link fallback and
   changes the rail to an explicit return action.
2. **Given** a result is selected, **When** the listener chooses the return action, **Then** the
   official Embed mounts as a visually hidden playback engine without automatic playback; Spotify's
   provider controls are not visible in the room.
3. **Given** playback is connected, **When** the listener uses an explicit play action, **Then**
   playback is requested through Spotify and the flat record spins only after confirmed playback.
4. **Given** playback is connected, **When** the listener disconnects it, **Then** the app pauses
   through the controller when possible, removes the hidden engine iframe, and retains selected metadata.
5. **Given** playback is active, **When** the listener uses the room's restart action, **Then**
   the flat surface follows provider-confirmed playback state and current metadata.

---

### User Story 3 - Understand and Recover From Playback State (Priority: P2)

As a listener, I want clear status and recovery guidance when Spotify content or connectivity
is unavailable so that the experience remains understandable instead of appearing broken.

**Why this priority**: The room depends on an external catalog and playback service, so graceful
recovery protects trust and keeps the core experience usable.

**Independent Test**: Exercise empty results, unavailable content, blocked playback, missing
artwork, and a disconnected network, then verify that every state has a clear explanation and
next action.

**Acceptance Scenarios**:

1. **Given** a search returns no matching content, **When** results finish loading, **Then** the
   custom search experience explains that no matches were found and keeps the query editable.
2. **Given** a selected item cannot be played because of account, region, or content limits,
   **When** playback is attempted, **Then** the room does not pretend that audio is playing and
   provides a clear way to choose another item or continue in Spotify.
3. **Given** the embedded player cannot load or the network is unavailable, **When** the failure
   is detected, **Then** the room preserves the last known safe state and presents a retry or
   alternate recovery action.
4. **Given** the listener is not signed into Spotify, **When** Spotify requires account access,
   **Then** any sign-in or entitlement step is presented by Spotify's own embedded experience;
   the custom site never presents a Spotify password form.
5. **Given** an error or playback transition is recorded for diagnostics, **When** the diagnostic
   event is inspected, **Then** it contains no Spotify password, playback access token, or
   unnecessary personal account detail.

### Edge Cases

- A query is empty, very long, or contains only spaces.
- Search results include an item with no artwork, malformed artwork, or artwork that fails to
  load.
- A playlist is empty, contains removed tracks, or contains a mix of playable and unavailable
  tracks.
- The selected item is unavailable in the listener's account or region.
- The listener changes selections while a prior item is still loading.
- Spotify playback is limited, blocked, paused externally, or unable to start because the browser
  has not received an explicit user gesture.
- The embedded player is blocked by browser privacy settings or third-party content restrictions.
- The room is viewed at a narrow mobile width or a large desktop width; core controls remain
  reachable without horizontal page scrolling.
- The listener reloads the page or leaves and returns; the experience does not claim that playback
  is still active unless the embedded player confirms it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a custom, responsive flat listening-room surface with a
  recognizable record artwork treatment and clearly identifiable playback status. The current
  iteration MUST NOT mount a 3D canvas, GLB model, tonearm, or other 3D object in the main view.
- **FR-002**: The system MUST provide a custom search bar that accepts searches for songs,
  artists, albums, and playlists and returns selectable results with artwork and descriptive
  metadata.
- **FR-003**: The system MUST allow a listener to select a track or playlist result and load its
  metadata and artwork into the custom surface. It MUST keep Spotify playback disconnected until
  the listener explicitly connects it through the connection flow.
- **FR-004**: The system MUST use Spotify's embedded player as the only source of playback audio;
  the custom site MUST NOT stream, proxy, download, or synthesize the selected music.
- **FR-005**: The Turntable server MUST NOT receive, store, log, or expose the listener's Spotify
  login, password, or access token used for playback. The custom site MUST NOT request those
  credentials in its own forms.
- **FR-006**: Version 1 MUST NOT include browser-side PKCE login, personal library access, a
  "Your Playlists" account tab, or user-profile retrieval. Any Spotify sign-in or entitlement step
  MUST remain inside Spotify's own Embed experience.
- **FR-007**: The system MUST treat the embedded player's actual playback state as authoritative
  for whether the record is spinning and the room is marked as playing.
- **FR-008**: The connection rail MUST provide visible `hidden`, `handoff-started`, and
  `connected` states above the search bar. It MUST never claim that Turntables verified a
  Spotify login or entitlement.
- **FR-009**: The custom surface MUST expose play or pause and restart actions only when a
  selection exists and playback is connected. Unsupported transport actions MUST be visibly
  unavailable; the room MUST NOT require the provider's visible controls for its supported actions.
- **FR-010**: The custom volume readout MUST show its local setting and MUST NOT imply that
  Turntables controls Spotify's provider volume unless a supported provider command is available.
- **FR-011**: The Spotify Embed iframe MUST be absent while access mode is `hidden` or
  `handoff-started`, and MUST mount only after the listener explicitly connects playback. When
  mounted, the iframe MUST remain visually hidden and outside the room's visible control layout.
- **FR-012**: The system MUST render the selected track artwork or playlist artwork on the vinyl
  label and MUST provide a recognizable placeholder when artwork is unavailable.
- **FR-013**: The room MUST show the current track title, artist, and relevant playlist or context
  name when available, along with distinguishable loading, playing, paused, stopped, and error
  states.
- **FR-014**: The system MUST give the listener a clear message and recovery action for empty
  search results, unavailable content, failed playback, failed artwork, and service outages.
- **FR-015**: All custom controls MUST have accessible names, visible focus treatment, keyboard
  and pointer or touch operation, and status cues that do not rely on color alone.
- **FR-016**: The experience MUST remain usable at common mobile and desktop viewport sizes,
  keeping the flat surface, connection rail, search, and primary controls reachable without
  horizontal page scrolling.
- **FR-017**: Any analytics or diagnostic data MUST exclude Spotify passwords, playback access
  tokens, and unnecessary personal account details.

### Key Entities *(include if feature involves data)*

- **Search Query**: The listener's text request for a song, artist, album, or playlist.
- **Spotify Selection**: The chosen playable context, including its type, title, creator, artwork,
  availability, and playback reference.
- **Embedded Playback Session**: The Spotify-owned playback surface and its reported loading,
  playing, paused, stopped, unavailable, or authentication-required state.
- **Listening Room State**: The visual state of the flat room, including record motion, label
  artwork, current metadata, connection mode, and error status.
- **Playback Context**: The current track or playlist context used for previous, next, restart,
  and shuffle behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test listeners can search for a known song or playlist
  and reach an intentional play action within 45 seconds of opening the site.
- **SC-002**: On a healthy connection, 95% of playable selections show the correct artwork and
  current metadata in the room within 5 seconds of selection.
- **SC-003**: In 95% of playback tests, the visual playing state matches the audible playback
  state within 1 second, with no record motion shown while audio is paused or stopped.
- **SC-004**: 100% of privacy acceptance tests confirm that the custom site does not request or
  transmit a listener's Spotify password or playback access token to the Turntable server.
- **SC-005**: At least 90% of test listeners can identify the current track and whether playback
  is playing, paused, stopped, or unavailable without assistance.
- **SC-006**: At 360 pixels wide and at a representative desktop width, 100% of primary controls
  remain reachable and the page produces no horizontal scrolling.
- **SC-007**: 100% of defined failure scenarios show an understandable explanation and at least
  one recovery action without requiring a full page reload.
- **SC-008**: In moderated usability testing, at least 80% of listeners describe the scene as
  feeling like a connected turntable experience rather than a standard search-and-play dashboard.

## Assumptions

- This is an in-progress repository being transferred to spec-driven development. Existing
  Spotify and turntable foundations are implementation starting points, not proof that every
  requirement is complete; each foundation must be validated against this specification.
- The first release supports searching and selecting public tracks and playlists; browser-side
  PKCE login, personal library management, the "Your Playlists" tab, following artists, local
  uploads, DJ mixing, and arbitrary 3D camera navigation are outside this feature.
- Spotify may require the listener to sign in or have an eligible account for full playback.
  Spotify's embedded experience owns that account and entitlement step.
- Browser autoplay restrictions may require an explicit click or tap before sound begins. The room
  MUST wait for confirmed playback before showing the record as spinning.
- The embedded player remains available as the canonical fallback for any playback action that the
  custom turntable cannot initiate or control.
- Search and playback depend on an internet connection and the availability of Spotify content in
  the listener's market.
- The visual flow takes inspiration from Virtual Vinyl, which presents a start entry, Spotify
  access, current-track metadata, transport actions, song or playlist search, and tap-to-play.
  Reference: https://www.virtualvinyl.app/
- The exact visual layout, typography, motion, and control placement will be defined during design
  planning; the experience will not copy the reference site's visual identity or assets.
