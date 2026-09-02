import { TILE_SIZE } from "@innocent/shared";
import Phaser from "phaser";
import type { GameConnection } from "../../net/connection";
import { ChatUi } from "../../ui/chat-ui";
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
  private chatUi!: ChatUi;
  private views = new Map<string, EntityView>();
  private nextIntentAt = 0;

  constructor() {
    super("world");
  }

  init(data: { connection: GameConnection }): void {
    this.connection = data.connection;
  }

  create(): void {
    const map = this.connection.getMap();

    generatePlaceholderTextures(this);
    renderMap(this, map);

    for (const player of Object.values(this.connection.getSnapshot().players)) {
      this.views.set(player.id, new EntityView(this, player));
    }

    this.chatUi = new ChatUi({
      onSend: (text) => this.connection.sendIntent({ type: "say", text }),
      onTypingChange: (typing) => {
        const keyboard = this.input.keyboard;
        if (!keyboard) return;
        if (typing) {
          keyboard.disableGlobalCapture();
        } else {
          keyboard.enableGlobalCapture();
          keyboard.resetKeys();
        }
      },
    });

    this.connection.onEvent((event) => {
      switch (event.type) {
        case "entity-joined": {
          if (!this.views.has(event.player.id)) {
            this.views.set(event.player.id, new EntityView(this, event.player));
          }
          this.chatUi.addSystemMessage(`${event.player.name} entrou.`);
          break;
        }
        case "entity-left": {
          const view = this.views.get(event.entityId);
          if (view) {
            this.chatUi.addSystemMessage(`${view.name} saiu.`);
            view.destroy();
            this.views.delete(event.entityId);
          }
          break;
        }
        case "entity-said": {
          this.chatUi.addMessage(event.name, event.text);
          this.views.get(event.entityId)?.say(event.text);
          break;
        }
        default:
          this.views.get(event.entityId)?.applyEvent(event);
      }
    });

    this.gridInput = new GridInput(this);

    const localView = this.views.get(this.connection.playerId);
    if (localView) {
      this.cameras.main.startFollow(localView.container, true);
    }
    this.cameras.main.setBounds(
      0,
      0,
      map.width * TILE_SIZE,
      map.height * TILE_SIZE,
    );
  }

  override update(time: number): void {
    if (this.chatUi.isTyping()) return;

    this.gridInput.update();

    const localView = this.views.get(this.connection.playerId);
    if (!localView || localView.isStepping) return;
    if (time < this.nextIntentAt) return;

    const dir = this.gridInput.consumeNext();
    if (!dir) return;

    this.connection.sendIntent({ type: "move", dir });
    if (!localView.isStepping) {
      // Move was blocked or is in flight to the server: throttle resends.
      this.nextIntentAt = time + BLOCKED_RETRY_MS;
    }
  }
}
