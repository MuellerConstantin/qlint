import { defineConfig } from 'tsdown';

/*
 * The VS Code extension host loads the entry point via CommonJS `require` and
 * provides the `vscode` module at runtime, so it must stay external — bundling
 * it would ship a second, non-functional copy of the API surface.
 */
export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  platform: 'node',
  deps: { alwaysBundle: ['@qlint/core'], neverBundle: ['vscode'] },
  outExtensions: () => ({ js: '.js' }),
  dts: false,
  clean: true,
});
