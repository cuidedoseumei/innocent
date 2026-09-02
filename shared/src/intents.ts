import type { Direction } from "./types";

// Everything a client may ask the simulation to do. Milestone 2 adds
// e.g. { type: "say"; text: string } — these objects become the wire protocol.
export type Intent = { type: "move"; dir: Direction };
