// ─── Airline / Chunk ─────────────────────────────────────────────────────────

export type AirlineId = "fly91" | "starair" | "allianceair" | "spicejet";

export interface Chunk {
  id: string;
  airline: AirlineId;
  url: string;
  title: string;
  heading: string;
  text: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  text: string;
  url: string;
  title: string;
  heading: string;
  score: number;
}

// ─── Airline config ───────────────────────────────────────────────────────────

export interface AirlineConfig {
  id: AirlineId;
  name: string;
  dataPath: string;
  color: string;
  personality: string;
  /**
   * Paid add-on services that are DOCUMENTED for this airline (with a real,
   * sourced price). The agent may only offer a `add_service` payment flow for
   * services listed here. If empty, the airline has no self-serve paid add-ons
   * and the agent must NOT invent any — it should deep-link to Manage Booking
   * or escalate instead.
   */
  addOns: AddOnSpec[];
}

export interface AddOnSpec {
  service_type: "excess_baggage" | "meal" | "seat_upgrade" | "zero_cancellation" | "priority_checkin";
  label: string;
  /** Human-readable documented price, e.g. "₹500 per kg" or "₹2,000". */
  priceText: string;
  /** Fixed amount in INR when known; for per-unit pricing leave undefined and let the agent compute. */
  amount?: number;
}

// ─── HTTP request body ────────────────────────────────────────────────────────

export interface ChatRequestBody {
  airline: AirlineId;
  message: string;
  sessionId: string;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// ─── OpenRouter / OpenAI wire types ──────────────────────────────────────────

export interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Tool {
  type: "function";
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  tools: Tool[];
  tool_choice: "auto";
  stream: boolean;
  temperature?: number;
}

// Delta types for parsing SSE stream from OpenRouter
export interface DeltaToolCall {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface StreamDelta {
  content?: string;
  tool_calls?: DeltaToolCall[];
}

export interface StreamChoice {
  delta: StreamDelta;
  finish_reason: string | null;
  index: number;
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

// ─── SSE event payloads ───────────────────────────────────────────────────────

export interface ToolCallEvent {
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolResultEvent {
  tool: string;
  results: unknown;
}

export interface DoneEvent {
  sources: SearchResult[];
}

export interface ErrorEvent {
  message: string;
}

// ─── Escalation & Service action event payloads ───────────────────────────────

export interface EscalationEvent {
  type: "ticket" | "callback";
  ticket_id?: string;       // for tickets
  category: string;
  summary: string;
  eta: string;              // e.g. "2–4 hours"
  passenger_name: string;
  flight: string;
}

export interface ServiceActionEvent {
  service_type: string;
  description: string;
  amount: number;
  payment_url: string;      // mock URL
  action_id: string;
  passenger_name: string;
  flight: string;
}

// ─── Agent context ────────────────────────────────────────────────────────────

export interface AgentContext {
  airline: AirlineId;
  sessionId: string;
  accumulatedSources: SearchResult[];
}
