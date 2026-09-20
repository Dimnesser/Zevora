"use client";

/**
 * Case-opening audio.
 *
 * Tones are synthesised with the Web Audio API rather than shipped as
 * files: no assets to load, no licensing, and the tick can follow the
 * reel's changing speed exactly.
 */

const STORAGE_KEY = "zevora.sound.muted";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browsers start the context suspended until a user gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* storage can be blocked; muting simply won't persist */
  }
}

function tone(opts: {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
}): void {
  if (isMuted()) return;
  const audio = context();
  if (!audio) return;

  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const t = audio.currentTime;

  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.frequency, t);
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.duration);
  }

  // Quick attack, exponential release — a click rather than a beep.
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(opts.gain ?? 0.05, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);

  osc.connect(amp).connect(audio.destination);
  osc.start(t);
  osc.stop(t + opts.duration + 0.02);
}

/** The reel passing an item. */
export const playTick = () =>
  tone({ frequency: 1250, duration: 0.035, type: "square", gain: 0.035 });

/** Rarity-scaled win chime. */
export function playWin(rarityOrder: number): void {
  const notes =
    rarityOrder >= 6
      ? [523, 659, 784, 1047]
      : rarityOrder >= 4
        ? [523, 659, 784]
        : [440, 554];
  notes.forEach((frequency, i) => {
    setTimeout(
      () => tone({ frequency, duration: 0.3, type: "triangle", gain: 0.07 }),
      i * 90,
    );
  });
}

export const playFail = () =>
  tone({ frequency: 320, sweepTo: 150, duration: 0.4, type: "sawtooth", gain: 0.05 });

export const playClick = () =>
  tone({ frequency: 700, duration: 0.05, type: "sine", gain: 0.04 });
