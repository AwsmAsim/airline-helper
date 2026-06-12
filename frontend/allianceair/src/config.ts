import type { AirlineConfig } from '@airline-helper/shared';

export const config: AirlineConfig = {
  id: 'allianceair',
  name: 'Alliance Air',
  primary: '#1A3C6E',
  primaryDark: '#0F2549',
  accent: '#FFD700',
  textOnPrimary: '#ffffff',
  logoUrl: '/logo.png',
  fontHeading: '"Roboto", sans-serif',
  fontBody: '"Roboto", sans-serif',
  tagline: 'Connecting India',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  passenger: {
    name: 'Sunita Rao',
    from: 'DEL',
    fromCity: 'New Delhi',
    to: 'SLV',
    toCity: 'Shimla',
    flight: '9I 651',
    date: '20 Jun 2026',
    pnr: 'AAL3T7',
    class: 'Economy',
  },
};
