import { type MapData, TILE_SIZE } from "@innocent/shared";
import type Phaser from "phaser";
import { tileTextureKey } from "./placeholder-textures";

export function renderMap(scene: Phaser.Scene, map: MapData): void {
  for (let y = 0; y < map.height; y++) {
    const row = map.tiles[y];
    if (!row) continue;
    for (let x = 0; x < map.width; x++) {
      const tileId = row[x];
      if (tileId === undefined) continue;
      scene.add
        .image(x * TILE_SIZE, y * TILE_SIZE, tileTextureKey(tileId))
        .setOrigin(0, 0)
        .setDepth(0);
    }
  }
}
