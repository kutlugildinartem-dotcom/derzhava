'use strict';
// Вкладки: Общество, Регионы, Власть, Мир, Ещё.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
const pct = (v, d = 1) => D.pct(v, d);
const subTabs = (tab, list) => U.tabs(list, U.sub[tab] || list[0].id, id => { U.sub[tab] = id; U.refresh(true); });
const cur = (tab, list) => U.sub[tab] || list[0].id;
const kv = (k, v, cls) => h('div.row.between', { style: 'padding:3px 0' }, h('span.dim.small', k), h('b.small' + (cls ? '.' + cls : ''), v));

// ---------- ОБЩЕСТВО ----------
const SOC_SUBS = [{ id: 'pop', name: 'Население', icon: '👥' }, { id: 'welfare', name: 'Благосостояние', icon: '💚' }, { id: 'groups', name: 'Группы', icon: '🧩' }, { id: 'life', name: 'Качество жизни', icon: '🏥' }];
U.TABS.society = function (s) {
  const sub = cur('society', SOC_SUBS);
  const box = h('div', subTabs('society', SOC_SUBS));
  const p = s.pop;
  if (sub === 'pop') {
    box.appendChild(h('div.card', h('h3', '👥 Население: ' + D.people(s.popTotal), h('span.sp'), U.info('demo.about')),
      U.pyramid(p.cohorts, s.pol.pension.age),
      kv('Дети (0–17)', D.people(p.children) + ' · ' + pct(p.children / s.popTotal, 0)), kv('Трудоспособные', D.people(p.work)), kv('Пенсионеры (с ' + s.pol.pension.age + ' лет)', D.people(p.elderly) + ' · ' + pct(p.elderly / s.popTotal, 0)),
      kv('Медианный возраст', D.fmt(p.median, 1) + ' лет'), kv('Нагрузка на работающих', D.fmt(p.dependency, 2) + ' иждивенца на 1 трудоспособного')));
    box.appendChild(h('div.card', h('h3', '👶 Рождаемость и смертность', h('span.sp'), U.info('ind.tfr')),
      kv('Детей на женщину', D.fmt(p.tfr, 2), p.tfr < 1.8 ? 'warn' : 'good'), kv('Ожидаемая продолжительность жизни', D.fmt(p.le, 1) + ' лет'),
      kv('Рождений в год', D.people(p.births * 12)), kv('Смертей в год', D.people(p.deaths * 12)), kv('Естественный прирост', D.signed((p.births - p.deaths) * 12 / 1000, 0) + ' тыс./год', p.births > p.deaths ? 'good' : 'bad'),
      U.histChart(s, ['births', 'deaths'], { labels: ['Рождения', 'Смерти'] }), U.histChart(s, ['tfr'], { band: { lo: 2.05, hi: 2.3 } })));
    box.appendChild(h('div.card', h('h3', '🧳 Миграция', h('span.sp'), U.info('demo.migration')),
      kv('Уезжает в год', D.people(p.emig * 12), s.soc.emigRate * 12 > 0.004 ? 'bad' : ''), kv('Приезжает в год', D.people(p.immig * 12)), kv('Сальдо', D.signed((p.immig - p.emig) * 12 / 1000, 0) + ' тыс./год'),
      kv('Иммиграционная политика', D.LAW.immigration.opts[s.pol.laws.immigration].label),
      U.histChart(s, ['emig', 'immig'], { labels: ['Эмиграция', 'Иммиграция'] }),
      h('p.small.dim', 'Уезжают в основном молодые и образованные — туда, где выше доходы, свободнее и спокойнее. Утечка мозгов замедляет рост производительности.')));
  } else if (sub === 'welfare') {
    const d = s.dist;
    box.appendChild(h('div.card', h('h3', '💚 Благосостояние'),
      kv('Счастье (0–10)', D.fmt(s.ind.happy, 1)), kv('Индекс человеческого развития', D.fmt(s.ind.hdi, 3)), kv('Медианный доход', D.money(s, d.median) + ' / мес'),
      kv('Прожиточный минимум', D.money(s, s.ind.povLine) + ' / мес'), kv('Бедность (ниже минимума)', pct(d.povertyAbs), d.povertyAbs > 0.1 ? 'bad' : ''),
      kv('Относительная бедность (<50% медианы)', pct(d.poverty)), kv('Неравенство (Джини)', D.fmt(d.gini, 2), d.gini > 0.38 ? 'warn' : ''), kv('Реальные доходы (г/г)', D.spct(D.yoy(s, 'realInc'))),
      h('div.row.mt', U.info('ind.happy'), U.info('ind.hdi'), U.info('ind.poverty'), U.info('ind.gini'))));
    box.appendChild(h('div.card', U.histChart(s, ['happy'], {}), U.histChart(s, ['poverty', 'gini'], { labels: ['Бедность', 'Джини'] })));
  } else if (sub === 'groups') {
    const c = h('div.card', h('h3', '🧩 Социальные группы', h('span.sp'), U.info('politics.groups')));
    c.appendChild(h('p.small.dim', 'Нажмите на группу, чтобы узнать, почему она довольна или недовольна.'));
    for (const g of D.GROUPS) {
      const G = s.groups[g.id];
      c.appendChild(h('button.mood-row', { style: 'width:100%;text-align:left', onclick: () => U.openGroup(g.id) },
        h('span.ic', g.icon), h('div.grow', h('div.row.between', h('b.small', g.name), h('span.small.dim', pct(G.size, 1) + ' взрослых')), U.bar(G.mood / 100, U.moodColor(G.mood))),
        h('b.num', { style: { color: U.moodColor(G.mood), width: '30px', textAlign: 'right' } }, D.fmt(G.mood, 0))));
    }
    box.appendChild(c);
  } else if (sub === 'life') {
    const ip = s.ind.infraParts || {};
    box.appendChild(h('div.card', h('h3', '🏥 Здоровье и образование'),
      kv('Качество медицины', D.fmt(s.e.qHealth, 0) + ' / 100'), kv('Качество образования', D.fmt(s.e.qEdu, 0) + ' / 100'), kv('Средние годы обучения', D.fmt(s.e.S, 1)),
      U.histChart(s, ['qHealth', 'qEdu'], { labels: ['Медицина', 'Образование'] }), h('div.row', U.info('spend.health'), U.info('spend.school'))));
    box.appendChild(h('div.card', h('h3', '🛣️ Инфраструктура: ' + D.fmt(s.ind.infra, 0) + ' / 100', h('span.sp'), U.info('ind.infra')),
      ...[['road', '🛣️ Дороги и транспорт'], ['util', '💡 ЖКХ и сети'], ['health', '🏥 Больницы'], ['school', '🏫 Школы'], ['net', '📶 Связь и интернет']].map(([k, n]) => h('div', { style: 'padding:4px 0' }, h('div.row.between.small', h('span', n), h('b', D.fmt(ip[k] || 0, 0))), U.bar((ip[k] || 0) / 100, U.moodColor(ip[k] || 0)))),
      s.fis.utilFund < 0.8 ? h('div.note.warn.mt', '⚠️ Тарифы ЖКХ ниже затрат, а дотаций не хватает — сети изнашиваются.') : null));
    box.appendChild(h('div.card', h('h3', '🚨 Безопасность и экология'), kv('Преступность', D.fmt(s.inst.crime, 0) + ' / 100'), kv('Загрязнение', D.fmt(s.inst.pollution, 0) + ' / 100'),
      U.histChart(s, ['crime', 'pollution'], { labels: ['Преступность', 'Загрязнение'] }), h('div.row', U.info('ind.crime'), U.info('ind.pollution'))));
  }
  return box;
};

