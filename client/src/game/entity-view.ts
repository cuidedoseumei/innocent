import type { GameEvent, PlayerState, TilePos } from "@innocent/shared";
import { TILE_SIZE } from "@innocent/shared";
import type Phaser from "phaser";
import { playerTextureKey } from "./placeholder-textures";

function tileToPixel(pos: TilePos): { x: number; y: number } {
  return {
    x: pos.x * TILE_SIZE + TILE_SIZE / 2,
    y: pos.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

// Visual representation of one entity. The simulation owns the logical tile
// position (updated atomically); this view owns the pixel position, catching
// up with a tween — the same split a server-authoritative client needs.
export class EntityView {
  readonly sprite: Phaser.GameObjects.Image;
  isStepping = false;

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.scene = scene;
    const px = tileToPixel(player.pos);
    this.sprite = scene.add
      .image(px.x, px.y, playerTextureKey(player.facing))
      .setDepth(1);
  }

  applyEvent(event: GameEvent): void {
    switch (event.type) {
      case "entity-moved": {
        this.sprite.setTexture(playerTextureKey(event.facing));
        const target = tileToPixel(event.to);
        this.isStepping = true;
        this.scene.tweens.add({
          targets: this.sprite,
          x: target.x,
          y: target.y,
          duration: event.durationMs,
          onComplete: () => {
            this.isStepping = false;
          },
        });
        break;
      }
      case "entity-turned":
        this.sprite.setTexture(playerTextureKey(event.facing));
        break;
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
