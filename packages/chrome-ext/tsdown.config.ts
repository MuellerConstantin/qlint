import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/background.ts', 'src/content.ts'],
  format: ['esm'],
  platform: 'browser',
  deps: { alwaysBundle: ['@qlint/core'] },
  outExtensions: () => ({ js: '.js' }),
  dts: false,
  clean: true,
  /*
   * MV3 service workers forbid runtime import(); force a single inlined bundle
   * per entry so rolldown doesn't split deps (chevrotain etc.) into separate
   * chunks. Same applies to content scripts loaded by chrome.scripting.
   */
  // @ts-expect-error tsdown 0.22.2 accepts this at runtime but hasn't typed it yet.
  codeSplitting: false,
});
