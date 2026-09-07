'use client';

import { toast } from 'sonner';

type InsightsSessionIdBadgeProps = {
  sessionId: string;
};

export function InsightsSessionIdBadge({
  sessionId,
}: InsightsSessionIdBadgeProps) {
  async function copySessionId() {
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success('Session ID copied');
    } catch {
      toast.error('Could not copy session ID');
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void copySessionId();
      }}
      title="Copy chat session ID for QA feedback"
      className="mt-2 inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md bg-black/20 px-2 py-1 text-left text-xs text-gray-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-gray-200"
    >
      <span className="shrink-0 text-gray-500">Session</span>
      <span className="truncate font-mono text-gray-300">{sessionId}</span>
    </button>
  );
}