U.openGroup = function (id) {
  const s = U.s, g = D.GROUP[id], G = s.groups[id];
  const body = h('div',
    h('div.row.between', h('span', 'Настроение'), h('b', { style: { color: U.moodColor(G.mood) } }, D.fmt(G.mood, 0) + ' / 100')), U.bar(G.mood / 100, U.moodColor(G.mood)),
    h('p.small.dim.mt', `Доля среди взрослых: ${pct(G.size)}. Настроение движется к «цели» ${D.fmt(G.target, 0)} постепенно.`),
    h('div.card.mt', h('h3', 'Что влияет'), ...(G.why.length ? G.why.map(w => h('div.row.between.small', { style: 'padding:3px 0' }, h('span', w.label), h('b.' + (w.v > 0 ? 'good' : 'bad'), (w.v > 0 ? '+' : '') + D.fmt(w.v, 1)))) : [h('p.small.dim', 'Ничего особенного')])),
    U.histChart(s, ['g_' + id], {}),
    U.kbBody('group.' + id, U.settings.level));
  U.modal({ title: g.name, icon: g.icon, body });
};

// ---------- РЕГИОНЫ ----------
U.TABS.regions = function (s) {
  const box = h('div');
  const metric = U.sub.regionsMetric || 'grppc';
  box.appendChild(h('div.seg', { style: 'margin-bottom:8px' }, U.MAP_METRICS.map(m => h('button' + (m.id === metric ? '.on' : ''), { onclick: () => { U.sub.regionsMetric = m.id; U.refresh(); } }, m.name))));
  box.appendChild(U.mapView(s, metric, r => U.openRegion(r.id)));
  box.appendChild(h('div.card.mt', h('h3', '⚖️ Разрыв между регионами', h('span.sp'), U.info('reg.gap')),
    kv('ВРП на душу: самый богатый / самый бедный', '×' + D.fmt(s.ind.regGap, 1), s.ind.regGap > 4 ? 'bad' : ''),
    kv('Трансферты регионам', D.money(s, s.fis.transfers) + '/год'), kv('Выравнивание', pct(s.pol.regional.equal, 0)),
    h('button.btn.small.mt', { onclick: () => U.go('budget', 'debt') }, '⚙️ Межбюджетные отношения')));
  const list = h('div.card', h('h3', '🗺️ Регионы'));
  const sorted = s.regions.slice().sort((a, b) => b.grppc - a.grppc);
  for (const r of sorted) list.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => U.openRegion(r.id) },
    h('span.ic', D.RSPEC[r.spec].icon), h('div.grow', h('b', (r.cap ? '★ ' : '') + r.name), h('div.small.dim', `${D.people(r.pop)} · ВРП/чел ${D.usd(r.grppc, 0)} · безраб. ${pct(r.u)}`)),
    h('b', { style: { color: U.moodColor(r.mood) } }, D.fmt(r.mood, 0))));
  box.appendChild(list);
  const act = (s.projects || []).filter(p => !p.done);
  if (act.length) box.appendChild(h('div.card', h('h3', '🏗️ Идут стройки'), ...act.map(p => h('div.small', { style: 'padding:3px 0' }, `${D.PROJ[p.id].icon} ${D.PROJ[p.id].name} — ${s.regions.find(r => r.id === p.r).name}, готово через ${D.months(p.end - s.t)}`))));
  return box;
};

