import { describe, expect, it, vi } from 'vitest';

import {
  createTts,
  germanVoiceAvailable,
  pickGermanVoice,
  SLOW_RATE,
  type TtsEnv,
} from '../../src/services/tts.ts';

describe('pickGermanVoice', () => {
  it('prefers de-DE, accepts other German voices and underscores, and ignores the rest', () => {
    expect(pickGermanVoice([{ lang: 'en-US' }, { lang: 'de-AT' }, { lang: 'de-DE' }])).toEqual({
      lang: 'de-DE',
    });
    expect(pickGermanVoice([{ lang: 'en-US' }, { lang: 'de-AT' }])).toEqual({ lang: 'de-AT' });
    expect(pickGermanVoice([{ lang: 'de_CH' }])).toEqual({ lang: 'de_CH' });
    expect(pickGermanVoice([{ lang: 'de' }])).toEqual({ lang: 'de' });
    expect(pickGermanVoice([{ lang: 'en-US' }, { lang: 'dev-XX' }, { lang: 'nl-NL' }])).toBeNull();
    expect(pickGermanVoice([])).toBeNull();
  });
});

function fakeEnv(voices: { lang: string }[]) {
  const spoken: { text: string; rate: number; lang: string }[] = [];
  const listeners: (() => void)[] = [];
  const state = { voices, cancelled: 0 };
  const env: TtsEnv = {
    synth: {
      getVoices: () => state.voices,
      speak: ((u: { text: string; rate: number; lang: string }) => spoken.push(u)) as never,
      cancel: () => {
        state.cancelled += 1;
      },
      addEventListener: (_t, l) => {
        listeners.push(l);
      },
      removeEventListener: (_t, l) => {
        listeners.splice(listeners.indexOf(l), 1);
      },
    },
    makeUtterance: (text) => ({ text, lang: '', rate: 1, voice: null }) as never,
  };
  return { env, spoken, listeners, state };
}

describe('tts', () => {
  it('finds a voice that is there at once, and speaks with its language and the rate', async () => {
    const { env, spoken, state } = fakeEnv([{ lang: 'de-DE' }]);
    const tts = createTts(env);
    expect(tts.known()).toBeNull();
    expect(await tts.ready()).toBe(true);
    expect(tts.known()).toBe(true);
    tts.speak('Kopf');
    tts.speak('Kopf', SLOW_RATE);
    expect(spoken).toEqual([
      expect.objectContaining({ text: 'Kopf', lang: 'de-DE', rate: 1 }),
      expect.objectContaining({ rate: 0.8 }),
    ]);
    expect(state.cancelled).toBe(2);
    tts.cancel();
    expect(state.cancelled).toBe(3);
  });

  it('waits for voices that arrive a moment later', async () => {
    const { env, listeners, state } = fakeEnv([]);
    const tts = createTts(env, 1000);
    const ready = tts.ready();
    state.voices = [{ lang: 'de-DE' }];
    listeners.forEach((listener) => listener());
    expect(await ready).toBe(true);
    expect(listeners).toHaveLength(0);
  });

  it('ignores a voices event that brings no German voice, then gives up after the wait', async () => {
    vi.useFakeTimers();
    const { env, listeners, state } = fakeEnv([]);
    const tts = createTts(env, 1000);
    const ready = tts.ready();
    state.voices = [{ lang: 'en-US' }];
    listeners.forEach((listener) => listener());
    await vi.advanceTimersByTimeAsync(1000);
    expect(await ready).toBe(false);
    vi.useRealTimers();
  });

  it('does nothing without a voice or without speech synthesis', async () => {
    const none = fakeEnv([]);
    const tts = createTts(none.env, 5);
    expect(await tts.ready()).toBe(false);
    tts.speak('Kopf');
    expect(none.spoken).toEqual([]);
    const unsupported = createTts({
      synth: null,
      makeUtterance: () => ({ lang: '', rate: 1, voice: null }),
    });
    expect(await unsupported.ready()).toBe(false);
    unsupported.speak('Kopf');
    unsupported.cancel();
  });

  it('looks once and remembers', async () => {
    const { env } = fakeEnv([{ lang: 'de-DE' }]);
    const tts = createTts(env);
    expect(tts.ready()).toBe(tts.ready());
  });

  it('the browser instance reports no voice here, quickly', async () => {
    expect(await germanVoiceAvailable(20)).toBe(false);
  });
});
