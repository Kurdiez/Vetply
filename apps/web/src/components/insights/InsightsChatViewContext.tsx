'use client';

import { InsightsChatStreamEvent } from '@vetply/shared';
import { streamInsightsChatSend } from '@/utils/vetply-api/insights-api';
import { messageForVetplyFailReason } from '@/utils/vetply-api/fail-reason-messages';
import { VetplyBadRequestError } from '@/utils/vetply-api/vetply-bad-request-error';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import {
  createMessageId,
  toApiMessages,
  type InsightsDisplayedMessage,
  type InsightsToolActivity,
} from './insights-chat.types';
import {
  getInsightsContextBudget,
  type InsightsContextBudget,
} from './insights-context-budget';

export type InsightsChatViewContextValue = {
  messages: InsightsDisplayedMessage[];
  toolActivities: InsightsToolActivity[];
  isStreaming: boolean;
  contextBudget: InsightsContextBudget;
  resolveProductHref?: (productId: string) => string | null;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  startNewChat: () => void;
};

const InsightsChatViewContext =
  createContext<InsightsChatViewContextValue | null>(null);

export type InsightsChatViewProviderProps = {
  children: ReactNode;
  resolveProductHref?: (productId: string) => string | null;
};

export function InsightsChatViewProvider({
  children,
  resolveProductHref,
}: InsightsChatViewProviderProps) {
  const [messages, setMessages] = useState<InsightsDisplayedMessage[]>([]);
  const [toolActivities, setToolActivities] = useState<InsightsToolActivity[]>(
    [],
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    clearStreamingFlags(setMessages);
  }, []);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setToolActivities([]);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (content.length === 0 || isStreaming) {
        return;
      }

      const projectedBudget = getInsightsContextBudget([
        ...messages,
        { role: 'user', content },
      ]);
      if (projectedBudget.status === 'limit_reached') {
        toast.error(
          'This chat has reached the estimated context limit. Reset to start a new conversation.',
        );
        return;
      }

      const turn = beginUserTurn(content);
      const history = [...messages, turn.userMessage];
      const controller = startStreamingTurn(
        turn,
        setMessages,
        setToolActivities,
        setIsStreaming,
        abortRef,
      );

      try {
        await streamAssistantReply({
          history,
          signal: controller.signal,
          onStreamEvent: (event) =>
            applyStreamEvent(
              event,
              turn.assistantMessage.id,
              setMessages,
              setToolActivities,
            ),
        });
      } catch (error) {
        handleSendFailure(error, controller.signal.aborted);
      } finally {
        finishStreamingTurn(controller, abortRef, setIsStreaming, setMessages);
      }
    },
    [isStreaming, messages],
  );

  const contextBudget = useMemo(
    () => getInsightsContextBudget(messages),
    [messages],
  );

  const value = useMemo<InsightsChatViewContextValue>(
    () => ({
      messages,
      toolActivities,
      isStreaming,
      contextBudget,
      resolveProductHref,
      sendMessage,
      stopStreaming,
      startNewChat,
    }),
    [
      messages,
      toolActivities,
      isStreaming,
      contextBudget,
      resolveProductHref,
      sendMessage,
      stopStreaming,
      startNewChat,
    ],
  );

  return (
    <InsightsChatViewContext.Provider value={value}>
      {children}
    </InsightsChatViewContext.Provider>
  );
}

export function useInsightsChatView(): InsightsChatViewContextValue {
  const value = useContext(InsightsChatViewContext);
  if (!value) {
    throw new Error(
      'useInsightsChatView must be used within InsightsChatViewProvider',
    );
  }
  return value;
}

function beginUserTurn(content: string): {
  userMessage: InsightsDisplayedMessage;
  assistantMessage: InsightsDisplayedMessage;
} {
  return {
    userMessage: {
      id: createMessageId(),
      role: 'user',
      content,
    },
    assistantMessage: {
      id: createMessageId(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    },
  };
}

function startStreamingTurn(
  turn: {
    userMessage: InsightsDisplayedMessage;
    assistantMessage: InsightsDisplayedMessage;
  },
  setMessages: Dispatch<SetStateAction<InsightsDisplayedMessage[]>>,
  setToolActivities: Dispatch<SetStateAction<InsightsToolActivity[]>>,
  setIsStreaming: Dispatch<SetStateAction<boolean>>,
  abortRef: { current: AbortController | null },
): AbortController {
  setMessages((prev) => [...prev, turn.userMessage, turn.assistantMessage]);
  setToolActivities([]);
  setIsStreaming(true);
  const controller = new AbortController();
  abortRef.current = controller;
  return controller;
}

async function streamAssistantReply(params: {
  history: InsightsDisplayedMessage[];
  signal: AbortSignal;
  onStreamEvent: (event: InsightsChatStreamEvent) => void;
}): Promise<void> {
  await streamInsightsChatSend(
    { messages: toApiMessages(params.history) },
    {
      signal: params.signal,
      onEvent: params.onStreamEvent,
    },
  );
}

function finishStreamingTurn(
  controller: AbortController,
  abortRef: { current: AbortController | null },
  setIsStreaming: Dispatch<SetStateAction<boolean>>,
  setMessages: Dispatch<SetStateAction<InsightsDisplayedMessage[]>>,
): void {
  if (abortRef.current === controller) {
    abortRef.current = null;
  }
  setIsStreaming(false);
  clearStreamingFlags(setMessages);
}

function clearStreamingFlags(
  setMessages: Dispatch<SetStateAction<InsightsDisplayedMessage[]>>,
): void {
  setMessages((prev) =>
    prev.map((message) =>
      message.isStreaming ? { ...message, isStreaming: false } : message,
    ),
  );
}

function applyStreamEvent(
  event: InsightsChatStreamEvent,
  assistantMessageId: string,
  setMessages: Dispatch<SetStateAction<InsightsDisplayedMessage[]>>,
  setToolActivities: Dispatch<SetStateAction<InsightsToolActivity[]>>,
): void {
  if (event.type === 'text_delta') {
    appendAssistantText(assistantMessageId, event.text, setMessages);
    return;
  }
  if (event.type === 'tool_status') {
    recordToolActivity(event.name, event.status, setToolActivities);
    return;
  }
  if (event.type === 'error') {
    toast.error(messageForVetplyFailReason(event.failReason));
  }
}

function appendAssistantText(
  assistantMessageId: string,
  text: string,
  setMessages: Dispatch<SetStateAction<InsightsDisplayedMessage[]>>,
): void {
  setMessages((prev) =>
    prev.map((message) =>
      message.id === assistantMessageId
        ? { ...message, content: `${message.content}${text}` }
        : message,
    ),
  );
}

function recordToolActivity(
  name: string,
  status: 'started' | 'completed',
  setToolActivities: Dispatch<SetStateAction<InsightsToolActivity[]>>,
): void {
  setToolActivities((prev) => {
    if (status === 'started') {
      return [...prev, { name, status }];
    }
    const next = [...prev];
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i].name === name && next[i].status === 'started') {
        next[i] = { name, status: 'completed' };
        return next;
      }
    }
    return [...next, { name, status: 'completed' }];
  });
}

function handleSendFailure(error: unknown, wasAborted: boolean): void {
  if (wasAborted) {
    return;
  }
  if (error instanceof VetplyBadRequestError) {
    toast.error(messageForVetplyFailReason(error.failReason));
    return;
  }
  toast.error(
    'Something unexpected happened. Please try again or contact support.',
  );
}
