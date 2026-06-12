import { FastifyReply } from "fastify";
import {
  AirlineId,
  OpenRouterMessage,
  StreamChunk,
  DeltaToolCall,
  ToolCall,
  SearchResult,
  AgentContext,
  Tool,
} from "../types";
import { TOOLS, ToolName } from "./tools";
import { buildSystemPrompt } from "./prompt";
import { searchAirline } from "../search/bm25";
import { lookupSchedule, listRoutes, FlightRow } from "../search/schedule";
import { AIRLINE_CONFIGS, OPENROUTER_API_URL, MODEL, MAX_AGENT_LOOPS } from "../config";

// ── SSE helper ────────────────────────────────────────────────────────────────

function sendSSE(reply: FastifyReply, event: string, data: unknown): void {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Tool execution ────────────────────────────────────────────────────────────

interface ResolveArgs {
  issue: string;
  context: string;
  steps: string[];
}

function executeTool(
  name: ToolName,
  rawArgs: string,
  airlineId: AirlineId,
  ctx: AgentContext,
  reply: FastifyReply
): string {
  const args = JSON.parse(rawArgs) as Record<string, unknown>;

  // Emit tool_call event so frontend can show "thinking" state
  sendSSE(reply, "tool_call", { tool: name, input: args });

  let result: unknown;

  switch (name) {
    case "search_airline_docs": {
      const { query } = args as { query: string };
      const results = searchAirline(airlineId, query);

      // Accumulate unique sources for the done event
      for (const r of results) {
        const exists = ctx.accumulatedSources.some(
          (s) => s.url === r.url && s.text === r.text
        );
        if (!exists) ctx.accumulatedSources.push(r);
      }

      const MAX_CHUNK_CHARS = 1200;
      const MAX_TOTAL_CHARS = 6000;

      if (results.length > 0) {
        const sections = results.map((r: SearchResult) => {
          const truncated = r.text.length > MAX_CHUNK_CHARS
            ? r.text.slice(0, MAX_CHUNK_CHARS) + "…"
            : r.text;
          return [
            r.heading ? `## ${r.heading}` : `## ${r.title}`,
            truncated,
            `Source: ${r.url}`,
          ].join("\n");
        }).join("\n\n---\n\n");

        result = sections.length > MAX_TOTAL_CHARS
          ? sections.slice(0, MAX_TOTAL_CHARS) + "\n\n[Results truncated for brevity]"
          : sections;
      } else {
        result = "No relevant documents found for this query. Try rephrasing or use general aviation knowledge.";
      }
      break;
    }

    case "flight_schedule_lookup": {
      const { origin, destination } = args as { origin: string; destination: string };
      const flights = lookupSchedule(airlineId, origin, destination);

      if (flights === null) {
        result = `Flight schedule data is not available for ${airlineId}. Please advise the customer to check the airline's website for current schedules.`;
      } else if (flights.length === 0) {
        // No direct flights — show available routes to help Claude suggest alternatives
        const routes = listRoutes(airlineId);
        const fromRoutes = routes.filter(r => r.startsWith(origin.toUpperCase()));
        const toRoutes = routes.filter(r => r.endsWith(destination.toUpperCase()));
        result = `No direct flights found from ${origin} to ${destination}.\n\n` +
          (fromRoutes.length > 0 ? `Flights from ${origin}: ${fromRoutes.join(", ")}\n` : "") +
          (toRoutes.length > 0 ? `Flights to ${destination}: ${toRoutes.join(", ")}` : "");
      } else {
        const lines = flights.map((f: FlightRow) =>
          `${f.flightNo} | ${f.originName || f.origin} → ${f.destName || f.destination} | ` +
          `Dep: ${f.departure} | Arr: ${f.arrival} | ${f.frequency}` +
          (f.via ? ` | Via: ${f.via}` : "") +
          (f.effectiveFrom ? ` | From: ${f.effectiveFrom}` : "") +
          (f.effectiveTill ? ` | Till: ${f.effectiveTill}` : "")
        );
        result = `Found ${flights.length} flight(s) from ${origin} to ${destination}:\n\n` +
          lines.join("\n");
      }
      break;
    }

    case "aviation_knowledge": {
      const { query } = args as { query: string };
      // Marker tool — return an instruction for Claude to answer from its training
      result =
        `Answer the following question using your general aviation and air travel knowledge: "${query}". ` +
        `Be accurate, concise, and helpful.`;
      break;
    }

    case "resolve_customer_issue": {
      const { issue, context, steps } = args as unknown as ResolveArgs;
      const numbered = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      result = `Issue: ${issue}\n\nContext: ${context}\n\nResolution Steps:\n${numbered}`;
      break;
    }

    default: {
      result = `Unknown tool called: ${name}`;
    }
  }

  const resultStr = typeof result === "string" ? result : JSON.stringify(result);

  // Emit tool_result so frontend can optionally display it
  sendSSE(reply, "tool_result", { tool: name, results: resultStr });

  return resultStr;
}

// ── OpenRouter streaming call ─────────────────────────────────────────────────

interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
}

