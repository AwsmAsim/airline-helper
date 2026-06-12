import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';
import type { Message, AirlineConfig } from '../types';

const LOADING_MESSAGES = [
  'Looking into this for you…',
  'Searching through airline docs…',
  'Fetching the latest info…',
  'Almost there…',
  'Putting together your answer…',
];

function TypingPlaceholder({ config }: { config: AirlineConfig }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 italic">{LOADING_MESSAGES[index]}</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: config.primary, animationDelay: `${i * 150}ms`, opacity: 0.6 }}
          />
        ))}
      </span>
    </div>
  );
}

interface Props {
  message: Message;
  config: AirlineConfig;
}

export function MessageBubble({ message, config }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-4 mb-3">
        <div
          className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-white text-sm leading-relaxed shadow-sm"
          style={{ background: config.primary }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-4 mb-3">
      {/* Airline avatar */}
      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden border" style={{ borderColor: `${config.primary}20` }}>
        <img src={config.logoUrl} alt={config.name} className="w-5 h-5 object-contain" />
      </div>

      <div className="max-w-[84%] flex flex-col gap-1.5">
        {/* Message card */}
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold" style={{ color: config.primaryDark }}>
                    {children}
                  </strong>
                ),
                h2: ({ children }) => (
                  <h2 className="font-bold text-base mb-1 mt-2" style={{ color: config.primaryDark }}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-semibold text-sm mb-1 mt-2" style={{ color: config.primary }}>
                    {children}
                  </h3>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="text-xs border-collapse w-full">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th
                    className="text-left px-2 py-1.5 font-semibold text-white text-xs"
                    style={{ background: config.primary }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1.5 border-b border-gray-100 text-xs">{children}</td>
                ),
                tr: ({ children }) => (
                  <tr className="even:bg-gray-50">{children}</tr>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: config.primary }}
                  >
                    {children}
                  </a>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>
                ),
                hr: () => <hr className="my-2 border-gray-100" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <TypingPlaceholder config={config} />
          )}
        </div>

        {/* Source pills */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {message.sources
              .filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i) // dedupe by URL
              .slice(0, 4)
              .map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all hover:opacity-80"
                  style={{
                    borderColor: `${config.primary}40`,
                    color: config.primary,
                    background: `${config.primary}08`,
                  }}
                >
                  <ExternalLink size={9} />
                  {source.heading || source.title || 'Source'}
                </a>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
