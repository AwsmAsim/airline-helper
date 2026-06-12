import type { AirlineConfig } from '@airline-helper/shared';

export const config: AirlineConfig = {
  id: 'spicejet',
  name: 'SpiceJet',
  primary: '#ED1B23',
  primaryDark: '#B01018',
  accent: '#FAD903',
  textOnPrimary: '#ffffff',
  logoUrl: '/logo.png',
  fontHeading: '"Nunito", sans-serif',
  fontBody: '"Nunito", sans-serif',
  tagline: 'Red. Hot. Deals.',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  passenger: {
    name: 'Arjun Kapoor',
    from: 'DEL',
    fromCity: 'New Delhi',
    to: 'BOM',
    toCity: 'Mumbai',
    flight: 'SG 114',
    date: '18 Jun 2026',
    pnr: 'SPC9X1',
    class: 'Economy',
  },
};
