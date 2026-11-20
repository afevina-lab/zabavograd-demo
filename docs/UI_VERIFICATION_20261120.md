# Shared settings verification — 2026-11-20

Branch: design/ui-audit-20261120. Review only; no main merge or site publication.

- Native task selects restored, retaining values and change handlers.
- Settings shell uses natural height capped by the viewport, one internal scroll region, and no 94dvh rules or compensating right margins.
- Category hierarchy and transactional selection retained; single-column tree replaces the multi-column layout.
- Conveyor caption checkbox controls existing in-game captions; setup sound checkbox removed, in-game sound retained.
- Shared setup controls use flat theme colors, visible keyboard focus and compact quantity controls. Home control centered.

## Validation

115 tests passed; TypeScript, architecture, design-system, library validation and Vite build passed.
Browser script passed for five games at 1440×900, 1024×768, 768×1024, 390×844 and 844×390: no horizontal content overflow or scroll region escaping its frame. Mixed reading selection checked in each game. Forest theme screenshots include expanded category dialogs at all five sizes. Earlier run also checked the default space theme; neutral theme was subsequently checked in the full material/layout pass.

Local screenshots and machine report: ui-smoke/ (ignored build artifacts). User visual approval remains pending. Existing backgrounds and gameplay logic were retained.

## Adventure presentation follow-up

Shared settings now show the existing theme scene behind the panel, an adventure emblem and game title, numbered setup sections with tactile surfaces, and a prominent start button with pressed feedback. Theme selection remains available. All changes are shared presentation; game rules and task values are unchanged.

Validation: 115 tests, architecture, TypeScript, design-system check and production build passed. Browser screenshots refreshed for review.

## Cartoon controls follow-up

Rounded asymmetric cardboard outlines, tactile shared buttons, section title tabs and native selects with a custom caret. Theme choices preview the existing scene artwork. No additional leaf or branch ornaments. Existing scene artwork is retained.

115 tests, architecture, design-system, TypeScript and production build passed. Responsive browser screenshots refreshed.

## Tactile panel implementation

Replaced the previous cartoon outline rules with one shared CSS system: regular rounded panel with a broad inset rim and bottom edge; recessed native selects with caret wells; raised buttons and range thumbs. No new bitmap assets or decorative vegetation. Removed numbered section tabs and nested section borders.

Binary preferences (captions, preview, syllable splitting, cluster exclusion, random order, zero inclusion, timer and lives) expose checkbox-backed accessible switches. Set membership, category trees, letters and multiple-choice task selection retain checkbox semantics and partial selection. All labels and handlers retained.

115 tests, TypeScript, architecture, design-system and production build passed. Browser scenario now also verifies the caption switch can toggle and restore its state.

## Caption condition and spacing correction

Matching captions are offered immediately after display-mode selection only for image-image, non-math and non-derived-image modes. In-game captions use the same display-mode guard. Browser checks exercise all four display modes. Setup paper and field colors have dedicated warm cream tokens; section spacing and desktop row spans remove the empty gap below short first-column sections.

## Shared setup actions

Added SettingsDisclosure for additional conditions and time/lives: consistent icon, title, state description and disclosure affordance; native details keyboard behavior retained. Category selection now uses a full-width warm gold action with selected-topic names and count, retaining the transactional tree. Unified quiet rounded scrollbar rules, removing competing theme scrollbar overrides. No additional game mechanics, rewards or decorative vegetation.

115 tests, architecture, TypeScript, design-system and build passed. Browser scenario includes expanding/collapsing both sections and screenshots with expanded controls.

## Full material and layout pass

Honey wood frame uses CSS grain, edge highlight, inner recess and darker bottom edge. Cream center retained. Forest palette has stronger green actions. Setup typography uses the body family with a consistent heading hierarchy.

Shared matching/conveyor layout distributes sections into independent columns with a separate final readiness area, eliminating row-height gaps. Additional conditions are visually secondary. Shared MaterialPreview displays existing artwork and text cards; an empty state opens category selection or focuses material selection. QuantitySlider now has one editable count between minus/plus, a filled track, gold thumb and min/max labels; unavailable ranges show an explanation. Existing numeric bounds and change handlers retained.

115 tests, TypeScript, architecture, design-system and build pass. Browser scenarios cover caption modes, disclosure controls, quantity increment/decrement with restored value, previews, expanded categories and responsive overflow.

Final browser pass: 25 responsive layouts with no horizontal overflow; caption mode conditions, disclosure interaction and count increment/decrement passed. Additional 1440×900 smoke checked neutral, forest and space theme switching with screenshots under ui-smoke/themes/. Desktop ready-material and mobile ready-material screenshots visually inspected.

## Select and quantity refinement

Replaced picture-card previews with compact text material summaries. Added a native SelectControl wrapper across game settings, preserving native select attributes and events while providing semantic leading icons and a saturated theme-color caret well. Pictograms cover tasks, cards, checking, matching, groups, difficulty, time and letters. Icon actions share the saturated button treatment. Start action has a stronger lower face and a forward arrow. Quantity control uses a compact label/stepper header with the existing filled track below, retaining numeric entry and bounds.

115 tests, TypeScript, architecture, design-system and build pass. Browser assertions cover styled native selects, absence of card previews and quantity interactions.

