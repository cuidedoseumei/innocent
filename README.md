# innocent

Jogo online 2D no estilo Tibia, jogável no navegador. Mundo em tiles com visão de cima, movimento preso à grade (tile a tile) e, futuramente, multiplayer com servidor autoritativo.

## Como rodar

Pré-requisito: [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Abra `http://localhost:5173`. Ande com as **setas** ou **WASD**.

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
├── shared/   # TypeScript puro: tipos, mapa e a simulação do jogo
│             # Regra: NUNCA importa Phaser, DOM ou APIs de Node.
└── client/   # Cliente no navegador: Phaser 3 + Vite
```

### Arquitetura

O renderizador nunca altera o estado do jogo diretamente. O fluxo é sempre:

```
cena/views ──(Intent)──▶ GameConnection ──▶ simulação (shared/applyIntent) ──(GameEvent)──▶ views
```

- **`Intent`** (`shared/src/intents.ts`): o que o jogador quer fazer (ex.: `{ type: "move", dir }`).
- **`applyIntent`** (`shared/src/sim/simulation.ts`): valida e aplica a regra (ex.: tile bloqueado só vira o personagem, como no Tibia) e devolve `GameEvent`s serializáveis.
- **`GameConnection`** (`client/src/net/connection.ts`): a costura para o multiplayer. Hoje a implementação é `LocalConnection` (simulação local e síncrona); no milestone 2 entra uma `WsConnection` falando com um servidor que roda o **mesmo** `applyIntent` como autoridade — sem mudar a cena nem as views.

Outra separação importante: a simulação move a posição **lógica** (tile) de forma atômica; a view move a posição **visual** (pixels) com um tween de ~200ms. É essa separação que depois permite reconciliação com o servidor.

## Roadmap

- **M1 — Cliente andando (este código):** mapa de teste em tiles, personagem andando tile a tile com tween e direção, tiles bloqueados (água/parede), câmera seguindo, arte placeholder gerada em runtime.
- **M2 — Multiplayer básico:** pacote `server/` no workspace (Node/Bun + WebSockets) rodando o mesmo `applyIntent` de `shared/` num loop de ticks; cliente ganha `WsConnection`, vê outros jogadores em tempo real e um chat simples; nome escolhido ao conectar.
- **M3+ — Combate e persistência:** HP e atributos, ataque com validação no servidor, criaturas com IA simples, persistência (SQLite → Postgres), contas, tileset de verdade (Tiled) no lugar dos placeholders.
