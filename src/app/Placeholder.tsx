import type { ScreenRoute } from './screens.ts';

// A stand-in for a screen that is not built yet. Its text comes from the screen table in the PRD.
export function Placeholder({ screen }: { screen: ScreenRoute }) {
  return (
    <div>
      <p className="text-12 font-semibold uppercase tracking-label text-ink-soft">
        {`${screen.id} ${screen.path}`}
      </p>
      <h1 className="mt-8 text-22">{screen.name}</h1>
      <p className="mt-8 text-16 text-ink-soft">{screen.purpose}</p>
    </div>
  );
}
