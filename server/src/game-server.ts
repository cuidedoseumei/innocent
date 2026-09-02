import {
  addPlayer,
  applyIntent,
  createGameState,
  type EntityId,
  type GameEvent,
  type GameState,
  type Intent,
  type MapData,
  WALK_DURATION_MS,
} from "@innocent/shared";

interface PlayerSlot {
  // One pending move, the most recent wins — mirrors the client's GridInput.
  pendingMove: Intent | null;
  nextMoveAt: number;
}

// Authoritative game loop core: no sockets, no timers. index.ts feeds it
// connections and intents, calls tick() on an interval, and broadcasts
// whatever events come back.
export class GameServer {
  private readonly map: MapData;
  private readonly state: GameState;
  private readonly slots = new Map<EntityId, PlayerSlot>();

  constructor(map: MapData) {
    this.map = map;
    this.state = createGameState();
  }

  getSnapshot(): GameState {
    return this.state;
  }

  addPlayer(id: EntityId, name: string): GameEvent {
    const player = addPlayer(this.state, id, name, this.map.spawn);
    this.slots.set(id, { pendingMove: null, nextMoveAt: 0 });
    return { type: "entity-joined", player };
  }

  removePlayer(id: EntityId): GameEvent[] {
    if (!this.state.players[id]) return [];
    delete this.state.players[id];
    this.slots.delete(id);
    return [{ type: "entity-left", entityId: id }];
  }

  // Chat applies immediately; movement is buffered and paced by tick() so the
  // server, not the client, is the authority over walking speed.
  handleIntent(id: EntityId, intent: Intent): GameEvent[] {
    const slot = this.slots.get(id);
    if (!slot) return [];
    if (intent.type === "move") {
      slot.pendingMove = intent;
      return [];
    }
    return applyIntent(this.map, this.state, id, intent);
  }

  tick(now: number): GameEvent[] {
    const events: GameEvent[] = [];
    for (const [id, slot] of this.slots) {
      if (!slot.pendingMove || now < slot.nextMoveAt) continue;
      const intent = slot.pendingMove;
      slot.pendingMove = null;
      const produced = applyIntent(this.map, this.state, id, intent);
      if (produced.some((event) => event.type === "entity-moved")) {
        slot.nextMoveAt = now + WALK_DURATION_MS;
      }
      events.push(...produced);
    }
    return events;
  }
}
