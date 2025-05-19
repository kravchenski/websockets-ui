import { state } from "../state";
import { WebSocket } from "ws";

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function handleAttackMsg(
  ws: WebSocket,
  msg: { type: string; data: string; id: number },
) {
  let data;
  try {
    data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
  } catch {
    ws.send(
      JSON.stringify({
        type: "error",
        data: { errorText: "Invalid data for attack" },
        id: 0,
      }),
    );
    return;
  }

  let { gameId, x, y, indexPlayer } = data;
  const game = state.games[gameId];

  if (!game) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: { errorText: "Game not found" },
        id: 0,
      }),
    );
    return;
  }

  if (game.currentPlayer !== indexPlayer) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: { errorText: "It's not your turn" },
        id: 0,
      }),
    );
    return;
  }

  const playerIds = Object.keys(game.players);
  const enemyId = playerIds.find((id) => id !== indexPlayer);

  if (!enemyId) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: { errorText: "Enemy not found" },
        id: 0,
      }),
    );
    return;
  }

  const enemyShips = game.ships[enemyId];

  if (!enemyShips) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: { errorText: "Enemy ships not found" },
        id: 0,
      }),
    );
    return;
  }

  if (!game.board) game.board = {};
  if (!game.board[enemyId]) game.board[enemyId] = [];
  const board = game.board[enemyId];

  if (msg.type === "randomAttack") {
    let found = false;
    for (let tries = 0; tries < 100 && !found; tries++) {
      const rx = getRandomInt(10);
      const ry = getRandomInt(10);
      if (!board[ry]) board[ry] = [];
      if (board[ry][rx] === undefined) {
        x = rx;
        y = ry;
        found = true;
      }
    }
    if (!found) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { errorText: "No available cells for random attack" },
          id: 0,
        }),
      );
      return;
    }
  }

  if (!board[y]) board[y] = [];
  if (board[y][x] !== undefined) {
    ws.send(
      JSON.stringify({
        type: "attack",
        data: JSON.stringify({
          position: { x, y },
          currentPlayer: indexPlayer,
          status: "miss",
        }),
        id: 0,
      }),
    );
    return;
  }

  let hitShip = null;
  let killed = false;

  for (const ship of enemyShips) {
    let hit = false;
    for (let i = 0; i < ship.length; i++) {
      const sx = !ship.direction ? ship.position.x + i : ship.position.x;
      const sy = !ship.direction ? ship.position.y : ship.position.y + i;

      if (sx === x && sy === y) {
        hit = true;
        ship.hits = (ship.hits || 0) + 1;
        hitShip = ship;
        if (ship.hits === ship.length) {
          killed = true;
        }
        break;
      }
    }
    if (hit) break;
  }

  board[y][x] = hitShip ? (killed ? 2 : 1) : -1;

  let status: "miss" | "killed" | "shot" = "miss";
  if (hitShip) {
    status = killed ? "killed" : "shot";
  }

  playerIds.forEach((pid) => {
    const player = game.players[pid];
    player.ws?.send(
      JSON.stringify({
        type: "attack",
        data: JSON.stringify({
          position: { x, y },
          currentPlayer: indexPlayer,
          status,
        }),
        id: 0,
      }),
    );
  });

  const allKilled = enemyShips.every((ship: { hits: any; length: any; }) => (ship.hits || 0) === ship.length);

  if (allKilled) {
    playerIds.forEach((pid) => {
      const player = game.players[pid];
      player.ws?.send(
        JSON.stringify({
          type: "finish",
          data: JSON.stringify({
            winPlayer: indexPlayer,
          }),
          id: 0,
        }),
      );
    });

    const winner = game.players[indexPlayer];
    if (winner) {
      state.winners[winner.name] = (state.winners[winner.name] || 0) + 1;
    }

    game.finished = true;
    return;
  }

  if (status === "miss" || status === "killed") {
    game.currentPlayer = enemyId;
  }

  playerIds.forEach((pid) => {
    const player = game.players[pid];
    player.ws?.send(
      JSON.stringify({
        type: "turn",
        data: JSON.stringify({
          currentPlayer: game.currentPlayer,
        }),
        id: 0,
      }),
    );
  });
}