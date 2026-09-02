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

export function isTileOccupied(state: GameState, pos: TilePos): boolean {
  for (const player of Object.values(state.players)) {
    if (player.pos.x === pos.x && player.pos.y === pos.y) return true;
  }
  return false;
}

// Nearest walkable, unoccupied tile starting at map.spawn (BFS), so players
// don't stack on the same tile when joining. Falls back to the spawn itself
// if the whole map is somehow full.
export function findFreeSpawn(map: MapData, state: GameState): TilePos {
  const queue: TilePos[] = [map.spawn];
  const seen = new Set<string>([`${map.spawn.x},${map.spawn.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const pos = queue[i];
    if (!pos) break;
    if (isWalkable(map, pos) && !isTileOccupied(state, pos)) return pos;
    for (const delta of Object.values(DELTAS)) {
      const next = { x: pos.x + delta.x, y: pos.y + delta.y };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isWalkable(map, next)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return { ...map.spawn };
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

      if (!isWalkable(map, to) || isTileOccupied(state, to)) {
        // Tibia behavior: bumping into a blocked tile (or another player)
        // only turns the character. Always emit the event, even when the
        // facing is unchanged: client prediction relies on every applied
        // move producing exactly one response to reconcile against.
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
