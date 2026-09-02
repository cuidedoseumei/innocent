export type Direction = "up" | "down" | "left" | "right";

export interface TilePos {
  x: number;
  y: number;
}

export type EntityId = string;

export interface PlayerState {
  id: EntityId;
  name: string;
  pos: TilePos;
  facing: Direction;
}

export interface GameState {
  players: Record<EntityId, PlayerState>;
}
