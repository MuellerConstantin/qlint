// Smoke content script — fires on every tab whose origin has been granted to
// qlint. Real Qlik Sense detection & lint wiring will land here later.
console.log('[qlint] content script injected on', location.href);
