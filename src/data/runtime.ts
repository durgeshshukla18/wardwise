// The app's one database and its repositories.
import { db } from './db.ts';
import { createRepositories } from './repositories.ts';

export const repositories = createRepositories(db);