U.openRegion = function (rid) {
  const s = U.s, r = s.regions.find(x => x.id === rid), sp = D.RSPEC[r.spec];
  const body = h('div');
  const render = () => {
    U.clear(body);
    body.appendChild(h('div.card', h('h3', `${sp.icon} ${sp.name} регион`, h('span.sp'), U.info('reg.spec.' + r.spec)),
      kv('Население', D.people(r.pop)), kv('ВРП', D.money(s, r.grp) + ' · ' + pct(r.grpShare, 1) + ' страны'), kv('ВРП на душу', D.usd(r.grppc, 0)),
      kv('Зарплаты к средним', '×' + D.fmt(r.wageRel, 2)), kv('Безработица', pct(r.u)), kv('Цены на жильё к средним', '×' + D.fmt(r.hpiRel, 2)),
      kv('Миграция', D.signed(r.netMig * 12 / 1000, 1) + ' тыс./год', r.netMig >= 0 ? 'good' : 'bad'), kv('Преступность', D.fmt(r.crime, 0)), kv('Загрязнение', D.fmt(r.pollution, 0)),
      kv('Настроение', D.fmt(r.mood, 0))));
    body.appendChild(h('div.card', h('h3', '💰 Бюджет региона', h('span.sp'), U.info('reg.budget')),
      kv('Свои налоги', D.money(s, r.ownRev) + '/год'), kv('Трансферты из центра', D.money(s, r.trans) + '/год'), kv('Нужно на школы, больницы, ЖКХ…', D.money(s, r.need) + '/год'),
      kv('Обеспеченность', pct(r.fund, 0), r.fund < 0.9 ? 'bad' : 'good'), r.fund < 0.9 ? h('p.small.bad', 'Региону не хватает денег — качество услуг снижается, люди уезжают.') : null));
    const inf = h('div.card', h('h3', '🛣️ Инфраструктура'));
    for (const [k, n] of [['road', '🛣️ Дороги'], ['util', '💡 ЖКХ'], ['health', '🏥 Больницы'], ['school', '🏫 Школы'], ['net', '📶 Интернет']])
      inf.appendChild(h('div', { style: 'padding:3px 0' }, h('div.row.between.small', h('span', n), h('b', D.fmt(r.infra[k], 0))), U.bar(r.infra[k] / 100, U.moodColor(r.infra[k]))));
    body.appendChild(inf);
    const pr = h('div.card', h('h3', '🏗️ Национальные проекты', h('span.sp'), U.info('reg.projects')));
    const running = (s.projects || []).filter(p => p.r === r.id);
    for (const p of running) pr.appendChild(h('div.small', { style: 'padding:3px 0' }, `${D.PROJ[p.id].icon} ${D.PROJ[p.id].name}: ${p.done ? '✅ построено' : 'готово через ' + D.months(p.end - s.t)}`));
    for (const p of D.PROJECTS) {
      if (p.coast && !(s.cfg.geo.coast && (r.spec === 'port' || r.spec === 'tourist' || r.cap))) continue;
      const cost = p.cost * s.ind.gdpNom;
      pr.appendChild(h('div.list-item', h('span.ic', p.icon), h('div.grow', h('b.small', p.name), h('div.tiny.dim', p.desc), h('div.tiny.gold', `${D.money(s, cost)} (${pct(p.cost, 2)} ВВП) · ${D.months(p.months)}`)),
        h('button.btn.small', { onclick: async () => { if (await U.confirm({ title: p.name, icon: p.icon, text: `Построить в регионе «${r.name}»? Стоимость ${D.money(s, cost)} будет расходоваться из федерального бюджета ${D.months(p.months)}.`, ok: 'Строить' })) { D.startProject(s, r.id, p.id); U.toast('Стройка началась'); render(); U.refresh(); } } }, 'Строить')));
    }
    body.appendChild(pr);
  };
  render();
  U.modal({ title: (r.cap ? '★ ' : '') + r.name, icon: sp.icon, body });
};

