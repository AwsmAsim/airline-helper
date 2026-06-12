import React, { useState } from 'react';
import { ChevronDown, ChevronUp, User, PlaneTakeoff } from 'lucide-react';
import type { AirlineConfig } from '../types';

interface Props {
  config: AirlineConfig;
}

export function PassengerStrip({ config }: Props) {
  const [expanded, setExpanded] = useState(false);
  const p = config.passenger;

  return (
    <div
      className="mx-3 mt-2 mb-1 rounded-xl overflow-hidden shadow-sm border"
      style={{ borderColor: `${config.primary}30` }}
    >
      {/* Collapsed row — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        style={{ background: `${config.primary}10` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
            style={{ background: config.primary }}
          >
            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {/* Name + route */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <PlaneTakeoff size={11} />
              <span className="font-medium" style={{ color: config.primary }}>{p.from}</span>
              <span>→</span>
              <span className="font-medium" style={{ color: config.primary }}>{p.to}</span>
              <span className="text-gray-400">·</span>
              <span>{p.flight}</span>
              <span className="text-gray-400">·</span>
              <span>{p.date}</span>
            </p>
          </div>
        </div>
        <div style={{ color: config.primary }} className="flex-shrink-0 ml-2">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-4 py-3 grid grid-cols-2 gap-2 border-t text-xs"
          style={{ borderColor: `${config.primary}20`, background: `${config.primary}06` }}
        >
          <DetailItem label="Passenger" value={p.name} />
          <DetailItem label="PNR" value={p.pnr} mono />
          <DetailItem label="From" value={`${p.fromCity} (${p.from})`} />
          <DetailItem label="To" value={`${p.toCity} (${p.to})`} />
          <DetailItem label="Flight" value={p.flight} />
          <DetailItem label="Date" value={p.date} />
          <DetailItem label="Class" value={p.class} />
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-gray-400 uppercase tracking-wide" style={{ fontSize: '10px' }}>{label}</p>
      <p className={`text-gray-700 font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
