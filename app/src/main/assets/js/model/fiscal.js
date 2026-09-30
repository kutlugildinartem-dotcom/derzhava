'use strict';
// Бюджет: налоги (по базам, с уклонением), распределение доходов по децилям,
// расходы (формульные и дискреционные), регионы, долг, рейтинг.
(function () {
const D = globalThis.D;

// Как доходы разных видов распределены по децилям (1 — самые бедные 10%, 10 — самые богатые).
const CAP_DIST = [0.005, 0.008, 0.012, 0.018, 0.025, 0.035, 0.05, 0.08, 0.15, 0.617];
const MIX_DIST = [0.03, 0.05, 0.06, 0.07, 0.085, 0.095, 0.11, 0.125, 0.15, 0.225];
const PENS_DIST = [0.06, 0.13, 0.15, 0.14, 0.125, 0.11, 0.095, 0.08, 0.065, 0.045];
const UNEMP_DIST = [0.3, 0.2, 0.14, 0.1, 0.08, 0.06, 0.045, 0.035, 0.025, 0.015];
const CHILD_DIST = [0.13, 0.12, 0.11, 0.105, 0.1, 0.1, 0.095, 0.09, 0.08, 0.07];
const ASSIST_DIST = [0.6, 0.28, 0.08, 0.03, 0.01, 0, 0, 0, 0, 0];
const MPC = [1.0, 0.97, 0.93, 0.9, 0.87, 0.84, 0.8, 0.75, 0.68, 0.52];
D.MPC = MPC;

// Сетка из 100 квантилей логнормального распределения зарплат (среднее = 1).
const ZGRID = [];
for (let k = 0; k < 100; k++) ZGRID.push(D.normInv((k + 0.5) / 100));
function wageGrid(giniW) {
  const sg = D.sigmaFromGini(giniW), mu = -sg * sg / 2;
  const y = ZGRID.map(z => Math.exp(mu + sg * z));
  const mean = D.sum(y) / 100;
  return y.map(v => v / mean);
}
D.wageGrid = wageGrid;

// Налог по прогрессивной шкале с месячного дохода (пороги — в средних зарплатах).
function pitTax(pol, wage, avgW) {
  const taxable = Math.max(0, wage - pol.taxFree * avgW);
  if (pol.pitMode === 'flat') return taxable * pol.tax.pit;
  const br = pol.pit;
  let tax = 0;
  for (let i = 0; i < br.length; i++) {
    const lo = br[i].from * avgW, hi = i + 1 < br.length ? br[i + 1].from * avgW : Infinity;
    if (taxable > lo) tax += (Math.min(taxable, hi) - lo) * br[i].rate;
  }
  return tax;
}
D.pitTax = pitTax;
D.topPitRate = pol => pol.pitMode === 'flat' ? pol.tax.pit : pol.pit[pol.pit.length - 1].rate;

// Собираемость налога: качество налоговой службы × обеление × штраф за чрезмерную ставку.
function comp(s, id, rate) {
  const t = D.TAX[id];
  const over = Math.max(0, rate - t.norm.hi);
  return D.clamp(s.inst.taxAdmin * Math.exp(-t.evK * over), 0.05, 1);
}

D.stepFiscal = function (s, initMode) {
  const e = s.e, pol = s.pol, tx = pol.tax, c0 = s.c0, m = s.mods, p = s.pop, w = s.w;
  const f = s.fis, g = s.gov, dist = s.dist;
  const GDP = s.ind.gdpNom;
  const formal = 1 - s.inst.shadow;
  const taxBase = 1 + (m.taxBase || 0);
  // Налоговая служба.
  s.inst.taxAdmin = D.clamp(0.72 + 0.12 * Math.min(1.6, (pol.spend.admin || 0) / 0.02) + (m.taxAdmin || 0) - 0.004 * (s.inst.corr - 30) + c0.taxAdminOff, 0.3, 0.98);

  // ---------- доходы населения по децилям ----------
  const WB = e.W * 12 * e.E;                                       // фонд оплаты труда (вкл. серые)
  const mixed = 0.06 * GDP;                                        // доходы самозанятых и ИП
  const giniW = D.clamp(c0.giniW + (m.giniAdj || 0) + 0.0012 * (s.inst.corr - c0.corr) - 0.0015 * (e.qEdu - c0.qEdu)
    + 0.25 * (e.profitShare - c0.profitShare) + 0.4 * (e.u - c0.u) - 0.25 * (m.minWage - c0.mw), 0.15, 0.7);
  dist.giniW = giniW;
  const grid = wageGrid(giniW);
  const rate = { pit: [], ssc: [] };
  let pitRev = 0, sscEe = 0;
  const labor = [], avgRel = [];
  const top = D.topPitRate(pol);
  // Высокая верхняя ставка: богатые прячут доходы и уезжают.
  const topAvoid = Math.exp(-2.2 * Math.max(0, top - 0.45));
  for (let d = 0; d < 10; d++) {
    let inc = 0, tax = 0;
    for (let k = d * 10; k < d * 10 + 10; k++) {
      const w = grid[k] * e.W;
      inc += w; tax += pitTax(pol, w, e.W) * (d === 9 ? topAvoid : 1);
    }
    const lab = WB * inc / e.W / 100;
    labor.push(lab);
    avgRel.push(inc / e.W / 10);
    const tr = inc > 0 ? tax / inc : 0;
    rate.pit.push(tr);
    pitRev += lab * tr;
    sscEe += lab * tx.ssc_ee;
  }
  pitRev = pitRev * formal * comp(s, 'pit', Math.max(tx.pit, top * 0.8)) * taxBase;
  sscEe *= formal * comp(s, 'ssc_ee', tx.ssc_ee);
  const sscEr = WB * formal * tx.ssc_er * comp(s, 'ssc_er', tx.ssc_er);

  // ---------- налоги на потребление ----------
  const Cnom = e.C * e.P;
  const food = c0.cpiW.food;
  const vatEff = (food * tx.vat_red + (1 - food) * tx.vat);
  const vatComp = D.clamp(comp(s, 'vat', tx.vat) * (1 - s.inst.shadow * 0.6) / (1 - c0.shadow * 0.6) * c0.vatComp, 0.05, 1);
  const vat = Cnom * vatEff / (1 + vatEff) * vatComp * taxBase + e.G * e.P * 0.25 * vatEff / (1 + vatEff) * vatComp;
  const sales = Cnom * tx.sales / (1 + tx.sales) * comp(s, 'sales', tx.sales);
  const exShare = (base, r, r0) => base * Math.pow((1 + r0) / (1 + r), 0.6);
  const alc = exShare(0.025, tx.exc_alc, c0.tax.exc_alc) * Cnom * tx.exc_alc / (1 + tx.exc_alc) * comp(s, 'exc_alc', tx.exc_alc) * (pol.laws.alcohol === 2 ? 0.15 : 1);
  const tob = exShare(0.012, tx.exc_tob, c0.tax.exc_tob) * Cnom * tx.exc_tob / (1 + tx.exc_tob) * comp(s, 'exc_tob', tx.exc_tob);
  const fuel = exShare(0.05, tx.exc_fuel, c0.tax.exc_fuel) * (Cnom + GDP * 0.03) * tx.exc_fuel / (1 + tx.exc_fuel) * comp(s, 'exc_fuel', tx.exc_fuel);
  const lux = Cnom * 0.03 * tx.luxury * comp(s, 'luxury', tx.luxury);

  // ---------- бизнес ----------
  const indirect = vat + sales + alc + tob + fuel + lux;
  const GOS = GDP - WB * (1 + tx.ssc_er * formal) - indirect;
  const deprec = D.DELTA * e.K * e.P;
  const profits = Math.max(0, GOS - deprec - mixed);
  const smeShare = D.clamp(c0.smeShare * (1 + 0.01 * (s.inst.biz - 50)), 0.03, 0.5);
  const shift = Math.exp(-2.2 * Math.max(0, tx.cit - 0.25));
  const cit = profits * (1 - smeShare) * formal * tx.cit * shift * comp(s, 'cit', tx.cit) * taxBase;
  const sme = GDP * smeShare * 1.4 * tx.sme * comp(s, 'sme', tx.sme);
  const fintx = e.L * 8 * tx.fintx * comp(s, 'fintx', tx.fintx);
  const digital = GDP * e.sec.it * 0.5 * tx.digital * comp(s, 'digital', tx.digital);
  const resNom = s.ind.resNom;
  const resBase = c0.resShare * GDP * (w.P / c0.Pw);                // «нормальная» сырьевая рента
  const windfall = Math.max(0, resNom - resBase) * 0.5 * tx.windfall * comp(s, 'windfall', tx.windfall);
  const mining = resNom * tx.mining * comp(s, 'mining', tx.mining);
  const exportD = e.Xr * w.com * (w.P / c0.Pw) * (e.er / c0.er) * c0.P * tx.export * comp(s, 'export', tx.export);
  const tariffRate = tx.tariff * (1 - s.ext.ftaShare * 0.8);
  const tariff = e.M * (w.P / c0.Pw) * (e.er / c0.er) * c0.P * tariffRate * comp(s, 'tariff', tx.tariff);
  // ---------- имущество и богатство ----------
  const housing = (s.cfg.modules.housing ? e.hpi / c0.hpi : e.P / c0.P) * c0.housingStock;
  const propInd = housing * tx.prop_ind * comp(s, 'prop_ind', tx.prop_ind);
  const propCorp = e.K * e.P * tx.prop_corp * comp(s, 'prop_corp', tx.prop_corp);
  const land = GDP * 0.6 * tx.land * comp(s, 'land', tx.land);
  const capIncome = profits * (1 - tx.cit) * 0.35;
  const capinc = capIncome * tx.capinc * comp(s, 'capinc', tx.capinc);
  const wealthStock = 3.2 * GDP;
  const inherit = wealthStock / 45 * 0.5 * tx.inherit * comp(s, 'inherit', tx.inherit);
  const wealth = wealthStock * 0.35 * tx.wealth * comp(s, 'wealth', tx.wealth);
  const co2 = s.ind.gdpUsd * 0.00032 * (0.6 + 1.2 * (e.sec.manuf + e.sec.mining)) * (s.inst.pollution / 50);
  const carbon = co2 * tx.carbon * e.er * comp(s, 'carbon', tx.carbon);
  const transport = p.adults * 0.35 * e.W * 12 * 0.004 * tx.transport * comp(s, 'transport', tx.transport);
  const rev = { pit: pitRev, ssc_er: sscEr, ssc_ee: sscEe, vat, vat_red: 0, sales, exc_alc: alc, exc_tob: tob, exc_fuel: fuel, luxury: lux,
    cit, sme, fintx, digital, windfall, prop_ind: propInd, prop_corp: propCorp, land, capinc, inherit, wealth, mining, export: exportD, tariff, carbon, transport };
  // Калибровка под реальные доходы бюджета страны-прототипа (неучтённые в модели базы).
  if (c0.revMul && c0.revMul !== 1) for (const k in rev) rev[k] *= c0.revMul;
  f.rev = rev;
  f.indirectShare = (indirect + tariff) / GDP;
  // Неналоговые доходы: дивиденды госкомпаний, прибыль ЦБ, пошлины и сборы.
  // В плановой экономике почти вся прибыль госпредприятий изымается в бюджет.
  const soe = s.inst.stateShare * Math.max(0, profits - cit) * (0.22 + 0.6 * (m.plan || 0)) + s.inst.stateShare * resNom * 0.1;
  const fees = 0.008 * GDP;
  f.nontax = soe + fees;

  // Кому достаются налоги.
  const lvl = { f: 0, r: 0, l: 0 };
  let taxTotal = 0;
  for (const t of D.TAXES) {
    const v = rev[t.id] || 0; taxTotal += v;
    const sp = pol.split[t.id] || t.split;
    lvl.f += v * sp.f; lvl.r += v * sp.r; lvl.l += v * sp.l;
  }
  lvl.f += f.nontax * 0.7; lvl.r += f.nontax * 0.2; lvl.l += f.nontax * 0.1;
  // Бюджетное правило: сверхдоходы от сырья — в фонд.
  let toFund = 0;
  if (pol.laws.fiscalRule) {
    const resTax = mining + exportD + windfall;
    const baseTax = resTax * Math.min(1, resBase / Math.max(1, resNom));
    toFund = Math.max(0, resTax - baseTax);
    lvl.f -= toFund;
  }
  f.toFund = toFund;
  f.taxTotal = taxTotal;
  f.revLvl = lvl;
  f.taxBurden = taxTotal / GDP;

  // ---------- социальные обязательства ----------
  // Пенсия индексируется по зарплатам или по инфляции (тогда отстаёт от зарплат).
  const Pratio = e.P / (D.bufAgo(s, 'P', 0) || e.P);
  if (pol.pension.index === 'infl') f.pensionLevel *= Pratio;
  else if (pol.pension.index === 'mixed') f.pensionLevel = D.approach(f.pensionLevel * Pratio, pol.pension.repl * e.W, 1 / 12);
  else f.pensionLevel = D.approach(f.pensionLevel, pol.pension.repl * e.W, 1 / 6);
  f.pensionRepl = f.pensionLevel / e.W;
  const pensions = p.elderly * 0.97 * f.pensionLevel * 12;
  const unemployed = e.LF * e.u;
  const unemp = unemployed * Math.min(1, pol.unemp.months / 9) * 0.75 * pol.unemp.repl * e.W * 12 * (1 - s.inst.shadow * 0.5);
  const child = p.children * pol.child * e.W * 12 * 0.85 + (m.spendChild || 0) * GDP;
  const sgD = D.sigmaFromGini(dist.gini || c0.gini);
  const below = D.normCdf(Math.log(Math.max(0.01, pol.gmi)) / sgD);
  const assist = below * s.popTotal * pol.gmi * (dist.median || c0.median) * 0.35 * 12 * 0.7;
  const ubi = p.adults * pol.ubi * e.W * 12;
  // ---------- дискреционные ----------
  const exp = { pensions, unemp, child, assist: assist + ubi };
  const addon = { univ: m.spendUniv || 0, admin: m.spendAdmin || 0, ecology: m.spendGreen || 0 };
  for (const x of D.SPEND_DISC) exp[x.id] = ((pol.spend[x.id] || 0) + (addon[x.id] || 0)) * GDP;
  // Субсидии на тарифы: если тарифы ЖКХ отстают от затрат — нужна дотация, иначе сети изнашиваются.
  const costIdx = e.P / c0.P, tariffIdx = e.Pc.util / c0.P;
  const gap = Math.max(0, 1 - tariffIdx / costIdx);
  const needSub = gap * 0.06 * Cnom + c0.spend.tariffsub * GDP * 0.5;
  f.utilFund = needSub > 0 ? D.clamp(exp.tariffsub / needSub, 0, 1.5) : 1;
  // Субсидии на топливо гасят рост цен на бензин.
  f.fuelShield = D.clamp((pol.spend.fuelsub || 0) / (0.004 + 0.02 * Math.max(0.4, w.oil / 80)), 0, 0.9);
  // Проценты по долгу.
  const interest = g.debtD * g.rDeff + g.debtF * g.rFeff * e.er + g.regDebt * (g.rDeff + 0.01);
  exp.interest = interest;
  // ---------- регионы ----------
  let needReg = 0, fedPart = 0;
  for (const x of D.SPEND) {
    const v = exp[x.id] || 0;
    needReg += v * (x.lvl.r + x.lvl.l);
    fedPart += v * x.lvl.f;
  }
  const transfers = pol.regional.transfer * lvl.f;
  const regBorrow = g.marketAccess ? 0.003 * GDP : 0;
  const regRev = lvl.r + lvl.l;
  const regAvail = regRev + transfers;
  f.regFund = D.clamp((regAvail + regBorrow) / Math.max(1, needReg), 0.3, 1);
  const regSpend = Math.min(needReg, regAvail + regBorrow);
  const regSurplus = Math.max(0, regAvail - needReg);
  const regDeficit = Math.max(0, regSpend - regAvail);
  if (!initMode) g.regDebt = Math.max(0, g.regDebt + (regDeficit - regSurplus * 0.5) / 12);
  f.transfers = transfers; f.needReg = needReg; f.regRev = regRev;
  // Учитываем недофинансирование региональных статей.
  const effective = {};
  for (const x of D.SPEND) {
    const v = exp[x.id] || 0;
    effective[x.id] = v * (x.lvl.f + (x.lvl.r + x.lvl.l) * Math.min(1, f.regFund));
  }
  effective.interest = interest;
  // Национальные проекты (финансирует центр).
  exp.projects = f.projects || 0; effective.projects = exp.projects;
  f.exp = exp; f.eff = effective;
  // Итоги.
  const totalExp = Object.values(effective).reduce((a, b) => a + b, 0);
  const totalRev = taxTotal + f.nontax - toFund;
  f.totalExp = totalExp; f.totalRev = totalRev;
  f.deficit = totalExp - totalRev;
  f.primary = f.deficit - interest;
  f.fedDeficit = fedPart + transfers + interest + (effective.projects || 0) - lvl.f;
  // Госзакупки для спроса: всё, кроме трансфертов населению и процентов.
  let purch = 0;
  for (const x of D.SPEND_DISC) if (!x.transfer) purch += effective[x.id];
  purch += effective.projects || 0;
  purch += (effective.pensions + effective.unemp + effective.child + effective.assist) * 0.03;
  f.purchNom = purch;
  // Бюджетники: зарплаты в статьях / зарплата бюджетника.
  let wageFund = 0;
  for (const x of D.SPEND) wageFund += (effective[x.id] || 0) * (x.labor || 0);
  f.pubEmp = wageFund / Math.max(1, e.Wpub * 12 * 1.25);
  f.milEmp = ((effective.defense || 0) * 0.35 + (effective.police || 0) * 0.7) / Math.max(1, e.Wpub * 12 * 1.25);
  // Эффективность госрасходов: коррупция, перекос зарплат бюджетников.
  f.effSpend = D.clamp((1 - 0.5 * s.inst.corr / 100) * (1 - 0.6 * Math.pow(pol.publicWage - 1, 2)), 0.3, 1);

  // ---------- располагаемые доходы по децилям ----------
  const disp = [], mkt = [], taxes = [], trans = [];
  let YD = 0;
  const cap = capIncome * (1 - tx.capinc) + interest * 0.35;
  const propShare = [0.03, 0.045, 0.06, 0.07, 0.08, 0.09, 0.105, 0.12, 0.15, 0.25];
  for (let d = 0; d < 10; d++) {
    const lab = labor[d];
    const mk = lab + mixed * MIX_DIST[d] + cap * CAP_DIST[d];
    const tx_ = lab * formal * (rate.pit[d] * comp(s, 'pit', tx.pit) + tx.ssc_ee * comp(s, 'ssc_ee', tx.ssc_ee)) + propInd * propShare[d];
    const tr = pensions * PENS_DIST[d] + unemp * UNEMP_DIST[d] + child * CHILD_DIST[d] + assist * ASSIST_DIST[d] + ubi * 0.1 + (effective.social_other || 0) * (PENS_DIST[d] + UNEMP_DIST[d]) / 2;
    const dd = Math.max(mk * 0.2, mk - tx_ + tr);
    mkt.push(mk); taxes.push(tx_); trans.push(tr); disp.push(dd);
    YD += dd;
  }
  f.YDnom = YD * (1 - 0.35 * e.shortage * 0);
  dist.mkt = mkt; dist.disp = disp; dist.taxes = taxes; dist.trans = trans; dist.pitRates = rate.pit; dist.wageRel = avgRel;
  dist.gini = D.giniFromDeciles(disp);
  dist.giniMkt = D.giniFromDeciles(mkt);
  const perCap = s.popTotal / 10;
  dist.dispPC = disp.map(x => x / perCap / 12);
  const meanPC = YD / s.popTotal / 12;
  const sg = D.sigmaFromGini(dist.gini);
  dist.median = meanPC * Math.exp(-sg * sg / 2);
  dist.meanPC = meanPC;
  dist.poverty = D.normCdf(Math.log(0.5) / sg);
  s.ind.povLine = c0.povLine * e.P / c0.P;
  dist.povertyAbs = D.clamp(D.normCdf(Math.log(s.ind.povLine / Math.max(1, dist.median)) / sg), 0, 0.98);
  let mpcNum = 0;
  for (let d = 0; d < 10; d++) mpcNum += MPC[d] * disp[d];
  dist.mpc = mpcNum / YD;
  dist.vatBurden = disp.map((x, d) => MPC[d] * vatEff / (1 + vatEff) * vatComp);

  // ---------- финансирование дефицита и долг ----------
  if (!initMode) finance(s);
  else rating(s);
};

function finance(s) {
  const e = s.e, pol = s.pol, g = s.gov, f = s.fis, x = s.ext, diff = D.DIFF[s.cfg.difficulty];
  const GDP = s.ind.gdpNom;
  // Ставки обслуживания долга постепенно переходят к рыночным (долг рефинансируется).
  g.rDeff = D.approach(g.rDeff, e.ig, 1 / 48);
  g.rFeff = D.approach(g.rFeff, e.rF, 1 / 60);
  // Фонд национального благосостояния.
  if (f.toFund > 0) g.fund += f.toFund / 12 / e.er;
  g.fund *= 1 + 0.04 / 12;
  let need = f.deficit / 12;
  f.monetized = 0;
  f.fromFund = 0; f.borrowD = 0; f.borrowF = 0; f.arrears = 0;
  if (need <= 0) {
    // Профицит: гасим долг (сначала внутренний).
    const repay = -need;
    const d1 = Math.min(g.debtD, repay);
    g.debtD -= d1;
    const rest = repay - d1;
    const d2 = Math.min(g.debtF * e.er, rest);
    g.debtF -= d2 / e.er;
    if (rest - d2 > 0) g.fund += (rest - d2) / e.er;
  } else {
    if (pol.fin.useFund && g.fund > 0) {
      const take = Math.min(need, g.fund * e.er * 0.5);
      g.fund -= take / e.er; need -= take; f.fromFund = take;
    }
    const canPrint = !pol.cb.independent && pol.cb.regime !== 'union';
    const mon = canPrint ? need * pol.fin.monetize : 0;
    need -= mon; f.monetized = mon / GDP;
    if (g.marketAccess) {
      const fShare = pol.fin.foreign;
      const bf = need * fShare;
      g.debtF += bf / e.er; x.res += bf / e.er * 0.5;
      f.borrowF = bf;
      g.debtD += need - bf; f.borrowD = need - bf;
    } else {
      // Рынки закрыты: занять можно немного у своих банков, остальное — печать денег или долги.
      const cap = 0.0015 * GDP;
      const dom = Math.min(need, cap);
      g.debtD += dom; f.borrowD = dom;
      let rest = need - dom;
      if (canPrint) { f.monetized += rest / GDP; rest = 0; }
      f.arrears = rest;
      g.arrearsMonths = rest > 0 ? (g.arrearsMonths || 0) + 1 : 0;
    }
  }
  rating(s);
}

// Кредитный рейтинг и премия за риск.
function rating(s) {
  const e = s.e, g = s.gov, f = s.fis, x = s.ext, diff = D.DIFF[s.cfg.difficulty];
  const GDP = s.ind.gdpNom;
  const debtAll = g.debtD + g.debtF * e.er + g.regDebt;
  g.debtGdp = debtAll / GDP;
  g.debtAll = debtAll;
  const def = f.deficit / GDP;
  const growthTrend = D.clamp(e.gA + 0.01, -0.05, 0.08);
  let score = 72
    - 25 * Math.max(0, g.debtGdp - 0.4)
    - 2.5 * Math.max(0, def * 100 - 3)
    - D.clamp(45 * Math.max(0, e.pi12 - 0.06), 0, 30)
    + 8 * D.clamp(x.resMonths / 6 - 1, -1, 1)
    + 0.25 * (s.inst.rol - 50)
    + 150 * D.clamp(growthTrend - 0.02, -0.04, 0.04)
    - 12 * (g.defaults || 0) - (g.defaultUntil > s.t ? 40 : 0)
    - 18 * D.clamp(s.polit.instability || 0, 0, 1)
    - 22 * x.finBlock
    + (s.ind.gdppcPPP > 30000 ? 10 : s.ind.gdppcPPP > 15000 ? 4 : 0)
    + (s.cfg.cur.reserve ? 25 : 0)
    + Math.min(15, g.fund * e.er / GDP * 25)
    - 6 * (g.debtF * e.er / Math.max(1, debtAll)) * (g.debtGdp > 0.4 ? 1 : 0.3)
    + (s.ind.gdppcPPP > 30000 ? 14 * (1 - g.debtF * e.er / Math.max(1, debtAll)) * D.clamp(g.debtGdp - 0.4, 0, 1.5) : 0)
    - 5 * (f.interest ? 0 : 0) - 30 * D.clamp(f.exp.interest / Math.max(1, f.totalRev) - 0.15, 0, 1)
    + g.scoreOff + (g.imfBoost || 0);
  g.imfBoost = (g.imfBoost || 0) * 0.96;
  score = isFinite(score) ? D.clamp(score, 0, 100) : 30;
  g.score = D.approach(g.score, score, 0.1);
  const RATINGS = [[85, 'AAA'], [78, 'AA'], [70, 'A'], [60, 'BBB'], [50, 'BB'], [40, 'B'], [28, 'CCC'], [15, 'CC'], [0, 'C']];
  g.rating = g.defaultUntil > s.t ? 'D' : RATINGS.find(r => g.score >= r[0])[1];
  g.spread = D.clamp(0.002 * Math.exp((85 - g.score) * 0.05) * diff.market, 0.001, 0.35) + (g.defaultUntil > s.t ? 0.15 : 0);
  g.marketAccess = g.score > 22 && !(g.defaultUntil > s.t);
}
D.stepFiscalRatingOnly = rating;
})();
