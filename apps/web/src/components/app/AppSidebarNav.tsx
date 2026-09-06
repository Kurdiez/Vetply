'use client';

import { routes } from '@/constants/routes';
import { pathWithoutQueryAndTrailingSlash } from '@/utils/admin-path';
import { SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type AppSidebarNavProps = {
  onNavigate?: () => void;
};

export function AppSidebarNav({ onNavigate }: AppSidebarNavProps) {
  const router = useRouter();
  const path = pathWithoutQueryAndTrailingSlash(router.asPath);
  const insightsActive = path === routes.appInsights;

  return (
    <nav className="relative flex flex-1 flex-col" aria-label="App">
      <ul role="list" className="flex flex-1 flex-col gap-y-1">
        <li>
          <Link
            href={routes.appInsights}
            onClick={() => onNavigate?.()}
            className={classNames(
              'group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold',
              insightsActive
                ? 'bg-white/5 text-white'
                : 'text-gray-200 hover:bg-white/5 hover:text-white',
            )}
          >
            <SparklesIcon
              aria-hidden
              className="size-5 shrink-0 text-gray-400 group-hover:text-white"
            />
            <span className="flex-1">AI Insights</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
