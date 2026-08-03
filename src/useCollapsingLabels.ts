import { useEffect, useRef, useState } from 'react';
import type { DependencyList, RefObject } from 'react';
import {
  pickLevel,
  availableWidthPerItem,
  DEFAULT_SLACK,
  type HysteresisSlack,
} from './collapsingLabels';

/**
 * Responsive, width-aware label collapse for React.
 *
 * Two entry points, same engine:
 *
 *  • `useCollapsingLabel(ref, checkpoints)` — the simple one. Assign the ref to a
 *    button, hand it the text checkpoints (widest → narrowest), and it returns
 *    the string that currently fits. That's it.
 *
 *  • `useCollapsingLabels({ containerRef, items })` — for a row of buttons that
 *    share a container and split the space between them. Returns a level index
 *    per button.
 *
 * All the width/level math is pure and lives in `collapsingLabels.ts`.
 */

const DEFAULT_ICON_SPACE = 24;

export interface CollapsingItem {
  /** Ref to the button being sized. Its computed font drives measurement. */
  ref: RefObject<HTMLElement | null>;
  /**
   * Label variants, widest first. Convention: the last entry is "" (icon-only),
   * the floor the engine lands on when nothing else fits.
   */
  variants: string[];
}

interface EngineConfig {
  /** Resolves the element whose width bounds the item(s), at measure time. */
  getContainer: () => HTMLElement | null;
  items: CollapsingItem[];
  iconSpace?: number;
  reservedPadding?: number;
  slack?: Partial<HysteresisSlack>;
  deps?: DependencyList;
}

/**
 * Shared measurement engine. Measures each variant with a canvas (using the
 * button's own computed font + padding), splits the container's free space
 * among mounted items, and resolves a level per item with hysteresis. Re-runs
 * on container resize; updates state only when a level actually changes.
 */
function useCollapseLevels(config: EngineConfig): number[] {
  const { items } = config;
  const [levels, setLevels] = useState<number[]>(() => items.map(() => 0));

  // Keep the latest config in a ref so the effect can read current items/config
  // without re-subscribing its ResizeObserver on every render.
  const configRef = useRef(config);
  configRef.current = config;

  const variantSignature = items.map((it) => it.variants.join('')).join('');
  const externalDeps = config.deps ?? [];

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const measure = (text: string, el: HTMLElement | null): number => {
      if (!el || !ctx) return 0;
      const styles = window.getComputedStyle(el);
      ctx.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      const textWidth = ctx.measureText(text).width;
      const paddingX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const iconSpace = configRef.current.iconSpace ?? DEFAULT_ICON_SPACE;
      return Math.ceil(textWidth + paddingX + iconSpace);
    };

    // A collapsing item's ref may sit inside a wrapper (e.g. a dropdown
    // trigger); the flex layout sizes the element that is a *direct* child of
    // the container. Climb to it so reserved-width accounting is correct.
    const toDirectChild = (
      el: HTMLElement | null,
      container: HTMLElement,
    ): Element | null => {
      let node: HTMLElement | null = el;
      while (node && node.parentElement !== container) {
        node = node.parentElement;
      }
      return node;
    };

    const recompute = () => {
      const cfg = configRef.current;
      const container = cfg.getContainer();
      if (!container) return;

      const containerWidth = container.getBoundingClientRect().width;
      const gap = parseFloat(window.getComputedStyle(container).columnGap) || 0;
      const children = Array.from(container.children) as HTMLElement[];
      const totalGap = gap * Math.max(0, children.length - 1);

      // Direct children that correspond to mounted collapsing items.
      const truncatingEls = new Set<Element>();
      for (const item of cfg.items) {
        const direct = toDirectChild(item.ref.current, container);
        if (direct) truncatingEls.add(direct);
      }
      const truncatingCount = truncatingEls.size;

      // Everything else in the container is fixed and reserves its own width.
      const reservedWidth = children
        .filter((child) => !truncatingEls.has(child))
        .reduce((sum, child) => sum + child.getBoundingClientRect().width, 0);

      const perItem = availableWidthPerItem({
        containerWidth,
        totalGap,
        reservedWidth,
        truncatingCount,
        reservedPadding: cfg.reservedPadding ?? 0,
      });

      const slack = { ...DEFAULT_SLACK, ...(cfg.slack ?? {}) };

      setLevels((prev) => {
        const next = cfg.items.map((item, i) => {
          const el = item.ref.current;
          const current = prev[i] ?? 0;
          if (!el) return current; // unmounted → leave as-is
          const widths = item.variants.map((v) => measure(v, el));
          return pickLevel(current, widths, perItem, slack);
        });
        const unchanged =
          next.length === prev.length && next.every((v, i) => v === prev[i]);
        return unchanged ? prev : next;
      });
    };

    // Initial pass on the next tick so the buttons have laid out and their
    // computed fonts/padding are resolvable.
    const timeoutId = setTimeout(recompute, 10);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(recompute);
    });
    const container = configRef.current.getContainer();
    if (container) resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
    // configRef carries the live config; we intentionally key only on the
    // variant set and caller-supplied deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantSignature, ...externalDeps]);

  return levels;
}

