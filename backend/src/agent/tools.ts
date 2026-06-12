import { Tool } from "../types";

export const TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "search_airline_docs",
      description:
        "Search the airline's official knowledge base documents for policy information, " +
        "FAQs, baggage rules, check-in procedures, special assistance, refund policies, " +
        "contact details, fare rules, and any other airline-specific information. " +
        "Always use this first when the customer asks about something that may be covered " +
        "in official documentation. If results seem incomplete, try a rephrased query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A focused keyword search query. Extract the core topic from the customer's message. " +
              "Examples: 'baggage allowance economy', 'web check-in deadline', " +
              "'cancellation refund policy', 'unaccompanied minor travel'.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flight_schedule_lookup",
      description:
        "Look up the actual flight schedule for a specific route (origin → destination). " +
        "Use this when the customer asks about: available flights on a route, departure/arrival times, " +
        "which days flights operate, return flight options, or flight frequency. " +
        "Always use this instead of search_airline_docs for schedule/timetable questions. " +
        "Use 3-letter IATA airport codes (e.g. DEL, BOM, BLR, HYD, AGX).",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "3-letter IATA code of the departure airport. E.g. 'DEL', 'BOM', 'BLR'.",
          },
          destination: {
            type: "string",
            description: "3-letter IATA code of the arrival airport. E.g. 'HYD', 'AGX', 'COK'.",
          },
        },
        required: ["origin", "destination"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aviation_knowledge",
      description:
        "Answer questions using general aviation and air travel knowledge that is not " +
        "specific to this airline — such as how airport security works, standard DGCA regulations, " +
        "what documents are needed for domestic vs international travel, general boarding process, " +
        "what a PNR is, how flight status codes work, or other generic aviation topics. " +
        "Use this when the question does not require airline-specific documentation.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The customer's question to answer from general aviation knowledge.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_customer_issue",
      description:
        "Use this when the customer has reported a problem (lost baggage, missed flight, " +
        "refund not received, booking error, etc.) and you have gathered enough context " +
        "from the knowledge base. This structures a clear, step-by-step resolution guide " +
        "for the customer so they know exactly what to do next.",
      parameters: {
        type: "object",
        properties: {
          issue: {
            type: "string",
            description: "A one-sentence summary of the customer's issue.",
          },
          context: {
            type: "string",
            description:
              "Relevant policy or procedural context gathered from documents or knowledge.",
          },
          steps: {
            type: "array",
            items: { type: "string" },
            description:
              "Ordered list of concrete steps the customer should take to resolve the issue. " +
              "Be specific — include who to contact, what information to keep ready, and timelines.",
          },
        },
        required: ["issue", "context", "steps"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_service",
      description:
        "Use this when the customer wants to add a paid service to their existing booking — " +
        "such as excess baggage, a pre-booked meal, or a seat upgrade. " +
        "Only offer this when the airline's documents confirm this service is available. " +
        "Before calling this tool, confirm the details with the customer (e.g. how many kg, meal preference). " +
        "Calculate the total amount from the documented rates before calling.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["excess_baggage", "meal", "seat_upgrade", "zero_cancellation"],
            description: "The type of service being added.",
          },
          details: {
            type: "object",
            description: "Service-specific details.",
            properties: {
              kg: { type: "number", description: "For excess_baggage: number of kg to add." },
              meal_type: { type: "string", description: "For meal: e.g. 'Veg', 'Non-Veg', 'Snack'." },
              seat_preference: { type: "string", description: "For seat_upgrade: e.g. 'Window', 'Aisle', 'Extra Legroom'." },
            },
          },
          amount: {
            type: "number",
            description: "Total amount in INR the passenger will be charged. Calculate from documented rates.",
          },
          description: {
            type: "string",
            description: "Human-readable summary e.g. '5 kg excess baggage' or 'Veg meal pre-booking'.",
          },
        },
        required: ["service_type", "details", "amount", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_issue",
      description:
        "Use this when the customer's issue cannot be resolved through information alone and requires " +
        "human intervention — such as lost/damaged baggage, refund not received, flight disruption without " +
        "rebooking, medical assistance failures, or staff complaints. " +
        "Before calling, gather any missing information by asking the customer (e.g. contact number for callback, " +
        "bag description for lost baggage). Name, PNR, and flight are already known from context — do not ask for those. " +
        "Choose 'callback' for urgent issues, 'ticket' for non-urgent ones.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["ticket", "callback"],
            description: "'ticket' for non-urgent issues, 'callback' for urgent ones needing immediate human contact.",
          },
          category: {
            type: "string",
            enum: ["lost_baggage", "damaged_baggage", "refund_delay", "flight_disruption", "staff_complaint", "special_assistance", "other"],
            description: "Category of the issue.",
          },
          summary: {
            type: "string",
            description: "Clear one-sentence summary of the issue to include in the ticket/callback request.",
          },
          collected_info: {
            type: "array",
            description: "Any extra info gathered from the customer beyond what's in their booking context.",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                value: { type: "string" },
              },
              required: ["key", "value"],
            },
          },
          urgency: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Urgency level — affects callback ETA shown to customer.",
          },
        },
        required: ["type", "category", "summary", "collected_info", "urgency"],
        additionalProperties: false,
      },
    },
  },
];

export type ToolName =
  | "search_airline_docs"
  | "flight_schedule_lookup"
  | "aviation_knowledge"
  | "resolve_customer_issue"
  | "add_service"
  | "escalate_issue";
