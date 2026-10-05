import type { ReactNode } from 'react';

const colours = { der: 'text-der', die: 'text-die', das: 'text-das' } as const;

export type Article = keyof typeof colours;

/** A noun with its article in the article's colour: the article is semibold, the noun is ink. */
export function ArticleTag({ article, children }: { article?: Article; children: ReactNode }) {
  return (
    <span>
      {article !== undefined && (
        <>
          <span className={`font-semibold ${colours[article]}`}>{article}</span>{' '}
        </>
      )}
      {children}
    </span>
  );
}

export const articleColour = colours;
