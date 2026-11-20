# UI audit — 2026-11-20

Status: initial evidence-based audit. No redesign or browser verification performed in this phase.

## Source of truth
- `main` is editable source; `gh-pages` is generated publication (README.md).
- Existing visual system: `docs/VISUAL_SYSTEM.md`, `src/design-system/themes.ts`, `theme.css`, `controls.css`, `src/styles/layout.css`, `src/GameUI.tsx`.
- Existing forest scene: `assets/themes/forest/forest_background.webp`; **reuse this existing background**. The forest theme is configured `motion:'static'`. Do not generate a second menu background.
- Existing controls are themed WebP skins (`assets/theme-ui`) via `border-image`. Reuse/extend before drawing new images. Existing square/large/pill/button states and checkboxes, tabs, sliders are registered.
- Existing automated checks: `npm run check:design-system`, `npm test`, `npm run build`, `node scripts/verify-ui-browser.mjs`. Browser test code currently focuses on game stage; settings and lexical modal require explicit additional coverage.

## Observations from user-supplied Conveyor screenshots (not verified in browser)
P0: Oversized fixed outer settings frame / nested scrollbar; scrollbar overhangs rounded edge; sections and bottom content clipped.
P0: Unbalanced columns, large empty vertical and horizontal regions.
P0: Lexical themes pop-up with disconnected columns, oversized whitespace, poor visual hierarchy and scroll behavior.
P1: Task selector should be a dropdown, not six large task buttons.
P1: Captions option missing from Conveyor setup. Sound control should not be repeated in Conveyor setup; sound belongs to common settings/in-game.
P1: Active task button displays extraneous ring instead of changing existing border thickness.
P1: Slider +/- buttons oversized; select caret/text padding insufficient.
P1: Home icon alignment appears off-center.
P2: Heavy gradient / 3D look and excessive nested borders conflict with desired restrained watercolor interface.

## Code observations (confirmed)
- `controls.css` uses WebP border-image skins for primary/secondary, square, pill, and chip controls; selection in `.themes button.selected` uses `outline:2px` (not a thickened existing border), matching reported double-ring risk.
- `theme.css` still applies a gradient plus thick border/inset shadow to settings frames and modals, matching reported visual heaviness.
- `layout.css` declares shared geometry, button and select styles; may interact with the design-system overrides. Inspect full cascade and markup before removing selectors.
- `src/GameUI.tsx` defines shared SVG mask icon mapping (including `Home1:house.svg`), ThemePicker and Challenges. Centering must be checked at rendered element/asset viewBox level, not assumed from button flex alignment.
- `themes.ts` already defines three themes and `sage` UI skins; no new separate per-game theme system needed.
- `docs/VISUAL_SYSTEM.md` forbids per-game style patch files and duplicate icon packs. Respect this.

## Design constraints / decisions
1. Maintain existing forest background and design-system theme tokens.
2. Use restrained paper panels, mildly styled borders and low ornament density. No extra animal/wooden sign imagery.
3. Build reusable components and state handling in existing design system rather than per-game CSS patches.
4. Prefer CSS/SVG geometry for adaptable controls; do not change already approved whole-card WebP skins into nine-slice.
5. Ensure accessible focus-visible state, keyboard operation, responsive layout and non-overflowing scroll containers.
6. Separate verified code facts from hypotheses and screenshot-only observations.

## Follow-up audit not completed yet
- Locate actual Conveyor settings component and all lexical category dialog markup/styles.
- Determine the origin and precedence of any duplicate CSS selectors.
- Inventory files beneath `public/assets/theme-ui/` and missing variants.
- Inspect rendered settings at desktop/tablet/mobile and expanded lexical chooser.
- Compare `main` with `gh-pages` publication.
