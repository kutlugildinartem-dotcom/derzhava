'use strict';
// Флаги и процедурная карта страны.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;

// ---------- флаг ----------
U.drawFlag = function (canvas, flag, w = 90, hgt = 60) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = hgt + 'px';
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [a, b, d] = flag.colors;
  const W = w, H = hgt;
  c.clearRect(0, 0, W, H);
  switch (flag.layout) {
    case 'v3': c.fillStyle = a; c.fillRect(0, 0, W / 3, H); c.fillStyle = b; c.fillRect(W / 3, 0, W / 3, H); c.fillStyle = d; c.fillRect(2 * W / 3, 0, W / 3 + 1, H); break;
    case 'h2': c.fillStyle = a; c.fillRect(0, 0, W, H / 2); c.fillStyle = b; c.fillRect(0, H / 2, W, H / 2); break;
    case 'cross': c.fillStyle = a; c.fillRect(0, 0, W, H); c.fillStyle = d; c.fillRect(W * 0.28, 0, W * 0.16, H); c.fillRect(0, H * 0.4, W, H * 0.2); c.fillStyle = b; c.fillRect(W * 0.31, 0, W * 0.1, H); c.fillRect(0, H * 0.44, W, H * 0.12); break;
    case 'tri': c.fillStyle = b; c.fillRect(0, 0, W, H / 2); c.fillStyle = d; c.fillRect(0, H / 2, W, H / 2); c.fillStyle = a; c.beginPath(); c.moveTo(0, 0); c.lineTo(W * 0.45, H / 2); c.lineTo(0, H); c.fill(); break;
    case 'band': c.fillStyle = a; c.fillRect(0, 0, W, H); c.fillStyle = b; c.fillRect(0, H * 0.25, W, H * 0.5); break;
    case 'diag': c.fillStyle = a; c.fillRect(0, 0, W, H); c.fillStyle = b; c.beginPath(); c.moveTo(W, 0); c.lineTo(W, H); c.lineTo(0, H); c.fill(); c.strokeStyle = d; c.lineWidth = H * 0.14; c.beginPath(); c.moveTo(0, H); c.lineTo(W, 0); c.stroke(); break;
    case 'circle': c.fillStyle = a; c.fillRect(0, 0, W, H); c.fillStyle = b; c.beginPath(); c.arc(W / 2, H / 2, H * 0.3, 0, 7); c.fill(); break;
    default: c.fillStyle = a; c.fillRect(0, 0, W, H / 3); c.fillStyle = b; c.fillRect(0, H / 3, W, H / 3); c.fillStyle = d; c.fillRect(0, 2 * H / 3, W, H / 3 + 1);
  }
  if (flag.emblem) {
    c.font = `${Math.round(H * 0.38)}px system-ui, "Noto Color Emoji", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = flag.layout === 'circle' ? a : (flag.layout === 'band' ? d : '#ffffffdd');
    const x = ['tri'].includes(flag.layout) ? W * 0.16 : W / 2;
    c.fillText(flag.emblem, x, H / 2 + 1);
  }
};
U.flagCanvas = (flag, w, hh) => { const cv = h('canvas.flag'); U.drawFlag(cv, flag, w, hh); return cv; };

// ---------- шум ----------
function hash(x, y, seed) { let n = x * 374761393 + y * 668265263 + seed * 2147483647; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = t => t * t * (3 - 2 * t);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return D.lerp(D.lerp(a, b, s(xf)), D.lerp(c, d, s(xf)), s(yf));
}
function fbm(x, y, seed) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { v += a * vnoise(x * f, y * f, seed + i * 17); a *= 0.5; f *= 2; } return v; }

// Геометрия карты: для каждой клетки сетки — индекс региона (−1 — море, −2 — соседи).
const N = 200;
U.buildMap = function (s) {
  const seed = (s.seed >>> 0) % 100000;
  const coast = s.cfg.geo.coast;
  const R = s.regions;
  const grid = new Int16Array(N * N);
  const land = (x, y) => {
    const dx = x - 0.5, dy = y - 0.5;
    const ang = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    const edge = 0.40 + 0.09 * (fbm(Math.cos(ang) * 1.6 + 5, Math.sin(ang) * 1.6 + 5, seed) - 0.5) * 2 + 0.04 * (fbm(x * 6, y * 6, seed + 3) - 0.5);
    return r < edge;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / N, y = j / N;
    if (!land(x, y)) { grid[j * N + i] = coast ? -1 : -2; continue; }
    // Смещаем координаты шумом — границы становятся «природными».
    const wx = x + (fbm(x * 4, y * 4, seed + 11) - 0.5) * 0.16;
    const wy = y + (fbm(x * 4 + 9, y * 4 + 9, seed + 23) - 0.5) * 0.16;
    let best = 0, bd = 9;
    for (let k = 0; k < R.length; k++) {
      const d = (R[k].x - wx) ** 2 + (R[k].y - wy) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    grid[j * N + i] = best;
  }
  // Центры регионов для подписей.
  const cx = R.map(() => 0), cy = R.map(() => 0), cnt = R.map(() => 0);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const g = grid[j * N + i]; if (g >= 0) { cx[g] += i; cy[g] += j; cnt[g]++; } }
  const centers = R.map((r, k) => cnt[k] ? { x: cx[k] / cnt[k] / N, y: cy[k] / cnt[k] / N } : { x: r.x, y: r.y });
  return { grid, centers, seed };
};

const METRICS = [
  { id: 'grppc', name: 'ВРП на душу', get: r => r.grppc, fmt: v => D.usd(v, 0), good: 1 },
  { id: 'u', name: 'Безработица', get: r => r.u, fmt: v => D.pct(v), good: -1 },
  { id: 'infra', name: 'Инфраструктура', get: r => r.infraAvg, fmt: v => D.fmt(v, 0), good: 1 },
  { id: 'mood', name: 'Настроение', get: r => r.mood, fmt: v => D.fmt(v, 0), good: 1 },
  { id: 'mig', name: 'Миграция (приток)', get: r => r.netMig / Math.max(1, r.pop) * 12000, fmt: v => D.signed(v, 1) + '‰', good: 1 },
  { id: 'wage', name: 'Зарплаты', get: r => r.wageRel, fmt: v => '×' + D.fmt(v, 2), good: 1 },
  { id: 'hpi', name: 'Цены на жильё', get: r => r.hpiRel, fmt: v => '×' + D.fmt(v, 2), good: -1 },
  { id: 'crime', name: 'Преступность', get: r => r.crime, fmt: v => D.fmt(v, 0), good: -1 },
  { id: 'pollution', name: 'Загрязнение', get: r => r.pollution, fmt: v => D.fmt(v, 0), good: -1 },
  { id: 'fund', name: 'Обеспеченность бюджета', get: r => r.fund, fmt: v => D.pct(v, 0), good: 1 },
];
U.MAP_METRICS = METRICS;

function ramp(t) {
  // Красный → жёлтый → зелёный.
  t = D.clamp(t, 0, 1);
  const a = [224, 82, 82], b = [240, 196, 90], c = [80, 200, 140];
  const m = t < 0.5 ? a.map((v, i) => D.lerp(v, b[i], t * 2)) : b.map((v, i) => D.lerp(v, c[i], (t - 0.5) * 2));
  return m.map(Math.round);
}

U.mapView = function (s, metricId, onPick) {
  if (!U.mapGeo || U.mapGeo.seed !== (s.seed >>> 0) % 100000 || U.mapGeo.n !== s.regions.length) { U.mapGeo = U.buildMap(s); U.mapGeo.n = s.regions.length; }
  const geo = U.mapGeo;
  const metric = METRICS.find(m => m.id === metricId) || METRICS[0];
  const vals = s.regions.map(metric.get);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const canvas = h('canvas');
  const wrap = h('div.mapwrap', canvas);
  requestAnimationFrame(() => {
    const W = wrap.clientWidth || 320;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = W * dpr; canvas.style.height = W + 'px';
    const off = document.createElement('canvas'); off.width = N; off.height = N;
    const oc = off.getContext('2d'); const img = oc.createImageData(N, N);
    const col = s.regions.map((r, k) => { const t = hi > lo ? (vals[k] - lo) / (hi - lo) : 0.5; return ramp(metric.good > 0 ? t : 1 - t); });
    const g = geo.grid;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = g[j * N + i], p = (j * N + i) * 4;
      let rgb;
      if (k === -1) { const d = fbm(i / 30, j / 30, 7) * 18; rgb = [18 + d, 44 + d, 74 + d]; }
      else if (k === -2) rgb = [44, 50, 58];
      else {
        rgb = col[k].slice();
        const border = (i > 0 && g[j * N + i - 1] !== k) || (j > 0 && g[(j - 1) * N + i] !== k) || (i < N - 1 && g[j * N + i + 1] !== k) || (j < N - 1 && g[(j + 1) * N + i] !== k);
        if (border) rgb = rgb.map(v => v * 0.45);
        else { const sh = (fbm(i / 18, j / 18, 3) - 0.5) * 22; rgb = rgb.map(v => v + sh); }
      }
      img.data[p] = rgb[0]; img.data[p + 1] = rgb[1]; img.data[p + 2] = rgb[2]; img.data[p + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(off, 0, 0, W, W);
    c.textAlign = 'center';
    s.regions.forEach((r, k) => {
      const ct = geo.centers[k];
      const x = ct.x * W, y = ct.y * W;
      if (r.cap) { c.font = '16px system-ui'; c.fillStyle = '#fff'; c.fillText('★', x, y - 12); }
      c.font = 'bold 10.5px system-ui';
      const name = r.name.split(' ')[0];
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.65)'; c.strokeText(name, x, y + 2); c.fillStyle = '#fff'; c.fillText(name, x, y + 2);
      c.font = '10px system-ui'; const v = metric.fmt(vals[k]);
      c.strokeText(v, x, y + 15); c.fillStyle = '#ffe9b0'; c.fillText(v, x, y + 15);
    });
  });
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left) / r.width * N), j = Math.floor((e.clientY - r.top) / r.height * N);
    const k = geo.grid[D.clamp(j, 0, N - 1) * N + D.clamp(i, 0, N - 1)];
    if (k >= 0 && onPick) onPick(s.regions[k]);
  });
  const legend = h('div.row.between.small.dim.mt', h('span', '🟥 хуже: ' + metric.fmt(metric.good > 0 ? lo : hi)), h('span', '🟩 лучше: ' + metric.fmt(metric.good > 0 ? hi : lo)));
  return h('div', wrap, legend);
};
})();
