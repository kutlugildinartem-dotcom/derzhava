'use strict';
// Демография: пятилетние возрастные группы (0–4, 5–9 … 95–99, 100+) в каждом регионе.
// Смертность — по закону Гомпертца–Мейкхема q(a) = c + A·e^(B·a) плюс младенческая,
// параметр A подбирается так, чтобы ожидаемая продолжительность жизни совпала с целевой.
(function () {
const D = globalThis.D;
const NB = D.AGES = 21;
const B = 0.088, MAKEHAM = 0.0003;

function curve(lnA, imr) {
  const A = Math.exp(lnA), q = new Array(111);
  for (let a = 0; a <= 110; a++) {
    if (a === 0) q[a] = imr;
    else if (a < 5) q[a] = imr * 0.07;
    else q[a] = Math.min(1, MAKEHAM + A * Math.exp(B * a) + (a < 15 ? imr * 0.02 : 0));
  }
  return q;
}
function lifeExp(q) {
  let l = 1, e = 0;
  for (let a = 0; a <= 110; a++) { const n = l * (1 - q[a]); e += (l + n) / 2; l = n; if (l < 1e-6) break; }
  return e;
}
D.imrFromLE = le => D.clamp(0.15 * Math.exp(-0.115 * (le - 45)), 0.0015, 0.16);

// Подбор таблицы смертности под продолжительность жизни. Возвращает месячные
// коэффициенты смертности по возрастным группам.
D.mortality = function (le) {
  const imr = D.imrFromLE(le);
  let lo = -16, hi = -4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (lifeExp(curve(mid, imr)) > le) lo = mid; else hi = mid;
  }
  const q = curve((lo + hi) / 2, imr);
  // Средневзвешенная по доживающим годовая смертность в группе → месячная.
  const rates = [], lx = [];
  let l = 1;
  for (let a = 0; a <= 110; a++) { lx.push(l); l *= 1 - q[a]; }
  for (let b = 0; b < NB; b++) {
    let num = 0, den = 0;
    const a1 = b * 5, a2 = b === NB - 1 ? 110 : b * 5 + 4;
    for (let a = a1; a <= a2; a++) { num += lx[a] * q[a]; den += lx[a]; }
    rates.push(den > 0 ? num / den / 12 : 0.05);
  }
  return { rates, imr, lx };
};

// Стационарная возрастная пирамида, растущая с темпом g: n(a) ∝ l(a)·e^(−g·a).
// g подбирается под медианный возраст.
D.agePyramid = function (le, median) {
  const { lx } = D.mortality(le);
  const build = g => {
    const n = new Array(NB).fill(0);
    for (let a = 0; a <= 110; a++) n[Math.min(NB - 1, Math.floor(a / 5))] += lx[a] * Math.exp(-g * a);
    return n;
  };
  const medianOf = n => {
    const tot = D.sum(n); let c = 0;
    for (let b = 0; b < NB; b++) { if (c + n[b] >= tot / 2) return b * 5 + 5 * (tot / 2 - c) / n[b]; c += n[b]; }
    return 100;
  };
  let lo = -0.06, hi = 0.08;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (medianOf(build(mid)) > median) lo = mid; else hi = mid;
  }
  const n = build((lo + hi) / 2), tot = D.sum(n);
  return n.map(x => x / tot);
};

// Сумма по возрастам [a1, a2) лет (с долями на границах групп).
D.popAges = function (coh, a1, a2) {
  let s = 0;
  for (let b = 0; b < NB; b++) {
    const lo = b * 5, hi = b === NB - 1 ? 105 : lo + 5;
    const ov = Math.max(0, Math.min(hi, a2) - Math.max(lo, a1));
    if (ov > 0) s += coh[b] * ov / (hi - lo);
  }
  return s;
};

// Сводка по всей стране.
D.nationalCohorts = function (s) {
  const n = new Array(NB).fill(0);
  for (const r of s.regions) for (let b = 0; b < NB; b++) n[b] += r.coh[b];
  return n;
};

