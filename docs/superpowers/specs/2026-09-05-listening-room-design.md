# Listening Room Scene — Design Spec

## Overview

Replace the procedural 3D turntable with a full listening room scene built from4 imported .glb models. Casual living room vibe — turntable on a mid-century console, speakers flanking, vinyls nearby. Single interactable: click the tonearm to pause/continue playback.

## Models

All models live in `public/models/`:

| Model | File | Purpose |
|-------|------|---------|
| Yamaha TT-300 | `yamaha_tt-300_record_player.glb` | Turntable (main subject) |
| Zenith Console | `zenith_console_-_mid_century_modern.glb` | Furniture — turntable sits on top |
| Microlab Solo 5C Speakers | `microlab_solo_5c_speakers.glb` | Stereo speakers, left + right |
| Vinyls | `vinyls_4.glb` | Stack/lean of record sleeves near the console |

The existing `pioneer-plx-1000.glb` is removed from the project (no longer referenced).

## Scene Layout

Casual living room arrangement:

```
Top-down view:

              [Wall / backdrop]
                    |
   [Speaker L]  [Console + Turntable]  [Speaker R]
                    |
              [Vinyls leaning]
```

### Positions (approximate, tuned visually during implementation)

| Element | Position | Notes |
|---------|----------|-------|
| Console table | `[0, 0, 0]` center | Ground level, furniture anchor |
| Turntable | `[0, <console-top-y>, 0]` | Sits on console surface |
| Speaker L | `[-3, 0, 0.5]` | Left side, on ground or on small stand |
| Speaker R | `[3, 0, 0.5]` | Right side, mirrored |
| Vinyls | `[2.5, 0, -1.5]` | Leaning near console, casual placement |
| Album sleeve | `[-3, <table-height>, -1]` | Procedural texture, leaning against wall |

All positions are relative and will be fine-tuned after import to look natural.

## Vinyl Record

The `vinyls_4.glb` model contains vinyl records. We extract or overlay a single spinning record on the turntable's platter.

### Approach

1. Load `vinyls_4.glb`, extract one vinyl mesh (or the whole group if it's a set)
2. Position it on the Yamaha model's platter
3. Scale to match the platter diameter (model-driven, not hardcoded)
4. Apply spin animation via `useFrame` — same damping physics as current code
5. For the center label: overlay a thin procedural `circleGeometry` with the track's album artwork as a `CanvasTexture` (reusing the existing `useAlbumArtTexture` pattern)

If the vinyl model doesn't have a separable record, fall back to a procedural cylinder scaled to the platter.

## Tonearm Interaction

The Yamaha model's tonearm is baked geometry — not animatable.

### Solution: Invisible click overlay

- Place a transparent `<mesh>` (box or capsule) over the tonearm region
- Material: `meshBasicMaterial({ visible: false })` — invisible but raycastable
- `onClick` → toggles `isNeedleDown` state
- The3D arm stays static — the playback state (spinning vinyl, audio) responds to the toggle

### Click feedback

- On click: play the existing needle drop sound effect (`playNeedleDropSound`)
- Visual: the vinyl starts/stops spinning (already handled by `isNeedleDown` prop)

## Props / State

Keep the existing prop interface — no changes needed:

```ts
interface TurntableCanvasProps {
  isPowered: boolean
  isNeedleDown: boolean
  volume: number
  onTogglePower: () => void
  onToggleNeedle: () => void
  onChangeVolume: () => void
}
```

`isPowered` controls: scene lighting warmth, indicator lights on the Yamaha model (if the model has emissive materials we can target).

## Lighting & Atmosphere

- **Background:** warm dark brown `#29221d` (existing)
- **Environment preset:** `apartment` (existing, provides soft reflections)
- **Key light:** warm spotlight from above-left, casting shadows
- **Fill light:** subtle point light from right, warm tone
- **Fog:** subtle distance fog matching background color for depth

## Camera

Fixed3/4 overhead angle, no orbit controls. Simple and cinematic.

```
Position: [0, 7.4, 8.3] (or adjusted to frame the console properly)
LookAt: [0, 0, 0]
FOV: ~39°
```

Tweak after importing models to get the right framing.

## Files Modified

| File | Change |
|------|--------|
| `src/components/turntable/TurntableCanvas.tsx` | Replace all procedural geometry with imported models. Remove `Vinyl`, `Needle`, `VolumeKnob`, `PowerLever`, `AlbumSleeve` components. Replace with model loaders + click overlay. |
| `public/models/` | Move `yamaha_tt-300_record_player.glb` here (already done). Remove `pioneer-plx-1000.glb`. |
| `vite.config.ts` | No changes needed — static assets in `public/` are served as-is |

## Error Handling

- If any .glb fails to load: render nothing for that element (scene degrades gracefully)
- Show a subtle loading state while models load (`Suspense` with `fallback={null}` already handles this)
- The vinyl label texture falls back to a placeholder if album art fails to load (existing behavior)

## Out of Scope

- Animating the model's tonearm (requires rigged model)
- Dynamic camera angles / orbit controls
- Record crate browsing in3D
- Speaker audio visualization
