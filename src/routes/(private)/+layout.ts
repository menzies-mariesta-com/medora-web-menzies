/**
 * Medora product UI (hospital, admin, etc.) renders client-only on full reload
 * so users never interact with SSR HTML before hydration — avoids the
 * refresh “second load”, GSAP replay, and inputs reset while JS is still loading.
 *
 * Server `+layout.server.ts` / `+page.server.ts` loads still run; only HTML
 * prerender of these routes is disabled.
 */
export const ssr = false;
