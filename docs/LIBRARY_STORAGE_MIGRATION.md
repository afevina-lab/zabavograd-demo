# Модульное хранение библиотеки

**Актуально с 27.11.2026.** Единственный редактируемый источник — `outputs/library-modules/`, обязательный маркер `editorial/library-source-mode.json`. Старый монолит удалён. Полный исторический отчёт экспериментов — [в Git](https://github.com/afevina-lab/zabavograd-demo/blob/9645b989afefde33932d1c290c830e3d67e146a2/docs/LIBRARY_STORAGE_MIGRATION.md).

## Контракт хранения

- `library-store.cjs` строит, проверяет и читает модули. 32 корзины на группу по стабильному префиксу SHA-256 ID, только непустые файлы; группы core, phonetics, morphology, semantics, syllables, translations, illustrations, machine, archive, shared. Отдельно категории, отношения и метаданные. Не делить по лексическим темам и не объединять омонимы.
- entry-order и relation-order сохраняют порядок записей и ключей. Manifest фиксирует набор файлов, размеры, хэши и логический SHA-256. Явный null, отсутствие ключа и неизвестные поля различаются. Восстановление должно сохранять точный логический снимок.
- Точные совпадения `legacy_source.raw.speech/grammar` и `phonetic_tags.data/morphology.data` могут физически храниться один раз в immutable-shared-values-v1. Ссылки ведут на неизменяемое значение, проверяемое SHA-256, а не на текущую запись. Различия значений или порядка ключей исключают объединение; при чтении создаются независимые копии. Архив и происхождение данных не удаляются.
- Активные функции split/restore и pack/unpack пока находятся в `library-storage-audit.cjs` и `library-storage-optimize.cjs`. Не удалять их как исторический код. Экспериментальные CLI не являются путём записи в канонический источник.
- Для чтения использовать `library-source.cjs`, toolkit или SQLite; для изменения — изолированный проверенный кандидат, затем PR. См. [LIBRARY_TOOLKIT.md](LIBRARY_TOOLKIT.md) и [LIBRARY_REMOTE.md](LIBRARY_REMOTE.md). Не редактировать отдельно manifest или производные файлы.

## История

26.11 — проверены семь вариантов разбиения; сравнивались объём, количество файлов, предел 128 KiB рабочего модуля и точный roundtrip. Зафиксирована резервная точка `6ddc01703be09341eba83d8a7bd7c13a89cae9e4`. 27.11 — выполнен окончательный переход на 32 корзины и общий неизменяемый пул. История интеграции и сверки: [LIBRARY_CUTOVER.md](LIBRARY_CUTOVER.md), [CLEANUP_LOG.md](CLEANUP_LOG.md).
