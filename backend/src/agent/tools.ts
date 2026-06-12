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
];

export type ToolName =
  | "search_airline_docs"
  | "flight_schedule_lookup"
  | "aviation_knowledge"
  | "resolve_customer_issue";
