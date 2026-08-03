/**
 * Framework-free core for responsive, width-aware label collapse.
 *
 * The problem: a toolbar button (or a row of them) should show its full label
 * ("Download Profile (PDF)") when there's room, then step down through shorter
 * variants ("Download Profile" → "Profile" → icon-only) as the container
 * narrows — without flip-flopping at the boundary when a resize lands right on a
 * threshold.
 *
 * Everything in this module is pure: no React, no DOM, no timers. The canvas
 * text measurement and the ResizeObserver wiring live in `useCollapsingLabels`,
 * so this decision logic can be unit-tested in isolation and reused outside of
 * React entirely.
 */

export interface HysteresisSlack {
  /** Extra px of tightness below a variant's width before we shrink PAST it. */
  shrinkSlack: number;
  /** Extra px of room above a variant's width before we grow BACK up to it. */
  unshrinkSlack: number;
}

/**
 * Asymmetric thresholds: we shrink as soon as a variant no longer fits (+6),
 * but only grow back once there's clearly room again (+20). The gap between the
 * two is the dead-band that stops a resize parked on the boundary from
 * oscillating every frame.
 */
export const DEFAULT_SLACK: HysteresisSlack = { shrinkSlack: 6, unshrinkSlack: 20 };

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));

/**
 * Advance the level by at most one step toward what `available` can fit.
 *
 * `variantWidths[i]` is the measured width of the i-th (progressively shorter)
 * label variant. Returns the next level: `currentLevel + 1` when we're at/above
 * a variant that no longer fits, a smaller `i` when there's room to grow back,
 * or `currentLevel` when we're already settled. The last index is the floor
 * (typically an icon-only ""), so we never step beyond it.
 */
export function pickLevelStep(
  currentLevel: number,
  variantWidths: number[],
  available: number,
  slack: HysteresisSlack = DEFAULT_SLACK,
): number {
  for (let i = 0; i < variantWidths.length; i++) {
    const shrinkThreshold = variantWidths[i] + slack.shrinkSlack;
    const unshrinkThreshold = variantWidths[i] + slack.unshrinkSlack;

    if (currentLevel <= i && available < shrinkThreshold) {
      return Math.min(i + 1, variantWidths.length - 1);
    } else if (currentLevel > i && available > unshrinkThreshold) {
      return i;
    }
  }
  return currentLevel;
}

/**
 * Resolve the final level for one item.
 *
 * `pickLevelStep` moves a single level per call — great for hysteresis, but a
 * large resize jump would then take several resize events to settle and can
 * leave sibling buttons momentarily at mismatched levels. Iterating to a fixed
 * point (bounded by the number of variants) makes a single pass land on the
 * final level.
 */
export function pickLevel(
  currentLevel: number,
  variantWidths: number[],
  available: number,
  slack: HysteresisSlack = DEFAULT_SLACK,
): number {
  if (variantWidths.length === 0) return 0;
  let level = clamp(currentLevel, 0, variantWidths.length - 1);
  for (let guard = 0; guard < variantWidths.length; guard++) {
    const next = pickLevelStep(level, variantWidths, available, slack);
    if (next === level) break;
    level = next;
  }
  return level;
}

export interface AvailableWidthArgs {
  /** Inner width of the container that holds the collapsing item(s). */
  containerWidth: number;
  /** Total px consumed by inter-child gaps (columnGap × (childCount − 1)). */
  totalGap: number;
  /** Width of fixed, non-collapsing siblings (chevrons, static buttons, …). */
  reservedWidth: number;
  /** How many collapsing items share the remaining space. */
  truncatingCount: number;
  /** Extra px to trim from each item's budget (a caller-tuned safety margin). */
  reservedPadding?: number;
}

/**
 * Even split of the container's free space among the collapsing items, after
 * removing gaps, fixed siblings, and a caller-supplied safety margin. Never
 * negative; treats a count of 0 as 1 so the math stays defined.
 */
export function availableWidthPerItem({
  containerWidth,
  totalGap,
  reservedWidth,
  truncatingCount,
  reservedPadding = 0,
}: AvailableWidthArgs): number {
  const count = Math.max(1, truncatingCount);
  const usable = (containerWidth - totalGap - reservedWidth) / count - reservedPadding;
  return Math.max(0, usable);
}
