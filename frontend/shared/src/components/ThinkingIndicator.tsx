import React from 'react';
import { Search, Wrench } from 'lucide-react';
import type { AgentStatus, ToolCallState, AirlineConfig } from '../types';

interface Props {
  status: AgentStatus;
  toolCall: ToolCallState | null;
  config: AirlineConfig;
}

export function ThinkingIndicator({ status, toolCall, config }: Props) {
  // Only show for tool activity (searching / resolving) — not for generic thinking
  // The message bubble already shows the loading state for 'thinking' / 'streaming'
  if (status === 'idle' || status === 'streaming' || status === 'thinking') return null;

  const getContent = () => {
    if (status === 'searching' && toolCall) {
      const query = (toolCall.input as { query?: string }).query ?? '';
      return {
        icon: <Search size={12} />,
        text: query ? `Searching for "${query}"` : `Searching ${config.name} docs…`,
      };
    }
    if (status === 'resolving') {
      return {
        icon: <Wrench size={12} />,
        text: 'Preparing resolution steps…',
      };
    }
    return null;
  };

  const content = getContent();
  if (!content) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="w-7 h-7 flex-shrink-0" /> {/* spacer to align with message bubbles */}
      <div
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
        style={{ background: `${config.primary}10`, color: config.primary }}
      >
        <span className="animate-pulse">{content.icon}</span>
        <span className="font-medium">{content.text}</span>
        <span className="flex gap-0.5 ml-0.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1 h-1 rounded-full animate-bounce"
              style={{ background: config.primary, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
