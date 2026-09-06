'use client';

import type { InsightsToolActivity } from './insights-chat.types';

type InsightsToolStatusBarProps = {
  activities: InsightsToolActivity[];
};

export function InsightsToolStatusBar({
  activities,
}: InsightsToolStatusBarProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <details className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/10">
      <summary className="cursor-pointer text-xs font-medium text-gray-300">
        Tools used ({activities.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {activities.map((activity, index) => (
          <li
            key={`${activity.name}-${index}`}
            className="text-xs text-gray-400"
          >
            <span className="font-mono text-gray-200">{activity.name}</span>
            {' · '}
            {activity.status === 'started' ? 'running' : 'done'}
          </li>
        ))}
      </ul>
    </details>
  );
}