// ---------- ВЛАСТЬ ----------
const POW_SUBS = [{ id: 'laws', name: 'Законы', icon: '⚖️' }, { id: 'elections', name: 'Выборы и партии', icon: '🗳️' }, { id: 'regime', name: 'Строй', icon: '🏛️' }, { id: 'inst', name: 'Институты', icon: '🧱' }];
U.TABS.power = function (s) {
  const sub = cur('power', POW_SUBS);
  const box = h('div', subTabs('power', POW_SUBS));
  if (sub === 'laws') box.appendChild(U.lawPanel(U.polModel(s), s));
  else if (sub === 'elections') {
    const reg = D.REGIME[s.pol.regime], P = s.polit;
    if (reg.elections === 'none') box.appendChild(h('div.note', `При форме правления «${reg.name}» выборов нет. Устойчивость власти зависит от поддержки элит (крупный бизнес, силовики) и отсутствия массовых протестов.`));
    else {
      const left = P.nextElection - s.t;
      box.appendChild(h('div.card', h('h3', '🗳️ Следующие выборы: ' + D.dateStr(s, P.nextElection), h('span.sp'), U.info('politics.elections')), h('p.small.dim', `Через ${D.months(Math.max(0, left))}. ${reg.elections === 'parl' ? 'Нужно большинство мест в парламенте (можно с коалицией).' : reg.elections === 'managed' ? 'Выборы «управляемые»: у власти фора около 7 п.п. за счёт админресурса.' : 'Нужно больше 50% голосов, иначе второй тур.'}`),
        ...P.parties.map(pt => h('div', { style: 'padding:4px 0' }, h('div.row.between.small', h('span', h('span', { style: { color: pt.color } }, '● '), pt.name + (pt.ruling ? ' (ваша)' : '')), h('b', pct(pt.poll, 0))), U.bar(pt.poll, pt.color))),
        P.seats ? h('p.small.dim.mt', 'Места в парламенте сейчас: ' + P.parties.map((pt, i) => `${pt.name.split(' ')[0]} ${pct(P.seats[i] || 0, 0)}`).join(', ')) : null));
      // Фальсификации.
      const fr = h('div.card', h('h3', '🕶️ «Особые меры» перед выборами', h('span.sp'), U.info('politics.fraud')));
      fr.appendChild(h('div.note.bad', '⚠️ Прежде чем выбирать: каждая мера подрывает доверие, а если её раскроют — протесты, санкции, бегство молодёжи. В свободной прессе и при свободе собраний шанс разоблачения выше.'));
      P.fraud = P.fraud || {};
      for (const x of D.FRAUD) {
        const on = !!P.fraud[x.id];
        fr.appendChild(h('div.prm', h('div.prm-head', h('div.prm-name', h('b', x.name), h('div.prm-sub', x.what), h('div.tiny.gold', `+${Math.round(x.pp * 100)} п.п. · риск разоблачения ~${pct(x.detect * (0.3 + s.inst.press / 100) * (0.5 + s.inst.assembly / 150), 0)}`)),
          U.toggle(on, async v => {
            if (v) {
              const ok = await U.confirm({ title: x.name, icon: '⚠️', danger: true, ok: 'Всё равно сделать', node: h('div', h('p', x.what), h('p.bad', `Если раскроют: доверие −${x.trust}, отношения с демократиями −${x.dem}, массовые протесты, эмиграция молодёжи.`), U.kbBody('politics.fraud', Math.min(3, U.settings.level))) });
              if (!ok) { U.refresh(); return; }
              if (x.cost) { s.gov.debtD += x.cost * s.ind.gdpNom; if (x.id === 'handouts') { for (const g of ['pensioners', 'public', 'families']) s.groups[g].shock += 5; D.pipeAdd(s, 'goods', 0.004, 3); } }
            }
            P.fraud[x.id] = v; U.refresh();
          }))));
      }
      box.appendChild(fr);
      if (P.history && P.history.length) box.appendChild(h('div.card', h('h3', '📜 История выборов'), ...P.history.slice(-5).reverse().map(r => h('div.small', { style: 'padding:3px 0' }, `${D.dateStr(s, r.t)}: партия власти ${pct(r.shares[0])} ${r.win ? '✅' : '❌'}${r.detected ? ' · 🚨 фальсификации раскрыты' : ''}`))));
    }
  } else if (sub === 'regime') {
    const reg = D.REGIME[s.pol.regime], sys = D.SYSTEM[s.pol.system];
    box.appendChild(h('div.card', h('h3', reg.icon + ' ' + reg.name, h('span.sp'), U.info('regime.' + reg.id)), U.kbBody('regime.' + reg.id, Math.min(2, U.settings.level))));
    box.appendChild(h('div.card', h('h3', sys.icon + ' ' + sys.name, h('span.sp'), U.info('system.' + sys.id)), U.kbBody('system.' + sys.id, Math.min(2, U.settings.level))));
    const rc = h('div.card', h('h3', '🔄 Изменить форму правления'));
    for (const r of D.REGIMES) if (r.id !== reg.id) rc.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: async () => {
      const info = D.regimeChangeInfo(s, r.id);
      if (!info.ok) { U.toast(info.text[0] || 'Невозможно'); return; }
      if (await U.confirm({ title: r.name, icon: r.icon, danger: !r.dem, ok: 'Провести реформу', node: h('div', ...info.text.map(t => h('p', t)), U.kbBody('regime.' + r.id, 2)) })) { D.changeRegime(s, r.id); U.refresh(); }
    } }, h('span.ic', r.icon), h('b.grow', r.name), U.info('regime.' + r.id)));
    box.appendChild(rc);
    const sc = h('div.card', h('h3', '🔄 Сменить экономическую систему'));
    for (const x of D.SYSTEMS) if (x.id !== sys.id) sc.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: async () => {
      if (await U.confirm({ title: x.name, icon: x.icon, ok: 'Начать переход', node: h('div', ...D.systemChangeInfo(s, x.id).map(t => h('p', t)), U.kbBody('system.' + x.id, 2)) })) { D.changeSystem(s, x.id); U.refresh(); }
    } }, h('span.ic', x.icon), h('b.grow', x.name), U.info('system.' + x.id)));
    box.appendChild(sc);
    const st = h('div.card', h('h3', '🏢 Приватизация и национализация', h('span.sp'), U.info('econ.privatization')));
    st.appendChild(U.slider({ name: 'Целевая доля госсектора', min: 0, max: 0.99, step: 0.01, value: s.pol.stateShare, fmt: v => pct(v, 0), sub: `Сейчас ${pct(s.inst.stateShare, 0)}. Движется к цели за 2–3 года.`,
      onChange: v => { D.setStateShare(s, v); U.refresh(); } }));
    box.appendChild(st);
  } else if (sub === 'inst') {
    const I = s.inst;
    const rows = [['Коррупция', I.corr, 'ind.corruption', true], ['Верховенство права', I.rol, 'ind.rol'], ['Свободы', I.freedom, 'ind.freedom'], ['Свобода прессы', I.press, 'law.press'],
      ['Свобода собраний', I.assembly, 'law.assembly'], ['Доверие к власти', I.trust, 'ind.trust'], ['Конкуренция', I.competition, 'law.antimonopoly'], ['Лёгкость ведения бизнеса', I.biz, 'law.regulation'],
      ['Налоговая служба (собираемость)', I.taxAdmin * 100, 'fis.taxadmin'], ['Теневая экономика, %', I.shadow * 100, 'ind.shadow', true], ['Госсектор, %', I.stateShare * 100, 'ind.stateshare']];
    const c = h('div.card', h('h3', '🧱 Институты'));
    for (const [n, v, kb, bad] of rows) c.appendChild(h('div', { style: 'padding:4px 0' }, h('div.row.between.small', h('span', n), h('span.row', h('b', D.fmt(v, 0)), U.info(kb))), U.bar(v / 100, bad ? U.moodColor(100 - v) : U.moodColor(v))));
    box.appendChild(c);
    box.appendChild(h('div.card', U.histChart(s, ['corr', 'rol', 'freedom'], { labels: ['Коррупция', 'Право', 'Свободы'] })));
    box.appendChild(h('div.card', h('h3', '🚨 Протесты и стабильность', h('span.sp'), U.info('politics.protest')), kv('Протесты', pct(s.polit.protest, 0), s.polit.protest > 0.3 ? 'bad' : ''), kv('Забастовки', pct(s.polit.strike, 0)),
      kv('Скрытое напряжение', pct(s.polit.tension, 0), s.polit.tension > 0.4 ? 'bad' : ''), kv('Нестабильность', pct(s.polit.instability, 0)), kv('Настроение элит', D.fmt(s.polit.eliteMood, 0))));
  }
  return box;
};

