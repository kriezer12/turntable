# The Turntables — Project Plan

## 1. Overview

**The Turntables** is a vinyl-aesthetic music player. Users search for tracks or playlists on Spotify and experience playback through a virtual turntable interface: a 3D scene with a spinning record, tonearm, and the track/playlist artwork rendered on the vinyl label.

**Core promise to users:** Playback runs entirely inside Spotify's own Embed IFrame player. The Turntables server never sees the user's Spotify login, password, or access token used for playback.

---

## 2. Architecture summary

The app has three independent concerns, each with its own auth model. Do not conflate them — this separation is also the basis of the app's privacy claim.

| Concern | Auth used | Token exposure |
|---|---|---|
| Public search (tracks, albums, playlists) | Spotify **Client Credentials** flow (app-only, no user involved) | Server-side only, never sent to client |
| "Your playlists" library view | Spotify **Authorization Code + PKCE** (user login), scope: `playlist-read-private` | Used client-side only for metadata reads, never for playback |
| Actual audio playback | **Spotify Embed IFrame API** — Spotify handles its own login inside the iframe | Never touches Turntables server or client JS |

### 2.1 Public search flow
- Backend (or a serverless function) requests a Client Credentials token from Spotify's `/api/token` endpoint using your app's client ID + secret.
- Token is cached server-side and refreshed before expiry (typically 1 hour).
- Frontend calls your backend, backend calls Spotify's `/v1/search` endpoint, results are returned to frontend.
- No end user login required for this feature at all.

### 2.2 "Your playlists" flow
- Separate, optional feature — user clicks "Connect Spotify" to see their own library.
- Standard Authorization Code with PKCE (no client secret exposed to frontend):
  1. Generate `code_verifier` + `code_challenge`.
  2. Redirect to Spotify `/authorize` with `scope=playlist-read-private`.
  3. Handle redirect, exchange `code` for access + refresh token directly from the frontend.
  4. Use this token **only** to call `/v1/me/playlists` and similar metadata endpoints.
- Be explicit in the UI/copy that this token is scoped narrowly and never used for playback — keeps the privacy claim accurate once this feature ships.

### 2.3 Playback flow (Spotify Embed IFrame API)
- On track/playlist selection, mount a Spotify embed iframe pointed at the resource URI (`spotify:track:...` or `spotify:playlist:...`).
- Use the **Embed IFrame API** (`IFrameAPI.createController`) to:
  - Send commands: `play()`, `pause()`, `seek()`, `resume()`.
  - Listen for events: `playback_update` (gives position, duration, is_paused, track metadata) — this is the single source of truth for animating the record spin and tonearm position.
- Spotify handles the user's login/session inside the iframe itself. If the user isn't logged in there, Spotify prompts them inside the frame — this is outside your app's control and by design.

---

## 3. Tech stack recommendation

