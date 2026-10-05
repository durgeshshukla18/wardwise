import type { ExerciseId } from '../../domain/types.ts';

/** Phase 3 runs E1 to E6 and E9. Speech recognition (E7), E8 and E10 come in Phase 4. */
export const ENABLED_EXERCISES: readonly ExerciseId[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E9'];
