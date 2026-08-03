/**
 * Trim a string to a maximum display length, appending an ellipsis only when
 * the string was actually shortened. The result is never longer than
 * `maxLength`; the ellipsis is counted against that budget.
 *
 * Pure and framework-free — the companion to the collapsing-label logic for the
 * cases where you truncate text content rather than swap whole label variants.
 *
 * @example
 * ellipsize('Hello, world', 8)          // → 'Hello, …'
 * ellipsize('Hi', 8)                     // → 'Hi'
 * ellipsize('Hello, world', 8, '...')    // → 'Hello...'
 */
export function ellipsize(text: string, maxLength: number, ellipsis = '…'): string {
  if (maxLength <= 0) return '';
  if (text.length <= maxLength) return text;
  const keep = Math.max(0, maxLength - ellipsis.length);
  return text.slice(0, keep) + ellipsis;
}
