import { type Direction, TILE_DEFS, TILE_SIZE } from "@innocent/shared";
import type Phaser from "phaser";

// Runtime-generated placeholder art: one texture per tile id, and one
// player texture per facing direction (a square with a "nose" marker).

export function tileTextureKey(tileId: number): string {
  return `tile-${tileId}`;
}

export function playerTextureKey(facing: Direction): string {
  return `player-${facing}`;
}

export function generatePlaceholderTextures(scene: Phaser.Scene): void {
  for (const [idStr, def] of Object.entries(TILE_DEFS)) {
    const key = tileTextureKey(Number(idStr));
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    g.fillStyle(def.color, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Subtle darker border so the grid is readable with flat colors.
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  const bodyMargin = 6;
  const noseSize = 6;
  const directions: Direction[] = ["up", "down", "left", "right"];
  for (const facing of directions) {
    const key = playerTextureKey(facing);
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    g.fillStyle(0xd94f4f, 1);
    g.fillRect(
      bodyMargin,
      bodyMargin,
      TILE_SIZE - 2 * bodyMargin,
      TILE_SIZE - 2 * bodyMargin,
    );
    g.fillStyle(0xffe08a, 1);
    const mid = TILE_SIZE / 2 - noseSize / 2;
    switch (facing) {
      case "up":
        g.fillRect(mid, bodyMargin - 2, noseSize, noseSize);
        break;
      case "down":
        g.fillRect(
          mid,
          TILE_SIZE - bodyMargin - noseSize + 2,
          noseSize,
          noseSize,
        );
        break;
      case "left":
        g.fillRect(bodyMargin - 2, mid, noseSize, noseSize);
        break;
      case "right":
        g.fillRect(
          TILE_SIZE - bodyMargin - noseSize + 2,
          mid,
          noseSize,
          noseSize,
        );
        break;
    }
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }
}
