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
