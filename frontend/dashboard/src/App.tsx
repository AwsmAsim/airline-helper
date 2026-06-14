import React, { useEffect, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN = import.meta.env.VITE_DASHBOARD_TOKEN ?? '';

const AIRLINE_COLORS: Record<string, string> = {
  fly91: '#FF6B35',
  starair: '#003087',
  spicejet: '#E31837',
  allianceair: '#1A3C6E',
};

const AIRLINE_NAMES: Record<string, string> = {
  fly91: 'Fly91',
  starair: 'Star Air',
  spicejet: 'SpiceJet',
  allianceair: 'Alliance Air',
};

function authHeaders(): Record<string, string> {
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogRow {
  id: number;
  timestamp: string;
  airline: string;
  session_id: string;
  user_message: string;
  assistant_response: string;
  tools_used: string; // JSON array
  agent_loops: number;
  duration_ms: number;
  model: string;
  passenger_name: string | null;
  passenger_flight: string | null;
}

interface AirlineStat {
  airline: string;
  total_queries: number;
  avg_duration_ms: number;
  avg_loops: number;
}

interface ToolStat {
  tool: string;
  count: number;
}

interface Stats {
  total: number;
  last24h: number;
  byAirline: AirlineStat[];
  byTool: ToolStat[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toolList(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function AirlineBar({ stat, max }: { stat: AirlineStat; max: number }) {
  const pct = max > 0 ? (stat.total_queries / max) * 100 : 0;
  const color = AIRLINE_COLORS[stat.airline] ?? '#6b7280';
  return (
    <div className="airline-bar-row">
      <div className="airline-bar-label">
        <span className="airline-dot" style={{ background: color }} />
        {AIRLINE_NAMES[stat.airline] ?? stat.airline}
      </div>
      <div className="airline-bar-track">
        <div className="airline-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="airline-bar-count">{stat.total_queries}</div>
      <div className="airline-bar-meta">{fmt(Math.round(stat.avg_duration_ms))} avg</div>
    </div>
  );
}

function ExpandedRow({ row }: { row: LogRow }) {
  const tools = toolList(row.tools_used);
  return (
    <div className="expanded-row">
      <div className="expanded-section">
        <div className="expanded-heading">User message</div>
        <div className="expanded-text">{row.user_message}</div>
      </div>
      <div className="expanded-section">
        <div className="expanded-heading">Assistant response</div>
        <div className="expanded-text">{row.assistant_response || <em>—</em>}</div>
      </div>
      {tools.length > 0 && (
        <div className="expanded-section">
          <div className="expanded-heading">Tools used</div>
          <div className="tool-chips">
            {tools.map(t => (
              <span key={t} className="tool-chip">{t}</span>
            ))}
          </div>
        </div>
      )}
      <div className="expanded-meta-row">
        <span>Session: <code>{row.session_id}</code></span>
        <span>Model: <code>{row.model}</code></span>
        <span>Loops: {row.agent_loops}</span>
        {row.passenger_name && <span>Passenger: {row.passenger_name}</span>}
        {row.passenger_flight && <span>Flight: {row.passenger_flight}</span>}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [airlineFilter, setAirlineFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (airlineFilter) params.set('airline', airlineFilter);
      if (fromFilter) params.set('from', new Date(fromFilter).toISOString());
      if (toFilter) params.set('to', new Date(toFilter + 'T23:59:59').toISOString());

      const [statsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/logs/stats`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/logs?${params}`, { headers: authHeaders() }),
      ]);

      if (!statsRes.ok || !logsRes.ok) {
        throw new Error(`Server returned ${statsRes.status} / ${logsRes.status}`);
      }

      setStats(await statsRes.json());
      setLogs(await logsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [airlineFilter, fromFilter, toFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxQueries = Math.max(...(stats?.byAirline.map(s => s.total_queries) ?? [1]), 1);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-title">
            <span className="header-logo">✈</span>
            Airline Helper — Usage Dashboard
          </div>
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="main">
        {error && <div className="error-banner">{error}</div>}

        {/* ── Stats row ── */}
        {stats && (
          <section className="stats-row">
            <StatCard label="Total queries" value={stats.total} />
            <StatCard label="Last 24 h" value={stats.last24h} />
            <StatCard
              label="Airlines active"
              value={stats.byAirline.length}
            />
            {stats.byAirline[0] && (
              <StatCard
                label="Top airline"
                value={AIRLINE_NAMES[stats.byAirline.sort((a, b) => b.total_queries - a.total_queries)[0].airline] ?? stats.byAirline[0].airline}
                sub={`${stats.byAirline[0].total_queries} queries`}
              />
            )}
          </section>
        )}

        <div className="two-col">
          {/* ── Airline breakdown ── */}
          {stats && stats.byAirline.length > 0 && (
            <section className="card">
              <h2 className="card-title">Queries by airline</h2>
              <div className="airline-bars">
                {[...stats.byAirline]
                  .sort((a, b) => b.total_queries - a.total_queries)
                  .map(s => <AirlineBar key={s.airline} stat={s} max={maxQueries} />)}
              </div>
            </section>
          )}

          {/* ── Tool usage ── */}
          {stats && stats.byTool.length > 0 && (
            <section className="card">
              <h2 className="card-title">Tool usage</h2>
              <table className="tool-table">
                <thead>
                  <tr><th>Tool</th><th>Calls</th></tr>
                </thead>
                <tbody>
                  {stats.byTool.map(t => (
                    <tr key={t.tool}>
                      <td><span className="tool-chip">{t.tool}</span></td>
                      <td className="tool-count">{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* ── Filters ── */}
        <section className="card">
          <h2 className="card-title">Query log</h2>
          <div className="filters">
            <select
              value={airlineFilter}
              onChange={e => setAirlineFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All airlines</option>
              {Object.entries(AIRLINE_NAMES).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <input
              type="date"
              value={fromFilter}
              onChange={e => setFromFilter(e.target.value)}
              className="filter-input"
              placeholder="From"
            />
            <input
              type="date"
              value={toFilter}
              onChange={e => setToFilter(e.target.value)}
              className="filter-input"
              placeholder="To"
            />
            <button className="filter-btn" onClick={fetchData}>Apply</button>
            <button className="filter-btn secondary" onClick={() => {
              setAirlineFilter(''); setFromFilter(''); setToFilter('');
            }}>Clear</button>
          </div>

          {/* ── Log table ── */}
          {logs.length === 0 && !loading ? (
            <div className="empty">No queries yet — start a conversation on any airline widget.</div>
          ) : (
            <div className="table-wrap">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Airline</th>
                    <th>Message</th>
                    <th>Tools</th>
                    <th>Duration</th>
                    <th>Loops</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(row => {
                    const tools = toolList(row.tools_used);
                    const color = AIRLINE_COLORS[row.airline] ?? '#6b7280';
                    const isExpanded = expandedId === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`log-row ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        >
                          <td className="col-time">{fmtDate(row.timestamp)}</td>
                          <td className="col-airline">
                            <span className="airline-badge" style={{ background: color }}>
                              {AIRLINE_NAMES[row.airline] ?? row.airline}
                            </span>
                          </td>
                          <td className="col-message">
                            <span className="message-preview">
                              {row.user_message.replace(/\[Passenger:[^\]]+\]\s*/g, '').slice(0, 80)}
                              {row.user_message.length > 80 ? '…' : ''}
                            </span>
                          </td>
                          <td className="col-tools">
                            {tools.length > 0
                              ? tools.map(t => <span key={t} className="tool-chip mini">{t}</span>)
                              : <span className="no-tools">—</span>}
                          </td>
                          <td className="col-duration">{fmt(row.duration_ms)}</td>
                          <td className="col-loops">{row.agent_loops}</td>
                        </tr>
                        {isExpanded && (
                          <tr className="expanded-container">
                            <td colSpan={6}>
                              <ExpandedRow row={row} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
