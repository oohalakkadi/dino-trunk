import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The pure core (pickLevel, availableWidthPerItem, ellipsize) needs no DOM —
    // that's the whole point of keeping it framework-free. The React hook is
    // verified separately by consuming apps.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
