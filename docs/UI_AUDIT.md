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

## Stage A03–A04 findings — 2026-11-20 (code verified)
### Actual component and cascade map
- `src/Conveyor.tsx` renders `SettingsWindow` → `section.settings.conveyor-settings` → `GameSelect`, `MaterialSettings`, `QuantitySlider`, preview and controls.
- `src/design-system/SettingsWindow.tsx` renders `settings-shade > settings-frame.shared-settings-window > settings-window-heading + .unified-settings-content`; it does not render the forest scene behind its settings window itself.
- `src/GameSelect.tsx` renders `<select hidden>` + `.choice-tiles` always, which explains why task options are buttons. Change to a real visible select when implementing redesign; preserve existing value/onChange semantics.
- `src/MaterialSettings.tsx` routes `mode==='lexical'` to `src/CategoryPicker.tsx`.
- `CategoryPicker.tsx` builds a tree from category paths and already supports parent/descendant selection, draft/confirm/cancel and indeterminate checkbox state; its `.category-grid` CSS uses multi-column card layout. Preserve underlying selection rules/IDs, change presentation and optionally add search.
- `src/QuantitySlider.tsx` renders decrement/increment buttons, range input and separate number input; `layout.css` lines 695–700 specify 42px control height and 24px +/- characters.
- `Conveyor.tsx` already stores captions state and displays captions during gameplay, but the setup UI omits its checkbox. Setup has its own sound checkbox, while gameplay toolbar also has sound button.
- `GameUI.tsx` renders `house.svg` as CSS mask; `house.svg` has `viewBox="0 0 10 10"` with path inside, so confirm optical alignment in the browser before editing artwork.

### Confirmed geometry and conflict spots
- `layout.css` lines 737–751 define frame max-height 94dvh, an independently scrolling settings region, 12px width/margin compensation, and grid layout for category choices.
- `layout.css` lines 767–790 override those rules again; lines 781–784 force shared settings frame to `height:94dvh` and scroll content inside it. These are concrete causes of oversized fixed window behavior.
- `layout.css` lines 577–586 set important gradient button rules and extra selection outlines. `controls.css` then substitutes border-image-based skins for selected control families. Cascading and specific selectors must be simplified coherently rather than adding another override.
- `theme.css` applies a gradient, 3px border and inset shadow to settings frames and modals.

### Actual UI asset inventory (repository main)
- 210 existing WebP skin assets under `public/assets/theme-ui/`: buttons 96; checkboxes 17; chips 16; panels 8; radio 17; sliders 30; tabs 16; toggles 10.
- Eight palette/skin variants present: blue, cream, lavender, lightgray, sage, sand, steel, turquoise.
- 14 shared SVG icons under `public/assets/icons-new/`: arrow-right, cross, expand, heart, house, light, mute, pause, play, question-mark, refresh, settings, star, volume.
- No dedicated image asset for a styled select/dropdown or a thematic scrollbar in the current theme-ui directory; likely best achieved through shared CSS/SVG, not by introducing one-off bitmap controls.
- `scripts/verify-settings-browser.mjs` exists and already checks settings overflow, scrolling and screenshots. It relies on finding a button with text `Чтение` to test reading settings; tests must be adjusted when converting GameSelect from tiles to native select.
- Browser render and full file content/cross-theme asset validation were **not** performed during this inspection. Do not mark visual issues fixed.

### Implementation warning
The project README states `main` is canonical and `gh-pages` publication-only. All future changes belong on the audit branch or a successor PR; do not patch deployed files.
