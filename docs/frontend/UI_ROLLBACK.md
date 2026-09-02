# DMForge UI rollback map

This file records visual alternatives that remain in the repository while the
UI is migrated. Do not delete an alternative merely because it is no longer the
active implementation.

## Logo

- Active and authoritative: `public/branding/dmforge-logo-source.png`
- Archived optical experiments: `public/branding/optical/`
- Rule: the active logo keeps its source geometry, colours, and proportions.
  The pre-existing same-source contrast layer may adapt it to dark themes; do
  not replace, redraw, outline, glow, or crop the artwork.

## Icons

- Active custom masters: `src/assets/dmforge-icons/`
- Older application assets: `src/assets/legacy/` and `public/legacy/`
- Phosphor remains the temporary fallback for design-system actions that do not
  yet have a DMForge master. Replace fallbacks incrementally and keep icon names
  semantic so a pass can be reverted without changing behavior.

## Buttons and density

- The design-system source of truth remains
  `.claude/skills/dmforge-design/components/`; the synchronized runtime copy is
  `src/ds/components/`.
- Controls must retain usable hit areas. Current icon-button sizes are 30, 36,
  and 44 px. Do not reduce them as a shortcut for fitting more controls.
- Progressive disclosure may hide low-frequency configuration, but it must not
  remove the setting or make the primary action harder to find.

## Map components

- Top-down component masters: `src/assets/map-components/`
- Their tactical rules remain data in `src/utils/terrainRules.js`; artwork must
  not become the source of truth for collision, vision, cover, or state.
