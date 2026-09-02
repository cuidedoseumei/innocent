import { TEST_MAP, TILE_SIZE } from "@innocent/shared";
import Phaser from "phaser";
import type { GameConnection } from "../../net/connection";
import { LocalConnection } from "../../net/local-connection";
import { EntityView } from "../entity-view";
import { GridInput } from "../grid-input";
import { renderMap } from "../map-renderer";
import { generatePlaceholderTextures } from "../placeholder-textures";

// Minimum interval between "bump" intents when walking into a blocked tile,
// so holding a key against a wall doesn't emit an intent every frame.
const BLOCKED_RETRY_MS = 150;

export class WorldScene extends Phaser.Scene {
  private connection!: GameConnection;
  private gridInput!: GridInput;
  private views = new Map<string, EntityView>();
  private nextIntentAt = 0;

  constructor() {
    super("world");
  }

  create(): void {
    this.connection = new LocalConnection(TEST_MAP);
    const map = this.connection.getMap();

    generatePlaceholderTextures(this);
    renderMap(this, map);

    for (const player of Object.values(this.connection.getSnapshot().players)) {
      this.views.set(player.id, new EntityView(this, player));
    }

    this.connection.onEvent((event) => {
      this.views.get(event.entityId)?.applyEvent(event);
    });

    this.gridInput = new GridInput(this);

    const localView = this.views.get(this.connection.playerId);
    if (localView) {
      this.cameras.main.startFollow(localView.sprite, true);
    }
    this.cameras.main.setBounds(
      0,
      0,
      map.width * TILE_SIZE,
      map.height * TILE_SIZE,
    );
  }

  override update(time: number): void {
    this.gridInput.update();

    const localView = this.views.get(this.connection.playerId);
    if (!localView || localView.isStepping) return;
    if (time < this.nextIntentAt) return;

    const dir = this.gridInput.consumeNext();
    if (!dir) return;

    this.connection.sendIntent({ type: "move", dir });
    if (!localView.isStepping) {
      // Move was blocked (only a turn, or nothing): throttle retries.
      this.nextIntentAt = time + BLOCKED_RETRY_MS;
    }
  }
}
