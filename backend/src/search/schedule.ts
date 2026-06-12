/**
 * Flight schedule lookup — parses raw JSONL chunks into a structured
 * in-memory route map at startup, then does exact origin→destination lookup.
 *
 * Supported formats (auto-detected per airline):
 *   SpiceJet : tab-separated  FlightNo\tOrigin\tDest\tDep\tArr\tFreq\tVia\tFrom\tTill
 *   StarAir  : tab-separated  Aircraft\tFlightNo\tOrigin(IATA)\tDep\tDest(IATA)\tArr\tDays\tType\t…\tFrom\tTill
 *   Fly91    : newline-per-field  IC####\n ORG\n DES\n DEP\n ARR\n Freq\n Dates
 *   AllianceAir: no schedule data scraped — graceful empty response
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { AirlineId } from "../types";

export interface FlightRow {
  flightNo: string;
  origin: string;       // IATA code
  originName: string;
  destination: string;  // IATA code
  destName: string;
  departure: string;    // "HH:MM" or "HH:MM AM/PM"
  arrival: string;
  frequency: string;    // "Daily" / "Mon/Wed/Fri" / "Mo,Tu,We…"
  effectiveFrom: string;
  effectiveTill: string;
  via?: string;
}

// route key: "DEL→BOM"
type RouteMap = Map<string, FlightRow[]>;

const scheduleIndex: Record<AirlineId, RouteMap> = {
  fly91: new Map(),
  starair: new Map(),
  spicejet: new Map(),
  allianceair: new Map(),
};

// ── helpers ───────────────────────────────────────────────────────────────────

function routeKey(origin: string, dest: string) {
  return `${origin.trim().toUpperCase()}→${dest.trim().toUpperCase()}`;
}

function addFlight(map: RouteMap, row: FlightRow) {
  const key = routeKey(row.origin, row.destination);
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(row);
}

/** Extract IATA code from strings like "Bengaluru  BLR" or "Bengaluru (BLR)" */
function extractIATA(s: string): { iata: string; name: string } {
  s = s.replace(/\xa0/g, " ").trim();
  const m = s.match(/\(([A-Z]{3})\)/) || s.match(/\b([A-Z]{3})\b/);
  if (m) {
    const iata = m[1];
    const name = s.replace(/\s*[\[(]?[A-Z]{3}[\])]?\s*$/, "").trim();
    return { iata, name };
  }
  return { iata: s.slice(0, 3).toUpperCase(), name: s };
}

// City name → IATA code mapping for Indian airports used by SpiceJet
const CITY_TO_IATA: Record<string, string> = {
  "Ahmedabad": "AMD", "Bagdogra": "IXB", "Bengaluru": "BLR", "Bangalore": "BLR",
  "Chennai": "MAA", "Darbhanga": "DBR", "Delhi": "DEL", "New Delhi": "DEL",
  "Dharamshala": "DHM", "Goa": "GOI", "Gorakhpur": "GOP", "Guwahati": "GAU",
  "Hyderabad": "HYD", "Jaipur": "JAI", "Jammu": "IXJ", "Kandla": "IXY",
  "Kochi": "COK", "Kolkata": "CCU", "Kozhikode": "CCJ", "Calicut": "CCJ",
  "Leh": "IXL", "Lucknow": "LKO", "Mumbai": "BOM", "Bombay": "BOM",
  "Patna": "PAT", "Porbandar": "PBD", "Port Blair": "IXZ", "Pune": "PNQ",
  "Shillong": "SHL", "Shivamogga": "RQY", "Srinagar": "SXR", "Udaipur": "UDR",
  "Varanasi": "VNS", "Amritsar": "ATQ", "Bhopal": "BHO", "Chandigarh": "IXC",
  "Coimbatore": "CJB", "Dibrugarh": "DIB", "Indore": "IDR", "Mangalore": "IXE",
  "Nagpur": "NAG", "Raipur": "RPR", "Ranchi": "IXR", "Thiruvananthapuram": "TRV",
  "Tiruchirappalli": "TRZ", "Trichy": "TRZ", "Vijayawada": "VGA", "Visakhapatnam": "VTZ",
};

function cityToIATA(name: string): string {
  const clean = name.trim();
  return CITY_TO_IATA[clean] ?? clean.slice(0, 3).toUpperCase();
}

// ── SpiceJet parser ───────────────────────────────────────────────────────────
// Row: SG 114\tDelhi\tMumbai\t6:00 AM\t8:05 AM\tDaily\t-\t01 Jun 26\t30 Sep 26

function parseSpiceJet(text: string, map: RouteMap) {
  const tableStart = text.indexOf("Flight No\tOrigin");
  if (tableStart === -1) return;
  const lines = text.slice(tableStart).split("\n");
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 6) continue;
    if (!cols[0].match(/^SG\s*\d+/)) continue;
    const [flightNo, originName, destName, departure, arrival, frequency, via, effectiveFrom, effectiveTill] = cols;
    addFlight(map, {
      flightNo: flightNo.trim(),
      origin: cityToIATA(originName),
      originName: originName.trim(),
      destination: cityToIATA(destName),
      destName: destName.trim(),
      departure: departure?.trim() ?? "",
      arrival: arrival?.trim() ?? "",
      frequency: frequency?.trim() ?? "",
      via: via?.trim() === "-" ? undefined : via?.trim(),
      effectiveFrom: effectiveFrom?.trim() ?? "",
      effectiveTill: effectiveTill?.trim() ?? "",
    });
  }
}