Final confirmation: 25 responsive layouts passed without overflow. Additional smoke of final icon mapping and all three themes passed; screenshots in ui-smoke/final/. Mobile layout visually inspected.

## Unified expanded controls and game dialogs

Shared ControlWell supplies the same SVG chevron and plus treatment to selects, additional conditions, time/lives and category selection. Labels changed to Лексика and Выберите условия. Native customizable select pickers use the cream/wood palette, themed option states and keyboard behavior where supported; unsupported browsers retain their native picker. Expanded checkboxes retain indeterminate semantics with themed rendering.

Pause, settings confirmation, selection dialogs and game results now share the wood/cream surface and saturated actions. Removed the stale toolbar foreground rule which hid icons on green buttons. Transformation pause is attached to the full stage; completing its last card now shows the common completion dialog rather than immediately dismissing the game. No mastery or score is inferred from completion.

Validation: 115 tests, TypeScript, architecture, design-system and build. Added scripts/verify-dialogs-browser.mjs: pause, life-limit endings and settings in all five games at 1440×900 and 390×844, a fully completed Memory round, a fully completed Transformations session and real pointer/keyboard interaction with the opened native select. Screenshots: ui-smoke/dialogs/.

Confirmed low-height 844×390 pause/end/settings scenarios in all five games. Native select was opened by pointer and changed by keyboard; screenshots visually reviewed. Active-game reset confirmations separately checked for Memory and Sorting.

## Forest GUI consistency checkpoint

Aligned all select/disclosure/category action wells to the same 8 px outer inset and shared leading-icon column. Prepared icon glyphs slightly enlarged. Result actions have matching width, height and font size. Removed the lesson/theme label and extra spend/undo icons from the game toolbar. Heart clicks and F8 spending, F9 undo remain; no artwork redesign for hearts or stars in this pass.

Required empty category/sound choices and placeholder or disabled select options receive a 3 px red outline, red action well and aria-invalid state. Selecting valid data restores the theme green. Legitimate empty-valued Any/All options are not treated as missing. Existing gameplay validation remains authoritative.

Validation: 115 tests, TypeScript, design-system, architecture and build passed. Browser checks measure action-well alignment, matching result-button sizes, toolbar cleanup, required-to-ready transitions for category and sound selection on desktop/mobile. F8/F9 verified in all five games.

## Space GUI material pass

Space uses the same shared geometry and controls as Forest. Material-neutral surface tokens now cover frame texture/fill, bevel highlights, inner edges, inset shadows, text hints, quantity tray, empty states and picker borders. Space has a brushed silver-blue frame, cold blue-white surfaces, saturated violet actions and cyan highlights. Required-field red remains semantic across themes. Existing backgrounds, scene animation, assets, rewards and mechanics retained.

Browser scripts accept UI_THEME=space (forest remains the default) and separate reports/screenshots by theme. Space passed 25 responsive game setups and 15 pause/end/settings scenarios, plus genuine Memory/Transformations completion and pointer/keyboard native picker operation. Forest regression passed 25 setups; two baseline screenshots are byte-identical and desktop matching was visually compared. 115 unit tests, TypeScript, architecture, design-system and production build pass.

## Space texture and color refinement

Space frame now uses a broader iridescent silver/cyan/violet finish with soft horizontal brushing rather than dense gray ribbing. The inset panel adds subtle cyan/violet light fields and fine static grain. Surface texture and frame inset are theme tokens; Forest retains no interior texture and its original 13 px frame inset. Shared control geometry and game mechanics are unchanged. Space action violet is more saturated.

115 tests, TypeScript, architecture, design-system and production build pass. Space settings/dialog scenarios refreshed; Forest screenshot regression checked independently.

## Raised control faces in all themes

Space restored the previously approved calm palette and untextured light interior. Its frame now has stronger neutral silver/steel contrast, bright highlights and an 18 px inset, without colored iridescence. Shared raised-face tokens give all theme selects, expandable summaries, category actions, ordinary buttons and native picker options a convex lit face, a lower edge and soft ambient shadow. Required red edges remain distinct; input handlers, layout measurements and selection semantics are unchanged.

115 tests, TypeScript, architecture, design-system and build pass. Full setup checks passed at 25 layouts for each of neutral, forest and space (75 total), plus 15 space game-dialog scenarios. Final desktop/mobile snapshots cover generic disclosures and open pickers.

## Inset scrolling and neutral GUI

Settings padding is derived from the theme frame thickness plus an 8 px safe inset. Native dialogs, raw game overlays and manual modals now keep the material frame fixed while a panel-scroll child owns scrolling. Category actions stay sticky inside that child. This prevents scrollbar tracks from painting onto the frame and keeps the inset material visible at the end of long lists. Existing labels, controls, award placement and handlers retained.

Neutral now has a matte warm-ivory frame without wood grain or metallic reflections, an off-white playing surface, muted blue actions, restrained sand accents and shared convex controls. Existing neutral scene/card artwork retained.

115 tests, TypeScript, architecture, design-system and production build pass. All 75 theme/game/viewport setup cases pass. Browser checks measure the material-frame clearance, scroll an expanded category tree to its bottom, and verify the outer dialog itself does not scroll. Neutral game dialogs passed 15 scenarios plus real completion and native picker interaction.
