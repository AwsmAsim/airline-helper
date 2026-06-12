import React, { useEffect, useState } from 'react';
import { Ticket, Phone, Clock, CheckCircle, Loader2 } from 'lucide-react';
import type { EscalationData, AirlineConfig } from '../types';

interface Props {
  data: EscalationData;
  config: AirlineConfig;
}

type LoadState = 'loading' | 'done';

const LOADING_STEPS = [
  'Connecting to support team…',
  'Logging your issue…',
  'Assigning priority…',
  'Finalising your request…',
];

export function EscalationCard({ data, config }: Props) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [stepIndex, setStepIndex] = useState(0);

  // Simulate loading for 2.5s then show the confirmation card
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 600);

    const doneTimer = setTimeout(() => {
      setLoadState('done');
    }, 2600);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const isTicket = data.type === 'ticket';
  const Icon = isTicket ? Ticket : Phone;
  const title = isTicket ? 'Support Ticket Opened' : 'Callback Scheduled';
  const accentColor = isTicket ? config.primary : '#059669'; // green for callback

  return (
    <div className="flex items-start gap-2.5 px-4 mb-3">
      {/* Airline avatar — same as MessageBubble */}
      <div
        className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden border"
        style={{ borderColor: `${config.primary}20` }}
      >
        <img src={config.logoUrl} alt={config.name} className="w-5 h-5 object-contain" />
      </div>

      <div className="max-w-[84%]">
        {loadState === 'loading' ? (
          <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3 min-w-[220px]">
            <Loader2
              size={16}
              className="animate-spin flex-shrink-0"
              style={{ color: config.primary }}
            />
            <span className="text-sm text-gray-500 italic">{LOADING_STEPS[stepIndex]}</span>
          </div>
        ) : (
          <div
            className="rounded-2xl rounded-tl-sm shadow-sm border overflow-hidden min-w-[260px]"
            style={{ borderColor: `${accentColor}30` }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ background: `${accentColor}12` }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: accentColor }}
              >
                <Icon size={14} color="white" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: accentColor }}>
                  {title}
                </p>
                {isTicket && data.ticket_id && (
                  <p className="text-xs text-gray-400 font-mono">{data.ticket_id}</p>
                )}
              </div>
              <CheckCircle size={16} className="ml-auto" style={{ color: accentColor }} />
            </div>

            {/* Details grid */}
            <div className="bg-white px-4 py-3 space-y-2">
              <Row label="Passenger" value={data.passenger_name} />
              <Row label="Flight" value={data.flight} mono />
              <Row label="Issue" value={data.category} />
              <Row label="Summary" value={data.summary} />
              <div className="flex items-center gap-1.5 pt-1">
                <Clock size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  Expected response: <span className="font-medium text-gray-700">{data.eta}</span>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 text-xs"
              style={{ background: `${accentColor}08`, color: accentColor }}
            >
              {isTicket
                ? '📧 Confirmation sent to your registered email'
                : '📞 We will call your registered number'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-xs text-gray-700 text-right ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}
