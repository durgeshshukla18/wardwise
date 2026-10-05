import type { ScreenRoute } from './screens.ts';

export function Placeholder({ screen }: { screen: ScreenRoute }) {
  return (
    <main className="mx-auto max-w-main p-16 tablet:p-24 desktop:p-32">
      <p className="text-12 font-semibold uppercase tracking-label text-ink-soft">
        {screen.id} · {screen.path}
      </p>
      <h1 className="mt-8 text-22">{screen.name}</h1>
      <p className="mt-8 text-16 text-ink-soft">{screen.purpose}</p>
    </main>
  );
}
