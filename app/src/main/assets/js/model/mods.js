'use strict';
// Модификаторы: складываем влияние формы правления, экономической системы, законов
// и действующих последствий событий в один объект s.mods. Модель читает его каждый месяц.
//
// Ключи: corr, rol, press, assembly, freedom, trust, competition, biz, crime, pollution — баллы индексов;
// shadow — доля теневой экономики; tfpG — прибавка к росту производительности в год;
// invest, fdi, credit, housingSupply, emig, immig, importMult, protest — относительные множители;
// unat — к естественной безработице; lfpr — к участию в рабочей силе; wagePush — к росту зарплат в год;
// priceCtrl — доля цен под контролем; tfr — к рождаемости; le — к продолжительности жизни;
// relDem/relAut — к отношениям с демократиями/автократиями; cred — к доверию к ЦБ;
// capCtrl — сила контроля капитала; repress — репрессивность; groups — к настроению групп.
(function () {
const D = globalThis.D;

function add(m, src) {
  if (!src) return;
  for (const k in src) {
    if (k === 'groups') {
      for (const g in src.groups) m.groups[g] = (m.groups[g] || 0) + src.groups[g];
    } else m[k] = (m[k] || 0) + src[k];
  }
}
D.addMods = add;

D.computeMods = function (s) {
  const m = { groups: {} };
  add(m, D.REGIME[s.pol.regime].mods);
  add(m, D.SYSTEM[s.pol.system].mods);
  for (const l of D.LAWS) {
    const o = l.opts[s.pol.laws[l.id]];
    if (o) add(m, o.mods);
  }
  for (const ef of s.effects) add(m, ef.mods);
  // Плановая экономика задаёт контроль цен сама по себе (берём максимум, а не сумму).
  const sys = D.SYSTEM[s.pol.system];
  const lawPC = D.LAW.priceControl.opts[s.pol.laws.priceControl].mods.priceCtrl || 0;
  m.priceCtrl = D.clamp(Math.max(lawPC, sys.plan >= 1 ? 0.9 : sys.plan * 0.3) + (m.priceCtrlExtra || 0), 0, 0.97);
  m.plan = sys.plan;
  m.minWage = D.LAW.minWage.opts[s.pol.laws.minWage].v || 0;
  m.hoursWeek = D.LAW.workWeek.opts[s.pol.laws.workWeek].v || 40;
  s.mods = m;
  return m;
};
D.mod = (s, k) => s.mods[k] || 0;
})();
