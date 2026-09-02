import {
  applyIntent,
  type ClientMessage,
  type EntityId,
  type GameEvent,
  type GameState,
  type Intent,
  type MapData,
  type PlayerState,
  type ServerMessage,
  TEST_MAP,
} from "@innocent/shared";
import type { GameConnection } from "./connection";

const SNAP_DURATION_MS = 100;

// Milestone 2: the server owns the simulation; this connection ships intents
// up and applies the broadcast events to a local snapshot before handing them
// to the views. The map is shared code, not wire data.
//
// Movement is predicted: sendIntent runs the same shared applyIntent locally
// and emits the resulting events immediately, so the local player walks
// without waiting a round-trip. Matching server events are swallowed on
// arrival; a mismatch (e.g. two players racing for one tile — the server
// decides) clears the predictions and snaps the view to the server position.
export class WsConnection implements GameConnection {
  readonly playerId: EntityId;

  private readonly socket: WebSocket;
  private readonly map: MapData = TEST_MAP;
  private readonly state: GameState;
  private readonly listeners: Array<(event: GameEvent) => void> = [];
  private predictedSelf: PlayerState;
  private pendingPredictions: GameEvent[] = [];
  // Artificial latency (?lag=150) so prediction can be felt/tested locally.
  private readonly lagMs: number;

  private constructor(
    socket: WebSocket,
    playerId: EntityId,
    snapshot: GameState,
    lagMs: number,
  ) {
    this.socket = socket;
    this.playerId = playerId;
    this.state = snapshot;
    this.lagMs = lagMs;
    this.predictedSelf = this.clonedSelf();

    socket.onmessage = (msg) => {
      this.withLag(() => this.handleServerMessage(String(msg.data)));
    };
    socket.onclose = () => {
      alert("Conexão com o servidor perdida.");
      location.reload();
    };
  }

  // Resolves only after the join/welcome handshake, so getMap()/getSnapshot()
  // stay synchronous and the scene keeps the same contract as LocalConnection.
  static connect(url: string, name: string): Promise<WsConnection> {
    const lagParam = new URLSearchParams(location.search).get("lag");
    const lagMs = Math.max(0, Number(lagParam) || 0);
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
          resolve(
            new WsConnection(socket, message.playerId, message.snapshot, lagMs),
          );
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
    const payload = JSON.stringify(message);
    this.withLag(() => this.socket.send(payload));

    if (intent.type !== "move") return;

    // Predict on: authoritative everyone else + our own predicted self.
    const predictionState: GameState = {
      players: { ...this.state.players, [this.playerId]: this.predictedSelf },
    };
    const events = applyIntent(
      this.map,
      predictionState,
      this.playerId,
      intent,
    );
    for (const event of events) {
      this.pendingPredictions.push(event);
      this.emit(event);
    }
  }

  onEvent(cb: (event: GameEvent) => void): void {
    this.listeners.push(cb);
  }

  private handleServerMessage(data: string): void {
    const message = JSON.parse(data) as ServerMessage;
    if (message.type !== "events") return;
    for (const event of message.events) {
      this.applyToSnapshot(event);
      if (this.isOwnMovement(event)) {
        this.reconcile(event);
      } else {
        this.emit(event);
      }
    }
  }

  private isOwnMovement(event: GameEvent): boolean {
    return (
      (event.type === "entity-moved" || event.type === "entity-turned") &&
      event.entityId === this.playerId
    );
  }

  private reconcile(serverEvent: GameEvent): void {
    const predicted = this.pendingPredictions.shift();
    if (predicted && this.matches(predicted, serverEvent)) return;

    // Misprediction (or an unpredicted server move): drop what we guessed
    // and glide the view to the authoritative position.
    this.pendingPredictions = [];
    this.predictedSelf = this.clonedSelf();
    const self = this.state.players[this.playerId];
    if (!self) return;
    this.emit({
      type: "entity-moved",
      entityId: this.playerId,
      from: { ...self.pos },
      to: { ...self.pos },
      facing: self.facing,
      durationMs: SNAP_DURATION_MS,
    });
  }

  private matches(predicted: GameEvent, server: GameEvent): boolean {
    if (predicted.type !== server.type) return false;
    if (predicted.type === "entity-moved" && server.type === "entity-moved") {
      return (
        predicted.to.x === server.to.x &&
        predicted.to.y === server.to.y &&
        predicted.facing === server.facing
      );
    }
    if (predicted.type === "entity-turned" && server.type === "entity-turned") {
      return predicted.facing === server.facing;
    }
    return false;
  }

  private clonedSelf(): PlayerState {
    const self = this.state.players[this.playerId];
    if (!self) {
      throw new Error("Snapshot do servidor não contém o próprio jogador");
    }
    return { ...self, pos: { ...self.pos } };
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private withLag(fn: () => void): void {
    if (this.lagMs > 0) {
      setTimeout(fn, this.lagMs);
    } else {
      fn();
    }
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