// ── StarAir parser ────────────────────────────────────────────────────────────
// Row: ERJ 175\tS5151\tBengaluru  (BLR)\t12:30\tHyderabad  (HYD)\t13:40\tMo,We,Th,Fr,Sa,Su\tDirect\t\t29 Mar 2026\t24 Oct 2026

function parseStarAir(text: string, map: RouteMap) {
  const lines = text.split("\n");
  for (const line of lines) {
    const cols = line.replace(/\xa0/g, " ").split("\t");
    if (cols.length < 7) continue;
    // Detect: first col = aircraft type, second = flight code starting S5
    if (!cols[1]?.trim().match(/^S5\d+/)) continue;
    const flightNo = cols[1].trim();
    const orig = extractIATA(cols[2]);
    const dest = extractIATA(cols[4]);
    const departure = cols[3]?.trim() ?? "";
    const arrival = cols[5]?.trim() ?? "";
    // Days col: Mo,Tu,We… → convert to readable
    const rawDays = cols[6]?.trim() ?? "";
    const frequency = rawDays === "Mo,Tu,We,Th,Fr,Sa,Su" ? "Daily" : rawDays;
    const effectiveFrom = cols[9]?.trim() ?? cols[8]?.trim() ?? "";
    const effectiveTill = cols[10]?.trim() ?? cols[9]?.trim() ?? "";
    addFlight(map, {
      flightNo,
      origin: orig.iata,
      originName: orig.name,
      destination: dest.iata,
      destName: dest.name,
      departure,
      arrival,
      frequency,
      effectiveFrom,
      effectiveTill,
    });
  }
}

// ── Fly91 parser ──────────────────────────────────────────────────────────────
// PDF text — fields on successive lines:
// Sector name
// IC####   ← flight no
// ORG (3-letter)
// DES (3-letter)
// HH:MM    ← dep
// HH:MM    ← arr
// Daily/Mon/…
// From DD Mon YYYY

function parseFly91(text: string, map: RouteMap) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let i = 0;
  while (i < lines.length) {
    // Flight number line
    if (!lines[i].match(/^IC\d{3,4}$/)) { i++; continue; }
    const flightNo = lines[i];
    const origin = lines[i + 1]?.toUpperCase().slice(0, 3) ?? "";
    const destination = lines[i + 2]?.toUpperCase().slice(0, 3) ?? "";
    const departure = lines[i + 3] ?? "";
    const arrival = lines[i + 4] ?? "";
    const frequency = lines[i + 5] ?? "";
    const effectiveFrom = lines[i + 6]?.replace(/^From\s*/i, "") ?? "";
    if (origin.match(/^[A-Z]{3}$/) && destination.match(/^[A-Z]{3}$/)) {
      addFlight(map, {
        flightNo,
        origin,
        originName: origin,
        destination,
        destName: destination,
        departure,
        arrival,
        frequency,
        effectiveFrom,
        effectiveTill: "",
      });
    }
    i += 7;
  }
}

// ── Load all schedules at startup ─────────────────────────────────────────────

export async function loadSchedules(dataRoot: string): Promise<void> {
  // Each airline can have multiple schedule files — all parsed into the same route map
  const configs: Array<{ id: AirlineId; files: string[]; parser: (text: string, map: RouteMap) => void }> = [
    {
      id: "spicejet",
      files: [
        "spicejet_data/spicejet_chunks.jsonl",
        "spicejet_data/spicejet_schedule_live.jsonl",  // freshly scraped full schedule
      ],
      parser: parseSpiceJet,
    },
    { id: "starair",     files: ["starair_data/starair_chunks.jsonl"],         parser: parseStarAir },
    { id: "fly91",       files: ["fly91_data/fly91_chunks.jsonl"],             parser: parseFly91 },
    { id: "allianceair", files: ["allianceair_data/allianceair_chunks.jsonl"], parser: () => {} },
  ];

  await Promise.all(configs.map(async ({ id, files, parser }) => {
    const map: RouteMap = new Map();

    for (const file of files) {
      const filePath = path.join(dataRoot, file);
      if (!fs.existsSync(filePath)) continue;

      const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as { text: string };
          parser(chunk.text, map);
        } catch { /* skip malformed */ }
      }
    }

    scheduleIndex[id] = map;
    const totalFlights = Array.from(map.values()).reduce((s, v) => s + v.length, 0);
    console.log(`[schedule] ${id}: ${map.size} routes, ${totalFlights} flights`);
  }));
}

// ── Public lookup ─────────────────────────────────────────────────────────────

export function lookupSchedule(
  airlineId: AirlineId,
  origin: string,
  destination: string
): FlightRow[] | null {
  const map = scheduleIndex[airlineId];
  if (!map || map.size === 0) return null;

  const key = routeKey(origin, destination);
  return map.get(key) ?? null;
}

export function listRoutes(airlineId: AirlineId): string[] {
  const map = scheduleIndex[airlineId];
  if (!map) return [];
  return Array.from(map.keys());
}