/* ─────────────────────────── simple: one button ─────────────────────────── */

export interface UseCollapsingLabelOptions {
  /**
   * Element whose width bounds the button. Defaults to the button's parent —
   * so for the common case you don't pass this at all.
   */
  containerRef?: RefObject<HTMLElement | null>;
  /** Px reserved for a leading icon + its gap, added to each measured label. */
  iconSpace?: number;
  /** Extra px trimmed from the button's budget (a caller-tuned safety margin). */
  reservedPadding?: number;
  /** Override the hysteresis dead-band. Merged over DEFAULT_SLACK. */
  slack?: Partial<HysteresisSlack>;
  /** Force a re-measure (e.g. when the button mounts/unmounts). */
  deps?: DependencyList;
}

/**
 * The easy path: assign `ref` to a button, give it the text `checkpoints`
 * (widest → narrowest; end with "" for icon-only), and get back the string that
 * currently fits. The button's parent is measured automatically.
 *
 * @example
 * const ref = useRef<HTMLButtonElement>(null);
 * const label = useCollapsingLabel(ref, ['Download Profile (PDF)', 'Profile', '']);
 * return <button ref={ref}><Icon />{label && <span>{label}</span>}</button>;
 */
export function useCollapsingLabel(
  ref: RefObject<HTMLElement | null>,
  checkpoints: string[],
  options: UseCollapsingLabelOptions = {},
): string {
  const levels = useCollapseLevels({
    getContainer: () =>
      options.containerRef?.current ?? ref.current?.parentElement ?? null,
    items: [{ ref, variants: checkpoints }],
    iconSpace: options.iconSpace,
    reservedPadding: options.reservedPadding,
    slack: options.slack,
    deps: options.deps,
  });
  return checkpoints[levels[0] ?? 0] ?? '';
}

/* ───────────────────────── advanced: a button row ───────────────────────── */

export interface UseCollapsingLabelsOptions {
  /** The element whose width bounds the collapsing items. */
  containerRef: RefObject<HTMLElement | null>;
  items: CollapsingItem[];
  /** Px reserved for a leading icon + its gap, added to each measured label. */
  iconSpace?: number;
  /** Extra px trimmed from each item's budget (a caller-tuned safety margin). */
  reservedPadding?: number;
  /** Override the hysteresis dead-band. Merged over DEFAULT_SLACK. */
  slack?: Partial<HysteresisSlack>;
  /** Force a re-measure (e.g. when an item mounts/unmounts). */
  deps?: DependencyList;
}

/**
 * For a row of buttons sharing one container that split the available space.
 * Returns a `number[]` parallel to `items` — the level each button should
 * render at (map it yourself: `variants[level]`). Items whose ref is unmounted
 * keep their slot and are skipped, so a fixed-order list is safe.
 */
export function useCollapsingLabels(options: UseCollapsingLabelsOptions): number[] {
  return useCollapseLevels({
    getContainer: () => options.containerRef.current,
    items: options.items,
    iconSpace: options.iconSpace,
    reservedPadding: options.reservedPadding,
    slack: options.slack,
    deps: options.deps,
  });
}
