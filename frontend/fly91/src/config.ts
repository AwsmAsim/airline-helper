import type { AirlineConfig } from '@airline-helper/shared';

export const config: AirlineConfig = {
  id: 'fly91',
  name: 'Fly91',
  primary: '#046C94',
  primaryDark: '#024F6E',
  accent: '#FCB404',
  textOnPrimary: '#ffffff',
  logoUrl: '/logo.gif',
  fontHeading: '"Inter", sans-serif',
  fontBody: '"Inter", sans-serif',
  tagline: 'Bharat Unbound',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  passenger: {
    name: 'Rahul Sharma',
    from: 'BOM',
    fromCity: 'Mumbai',
    to: 'AGX',
    toCity: 'Agatti Island',
    flight: '9I 101',
    date: '14 Jun 2026',
    pnr: 'FLY7K2',
    class: 'Economy',
  },
};
