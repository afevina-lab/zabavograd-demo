# Визуальная система «Забавоград»

`main` публичного `afevina-lab/zabavograd-demo` — **единственный** исходный репозиторий для игр, оформления, единой редакторской V2 и инструментов. `gh-pages` — только публикация. Не править скомпилированные JS/CSS, не создавать тематических CSS-патчей и не брать данные из бывшего приватного репозитория.

- `src/design-system/themes.ts` — конфигурация фоновых изображений, карточек и палитры тем;
- `src/design-system/theme.css` — общее оформление карточек, окон и шапки;
- `src/design-system/controls.css` — единые кнопки;
- `src/design-system/motion.ts` и `motion.css` — общий язык движения и «акварельный хлопок»;
- `src/styles/layout.css` — геометрия и адаптивная раскладка.

**Библиотека:** единственный редактируемый `outputs/library-v2.json`; `library.json` для игр генерируется. Редакторские инструменты находятся в `scripts/` и `outputs/`. Правила публикации и сохранности см. [README.md](README.md) и [AGENTS.md](AGENTS.md).

Проверки: `npm install && npm run dev`, `npm test`, `npm run check:library`, `npm run check:design-system`, `npm run build`.
