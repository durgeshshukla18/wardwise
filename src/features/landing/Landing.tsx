import { useEffect, useRef, useState, type FormEvent } from 'react';

import { copy } from '../../app/copy.ts';
import { MAX_NAME_LENGTH, useApp } from '../../app/store.ts';
import { Button } from '../../components/Button.tsx';
import { TextInput } from '../../components/TextInput.tsx';

/** S01. Two ways in: the seeded demo, or a fresh start with a first name. */
export function Landing() {
  const [askingName, setAskingName] = useState(false);
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);
  const nameField = useRef<HTMLInputElement>(null);
  const working = useRef(false);

  useEffect(() => {
    if (askingName) nameField.current?.focus();
  }, [askingName]);

  // The screen is replaced as soon as the profile exists, so one tap must only run once.
  async function once(task: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    try {
      await task();
    } finally {
      working.current = false;
    }
  }

  function submitName(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      setShowError(true);
      return;
    }
    void once(() => useApp.getState().startFresh(trimmed));
  }

  return (
    <main className="min-h-dvh bg-paper p-16 text-ink tablet:p-24 desktop:p-32">
      <div className="mx-auto flex max-w-column flex-col gap-32 pt-48">
        <header>
          <p className="text-12 font-semibold uppercase tracking-label text-ink-soft">
            {copy.landing.label}
          </p>
          <h1 className="mt-8 font-serif text-36 font-semibold leading-heading">{copy.appName}</h1>
          <p className="mt-12 text-18 text-ink-soft">{copy.landing.tagline}</p>
        </header>

        <section className="flex flex-col gap-12 border-t border-line pt-24">
          {askingName ? (
            <form onSubmit={submitName} className="flex flex-col gap-16" noValidate>
              <h2 className="font-serif text-22 font-semibold leading-heading">
                {copy.landing.nameHeading}
              </h2>
              <TextInput
                ref={nameField}
                label={copy.landing.nameLabel}
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="given-name"
                error={showError ? copy.landing.nameRequired : null}
                onChange={(event) => {
                  setName(event.target.value);
                  setShowError(false);
                }}
              />
              <div className="flex flex-col gap-8 tablet:flex-row tablet:items-center">
                <Button type="submit">{copy.landing.nameContinue}</Button>
                <Button variant="text" onClick={() => setAskingName(false)}>
                  {copy.landing.nameBack}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-12 tablet:flex-row">
              <Button onClick={() => void once(() => useApp.getState().startDemo())}>
                {copy.landing.tryDemo}
              </Button>
              <Button variant="secondary" onClick={() => setAskingName(true)}>
                {copy.landing.startFresh}
              </Button>
            </div>
          )}
        </section>

        <p className="text-14 text-ink-soft">{copy.landing.storageNote}</p>
      </div>
    </main>
  );
}
