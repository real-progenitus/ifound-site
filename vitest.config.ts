import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Picks up the `@/*` alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
});
