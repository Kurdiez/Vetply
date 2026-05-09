/**
 * Compare Next.js Pages Router `router.asPath` with the real browser URL.
 * The router can briefly lag behind `window.location` after load or client navigation;
 * skip destructive `router.push` / `router.replace` until they agree.
 */

function sortSearchString(search: string): string {
  if (!search || search === '?') {
    return '';
  }
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const sp = new URLSearchParams(raw);
  const sorted = [...sp.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return sorted ? `?${sorted}` : '';
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Normalized path + search + hash for equality checks (no origin).
 * Uses the same origin only to parse relative paths reliably.
 */
export function normalizeClientPathForCompare(
  pathSearchHash: string,
  baseOrigin: string,
): string {
  const trimmed = pathSearchHash.trim();
  if (!trimmed) {
    return '';
  }
  const absolute = trimmed.startsWith('http')
    ? trimmed
    : `${baseOrigin.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  let u: URL;
  try {
    u = new URL(absolute);
  } catch {
    return trimmed;
  }
  const pathname = normalizePathname(u.pathname);
  const search = sortSearchString(u.search);
  const hash = u.hash ?? '';
  return `${pathname}${search}${hash}`;
}

/**
 * `true` when `router.asPath` matches the address bar (pathname + search + hash).
 * On the server or without `window`, returns `true` so callers don’t block unnecessarily.
 */
export function isNextRouterAsPathInSyncWithBrowser(
  routerAsPath: string,
): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const browser = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const origin = window.location.origin;
  return (
    normalizeClientPathForCompare(routerAsPath, origin) ===
    normalizeClientPathForCompare(browser, origin)
  );
}
