/** Timing marks, read by the end to end tests to measure how fast key moments are. */
export function mark(name: string): void {
  if (typeof performance !== 'undefined') performance.mark(name);
}
