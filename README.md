# innocent

Jogo online 2D no estilo Tibia, jogável no navegador. Mundo em tiles com visão de cima, movimento preso à grade (tile a tile) e multiplayer com servidor autoritativo.

## Como rodar

Pré-requisito: [Bun](https://bun.sh).

```sh
bun install
bun run dev:server   # servidor WebSocket em ws://localhost:3000
bun run dev          # cliente em http://localhost:5173 (outro terminal)
```

Abra `http://localhost:5173`, escolha um nome e entre. Ande com as **setas** ou **WASD**; **Enter** abre o chat (Enter envia, Esc fecha). Abra em duas abas para ver o multiplayer.

Para jogar offline sem servidor (simulação local), use `http://localhost:5173/?local`.

Outros comandos:

```sh
bun run typecheck   # tsc em todos os pacotes
bun run lint        # biome check
bun run format      # biome format --write
```

## Estrutura do repositório

Monorepo com Bun workspaces:

```
innocent/
├── shared/   # TypeScript puro: tipos, mapa, protocolo e a simulação do jogo
│             # Regra: NUNCA importa Phaser, DOM ou APIs de Node.
├── server/   # Servidor autoritativo: Bun + WebSockets, loop de ticks
└── client/   # Cliente no navegador: Phaser 3 + Vite
```

### Arquitetura

O renderizador nunca altera o estado do jogo diretamente. O fluxo é sempre:

```
cena/views ──(Intent)──▶ GameConnection ──▶ simulação (shared/applyIntent) ──(GameEvent)──▶ views
```

- **`Intent`** (`shared/src/intents.ts`): o que o jogador quer fazer (ex.: `{ type: "move", dir }`, `{ type: "say", text }`).
- **`applyIntent`** (`shared/src/sim/simulation.ts`): valida e aplica a regra (ex.: tile bloqueado só vira o personagem, como no Tibia) e devolve `GameEvent`s serializáveis.
- **`GameConnection`** (`client/src/net/connection.ts`): a costura entre cena e rede. `WsConnection` (padrão) fala WebSocket com o servidor; `LocalConnection` roda a simulação localmente (`?local`). A cena e as views não sabem qual das duas está em uso.
- **`server/`**: `Bun.serve` + WebSockets (`server/src/index.ts`) em volta de um núcleo sem I/O (`server/src/game-server.ts`) que roda o **mesmo** `applyIntent` de `shared/` num loop de ticks (50ms). O servidor é a autoridade: bufferiza o intent de movimento mais recente por jogador e o aplica respeitando o cooldown de passo, faz broadcast dos `GameEvent`s e o cliente só reage a eles. As mensagens do wire estão em `shared/src/protocol.ts`.

Outra separação importante: a simulação move a posição **lógica** (tile) de forma atômica; a view move a posição **visual** (pixels) com um tween de ~200ms. É essa separação que depois permite reconciliação com o servidor.

## Roadmap

- **M1 — Cliente andando:** mapa de teste em tiles, personagem andando tile a tile com tween e direção, tiles bloqueados (água/parede), câmera seguindo, arte placeholder gerada em runtime.
- **M2 — Multiplayer básico (este código):** pacote `server/` no workspace (Bun + WebSockets) rodando o mesmo `applyIntent` de `shared/` num loop de ticks; cliente ganha `WsConnection`, vê outros jogadores em tempo real e um chat simples; nome escolhido ao conectar.
- **M3+ — Combate e persistência:** HP e atributos, ataque com validação no servidor, criaturas com IA simples, persistência (SQLite → Postgres), contas, tileset de verdade (Tiled) no lugar dos placeholders.
