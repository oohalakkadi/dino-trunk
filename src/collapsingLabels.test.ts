import { describe, it, expect } from 'vitest';
import {
  pickLevel,
  pickLevelStep,
  availableWidthPerItem,
  DEFAULT_SLACK,
} from './collapsingLabels';

// Four progressively shorter variants; index 3 is the icon-only floor (width 0
// + slack). Widths are "already measured" values in px.
const WIDTHS = [100, 60, 20, 0];

describe('pickLevel', () => {
  it('stays at the widest level when there is plenty of room', () => {
    expect(pickLevel(0, WIDTHS, 500)).toBe(0);
  });

  it('drops to the tightest variant that still fits', () => {
    // 50px fits variant 2 (20 + 6 = 26) but not variant 1 (60 + 6 = 66).
    expect(pickLevel(0, WIDTHS, 50)).toBe(2);
  });

  it('lands on the icon-only floor when nothing else fits', () => {
    expect(pickLevel(0, WIDTHS, 1)).toBe(3);
  });

  it('never steps past the last (floor) index', () => {
    expect(pickLevel(3, WIDTHS, 0)).toBe(3);
  });

  it('reaches its final level in a single pass on a large jump', () => {
    // From fully expanded straight to a tiny width — fixed-point iteration must
    // settle in one call, not creep one level at a time.
    expect(pickLevel(0, WIDTHS, 5)).toBe(3);
  });

  it('clamps an out-of-range starting level', () => {
    expect(pickLevel(99, WIDTHS, 500)).toBe(0);
    expect(pickLevel(-5, WIDTHS, 500)).toBe(0);
  });

  it('returns 0 for an empty variant list', () => {
    expect(pickLevel(0, [], 500)).toBe(0);
  });
});

describe('pickLevel hysteresis', () => {
  it('holds its level inside the dead-band instead of flip-flopping', () => {
    // At level 1, variant 1 (width 60) needs > 80 (60 + unshrinkSlack 20) to
    // grow back to level 0, and < 66 (60 + shrinkSlack 6) to shrink further.
    // 70px sits in the dead-band → no change.
    expect(pickLevel(1, WIDTHS, 70)).toBe(1);
  });

  it('grows back to a wider level only once that level\'s own room clears', () => {
    // Returning to level 0 needs room for the FULL variant 0:
    // available > widths[0] + unshrinkSlack = 100 + 20 = 120.
    expect(pickLevel(1, WIDTHS, 100)).toBe(1); // fits variant 1, not variant 0 → hold
    expect(pickLevel(1, WIDTHS, 118)).toBe(1); // still under 120 → hold
    expect(pickLevel(1, WIDTHS, 125)).toBe(0); // clears 120 → unshrink to 0
  });

  it('shrinks as soon as the current variant no longer fits', () => {
    expect(pickLevel(1, WIDTHS, 65)).toBe(2); // below 66 → shrink
  });

  it('single-step picker moves at most one level per call', () => {
    // pickLevelStep is the primitive pickLevel iterates over.
    expect(pickLevelStep(0, WIDTHS, 5)).toBe(1);
  });

  it('respects a custom slack override', () => {
    const tight = { shrinkSlack: 0, unshrinkSlack: 0 };
    // With zero slack, exactly the variant width is the boundary.
    expect(pickLevel(0, WIDTHS, 100, tight)).toBe(0); // 100 is not < 100
    expect(pickLevel(0, WIDTHS, 99, tight)).toBe(1); // 99 < 100 → shrink
  });

  it('exposes the default slack', () => {
    expect(DEFAULT_SLACK).toEqual({ shrinkSlack: 6, unshrinkSlack: 20 });
  });
});

describe('availableWidthPerItem', () => {
  it('splits free space evenly after gaps and fixed siblings', () => {
    expect(
      availableWidthPerItem({
        containerWidth: 300,
        totalGap: 20,
        reservedWidth: 80,
        truncatingCount: 2,
      }),
    ).toBe(100); // (300 - 20 - 80) / 2
  });

  it('subtracts the caller-supplied safety margin per item', () => {
    expect(
      availableWidthPerItem({
        containerWidth: 300,
        totalGap: 20,
        reservedWidth: 80,
        truncatingCount: 2,
        reservedPadding: 10,
      }),
    ).toBe(90);
  });

  it('treats a count of 0 as 1 so the result stays defined', () => {
    expect(
      availableWidthPerItem({
        containerWidth: 200,
        totalGap: 0,
        reservedWidth: 50,
        truncatingCount: 0,
      }),
    ).toBe(150);
  });

  it('never returns a negative width', () => {
    expect(
      availableWidthPerItem({
        containerWidth: 50,
        totalGap: 0,
        reservedWidth: 200,
        truncatingCount: 1,
      }),
    ).toBe(0);
  });
});