// ---------- МИР ----------
U.TABS.world = function (s) {
  const box = h('div');
  const w = s.w, x = s.ext;
  box.appendChild(h('div.card', h('h3', '🌍 Мировая экономика', h('span.sp'), U.info('world.economy')),
    kv('Мировой рост', pct(w.g)), kv('Мировая инфляция', pct(w.pi)), kv('Мировая ставка', pct(w.i)), w.crisis > 0 ? h('div.note.bad', '🌪️ Мировой кризис') : null,
    kv('🛢️ Нефть', D.fmt(w.oil, 0) + ' $/барр.'), kv('🔥 Газ (индекс)', D.fmt(w.gas, 2)), kv('⛏️ Металлы (индекс)', D.fmt(w.metals, 2)), kv('🌾 Зерно (индекс)', D.fmt(w.grain, 2)),
    U.histChart(s, ['oil'], {})));
  if (s.cfg.modules.military) box.appendChild(h('div.card', h('h3', '🛡️ Безопасность: ' + D.fmt(x.security, 0) + ' / 100', h('span.sp'), U.info('world.security')), U.bar(x.security / 100, U.moodColor(x.security)),
    h('p.small.dim.mt', 'Зависит от военных расходов, размера экономики, союзов и враждебности соперника. Низкая безопасность при плохих отношениях с соседом-соперником грозит конфликтом.')));
  box.appendChild(h('div.card', h('h3', '⛔ Санкции против нас', h('span.sp'), U.info('world.sanctions')),
    kv('Потеря экспорта', pct(x.exportBlock, 0), x.exportBlock > 0.05 ? 'bad' : ''), kv('Потеря импорта', pct(x.importBlock, 0)), kv('Финансовая блокада', pct(x.finBlock, 0)), kv('Технологическая блокада', pct(x.techBlock, 0)),
    kv('Доля импорта по соглашениям о свободной торговле', pct(x.ftaShare, 0))));
  const list = h('div.card', h('h3', '🤝 Страны-партнёры'));
  for (const p of x.partners) {
    list.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => U.openPartner(p.id) },
      U.flagCanvas(p.flag, 30, 20),
      h('div.grow', h('b.small', p.name), h('div.tiny.dim', `${D.PARTNER_ARCH.find(a => a.id === p.arch).name} · ${p.reg === 'dem' ? 'демократия' : p.reg === 'aut' ? 'автократия' : 'гибридный режим'}`),
        h('div.tiny', `Экспорт ${pct(p.x, 0)} · импорт ${pct(p.m, 0)}${p.fta ? ' · ЗСТ' : ''}${p.allied ? ' · союз' : ''}${p.sanc ? ' · ⛔ санкции ' + p.sanc : ''}${p.ourSanc ? ' · мы: санкции ' + p.ourSanc : ''}`)),
      h('b', { style: { color: p.rel > 20 ? 'var(--good)' : p.rel < -20 ? 'var(--bad)' : 'var(--warn)' } }, D.signed(p.rel, 0))));
  }
  box.appendChild(list);
  return box;
};

