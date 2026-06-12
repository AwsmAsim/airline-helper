import React from 'react';
import type { AirlineConfig } from '../types';

interface Props {
  config: AirlineConfig;
}

export function Header({ config }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${config.primaryDark} 0%, ${config.primary} 100%)`,
      }}
    >
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
        <img src={config.logoUrl} alt={config.name} className="w-7 h-7 object-contain" />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1
          className="text-white font-bold leading-tight truncate"
          style={{ fontFamily: config.fontHeading, fontSize: '16px' }}
        >
          {config.name}
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-white/80 text-xs">Customer Support · Online</p>
        </div>
      </div>

      {/* Tagline pill */}
      <div className="bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 flex-shrink-0">
        <p className="text-white/90 font-medium" style={{ fontSize: '10px' }}>
          {config.tagline}
        </p>
      </div>
    </div>
  );
}
