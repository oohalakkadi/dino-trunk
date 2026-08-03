<p align="center">
  <img src="assets/logo.svg" width="128" height="128" alt="dino-trunk logo — a dinosaur with an elephant trunk" />
</p>

<h1 align="center">dino-trunk</h1>

<p align="center">
  <em>Labels that know when to shrink their trunk.</em> 🦕🐘
</p>

<p align="center">
  <a href="https://github.com/oohalakkadi/dino-trunk/actions/workflows/ci.yml"><img src="https://github.com/oohalakkadi/dino-trunk/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/dino-trunk"><img src="https://img.shields.io/npm/v/dino-trunk.svg" alt="npm" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" /></a>
</p>

Responsive, width-aware **button-label collapse** for React. When space runs out,
a button steps its label down through shorter variants — all the way to
icon-only — and steps back up when room returns, **without flickering** at the
boundary.

```
 wide   ►  [📄 Download Profile (PDF)]
 medium ►  [📄 Download Profile]
 narrow ►  [📄 Profile]
 tiny   ►  [📄]
```

**[▶ Live demo](https://oohalakkadi.github.io/dino-trunk/)** — or open
[`demo/index.html`](demo/index.html) locally (no build needed).

## The whole idea

Assign a ref, hand it your text checkpoints, get back the string that fits:

```tsx
import { useRef } from 'react';
import { useCollapsingLabel } from 'dino-trunk';

function SaveButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const label = useCollapsingLabel(ref, ['Save changes', 'Save', '']);

  return (
    <button ref={ref}>
      <SaveIcon />
      {label && <span>{label}</span>}
    </button>
  );
}
```

That's it. No container ref, no config, no index math — the button's parent is
measured automatically, and you get the current label as a plain string. The
last checkpoint `''` renders as icon-only.

## Why it exists

Truncating with CSS (`text-overflow: ellipsis`) can only clip *one* string. This
picks between whole **alternative labels** based on real measured width, so
"Download Profile (PDF)" becomes "Profile" becomes an icon — each a deliberate
choice, not a mid-word cut. And it does so with **hysteresis**: a resize parked
exactly on a threshold won't oscillate every frame.

## Features

- **One-liner API** for the common single-button case (`useCollapsingLabel`).
- **Anti-flicker by design** — asymmetric shrink/grow thresholds create a
  dead-band, so labels don't flip-flop on the boundary.
- **Real measurement** — widths come from the browser's own text metrics (canvas
  `measureText`) using each button's computed font and padding.
- **A row hook too** (`useCollapsingLabels`) for several buttons sharing a
  container and splitting the space between them.
- **Pure, tested core** — the width/level math has no React or DOM dependency and
  is unit-tested on its own.
- **Tiny & typed** — zero runtime dependencies; React is a peer.

## Install

```bash
npm install dino-trunk
```

React `>=16.8` is a peer dependency (the hooks use `useState`/`useEffect`/`useRef`).

## Recipes

### Custom breakpoints and spacing

```tsx
const label = useCollapsingLabel(ref, ['Reformat resume', 'Reformat', ''], {
  iconSpace: 20,        // px for a leading icon + gap (default 24)
  reservedPadding: 8,   // extra safety margin trimmed from the budget
});
```

### A row of buttons that share space

When several buttons live in one flex container and should divide the leftover
room, use the plural hook. It returns a **level index per button** (map it to
your own variant list). Buttons that aren't mounted are skipped, so you can pass
a fixed-order list even when some render conditionally:

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

### The pure core, no React

The decision logic works on plain numbers — drive it from anywhere (a Web
Component, a canvas UI, a test):

```ts
import { pickLevel, availableWidthPerItem } from 'dino-trunk';

const variantWidths = [180, 120, 60, 0]; // measured px, widest first
const available = availableWidthPerItem({
  containerWidth: 640, totalGap: 16, reservedWidth: 40, truncatingCount: 3,
});
const level = pickLevel(currentLevel, variantWidths, available);
```

### Bonus: `ellipsize`

A pure helper for the "cut a string and add …" cases:

```ts
import { ellipsize } from 'dino-trunk';

ellipsize('Hello, world', 8);        // → 'Hello, …'
ellipsize('Hi', 8);                  // → 'Hi'
ellipsize('Hello, world', 8, '...'); // → 'Hello...'  (ellipsis counts toward the budget)
```

## API

### `useCollapsingLabel(ref, checkpoints, options?) → string`

| Param         | Type                             | Description |
| ------------- | -------------------------------- | ----------- |
| `ref`         | `RefObject<HTMLElement \| null>` | Assigned to the button. Its computed font drives measurement. |
| `checkpoints` | `string[]`                       | Labels widest → narrowest. End with `''` for icon-only. |
| `options`     | `UseCollapsingLabelOptions`      | Optional — `containerRef` (defaults to the button's parent), `iconSpace` (24), `reservedPadding` (0), `slack`, `deps`. |

Returns the checkpoint string that currently fits.

### `useCollapsingLabels(options) → number[]`

For a shared button row. `options`: `containerRef`, `items` (`{ ref, variants }[]`),
plus the same `iconSpace` / `reservedPadding` / `slack` / `deps`. Returns a level
index per item, parallel to `items`.

### Pure core

- `pickLevel(currentLevel, variantWidths, available, slack?) → number`
- `pickLevelStep(...)` — the single-step primitive `pickLevel` iterates.
- `availableWidthPerItem({ containerWidth, totalGap, reservedWidth, truncatingCount, reservedPadding? }) → number`
- `DEFAULT_SLACK` — `{ shrinkSlack: 6, unshrinkSlack: 20 }`.
- `ellipsize(text, maxLength, ellipsis?) → string`

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

## Development

```bash
npm install
npm test         # unit tests for the pure core (vitest)
npm run typecheck
npm run build    # emits dist/ (ESM + .d.ts) via tsc — no bundler
```

## Why "dino-trunk"?

It **trunc**ates. It has a **trunk**. It's a tiny prehistoric creature that
retracts its long snout when the room gets tight. Naming things is hard; this one
named itself.

## License

MIT © [Ooha Reddy](https://github.com/oohalakkadi)