- **Frontend framework:** React (Vite) or Next.js
- **3D scene:** `@react-three/fiber` + `@react-three/drei` (camera controls, easy mesh/texture handling)
- **Animation/tweening:** GSAP for camera pans and UI transitions
- **Styling:** Tailwind CSS or CSS Modules, depending on preference
- **Backend:** Minimal — a serverless function (Vercel/Netlify function or small Node/Express service) is enough. Only needed for:
  - Client Credentials token issuance/caching for search
  - PKCE token exchange for the "your playlists" login (can also be done fully client-side since PKCE doesn't require a secret)
- **Hosting:** Vercel or Netlify (static frontend + serverless functions in one deploy)

---

## 4. Feature breakdown

### 4.1 Search & browse (landing view)
- Search bar — debounced input, calls Search API (Client Credentials), shows tracks/albums/playlists.
- Results displayed as a stylish grid/list with cover art, title, artist/owner.
- Optional "Your Playlists" panel/tab — visible only after the user connects Spotify (PKCE login), shows their private playlist library.

### 4.2 Transition to turntable view
- On selecting a result, animate a camera pan/dolly from the search UI into the 3D turntable scene.
- Use GSAP or `drei`'s `CameraControls` to tween camera position/rotation — avoid an abrupt cut.

### 4.3 3D turntable scene
- **Turntable base** — simple cylindrical/rectangular mesh, minimal geometry (this is a stylized scene, not a photorealistic one).
- **Vinyl record** — a flat cylinder or ring mesh, spinning continuously while playing.
  - Album/track/playlist artwork should be applied as a texture **only on the center label**, not across the whole record — use a small circular plane or ring geometry for the label, layered on top of a plain black vinyl texture.
- **Tonearm** — a simple hinged mesh; its angle should map to playback progress (`position / duration` from the `playback_update` event), sweeping from the outer edge to the center as the track progresses.
- **Spin state** — driven entirely by `is_paused` from the Embed API. Do not run an independent timer for the animation loop; always read from the actual playback state event so the visual never drifts out of sync with real audio.

### 4.4 Turntable controls (tactile UI)
- Play/pause, skip next/previous (if playing a playlist context), and a seek affordance mapped to the tonearm.
- All controls call the Embed IFrame API's controller methods — no separate Web API player calls needed since Spotify's iframe owns actual playback state.

---

## 5. Implementation order (suggested milestones)

1. **Scaffold project** — Vite/Next.js + Tailwind + Three.js/r3f dependencies installed.
2. **Search MVP** — Client Credentials backend function + working search bar + results grid (no 3D yet, no playback yet).
3. **Embed playback MVP** — Selecting a result mounts a basic (non-3D) Spotify embed iframe and confirms playback + IFrame API events work end-to-end.
4. **3D turntable scene (static)** — Build the r3f scene: turntable, vinyl, tonearm, camera, lighting — with placeholder/static artwork texture, no live playback wiring yet.
5. **Wire playback state to 3D scene** — Connect `playback_update` events to spin animation, tonearm angle, and texture swap for the current track's artwork.
6. **Camera transition** — Build the pan/dolly animation from search view into the turntable view.
7. **"Your Playlists" login feature** — Add PKCE login, playlist library panel, using the narrow `playlist-read-private` scope.
8. **Polish pass** — Loading states, empty states, error handling (e.g., embed fails to load, search returns nothing), responsive/mobile behavior for the 3D scene.

---

## 6. Key technical gotchas to flag for the coding agent

- **Do not mix the three auth flows.** The Client Credentials token (search) must never be exposed client-side if a secret is involved server-side; the PKCE token (playlists) must never be passed to the embed player; the embed player's internal session must never be read or stored by the app.
- **Animation must be state-driven, not timer-driven.** Always resync spin/tonearm animation from the Embed API's `playback_update` event, not from `setInterval`, to avoid visual drift from actual audio.
- **Vinyl label texture placement.** Artwork goes on a small central label area, not the full disc — a common mistake is stretching the cover art across the entire record face.
- **Client Credentials token expiry.** Cache and refresh server-side (~1 hour expiry) rather than requesting a new token per search call.
- **Mobile/responsive 3D.** A full 3D scene can be heavy on mobile — plan for a reduced-fidelity fallback or a 2D "flat" turntable view on low-power devices.
- **Embed iframe login is out of your control.** If a user isn't logged into Spotify in their browser, the iframe will show its own login prompt — design the surrounding UI so this doesn't look broken (e.g., a subtle "waiting for Spotify..." state around the iframe).

---

## 7. Open design decisions (for the coding agent or you to resolve during build)

- Exact visual style direction for the 3D scene (retro hi-fi, minimalist studio, neon/synthwave, etc.)
- Whether playlist playback shows a visible tracklist/queue alongside the turntable, or keeps the UI minimal (just the spinning record + controls)
- Whether the "Your Playlists" feature is part of v1 or a fast-follow after the core search + turntable experience ships