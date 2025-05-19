import { state } from "../state";
import { WebSocket } from "ws";

export function handleShipsMessage(
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
        data: { errorText: "Invalid data for add ships" },
        id: 0,
      }),
    );
    return;
  }

  const { gameId, ships, indexPlayer } = data;
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

  game.ships[indexPlayer] = ships;

  const playerIds = Object.keys(game.players);
  const bothReady = playerIds.every((pid) => !!game.ships[pid]);

  if (bothReady) {
    const currentPlayerIndex = playerIds[Math.floor(Math.random() * playerIds.length)];
    game.currentPlayer = currentPlayerIndex;

    playerIds.forEach((pid) => {
      const player = game.players[pid];
      player.ws?.send(
        JSON.stringify({
          type: "start_game",
          data: JSON.stringify({
            ships: game.ships[pid],
            currentPlayerIndex,
          }),
          id: 0,
        }),
      );
    });
  }
}