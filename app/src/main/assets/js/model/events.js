'use strict';
// События, кризисы, журнал и конец игры.
(function () {
const D = globalThis.D;

D.logEvent = function (s, type, title, text, extra) {
  const it = Object.assign({ t: s.t, type, title, text }, extra || {});
  s.log.push(it);
  if (s.log.length > 400) s.log.shift();
  s.turnLog.push(it);
  return it;
};

D.gameOver = function (s, reason, data) {
  if (s.over) return;
  s.over = { reason, t: s.t, data: data || null };
};

// Временный эффект (модификаторы на N месяцев).
D.addEffect = function (s, id, months, mods, label) {
  s.effects = s.effects.filter(e => e.id !== id);
  s.effects.push({ id, until: s.t + months, mods, label: label || id });
};

const gdp = s => s.ind.gdpNom;
const spendOnce = (s, share) => { s.gov.debtD += share * gdp(s); };
const moodAll = (s, v, ids) => { for (const g of ids || D.GROUPS.map(x => x.id)) s.groups[g].shock = (s.groups[g].shock || 0) + v; };

// Каталог событий. cond — когда возможно, p — вероятность в месяц, choices — варианты ответа.
D.EVENTS = [
  { id: 'oilUp', icon: '🛢️', title: 'Нефть резко подорожала', p: 0.006, kb: 'event.oil',
    cond: s => s.w.oil < 140,
    fire: s => { s.w.oil *= D.range(s, 1.35, 1.6); s.w.gas *= 1.3; },
    text: s => `Из-за конфликта в крупном нефтедобывающем регионе нефть подорожала до ${D.fmt(s.w.oil, 0)} $ за баррель. ${s.c0.resMix.oil + s.c0.resMix.gas > 0.3 && s.c0.resShare > 0.05 ? 'Для нас как для экспортёра это приток валюты и налогов — но и соблазн всё потратить.' : 'Для нас как для импортёра топлива это удар: бензин и всё, что возят грузовиками, подорожает.'}`,
    example: 'Нефтяные шоки 1973 и 1979 гг.: цена выросла в 4 раза, в США и Европе началась стагфляция, а СССР и страны Персидского залива получили огромные доходы.',
    choices: [
      { label: 'Откладывать сверхдоходы в фонд', desc: 'Включить бюджетное правило: всё, что выше «нормальной» цены, — в резерв на чёрный день. Норвегия так накопила фонд больше 1,5 трлн $.', apply: s => { s.pol.laws.fiscalRule = 1; } },
      { label: 'Субсидировать топливо', desc: 'Сдержать цены на бензин за счёт бюджета (+1% ВВП на 12 мес.).', apply: s => { s.pol.spend.fuelsub = (s.pol.spend.fuelsub || 0) + 0.01; D.addEffect(s, 'fuelsubEnd', 12, {}, 'Субсидии на топливо'); s.flags.fuelsubUntil = s.t + 12; } },
      { label: 'Ничего не делать', desc: 'Пусть рынок сам приспособится.', apply: () => {} },
    ] },
  { id: 'oilDown', icon: '📉', title: 'Обвал цен на нефть', p: 0.006, kb: 'event.oil',
    cond: s => s.w.oil > 45,
    fire: s => { s.w.oil *= D.range(s, 0.5, 0.65); s.w.gas *= 0.7; },
    text: s => `На мировом рынке избыток нефти: цена рухнула до ${D.fmt(s.w.oil, 0)} $. ${s.c0.resShare > 0.08 ? 'Для сырьевой экономики это катастрофа: валютная выручка и налоги падают, курс слабеет.' : 'Для нас это скорее хорошо: топливо и перевозки подешевеют.'}`,
    example: 'В 1986 г. нефть подешевела втрое — это подорвало бюджет СССР. В 2014–2015 гг. обвал цен вызвал девальвацию рубля в 2 раза и кризис в Венесуэле.',
    choices: [
      { label: 'Тратить резервный фонд', desc: 'Покрывать выпадающие доходы из фонда, если он есть.', apply: s => { s.pol.fin.useFund = true; } },
      { label: 'Сократить расходы на 1% ВВП', desc: 'Бюджет сбалансирован, но экономика и народ почувствуют.', apply: s => { for (const k of ['roads', 'industry', 'admin', 'culture']) s.pol.spend[k] = Math.max(0, s.pol.spend[k] * 0.8); } },
      { label: 'Занимать', desc: 'Покрыть дефицит долгом.', apply: () => {} },
    ] },
  { id: 'globalRecession', icon: '🌍', title: 'Мировой финансовый кризис', p: 0.0035, kb: 'crisis.global',
    cond: s => s.w.crisis <= 0,
    fire: s => { s.w.crisis = Math.round(D.range(s, 10, 20)); s.w.oil *= 0.7; s.e.confShock = -0.25; s.e.crisisFlight = 0.02; },
    text: () => 'В крупнейших экономиках мира лопнул финансовый пузырь. Банки перестали кредитовать друг друга, мировой спрос падает, инвесторы бегут из развивающихся рынков в доллары и золото. Наш экспорт и курс под ударом.',
    example: 'Кризис 2008–2009 гг.: мировой ВВП упал впервые после Второй мировой. Страны, ответившие стимулами (Китай — 12% ВВП), восстановились быстрее.',
    choices: [
      { label: 'Антикризисный стимул (+2% ВВП на год)', desc: 'Кейнсианский ответ: государство тратит, пока частный сектор боится. Поддержит спрос, но увеличит долг.', apply: s => { for (const k of ['roads', 'utilities', 'housing']) s.pol.spend[k] += 0.0067; s.flags.stimulusUntil = s.t + 12; } },
      { label: 'Затянуть пояса', desc: 'Сократить расходы, чтобы не раздувать долг. Кризис может углубиться (парадокс бережливости).', apply: s => { for (const k of ['roads', 'industry', 'culture', 'admin']) s.pol.spend[k] *= 0.85; } },
      { label: 'Положиться на рынок', desc: 'Экономика сама восстановится, как в США в 1920–1921 гг., но это может занять время.', apply: () => {} },
    ] },
  { id: 'pandemic', icon: '🦠', title: 'Пандемия', p: 0.0012, kb: 'event.pandemic',
    cond: s => !s.flags.pandemic || s.t - s.flags.pandemic > 120,
    fire: s => { s.flags.pandemic = s.t; },
    text: () => 'По миру распространяется опасный вирус. Больницы переполняются, люди боятся выходить из дома. Нужно выбрать, как реагировать.',
    example: 'COVID-19 (2020): мировой ВВП упал на 3%, в развитых странах программы поддержки достигли 10–25% ВВП. Страны со строгим карантином потеряли больше в экономике, но меньше людей.',
    choices: [
      { label: 'Строгий карантин + выплаты', desc: 'Меньше смертей, но ВВП упадёт сильно; выплаты стоят 3% ВВП.', apply: s => { s.pop.excessDeath = 0.05; s.e.supplyShock = 0.1; s.e.confShock = -0.3; spendOnce(s, 0.03); moodAll(s, 2, ['pensioners', 'families']); moodAll(s, -8, ['smallbiz', 'youth']); } },
      { label: 'Мягкие меры', desc: 'Экономика пострадает меньше, но смертность выше.', apply: s => { s.pop.excessDeath = 0.18; s.e.supplyShock = 0.04; s.e.confShock = -0.15; moodAll(s, -6, ['pensioners', 'intel']); } },
      { label: 'Ничего не делать', desc: 'Минимальный удар по экономике сейчас, но много смертей и паника позже.', apply: s => { s.pop.excessDeath = 0.35; s.e.supplyShock = 0.03; s.e.confShock = -0.2; moodAll(s, -10); } },
    ] },
  { id: 'drought', icon: '🌵', title: 'Засуха и неурожай', p: 0.005, kb: 'event.drought',
    cond: s => s.e.sec.agr > 0.02,
    fire: s => { D.addEffect(s, 'drought', 12, { foodShock: 0.12 }, 'Неурожай'); s.e.supplyShock = (s.e.supplyShock || 0) + s.e.sec.agr * 0.3; },
    text: () => 'Жаркое лето без дождей погубило значительную часть урожая. Зерно и продукты дорожают, фермеры несут убытки.',
    example: 'Засуха 2010 г. в России: погибла треть урожая, был введён запрет на экспорт зерна, мировые цены на пшеницу выросли вдвое.',
    choices: [
      { label: 'Закупить продовольствие за рубежом', desc: 'Цены стабилизируются, но уйдут валютные резервы.', apply: s => { s.effects = s.effects.filter(e => e.id !== 'drought'); D.addEffect(s, 'drought', 12, { foodShock: 0.04 }, 'Неурожай (смягчён импортом)'); s.ext.res *= 0.96; } },
      { label: 'Заморозить цены на хлеб', desc: 'Быстро, но приведёт к дефициту и очередям.', apply: s => { D.addEffect(s, 'breadFreeze', 12, { priceCtrlExtra: 0.1, foodShock: -0.06, groups: { farmers: -8, poor: 3 } }, 'Заморозка цен на хлеб'); } },
      { label: 'Помочь фермерам субсидиями', desc: '+0,3% ВВП на сельское хозяйство.', apply: s => { s.pol.spend.agri += 0.003; } },
    ] },
  { id: 'disaster', icon: '🌊', title: 'Стихийное бедствие', p: 0.004, kb: 'event.disaster',
    cond: () => true,
    fire: s => { const r = D.pick(s, s.regions); s.flags.disasterRegion = r.id; for (const k in r.infra) r.infra[k] *= 0.75; s.e.supplyShock = (s.e.supplyShock || 0) + 0.01; r.mortMul = 1.3; s.flags.disasterUntil = s.t + 12; },
    text: s => { const r = s.regions.find(x => x.id === s.flags.disasterRegion); return `${r.name} пострадал от ${D.pick(s, ['наводнения', 'землетрясения', 'урагана', 'лесных пожаров'])}. Разрушены дороги, дома и сети, тысячи людей без крова.`; },
    example: 'Наводнение в Крымске (2012), землетрясение и цунами в Японии (2011) — ущерб 200+ млрд $, восстановление заняло годы.',
    choices: [
      { label: 'Федеральная программа восстановления', desc: 'Стоит 0,5% ВВП, инфраструктура региона быстро вернётся.', apply: s => { spendOnce(s, 0.005); const r = s.regions.find(x => x.id === s.flags.disasterRegion); for (const k in r.boost) r.boost[k] = (r.boost[k] || 0) + 15; moodAll(s, 3); } },
      { label: 'Пусть регион справляется сам', desc: 'Экономия бюджета, но регион будет долго восстанавливаться.', apply: s => { moodAll(s, -4, ['farmers', 'pensioners', 'families']); } },
    ] },
  { id: 'tech', icon: '💡', title: 'Технологический прорыв', p: 0.003, kb: 'event.tech',
    cond: s => s.e.qEdu > 45,
    fire: s => { s.e.A *= 1.01; },
    text: () => 'Наши учёные и стартапы создали технологию, которой заинтересовался весь мир. Производительность растёт, инвесторы присматриваются.',
    example: 'Skype и госуслуги в Эстонии, Samsung в Корее, израильский хайтек — маленькие страны, ставшие технологическими центрами.',
    choices: [
      { label: 'Удвоить гранты на науку на 3 года', desc: '+0,3% ВВП на R&D.', apply: s => { s.pol.spend.science += 0.003; } },
      { label: 'Налоговые каникулы для IT', desc: 'Льготы привлекут компании (+ к росту IT-сектора).', apply: s => { D.addEffect(s, 'itHoliday', 36, { tfpG: 0.002, fdi: 0.1, taxBase: -0.003, groups: { office: 3, youth: 3 } }, 'Льготы IT'); } },
      { label: 'Отметить и продолжать курс', desc: '', apply: () => {} },
    ] },
  { id: 'scandal', icon: '🕵️', title: 'Коррупционный скандал', p: 0.006, kb: 'event.scandal',
    cond: s => s.inst.corr > 25,
    fire: () => {},
    text: s => `Журналисты выяснили, что министр ${D.pick(s, ['строительства', 'обороны', 'здравоохранения', 'транспорта', 'энергетики'])} получил откаты на миллиарды. Общество возмущено.`,
    example: 'Операция «Автомойка» в Бразилии (2014–2021): сотни политиков и бизнесменов осуждены за взятки в Petrobras. Коррупция стоила стране ~2% ВВП.',
    choices: [
      { label: 'Уволить и возбудить дело', desc: 'Коррупция снизится, доверие вырастет, но элиты недовольны.', apply: s => { s.inst.corr -= 3; s.inst.trust += 4; moodAll(s, 4, ['office', 'intel', 'smallbiz']); moodAll(s, -6, ['bigbiz']); } },
      { label: 'Замять', desc: 'Элиты довольны. Но при свободной прессе правда может всплыть.', apply: s => { s.inst.corr += 2; if (D.chance(s, s.inst.press / 120)) { s.inst.trust -= 10; moodAll(s, -8); D.logEvent(s, 'politics', '📰 Попытка замять скандал провалилась', 'Журналисты опубликовали документы о том, что власти покрывали министра. Рейтинг обвалился.'); } } },
    ] },
  { id: 'strike', icon: '✊', title: 'Всеобщая забастовка', p: 0.02, kb: 'event.strike',
    cond: s => s.polit.strike > 0.3,
    fire: () => {},
    text: () => 'Профсоюзы объявили забастовку: встали заводы, транспорт, школы. Требования — повышение зарплат и защита от роста цен.',
    example: 'Забастовки во Франции против пенсионной реформы (1995, 2019, 2023), «Солидарность» в Польше (1980) — забастовка, изменившая страну.',
    choices: [
      { label: 'Поднять зарплаты бюджетникам на 10%', desc: 'Мир с профсоюзами, но расходы и инфляция вырастут.', apply: s => { s.pol.publicWage *= 1.1; moodAll(s, 8, ['public', 'workers']); } },
      { label: 'Переговоры (трёхстороннее соглашение)', desc: 'Компромисс: умеренный рост зарплат по всей экономике.', apply: s => { s.e.wageShock = 0.02; moodAll(s, 4, ['public', 'workers']); } },
      { label: 'Жёстко подавить', desc: 'Только для недемократий. Забастовка закончится, но напряжение останется.', auth: true, apply: s => { s.polit.tension += 0.2; moodAll(s, -10, ['workers', 'public', 'intel']); for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= 8; } },
    ] },
  { id: 'bankRun', icon: '🏃', title: 'Банковская паника', p: 0.05, kb: 'crisis.bank',
    cond: s => s.cfg.modules.banks && s.e.car < 0.065,
    fire: s => { s.e.confShock = -0.2; s.e.crisisFlight = 0.03; },
    text: s => `Крупный банк не может вернуть вклады. Вкладчики выстраиваются в очереди у отделений по всей стране. Достаточность капитала банков — ${D.pct(s.e.car)}, плохих кредитов — ${D.pct(s.e.npl)}.`,
    example: 'Northern Rock (Великобритания, 2007) — первая очередь вкладчиков за 140 лет. Silicon Valley Bank (США, 2023) — вкладчики забрали 42 млрд $ за один день.',
    choices: [
      { label: 'Спасти банки (рекапитализация)', desc: 'Стоит бюджету 2–4% ВВП, но система устоит.', apply: s => { spendOnce(s, 0.03); s.e.car += 0.05; s.e.confShock = -0.05; moodAll(s, -3, ['office', 'intel']); } },
      { label: 'Гарантировать все вклады', desc: 'Паника утихнет; риск для бюджета в будущем.', apply: s => { s.pol.laws.depositIns = 1; s.e.car += 0.02; s.e.confShock = -0.08; } },
      { label: 'Пусть слабые банки обанкротятся', desc: 'Рыночный подход: честно, но люди потеряют сбережения, кредит сожмётся.', apply: s => { s.e.car += 0.03; s.e.L *= 0.9; s.e.confShock = -0.3; moodAll(s, -10, ['pensioners', 'office']); } },
    ] },
  { id: 'refugees', icon: '🧳', title: 'Волна беженцев', p: 0.003, kb: 'event.refugees',
    cond: s => s.ext.partners.some(p => p.migrants),
    fire: () => {},
    text: s => `В ${s.ext.partners.find(p => p.migrants).name} гражданская война. Сотни тысяч людей идут к нашей границе.`,
    example: 'Миграционный кризис в Европе (2015): Германия приняла более 1 млн беженцев. Через 7 лет большинство работало, но в первые годы расходы и политическая напряжённость выросли.',
    choices: [
      { label: 'Принять и интегрировать', desc: 'Прирост рабочей силы, расходы на размещение (0,3% ВВП), часть граждан недовольна.', apply: s => { spendOnce(s, 0.003); const n = s.popTotal * 0.01; for (const r of s.regions) D.moveAges(r.coh, 15, 45, n * r.pop / s.popTotal); moodAll(s, -5, ['workers', 'pensioners', 'military']); moodAll(s, 3, ['intel']); for (const p of s.ext.partners) if (p.reg === 'dem') p.memory += 6; } },
      { label: 'Временный лагерь и помощь на месте', desc: 'Компромисс: часть людей остаётся, часть возвращается.', apply: s => { spendOnce(s, 0.0015); const n = s.popTotal * 0.003; for (const r of s.regions) D.moveAges(r.coh, 15, 45, n * r.pop / s.popTotal); } },
      { label: 'Закрыть границу', desc: 'Никаких расходов, но осуждение со стороны демократий.', apply: s => { moodAll(s, 4, ['military', 'workers']); for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= 8; } },
    ] },
  { id: 'discovery', icon: '💎', title: 'Открыто крупное месторождение', p: 0.0025, kb: 'event.discovery',
    cond: () => true,
    fire: s => { s.flags.discoveryRegion = D.pick(s, s.regions).id; },
    text: s => `Геологи нашли крупное месторождение ${D.pick(s, ['нефти', 'газа', 'медной руды', 'лития', 'золота'])} в регионе «${s.regions.find(r => r.id === s.flags.discoveryRegion).name}». Как его разрабатывать?`,
    example: 'Норвегия нашла нефть в 1969 г. и создала госкомпанию Statoil и фонд. Нигерия нашла нефть в 1956 г. — и получила «ресурсное проклятие»: коррупцию и отставание остальных отраслей.',
    choices: [
      { label: 'Госкомпания', desc: 'Доход идёт в бюджет, но растёт госсектор и риск коррупции.', apply: s => { s.e.Qres += s.e.Y * 0.02; s.pol.stateShare = Math.min(0.99, s.pol.stateShare + 0.02); s.inst.corr += 2; } },
      { label: 'Тендер для иностранных инвесторов', desc: 'Приток инвестиций и технологий, налоги через роялти.', apply: s => { s.e.Qres += s.e.Y * 0.025; D.addEffect(s, 'discFdi', 36, { fdi: 0.2 }, 'Инвестиции в месторождение'); } },
      { label: 'Сохранить природу', desc: 'Не трогать. Экологи и молодёжь довольны.', apply: s => { moodAll(s, 4, ['youth', 'intel']); } },
    ] },
  { id: 'cyber', icon: '💻', title: 'Кибератака', p: 0.003, kb: 'event.cyber',
    cond: () => true,
    fire: s => { s.e.supplyShock = (s.e.supplyShock || 0) + 0.005; },
    text: () => 'Хакеры вывели из строя платёжную систему и сайты госуслуг на несколько дней.',
    example: 'Атака NotPetya (2017) нанесла ущерб более 10 млрд $, парализовав порты, банки и госорганы.',
    choices: [
      { label: 'Программа кибербезопасности', desc: '+0,1% ВВП на госуправление, защита на будущее.', apply: s => { s.pol.spend.admin += 0.001; } },
      { label: 'Разобраться своими силами', desc: '', apply: () => {} },
    ] },
  { id: 'sport', icon: '🏆', title: 'Триумф на чемпионате мира', p: 0.004, kb: null,
    cond: () => true, fire: s => moodAll(s, 5),
    text: () => 'Национальная сборная выиграла чемпионат мира! Страна празднует.',
    example: 'Большие спортивные победы кратко поднимают настроение и рейтинг власти («эффект стадиона»), но не экономику.',
    choices: [{ label: 'Устроить праздник', desc: '', apply: () => {} }] },
  { id: 'lobby', icon: '🎩', title: 'Предложение олигархов', p: 0.004, kb: 'event.lobby',
    cond: s => s.inst.stateShare < 0.8,
    fire: () => {},
    text: () => 'Крупнейшие бизнесмены страны предлагают «поддержать» партию власти перед выборами, если им снизят налог на прибыль для их отрасли.',
    example: 'Залоговые аукционы 1995 г. в России: бизнес получил крупнейшие предприятия дёшево в обмен на поддержку власти — начало эпохи олигархов.',
    choices: [
      { label: 'Согласиться', desc: 'Крупный бизнес доволен, коррупция растёт, бюджет теряет.', apply: s => { s.inst.corr += 4; moodAll(s, 12, ['bigbiz']); D.addEffect(s, 'oligarchs', 60, { taxBase: -0.01, groups: { smallbiz: -3 } }, 'Льготы олигархам'); } },
      { label: 'Отказать', desc: 'Честно, но крупный бизнес обиделся.', apply: s => { moodAll(s, -8, ['bigbiz']); moodAll(s, 2, ['intel']); } },
    ] },
  { id: 'demoAlarm', icon: '👶', title: 'Демографическая тревога', p: 0.01, kb: 'event.demography',
    cond: s => s.pop.tfr < 1.35 && !s.flags.demoAlarm, fire: s => { s.flags.demoAlarm = s.t; },
    text: s => `Рождаемость упала до ${D.fmt(s.pop.tfr, 2)} ребёнка на женщину (для простого замещения поколений нужно 2,1). Через 20–30 лет работников станет меньше, а пенсионеров — больше.`,
    example: 'Южная Корея: 0,72 ребёнка на женщину (2023) — самый низкий показатель в мире, несмотря на 200+ млрд $ на поддержку рождаемости. Франция держит ~1,7–1,8 благодаря детским садам и налоговым льготам.',
    choices: [
      { label: 'Пакет семейной политики', desc: 'Материнский капитал и детские пособия (+0,5% ВВП).', apply: s => { s.pol.laws.matCap = 1; s.pol.child += 0.02; } },
      { label: 'Ставка на иммиграцию', desc: 'Балльная система для специалистов.', apply: s => { s.pol.laws.immigration = Math.max(2, s.pol.laws.immigration); } },
      { label: 'Повысить пенсионный возраст на 2 года', desc: 'Готовиться к старению заранее.', apply: s => { s.pol.pension.age = Math.min(72, s.pol.pension.age + 2); } },
    ] },
  { id: 'brainDrain', icon: '✈️', title: 'Утечка мозгов', p: 0.02, kb: 'event.braindrain',
    cond: s => s.soc.emigRate * 12 > 0.005 && !(s.flags.brainDrain > s.t - 36), fire: s => { s.flags.brainDrain = s.t; },
    text: s => `За год страну покинули ${D.people(s.soc.emigRate * 12 * s.popTotal)} — в основном молодые и образованные. IT-компании жалуются на нехватку кадров.`,
    example: 'После вступления в ЕС Латвия и Литва потеряли 15–20% населения. Индия, наоборот, получает от диаспоры 100+ млрд $ переводов в год.',
    choices: [
      { label: 'Гранты молодым специалистам', desc: '+0,2% ВВП на науку и образование.', apply: s => { s.pol.spend.science += 0.001; s.pol.spend.univ += 0.001; } },
      { label: 'Льготная ипотека для молодёжи', desc: '+0,3% ВВП на жильё.', apply: s => { s.pol.spend.housing += 0.003; } },
      { label: 'Ограничить выезд', desc: 'Только для недемократий.', auth: true, apply: s => { s.pol.laws.emigration = 1; } },
    ] },
  { id: 'monopoly', icon: '🏭', title: 'Сговор монополистов', p: 0.004, kb: 'event.monopoly',
    cond: s => s.inst.competition < 55, fire: s => { D.addEffect(s, 'cartel', 12, { goodsShock: 0.04 }, 'Картельный сговор'); },
    text: () => 'Несколько крупных компаний договорились держать высокие цены на цемент, топливо и лекарства.',
    example: 'Цементный картель в Германии (2003) — штраф 660 млн €. В Южной Корее антимонопольная служба регулярно штрафует чеболи.',
    choices: [
      { label: 'Антимонопольное расследование', desc: 'Цены вернутся, крупный бизнес недоволен.', apply: s => { s.effects = s.effects.filter(e => e.id !== 'cartel'); s.inst.competition += 5; moodAll(s, -5, ['bigbiz']); moodAll(s, 3, ['smallbiz', 'office']); } },
      { label: 'Не вмешиваться', desc: '', apply: () => {} },
    ] },
  { id: 'housingProtest', icon: '🏠', title: 'Протест против цен на жильё', p: 0.02, kb: 'event.housing',
    cond: s => s.cfg.modules.housing && s.ind.affordYears > 13 && !(s.flags.housingProtest > s.t - 24), fire: s => { s.flags.housingProtest = s.t; },
    text: s => `Чтобы купить квартиру, средней семье нужно копить ${D.fmt(s.ind.affordYears, 0)} лет. Молодёжь выходит на улицы.`,
    example: 'Протесты в Испании (2011) и Израиле (2011) начались с цен на жильё. Вена решает проблему муниципальным жильём: 60% горожан живут в социальном или кооперативном жилье.',
    choices: [
      { label: 'Строить социальное жильё', desc: '+0,5% ВВП на жильё.', apply: s => { s.pol.spend.housing += 0.005; } },
      { label: 'Заморозить аренду', desc: 'Быстро и дёшево, но стройка замедлится.', apply: s => { s.pol.laws.rentControl = 1; } },
      { label: 'Упростить стройку', desc: 'Меньше регулирования — больше предложения.', apply: s => { D.addEffect(s, 'buildEasy', 60, { housingSupply: 0.3, pollution: 2 }, 'Упрощение стройки'); } },
    ] },
  { id: 'hyper', icon: '🔥', title: 'Гиперинфляция', p: 0.3, kb: 'crisis.hyper',
    cond: s => s.e.pi12 > 0.6 && !(s.flags.hyper > s.t - 18), fire: s => { s.flags.hyper = s.t; },
    text: s => `Цены за год выросли на ${D.pct(s.e.pi12, 0)}. Люди избавляются от денег сразу после зарплаты, магазины меняют ценники ежедневно, сбережения сгорели.`,
    example: 'Германия 1923 г. (цены удваивались каждые 3–4 дня), Зимбабве 2008 г., Венесуэла 2018 г. Боливия в 1985 г. победила инфляцию 20 000% за несколько месяцев «шоковой терапией».',
    choices: [
      { label: 'Шоковая терапия', desc: 'Резко поднять ставку, прекратить печать денег, сократить дефицит, сделать ЦБ независимым. Быстрый результат ценой тяжёлой рецессии.', apply: s => { s.pol.cb.independent = true; s.pol.fin.monetize = 0; s.pol.cb.rate = Math.max(s.pol.cb.rate, s.e.pi12 * 0.8); s.e.cred = Math.max(s.e.cred, 0.4); for (const k of ['roads', 'industry', 'culture', 'admin', 'fuelsub', 'tariffsub']) s.pol.spend[k] *= 0.7; } },
      { label: 'Валютное правление (привязка к $)', desc: 'Фиксированный курс, деньги печатаются только под резервы. Как в Эстонии (1992) и Аргентине (1991).', apply: s => { s.pol.cb.regime = 'peg'; s.pol.cb.independent = true; s.pol.fin.monetize = 0; s.e.cred = Math.max(s.e.cred, 0.5); } },
      { label: 'Заморозить цены', desc: 'Самый популярный и самый вредный ответ: дефицит и чёрный рынок.', apply: s => { s.pol.laws.priceControl = Math.max(2, s.pol.laws.priceControl); } },
    ] },
  { id: 'shortage', icon: '🧺', title: 'Пустые полки', p: 0.1, kb: 'crisis.shortage',
    cond: s => s.e.shortage > 0.35 && !(s.flags.shortageEv > s.t - 24), fire: s => { s.flags.shortageEv = s.t; },
    text: s => `Товаров не хватает: очереди, талоны, «достать» важнее, чем «купить». У населения на руках ${D.money(s, s.e.overhang)} денег, которые не на что потратить («денежный навес»).`,
    example: 'СССР конца 1980-х: при фиксированных ценах денег у людей было больше, чем товаров. В январе 1992 г. цены отпустили — за год они выросли в 26 раз, навес «сгорел».',
    choices: [
      { label: 'Либерализация цен', desc: 'Отменить контроль цен. Полки заполнятся, но будет скачок инфляции.', apply: s => { s.pol.laws.priceControl = 0; const oh = s.e.overhang / (s.e.C * s.e.P); D.pipeAdd(s, 'goods', Math.min(2.5, oh * 2), 6); D.pipeAdd(s, 'food', Math.min(2.5, oh * 2), 6); D.pipeAdd(s, 'serv', Math.min(2, oh * 1.5), 6); s.e.overhang *= 0.2; } },
      { label: 'Ввести талоны', desc: 'Справедливое распределение дефицита, но полки не наполнит.', apply: s => { s.e.overhang *= 0.85; moodAll(s, 2, ['poor', 'pensioners']); moodAll(s, -5, ['office', 'youth']); } },
      { label: 'Закупить товары за валюту', desc: 'Потратить резервы на импорт ширпотреба.', apply: s => { const use = s.ext.res * 0.2; s.ext.res -= use; s.e.overhang = Math.max(0, s.e.overhang - use * s.e.er); } },
    ] },
  { id: 'default', icon: '💸', title: 'Угроза дефолта', p: 1, kb: 'crisis.debt',
    cond: s => (s.gov.arrearsMonths || 0) >= 2 && !(s.gov.defaultUntil > s.t) && !s.gov.imf, fire: () => {},
    text: s => `Рынки больше не дают стране в долг (рейтинг ${s.gov.rating}), а денег на выплаты не хватает. Госдолг — ${D.pct(s.gov.debtGdp, 0)} ВВП.`,
    example: 'Россия (1998), Аргентина (2001 — крупнейший на тот момент дефолт в истории, 93 млрд $), Греция (2012 — списание 53% долга), Шри-Ланка (2022).',
    choices: [
      { label: 'Программа МВФ', desc: 'Кредит 5% ВВП на жёстких условиях: дефицит ≤ 3%, отмена субсидий, независимый ЦБ.', apply: s => D.startIMF(s) },
      { label: 'Объявить дефолт и реструктуризацию', desc: 'Списать ~40% долга. Рейтинг D на 3 года, бегство капитала, удар по банкам.', apply: s => { D.declareDefault(s); } },
      { label: 'Печатать деньги', desc: 'Долг будет погашен обесценившимися деньгами. Путь к гиперинфляции.', apply: s => { s.pol.cb.independent = false; s.pol.fin.monetize = 0.9; } },
    ] },
  { id: 'imfOffer', icon: '🏦', title: 'МВФ предлагает помощь', p: 0.2, kb: 'world.imf',
    cond: s => !s.gov.marketAccess && !s.gov.imf && !(s.flags.imfOffer > s.t - 24), fire: s => { s.flags.imfOffer = s.t; },
    text: () => 'Международный валютный фонд готов выдать кредит, чтобы страна избежала дефолта. Но у денег МВФ всегда есть условия.',
    example: 'Программы МВФ: Южная Корея (1997) быстро вернула кредит, Греция (2010–2018) прошла через годы жёсткой экономии, Аргентина (2018) получила крупнейший кредит в истории фонда — 57 млрд $.',
    choices: [
      { label: 'Принять программу', desc: 'Кредит 5% ВВП, условия: дефицит ≤ 3% за 2 года, отмена топливных субсидий, независимость ЦБ.', apply: s => D.startIMF(s) },
      { label: 'Отказаться', desc: 'Справляться самим.', apply: () => {} },
    ] },
  { id: 'war', icon: '⚔️', title: 'Военная угроза', p: 0, kb: 'event.war',
    cond: () => false, fire: () => {},
    text: s => `${s.ext.partners.find(p => p.threat).name} стягивает войска к границе и выдвигает ультиматум. Наша обороноспособность — ${D.fmt(s.ext.security, 0)} из 100.`,
    example: 'Истории известны разные исходы: переговоры (Карибский кризис 1962 г.), нейтралитет (Швейцария, Финляндия), вооружённые конфликты с огромными человеческими и экономическими потерями.',
    choices: [
      { label: 'Переговоры и уступки', desc: 'Мир сохранён, но придётся пойти на торговые уступки; часть общества недовольна.', apply: s => { const p = s.ext.partners.find(q => q.threat); p.memory += 30; p.tariffThem = 0; moodAll(s, -6, ['military', 'pensioners']); } },
      { label: 'Мобилизация и оборона', desc: 'Резкий рост военных расходов (+4% ВВП), жертвы, спад экономики, сплочение общества.', apply: s => { s.flags.war = s.t + 18; s.pol.spend.defense += 0.04; s.pop.excessDeath = 0.08; s.e.supplyShock = 0.06; s.e.confShock = -0.25; s.flags.rally = s.t + 18; moodAll(s, 6, ['military']); D.addEffect(s, 'war', 18, { emig: 0.8, fdi: -0.5, groups: { youth: -12, families: -8 } }, 'Военный конфликт'); } },
      { label: 'Просить союзников о защите', desc: 'Если есть союзник — он поможет; если нет — угроза останется.', apply: s => { const ally = s.ext.partners.find(p => p.allied); const r = s.ext.partners.find(q => q.threat); if (ally) { r.memory += 20; D.logEvent(s, 'world', '🛡️ Союзники пришли на помощь', `${ally.name} выступил с гарантиями безопасности — соперник отступил.`); } else { r.memory -= 10; D.logEvent(s, 'world', '😶 Союзников нет', 'Никто не пришёл на помощь: у нас нет военных союзов. Угроза сохраняется.'); } } },
    ] },
  { id: 'managedLoss', icon: '🗳️', title: 'Партия власти проиграла выборы', p: 0, kb: 'politics.fraud',
    cond: () => false, fire: () => {},
    text: (s, pe) => `По честному подсчёту партия власти набрала лишь ${D.pct(pe && pe.data ? pe.data.share : 0.4)}. Избирком ждёт указаний.`,
    example: 'В 2000 г. в Сербии Милошевич не признал поражение — массовые протесты вынудили его уйти. В 2020 г. в Беларуси официальные итоги вызвали крупнейшие протесты в истории страны и санкции.',
    choices: [
      { label: 'Признать поражение', desc: 'Мирная передача власти. Игра окончена, но с честью.', apply: s => D.gameOver(s, 'election') },
      { label: 'Объявить победу', desc: 'Сохранить власть. Протесты, санкции, падение доверия.', apply: s => { s.polit.fraudScandal = 40; s.inst.trust -= 20; s.polit.protest = D.clamp(s.polit.protest + 0.4, 0, 1); moodAll(s, -15, ['intel', 'youth', 'office']); for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= 30; s.polit.tension += 0.3; } },
    ] },
];
D.EVENT = {};
for (const ev of D.EVENTS) D.EVENT[ev.id] = ev;

D.startIMF = function (s) {
  if (s.gov.imf) return;
  const amt = 0.05 * s.ind.gdpUsd;
  s.gov.imf = { since: s.t, amt, deadline: s.t + 24 };
  s.gov.debtF += amt; s.ext.res += amt * 0.6;
  s.gov.imfBoost = 25; s.gov.arrearsMonths = 0;
  s.pol.cb.independent = true; s.pol.fin.monetize = 0;
  s.pol.spend.fuelsub = 0;
  s.e.cred = Math.max(s.e.cred, 0.45);
  D.logEvent(s, 'world', '🏦 Программа МВФ', `Получен кредит ${D.usd(amt)}. Условия: к ${D.dateStr(s, s.t + 24)} дефицит бюджета должен быть не выше 3% ВВП, топливные субсидии отменены, ЦБ независим. Нарушение условий остановит программу.`, { kb: 'world.imf' });
};
D.declareDefault = function (s) {
  const g = s.gov;
  g.debtD *= 0.6; g.debtF *= 0.55; g.regDebt *= 0.7;
  g.defaultUntil = s.t + 36; g.defaults = (g.defaults || 0) + 1; g.arrearsMonths = 0;
  s.e.crisisFlight = 0.06; s.e.confShock = -0.3;
  if (s.cfg.modules.banks) s.e.nplShock = 0.06, s.e.car -= 0.04;
  for (const p of s.ext.partners) p.memory -= p.fin * 30;
  D.logEvent(s, 'crisis', '💸 Дефолт', `Страна отказалась платить по долгам и начала реструктуризацию: около 40% долга списано. Рейтинг — D, доступ к рынкам закрыт на 3 года, капитал бежит, банки, державшие облигации, понесли убытки.`, { kb: 'crisis.debt' });
};

// Проверка условий МВФ.
function imfCheck(s) {
  const im = s.gov.imf; if (!im) return;
  if (s.t >= im.deadline) {
    const def = s.fis.deficit / s.ind.gdpNom;
    if (def <= 0.035 && (s.pol.spend.fuelsub || 0) < 0.002) {
      D.logEvent(s, 'world', '✅ Программа МВФ выполнена', 'Условия соблюдены: доверие рынков вернулось, рейтинг растёт.');
      s.gov.scoreOff = Math.min(10, s.gov.scoreOff + 5);
    } else {
      D.logEvent(s, 'world', '❌ Программа МВФ сорвана', `Дефицит ${D.pct(def)} ВВП вместо обещанных 3%. МВФ остановил выплаты, инвесторы снова насторожились.`);
      s.gov.scoreOff = Math.max(-20, s.gov.scoreOff - 12);
    }
    s.gov.imf = null;
  }
}

// Кризисы: распознаём и объясняем (одна запись при начале и окончании).
D.CRISES = [
  { id: 'recession', name: 'Рецессия', icon: '📉', kb: 'crisis.recession', on: s => s.e.growthY < -0.005 && D.yoy(s, 'Y', 3) < 0, off: s => s.e.growthY > 0.005 },
  { id: 'stagflation', name: 'Стагфляция', icon: '🌫️', kb: 'crisis.stagflation', on: s => s.e.growthY < 0 && s.e.pi12 > 0.1, off: s => s.e.growthY > 0.01 || s.e.pi12 < 0.07 },
  { id: 'highInfl', name: 'Высокая инфляция', icon: '🔥', kb: 'crisis.inflation', on: s => s.e.pi12 > 0.15, off: s => s.e.pi12 < 0.1 },
  { id: 'deflation', name: 'Дефляция', icon: '🧊', kb: 'crisis.deflation', on: s => s.e.pi12 < -0.005, off: s => s.e.pi12 > 0.005 },
  { id: 'debt', name: 'Долговой кризис', icon: '💸', kb: 'crisis.debt', on: s => !s.gov.marketAccess, off: s => s.gov.marketAccess },
  { id: 'bank', name: 'Банковский кризис', icon: '🏦', kb: 'crisis.bank', on: s => s.cfg.modules.banks && s.e.car < 0.06, off: s => s.e.car > 0.09 },
  { id: 'unemp', name: 'Массовая безработица', icon: '🧑‍💼', kb: 'crisis.unemployment', on: s => s.e.u > 0.15, off: s => s.e.u < 0.11 },
  { id: 'shortage', name: 'Товарный дефицит', icon: '🧺', kb: 'crisis.shortage', on: s => s.e.shortage > 0.25, off: s => s.e.shortage < 0.12 },
  { id: 'unrest', name: 'Политический кризис', icon: '📢', kb: 'politics.protest', on: s => s.polit.protest > 0.35, off: s => s.polit.protest < 0.2 },
];

function crises(s) {
  for (const c of D.CRISES) {
    const st = s.crises[c.id] || (s.crises[c.id] = { active: false, since: 0, count: 0 });
    if (!st.active && s.t > 3 && c.on(s)) {
      st.active = true; st.since = s.t; st.count++;
      D.logEvent(s, 'crisis', `${c.icon} Начался кризис: ${c.name}`, D.crisisText ? D.crisisText(s, c.id) : c.name, { kb: c.kb, crisis: c.id });
    } else if (st.active && c.off(s)) {
      st.active = false;
      const dur = s.t - st.since;
      D.logEvent(s, 'good', `✅ Кризис позади: ${c.name}`, `Длился ${D.months(dur)}. ${c.id === 'recession' ? 'Экономика снова растёт. Заметьте: восстановление часто происходит само — рынок «очищается» от неэффективных компаний, освобождает людей и капитал для новых дел.' : ''}`, { kb: c.kb });
    }
  }
}

D.stepEvents = function (s) {
  const diff = D.DIFF[s.cfg.difficulty];
  s.effects = s.effects.filter(e => e.until > s.t);
  if (s.flags.fuelsubUntil && s.t >= s.flags.fuelsubUntil) { s.pol.spend.fuelsub = Math.max(0, s.pol.spend.fuelsub - 0.01); s.flags.fuelsubUntil = 0; }
  if (s.flags.stimulusUntil && s.t >= s.flags.stimulusUntil) { for (const k of ['roads', 'utilities', 'housing']) s.pol.spend[k] = Math.max(0, s.pol.spend[k] - 0.0067); s.flags.stimulusUntil = 0; }
  if (s.flags.war && s.t >= s.flags.war) { s.flags.war = 0; s.pol.spend.defense = Math.max(0.01, s.pol.spend.defense - 0.03); D.logEvent(s, 'world', '🕊️ Конфликт завершён', 'Боевые действия прекращены. Предстоит восстановление экономики и возвращение уехавших.'); }
  for (const r of s.regions) r.mortMul = D.approach(r.mortMul || 1, 1, 0.1);
  crises(s);
  imfCheck(s);
  if (!s.cfg.modules.events) return;
  if (s.pending.length) return;
  const hasCrisis = D.EVENTS.filter(ev => ev.p >= 0.02 && ev.cond(s));
  const pool = hasCrisis.length ? hasCrisis : D.EVENTS.filter(ev => ev.p > 0 && ev.cond(s));
  for (const ev of pool) {
    const p = ev.p >= 0.02 ? ev.p : ev.p * diff.events;
    if (D.chance(s, p)) {
      ev.fire(s);
      s.pending.push({ id: ev.id, t: s.t, text: ev.text(s) });
      break;
    }
  }
};

D.resolveEvent = function (s, choiceIdx) {
  const pe = s.pending.shift(); if (!pe) return;
  const ev = D.EVENT[pe.id];
  pe.text = pe.text || ev.text(s, pe);
  const ch = ev.choices[choiceIdx];
  if (ch) ch.apply(s);
  D.logEvent(s, 'event', `${ev.icon} ${ev.title}`, pe.text + (ch ? ` Решение: «${ch.label}».` : ''), { kb: ev.kb, choice: ch && ch.label });
};
})();
