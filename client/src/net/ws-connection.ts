import {
  type ClientMessage,
  type EntityId,
  type GameEvent,
  type GameState,
  type Intent,
  type MapData,
  type ServerMessage,
  TEST_MAP,
} from "@innocent/shared";
import type { GameConnection } from "./connection";

// Milestone 2: the server owns the simulation; this connection just ships
// intents up and applies the broadcast events to a local snapshot before
// handing them to the views. The map is shared code, not wire data.
export class WsConnection implements GameConnection {
  readonly playerId: EntityId;

  private readonly socket: WebSocket;
  private readonly map: MapData = TEST_MAP;
  private readonly state: GameState;
  private readonly listeners: Array<(event: GameEvent) => void> = [];

  private constructor(
    socket: WebSocket,
    playerId: EntityId,
    snapshot: GameState,
  ) {
    this.socket = socket;
    this.playerId = playerId;
    this.state = snapshot;

    socket.onmessage = (msg) => {
      const message = JSON.parse(String(msg.data)) as ServerMessage;
      if (message.type !== "events") return;
      for (const event of message.events) {
        this.applyToSnapshot(event);
        for (const listener of this.listeners) {
          listener(event);
        }
      }
    };
    socket.onclose = () => {
      alert("Conexão com o servidor perdida.");
      location.reload();
    };
  }

  // Resolves only after the join/welcome handshake, so getMap()/getSnapshot()
  // stay synchronous and the scene keeps the same contract as LocalConnection.
  static connect(url: string, name: string): Promise<WsConnection> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.onerror = () => reject(new Error(`Falha ao conectar em ${url}`));
      socket.onopen = () => {
        const join: ClientMessage = { type: "join", name };
        socket.send(JSON.stringify(join));
      };
      socket.onmessage = (msg) => {
        const message = JSON.parse(String(msg.data)) as ServerMessage;
        if (message.type === "welcome") {
          resolve(new WsConnection(socket, message.playerId, message.snapshot));
        } else if (message.type === "error") {
          reject(new Error(message.message));
        }
      };
    });
  }

  getMap(): MapData {
    return this.map;
  }

  getSnapshot(): GameState {
    return this.state;
  }

  sendIntent(intent: Intent): void {
    const message: ClientMessage = { type: "intent", intent };
    this.socket.send(JSON.stringify(message));
  }

  onEvent(cb: (event: GameEvent) => void): void {
    this.listeners.push(cb);
  }

  private applyToSnapshot(event: GameEvent): void {
    switch (event.type) {
      case "entity-moved": {
        const player = this.state.players[event.entityId];
        if (player) {
          player.pos = { ...event.to };
          player.facing = event.facing;
        }
        break;
      }
      case "entity-turned": {
        const player = this.state.players[event.entityId];
        if (player) player.facing = event.facing;
        break;
      }
      case "entity-joined":
        this.state.players[event.player.id] = event.player;
        break;
      case "entity-left":
        delete this.state.players[event.entityId];
        break;
      case "entity-said":
        break;
    }
  }
}
