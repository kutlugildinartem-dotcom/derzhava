'use strict';
// Обновления с GitHub: Java-часть (Updater) сообщает статус через window.dzUpdate.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
let dlg = null, avail = null;
const isApp = () => !!window.DZAndroid;
const status = h('div.small.dim.mt');
const bar = h('div.bar.mt', h('i', { style: { width: '0%', background: 'var(--gold)' } }));

function show(ver, notes, size) {
  if (dlg && !dlg.closed) return;
  status.textContent = '';
  bar.firstChild.style.width = '0%';
  const body = h('div', h('p', `Версия ${ver} готова к установке${size ? ` (${D.fmt(size / 1048576, 1)} МБ)` : ''}.`),
    notes ? h('div.card', h('h3', '📝 Что нового'), ...notes.split('\n').filter(Boolean).map(x => h('p.small', x))) : null,
    h('p.small.dim', 'Сохранённые партии и настройки останутся на месте.'), bar, status);
  dlg = U.modal({ title: 'Доступно обновление', icon: '⬇️', body, foot: [
    { label: 'Позже' },
    { label: 'Обновить', cls: 'primary', close: false, onclick: () => {
      window.dzSave && window.dzSave();
      status.textContent = 'Скачиваю…';
      try { window.DZAndroid.startUpdate(); } catch (e) { window.dzUpdate.failed('Обновление работает только в приложении.'); }
    } },
  ] });
}

window.dzUpdate = {
  available(ver, notes, size, manual) {
    avail = { ver, notes, size };
    U.updateInfo = avail;
    if (!U.s || manual) show(ver, notes, size);
    else U.toast(`⬇️ Доступна версия ${ver} — обновить можно в меню «Ещё»`, 4000);
    if (!U.s && U.$('.home')) U.showHome();
  },
  upToDate() { U.toast('У вас последняя версия ✓'); },
  failed(msg) { if (dlg && !dlg.closed) status.textContent = '⚠️ ' + msg; else U.toast(msg, 4000); },
  needPermission() { status.textContent = 'Разрешите установку из этого приложения в открывшихся настройках, вернитесь и нажмите «Обновить» ещё раз.'; },
  progress(p) { bar.firstChild.style.width = p + '%'; status.textContent = `Скачиваю… ${p}%`; },
  installing() { status.textContent = 'Устанавливаю… Приложение перезапустится.'; },
  cancelled() { status.textContent = 'Установка отменена.'; },
};

U.checkUpdate = function (manual) {
  if (!isApp()) { if (manual) U.toast('Обновления проверяются только в приложении'); return; }
  if (manual && avail) { show(avail.ver, avail.notes, avail.size); return; }
  try { window.DZAndroid.checkUpdate(!!manual); if (manual) U.toast('Проверяю…'); } catch (e) { /* пусто */ }
};
})();
