import type { TilePos } from "./types";

export interface MapData {
  width: number;
  height: number;
  // tiles[y][x] = tile id
  tiles: number[][];
  spawn: TilePos;
}

export interface TileDef {
  walkable: boolean;
  color: number;
  name: string;
}

export const TILE_DEFS: Record<number, TileDef> = {
  0: { walkable: true, color: 0x4a7a3a, name: "grass" },
  1: { walkable: true, color: 0x8a6b46, name: "dirt" },
  2: { walkable: false, color: 0x2f5f8f, name: "water" },
  3: { walkable: false, color: 0x6e6e6e, name: "stone-wall" },
};

export function tileAt(map: MapData, pos: TilePos): number | undefined {
  return map.tiles[pos.y]?.[pos.x];
}

export function isWalkable(map: MapData, pos: TilePos): boolean {
  const id = tileAt(map, pos);
  if (id === undefined) return false;
  return TILE_DEFS[id]?.walkable ?? false;
}
