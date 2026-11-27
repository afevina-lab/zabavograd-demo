# Работа с библиотекой через GitHub

Актуальный протокол после 27.11.2026. Единственный источник — `outputs/library-modules/` в `main`. Workflow берёт инструменты из main, из ветки запроса читает только данные. Запросы создаёт доверенный редактор с правом записи; сами workflow запускаются из ветки запроса, это не публичный API. Не передавать персональные данные и секреты.

## Чтение (без изменений)

Создать ветку от свежего main `library-sqlite-request/<slug>` (1–48 символов: строчные латинские буквы, цифры, дефисы; первый символ — буква или цифра), добавить только `editorial/requests/library-request.json`.

```json
{"version":1,"mode":"query","command":"select","options":{"weight":100,"limit":10,"fields":["/phonetic_tags/status","/morphology/status"]}}
```

Команды: find, inspect, select, gaps, inventory, sqlite. Для обычных запросов поля — JSON Pointer, максимум 12; до 40 строк (по умолчанию 20); ответ до 96 KiB. Для SQLite пример:

```json
{"version":1,"mode":"query","command":"sqlite","options":{"weight":100,"sounds":["к"],"exclude_sounds":["р","р'"],"has_image":true,"limit":10}}
```

SQLite строит временный индекс из единственного источника, использует параметризованные фильтры, проверяет SHA и удаляет индекс. Произвольный SQL запрещён. Для постраничной выдачи передавать offset и source_sha256 предыдущего ответа.

Результат: ветка `library-sqlite-result/<slug>-<12 символов SHA запроса>`, файл result.json и артефакт. Ответ содержит source_commit, source_ref=main, scope=canonical_main_snapshot и source_sha256. Если main изменился, это снимок прежнего состояния; для правок получить свежий ответ.

## Предпросмотр и кандидат (изменение)

Ветка `library-edit-request/<slug>`, файл `editorial/requests/library-edit.json`. Пример формы запроса, не готовый пакет:

```json
{"version":1,"mode":"preview","source_sha256":"<точный SHA из чтения>","operations":[{"id":"<фактический ID>","path":"/selection/base_weight","expect":{"exists":true,"value":100},"value":70}]}
```

Всего 1–30 операций, ожидаемые значения сверяются. Поддерживаемые поля и отдельные типы операций определены валидаторами `library-modular-request.cjs`, `library-import.cjs`, `library-editorial-decisions.cjs`, `library-semantic-proposals.cjs`; произвольные поля, смена ID и автоматическое утверждение непроверенных данных запрещены. Для импорта или редакторских решений нужен отдельный пакет по контракту.

После проверки preview создать новый запрос с mode=candidate, теми же операциями и исходным source_sha256, добавить точный preview_sha256 из отчёта. Изменившийся исходник или несовпадение preview отклоняются. Кандидат проверяется, исходник не меняется.

Результат: `library-edit-result/<slug>-<12 символов SHA запроса>`, result.json и, если кандидат изменяет данные, пакет delta/ с изменёнными модулями и manifest. Не считать этот результат PR или утверждением.

## Медиа

Ветка `library-media-request/<slug>`, JSON `editorial/requests/library-media.json`, файлы в `editorial/requests/media/`. Контракт `library-media-request.cjs`: envelope version=1, request с отдельными import_operations, для candidate также media_preview_sha256. Использовать только проверенные WebP, точный ID/значение и SHA изображения. Результат в `library-media-result/<slug>-<12 символов SHA запроса>`. Не смешивать импорт с обычными операциями.

## Применение и выпуск

Проверенный пакет воспроизводится через `library-apply-bundle.cjs` / `library-commit-package.cjs` с точным исходным коммитом и отпечатками предпросмотра. Проверить повторное применение, полный diff, валидаторы и обычный PR в main. Автоматического слияния или публикации по запросу нет. Если источник сдвинулся, повторить запрос. Ветка результата не перезаписывается.

Старый протокол монолитных запросов и интеграционных снимков снят с эксплуатации; историческое описание остаётся в Git и журнале миграции. Каноническая директория используется напрямую; повторно создавать временную копию модулей нельзя.