async function streamFromOpenRouter(
  messages: OpenRouterMessage[],
  tools: Tool[],
  apiKey: string,
  reply: FastifyReply
): Promise<{ toolCalls: ToolCall[]; finishReason: string }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://airline-helper.demo",
      "X-Title": "Airline Customer Service Demo",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
      stream: true,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  if (!response.body) {
    throw new Error("OpenRouter returned empty response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Accumulate tool call fragments keyed by their stream index
  const toolCallMap = new Map<number, AccumulatedToolCall>();
  let finishReason = "stop";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split on newlines; keep last partial line in buffer
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue; // keep-alive comments
      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6).trim();
      if (payload === "[DONE]") break;

      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        continue; // malformed chunk
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }

      const delta = choice.delta;

      // Stream text tokens directly to the client
      if (delta.content) {
        sendSSE(reply, "text", delta.content);
      }

      // Accumulate tool call fragments
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls as DeltaToolCall[]) {
          if (!toolCallMap.has(tc.index)) {
            toolCallMap.set(tc.index, { id: "", name: "", arguments: "" });
          }
          const acc = toolCallMap.get(tc.index)!;
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name += tc.function.name;
          if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        }
      }
    }
  }

  // Build final ToolCall array sorted by stream index
  const toolCalls: ToolCall[] = Array.from(toolCallMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, acc]) => ({
      id: acc.id,
      type: "function" as const,
      function: { name: acc.name, arguments: acc.arguments },
    }));

  return { toolCalls, finishReason };
}

// ── Main agentic loop ─────────────────────────────────────────────────────────

export async function runAgentLoop(
  airlineId: AirlineId,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  sessionId: string,
  reply: FastifyReply
): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    sendSSE(reply, "error", { message: "Server misconfiguration: OPENROUTER_API_KEY is not set" });
    reply.raw.end();
    return;
  }

  const config = AIRLINE_CONFIGS[airlineId];
  const ctx: AgentContext = {
    airline: airlineId,
    sessionId,
    accumulatedSources: [],
  };

  // Keep only the last 10 conversation turns to avoid token overflow
  const recentHistory = conversationHistory.slice(-10);

  // Build initial message list
  const messages: OpenRouterMessage[] = [
    { role: "system", content: buildSystemPrompt(config) },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let loops = 0;

  while (loops < MAX_AGENT_LOOPS) {
    loops++;

    let toolCalls: ToolCall[];
    let finishReason: string;

    try {
      ({ toolCalls, finishReason } = await streamFromOpenRouter(
        messages,
        TOOLS,
        apiKey,
        reply
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error calling OpenRouter";
      sendSSE(reply, "error", { message: msg });
      reply.raw.end();
      return;
    }

    // No tool calls or natural stop → agent is done
    if (toolCalls.length === 0 || finishReason === "stop") {
      break;
    }

    // Append assistant message with tool calls (content must be "" not omitted)
    messages.push({
      role: "assistant",
      content: "",
      tool_calls: toolCalls,
    });

    // Execute each tool and append its result
    for (const tc of toolCalls) {
      let resultContent: string;
      try {
        resultContent = executeTool(
          tc.function.name as ToolName,
          tc.function.arguments,
          airlineId,
          ctx,
          reply
        );
      } catch (err) {
        resultContent = err instanceof Error
          ? `Tool error: ${err.message}`
          : "Tool execution failed";
      }

      messages.push({
        role: "tool",
        content: resultContent,
        tool_call_id: tc.id,
      });
    }

    // Loop back — Claude will process tool results and either respond or call more tools
  }

  // Stream complete — send done event with all accumulated source URLs
  sendSSE(reply, "done", { sources: ctx.accumulatedSources });
  reply.raw.end();
}
