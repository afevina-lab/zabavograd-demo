# Работа с библиотекой из чата через GitHub (этап 3)

После слияния в main: создать ветку от свежего main с именем library-request/<уникальный-slug> (латиница, цифры, дефис, 1–48 знаков), добавить **один** файл editorial/requests/library-request.json. Push запускает Library remote requests. Это запрос от редактора с правом записи в репозиторий, не публичный API и не обработчик issues. Runner берёт код инструмента из main, из рабочей ветки читает только JSON. Не передавать персональные данные и секреты — репозиторий публичный.

## Запрос (не меняет данные)
```json
{"version":1,"mode":"query","command":"select","options":{"weight":100,"limit":10,"fields":["/phonetic_tags/status","/morphology/status"]}}
```
Команды find/inspect/select/gaps/inventory. Поля — массив JSON Pointer. Ответ содержит source_sha256, ID, значения и признак exists. Лимит 40 строк, по умолчанию 20, до 12 полей, результат не более 96 KiB. Для больших выборок использовать компактный индекс, offset и точные поля. 

## Предпросмотр / кандидат
```json
{"version":1,"mode":"preview","source_sha256":"<64 hex from query>","operations":[{"id":"<actual ID>","path":"/example","expect":{"exists":false},"value":"example"}]}
```
Пример условный, поле и ID брать из реального запроса. До 30 операций, исходный SHA-256 обязателен, все прежние значения сверяются, никакой автоматической смены статусов проверки. После просмотра результата создать новый запрос с mode candidate и тем же пакетом; если исходник изменился, сделать свежий запрос и пересмотреть пакет. Candidate выполняет существующий полный валидатор; если он отклоняет правку, исходник не публикуется. 

Результат доступен в ветке library-result/<slug>-<первые 12 символов SHA коммита запроса>, файл result.json; также артефакт workflow. Если фактически изменились поля, создаётся ветка library-candidate/<тот же ключ> от проверенного main; отчёт и кандидат отправляются атомарно. Никакого изменения main или gh-pages, автоматического слияния и публикации. Затем агент открывает обычный PR из candidate в main, сверяет diff и обязательные проверки, объединяет по штатной процедуре. При сдвиге main между запуском и отправкой кандидата запрос отклоняется. Повторная запись уже созданной ветки запрещена.

Ограничения: обработчик предназначен для существующих записей; создание слов, связи, изображения, категории и удаление требуют отдельных операций. Ветка запроса должна содержать workflow из актуального main. GitHub Actions должен иметь разрешение contents:write; возможные ограничения защиты веток и разрешения GITHUB_TOKEN проверяются на реальном запуске. Обычный чат не исполняет shell. Режим candidate не является редакторским утверждением, не снимает требования к лингвистическим данным. Все запросы и отчёты публичны. 

## SQLite query (experimental integration branch)

Request example: `{"version":1,"mode":"query","command":"sqlite","options":{"weight":100,"sounds":["к"],"exclude_sounds":["р","р'"],"has_image":true,"limit":10}}`. The existing bounded request runner builds a disposable index from the selected source, uses parameterized filters, verifies source SHA before and after and returns a compact result. Pagination can supply `source_sha256` from the previous page; a changed source is rejected. No arbitrary SQL or source writes. The temporary SQLite database is deleted. Ordinary read-only toolkit queries are also supported against modules; monolithic candidate/preview writes remain blocked in modular mode.

For a real GitHub rehearsal, create `library-sqlite-request/<slug>` from the integration branch and commit ONLY `editorial/requests/library-request.json`. The separate workflow checks out the integration branch (not main), reads the request as data, builds modules in runner temp, and writes only result.json to `library-sqlite-result/<slug>-<12 request SHA>`. Result records exact source commit, source SHA, and explicit integration_snapshot_not_live_main scope. This is NOT the current live catalogue if main has changed. Trusted repository writers only: GitHub push workflows themselves are loaded from the request branch, so this is not an untrusted public API. No change to main, gh-pages, or visual branches. Production remote workflow remains untouched until migration.
