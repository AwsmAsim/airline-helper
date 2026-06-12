import type { AirlineConfig } from '@airline-helper/shared';

export const config: AirlineConfig = {
  id: 'starair',
  name: 'Star Air',
  primary: '#003087',
  primaryDark: '#001F5C',
  accent: '#FFD700',
  textOnPrimary: '#ffffff',
  logoUrl: '/logo.png',
  fontHeading: '"Playfair Display", serif',
  fontBody: '"Inter", sans-serif',
  tagline: 'Fly Punctual',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  passenger: {
    name: 'Priya Menon',
    from: 'BLR',
    fromCity: 'Bengaluru',
    to: 'HYD',
    toCity: 'Hyderabad',
    flight: 'S5 401',
    date: '16 Jun 2026',
    pnr: 'STR4M9',
    class: 'Economy',
  },
};
