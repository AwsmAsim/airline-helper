import React from 'react';
import type { AirlineConfig } from '../types';

interface Props {
  config: AirlineConfig;
  onSelect: (q: string) => void;
}

const QUESTIONS: Record<string, string[]> = {
  fly91: [
    'What is the baggage allowance?',
    'How do I do web check-in?',
    'What is the refund policy?',
    'How do I contact Fly91 support?',
  ],
  starair: [
    'What is the baggage allowance?',
    'Can I change my flight?',
    'What are the fare rules?',
    'How do I reach Star Air?',
  ],
  spicejet: [
    'What is the baggage allowance?',
    'What is SpiceMax?',
    'How do I cancel my flight?',
    'What is Zero Cancellation?',
  ],
  allianceair: [
    'What is the baggage allowance?',
    'What is the refund process?',
    'How do I check in online?',
    'How do I contact Alliance Air?',
  ],
};

export function SuggestedQuestions({ config, onSelect }: Props) {
  const questions = QUESTIONS[config.id] ?? QUESTIONS.fly91;

  return (
    <div className="px-4 pb-3">
      <p className="text-xs text-gray-400 mb-2 text-center">Tap a question to get started</p>
      <div className="flex flex-wrap justify-center gap-2">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95"
            style={{
              borderColor: `${config.primary}50`,
              color: config.primary,
              background: `${config.primary}08`,
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
