/**
 * End-to-end simulation.
 *
 * Opens several hundred cases over real HTTP, then reconciles the
 * balance, the ledger, the inventory and the openings table against each
 * other. Any drift between them is a bug in the transaction boundaries.
 */

const BASE = process.env.BASE ?? "http://localhost:3100";
const OPENS = Number(process.env.OPENS ?? 600);
const SLUG = process.env.SLUG ?? "chas-volka";

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
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    return { status: res.status, json: await res.json().catch(() => null) };
  };
}

const rnd = () => Math.random().toString(36).slice(2, 10);

const api = makeClient();
const name = `sim_${rnd()}`;
await api("/api/auth/register", { method: "POST", body: { username: name, password: "secret123" } });

// Top up enough to cover the run.
const caseInfo = (await api(`/api/cases/${SLUG}`)).json;
const price = caseInfo.case.price_minor;
const needMajor = Math.ceil((price * OPENS) / 100) + 1000;
for (let left = needMajor; left > 0; left -= 300000) {
  await api("/api/wallet/deposit", {
    method: "POST",
    body: { amount: Math.min(left, 300000), method: "card" },
  });
}

const startBalance = (await api("/api/auth/me")).json.user.balance_minor;
console.log(`Пользователь ${name}, баланс ${(startBalance / 100).toLocaleString("ru-RU")} ₽`);
console.log(`Открываем «${caseInfo.case.name}» ×${OPENS} по ${(price / 100).toFixed(0)} ₽\n`);

const counts = new Map();
let payout = 0;
let failures = 0;
let rateLimited = 0;
const t0 = Date.now();

// Small batches keep a few requests in flight without hammering the box.
const BATCH = 12;
for (let i = 0; i < OPENS; i += BATCH) {
  const batch = Array.from({ length: Math.min(BATCH, OPENS - i) }, () =>
    api(`/api/cases/${SLUG}/open`, {
      method: "POST",
      headers: { "idempotency-key": `sim_${rnd()}${rnd()}` },
    }),
  );
  for (const res of await Promise.all(batch)) {
    if (res.status === 429) {
      rateLimited++;
      continue;
    }
    if (res.status !== 200) {
      failures++;
      continue;
    }
    const nameWon = res.json.item.market_name;
    counts.set(nameWon, (counts.get(nameWon) ?? 0) + 1);
    payout += res.json.item.price_minor;
  }
}

const elapsed = (Date.now() - t0) / 1000;
const done = OPENS - failures - rateLimited;
console.log(`Открыто ${done} за ${elapsed.toFixed(1)} с (${(done / elapsed).toFixed(0)}/с), ошибок ${failures}, отклонено лимитом ${rateLimited}\n`);

// ── observed vs declared ──
console.log("Предмет                                  ожидание   факт    откл.");
const expectedByName = new Map(caseInfo.items.map((i) => [i.market_name, i.chance]));
for (const [nameWon, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  const exp = (expectedByName.get(nameWon) ?? 0) * done;
  const delta = exp > 0 ? ((n - exp) / exp) * 100 : 0;
  console.log(
    `${nameWon.padEnd(40)} ${exp.toFixed(1).padStart(8)} ${String(n).padStart(6)} ${(delta >= 0 ? "+" : "") + delta.toFixed(1).padStart(6)}%`,
  );
}

// ── reconciliation ──
const endBalance = (await api("/api/auth/me")).json.user.balance_minor;
const inv = (await api("/api/inventory")).json;
const hist = (await api("/api/openings?limit=200")).json;

const spent = done * price;
const expectedBalance = startBalance - spent;

console.log("\n── сверка ──");
const rows = [
  ["Списано по открытиям", spent / 100],
  ["Баланс: ожидаемый", expectedBalance / 100],
  ["Баланс: фактический", endBalance / 100],
  ["Стоимость инвентаря", inv.value_minor / 100],
  ["Сумма выпавшего", payout / 100],
];
for (const [label, value] of rows) {
  console.log(`  ${label.padEnd(24)} ${value.toLocaleString("ru-RU")} ₽`);
}

let ok = true;
function assert(label, cond, detail = "") {
  console.log(`  ${cond ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${label} ${detail}`);
  if (!cond) ok = false;
}

assert("Баланс сходится с суммой списаний", endBalance === expectedBalance,
       `${endBalance} vs ${expectedBalance}`);
assert("Предметов в инвентаре = числу открытий", inv.total === done,
       `${inv.total} vs ${done}`);
assert("Стоимость инвентаря = сумме выпавшего", inv.value_minor === payout,
       `${inv.value_minor} vs ${payout}`);
assert("История открытий содержит все записи", hist.total === done,
       `${hist.total} vs ${done}`);
assert("Все выпавшие предметы есть в таблице кейса",
       [...counts.keys()].every((k) => expectedByName.has(k)));
assert("Баланс неотрицательный", endBalance >= 0);

const rtp = payout / spent;
console.log(`\n  RTP за прогон: ${(rtp * 100).toFixed(1)}%  (маржа ${((1 - rtp) * 100).toFixed(1)}%)`);

process.exit(ok ? 0 : 1);
