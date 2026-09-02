import {
  addPlayer,
  applyIntent,
  createGameState,
  type EntityId,
  type GameEvent,
  type GameState,
  type Intent,
  type MapData,
} from "@innocent/shared";
import type { GameConnection } from "./connection";

// Milestone 1: the whole simulation runs locally and synchronously.
export class LocalConnection implements GameConnection {
  readonly playerId: EntityId = "local-player";

  private readonly map: MapData;
  private readonly state: GameState;
  private readonly listeners: Array<(event: GameEvent) => void> = [];

  constructor(map: MapData) {
    this.map = map;
    this.state = createGameState();
    addPlayer(this.state, this.playerId, map.spawn);
  }

  getMap(): MapData {
    return this.map;
  }

  getSnapshot(): GameState {
    return this.state;
  }

  sendIntent(intent: Intent): void {
    const events = applyIntent(this.map, this.state, this.playerId, intent);
    for (const event of events) {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
  }

  onEvent(cb: (event: GameEvent) => void): void {
    this.listeners.push(cb);
  }
}
