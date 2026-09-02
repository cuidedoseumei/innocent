import { MAX_CHAT_LENGTH, WALK_DURATION_MS } from "../constants";
import type { GameEvent } from "../events";
import type { Intent } from "../intents";
import { isWalkable, type MapData } from "../map";
import type {
  Direction,
  EntityId,
  GameState,
  PlayerState,
  TilePos,
} from "../types";

// Pure simulation core: no Phaser, no DOM, no timers. In milestone 2 the
// server imports this verbatim and becomes the authority over the same rules.

const DELTAS: Record<Direction, TilePos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createGameState(): GameState {
  return { players: {} };
}

export function addPlayer(
  state: GameState,
  id: EntityId,
  name: string,
  pos: TilePos,
): PlayerState {
  const player: PlayerState = { id, name, pos: { ...pos }, facing: "down" };
  state.players[id] = player;
  return player;
}

export function applyIntent(
  map: MapData,
  state: GameState,
  entityId: EntityId,
  intent: Intent,
): GameEvent[] {
  const player = state.players[entityId];
  if (!player) return [];

  switch (intent.type) {
    case "move": {
      const delta = DELTAS[intent.dir];
      const to = { x: player.pos.x + delta.x, y: player.pos.y + delta.y };

      if (!isWalkable(map, to)) {
        // Tibia behavior: bumping into a blocked tile only turns the character.
        if (player.facing === intent.dir) return [];
        player.facing = intent.dir;
        return [{ type: "entity-turned", entityId, facing: intent.dir }];
      }

      const from = player.pos;
      player.pos = to;
      player.facing = intent.dir;
      return [
        {
          type: "entity-moved",
          entityId,
          from,
          to,
          facing: intent.dir,
          durationMs: WALK_DURATION_MS,
        },
      ];
    }
    case "say": {
      const text = intent.text.trim().slice(0, MAX_CHAT_LENGTH);
      if (!text) return [];
      return [{ type: "entity-said", entityId, name: player.name, text }];
    }
  }
}
