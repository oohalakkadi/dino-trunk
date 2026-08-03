import { describe, it, expect } from 'vitest';
import { ellipsize } from './ellipsize';

describe('ellipsize', () => {
  it('returns short strings unchanged', () => {
    expect(ellipsize('Hi', 8)).toBe('Hi');
  });

  it('returns a string of exactly maxLength unchanged', () => {
    expect(ellipsize('12345678', 8)).toBe('12345678');
  });

  it('truncates and appends the ellipsis, staying within budget', () => {
    const out = ellipsize('Hello, world', 8);
    expect(out).toBe('Hello, …');
    expect(out.length).toBe(8);
  });

  it('counts the ellipsis against the budget for a custom glyph', () => {
    expect(ellipsize('Hello, world', 8, '...')).toBe('Hello...');
  });

  it('returns an empty string for a non-positive maxLength', () => {
    expect(ellipsize('anything', 0)).toBe('');
    expect(ellipsize('anything', -3)).toBe('');
  });

  it('uses "…" as the default glyph', () => {
    expect(ellipsize('abcdef', 4)).toBe('abc…');
  });
});