U.openPartner = function (pid) {
  const s = U.s, p = s.ext.partners.find(q => q.id === pid);
  const arch = D.PARTNER_ARCH.find(a => a.id === p.arch);
  const body = h('div',
    h('div.row', U.flagCanvas(p.flag, 60, 40), h('div.grow', h('b', p.name), h('div.small.dim', arch.name))),
    h('div.card.mt', kv('Отношения', D.signed(p.rel, 0) + ' (тренд к ' + D.signed(p.relT || p.rel, 0) + ')'), U.bar((p.rel + 100) / 200, p.rel > 20 ? 'var(--good)' : p.rel < -20 ? 'var(--bad)' : 'var(--warn)'),
      kv('Доля нашего экспорта', pct(p.x, 0)), kv('Доля нашего импорта', pct(p.m, 0)), kv('Их пошлины на наш экспорт', pct(p.tariffUs, 0)), kv('Наши доп. пошлины на их товары', pct(p.tariffThem, 0)),
      kv('Соглашение о свободной торговле', p.fta ? 'да' : 'нет'), kv('Военный союз', p.allied ? 'да' : 'нет'), kv('Их санкции против нас', ['нет', 'точечные', 'секторальные', 'эмбарго'][p.sanc], p.sanc ? 'bad' : ''),
      kv('Наши санкции против них', ['нет', 'точечные', 'секторальные', 'эмбарго'][p.ourSanc])),
    h('div.sec-title', 'Действия'));
  for (const a of D.DIPLO) {
    body.appendChild(h('button.choice', { onclick: async () => {
      if (!await U.confirm({ title: a.name, icon: a.icon, text: a.desc + (a.cost ? ` Стоимость ≈ ${D.money(s, a.cost * s.ind.gdpNom)}.` : ''), ok: 'Выполнить' })) return;
      const rep = D.diplomacy(s, p.id, a.id);
      if (!rep) return;
      if (!rep.ok) { U.toast(rep.text); return; }
      U.stack.slice().forEach(x => x.close());
      U.diploReport(rep);
      U.refresh();
    } }, h('b', a.icon + ' ' + a.name), h('span', a.desc)));
  }
  body.appendChild(h('div.mt', U.info('world.diplomacy'), ' ', h('span.small.dim', 'Методичка: как устроена внешняя политика')));
  U.modal({ title: p.name, icon: p.icon, body });
};
U.diploReport = function (rep) {
  const p = rep.partner, b = rep.before, a = rep.after;
  const body = h('div', h('p', rep.text), rep.effect ? h('div.note.mt', rep.effect) : null,
    h('div.card.mt', h('h3', '📋 Отчёт: до → после'),
      h('table.t', h('tr', h('th', ''), h('th', 'До'), h('th', 'После')),
        h('tr', h('td', 'Доля нашего экспорта'), h('td', pct(b.x, 1)), h('td', pct(a.x, 1))),
        h('tr', h('td', 'Доля нашего импорта'), h('td', pct(b.m, 1)), h('td', pct(a.m, 1))),
        h('tr', h('td', 'Наши пошлины на них'), h('td', pct(b.tariffThem, 0)), h('td', pct(a.tariffThem, 0))),
        h('tr', h('td', 'Их пошлины на нас'), h('td', pct(b.tariffUs, 0)), h('td', pct(a.tariffUs, 0))))),
    h('p.small.dim', 'Отношения меняются постепенно — следите за трендом в карточке страны.'),
    U.kbBody('world.' + (rep.act.id === 'fta' || rep.act.id.startsWith('tariff') ? 'tradewar' : rep.act.id === 'sanction' || rep.act.id === 'unsanction' ? 'sanctions' : 'diplomacy'), Math.min(3, U.settings.level)));
  U.modal({ title: rep.act.name, icon: rep.act.icon, body, foot: [{ label: 'Понятно', cls: 'primary' }] });
};

