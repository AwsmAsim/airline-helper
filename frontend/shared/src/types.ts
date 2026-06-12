export type AirlineId = 'fly91' | 'starair' | 'spicejet' | 'allianceair';

export interface AirlineConfig {
  id: AirlineId;
  name: string;
  primary: string;       // main brand color
  primaryDark: string;   // darker shade for hover/header gradient
  accent: string;        // secondary/accent color
  textOnPrimary: string; // text color on primary bg (white or dark)
  logoUrl: string;
  fontHeading: string;
  fontBody: string;
  tagline: string;
  passenger: PassengerInfo;
  apiUrl: string;
}

export interface PassengerInfo {
  name: string;
  from: string;
  fromCity: string;
  to: string;
  toCity: string;
  flight: string;
  date: string;
  pnr: string;
  class: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  timestamp: Date;
}

export interface SearchResult {
  text: string;
  url: string;
  title: string;
  heading: string;
  score: number;
}

export interface ToolCallState {
  tool: string;
  input: Record<string, unknown>;
}

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'resolving'
  | 'streaming';
