import type { Direction, EntityId, PlayerState, TilePos } from "./types";

// Facts emitted by the simulation (or by the server, for join/leave).
// Views react to these and never mutate state themselves; the server
// broadcasts them verbatim.
export type GameEvent =
  | {
      type: "entity-moved";
      entityId: EntityId;
      from: TilePos;
      to: TilePos;
      facing: Direction;
      durationMs: number;
    }
  | { type: "entity-turned"; entityId: EntityId; facing: Direction }
  | { type: "entity-joined"; player: PlayerState }
  | { type: "entity-left"; entityId: EntityId }
  | { type: "entity-said"; entityId: EntityId; name: string; text: string };
