'use strict';
// Общие помощники: случайные числа (с состоянием внутри партии, чтобы откат хода
// повторял ту же историю), статистика, форматирование чисел и денег.
(function () {
const D = globalThis.D = globalThis.D || {};
D.VERSION = '1.0';

// ---------- случайность ----------
// Генератор mulberry32. Состояние хранится в s.seed, поэтому сохранение и откат
// партии полностью воспроизводимы.
D.rand = function (s) {
  let t = s.seed = (s.seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
D.gauss = function (s) {
  let u = D.rand(s) || 1e-9, v = D.rand(s);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
D.pick = (s, arr) => arr[Math.floor(D.rand(s) * arr.length)];
D.chance = (s, p) => D.rand(s) < p;
D.range = (s, a, b) => a + (b - a) * D.rand(s);
D.shuffle = function (s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(D.rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// Независимый генератор для конструктора (без партии).
D.tmpRng = seed => ({ seed: seed | 0 });

// ---------- математика ----------
D.clamp = (x, a, b) => x < a ? a : x > b ? b : x;
D.lerp = (a, b, t) => a + (b - a) * t;
D.sum = arr => arr.reduce((a, b) => a + b, 0);
D.avg = arr => arr.length ? D.sum(arr) / arr.length : 0;
D.sigmoid = x => 1 / (1 + Math.exp(-x));
// Мягкий потолок: до cap растёт почти линейно, дальше упирается.
D.softcap = (x, cap) => x <= 0 ? x : cap * Math.tanh(x / cap);
D.approach = (cur, target, k) => cur + (target - cur) * k;

// Функция нормального распределения и обратная к ней (Acklam).
D.normCdf = function (x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};
D.normInv = function (p) {
  p = D.clamp(p, 1e-9, 1 - 1e-9);
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};

// Доли доходов 10 децилей для логнормального распределения с заданным Джини.
// Для логнормального G = 2Φ(σ/√2) − 1, отсюда σ. Доля дециля считается
// по формуле Лоренца L(p) = Φ(Φ⁻¹(p) − σ).
D.sigmaFromGini = g => Math.SQRT2 * D.normInv((D.clamp(g, 0.05, 0.9) + 1) / 2);
D.decileShares = function (gini) {
  const sg = D.sigmaFromGini(gini), out = [];
  let prev = 0;
  for (let i = 1; i <= 10; i++) {
    const L = i === 10 ? 1 : D.normCdf(D.normInv(i / 10) - sg);
    out.push(L - prev); prev = L;
  }
  return out;
};
// Джини по 10 равным группам (с поправкой на неравенство внутри децилей).
D.giniFromDeciles = function (vals) {
  const tot = D.sum(vals); if (tot <= 0) return 0;
  let cum = 0, area = 0;
  for (const v of vals) { const n = cum + v / tot; area += (cum + n) / 2 * 0.1; cum = n; }
  return D.clamp((1 - 2 * area) * 1.09, 0, 0.95);
};

// ---------- форматирование ----------
const nbsp = ' ';
D.fmt = function (x, d = 0) {
  if (x === null || x === undefined || !isFinite(x)) return '—';
  const s = Math.abs(x).toFixed(d).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, nbsp);
  return (x < 0 ? '−' : '') + s.join(',');
};
D.pct = (x, d = 1) => (x === null || !isFinite(x)) ? '—' : D.fmt(x * 100, d) + '%';
D.pp = (x, d = 1) => (x >= 0 ? '+' : '') + D.fmt(x * 100, d) + ' п.п.';
D.signed = (x, d = 1) => (x > 0 ? '+' : '') + D.fmt(x, d);
D.spct = (x, d = 1) => (x > 0 ? '+' : '') + D.pct(x, d);
// Крупные суммы: 1,2 трлн ₽ / 350 млрд ₽ / 12 млн ₽.
D.big = function (x, sym = '', d) {
  if (!isFinite(x)) return '—';
  const a = Math.abs(x);
  let v, u;
  if (a >= 1e12) { v = x / 1e12; u = 'трлн'; }
  else if (a >= 1e9) { v = x / 1e9; u = 'млрд'; }
  else if (a >= 1e6) { v = x / 1e6; u = 'млн'; }
  else if (a >= 1e4) { v = x / 1e3; u = 'тыс.'; }
  else { v = x; u = ''; }
  const dd = d !== undefined ? d : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return D.fmt(v, dd) + (u ? nbsp + u : '') + (sym ? nbsp + sym : '');
};
D.people = x => D.big(x, 'чел.');
D.money = (s, x, d) => D.big(x, s.cfg.cur.sym, d);
D.usd = (x, d) => D.big(x, '$', d);

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_S = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
D.MONTHS = MONTHS; D.MONTHS_S = MONTHS_S; D.MONTHS_G = MONTHS_G;
D.dateOf = (s, t = s.t) => ({ y: s.year0 + Math.floor((s.month0 + t) / 12), m: (s.month0 + t) % 12 });
D.dateStr = (s, t = s.t) => { const d = D.dateOf(s, t); return MONTHS[d.m] + ' ' + d.y; };
D.dateShort = (s, t = s.t) => { const d = D.dateOf(s, t); return MONTHS_S[d.m] + ' ' + d.y; };

// Склонение: plural(5, 'год', 'года', 'лет').
D.plural = function (n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};
D.months = n => n % 12 === 0 && n >= 12
  ? (n / 12) + ' ' + D.plural(n / 12, 'год', 'года', 'лет')
  : n + ' ' + D.plural(n, 'месяц', 'месяца', 'месяцев');

D.clone = o => JSON.parse(JSON.stringify(o));
D.byId = (arr, id) => arr.find(x => x.id === id);
})();
