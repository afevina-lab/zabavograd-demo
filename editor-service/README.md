# Редактор канонической библиотеки

Страница: https://afevina-lab.github.io/zabavograd-demo/editor/. Данные: main:outputs/library-modules/. Модульный клиент включён по умолчанию, прежний режим удалён. Реальное HTTPS/OAuth-развёртывание не подтверждено.

## Подключение

GitHub Pages не исполняет сервер. Разместить editor-service/Dockerfile (контекст репозитория, Node 24, Python/pymorphy3 2.0.6) на HTTPS Docker-хостинге. Пример: editor-service/render.yaml. Использовать текущую версию store с 64 корзинами machine.

1. Создать GitHub OAuth App: https://github.com/settings/applications/new. Homepage URL: https://afevina-lab.github.io/zabavograd-demo/editor/. Callback URL: https://АДРЕС-СЕРВЕРА/auth/callback.
2. Настроить SERVICE_URL (без конечного /), GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, EDITOR_ORIGIN, EDITOR_URL. Секрет только в защищённых настройках хостинга, не в Git и не в чате.
3. Указать адрес сервера, войти через GitHub. OAuth запрашивает public_repo; сервер проверяет право push на afevina-lab/zabavograd-demo. Токен остаётся в памяти сервера, сессия действует час; после перезапуска нужен новый вход. PKCE и одноразовый state проверяются.

## Возможности и границы

Поиск, категории, типы, ограниченные поля карточки, редактирование веса (до 30 операций), preview и отдельный candidate. Старые /api/library и /api/save удалены. Добавление, произвольное редактирование JSON, категории, связи и анализ в UI ограничены. Для таких задач — [типизированные пакеты](../docs/LIBRARY_MODULAR_INTEGRATION.md). Принятие кандидата через library-commit-package.cjs и проверенный PR, не прямое сохранение в main.

Черновики и билеты сохраняются локально для адреса сервера. После восстановления заново проверять SHA, старые значения и отчёт по исходному запросу. Сохранённый preview не подтверждение. Импорт при пустом черновике; конфликт отклоняется, повреждённый черновик можно скачать перед сбросом. OAuth-данные не входят в экспорт. При изменении main пересверить правки.

## API

- GET /health: configured, modular_rehearsal, cached_read (имена ответа сохранены для совместимости).
- Авторизованные GET /api/modular/info и /api/modular/result?ticket=..., POST /api/modular/query и /api/modular/edit (202, ticket); POST /api/modular/read — быстрый запрос без ветки/Actions. До 64 КиБ. [Протокол](../docs/LIBRARY_REMOTE.md).
- Кэш фиксирует commit main, проверяет Git blob, размеры, manifest и логический SHA; TTL 15 секунд, повторное использование неизменившихся blobs, загрузка изменённых пакетами по восемь, объединение обновлений, один временный SQLite. Полные карточки не выдаются.
- POST /api/analyze — авторизованный pymorphy3, до 50 слов, не утверждение; наличие API не равно подключению кнопки UI.

Проверки: node --test editor-service/*.test.mjs, клиентские тесты и штатный CI. Реальный OAuth, холодная загрузка и приём кандидата требуют отдельной проверки. [Историческое описание](https://github.com/afevina-lab/zabavograd-demo/blob/303c979a90e84b31e1c53db7943bb40ff4f19150/editor-service/README.md).
