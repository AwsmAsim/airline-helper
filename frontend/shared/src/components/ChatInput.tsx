import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { AirlineConfig } from '../types';

interface Props {
  config: AirlineConfig;
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ config, onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-3 pb-4 pt-2">
      <div
        className="flex items-end gap-2 bg-white rounded-2xl border shadow-sm px-3 py-2 transition-all"
        style={{ borderColor: disabled ? '#e5e7eb' : `${config.primary}50` }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Agent is responding…' : 'Ask anything about your journey…'}
          className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed py-0.5"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
          style={{
            background: value.trim() && !disabled ? config.primary : '#e5e7eb',
          }}
        >
          <Send size={14} color={value.trim() && !disabled ? '#fff' : '#9ca3af'} />
        </button>
      </div>
    </div>
  );
}
