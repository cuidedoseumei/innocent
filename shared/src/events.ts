import type { Direction, EntityId, TilePos } from "./types";

// Facts emitted by the simulation. Views react to these and never mutate
// state themselves; in milestone 2 the server broadcasts them verbatim.
export type GameEvent =
  | {
      type: "entity-moved";
      entityId: EntityId;
      from: TilePos;
      to: TilePos;
      facing: Direction;
      durationMs: number;
    }
  | { type: "entity-turned"; entityId: EntityId; facing: Direction };
