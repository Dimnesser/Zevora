/**
 * Renders the Zevora case artwork.
 *
 * The design lives in Figma ("Zevora — Cases", frame `master/case` plus the
 * 25 repainted clones). This script is the production port of that file: the
 * same 3/4 hard-case geometry, the same shading stack, the same decal marks —
 * emitted as SVG and rasterised to WebP so the site ships real files instead
 * of depending on a Figma export.
 *
 *   npm run build:cases              all 25 cases → public/cases/*.webp
 *   npm run build:cases -- --png     keep PNG instead of WebP
 *   npm run build:cases -- --scale 2 render at 2x
 *
 * Geometry (640 x 480 canvas, light from the upper left):
 *
 *   X0..X1        front face, axis aligned
 *   DX, DY        depth vector toward the back right
 *   LID_T..LID_B  lid band, BODY_T..BODY_B the body below the seam
 */

import fs from "node:fs";
import path from "node:path";
import { CASES } from "./case-catalogue.mjs";

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const OUT = path.join(process.cwd(), "public", "cases");
const SCALE = Number(val("--scale", "1")) || 1;
const AS_PNG = flag("--png");

/* ───────────────────────── colour ───────────────────────── */

const rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const css = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
/** Toward white by `w`. */
const lighten = (c, w) => c.map((v) => v + (255 - v) * w);
/** Toward black by `w`. */
const darken = (c, w) => c.map((v) => v * (1 - w));

/* ───────────────────────── geometry ───────────────────────── */

const X0 = 118, X1 = 418, DX = 118, DY = -58;
const LID_T = 196, LID_B = 262, BODY_T = 266, BODY_B = 392, SEAM = 264;

