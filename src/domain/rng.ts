// Seeded randomness. The engine never calls Math.random: callers pass an Rng in.
import type { Rng } from './types.ts';

/** mulberry32. The same seed always gives the same sequence. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new RangeError('Cannot pick from an empty list');
  return items[Math.floor(rng() * items.length)] as T;
}
