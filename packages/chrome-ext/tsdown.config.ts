import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/background.ts'],
  format: ['esm'],
  platform: 'browser',
  deps: { alwaysBundle: ['@qlint/core'] },
  outExtensions: () => ({ js: '.js' }),
  dts: false,
  clean: true,
  /*
   * MV3 service workers forbid runtime import(); force a single inlined bundle
   * so rolldown doesn't split deps (chevrotain etc.) into separate chunks.
   */
  // @ts-expect-error tsdown 0.22.2 accepts this at runtime but hasn't typed it yet.
  codeSplitting: false,
});