// Месячный шаг демографии: рождения, смерти, старение, внешняя миграция.
// Внутренняя миграция между регионами — в social.js (ей нужны зарплаты и жильё).
D.stepDemography = function (s) {
  const p = s.pop, m = s.mods;
  // Продолжительность жизни движется к цели медленно; раз в квартал пересчитываем таблицу смертности.
  p.le = D.approach(p.le, p.leTarget, 1 / 48) + (p.leShock || 0);
  p.leShock = 0;
  if (s.t % 3 === 0 || !p.mort) p.mort = D.mortality(p.le).rates;
  p.tfr = D.clamp(D.approach(p.tfr, p.tfrTarget, 1 / 30), 0.6, 7.5);
  let births = 0, deaths = 0;
  const excess = 1 + (p.excessDeath || 0);
  for (const r of s.regions) {
    const c = r.coh;
    const women = 0.5 * D.popAges(c, 15, 50);
    const b = p.tfr * women / 35 / 12 * (r.tfrMul || 1);
    let dth = 0;
    for (let i = 0; i < NB; i++) { const d = c[i] * p.mort[i] * excess * (r.mortMul || 1); c[i] -= d; dth += d; }
    // Старение: 1/60 каждой группы переходит в следующую.
    for (let i = NB - 1; i >= 1; i--) {
      const mv = c[i - 1] / 60;
      c[i - 1] -= mv; c[i] += mv;
    }
    c[0] += b;
    births += b; deaths += dth;
    r.births = b; r.deaths = dth;
  }
  p.births = births; p.deaths = deaths;
  p.excessDeath = Math.max(0, (p.excessDeath || 0) * 0.85 - 0.0005);
  // Внешняя миграция: эмиграция молодых и образованных, иммиграция трудоспособных.
  const emigRate = s.soc.emigRate, immigRate = s.soc.immigRate;
  let emi = 0, imm = 0;
  const tot = s.popTotal;
  for (const r of s.regions) {
    const share = r.pop / tot;
    const outN = emigRate * r.pop * (r.emigMul || 1);
    const inN = immigRate * tot * share * (r.cap ? 1.8 : r.spec === 'depressed' ? 0.4 : 1) / (1 + (r.cap ? 0.8 * share : 0)) ;
    // Уезжают в основном 20–39 лет, приезжают 20–44.
    moveAges(r.coh, 20, 40, -outN);
    moveAges(r.coh, 20, 45, inN);
    emi += outN; imm += inN;
  }
  p.emig = emi; p.immig = imm;
  D.refreshPopTotals(s);
};

function moveAges(coh, a1, a2, n) {
  const base = D.popAges(coh, a1, a2); if (base <= 0) return;
  const k = n / base;
  for (let b = 0; b < NB; b++) {
    const lo = b * 5, hi = lo + 5;
    const ov = Math.max(0, Math.min(hi, a2) - Math.max(lo, a1));
    if (ov > 0) coh[b] = Math.max(0, coh[b] + coh[b] * ov / 5 * k);
  }
}
D.moveAges = moveAges;

D.refreshPopTotals = function (s) {
  let tot = 0;
  for (const r of s.regions) { r.pop = D.sum(r.coh); tot += r.pop; }
  s.popTotal = tot;
  const n = D.nationalCohorts(s);
  const p = s.pop;
  p.cohorts = n;
  p.children = D.popAges(n, 0, 18);
  p.youth = D.popAges(n, 15, 30);
  p.work = D.popAges(n, 15, s.pol.pension.age);
  p.elderly = D.popAges(n, s.pol.pension.age, 110);
  p.over65 = D.popAges(n, 65, 110);
  p.adults = D.popAges(n, 18, 110);
  p.students = D.popAges(n, 18, 23);
  let c = 0, half = tot / 2;
  for (let b = 0; b < NB; b++) { if (c + n[b] >= half) { p.median = b * 5 + 5 * (half - c) / n[b]; break; } c += n[b]; }
  p.dependency = (p.children + p.elderly) / Math.max(1, p.work);
};
})();
