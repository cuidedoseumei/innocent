import {
  type GameEvent,
  MAX_NAME_LENGTH,
  parseClientMessage,
  SERVER_PORT,
  type ServerMessage,
  TEST_MAP,
  TICK_MS,
} from "@innocent/shared";
import { GameServer } from "./game-server";

interface SocketData {
  playerId: string | null;
}

const GAME_TOPIC = "game";

const game = new GameServer(TEST_MAP);
let nextPlayerNumber = 1;

const server = Bun.serve<SocketData>({
  port: SERVER_PORT,
  fetch(req, srv) {
    if (srv.upgrade(req, { data: { playerId: null } })) return;
    return new Response("innocent game server", { status: 200 });
  },
  websocket: {
    message(ws, raw) {
      const message = parseClientMessage(
        typeof raw === "string" ? raw : raw.toString(),
      );
      if (!message) return;

      if (message.type === "join") {
        if (ws.data.playerId) return;
        const name = message.name.trim().slice(0, MAX_NAME_LENGTH);
        if (!name) {
          send(ws, { type: "error", message: "Nome inválido." });
          ws.close();
          return;
        }
        const playerId = `p${nextPlayerNumber++}`;
        ws.data.playerId = playerId;
        const joined = game.addPlayer(playerId, name);
        send(ws, { type: "welcome", playerId, snapshot: game.getSnapshot() });
        broadcast([joined]);
        ws.subscribe(GAME_TOPIC);
        console.log(`+ ${name} (${playerId})`);
        return;
      }

      if (ws.data.playerId) {
        broadcast(game.handleIntent(ws.data.playerId, message.intent));
      }
    },
    close(ws) {
      if (!ws.data.playerId) return;
      broadcast(game.removePlayer(ws.data.playerId));
      console.log(`- ${ws.data.playerId}`);
    },
  },
});

function send(ws: Bun.ServerWebSocket<SocketData>, message: ServerMessage) {
  ws.send(JSON.stringify(message));
}

function broadcast(events: GameEvent[]) {
  if (events.length === 0) return;
  const message: ServerMessage = { type: "events", events };
  server.publish(GAME_TOPIC, JSON.stringify(message));
}

setInterval(() => {
  broadcast(game.tick(Date.now()));
}, TICK_MS);

console.log(`innocent server ouvindo em ws://localhost:${server.port}`);
