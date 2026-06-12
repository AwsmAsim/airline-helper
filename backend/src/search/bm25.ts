import fs from "fs";
import readline from "readline";
import path from "path";

/* eslint-disable @typescript-eslint/no-var-requires */
const BM25 = require("wink-bm25-text-search");
const winkNLP = require("wink-nlp");
const model = require("wink-eng-lite-web-model");
/* eslint-enable @typescript-eslint/no-var-requires */

import { Chunk, AirlineId, SearchResult } from "../types";
import { BM25_TOP_K } from "../config";

// ── Shared NLP pipeline (tokenizer) ──────────────────────────────────────────

const nlp = winkNLP(model);
const its = nlp.its;

function prepareTokens(text: string): string[] {
  return nlp.readDoc(text).tokens().out(its.normal) as string[];
}

// ── Per-airline index store ───────────────────────────────────────────────────

interface AirlineIndex {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: any;
  chunks: Map<string, Chunk>;
}

const indexes = new Map<AirlineId, AirlineIndex>();

// ── Build one airline's index ─────────────────────────────────────────────────

async function buildAirlineIndex(
  airlineId: AirlineId,
  dataPath: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engine: any = BM25();

  engine.defineConfig({
    fldWeights: { heading: 2, text: 3, title: 1 },
    bm25Params: { k1: 1.2, b: 0.75, k3: 1 },
  });

  // definePrepTasks takes an array of transform functions
  engine.definePrepTasks([prepareTokens]);

  const chunks = new Map<string, Chunk>();

  if (!fs.existsSync(dataPath)) {
    console.warn(`[bm25] ⚠️  Data file not found: ${dataPath}`);
    indexes.set(airlineId, { engine, chunks });
    return;
  }

  const fileStream = fs.createReadStream(dataPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let docIndex = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let chunk: Chunk;
    try {
      chunk = JSON.parse(trimmed) as Chunk;
    } catch {
      console.warn(`[bm25] Skipping malformed line ${docIndex} in ${path.basename(dataPath)}`);
      continue;
    }

    const docId = String(docIndex);
    chunks.set(docId, chunk);

    engine.addDoc(
      {
        heading: chunk.heading ?? "",
        text: chunk.text ?? "",
        title: chunk.title ?? "",
      },
      docId
    );

    docIndex++;
  }

  // consolidate() must be called before search(); requires at least a few docs
  if (docIndex === 0) {
    console.warn(`[bm25] ⚠️  No documents indexed for ${airlineId} — search will return empty results`);
    indexes.set(airlineId, { engine, chunks });
    return;
  }
  engine.consolidate();
  indexes.set(airlineId, { engine, chunks });
  console.log(`[bm25] ✅  ${airlineId}: indexed ${docIndex} chunks`);
}

// ── Public: build all indexes at startup ──────────────────────────────────────

export async function buildAllIndexes(
  configs: Record<AirlineId, { dataPath: string }>
): Promise<void> {
  const entries = Object.entries(configs) as Array<[AirlineId, { dataPath: string }]>;
  await Promise.all(entries.map(([id, cfg]) => buildAirlineIndex(id, cfg.dataPath)));
}

// ── Public: search one airline ────────────────────────────────────────────────

export function searchAirline(
  airlineId: AirlineId,
  query: string,
  topK: number = BM25_TOP_K
): SearchResult[] {
  const index = indexes.get(airlineId);
  if (!index) {
    throw new Error(`No BM25 index found for airline: ${airlineId}`);
  }

  // Return empty if no documents were indexed
  if (index.chunks.size === 0) return [];

  // wink-bm25 returns: [ [docId: string, score: number], ... ]
  const rawResults: Array<[string, number]> = index.engine.search(query, topK);

  return rawResults
    .filter(([, score]) => score > 0)
    .map(([docId, score]) => {
      const chunk = index.chunks.get(docId);
      if (!chunk) return null;
      return {
        text: chunk.text,
        url: chunk.url,
        title: chunk.title,
        heading: chunk.heading,
        score,
      };
    })
    .filter((r): r is SearchResult => r !== null);
}