/** Rounded rectangle with per-corner radii, as a path. */
function rrect(x, y, w, h, tl, tr, br, bl) {
  return [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`, `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}`,
    `V ${y + h - br}`, `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}`,
    `H ${x + bl}`, `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}`,
    `V ${y + tl}`, `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}`,
    "Z",
  ].join(" ");
}
const quad = (...p) => `M ${p.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;

/* ───────────────────────── decal marks ───────────────────────── */

const C = 60;
const poly = (pts) => `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`;
const ngon = (n, r, rot = -Math.PI / 2) =>
  poly(Array.from({ length: n }, (_, k) => {
    const a = rot + (k * 2 * Math.PI) / n;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }));
const star = (n, ro, ri, rot = -Math.PI / 2) =>
  poly(Array.from({ length: n * 2 }, (_, k) => {
    const r = k % 2 ? ri : ro, a = rot + (k * Math.PI) / n;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }));
const barsOf = (hs) =>
  hs.map((h, i) => poly([[C - 28 + i * 13, C - h], [C - 22 + i * 13, C - h],
                         [C - 22 + i * 13, C + h], [C - 28 + i * 13, C + h]])).join(" ");
const chevOf = () =>
  [0, 1, 2].map((i) => poly([[C - 25, C - 27 + i * 20], [C, C - 13 + i * 20], [C + 25, C - 27 + i * 20],
                             [C + 25, C - 18 + i * 20], [C, C - 4 + i * 20], [C - 25, C - 18 + i * 20]])).join(" ");

export const MARKS = {
  bolt: poly([[C+9,C-30],[C-17,C+4],[C-2,C+4],[C-9,C+30],[C+17,C-4],[C+2,C-4]]),
  tri: ngon(3, 28),
  hex: ngon(6, 27),
  sq: ngon(4, 26),
  pent: ngon(5, 28),
  bars: barsOf([12, 22, 29, 18, 10]),
  chev: chevOf(),
  fang: poly([[C-21,C-24],[C+21,C-24],[C+9,C+8],[C,C+28],[C-9,C+8]]),
  drop: poly([[C,C-30],[C+17,C-6],[C+19,C+9],[C+10,C+23],[C-10,C+23],[C-19,C+9],[C-17,C-6]]),
  rain: [-1, 0, 1].map((i) => poly([[C+i*19-5,C-26],[C+i*19+5,C-26],[C+i*19-1,C+24],[C+i*19-11,C+24]])).join(" "),
  star4: star(4, 31, 10),
  star5: star(5, 30, 13),
  star6: star(6, 30, 12),
  star8: star(8, 31, 12),
  cross: poly([[C-8,C-29],[C+8,C-29],[C+8,C-8],[C+29,C-8],[C+29,C+8],[C+8,C+8],
               [C+8,C+29],[C-8,C+29],[C-8,C+8],[C-29,C+8],[C-29,C-8],[C-8,C-8]]),
  blade: poly([[C-7,C-30],[C+9,C-21],[C+11,C+12],[C,C+30],[C-11,C+12],[C-9,C-17]]),
  crosshair: [poly([[C-3,C-30],[C+3,C-30],[C+3,C-11],[C-3,C-11]]),
              poly([[C-3,C+11],[C+3,C+11],[C+3,C+30],[C-3,C+30]]),
              poly([[C-30,C-3],[C-11,C-3],[C-11,C+3],[C-30,C+3]]),
              poly([[C+11,C-3],[C+30,C-3],[C+30,C+3],[C+11,C+3]]),
              ngon(4, 9)].join(" "),
  rift: [poly([[C-28,C-25],[C-7,C-25],[C-13,C],[C-7,C+25],[C-28,C+25]]),
         poly([[C+28,C-25],[C+7,C-25],[C+13,C],[C+7,C+25],[C+28,C+25]])].join(" "),
  crown: poly([[C-27,C+17],[C-27,C-17],[C-14,C-2],[C,C-25],[C+14,C-2],[C+27,C-17],[C+27,C+17]]),
  diamond: poly([[C,C-30],[C+24,C-6],[C,C+30],[C-24,C-6]]),
};

/** Bounding box of a path made only of straight segments. */
function bbox(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = [], ys = [];
  for (let i = 0; i < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/* ───────────────────────── the case ───────────────────────── */

/**
 * @param part "full" renders the whole case; "lid" and "body" render the
 *   two halves in the same 640x480 space so they stack pixel-perfectly.
 *   The opening animation hinges the lid layer off the body layer.
 */
export function caseSvg({ shell, ink, mark }, part = "full") {
  const base = rgb(shell);
  const L = (w) => css(lighten(base, w));
  const D = (w) => css(darken(base, w));
  const inkC = rgb(ink);

  const markPath = MARKS[mark] ?? MARKS.hex;
  const mb = bbox(markPath);
  const PLATE = { x: 252, y: SEAM + 18, r: 44 };
  const mx = PLATE.x + PLATE.r - (mb.x + mb.w / 2);
  const my = PLATE.y + PLATE.r - (mb.y + mb.h / 2);

  const ribs = Array.from({ length: 6 }, (_, i) =>
    `<rect x="${X0 + 56 + i * 12}" y="${SEAM + 30}" width="4" height="52" rx="2" fill="url(#rib)"/>`).join("");

  const vents = Array.from({ length: 3 }, (_, i) => {
    const x = X0 + 104 + i * 60, y = LID_T - 18;
    return `<path d="${quad([x, y], [x + 42, y], [x + 59, y - 8.5], [x + 17, y - 8.5])}" fill="${D(0.86)}" opacity=".62"/>` +
           `<path d="${quad([x + 17, y - 9.5], [x + 59, y - 9.5], [x + 59, y - 8], [x + 17, y - 8])}" fill="#fff" opacity=".2"/>`;
  }).join("");

  const latches = [X0 + 64, X1 - 112].map((lx) =>
    `<g filter="url(#lift)">
       <path d="${rrect(lx, SEAM - 20, 48, 46, 8, 8, 8, 8)}" fill="url(#metal)" stroke="#000" stroke-opacity=".55"/>
       <rect x="${lx + 4}" y="${SEAM - 18}" width="40" height="2" fill="#C9D3E6" opacity=".55"/>
       <circle cx="${lx + 23.5}" cy="${SEAM - 9.5}" r="3.5" fill="#99A3B5" opacity=".8"/>
       <path d="${rrect(lx + 9, SEAM + 6, 30, 12, 4, 4, 4, 4)}" fill="url(#clip)"/>
     </g>`).join("");

  const bumpers = [[X0 + 6, "left"], [X1 - 40, "right"]].map(([bx]) =>
    `<g filter="url(#lift)">
       <path d="${rrect(bx, LID_T + 5, 34, BODY_B - LID_T - 10, 12, 12, 12, 12)}" fill="url(#bump)"/>
       <rect x="${bx + 3}" y="${LID_T + 15}" width="2" height="${BODY_B - LID_T - 30}" fill="#fff" opacity=".26"/>
     </g>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
<defs>
  <linearGradient id="lidTop" gradientUnits="userSpaceOnUse" x1="200" y1="146" x2="470" y2="200">
    <stop offset="0" stop-color="${L(0.30)}"/><stop offset=".55" stop-color="${L(0.06)}"/><stop offset="1" stop-color="${D(0.18)}"/>
  </linearGradient>
  <linearGradient id="lidSide" gradientUnits="userSpaceOnUse" x1="418" y1="196" x2="536" y2="300">
    <stop offset="0" stop-color="${D(0.42)}"/><stop offset="1" stop-color="${D(0.66)}"/>
  </linearGradient>
  <linearGradient id="lidFront" gradientUnits="userSpaceOnUse" x1="118" y1="196" x2="118" y2="262">
    <stop offset="0" stop-color="${L(0.14)}"/><stop offset=".5" stop-color="${L(0)}"/><stop offset="1" stop-color="${D(0.26)}"/>
  </linearGradient>
  <linearGradient id="bodySide" gradientUnits="userSpaceOnUse" x1="418" y1="266" x2="536" y2="392">
    <stop offset="0" stop-color="${D(0.46)}"/><stop offset="1" stop-color="${D(0.74)}"/>
  </linearGradient>
  <linearGradient id="bodyFront" gradientUnits="userSpaceOnUse" x1="118" y1="266" x2="118" y2="392">
    <stop offset="0" stop-color="${L(0.10)}"/><stop offset=".42" stop-color="${L(0)}"/><stop offset="1" stop-color="${D(0.40)}"/>
  </linearGradient>
  <linearGradient id="gap" gradientUnits="userSpaceOnUse" x1="118" y1="261" x2="118" y2="267">
    <stop offset="0" stop-color="${D(0.88)}"/><stop offset="1" stop-color="${D(0.66)}"/>
  </linearGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4C5468"/><stop offset=".34" stop-color="#2B313E"/>
    <stop offset=".66" stop-color="#171B24"/><stop offset="1" stop-color="#0A0C11"/>
  </linearGradient>
  <linearGradient id="clip" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#C3CCDC"/><stop offset=".5" stop-color="#8B94A6"/><stop offset="1" stop-color="#4E5666"/>
  </linearGradient>
  <linearGradient id="bump" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity=".20"/><stop offset=".35" stop-color="#fff" stop-opacity=".05"/>
    <stop offset=".62" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".24"/>
  </linearGradient>
  <linearGradient id="rib" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset=".5" stop-color="#000" stop-opacity=".18"/>
    <stop offset="1" stop-color="#000" stop-opacity=".05"/>
  </linearGradient>
  <linearGradient id="aoTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${D(0.92)}" stop-opacity=".62"/><stop offset="1" stop-color="${D(0.92)}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="aoBot" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${D(0.92)}" stop-opacity="0"/><stop offset="1" stop-color="${D(0.92)}" stop-opacity=".5"/>
  </linearGradient>
  <linearGradient id="edge" gradientUnits="userSpaceOnUse" x1="118" y1="0" x2="418" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/>
  </linearGradient>
  <linearGradient id="corner" gradientUnits="userSpaceOnUse" x1="0" y1="196" x2="0" y2="392">
    <stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/>
  </linearGradient>
  <linearGradient id="spec" gradientUnits="userSpaceOnUse" x1="140" y1="200" x2="420" y2="150">
    <stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="plateG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/>
  </linearGradient>
  <linearGradient id="inkG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${css(inkC.map((v) => Math.min(255, v * 1.15)))}"/>
    <stop offset="1" stop-color="${css(inkC.map((v) => v * 0.72))}"/>
  </linearGradient>
  <filter id="pool" x="-30%" y="-120%" width="160%" height="360%"><feGaussianBlur stdDeviation="15"/></filter>
  <filter id="core" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="soft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="lift" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="#0F0004" flood-opacity=".5"/>
  </filter>
  <filter id="emboss" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity=".6"/>
  </filter>
</defs>

${part === "lid" ? "" : `
<ellipse cx="355" cy="397" rx="225" ry="29" fill="#05060C" opacity=".45" filter="url(#pool)"/>
<ellipse cx="283" cy="394" rx="155" ry="12" fill="#05060C" opacity=".8" filter="url(#core)"/>`}

${part === "body" ? "" : `
<path d="${quad([X0, LID_T], [X1, LID_T], [X1 + DX, LID_T + DY], [X0 + DX, LID_T + DY])}" fill="url(#lidTop)"/>
<path d="${quad([X0 + 26, LID_T - 4], [X1 - 90, LID_T - 4], [X1 - 90 + DX * 0.55, LID_T - 4 + DY * 0.55], [X0 + 26 + DX * 0.55, LID_T - 4 + DY * 0.55])}" fill="url(#spec)" filter="url(#soft)"/>
<path d="${quad([X1, LID_T], [X1 + DX, LID_T + DY], [X1 + DX, LID_B + DY], [X1, LID_B])}" fill="url(#lidSide)"/>
<path d="${rrect(X0, LID_T, X1 - X0, LID_B - LID_T, 13, 3, 2, 4)}" fill="url(#lidFront)"/>
<path d="${rrect(X0, LID_T, X1 - X0, LID_B - LID_T, 13, 3, 2, 4)}" fill="url(#aoBot)" opacity=".8"/>

${vents}
<rect x="${X0 + 14}" y="${LID_T + 0.5}" width="${X1 - X0 - 26}" height="2.5" fill="url(#edge)"/>
<rect x="${X0 + 5}" y="${LID_B - 2.5}" width="${X1 - X0 - 10}" height="2" fill="#fff" opacity=".2"/>
<path d="${quad([X0 + DX, LID_T + DY], [X1 + DX, LID_T + DY], [X1 + DX, LID_T + DY + 2], [X0 + DX, LID_T + DY + 2])}" fill="#fff" opacity=".22"/>
`}

${part === "lid" ? "" : `
<rect x="${X0}" y="${LID_B - 1}" width="${X1 - X0}" height="6" fill="url(#gap)"/>
<path d="${quad([X1, LID_B - 1], [X1 + DX, LID_B - 1 + DY], [X1 + DX, BODY_T + 1 + DY], [X1, BODY_T + 1])}" fill="${D(0.9)}"/>

<path d="${quad([X1, BODY_T], [X1 + DX, BODY_T + DY], [X1 + DX, BODY_B + DY], [X1, BODY_B])}" fill="url(#bodySide)"/>
<path d="${rrect(X0, BODY_T, X1 - X0, BODY_B - BODY_T, 4, 2, 4, 16)}" fill="url(#bodyFront)"/>
<path d="${rrect(X0, BODY_T, X1 - X0, BODY_B - BODY_T, 4, 2, 4, 16)}" fill="url(#aoTop)"/>
<path d="${rrect(X0, BODY_T, X1 - X0, BODY_B - BODY_T, 4, 2, 4, 16)}" fill="url(#aoBot)"/>

<rect x="${X0 + 5}" y="${BODY_T + 0.5}" width="${X1 - X0 - 10}" height="2" fill="#fff" opacity=".16"/>
<rect x="${X1 - 2}" y="${BODY_T}" width="2.5" height="${BODY_B - BODY_T}" fill="url(#corner)"/>

${bumpers}
${latches}

<path d="${quad([X1 + 28, SEAM + 72], [X1 + 100, SEAM + 36], [X1 + 100, SEAM + 64], [X1 + 28, SEAM + 100])}" fill="#0A0104" opacity=".85"/>
<path d="${quad([X1 + 32, SEAM + 70], [X1 + 96, SEAM + 38], [X1 + 96, SEAM + 52], [X1 + 32, SEAM + 84])}" fill="url(#metal)"/>

${ribs}

<circle cx="${PLATE.x + PLATE.r}" cy="${PLATE.y + PLATE.r}" r="${PLATE.r}" fill="url(#plateG)" stroke="#fff" stroke-opacity=".13" stroke-width="1.5"/>
<g transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})" filter="url(#emboss)">
  <path d="${markPath}" fill="url(#inkG)" fill-rule="nonzero"/>
</g>

<text x="${X0 + 58}" y="${BODY_B - 16}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="3.2" fill="#1A0308" fill-opacity=".6">ZEVORA</text>
<text x="${X0 + 58}" y="${BODY_B - 17.5}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="3.2" fill="#fff" fill-opacity=".24">ZEVORA</text>
`}
</svg>`;
}

/* ───────────────────────── main ───────────────────────── */

async function main() {
  const sharp = (await import("sharp")).default;
  fs.mkdirSync(OUT, { recursive: true });

  const ext = AS_PNG ? "png" : "webp";
  // Three files per case: the whole thing for cards and listings, plus the
  // two halves the opening animation hinges apart.
  const PARTS = [["full", ""], ["lid", "-lid"], ["body", "-body"]];
  let n = 0;
  for (const c of CASES) {
    const sizes = [];
    for (const [part, suffix] of PARTS) {
      const buf = Buffer.from(caseSvg(c, part));
      const img = sharp(buf, { density: 72 * SCALE }).resize(640 * SCALE, 480 * SCALE, { fit: "fill" });
      const out = path.join(OUT, `${c.slug}${suffix}.${ext}`);
      const info = await (AS_PNG ? img.png({ compressionLevel: 9 }) : img.webp({ quality: 92 })).toFile(out);
      sizes.push(`${part} ${(info.size / 1024).toFixed(0)}К`);
    }
    console.log(`  ✓ ${c.slug.padEnd(20)} ${sizes.join("  ")}`);
    n += 1;
  }
  console.log(`\n${n} кейсов × 3 слоя → public/cases/*.${ext}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
