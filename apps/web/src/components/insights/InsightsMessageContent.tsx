import type { ReactNode } from 'react';
import Link from 'next/link';

const UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export type InsightsMessageContentProps = {
  content: string;
  resolveProductHref?: (productId: string) => string | null;
};

export function InsightsMessageContent({
  content,
  resolveProductHref,
}: InsightsMessageContentProps) {
  return (
    <p className="whitespace-pre-wrap text-sm/6 text-gray-100">
      {renderContentNodes(content, resolveProductHref)}
    </p>
  );
}

function renderContentNodes(
  content: string,
  resolveProductHref: ((productId: string) => string | null) | undefined,
): ReactNode[] {
  if (!resolveProductHref) {
    return [content];
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(UUID_RE.source, 'gi');

  while ((match = regex.exec(content)) !== null) {
    const uuid = match[1];
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(content.slice(lastIndex, start));
    }
    const href = resolveProductHref(uuid);
    if (href) {
      nodes.push(
        <Link
          key={`${uuid}-${start}`}
          href={href}
          className="font-medium text-primary-300 underline decoration-primary-500/50 underline-offset-2 hover:text-primary-200"
        >
          {uuid}
        </Link>,
      );
    } else {
      nodes.push(uuid);
    }
    lastIndex = start + uuid.length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}
