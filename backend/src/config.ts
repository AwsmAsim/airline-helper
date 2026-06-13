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
    addOns: [
      { service_type: "excess_baggage", label: "Pre-book excess baggage", priceText: "+5kg ₹1,000 · +10kg ₹2,000 · +20kg ₹2,500 · +30kg ₹3,000 (airport rate ₹500/kg)" },
      { service_type: "meal", label: "Pre-book a meal", priceText: "as shown at Manage Booking" },
      { service_type: "seat_upgrade", label: "Seat selection / upgrade", priceText: "as shown at Manage Booking" },
    ],
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
    addOns: [
      { service_type: "meal", label: "Pre-book meals on board", priceText: "₹2,000", amount: 2000 },
      { service_type: "priority_checkin", label: "Priority Check-In (prebook)", priceText: "₹550", amount: 550 },
    ],
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
    addOns: [
      { service_type: "zero_cancellation", label: "Zero Cancellation add-on", priceText: "Trip cancellation extension (powered by Liberty General Insurance)" },
      { service_type: "priority_checkin", label: "SpiceMax / priority privileges", priceText: "from ₹950 (domestic)", amount: 950 },
    ],
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
    // No add-on pricing is published in Alliance Air's docs — do NOT offer a paid
    // self-serve flow. Deep-link to Manage Booking or escalate instead.
    addOns: [],
  },
};

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MODEL = "openai/gpt-5.4-mini-20260317";
export const MAX_AGENT_LOOPS = 10;
export const BM25_TOP_K = 5;
