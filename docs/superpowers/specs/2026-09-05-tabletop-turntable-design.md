# Tabletop Turntable Design

## Intent

Replace the dashboard-style Spotify player with a full-screen, display-first record-player scene inspired by the supplied listening-room reference. The page is a fixed camera composition, not a navigable 3D workspace.

## Composition

- A warm wood table occupies the lower foreground.
- The turntable is centered in a fixed angled-overhead view.
- A square album-art placeholder leans behind the left side of the deck, updating from the current artwork source when one is supplied.
- The scene has a restrained, dim listening-room background and warm practical lighting.

## Interaction

- The power lever starts or stops platter motion.
- A volume knob adjusts an in-scene volume value and rotates visually.
- Clicking the tonearm/needle toggles play state: when paused the arm lifts; when playing it lowers onto the vinyl.
- The record keeps its procedural label artwork. There is no Spotify search, account access, embedded player, camera chooser, transport bar, keyboard navigation, RPM control, or groove seeking.

## Technical shape

`App` owns the small interaction state (power, volume, and needle state). `TurntableCanvas` renders and receives the three interactions through explicit callbacks. The 3D scene owns the tabletop, sleeve placeholder, deck, record, and tonearm; the page shell owns only the unobtrusive title/status copy.

## Verification

- TypeScript build passes.
- The turntable remains visible and composed at common desktop and mobile viewport sizes.
- Power lever, volume knob, and needle each respond without requiring navigation.
- Pausing visibly lifts the arm and stops the vinyl; powering off also stops it.
