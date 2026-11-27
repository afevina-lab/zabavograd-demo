const status = document.getElementById('status');
if (location.protocol === 'file:') {
  status.textContent = 'Откройте мастерскую по опубликованной ссылке или запустите Start-Studio.cmd. Обычный HTML-файл не запускает приложение.';
} else {
  import('./app.mjs?v=20261127-4c').catch(error => {
    status.textContent = 'Не удалось запустить мастерскую: '+error.message+'. Обновите страницу. Ваши сохранённые сцены не удалены.';
    document.body.dataset.boot = 'error';
    console.error(error);
  });
}
