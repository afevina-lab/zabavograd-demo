# Shared settings verification — 2026-11-20

Branch: design/ui-audit-20261120. Review only; no main merge or site publication.

- Native task selects restored, retaining values and change handlers.
- Settings shell uses natural height capped by the viewport, one internal scroll region, and no 94dvh rules or compensating right margins.
- Category hierarchy and transactional selection retained; single-column tree replaces the multi-column layout.
- Conveyor caption checkbox controls existing in-game captions; setup sound checkbox removed, in-game sound retained.
- Shared setup controls use flat theme colors, visible keyboard focus and compact quantity controls. Home control centered.

## Validation

115 tests passed; TypeScript, architecture, design-system, library validation and Vite build passed.
Browser script passed for five games at 1440×900, 1024×768, 768×1024, 390×844 and 844×390: no horizontal content overflow or scroll region escaping its frame. Mixed reading selection checked in each game. Forest theme screenshots include expanded category dialogs at all five sizes. Earlier run also checked the default space theme; neutral theme requires separate visual review.

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
