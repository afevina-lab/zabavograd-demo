# Локальные инструменты работы с библиотекой

## Состояние
Единственный редактируемый источник — `outputs/library-modules/` с обязательным маркером `editorial/library-source-mode.json`. Исторический монолит не поддерживается. Для просмотра используется логический снимок, а не второй редактируемый файл. Новый инструмент работает локально в checkout публичного репозитория main или рабочей ветки, без сети и зависимостей. Не загружать весь JSON в контекст агента. Не редактировать производные файлы вручную.

## Команды
```sh
node scripts/library-toolkit.cjs find --lemma лук
node scripts/library-toolkit.cjs inspect --id WORD_ID --fields /phonetic_tags/status,/morphology/status
node scripts/library-toolkit.cjs select --weight 100 --category 'Дом и быт' --limit 30 --offset 0
node scripts/library-toolkit.cjs gaps --field /morphology/data --weight 100 --limit 30
node scripts/library-toolkit.cjs select --field /phonetic_tags/status --equals '"pending_automatic_analysis"' --limit 30
node scripts/library-toolkit.cjs inventory --fields /phonetic_tags/status,/morphology/status
node scripts/library-toolkit.cjs patch --file /tmp/patch.json
```
Пути JSON Pointer — реальные поля V2, а не придуманная схема. Для неизвестных разделов сначала inspect --id ... --full. Поиск возвращает все омонимы, порядок стабилен (вес, ID), 1–100 записей за страницу; next_offset для продолжения. gaps определяет только отсутствие/null/пустоту, не статус утверждения и не методическую применимость; для статусов использовать select и inventory. Инвентаризация показывает байты значений полей (без ключей/форматирования), не размер файла на диске.

## Пакет изменений
```json
{"version":1,"operations":[{"id":"WORD_ID","path":"/morphology/data/example_field","expect":{"exists":false},"value":"EXAMPLE"}]}
```
Пример условный, не фактическая запись. Для существующего поля expect: {"exists":true,"value": OLD_VALUE}. Команда patch выполняет только предварительный просмотр; --apply больше не поддерживается. Для изменения использовать точный source_sha256, предпросмотр и проверенный модульный кандидат по [LIBRARY_REMOTE.md](LIBRARY_REMOTE.md) либо локальный `library-modular-request.cjs`. Применять проверенный пакет отдельно, сверить diff, выполнить штатные проверки. Если валидатор отвергает изменение, разбирать причину, а не отключать проверку.

V1: только обновление полей существующих записей, без удаления, смены ID, лемм, категорий, ресурсов, архивов или связей. Существующие объекты не перезаписываются целиком, массивы целиком только при точном совпадении предыдущего значения и без идентификаторов. Для нового объекта можно заполнить целую отсутствующую ветку одним патчем; поля уже существующего объекта редактируются отдельно. Максимум 500 операций, предпросмотр первых 30; для обозримого результата использовать небольшие пакеты. Не использовать patch для утверждения непроверенных кандидатов, генерации отношений или привязок картинок. Сохранять исходные статусы и лингвистическую методику.

## Проверки
`node --experimental-strip-types --test tests/library-toolkit.test.ts` — самостоятельные тесты инструмента; включены также в существующий npm test. Работа со схемой и реальные данные дополнительно проверяются штатным check:library.

## Машинные анализаторы

- `python scripts/analyze-pending-words.py --output /tmp/analysis.json --report /tmp/analysis.md --limit 30` — новый черновик, не перезапись прежнего отчёта.
- `python scripts/extend-morphology-20261123.py --candidate-dir /tmp/morph-candidate --report /tmp/morph-report.json` — отдельный кандидат; для точечного безопасного набора указать `--safe-entry ID` (до 30 различных ID). Прямые `--write` и `--library` удалены.

Python получает снимок через `library-source.cjs`; для запроса без изменения использовать SQLite или toolkit. Словарные данные не заменяются автоматически.

## Развитие

Модульный источник, компактный индекс, SQLite, операции импорта, семантики и медиа уже внедрены. Открытые задачи уточнять по актуальному коду, редакторским очередям и плану CI. История миграции: LIBRARY_CUTOVER.md и CLEANUP_LOG.md. Локальные команды требуют исполняемого checkout; при работе через GitHub использовать актуальный протокол LIBRARY_REMOTE.md.
