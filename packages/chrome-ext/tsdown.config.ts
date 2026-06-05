import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/service-worker.ts'],
  format: ['esm'],
  platform: 'browser',
  deps: { alwaysBundle: ['@qlint/core'] },
  outExtensions: () => ({ js: '.js' }),
  dts: false,
  clean: true,
});
