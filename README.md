# zabavograd-demo

## Изображения для демо

В публичной версии игры используем **сжатые WebP**, а не большие мастер-файлы PNG.

- Игровые файлы хранятся в `assets/words/*.webp` в корне этого репозитория.
- Полный комплект 181 файлов подготовлен пользователем отдельно в архиве `Zabavograd_181_webp_for_GitHub.zip`. Копировать в эту папку только файлы WebP. Исходные PNG остаются локально и в приватном редакторском архиве.
- При появлении WebP GitHub Actions [Link WebP assets in published demo library](https://github.com/afevina-lab/zabavograd-demo/actions/workflows/link-published-assets.yml) переписывает на WebP **только имеющиеся** ссылки внутри `library.json`.
- Приватный исходный словарь `afevina-lab/zabavograd/outputs/library-v2.json` не копировать в публичный репозиторий: изменения слов и тематик публикуются отдельно после проверки.
