import { SERVER_PORT, TEST_MAP } from "@innocent/shared";
import Phaser from "phaser";
import { WorldScene } from "./game/scenes/world-scene";
import type { GameConnection } from "./net/connection";
import { LocalConnection } from "./net/local-connection";
import { WsConnection } from "./net/ws-connection";
import { requireElement } from "./ui/dom";

// Join flow: ask the name in a DOM overlay, connect, and only then boot
// Phaser with the ready connection. `?local` skips the server (offline dev).
async function start(): Promise<void> {
  const overlay = requireElement<HTMLDivElement>("join");
  const form = requireElement<HTMLFormElement>("join-form");
  const nameInput = requireElement<HTMLInputElement>("join-name");
  const errorEl = requireElement<HTMLParagraphElement>("join-error");
  nameInput.focus();

  const connection = await new Promise<GameConnection>((resolve) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;

      if (new URLSearchParams(location.search).has("local")) {
        resolve(new LocalConnection(TEST_MAP, name));
        return;
      }
      try {
        const url = `ws://${location.hostname}:${SERVER_PORT}`;
        resolve(await WsConnection.connect(url, name));
      } catch (err) {
        errorEl.textContent =
          err instanceof Error ? err.message : "Falha ao conectar.";
      }
    });
  });

  overlay.remove();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 480,
    height: 360,
    zoom: 2,
    backgroundColor: "#111111",
    pixelArt: true,
    roundPixels: true,
  });
  game.scene.add("world", WorldScene, true, { connection });
}

void start();