// ---------- ЕЩЁ ----------
const MORE_SUBS = [{ id: 'menu', name: 'Меню', icon: '☰' }, { id: 'log', name: 'Журнал', icon: '🗞️' }, { id: 'charts', name: 'Графики', icon: '📉' }, { id: 'reports', name: 'Отчёты', icon: '🧾' }];
U.TABS.more = function (s) {
  const sub = cur('more', MORE_SUBS);
  const box = h('div', subTabs('more', MORE_SUBS));
  if (sub === 'menu') {
    const item = (ic, t, d, fn) => h('button.list-item', { style: 'width:100%;text-align:left', onclick: fn }, h('span.ic', ic), h('div.grow', h('b', t), h('div.small.dim', d)), h('span.dim', '›'));
    box.appendChild(h('div.card',
      item('📚', 'Учебник экономики', 'Как рождается страна, карточки проблем, идеологии, словарь', () => U.openLearn('genesis')),
      item('🧑‍💼', 'Советники', 'Шесть экономических школ — шесть мнений', () => U.openAdvisors()),
      item('💾', 'Сохранить партию', 'В один из 5 слотов', () => U.openSlots(true)),
      item('📂', 'Загрузить партию', 'Другие сохранения', () => U.openSlots(false)),
      item('⚙️', 'Настройки', 'Уровень объяснений, вибрация', () => U.openSettings()),
      item('⬇️', U.updateInfo ? 'Обновить до версии ' + U.updateInfo.ver : 'Проверить обновления', 'Версия ' + D.VERSION, () => U.checkUpdate(true)),
      item('🏠', 'Выйти в меню', 'Партия сохранится автоматически', () => { window.dzSave(); U.showHome(); })));
    box.appendChild(h('div.card', h('h3', 'ℹ️ Об игре'), h('p.small.dim', 'Модель основана на макроэкономике: производственная функция Кобба–Дугласа, спрос C+I+G+NX, кривая Филлипса с ожиданиями, закон Оукена, правило Тейлора, паритет процентных ставок, кривая Лаффера, демография по возрастным группам с таблицами смертности Гомпертца. Цифры реальных стран приблизительны.')));
  } else if (sub === 'log') {
    const filt = U.sub.logFilter || 'all';
    const types = [{ v: 'all', label: 'Все' }, { v: 'crisis', label: 'Кризисы' }, { v: 'event', label: 'События' }, { v: 'politics', label: 'Политика' }, { v: 'world', label: 'Мир' }, { v: 'good', label: 'Успехи' }];
    box.appendChild(U.seg({ options: types, value: filt, onChange: v => { U.sub.logFilter = v; U.refresh(); } }));
    const c = h('div.card.mt');
    for (const it of s.log.slice().reverse().filter(x => filt === 'all' || x.type === filt).slice(0, 150)) c.appendChild(h('div.list-item', h('div.grow', h('b.small', it.title), h('div.tiny.dim', D.dateStr(s, it.t)), h('div.small', it.text)), it.kb ? U.info(it.kb) : null));
    box.appendChild(c);
  } else if (sub === 'charts') {
    const sel = U.sub.chartIds || ['growth', 'infl'];
    const cats = { eco: 'Экономика', fis: 'Бюджет', soc: 'Общество', pol: 'Власть', grp: 'Группы' };
    box.appendChild(h('div.card', h('h3', '📉 Сравнить показатели'), h('p.small.dim', 'Выберите до трёх рядов. Пунктир — отменённая ветка (если вы откатывали ход).'), U.histChart(s, sel, { labels: sel.map(id => D.HISTBY[id].name) })));
    for (const [cat, name] of Object.entries(cats)) {
      box.appendChild(h('div.sec-title', name));
      box.appendChild(h('div.seg', D.HIST.filter(x => x.cat === cat).map(x => h('button' + (sel.includes(x.id) ? '.on' : ''), { onclick: () => {
        let a = sel.slice(); if (a.includes(x.id)) a = a.filter(y => y !== x.id); else { a.push(x.id); if (a.length > 3) a.shift(); }
        if (!a.length) a = [x.id];
        U.sub.chartIds = a; U.refresh();
      } }, x.name))));
    }
  } else if (sub === 'reports') {
    const c = h('div.card', h('h3', '🧾 Отчёты по ходам'));
    if (U.lastReport) c.appendChild(h('button.btn.block.mb', { onclick: () => U.showReport(U.lastReport) }, 'Открыть последний отчёт полностью'));
    for (const r of (s.reports || []).slice().reverse()) {
      const g = r.rows.find(x => x.id === 'growth'), i = r.rows.find(x => x.id === 'infl'), a = r.rows.find(x => x.id === 'approval');
      c.appendChild(h('div', { style: 'padding:6px 0;border-bottom:1px solid var(--line)' }, h('b.small', `${D.dateShort(s, r.t0)} → ${D.dateShort(s, r.t1)}`),
        h('div.tiny.dim', `Рост ${pct(g.b)} · инфляция ${pct(i.b)} · рейтинг ${D.fmt(a.b, 0)}${r.events.length ? ' · ' + r.events.map(e => e.title).slice(0, 3).join('; ') : ''}`)));
    }
    box.appendChild(c);
  }
  return box;
};
})();
