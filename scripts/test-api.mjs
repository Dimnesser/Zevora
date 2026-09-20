/**
 * API integration tests.
 *
 * Exercises the economy end to end against a running server, with the
 * emphasis on the things that must not be possible: double spends,
 * negative balances, tampered prices, cross-account access.
 *
 *   BASE=http://localhost:3100 node scripts/test-api.mjs
 */

const BASE = process.env.BASE ?? "http://localhost:3100";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \x1b[31m✗\x1b[0m ${name} ${detail}`);
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

/** Minimal cookie-jar client, one per simulated user. */
function makeClient() {
  let cookie = "";
  return async function call(path, opts = {}) {
    const headers = { "content-type": "application/json", ...(opts.headers ?? {}) };
    if (cookie) headers.cookie = cookie;
    const res = await fetch(BASE + path, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* empty body */
    }
    return { status: res.status, json };
  };
}

const rnd = () => Math.random().toString(36).slice(2, 10);

async function main() {
  // ───────────── auth ─────────────
  section("Авторизация");

  const anon = makeClient();
  let r = await anon("/api/auth/me");
  check("GET /api/auth/me без сессии → user: null", r.json?.user === null);

  const alice = makeClient();
  const aliceName = `alice_${rnd()}`;
  r = await alice("/api/auth/register", {
    method: "POST",
    body: { username: aliceName, password: "secret123" },
  });
  check("Регистрация возвращает 201", r.status === 201, `got ${r.status}`);
  check("Новому аккаунту начислен стартовый баланс", r.json?.user?.balance_minor === 100000);
  check("Ответ не содержит хеш пароля", !JSON.stringify(r.json).includes("password"));

  r = await alice("/api/auth/register", {
    method: "POST",
    body: { username: aliceName, password: "secret123" },
  });
  check("Повторная регистрация того же ника → 409", r.status === 409, `got ${r.status}`);

  r = await anon("/api/auth/login", {
    method: "POST",
    body: { username: aliceName, password: "wrong" },
  });
  check("Неверный пароль → 401", r.status === 401);

  r = await anon("/api/auth/login", {
    method: "POST",
    body: { username: `nobody_${rnd()}`, password: "whatever" },
  });
  check("Несуществующий ник даёт то же сообщение", r.json?.error?.message === "Неверный ник или пароль");

  // ───────────── cases ─────────────
  section("Каталог кейсов");

  r = await anon("/api/cases");
  const cases = r.json?.cases ?? [];
  check("GET /api/cases доступен без входа", r.status === 200 && cases.length > 0);
  check("Партнёрские кейсы скрыты от обычного гостя", cases.every((c) => !c.partner_only));

  const cheap = cases.find((c) => c.slug === "starter-drop");
  r = await anon(`/api/cases/${cheap.slug}`);
  const items = r.json?.items ?? [];
  const chanceSum = items.reduce((s, i) => s + i.chance, 0);
  check("Кейс отдаёт список предметов", items.length > 0);
  check("Сумма шансов равна 1", Math.abs(chanceSum - 1) < 1e-9, `Σ=${chanceSum}`);
  check("У каждого предмета есть редкость и цена", items.every((i) => i.rarity?.color && i.price_minor > 0));

  r = await anon("/api/cases/zevora-vault");
  check("Партнёрский кейс закрыт для гостя → 403", r.status === 403, `got ${r.status}`);

  // ───────────── opening ─────────────
  section("Открытие кейса");

  r = await anon(`/api/cases/${cheap.slug}/open`, {
    method: "POST",
    headers: { "idempotency-key": rnd() + rnd() },
  });
  check("Открытие без сессии → 401", r.status === 401, `got ${r.status}`);

  r = await alice(`/api/cases/${cheap.slug}/open`, { method: "POST" });
  check("Открытие без Idempotency-Key → 422", r.status === 422, `got ${r.status}`);

  const before = (await alice("/api/auth/me")).json.user.balance_minor;
  const key1 = "k_" + rnd() + rnd();
  r = await alice(`/api/cases/${cheap.slug}/open`, {
    method: "POST",
    headers: { "idempotency-key": key1 },
  });
  const open1 = r.json;
  check("Открытие возвращает предмет", r.status === 200 && !!open1?.item?.market_name);
  check("Баланс списан ровно на цену кейса", open1.balance_minor === before - cheap.price_minor,
        `${open1.balance_minor} vs ${before - cheap.price_minor}`);
  check("Возвращён аудит выпадения (roll/total_weight)", open1.audit.total_weight > 0 && open1.audit.roll < open1.audit.total_weight);
  check("Выпавший предмет входит в список кейса", items.some((i) => i.skin_id === open1.item.skin_id));

  // ───────────── idempotency ─────────────
  section("Идемпотентность и двойной клик");

  r = await alice(`/api/cases/${cheap.slug}/open`, {
    method: "POST",
    headers: { "idempotency-key": key1 },
  });
  check("Повтор с тем же ключом возвращает то же открытие", r.json?.opening_id === open1.opening_id);
  const afterReplay = (await alice("/api/auth/me")).json.user.balance_minor;
  check("Повтор не списал деньги второй раз", afterReplay === open1.balance_minor,
        `${afterReplay} vs ${open1.balance_minor}`);

  const beforeBurst = afterReplay;
  const sameKey = "burst_" + rnd();
  const burst = await Promise.all(
    Array.from({ length: 8 }, () =>
      alice(`/api/cases/${cheap.slug}/open`, {
        method: "POST",
        headers: { "idempotency-key": sameKey },
      }),
    ),
  );
  const ids = new Set(burst.map((b) => b.json?.opening_id));
  const afterBurst = (await alice("/api/auth/me")).json.user.balance_minor;
  check("8 одновременных запросов с одним ключом → одно открытие", ids.size === 1, `ids=${ids.size}`);
  check("Списана ровно одна цена кейса", afterBurst === beforeBurst - cheap.price_minor,
        `${afterBurst} vs ${beforeBurst - cheap.price_minor}`);

  // Two accounts using the same idempotency key must not collide.
  const twin = makeClient();
  await twin("/api/auth/register", {
    method: "POST",
    body: { username: `twin_${rnd()}`, password: "secret123" },
  });
  const sharedKey = "shared_" + rnd();
  const a = await alice(`/api/cases/${cheap.slug}/open`, {
    method: "POST",
    headers: { "idempotency-key": sharedKey },
  });
  const t = await twin(`/api/cases/${cheap.slug}/open`, {
    method: "POST",
    headers: { "idempotency-key": sharedKey },
  });
  check("Одинаковый ключ у разных пользователей не конфликтует",
        a.status === 200 && t.status === 200, `${a.status}/${t.status}`);
  check("Каждый получил своё открытие",
        a.json?.opening_id !== t.json?.opening_id);

  // ───────────── concurrency ─────────────
  section("Гонки и защита баланса");

  const bob = makeClient();
  const bobName = `bob_${rnd()}`;
  await bob("/api/auth/register", {
    method: "POST",
    body: { username: bobName, password: "secret123" },
  });
  const bobStart = (await bob("/api/auth/me")).json.user.balance_minor;
  const affordable = Math.floor(bobStart / cheap.price_minor);

  // Fire twice as many requests as the balance covers, all at once.
  const race = await Promise.all(
    Array.from({ length: affordable + 25 }, () =>
      bob(`/api/cases/${cheap.slug}/open`, {
        method: "POST",
        headers: { "idempotency-key": "race_" + rnd() + rnd() },
      }),
    ),
  );
  const okOpens = race.filter((x) => x.status === 200).length;
  const rejected = race.filter((x) => x.status === 402).length;
  const bobEnd = (await bob("/api/auth/me")).json.user.balance_minor;

  check("Баланс не ушёл в минус", bobEnd >= 0, `balance=${bobEnd}`);
  check("Успешных открытий не больше, чем позволял баланс", okOpens <= affordable,
        `${okOpens} > ${affordable}`);
  check("Лишние запросы отклонены как 402", rejected > 0, `rejected=${rejected}`);
  check("Списано ровно за успешные открытия",
        bobEnd === bobStart - okOpens * cheap.price_minor,
        `${bobEnd} vs ${bobStart - okOpens * cheap.price_minor}`);

  const inv = (await bob("/api/inventory")).json;
  check("Предметов в инвентаре столько же, сколько открытий", inv.total === okOpens,
        `${inv.total} vs ${okOpens}`);

  // ───────────── tampering ─────────────
  section("Подмена данных");

  const preTamper = (await alice("/api/auth/me")).json.user.balance_minor;
  r = await alice(`/api/cases/${cheap.slug}/open`, {
    method: "POST",
    headers: { "idempotency-key": "tamper_" + rnd() },
    body: { price_minor: 0, price: 0, skin_id: 1, win: "karambit-doppler", force: true },
  });
  const afterTamper = (await alice("/api/auth/me")).json.user.balance_minor;
  check("Поля price/skin_id в теле игнорируются", r.status === 200);
  check("Списана настоящая цена, а не присланная", afterTamper === preTamper - cheap.price_minor,
        `${afterTamper} vs ${preTamper - cheap.price_minor}`);

  // ───────────── inventory & selling ─────────────
  section("Инвентарь и продажа");

  const aliceInv = (await alice("/api/inventory")).json;
  check("Инвентарь возвращает предметы владельца", aliceInv.items.length > 0);
  check("У предмета есть износ, float и источник",
        aliceInv.items.every((i) => i.wear && typeof i.float_value === "number" && i.source));
  check("Источник открытия — кейс", aliceInv.items.some((i) => i.source === "case" && i.source_case));

  const victimItem = aliceInv.items[0];
  r = await bob("/api/inventory/sell", { method: "POST", body: { ids: [victimItem.id] } });
  check("Продажа чужого предмета отклонена", r.status === 409, `got ${r.status}`);

  const stillThere = (await alice("/api/inventory")).json.items.some((i) => i.id === victimItem.id);
  check("Чужой предмет остался у владельца", stillThere);

  const balBeforeSell = (await alice("/api/auth/me")).json.user.balance_minor;
  r = await alice("/api/inventory/sell", { method: "POST", body: { ids: [victimItem.id] } });
  check("Продажа своего предмета проходит", r.status === 200 && r.json.sold === 1);
  check("Начислена цена предмета", r.json.balance_minor === balBeforeSell + victimItem.price_minor,
        `${r.json.balance_minor} vs ${balBeforeSell + victimItem.price_minor}`);

  r = await alice("/api/inventory/sell", { method: "POST", body: { ids: [victimItem.id] } });
  check("Повторная продажа того же предмета отклонена", r.status === 409, `got ${r.status}`);

  r = await alice("/api/inventory/sell", { method: "POST", body: { ids: [-1] } });
  check("Отрицательный id отклонён", r.status === 422, `got ${r.status}`);

  // ───────────── history ─────────────
  section("История");

  const hist = (await alice("/api/openings")).json;
  check("История открытий доступна", hist.openings.length > 0);
  check("Все записи принадлежат текущему пользователю",
        hist.openings.every((o) => o.username === aliceName));

  r = await alice("/api/openings?scope=all");
  check("Глобальная история закрыта от обычного пользователя", r.status === 403, `got ${r.status}`);

  const live = (await anon("/api/live")).json;
  check("Лента последних выигрышей публична", Array.isArray(live.drops));
  check("В ленте реальные ники из БД",
        live.drops.length === 0 || live.drops.every((d) => typeof d.username === "string"));

  // ───────────── admin ─────────────
  section("Права администратора");

  for (const path of ["/api/admin/cases", "/api/admin/skins", "/api/admin/stats", "/api/admin/users"]) {
    r = await alice(path);
    check(`${path} закрыт для обычного пользователя`, r.status === 403, `got ${r.status}`);
  }

  r = await alice("/api/admin/cases", { method: "POST", body: { name: "Hack", price_minor: 0 } });
  check("Создание кейса обычным пользователем → 403", r.status === 403);

  r = await alice(`/api/admin/users/1/partner`, { method: "PUT", body: { tier: "ambassador" } });
  check("Самоназначение партнёрки → 403", r.status === 403, `got ${r.status}`);

  const owner = makeClient();
  r = await owner("/api/auth/login", {
    method: "POST",
    body: { username: "dimnesser", password: "zevora123" },
  });
  check("Вход владельца", r.status === 200 && r.json.user.role === "owner");

  r = await owner("/api/admin/cases");
  check("Владелец видит все кейсы, включая выключенные", r.status === 200 && r.json.cases.length >= cases.length);

  r = await owner("/api/openings?scope=all");
  check("Владелец видит глобальную историю", r.status === 200 && r.json.scope === "all");

  // full case lifecycle through the admin API
  const newSlug = `test-case-${rnd()}`;
  r = await owner("/api/admin/cases", {
    method: "POST",
    body: { name: "Тестовый кейс", slug: newSlug, price_minor: 50000, description: "temp" },
  });
  check("Владелец создаёт кейс", r.status === 201, `got ${r.status}`);
  const newCaseId = r.json.case.id;

  const skins = (await owner("/api/admin/skins?q=AK-47")).json.skins;
  check("Поиск скинов для админки работает", skins.length > 0);

  r = await owner(`/api/admin/cases/${newCaseId}/items`, {
    method: "POST",
    body: { skin_id: skins[0].id, weight: 7000 },
  });
  check("Добавление скина в кейс", r.status === 201, `got ${r.status}`);
  const itemId = r.json.item.id;

  r = await owner(`/api/admin/cases/${newCaseId}/items`, {
    method: "POST",
    body: { skin_id: skins[0].id, weight: 100 },
  });
  check("Повторное добавление того же скина → 409", r.status === 409);

  r = await owner(`/api/admin/cases/${newCaseId}/items`, {
    method: "POST",
    body: { skin_id: skins[1].id, weight: 3000 },
  });
  check("Второй скин добавлен", r.status === 201);

  r = await owner(`/api/admin/cases/${newCaseId}/items/${itemId}`, {
    method: "PATCH",
    body: { weight: 9000 },
  });
  check("Изменение веса предмета", r.status === 200 && r.json.item.weight === 9000);

  r = await owner(`/api/admin/cases/${newCaseId}/items`, {
    method: "POST",
    body: { skin_id: skins[0].id, weight: 0 },
  });
  check("Нулевой вес отклонён", r.status === 422, `got ${r.status}`);

  r = await anon(`/api/cases/${newSlug}`);
  check("Новый кейс сразу виден на сайте", r.status === 200 && r.json.items.length === 2);

  r = await owner(`/api/admin/cases/${newCaseId}`, {
    method: "PATCH",
    body: { price_minor: 12345, is_active: false },
  });
  check("Изменение цены и статуса кейса", r.status === 200 && r.json.case.price_minor === 12345);

  r = await anon(`/api/cases/${newSlug}`);
  check("Выключенный кейс недоступен публично", r.status === 404, `got ${r.status}`);

  r = await owner(`/api/admin/cases/${newCaseId}/stats?period=all`);
  check("Статистика кейса доступна", r.status === 200 && Array.isArray(r.json.stats.drops));

  r = await owner(`/api/admin/cases/${newCaseId}/items/${itemId}`, { method: "DELETE" });
  check("Удаление предмета из кейса", r.status === 200);

  r = await owner(`/api/admin/cases/${newCaseId}?hard=1`, { method: "DELETE" });
  check("Удаление неоткрытого кейса", r.status === 200 && r.json.deleted);

  // a case that has been opened may only be archived
  const opened = cases.find((c) => c.slug === cheap.slug);
  r = await owner(`/api/admin/cases/${opened.id}?hard=1`, { method: "DELETE" });
  check("Открывавшийся кейс нельзя удалить безвозвратно", r.status === 409, `got ${r.status}`);

  // ───────────── partner grant ─────────────
  section("Партнёрская программа");

  const aliceId = (await alice("/api/auth/me")).json.user.id;
  r = await owner(`/api/admin/users/${aliceId}/partner`, {
    method: "PUT",
    body: { tier: "elite" },
  });
  check("Владелец выдаёт партнёрский статус", r.status === 200, `got ${r.status}`);

  const alicePartner = (await alice("/api/auth/me")).json.user.partner;
  check("Статус виден в профиле пользователя", alicePartner?.tier === "elite");
  check("Создан персональный промокод", typeof alicePartner?.promo_code === "string");

  r = await alice("/api/cases");
  check("Партнёру виден закрытый кейс",
        r.json.cases.some((c) => c.slug === "zevora-vault"));

  r = await alice("/api/cases/zevora-vault/open", {
    method: "POST",
    headers: { "idempotency-key": "vault_" + rnd() },
  });
  check("Партнёр открывает закрытый кейс бесплатно", r.status === 200, `got ${r.status}`);

  r = await owner(`/api/admin/users/${aliceId}/partner`, { method: "DELETE" });
  check("Владелец снимает статус", r.status === 200);
  check("Статус снят в профиле", (await alice("/api/auth/me")).json.user.partner === null);

  r = await alice("/api/cases/zevora-vault/open", {
    method: "POST",
    headers: { "idempotency-key": "vault2_" + rnd() },
  });
  check("После снятия закрытый кейс недоступен", r.status === 403, `got ${r.status}`);

  // ───────────── bonuses ─────────────
  section("Бонусы");

  const carol = makeClient();
  await carol("/api/auth/register", {
    method: "POST",
    body: { username: `carol_${rnd()}`, password: "secret123" },
  });

  r = await carol("/api/bonuses/daily", { method: "POST" });
  check("Ежедневный бонус начисляется", r.status === 200 && r.json.amount_minor > 0);
  r = await carol("/api/bonuses/daily", { method: "POST" });
  check("Повторный daily в тот же день → 409", r.status === 409);

  r = await carol("/api/bonuses/promo", { method: "POST", body: { code: "zevora" } });
  check("Промокод применяется без учёта регистра", r.status === 200);
  r = await carol("/api/bonuses/promo", { method: "POST", body: { code: "ZEVORA" } });
  check("Повторное использование промокода → 409", r.status === 409);
  r = await carol("/api/bonuses/promo", { method: "POST", body: { code: "NOPE" + rnd() } });
  check("Несуществующий промокод → 404", r.status === 404);

  r = await carol("/api/bonuses/registration", { method: "POST" });
  check("Бонус за регистрацию начисляется", r.status === 200);
  r = await carol("/api/bonuses/registration", { method: "POST" });
  check("Повторный бонус за регистрацию → 409", r.status === 409);

  // ───────────── deposit & shop ─────────────
  section("Пополнение и магазин");

  const depBefore = (await carol("/api/auth/me")).json.user.balance_minor;
  r = await carol("/api/wallet/deposit", { method: "POST", body: { amount: 1000, method: "sbp" } });
  check("Пополнение с бонусом СБП 3%", r.json?.bonus_minor === 3000, `bonus=${r.json?.bonus_minor}`);
  check("Баланс увеличился на сумму с бонусом",
        r.json.balance_minor === depBefore + 103000);

  r = await carol("/api/wallet/deposit", { method: "POST", body: { amount: 10, method: "card" } });
  check("Сумма ниже минимума отклонена", r.status === 422);
  r = await carol("/api/wallet/deposit", { method: "POST", body: { amount: 1000, method: "free" } });
  check("Неизвестный способ оплаты отклонён", r.status === 422);
  r = await carol("/api/wallet/deposit", { method: "POST", body: { amount: -5000, method: "card" } });
  check("Отрицательное пополнение отклонено", r.status === 422);

  const cheapSkin = skins.sort((a, b) => a.base_price_minor - b.base_price_minor)[0];
  const shopBefore = (await carol("/api/auth/me")).json.user.balance_minor;
  r = await carol("/api/shop/buy", { method: "POST", body: { skin_id: cheapSkin.id, price_minor: 1 } });
  const expectedCost = Math.round(cheapSkin.base_price_minor * 1.12);
  check("Покупка в магазине проходит", r.status === 200, `got ${r.status}`);
  check("Списана серверная цена с наценкой, а не присланная",
        r.json.balance_minor === shopBefore - expectedCost,
        `${r.json?.balance_minor} vs ${shopBefore - expectedCost}`);

  // ───────────── injection & malformed input ─────────────
  section("Инъекции и мусорный ввод");

  const evil = [
    "' OR 1=1 --",
    "\"; DROP TABLE users; --",
    "1; UPDATE users SET balance_minor = 999999999",
    "../../etc/passwd",
    "<script>alert(1)</script>",
  ];

  for (const payload of evil) {
    r = await anon(`/api/cases/${encodeURIComponent(payload)}`);
    check(`Slug «${payload.slice(0, 18)}…» не ломает выборку`, r.status === 404 || r.status === 422,
          `got ${r.status}`);
  }

  r = await alice(`/api/inventory?sort=${encodeURIComponent("price_minor; DROP TABLE users")}`);
  check("Мусорный sort игнорируется", r.status === 200, `got ${r.status}`);
  r = await alice(`/api/inventory?rarity=${encodeURIComponent("' OR 1=1 --")}`);
  check("Мусорный rarity не расширяет выборку", r.status === 200 && r.json.items.length === 0,
        `got ${r.status}/${r.json?.items?.length}`);

  r = await owner("/api/admin/cases", {
    method: "POST",
    body: { name: "x'; DROP TABLE cases; --", slug: "inj-" + rnd(), price_minor: 100 },
  });
  check("Кавычки в названии сохраняются как данные", r.status === 201);
  r = await anon("/api/cases");
  check("Таблица кейсов цела после попытки инъекции", r.json.cases.length > 0);

  r = await alice("/api/inventory/sell", { method: "POST", body: { ids: "1 OR 1=1" } });
  check("Строка вместо массива id отклонена", r.status === 422, `got ${r.status}`);
  r = await alice("/api/inventory/sell", { method: "POST", body: { ids: [1.5] } });
  check("Дробный id отклонён", r.status === 422, `got ${r.status}`);
  r = await alice("/api/inventory/sell", { method: "POST", body: { ids: [9e99] } });
  check("Нечисловой id отклонён", r.status === 422, `got ${r.status}`);

  r = await alice("/api/wallet/deposit", { method: "POST", body: { amount: 1e308, method: "card" } });
  check("Переполнение суммы отклонено", r.status === 422, `got ${r.status}`);

  const badBody = await fetch(`${BASE}/api/inventory/sell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not json",
  });
  check("Некорректный JSON не роняет сервер", badBody.status === 422 || badBody.status === 401,
        `got ${badBody.status}`);

  // ───────────── rate limiting ─────────────
  section("Ограничение частоты");

  const flood = makeClient();
  await flood("/api/auth/register", {
    method: "POST",
    body: { username: `flood_${rnd()}`, password: "secret123" },
  });
  await flood("/api/wallet/deposit", { method: "POST", body: { amount: 50000, method: "card" } });

  const floodRes = await Promise.all(
    Array.from({ length: 90 }, () =>
      flood(`/api/cases/${cheap.slug}/open`, {
        method: "POST",
        headers: { "idempotency-key": "flood_" + rnd() + rnd() },
      }),
    ),
  );
  const limited = floodRes.filter((x) => x.status === 429).length;
  check("Поток запросов упирается в лимит (429)", limited > 0, `limited=${limited}`);
  check("Часть запросов при этом обработана",
        floodRes.filter((x) => x.status === 200).length > 0);

  // ───────────── summary ─────────────
  console.log(
    `\n\x1b[1mИтого: ${passed} пройдено, ${failed} провалено\x1b[0m`,
  );
  if (failed > 0) {
    console.log("Провалены:\n - " + failures.join("\n - "));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
