import { defineConfig } from 'tsdown';

/*
 * Core is bundled into the CLI so the published package installs without any
 * runtime dependency — which is why it is a devDependency. Dropping it from
 * `alwaysBundle` would leave the bundle importing a package npm never installs.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  deps: { alwaysBundle: ['@qlint/core'] },
  outExtensions: () => ({ js: '.js' }),
  dts: false,
  clean: true,
});
