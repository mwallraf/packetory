/**
 * The only place the page is reloaded (Phase 14 D-04). It is a separate module
 * for two reasons: jsdom cannot stub a page reload, so the RTL suites mock this
 * wrapper instead; and the Turbopack production runtime caches a rejected chunk
 * import, so a reload is the only way to retry a ChunkLoadError (RESEARCH
 * Pitfall 1). The reload carries only the options already in the address bar.
 */
export function reloadPage(): void {
  window.location.reload();
}
