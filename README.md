<p align="center">
  <img src="assets/logo.svg" width="128" height="128" alt="dino-trunk logo — a dinosaur with an elephant trunk" />
</p>

<h1 align="center">dino-trunk</h1>

<p align="center">
  <em>Dynamic (dino) truncation (trunk) for React button labels.</em> 🦕
</p>

<p align="center">
  <a href="https://github.com/oohalakkadi/dino-trunk/actions/workflows/ci.yml"><img src="https://github.com/oohalakkadi/dino-trunk/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/dino-trunk"><img src="https://img.shields.io/npm/v/dino-trunk.svg" alt="npm" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" /></a>
</p>

A button's label steps down through shorter variants as space runs out — all
the way to icon-only — and steps back up when room returns, without
flickering at the boundary.

```
 wide   ►  [📄 Download Profile (PDF)]
 medium ►  [📄 Download Profile]
 narrow ►  [📄 Profile]
 tiny   ►  [📄]
```

**[▶ Live demo](https://oohalakkadi.github.io/dino-trunk/)**

## Install

```bash
npm install dino-trunk
```

## Use it

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

Pass checkpoints widest → narrowest, end with `''` for icon-only. That's the
whole API — no container ref, no config, no index math. The button's parent
is measured automatically.

## Why not CSS `text-overflow: ellipsis`?

That clips one string mid-word. This picks between whole alternative labels
based on real measured text width, so "Download Profile (PDF)" becomes
"Profile" becomes an icon — each a deliberate choice. Shrink/grow use
different thresholds (hysteresis), so a label parked near the boundary
doesn't flicker.

## More

- **Multiple buttons sharing a row** — `useCollapsingLabels`
- **Pure core with no React/DOM dependency** — `pickLevel`, `availableWidthPerItem`
- **A string-truncation helper** — `ellipsize`
- **Full API reference and recipes** — [`docs/API.md`](docs/API.md)

## Development

```bash
npm install
npm test         # unit tests for the pure core (vitest)
npm run typecheck
npm run build    # emits dist/ (ESM + .d.ts) via tsc — no bundler
```

## License

MIT © [Ooha Reddy](https://github.com/oohalakkadi)
