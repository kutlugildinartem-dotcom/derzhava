'use strict';
// Графики на canvas: линии (с коридором нормы и «другой веткой» после отката),
// горизонтальные бары, пирамида населения, спарклайн.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
const COLORS = ['#e8c267', '#6cb4ff', '#5cd6a0', '#ff6b6b', '#b18cff', '#4fd1d9', '#f5b544', '#ff9ecd'];
U.COLORS = COLORS;

function setup(canvas, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || canvas.parentNode.clientWidth || 320;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(height * dpr);
  canvas.style.height = height + 'px';
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, w, h: height };
}
const later = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

// Линейный график.
// o: {series:[{data, label, color, dash, ghost}], t0 (месяц первого значения), s (партия для дат),
//     fmt(v), height, band:{lo,hi}, zero:true, pctAxis}
U.lineChart = function (o) {
  const canvas = h('canvas.chart');
  const legend = h('div.legend');
  const tip = h('div.small.dim', { style: 'min-height:18px;margin-top:2px' }, '');
  const box = h('div', canvas, legend, tip);
  for (const sr of o.series) if (sr.label && !sr.ghost) legend.appendChild(h('span', h('i', { style: { background: sr.color || COLORS[0] } }), sr.label));
  let geom = null;
  const draw = (hx) => {
    const H = o.height || 170;
    const { c, w } = setup(canvas, H);
    const padL = 46, padR = 8, padT = 8, padB = 22;
    let lo = Infinity, hi = -Infinity, n = 0;
    for (const sr of o.series) for (const v of sr.data) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (const sr of o.series) n = Math.max(n, sr.data.length);
    if (o.band) { lo = Math.min(lo, o.band.lo); hi = Math.max(hi, o.band.hi); }
    if (o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (hi - lo < 1e-9) { hi += Math.abs(hi) * 0.1 + 1e-6; lo -= Math.abs(lo) * 0.1 + 1e-6; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const X = i => padL + (w - padL - padR) * (n <= 1 ? 0.5 : i / (n - 1));
    const Y = v => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
    geom = { X, n, padL, padR, w };
    c.clearRect(0, 0, w, H);
    // Коридор нормы.
    if (o.band) {
      c.fillStyle = 'rgba(92,214,160,0.10)';
      c.fillRect(padL, Y(Math.min(o.band.hi, hi)), w - padL - padR, Y(Math.max(o.band.lo, lo)) - Y(Math.min(o.band.hi, hi)));
    }
    // Сетка и подписи.
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.fillStyle = '#6f7d98'; c.font = '10px system-ui'; c.lineWidth = 1;
    for (let k = 0; k <= 3; k++) {
      const v = lo + (hi - lo) * k / 3, y = Y(v);
      c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke();
      c.textAlign = 'right'; c.fillText(o.fmt(v), padL - 4, y + 3);
    }
    if (lo < 0 && hi > 0) { c.strokeStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(padL, Y(0)); c.lineTo(w - padR, Y(0)); c.stroke(); }
    // Годы по оси X.
    if (o.s && n > 1) {
      c.textAlign = 'center'; c.fillStyle = '#6f7d98';
      const t0 = o.t0 || 0;
      const years = Math.max(1, Math.round(n / 12 / 5));
      for (let i = 0; i < n; i++) {
        const d = D.dateOf(o.s, t0 + i);
        if (d.m === 0 && (d.y % years === 0)) c.fillText(String(d.y), X(i), H - 6);
      }
    }
    // Линии.
    o.series.forEach((sr, si) => {
      c.strokeStyle = sr.color || COLORS[si % COLORS.length];
      c.lineWidth = sr.ghost ? 1.5 : 2;
      c.setLineDash(sr.ghost || sr.dash ? [5, 4] : []);
      c.globalAlpha = sr.ghost ? 0.55 : 1;
      c.beginPath();
      let started = false;
      sr.data.forEach((v, i) => { if (!isFinite(v)) return; const x = X(i), y = Y(v); if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); });
      c.stroke();
      c.globalAlpha = 1; c.setLineDash([]);
    });
    // Метка касания.
    if (hx !== undefined && n > 1) {
      const i = D.clamp(Math.round((hx - padL) / (w - padL - padR) * (n - 1)), 0, n - 1);
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(X(i), padT); c.lineTo(X(i), H - padB); c.stroke();
      const parts = [];
      o.series.forEach((sr, si) => {
        const v = sr.data[i]; if (!isFinite(v)) return;
        c.fillStyle = sr.color || COLORS[si % COLORS.length];
        c.beginPath(); c.arc(X(i), Y(v), 3.5, 0, 7); c.fill();
        parts.push((sr.label ? sr.label + ': ' : '') + o.fmt(v, true));
      });
      tip.textContent = (o.s ? D.dateStr(o.s, (o.t0 || 0) + i) + ' — ' : '') + parts.join(' · ');
    }
  };
  const touch = e => {
    if (!geom) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    draw(x);
  };
  canvas.addEventListener('pointerdown', touch);
  canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') touch(e); });
  later(() => draw());
  return box;
};

// Горизонтальные бары со знаком (вклады в рост/инфляцию).
// items: [{label, v, color}], fmt
U.barsChart = function (items, fmt, o = {}) {
  const max = Math.max(1e-9, ...items.map(x => Math.abs(x.v)));
  const box = h('div');
  for (const it of items) {
    const frac = Math.abs(it.v) / max;
    const pos = it.v >= 0;
    const color = it.color || (pos ? (o.posGood === false ? 'var(--bad)' : 'var(--good)') : (o.posGood === false ? 'var(--good)' : 'var(--bad)'));
    box.appendChild(h('div', { style: 'display:grid;grid-template-columns:118px 1fr 58px;gap:6px;align-items:center;padding:4px 0;font-size:12.5px' },
      h('span.ellipsis', it.label),
      h('div', { style: 'position:relative;height:10px;background:rgba(255,255,255,0.05);border-radius:3px' },
        h('i', { style: { position: 'absolute', top: 0, bottom: 0, left: pos ? '50%' : `${50 - frac * 50}%`, width: `${frac * 50}%`, background: color, borderRadius: '3px' } }),
        h('i', { style: 'position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,0.3)' })),
      h('span.num', { style: 'text-align:right' }, fmt(it.v))));
  }
  return box;
};

// Половозрастная пирамида по 5-летним группам.
U.pyramid = function (coh, retAge) {
  const canvas = h('canvas.chart');
  later(() => {
    const H = 200;
    const { c, w } = setup(canvas, H);
    const n = coh.length, max = Math.max(...coh);
    const bh = (H - 10) / n;
    for (let b = 0; b < n; b++) {
      const y = H - 10 - (b + 1) * bh;
      const len = (w / 2 - 30) * coh[b] / max;
      const age = b * 5;
      c.fillStyle = age < 15 ? '#6cb4ff' : age < retAge ? '#5cd6a0' : '#e8c267';
      c.fillRect(w / 2 - len, y + 1, len * 2, bh - 2);
      if (b % 2 === 0) { c.fillStyle = '#6f7d98'; c.font = '9px system-ui'; c.textAlign = 'left'; c.fillText(age + (b === n - 1 ? '+' : ''), 2, y + bh - 2); }
    }
  });
  return h('div', canvas, h('div.legend', h('span', h('i', { style: 'background:#6cb4ff' }), 'дети 0–14'), h('span', h('i', { style: 'background:#5cd6a0' }), 'трудоспособные'), h('span', h('i', { style: 'background:#e8c267' }), 'пенсионеры')));
};

// Столбцы по децилям (или любые категории).
U.columns = function (vals, labels, fmt, colors) {
  const canvas = h('canvas.chart');
  later(() => {
    const H = 150;
    const { c, w } = setup(canvas, H);
    const n = vals.length, max = Math.max(...vals.map(Math.abs), 1e-9);
    const bw = (w - 10) / n;
    vals.forEach((v, i) => {
      const bh = (H - 34) * Math.abs(v) / max;
      c.fillStyle = colors ? colors[i % colors.length] : COLORS[0];
      c.fillRect(5 + i * bw + 3, H - 18 - bh, bw - 6, bh);
      c.fillStyle = '#9aa8c2'; c.font = '9.5px system-ui'; c.textAlign = 'center';
      c.fillText(labels[i], 5 + i * bw + bw / 2, H - 5);
      c.fillText(fmt(v), 5 + i * bw + bw / 2, H - 22 - bh);
    });
  });
  return canvas;
};

// Спарклайн для плиток.
U.spark = function (data, color) {
  const canvas = h('canvas');
  later(() => {
    const { c, w, h: H } = setup(canvas, 24);
    const d = data.slice(-60);
    if (d.length < 2) return;
    let lo = Math.min(...d), hi = Math.max(...d);
    if (hi - lo < 1e-9) { hi += 1e-6; lo -= 1e-6; }
    c.strokeStyle = color || '#e8c267'; c.lineWidth = 1.5; c.beginPath();
    d.forEach((v, i) => { const x = i / (d.length - 1) * w, y = 2 + (H - 4) * (1 - (v - lo) / (hi - lo)); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
    c.stroke();
  });
  return canvas;
};

// Удобный график ряда истории: id из D.HIST, с «другой веткой» и нормой.
U.histChart = function (s, ids, o = {}) {
  const hs = ids.map(id => D.HISTBY[id]);
  const fmtOf = f => (v, full) => {
    switch (f) {
      case 'pct': return D.pct(v, full ? 1 : Math.abs(v) < 0.1 ? 1 : 0);
      case 'money': return D.big(v, full ? s.cfg.cur.sym : '');
      case 'usd': return D.big(v, full ? '$' : '');
      case 'people': return D.big(v, full ? 'чел.' : '');
      case 'num1': return D.fmt(v, 1);
      case 'num2': return D.fmt(v, 2);
      case 'num3': return D.fmt(v, 3);
      default: return D.fmt(v, 0);
    }
  };
  const from = o.years ? Math.max(0, s.hist[ids[0]].length - o.years * 12) : 0;
  const series = [];
  hs.forEach((hh, i) => {
    series.push({ data: s.hist[hh.id].slice(from), label: ids.length > 1 ? (o.labels ? o.labels[i] : hh.name) : null, color: o.colors ? o.colors[i] : COLORS[i] });
    if (U.ghost && U.ghost[hh.id] && !o.noGhost) series.push({ data: U.ghost[hh.id].slice(from), ghost: true, color: o.colors ? o.colors[i] : COLORS[i] });
  });
  return U.lineChart({ series, s, t0: from, fmt: fmtOf(hs[0].fmt), height: o.height || 160, band: o.band, zero: o.zero });
};
})();
