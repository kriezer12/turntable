<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.1.0
- Modified principles: I. Intentional Composition and Scope (explicitly permits a governed
  flat-surface reset while preserving display-first composition)
- Added sections: scoped flat-surface exception under Technical and Safety Constraints
- Removed sections: none
- Follow-up TODOs: confirm the original ratification date.
-->
# Turntable Constitution

## Core Principles

### I. Intentional Composition and Scope

The experience MUST remain a fixed-camera, display-first listening-room scene. New work
MUST preserve the tabletop turntable as the focal point, use the design specifications as
the source of truth for composition, and MUST NOT add a navigable 3D workspace or unrelated
player surfaces without a constitution amendment. An approved feature specification MAY replace
a mounted 3D scene with a flat DOM/CSS surface when the replacement remains fixed, display-first,
and record-centered. Rationale: the product's value is a calm, cinematic interaction rather than
a general-purpose 3D editor, whether the current surface is 3D or flat.

### II. Single-Owner State

Interaction state MUST have one owner at the application boundary and MUST flow into scene
components through typed props and explicit callbacks. Playback MUST be derived from the
documented power and needle state, and components MUST NOT duplicate or silently mutate
shared state. Rationale: one state model keeps controls predictable and makes behavior easy
to validate.

### III. Graceful Degradation and Asset Stewardship

Imported models and remote media MUST be treated as optional runtime inputs. A failed asset
load MUST leave the rest of the scene usable and MUST use a safe fallback where one is
defined. Model-driven placement and scaling MUST be preferred over brittle assumptions about
asset dimensions. Third-party assets MUST retain license attribution in the README or
relevant documentation. Rationale: visual assets can fail independently, and attribution is
an explicit project obligation.

### IV. Deliberate and Inclusive Interaction

Every control MUST produce a visible state change, provide a pointer or touch hit area
appropriate to its visual size, and expose status through more than color alone. Interaction
sounds, if used, MUST fire only from intentional local actions and MUST remain silent for
passive hover, scrolling, downloads, and external links. Common desktop and mobile viewports
MUST keep the scene usable, and nonessential motion MUST respect `prefers-reduced-motion`.
Rationale: tactile feedback reinforces intent without surprising or excluding users.

### V. Verification Before Ready

A change MUST pass `npm run lint` and `npm run build` when those scripts exist. Interaction
or visual changes MUST be checked in a running browser at representative desktop and mobile
sizes, including the affected state transitions; successful compilation alone is insufficient.
Known regressions MUST be fixed or explicitly documented before release. Rationale: 3D layout,
asset loading, and animation failures frequently evade static checks.

## Technical and Safety Constraints

The project MUST use React, TypeScript, and Vite as its baseline. When a feature includes a 3D
scene, scene work MUST use React Three Fiber and Three.js. A governing feature specification MAY
record a justified flat DOM/CSS replacement for the mounted main view; the replacement MUST keep
the fixed, display-first composition and MUST leave deferred 3D assets isolated rather than
silently deleting them. Browser credentials MUST NOT be committed. Spotify or similar service
credentials MUST come from environment variables, and external integrations MUST provide a local
demo, mock, or graceful failure path. User data MUST NOT be sent to a new external service
without an explicit feature specification and review. Licensed models, textures, and media MUST
retain their required attribution.

## Development Workflow and Quality Gates

Each nontrivial feature MUST begin with an updated design or specification artifact under
`docs/` or an approved issue. Changes MUST be scoped to a single user-visible intent and
MUST preserve existing behavior unless the governing specification states otherwise. Review
evidence MUST include the commands run, the viewport sizes exercised, the interaction states
checked, and any known gaps. A change is ready for release only when its applicable lint,
build, and browser verification gates pass.

## Governance

This constitution is the project's highest-level development guidance. When another practice
conflicts with it, this document governs unless a legal, platform, or security requirement
imposes a stricter constraint.

Amendments MUST be made in a dedicated change that states the motivation, affected principles,
compatibility impact, and any migration work. The amended constitution MUST be reviewed with
the design or specification artifacts that depend on it. Temporary exceptions MUST name their
scope, owner, expiry date, and validation plan; they MUST NOT waive license, credential, or
security requirements.

Constitution versions use Semantic Versioning. A MAJOR bump records an incompatible removal
or redefinition of governance. A MINOR bump records a new principle or materially expanded
requirement. A PATCH bump records clarification, wording, or non-semantic refinement. The
version, last-amended date, and Sync Impact Report MUST change together.

Every feature review MUST verify the applicable principles and record any approved exception.
Before release, the owner MUST confirm the relevant quality gates and either resolve known
violations or document them for the next governed change.

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original project adoption date | **Last Amended**: 2026-09-10
