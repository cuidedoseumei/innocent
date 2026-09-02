import type { GameEvent, PlayerState, TilePos } from "@innocent/shared";
import { TILE_SIZE } from "@innocent/shared";
import type Phaser from "phaser";
import { playerTextureKey } from "./placeholder-textures";

const SPEECH_DURATION_MS = 3000;

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
  readonly container: Phaser.GameObjects.Container;
  readonly name: string;
  isStepping = false;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private speech: Phaser.GameObjects.Text | null = null;
  private speechTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.scene = scene;
    this.name = player.name;
    const px = tileToPixel(player.pos);

    this.sprite = scene.add.image(0, 0, playerTextureKey(player.facing));
    const label = scene.add
      .text(0, -TILE_SIZE / 2 - 6, player.name, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#7cf27c",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setResolution(2);

    this.container = scene.add
      .container(px.x, px.y, [this.sprite, label])
      .setDepth(1);
  }

  applyEvent(event: GameEvent): void {
    switch (event.type) {
      case "entity-moved": {
        this.sprite.setTexture(playerTextureKey(event.facing));
        const target = tileToPixel(event.to);
        this.isStepping = true;
        this.scene.tweens.add({
          targets: this.container,
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
      default:
        break;
    }
  }

  // Tibia-style floating speech above the head, gone after a few seconds.
  say(text: string): void {
    this.speech?.destroy();
    this.speechTimer?.remove();
    this.speech = this.scene.add
      .text(0, -TILE_SIZE / 2 - 18, text, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f2e97c",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: TILE_SIZE * 5 },
      })
      .setOrigin(0.5, 1)
      .setResolution(2);
    this.container.add(this.speech);
    this.speechTimer = this.scene.time.delayedCall(SPEECH_DURATION_MS, () => {
      this.speech?.destroy();
      this.speech = null;
      this.speechTimer = null;
    });
  }

  destroy(): void {
    this.speechTimer?.remove();
    this.container.destroy(true);
  }
}
