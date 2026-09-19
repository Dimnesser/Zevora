import type { WeaponKind } from "@/types";

/**
 * Stylised CS2 weapon silhouettes, drawn as composite shapes in a
 * 400 × 160 viewBox. Each shape is filled with the skin finish, so the
 * artwork changes entirely with the palette and pattern.
 */
export interface Shape {
  d: string;
  /** Darker structural part (grips, scopes, sights) — not painted by the finish. */
  hardware?: boolean;
}

export const WEAPON_SHAPES: Record<WeaponKind, Shape[]> = {
  "rifle-ak": [
    // stock
    { d: "M14 104 L66 84 L80 100 L34 122 L14 118 Z" },
    // receiver
    { d: "M66 70 H206 V100 H66 Z" },
    // top cover rail
    { d: "M84 62 H196 V72 H84 Z" },
    // banana magazine
    {
      d: "M132 98 C126 118 134 138 156 146 L180 140 C162 132 154 116 158 98 Z",
    },
    // pistol grip
    { d: "M96 98 L124 98 L114 138 L92 134 Z", hardware: true },
    // trigger guard
    { d: "M124 98 H154 V108 H124 Z", hardware: true },
    // handguard
    { d: "M206 72 H278 V98 H206 Z" },
    // gas tube
    { d: "M206 58 H272 V70 H206 Z" },
    // barrel
    { d: "M278 78 H352 V90 H278 Z" },
    // front sight
    { d: "M344 60 H356 V80 H344 Z", hardware: true },
    // muzzle
    { d: "M352 74 H372 V94 H352 Z", hardware: true },
  ],

  "rifle-m4": [
    // buffer tube + stock
    { d: "M12 76 H62 V102 H12 Z" },
    { d: "M20 70 H58 V80 H20 Z", hardware: true },
    // receiver
    { d: "M62 68 H196 V104 H62 Z" },
    // flat-top rail
    { d: "M96 58 H206 V68 H96 Z" },
    // carry handle block
    { d: "M120 44 H176 V58 H120 Z", hardware: true },
    // straight magazine
    { d: "M148 102 L184 102 L182 148 L152 148 Z" },
    // grip
    { d: "M92 102 L120 102 L112 140 L88 136 Z", hardware: true },
    // trigger guard
    { d: "M120 102 H150 V112 H120 Z", hardware: true },
    // handguard
    { d: "M196 66 H300 V102 H196 Z" },
    // handguard vents
    { d: "M212 74 H288 V80 H212 Z", hardware: true },
    { d: "M212 88 H288 V94 H212 Z", hardware: true },
    // barrel + muzzle
    { d: "M300 78 H348 V90 H300 Z" },
    { d: "M348 72 H374 V96 H348 Z", hardware: true },
  ],

  sniper: [
    // thumbhole stock
    { d: "M10 84 H74 V122 H10 Z" },
    { d: "M28 96 H58 V116 H28 Z", hardware: true },
    // cheek rest
    { d: "M40 70 H108 V86 H40 Z" },
    // receiver
    { d: "M74 78 H208 V112 H74 Z" },
    // scope tube
    { d: "M104 40 H236 V62 H104 Z", hardware: true },
    // scope bells
    { d: "M96 34 H116 V68 H96 Z", hardware: true },
    { d: "M228 32 H252 V70 H228 Z", hardware: true },
    // scope mounts
    { d: "M124 62 H142 V78 H124 Z", hardware: true },
    { d: "M196 62 H214 V78 H196 Z", hardware: true },
    // bolt handle
    { d: "M186 104 L214 104 L222 124 L196 124 Z", hardware: true },
    // grip
    { d: "M96 112 L124 112 L118 148 L94 144 Z", hardware: true },
    // magazine
    { d: "M148 112 H186 V142 H148 Z" },
    // fore-end
    { d: "M208 82 H302 V110 H208 Z" },
    // barrel
    { d: "M302 88 H364 V102 H302 Z" },
    { d: "M364 84 H382 V106 H364 Z", hardware: true },
  ],

  smg: [
    // stock
    { d: "M22 80 H70 V100 H22 Z" },
    // receiver
    { d: "M70 70 H214 V106 H70 Z" },
    // rail
    { d: "M94 60 H198 V70 H94 Z", hardware: true },
    // magazine (through grip)
    { d: "M112 106 L148 106 L144 152 L116 152 Z" },
    // grip shell
    { d: "M104 104 H156 V122 H104 Z", hardware: true },
    // trigger guard
    { d: "M156 106 H184 V116 H156 Z", hardware: true },
    // handguard
    { d: "M214 76 H272 V102 H214 Z" },
    // barrel
    { d: "M272 82 H320 V94 H272 Z" },
    { d: "M320 76 H342 V100 H320 Z", hardware: true },
  ],

  shotgun: [
    // stock
    { d: "M12 82 L68 68 L82 92 L30 116 L12 112 Z" },
    // receiver
    { d: "M68 66 H176 V104 H68 Z" },
    // grip
    { d: "M84 102 L112 102 L104 136 L82 132 Z", hardware: true },
    // trigger guard
    { d: "M112 102 H142 V112 H112 Z", hardware: true },
    // pump
    { d: "M206 84 H268 V112 H206 Z" },
    // magazine tube
    { d: "M176 96 H326 V110 H176 Z" },
    // barrel
    { d: "M176 74 H340 V92 H176 Z" },
    // front bead
    { d: "M328 66 H338 V76 H328 Z", hardware: true },
  ],

  pistol: [
    // slide
    { d: "M92 54 H310 V88 H92 Z" },
    // serrations
    { d: "M262 60 H300 V82 H262 Z", hardware: true },
    // frame
    { d: "M96 88 H262 V106 H96 Z" },
    // grip
    { d: "M104 104 L166 104 L150 154 L104 154 Z" },
    // grip texture
    { d: "M114 116 H152 V146 H114 Z", hardware: true },
    // trigger guard
    { d: "M166 104 H214 V116 H166 Z", hardware: true },
    // rear sight
    { d: "M100 44 H118 V56 H100 Z", hardware: true },
    // front sight
    { d: "M288 44 H302 V56 H288 Z", hardware: true },
    // suppressor-ready muzzle
    { d: "M310 62 H336 V82 H310 Z", hardware: true },
  ],

  "pistol-heavy": [
    // slide (angular, Deagle profile)
    { d: "M70 44 H322 V92 H70 Z" },
    // top rib
    { d: "M96 34 H296 V46 H96 Z", hardware: true },
    // frame
    { d: "M78 92 H258 V112 H78 Z" },
    // grip
    { d: "M86 110 L162 110 L142 158 L88 158 Z" },
    { d: "M98 122 H144 V150 H98 Z", hardware: true },
    // trigger guard
    { d: "M162 110 H216 V124 H162 Z", hardware: true },
    // sights
    { d: "M78 24 H100 V36 H78 Z", hardware: true },
    { d: "M292 24 H310 V36 H292 Z", hardware: true },
    // muzzle
    { d: "M322 56 H348 V84 H322 Z", hardware: true },
  ],

  "knife-karambit": [
    // curved blade
    {
      d: "M322 30 C218 22 118 62 68 136 C128 96 208 72 274 78 C252 58 236 42 222 32 Z",
    },
    // spine highlight
    {
      d: "M308 42 C220 38 138 70 98 122 C148 86 218 66 280 70 Z",
      hardware: true,
    },
    // handle
    { d: "M68 136 L116 108 L142 146 L94 172 Z" },
    // finger ring (painted, so the finish carries through)
    {
      d: "M66 146 m-32 0 a32 32 0 1 0 64 0 a32 32 0 1 0 -64 0 M66 146 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0",
    },
  ],

  "knife-bayonet": [
    // blade
    { d: "M150 62 L338 62 L372 82 L338 102 L150 102 Z" },
    // fuller
    { d: "M178 76 H320 V88 H178 Z", hardware: true },
    // guard
    { d: "M136 48 H158 V118 H136 Z", hardware: true },
    // handle
    { d: "M46 70 H136 V96 H46 Z" },
    // pommel
    { d: "M28 66 H50 V100 H28 Z", hardware: true },
    // grip rings
    { d: "M66 70 H74 V96 H66 Z", hardware: true },
    { d: "M92 70 H100 V96 H92 Z", hardware: true },
    { d: "M118 70 H126 V96 H118 Z", hardware: true },
  ],

  "knife-butterfly": [
    // blade
    { d: "M186 58 L346 58 L378 80 L346 102 L186 102 Z" },
    { d: "M210 72 H328 V88 H210 Z", hardware: true },
    // pivot
    { d: "M168 68 H190 V92 H168 Z", hardware: true },
    // handle A (up)
    { d: "M46 46 L176 46 L176 70 L46 70 Z" },
    // handle B (down)
    { d: "M46 92 L176 92 L176 116 L46 116 Z" },
    // latch
    { d: "M40 62 H58 V100 H40 Z", hardware: true },
  ],

  gloves: [
    // cuff
    { d: "M30 56 L74 44 L74 138 L30 126 Z", hardware: true },
    // palm
    {
      d: "M74 42 H198 C222 42 238 58 238 82 V116 C238 140 222 156 198 156 H74 Z",
    },
    // index finger
    {
      d: "M234 50 H292 C302 50 310 58 310 68 C310 78 302 86 292 86 H234 Z",
    },
    // middle finger
    {
      d: "M234 90 H306 C316 90 324 98 324 108 C324 118 316 126 306 126 H234 Z",
    },
    // ring finger
    {
      d: "M234 130 H286 C296 130 304 138 304 148 C304 158 296 166 286 166 H234 Z",
    },
    // thumb
    { d: "M92 44 C92 24 108 10 128 10 C148 10 164 24 164 44 Z" },
    // knuckle plate
    { d: "M104 62 H206 V104 H104 Z", hardware: true },
    // strap
    { d: "M74 118 H196 V132 H74 Z", hardware: true },
  ],

  sticker: [
    { d: "M100 32 H300 V132 H100 Z" },
    { d: "M120 52 H280 V112 H120 Z", hardware: true },
  ],

  agent: [
    // head
    { d: "M170 20 m0 26 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0" },
    // torso
    { d: "M148 74 H248 V150 H148 Z" },
    // arms
    { d: "M112 78 H148 V140 H112 Z", hardware: true },
    { d: "M248 78 H284 V140 H248 Z", hardware: true },
  ],
};

/** Some silhouettes read better slightly rotated. */
export const WEAPON_TILT: Partial<Record<WeaponKind, number>> = {
  pistol: -8,
  "pistol-heavy": -8,
  "knife-karambit": -6,
  "knife-bayonet": -10,
  "knife-butterfly": -10,
  gloves: -4,
};
