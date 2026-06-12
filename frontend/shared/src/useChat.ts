import { useState, useCallback, useRef } from 'react';
import type { Message, SearchResult, AgentStatus, ToolCallState, AirlineId, EscalationData, ServiceActionData } from './types';

interface UseChatOptions {
  airline: AirlineId;
  apiUrl: string;
  passengerName: string;
  flightInfo: string;
}

interface UseChatReturn {
  messages: Message[];
  status: AgentStatus;
  currentToolCall: ToolCallState | null;
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

export function useChat({
  airline,
  apiUrl,
  passengerName,
  flightInfo,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const isLoadingRef = useRef(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setStatus('thinking');
    setCurrentToolCall(null);

    // Build conversation history (exclude the message we just added)
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    // Enrich message with passenger context
    const enrichedMessage =
      `[Passenger: ${passengerName}, Flight: ${flightInfo}]\n\n${text.trim()}`;

    // Placeholder assistant message that we'll stream into
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    const finish = () => {
      isLoadingRef.current = false;
      setIsLoading(false);
      setStatus('idle');
      setCurrentToolCall(null);
    };

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airline,
          message: enrichedMessage,
          sessionId: sessionId.current,
          conversationHistory: history,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let accumulatedSources: SearchResult[] = [];
      let gotDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7);
          } else if (trimmed.startsWith('data: ')) {
            const raw = trimmed.slice(6);
            try {
              const data = JSON.parse(raw);
              switch (currentEvent) {
                case 'tool_call': {
                  const toolName = data.tool as string;
                  setCurrentToolCall({ tool: toolName, input: data.input });
                  if (toolName === 'search_airline_docs') {
                    setStatus('searching');
                  } else if (toolName === 'resolve_customer_issue') {
                    setStatus('resolving');
                  } else {
                    setStatus('thinking');
                  }
                  break;
                }
                case 'tool_result': {
                  setStatus('streaming');
                  setCurrentToolCall(null);
                  break;
                }
                case 'text': {
                  setStatus('streaming');
                  accumulatedText += data;
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? { ...m, content: accumulatedText }
                        : m
                    )
                  );
                  break;
                }
                case 'done': {
                  gotDone = true;
                  accumulatedSources = data.sources ?? [];
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? { ...m, sources: accumulatedSources }
                        : m
                    )
                  );
                  break;
                }
                case 'escalation': {
                  // Inject a special escalation message into the chat
                  const escalationMsg: Message = {
                    id: `escalation-${Date.now()}`,
                    role: 'assistant',
                    content: '',
                    escalation: data as EscalationData,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, escalationMsg]);
                  break;
                }
                case 'service_action': {
                  // Inject a payment card message into the chat
                  const serviceMsg: Message = {
                    id: `service-${Date.now()}`,
                    role: 'assistant',
                    content: '',
                    serviceAction: data as ServiceActionData,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, serviceMsg]);
                  break;
                }
                case 'error': {
                  const errText = data.message ?? 'Something went wrong. Please try again.';
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? { ...m, content: accumulatedText || errText }
                        : m
                    )
                  );
                  finish();
                  return;
                }
              }
            } catch {
              // non-JSON line, skip
            }
          }
        }
      }

      // If stream ended without a 'done' event but we have text, that's fine
      if (!gotDone && !accumulatedText) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: 'No response received. Please try again.' }
              : m
          )
        );
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: 'Could not reach the server. Please check your connection and try again.',
              }
            : m
        )
      );
    } finally {
      finish();
    }
  }, [messages, airline, apiUrl, passengerName, flightInfo]);

  return { messages, status, currentToolCall, sendMessage, isLoading };
}
