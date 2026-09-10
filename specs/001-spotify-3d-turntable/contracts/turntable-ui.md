# Contract: Turntable UI and State Adapter

## State Inputs

`App` currently owns only local power, tonearm, and volume state. The implementation must extend
that owner rather than placing provider state inside the canvas or search drawer.

The 3D scene receives a typed, normalized state object:

```text
isPowered: boolean
tonearm: lifted | lowered
playback: idle | loading | ready | buffering | playing | paused | stopped | blocked | error
selection: Spotify Selection | null
currentTrack: display metadata | null
volume: number
notice: user-facing notice | null
```

The scene does not own Spotify credentials, provider controllers, search requests, or duplicated
playback state.

## User Actions

| UI action | App command | State rule |
|---|---|---|
| Power lever on | `powerOn` | Show powered state; do not spin until Embed confirms playing |
| Power lever off | `powerOff` | Pause when active, lift the tonearm visually, and stop the record |
| Tonearm lower | `lowerTonearm` | Request play only when powered and a selection exists |
| Tonearm lift | `liftTonearm` | Request pause and stop record motion after confirmation |
| Search result select | `load(selection)` | Update artwork and metadata; reset playback to loading or ready |
| Play or pause | `togglePlay` | Delegate to Embed controller and follow provider events |
| Restart | `restart` | Delegate to Embed controller and retain selection |
| Next, previous, shuffle, volume | Native Embed or capability adapter | Do not simulate unsupported provider commands |

## Accessibility Rules

- Every custom action has an accessible name describing the physical metaphor and result.
- Keyboard focus is visible and keyboard activation matches pointer or touch activation.
- Playing, paused, stopped, loading, blocked, and error states are announced through text or an
  equivalent non-color cue.
- Decorative 3D meshes are excluded from the accessibility tree; functional hit targets are not.
- Motion is reduced or replaced with a stable visual state when `prefers-reduced-motion` is enabled.

## v1 Authentication Boundary

The search drawer is public catalog search only. It must not render a personal-library tab, request
`/v1/me`, store a browser Spotify token, or import the legacy `spotifyPkce.ts` helper. Any Spotify
sign-in or entitlement prompt belongs to Spotify's own Embed surface.
