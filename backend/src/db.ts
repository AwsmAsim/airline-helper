import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH ?? path.resolve(__dirname, "../../logs.db");

// Ensure parent directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database;

try {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   TEXT    NOT NULL,
      airline     TEXT    NOT NULL,
      session_id  TEXT    NOT NULL,
      user_message      TEXT NOT NULL,
      assistant_response TEXT NOT NULL,
      tools_used  TEXT    NOT NULL DEFAULT '[]',
      agent_loops INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      model       TEXT    NOT NULL,
      passenger_name TEXT,
      passenger_flight TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_airline   ON chat_logs(airline);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON chat_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_session   ON chat_logs(session_id);
  `);
} catch (err) {
  // DB init failure must never crash the server
  console.error("[db] Failed to initialise SQLite — logging disabled:", err);
  db = null as unknown as Database.Database;
}

export interface LogEntry {
  airline: string;
  sessionId: string;
  userMessage: string;
  assistantResponse: string;
  toolsUsed: string[];
  agentLoops: number;
  durationMs: number;
  model: string;
  passengerName?: string;
  passengerFlight?: string;
}

export function insertLog(entry: LogEntry): void {
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO chat_logs
        (timestamp, airline, session_id, user_message, assistant_response,
         tools_used, agent_loops, duration_ms, model, passenger_name, passenger_flight)
      VALUES
        (@timestamp, @airline, @sessionId, @userMessage, @assistantResponse,
         @toolsUsed, @agentLoops, @durationMs, @model, @passengerName, @passengerFlight)
    `).run({
      timestamp: new Date().toISOString(),
      airline: entry.airline,
      sessionId: entry.sessionId,
      userMessage: entry.userMessage,
      assistantResponse: entry.assistantResponse,
      toolsUsed: JSON.stringify(entry.toolsUsed),
      agentLoops: entry.agentLoops,
      durationMs: entry.durationMs,
      model: entry.model,
      passengerName: entry.passengerName ?? null,
      passengerFlight: entry.passengerFlight ?? null,
    });
  } catch (err) {
    console.error("[db] insertLog failed:", err);
  }
}

export interface LogFilter {
  airline?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function queryLogs(filter: LogFilter = {}): unknown[] {
  if (!db) return [];
  try {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (filter.airline) {
      conditions.push("airline = @airline");
      params.airline = filter.airline;
    }
    if (filter.from) {
      conditions.push("timestamp >= @from");
      params.from = filter.from;
    }
    if (filter.to) {
      conditions.push("timestamp <= @to");
      params.to = filter.to;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(filter.limit ?? 100, 500);
    const offset = filter.offset ?? 0;

    return db.prepare(`
      SELECT * FROM chat_logs
      ${where}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `).all(params);
  } catch (err) {
    console.error("[db] queryLogs failed:", err);
    return [];
  }
}

export function queryStats(): unknown {
  if (!db) return {};
  try {
    const byAirline = db.prepare(`
      SELECT airline,
             COUNT(*) as total_queries,
             AVG(duration_ms) as avg_duration_ms,
             AVG(agent_loops) as avg_loops
      FROM chat_logs
      GROUP BY airline
    `).all();

    const byTool = db.prepare(`
      SELECT value as tool, COUNT(*) as count
      FROM chat_logs, json_each(tools_used)
      GROUP BY value
      ORDER BY count DESC
    `).all();

    const total = (db.prepare("SELECT COUNT(*) as n FROM chat_logs").get() as { n: number }).n;

    const last24h = (db.prepare(`
      SELECT COUNT(*) as n FROM chat_logs
      WHERE timestamp >= datetime('now', '-24 hours')
    `).get() as { n: number }).n;

    return { total, last24h, byAirline, byTool };
  } catch (err) {
    console.error("[db] queryStats failed:", err);
    return {};
  }
}
