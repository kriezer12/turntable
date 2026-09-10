# Data Model: Spotify 3D Turntable Listening Room

## Overview

All entities are session-scoped unless explicitly marked as server-only. The browser stores only
normalized metadata and playback state needed to render the room. Spotify credentials, app secrets,
and raw authorization responses are never part of the browser data model.

The repository already has partial provider types and local UI state, so these entities are the
target shape for extending `src/types/spotify.ts` and lifting state into `App`, not a reason to
duplicate the existing scene state. The model intentionally contains no user playback credential,
PKCE token, profile, or private-library entity. The server may hold an app-only catalog token in
memory, but that value is never serialized into a browser response.

## Entities

### Search Query

| Field | Type | Rules |
|---|---|---|
| `text` | string | Trim whitespace; empty text does not issue a live request |
| `types` | enum list | Track, artist, album, and playlist are supported result types |
| `limit` | integer | 1-10 for live Spotify search |
| `offset` | integer | Zero or greater; used for pagination |
| `status` | enum | Idle, searching, results, no-results, or error |
| `error` | user-facing error or null | Never contains credentials or raw provider responses |

The client sends `types` and `offset` using the catalog contract. The server translates `types` to
Spotify's provider query fields and applies the configured market and current provider limit.

### Catalog Result

| Field | Type | Rules |
|---|---|---|
| `uri` | Spotify URI string | Required; must identify the selected entity type |
| `kind` | enum | Track, artist, album, or playlist |
| `title` | string | Required for display |
| `creator` | string | Artist, owner, or primary creator when available |
| `imageUrl` | URL or null | Optional; placeholder is used when absent or failed |
| `contextUri` | Spotify URI or null | Playlist or album context when available |
| `isPlayable` | boolean | False for known unavailable or unsupported results |
| `availabilityReason` | string or null | Safe, user-facing explanation when not playable |

### Spotify Selection

| Field | Type | Rules |
|---|---|---|
| `result` | Catalog Result | Must be a selected result from the current search or demo data |
| `selectedAt` | timestamp | Session-only; not persisted |
| `labelArtworkUrl` | URL or null | Track artwork or playlist artwork; placeholder on failure |
| `playbackUri` | Spotify URI | Passed to the Embed controller only |
| `contextUri` | Spotify URI or null | Used to describe the active playlist or album context |

### Embedded Playback Session

| Field | Type | Rules |
|---|---|---|
| `status` | enum | Uninitialized, loading, ready, buffering, playing, paused, stopped, blocked, error |
| `playingUri` | Spotify URI or null | Taken from Embed playback events |
| `isPaused` | boolean | Provider-reported pause state |
| `isBuffering` | boolean | Provider-reported buffer state |
| `positionMs` | integer or null | Provider-reported position when available |
| `durationMs` | integer or null | Provider-reported duration when available |
| `errorCode` | safe internal enum or null | Never stores access tokens or provider secrets |

`status: ready` means the Embed controller is available, not that audio is playing. A URI load
must transition through loading/ready and must not optimistically set `playing` or call `play()`
without the user action required by the browser/provider.

### Turntable Scene State

| Field | Type | Rules |
|---|---|---|
| `isPowered` | boolean | Power-off forces the visual state to stopped |
| `tonearm` | enum | Lifted or lowered |
| `visualPlayback` | enum | Idle, loading, playing, paused, stopped, or error |
| `isRecordSpinning` | boolean | True only when `isPowered` and Embed status is playing |
| `volume` | number | UI setting in the inclusive range 0-1; applied only if supported |
| `selection` | Spotify Selection or null | Current label and context |
| `currentTrack` | display metadata or null | Current title and artist from the Embed/search result |
| `notice` | user-facing notice or null | Recovery or capability explanation |

### Player Command

| Command | Source | Embed action | Visual precondition |
|---|---|---|---|
| `load(selection)` | Search result | `loadEntity` | Selection is playable |
| `powerOn` | Power lever | None or `resume` after a later tonearm action | Record stays stopped until playback begins |
| `powerOff` | Power lever | `pause` | Record stops and tonearm lifts visually |
| `lowerTonearm` | Tonearm | `play` or `resume` | Requires power and a selection |
| `liftTonearm` | Tonearm | `pause` | Always safe |
| `togglePlay` | Play control | `togglePlay` | Requires Embed ready and selection |
| `restart` | Restart control | `restart` | Requires an active selection |
| `next`, `previous`, `shuffle`, `volume` | Native Embed or capability adapter | Provider-native control when available | Custom control is disabled unless capability is confirmed |

### Server Catalog Credential (server-only)

| Field | Type | Rules |
|---|---|---|
| `accessToken` | opaque string | App-only Client Credentials token; in-memory and never sent to the browser |
| `expiresAt` | timestamp | Refresh before expiry; do not persist |
| `market` | country code or null | Server configuration used for catalog availability; never derived from a user token |

`SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are configuration inputs for this server-only
boundary. A browser-side `VITE_SPOTIFY_CLIENT_ID` or a listener access token is not part of v1.

## Relationships

- One `Search Query` produces zero or more `Catalog Result` records.
- One `Catalog Result` becomes at most one active `Spotify Selection`.
- One `Spotify Selection` creates one active `Embedded Playback Session`.
- One `Embedded Playback Session` drives one `Turntable Scene State`.
- A playlist selection may produce multiple `playingUri` values over time while its `contextUri`
  remains stable.

## State Transitions

```text
Search: idle -> searching -> results | no-results | error

Embed: uninitialized -> loading -> ready -> buffering -> playing <-> paused
                                  |                 |              |
                                  +-> blocked       +-> error      +-> stopped

Turntable: no-selection -> loaded -> ready -> playing <-> paused
                                  |                 |
                                  +---------------> error
```

The record may spin only in `playing`. Power-off, tonearm lift, provider pause, provider stop,
blocked playback, or error must leave the record stopped.
