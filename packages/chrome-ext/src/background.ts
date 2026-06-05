import * as core from '@qlint/core';

// Smoke: confirm bundle loads and @qlint/core is reachable from the service worker.
console.log('[qlint] chrome extension loaded', {
  coreExports: Object.keys(core),
});
