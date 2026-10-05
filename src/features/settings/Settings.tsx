import { useState } from 'react';

import { copy } from '../../app/copy.ts';
import { useApp } from '../../app/store.ts';
import { Button } from '../../components/Button.tsx';
import { SectionLabel } from '../../components/SectionLabel.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import { repositories } from '../../data/runtime.ts';
import { localDay, now } from '../../services/clock.ts';

const onOff = [
  { value: true, label: copy.settings.on },
  { value: false, label: copy.settings.off },
] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

/** Saves the progress as one JSON file and starts its download. */
async function exportProgress() {
  const moment = now();
  const file = await repositories.exportAll(moment);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `wardwise-progress-${localDay(moment).date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** S12, the minimal version: the settings that exist so far, export, and reset. */
export function Settings() {
  const profile = useApp((state) => state.profile);
  const [confirmingReset, setConfirmingReset] = useState(false);
  if (profile === null) return null;
  const save = useApp.getState().updateProfile;

  return (
    <div className="flex max-w-column flex-col gap-24">
      <h1 className="font-serif text-22 font-semibold leading-heading">{copy.settings.title}</h1>

      <Row label={copy.settings.levelLabel}>
        <Segmented
          label={copy.settings.levelLabel}
          value={profile.level}
          options={[
            { value: 'A1', label: copy.settings.levels.A1 },
            { value: 'A2', label: copy.settings.levels.A2 },
          ]}
          onChange={(level) => void save({ level })}
        />
      </Row>
      <Row label={copy.settings.sessionLengthLabel}>
        <Segmented
          label={copy.settings.sessionLengthLabel}
          value={profile.sessionLength}
          options={([5, 10, 15] as const).map((value) => ({
            value,
            label: copy.settings.sessionLength(value),
          }))}
          onChange={(sessionLength) => void save({ sessionLength })}
        />
      </Row>
      <Row label={copy.settings.speechLabel}>
        <Segmented
          label={copy.settings.speechLabel}
          value={profile.speechOn}
          options={onOff}
          onChange={(speechOn) => void save({ speechOn })}
        />
      </Row>
      <Row label={copy.settings.audioSpeedLabel}>
        <Segmented
          label={copy.settings.audioSpeedLabel}
          value={profile.audioSpeed}
          options={[
            { value: 1, label: copy.settings.audioSpeeds.normal },
            { value: 0.8, label: copy.settings.audioSpeeds.slow },
          ]}
          onChange={(audioSpeed) => void save({ audioSpeed })}
        />
      </Row>
      <Row label={copy.settings.hindiLabel}>
        <Segmented
          label={copy.settings.hindiLabel}
          value={profile.hindiHints}
          options={onOff}
          onChange={(hindiHints) => void save({ hindiHints })}
        />
      </Row>

      <section className="flex flex-col gap-12 border-t border-line pt-12">
        <SectionLabel>{copy.settings.dataLabel}</SectionLabel>
        <div className="flex flex-col gap-12 tablet:flex-row">
          <Button variant="secondary" onClick={() => void exportProgress()}>
            {copy.settings.exportProgress}
          </Button>
          {!confirmingReset && (
            <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
              {copy.settings.resetProgress}
            </Button>
          )}
        </div>
        {confirmingReset && (
          <div
            role="alertdialog"
            aria-label={copy.settings.resetProgress}
            className="flex flex-col gap-12 rounded-card border border-wrong p-16"
          >
            <p className="text-16">{copy.settings.resetWarning}</p>
            <div className="flex flex-col gap-8 tablet:flex-row">
              <Button variant="secondary" onClick={() => void useApp.getState().reset()}>
                {copy.settings.resetConfirm}
              </Button>
              <Button variant="text" onClick={() => setConfirmingReset(false)}>
                {copy.settings.resetCancel}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-8 border-t border-line pt-12">
        <SectionLabel>{copy.settings.aboutLabel}</SectionLabel>
        <p className="text-14 text-ink-soft">{copy.settings.clinicalNote}</p>
        <p className="text-14 text-ink-soft">{copy.settings.speechNote}</p>
      </section>
    </div>
  );
}
