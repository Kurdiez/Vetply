'use client';

import { Button } from '@/components/ui/Button';
import { useState, type FormEvent, type KeyboardEvent } from 'react';

type InsightsChatComposerProps = {
  disabled?: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
};

export function InsightsChatComposer({
  disabled = false,
  isStreaming,
  onSend,
  onStop,
}: InsightsChatComposerProps) {
  const [draft, setDraft] = useState('');

  function submitDraft() {
    const content = draft.trim();
    if (content.length === 0 || disabled || isStreaming) {
      return;
    }
    setDraft('');
    onSend(content);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitDraft();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 flex-col gap-3 border-t border-white/10 pt-4"
    >
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={disabled || isStreaming}
        placeholder="Ask about catalogue products, suppliers, or listed prices…"
        className="w-full resize-none rounded-md border-0 bg-white/5 px-3 py-2 text-sm text-white shadow-xs ring-1 ring-white/10 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
      />
      <div className="flex items-center justify-end gap-2">
        {isStreaming ? (
          <Button type="button" variant="secondary" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={disabled || draft.trim().length === 0}
          >
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
