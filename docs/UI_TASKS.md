# UI development queue — 2026-11-20

All tasks are pending unless checked. Screenshots = user reports; code audit = inspected file.

## Stage A — verify and inventory
- [x] A01 Establish the single public source repository and relevant design system files.
- [x] A02 Confirm existing forest background and theme skins; do not redraw background.
- [x] A03 Locate Conveyor setup and lexical tree components; map markup to CSS selectors.
- [x] A04 Inventory WebP/SVG assets, variants and icon viewBoxes.
- [ ] A05 Run/check current browser snapshots for settings on 1440x900, 1024x768, 768x1024 and 390x844, including expanded lexical dialog.
- [ ] A06 Verify main / gh-pages publication and save baseline screenshots.

## Stage B — agree visual reference
- [ ] B01 One panel/frame in sage theme, tested on actual forest background.
- [ ] B02 One button family: normal/hover/pressed/selected/disabled/focus.
- [ ] B03 One select family with appropriate padding and consistent caret.
- [ ] B04 Validate contrast, decorative restraint and scalability.

## Stage C — shared component system
- [ ] C01 Centralize menu panel and nested surface styles.
- [ ] C02 Centralize button sizing/states, remove decorative duplicate active ring while preserving visible keyboard focus.
- [ ] C03 Centralize select/checkbox/slider with consistent spacing.
- [ ] C04 Audit SVG icon centering and bounding boxes.
- [ ] C05 Ensure theme switch changes tokens/skins rather than duplicating components.

## Stage D — Conveyor menu
- [ ] D01 Restore task select dropdown with original behavior.
- [ ] D02 Add image caption visibility control; ensure in-game behavior is consistent.
- [ ] D03 Keep sound in common settings / in-game only, not on Conveyor setup.
- [ ] D04 Replace oversized plus/minus next to card count with compact controls or numeric value and slider.
- [ ] D05 Reflow settings responsively, remove unnecessary nested scrolling, handle scrollbar clipping.
- [ ] D06 Replace lexical-category pop-up columns with compact semantic tree, search, parent/indeterminate checkbox states; preserve category IDs and selection.
- [ ] D07 Review previews / additional conditions placement and text/caret padding.

## Stage E — verification and rollout
- [ ] E01 Extend browser checks for setup controls, scroll and expanded dialogs.
- [ ] E02 Run tests, architecture/design-system checks, build.
- [ ] E03 User visual review of forest Conveyor setup.
- [ ] E04 Apply same shared components to other games, then publish via normal workflow.

Definition of done: no lost gameplay behavior, no clipped controls or double scrollbar, visible keyboard focus, 3 themes verified, responsive screenshot review, CI checks passing.

## Dependencies found during inspection
- D01: GameSelect currently deliberately hides native select and exposes tiles; adjust automated reading-setting scenario in `scripts/verify-settings-browser.mjs`.
- D06: CategoryPicker already preserves tree ancestry and indeterminate states; rewrite layout without discarding its data behavior.
- C01/D05: collapse 94dvh fixed window rules and width/margin hacks in `layout.css`; avoid new override layers.
- C02: distinguish persistent selected state from keyboard focus-visible (must retain focus ring).
- C04: review 14 shared icon SVG viewBoxes, especially house.svg.
- Asset inventory: 210 WebP files, 14 SVG icons. No new art should be generated until component audit decides what is actually missing.

## Forest GUI checkpoint — 2026-11-20

Основной GUI лесной темы принят как практически завершённый этап: деревянно-кремовые поверхности, общие контролы, игровые окна, единые интервалы и размеры, состояния обязательного выбора. Изменения остаются в design/ui-audit-20261120 без публикации.

- [x] Единые интервалы и положение кнопок раскрытия.
- [x] Размеры кнопок результата и подготовленных значков.
- [x] Обязательные поля: красное состояние до выбора, зелёное после выбора.
- [x] Игровое поле без подписи темы и дополнительных значков возле сердец.
- [ ] Отдельно проработать изображения и состояния звёзд и сердец.
- [ ] Финальное утверждение и публикация отдельным шагом.
