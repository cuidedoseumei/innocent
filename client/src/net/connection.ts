import type {
  EntityId,
  GameEvent,
  GameState,
  Intent,
  MapData,
} from "@innocent/shared";

// The seam between rendering and game logic. The scene only talks to this
// interface; milestone 2 adds a WsConnection implementation backed by an
// authoritative server without touching the scene or the views.
export interface GameConnection {
  readonly playerId: EntityId;
  getMap(): MapData;
  getSnapshot(): GameState;
  sendIntent(intent: Intent): void;
  onEvent(cb: (event: GameEvent) => void): void;
}
