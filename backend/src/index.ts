import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

import { buildAllIndexes } from "./search/bm25";
import { loadSchedules } from "./search/schedule";
import { runAgentLoop } from "./agent/loop";
import { AIRLINE_CONFIGS, MODEL } from "./config";
import { ChatRequestBody, AirlineId } from "./types";
import { queryLogs, queryStats } from "./db";

dotenv.config();

// ── Server setup ──────────────────────────────────────────────────────────────

const server = Fastify({
  logger:
    process.env.NODE_ENV !== "production"
      ? { level: "info", transport: { target: "pino-pretty" } }
      : { level: "info" },
});

const VALID_AIRLINES = new Set<AirlineId>([
  "fly91",
  "starair",
  "spicejet",
  "allianceair",
]);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // CORS — allow all origins for the demo (tighten for production)
  await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  // Build all BM25 indexes before accepting traffic
  server.log.info("Building BM25 search indexes...");
  await buildAllIndexes(
    Object.fromEntries(
      Object.entries(AIRLINE_CONFIGS).map(([id, cfg]) => [id, { dataPath: cfg.dataPath }])
    ) as Record<AirlineId, { dataPath: string }>
  );
  server.log.info("All indexes ready ✅");

  // Load flight schedule indexes
  server.log.info("Loading flight schedules...");
  const dataRoot = require("path").resolve(__dirname, "../../");
  await loadSchedules(dataRoot);
  server.log.info("Flight schedules loaded ✅");

  // ── GET /health ─────────────────────────────────────────────────────────────

  server.get("/health", async () => ({
    status: "ok",
    model: MODEL,
    airlines: Object.values(AIRLINE_CONFIGS).map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
    })),
  }));

  // ── GET /api/logs ───────────────────────────────────────────────────────────

  server.get("/api/logs", async (request, reply) => {
    const token = process.env.DASHBOARD_TOKEN;
    if (token) {
      const auth = (request.headers.authorization ?? "").replace("Bearer ", "");
      if (auth !== token) return reply.status(401).send({ error: "Unauthorized" });
    }
    const q = request.query as Record<string, string>;
    const logs = queryLogs({
      airline: q.airline,
      from: q.from,
      to: q.to,
      limit: q.limit ? parseInt(q.limit, 10) : 100,
      offset: q.offset ? parseInt(q.offset, 10) : 0,
    });
    return logs;
  });

  // ── GET /api/logs/stats ─────────────────────────────────────────────────────

  server.get("/api/logs/stats", async (request, reply) => {
    const token = process.env.DASHBOARD_TOKEN;
    if (token) {
      const auth = (request.headers.authorization ?? "").replace("Bearer ", "");
      if (auth !== token) return reply.status(401).send({ error: "Unauthorized" });
    }
    return queryStats();
  });

  // ── POST /chat ──────────────────────────────────────────────────────────────

  server.post<{ Body: ChatRequestBody }>(
    "/chat",
    {
      schema: {
        body: {
          type: "object",
          required: ["airline", "message", "sessionId"],
          properties: {
            airline: { type: "string" },
            message: { type: "string", minLength: 1, maxLength: 2000 },
            sessionId: { type: "string" },
            conversationHistory: {
              type: "array",
              default: [],
              items: {
                type: "object",
                required: ["role", "content"],
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        airline,
        message,
        sessionId,
        conversationHistory = [],
      } = request.body;

      // Validate airline
      if (!VALID_AIRLINES.has(airline as AirlineId)) {
        return reply.status(400).send({
          error: `Unknown airline "${airline}". Valid options: ${Array.from(VALID_AIRLINES).join(", ")}`,
        });
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      });

      // Log disconnects
      request.raw.on("close", () => {
        server.log.info({ sessionId, airline }, "Client disconnected");
      });

      try {
        await runAgentLoop(
          airline as AirlineId,
          message.trim(),
          conversationHistory,
          sessionId,
          reply
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Internal server error";
        server.log.error({ err, sessionId, airline }, "Agent loop error");
        try {
          reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`);
          reply.raw.end();
        } catch {
          // Stream already closed
        }
      }
    }
  );

  // ── Start ───────────────────────────────────────────────────────────────────

  const port = parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await server.listen({ port, host });
  server.log.info(`🚀  Server listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
