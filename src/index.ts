// Simple: one button. Assign a ref, pass text checkpoints, get the fitting string.
export { useCollapsingLabel } from './useCollapsingLabels';
export type { UseCollapsingLabelOptions } from './useCollapsingLabels';

// Advanced: a row of buttons sharing a container. Returns a level per button.
export { useCollapsingLabels } from './useCollapsingLabels';
export type { CollapsingItem, UseCollapsingLabelsOptions } from './useCollapsingLabels';

// Pure core — no React, use it anywhere.
export {
  pickLevel,
  pickLevelStep,
  availableWidthPerItem,
  DEFAULT_SLACK,
} from './collapsingLabels';
export type { HysteresisSlack, AvailableWidthArgs } from './collapsingLabels';

// Bonus: pure text truncation helper.
export { ellipsize } from './ellipsize';
