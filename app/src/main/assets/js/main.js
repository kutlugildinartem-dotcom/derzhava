'use strict';
// Точка входа.
(function () {
const D = globalThis.D, U = D.ui;
window.addEventListener('error', e => {
  try {
    const list = JSON.parse(localStorage.getItem('dz.errors') || '[]');
    list.push({ t: Date.now(), msg: String(e.message), src: (e.filename || '') + ':' + (e.lineno || '') });
    localStorage.setItem('dz.errors', JSON.stringify(list.slice(-20)));
  } catch (x) { /* пусто */ }
});
document.addEventListener('DOMContentLoaded', () => {
  try { if (window.DZAndroid) D.VERSION = window.DZAndroid.appVersion(); } catch (e) { /* пусто */ }
  U.showHome();
  setTimeout(() => U.checkUpdate(false), 1500);
});
})();
