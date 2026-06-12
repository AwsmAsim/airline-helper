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

// Escalation payload from backend
export interface EscalationData {
  type: 'ticket' | 'callback';
  ticket_id?: string;
  category: string;
  summary: string;
  eta: string;
  passenger_name: string;
  flight: string;
}

// Service/payment action payload from backend
export interface ServiceActionData {
  service_type: string;
  description: string;
  amount: number;
  payment_url: string;
  action_id: string;
  passenger_name: string;
  flight: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  escalation?: EscalationData;
  serviceAction?: ServiceActionData;
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
