/**
 * Snapshots the catalogue for the static demo build.
 *
 * The demo that ships to GitHub Pages runs the real UI against an
 * in-browser backend, and that backend needs the same catalogue the
 * server serves. Rather than re-deriving it from the seed files — which
 * would be a second source of truth, free to drift — this boots the real
 * server against a throwaway database and records what its own public API
 * returns. The shapes are therefore correct by construction.
 *
 *   node scripts/build-demo-data.mjs
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.DEMO_PORT ?? 3199);
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(process.cwd(), "public/demo/catalogue.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${BASE}/api/cases`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`сервер не поднялся на :${PORT}`);
}

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zevora-demo-"));
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env: { ...process.env, ZEVORA_DB_FILE: path.join(dir, "demo.db") },
    stdio: "ignore",
    detached: true,
  });

  try {
    await waitForServer();

    const { cases } = await (await fetch(`${BASE}/api/cases`)).json();
    const details = {};
    for (const kase of cases) {
      const res = await fetch(`${BASE}/api/cases/${kase.slug}`);
      if (!res.ok) throw new Error(`${kase.slug} → ${res.status}`);
      details[kase.slug] = await res.json();
    }

    // No timestamp: the snapshot should change when the catalogue does
    // and at no other time, so the diff stays reviewable.
    const payload = { cases, details };

    await fs.mkdir(path.dirname(OUT), { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(payload));

    const items = Object.values(details).reduce((n, d) => n + d.items.length, 0);
    const skins = new Set(
      Object.values(details).flatMap((d) => d.items.map((i) => i.skin_id)),
    );
    const kb = ((await fs.stat(OUT)).size / 1024).toFixed(0);
    console.log(
      `public/demo/catalogue.json — ${cases.length} кейсов, ${items} позиций, ${skins.size} скинов, ${kb} KB`,
    );
  } finally {
    // `next start` spawns a child that holds the port, so the whole group goes.
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
