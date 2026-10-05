// Speech synthesis for German audio (docs/04-TRD.md section 9, Speech). Not speech recognition.

export type VoiceLike = { lang: string };

type UtteranceLike = { lang: string; rate: number; voice: unknown };

export type TtsEnv = {
  synth: {
    getVoices(): VoiceLike[];
    speak(utterance: never): void;
    cancel(): void;
    addEventListener(type: 'voiceschanged', listener: () => void): void;
    removeEventListener(type: 'voiceschanged', listener: () => void): void;
  } | null;
  makeUtterance(text: string): UtteranceLike;
};

const normaliseLang = (lang: string) => lang.toLowerCase().replace('_', '-');

/** A voice whose language starts with `de`, preferring `de-DE`. */
export function pickGermanVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const german = voices.filter((voice) => /^de(-|$)/.test(normaliseLang(voice.lang)));
  return german.find((voice) => normaliseLang(voice.lang) === 'de-de') ?? german[0] ?? null;
}

export const NORMAL_RATE = 1;
export const SLOW_RATE = 0.8;

export function createTts(env: TtsEnv, waitMs = 1000) {
  let voice: VoiceLike | null = null;
  let ready: Promise<boolean> | null = null;

  function load(): Promise<boolean> {
    const synth = env.synth;
    if (synth === null) return Promise.resolve(false);
    voice = pickGermanVoice(synth.getVoices());
    if (voice !== null) return Promise.resolve(true);
    // Browsers often fill the voice list a moment after load.
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        synth.removeEventListener('voiceschanged', onChange);
        resolve(voice !== null);
      };
      const onChange = () => {
        voice = pickGermanVoice(synth.getVoices());
        if (voice !== null) finish();
      };
      const timer = setTimeout(finish, waitMs);
      synth.addEventListener('voiceschanged', onChange);
    });
  }

  return {
    /** Looks for a German voice once. Safe to call again. */
    ready(): Promise<boolean> {
      ready ??= load();
      return ready;
    },
    /** True or false once known, null while still looking. */
    known(): boolean | null {
      return voice !== null ? true : null;
    },
    speak(text: string, rate: number = NORMAL_RATE): void {
      if (env.synth === null || voice === null) return;
      const utterance = env.makeUtterance(text);
      utterance.lang = voice.lang;
      utterance.voice = voice;
      utterance.rate = rate;
      env.synth.cancel();
      env.synth.speak(utterance as never);
    },
    cancel(): void {
      env.synth?.cancel();
    },
  };
}

const browser: TtsEnv = {
  synth: typeof speechSynthesis === 'undefined' ? null : (speechSynthesis as TtsEnv['synth']),
  makeUtterance: (text) => new SpeechSynthesisUtterance(text),
};

export const tts = createTts(browser);

/** Waits briefly for the voice check, so starting a session is never held up by it. */
export async function germanVoiceAvailable(maxWaitMs = 150): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), maxWaitMs));
  return Promise.race([tts.ready(), timeout]);
}
