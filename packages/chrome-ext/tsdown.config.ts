import { defineConfig } from 'tsdown';

const ENTRIES = ['background', 'content', 'popup', 'options', 'main'];

/*
 * MV3 service workers forbid runtime import(); content scripts (including
 * world: 'MAIN' ones) are loaded as classic scripts by chrome.scripting and
 * also choke on import statements. `codeSplitting: false` only suppresses
 * dynamic splitting, not the shared-chunk extraction rolldown performs across
 * entries — so once two entries depend on @qlint/core, the build emits a
 * shared chunk that the extension cannot load. Building each entry as its
 * own config keeps every output self-contained.
 */
export default defineConfig(
  ENTRIES.map((name, index) => ({
    entry: [`src/${name}.ts`],
    format: 'esm' as const,
    platform: 'browser' as const,
    deps: { alwaysBundle: ['@qlint/core'] },
    outExtensions: () => ({ js: '.js' }),
    dts: false,
    clean: index === 0,
  })),
);
