import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  deps: { alwaysBundle: ['@qlint/core'] },
  outExtensions: () => ({ js: '.js' }),
  dts: false,
  clean: true,
});
