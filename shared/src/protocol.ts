import type { GameEvent } from "./events";
import type { Intent } from "./intents";
import type { Direction, EntityId, GameState } from "./types";

// Wire protocol between client and server. Intents and GameEvents travel
// verbatim; the map does not — both sides import the same map from shared.
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "intent"; intent: Intent };

export type ServerMessage =
  | { type: "welcome"; playerId: EntityId; snapshot: GameState }
  | { type: "events"; events: GameEvent[] }
  | { type: "error"; message: string };

// Hand-written guards: enough to keep a malformed or hostile payload from
// reaching the simulation. Nested shapes (dir, text) are checked here; the
// simulation still re-validates values it cares about (e.g. chat length).
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const DIRECTIONS: ReadonlySet<unknown> = new Set([
  "up",
  "down",
  "left",
  "right",
]);

export function parseIntent(value: unknown): Intent | null {
  if (!isRecord(value)) return null;
  if (value.type === "move" && DIRECTIONS.has(value.dir)) {
    return { type: "move", dir: value.dir as Direction };
  }
  if (value.type === "say" && typeof value.text === "string") {
    return { type: "say", text: value.text };
  }
  return null;
}

export function parseClientMessage(raw: unknown): ClientMessage | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value)) return null;
  if (value.type === "join" && typeof value.name === "string") {
    return { type: "join", name: value.name };
  }
  if (value.type === "intent") {
    const intent = parseIntent(value.intent);
    if (intent) return { type: "intent", intent };
  }
  return null;
}
