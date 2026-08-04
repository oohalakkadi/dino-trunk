# API reference

## `useCollapsingLabel(ref, checkpoints, options?) → string`

| Param         | Type                             | Description |
| ------------- | -------------------------------- | ----------- |
| `ref`         | `RefObject<HTMLElement \| null>` | Assigned to the button. Its computed font drives measurement. |
| `checkpoints` | `string[]`                       | Labels widest → narrowest. End with `''` for icon-only. |
| `options`     | `UseCollapsingLabelOptions`      | Optional — `containerRef` (defaults to the button's parent), `iconSpace` (24), `reservedPadding` (0), `slack`, `deps`. |

Returns the checkpoint string that currently fits.

### Custom breakpoints and spacing

```tsx
const label = useCollapsingLabel(ref, ['Reformat resume', 'Reformat', ''], {
  iconSpace: 20,        // px for a leading icon + gap (default 24)
  reservedPadding: 8,   // extra safety margin trimmed from the budget
});
```

## `useCollapsingLabels(options) → number[]`

For a shared button row. `options`: `containerRef`, `items` (`{ ref, variants }[]`),
plus the same `iconSpace` / `reservedPadding` / `slack` / `deps`. Returns a level
index per item, parallel to `items`.

When several buttons live in one flex container and should divide the
leftover room, use the plural hook. It returns a level index per button (map
it to your own variant list). Buttons that aren't mounted are skipped, so you
can pass a fixed-order list even when some render conditionally:

```tsx
const GENERATE = ['Download Profile (PDF)', 'Download Profile', 'Profile', ''];
const EDIT = ['Edit Latest Resume', 'Edit Resume', 'Edit', ''];

function ActionRow({ canEdit }: { canEdit: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const genRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);

  const [genLevel, editLevel] = useCollapsingLabels({
    containerRef: rowRef,
    items: [
      { ref: genRef, variants: GENERATE },
      { ref: editRef, variants: EDIT }, // editRef may be unmounted
    ],
    deps: [canEdit], // re-measure when a button mounts/unmounts
  });

  return (
    <div ref={rowRef} style={{ display: 'flex', gap: 8 }}>
      <button ref={genRef}>{GENERATE[genLevel] && <span>{GENERATE[genLevel]}</span>}</button>
      {canEdit && <button ref={editRef}>{EDIT[editLevel] && <span>{EDIT[editLevel]}</span>}</button>}
    </div>
  );
}
```

## Pure core

The decision logic works on plain numbers — drive it from anywhere (a Web
Component, a canvas UI, a test):

- `pickLevel(currentLevel, variantWidths, available, slack?) → number`
- `pickLevelStep(...)` — the single-step primitive `pickLevel` iterates.
- `availableWidthPerItem({ containerWidth, totalGap, reservedWidth, truncatingCount, reservedPadding? }) → number`
- `DEFAULT_SLACK` — `{ shrinkSlack: 6, unshrinkSlack: 20 }`.

```ts
import { pickLevel, availableWidthPerItem } from 'dino-trunk';

const variantWidths = [180, 120, 60, 0]; // measured px, widest first
const available = availableWidthPerItem({
  containerWidth: 640, totalGap: 16, reservedWidth: 40, truncatingCount: 3,
});
const level = pickLevel(currentLevel, variantWidths, available);
```

## `ellipsize(text, maxLength, ellipsis?) → string`

A pure helper for the "cut a string and add …" cases:

```ts
import { ellipsize } from 'dino-trunk';

ellipsize('Hello, world', 8);        // → 'Hello, …'
ellipsize('Hi', 8);                  // → 'Hi'
ellipsize('Hello, world', 8, '...'); // → 'Hello...'  (ellipsis counts toward the budget)
```

## How it works

1. **Measure** every checkpoint for the button with a canvas, using the button's
   own computed font + padding + `iconSpace`. The `''` checkpoint measures to just
   icon + padding — the natural floor.
2. **Budget** the container width: subtract inter-child gaps and fixed siblings,
   then (for a row) split the rest evenly among the mounted buttons.
3. **Decide, with hysteresis:** shrink a label as soon as it no longer fits
   (`width + shrinkSlack`), grow it back only once there's clearly room again
   (`width + unshrinkSlack`). The gap between those is the anti-flicker dead-band.
4. **React** to size changes via a `ResizeObserver` (throttled to animation
   frames); state updates only when a level actually changes.
