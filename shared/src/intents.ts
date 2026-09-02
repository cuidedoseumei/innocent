import type { Direction } from "./types";

// Everything a client may ask the simulation to do. These objects are the
// wire protocol: the client sends them verbatim to the server.
export type Intent =
  | { type: "move"; dir: Direction }
  | { type: "say"; text: string };
