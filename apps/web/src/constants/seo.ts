export const SITE_NAME = 'Vetply';

export const HOME_PAGE_SEO = {
  title: 'Vetply — Smarter supply buying for vet clinics',
  description:
    'Compare thousands of supplier prices and layer in your discounts, rebates, and deals—without living in Excel.',
  keywords: [
    'veterinary procurement',
    'vet clinic supplies',
    'veterinary supplier pricing',
    'vet practice purchasing',
    'animal hospital supplies',
    'veterinary rebates',
    'vet supply discounts',
  ].join(', '),
  ogImagePath: '/supplies.png',
  ogImageAlt: 'Veterinary supplies, pricing, and savings',
  ogImageWidth: 1200,
  ogImageHeight: 800,
} as const;

export function documentTitleForPathname(pathname: string): string {
  if (pathname === '/') {
    return HOME_PAGE_SEO.title;
  }
  if (pathname === '/sign-in') {
    return 'Sign in | Vetply';
  }
  if (pathname === '/sign-up') {
    return 'Sign up | Vetply';
  }
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    return 'Dashboard | Vetply';
  }
  if (pathname.startsWith('/admin')) {
    return 'Admin | Vetply';
  }
  return SITE_NAME;
}

export function getPublicSiteUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().replace(/\/$/, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

export function absoluteUrl(path: string): string | undefined {
  const base = getPublicSiteUrl();
  if (!base) return undefined;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
