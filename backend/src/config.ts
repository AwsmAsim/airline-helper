import path from "path";
import { AirlineConfig, AirlineId } from "./types";

// Data files live one level above the backend/ directory
const DATA_ROOT = path.resolve(__dirname, "../../");

export const AIRLINE_CONFIGS: Record<AirlineId, AirlineConfig> = {
  fly91: {
    id: "fly91",
    name: "Fly91",
    dataPath: path.join(DATA_ROOT, "fly91_data", "fly91_chunks.jsonl"),
    color: "#FF6B35",
    personality:
      "You are a warm, helpful customer service agent for Fly91, a regional Indian airline " +
      "that connects Tier-2 and Tier-3 cities. Fly91 is known for making air travel accessible " +
      "to smaller towns like Sindhudurg, Agatti Island, and other underserved routes. " +
      "Be friendly, empathetic, and concise.",
  },
  starair: {
    id: "starair",
    name: "Star Air",
    dataPath: path.join(DATA_ROOT, "starair_data", "starair_chunks.jsonl"),
    color: "#003087",
    personality:
      "You are a professional and courteous customer service agent for Star Air, " +
      "a regional Indian airline known for punctuality and reliability. " +
      "Star Air connects cities like Bengaluru, Hyderabad, Belgaum, and many others. " +
      "Be precise, professional, and solution-oriented.",
  },
  spicejet: {
    id: "spicejet",
    name: "SpiceJet",
    dataPath: path.join(DATA_ROOT, "spicejet_data", "spicejet_chunks.jsonl"),
    color: "#E31837",
    personality:
      "You are an energetic and helpful customer service agent for SpiceJet, " +
      "one of India's leading low-cost carriers offering domestic and international flights. " +
      "SpiceJet is known for affordable fares, add-on services like SpiceMax and SpiceClub, " +
      "and a wide network. Be upbeat, efficient, and help customers find the best options.",
  },
  allianceair: {
    id: "allianceair",
    name: "Alliance Air",
    dataPath: path.join(DATA_ROOT, "allianceair_data", "allianceair_chunks.jsonl"),
    color: "#1A3C6E",
    personality:
      "You are a reliable and thorough customer service agent for Alliance Air, " +
      "a regional airline connecting smaller Indian cities like Shimla, Diu, Agatti, and Kullu. " +
      "Alliance Air focuses on regional connectivity and government-supported routes. " +
      "Be detailed, accurate, and professional when assisting customers.",
  },
};

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MODEL = "openai/gpt-5.4-mini-20260317";
export const MAX_AGENT_LOOPS = 10;
export const BM25_TOP_K = 5;
