/**
 * Builds the static demo for GitHub Pages.
 *
 * `output: 'export'` refuses to run while route handlers exist, and the
 * admin panel has no meaning without a server, so both are moved aside
 * for the duration of the build and restored in `finally` — including
 * when the build fails, which is the whole reason the move is scripted
 * rather than done by hand.
 *
 *   node scripts/build-static.mjs
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_PATH = process.env.ZEVORA_BASE_PATH ?? "/Zevora";
const OUT = path.join(ROOT, "docs");

/** Paths that cannot exist in a static export, and where they go meanwhile. */
const ASIDE = [
  ["app/api", ".static-build/api"],
  ["app/admin", ".static-build/admin"],
];

const STASH = path.join(ROOT, ".static-build");

function move(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → ${res.status}`);
}

function main() {
  const moved = [];
  try {
    for (const [src, dest] of ASIDE) {
      const from = path.join(ROOT, src);
      if (!fs.existsSync(from)) continue;
      const to = path.join(ROOT, dest);
      move(from, to);
      moved.push([to, from]);
    }

    console.log(`→ сборка статики (basePath ${BASE_PATH || "/"})`);
    run("npx", ["next", "build"], {
      ZEVORA_STATIC: "1",
      ZEVORA_BASE_PATH: BASE_PATH,
      NEXT_PUBLIC_ZEVORA_STATIC: "1",
      NEXT_PUBLIC_ZEVORA_BASE_PATH: BASE_PATH,
    });
  } finally {
    for (const [from, to] of moved.reverse()) move(from, to);
    fs.rmSync(STASH, { recursive: true, force: true });
  }

  // `out/` replaces docs/ wholesale: a stale file left behind from an
  // earlier build would still be served by Pages.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.renameSync(path.join(ROOT, "out"), OUT);

  // Pages runs Jekyll otherwise, which drops every _next/ directory.
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

  // A 404 that serves the app shell, so a deep link typed by hand still
  // lands somewhere useful instead of on GitHub's own error page.
  const notFound = path.join(OUT, "404.html");
  if (!fs.existsSync(notFound)) {
    fs.copyFileSync(path.join(OUT, "index.html"), notFound);
  }

  const count = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).reduce(
      (n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1),
      0,
    );
  console.log(`docs/ — ${count(OUT)} файлов`);
}

main();
