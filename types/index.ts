/**
 * Shared types for the presentation layer.
 *
 * The economy's domain model now lives in the database and is surfaced
 * through `lib/client/api.ts`; what remains here is what the artwork and
 * the partner tier ladder need.
 */

/** CS2 weapon families — selects the procedural silhouette. */
export type WeaponKind =
  | "rifle-ak"
  | "rifle-m4"
  | "sniper"
  | "smg"
  | "shotgun"
  | "pistol"
  | "pistol-heavy"
  | "knife-karambit"
  | "knife-bayonet"
  | "knife-butterfly"
  | "gloves"
  | "sticker"
  | "agent";

/** Partner ladder. Levels are granted by the owner, never earned. */
export type PartnerTier = "partner" | "creator" | "elite" | "ambassador";
