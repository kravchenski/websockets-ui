import WebSocket from "ws";
import { state } from "../state";
import { broadcastRooms } from "../message";

export const handleRoomMessage = (
  ws: WebSocket,
  msg: { type: string; data: string; id: number },
) => {
  const player = Object.values(state.players).find((p) => p.ws === ws);

  if (!player) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: { errorText: "Player not registered" },
        id: 0,
      }),
    );
    return;
  }

  if (msg.type === "create_room") {
    const alreadyInRoom = Object.values(state.rooms).some((room) =>
      room.roomUsers.some((u) => u.index === player.index),
    );

    if (alreadyInRoom) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { errorText: "Player already in a room" },
          id: 0,
        }),
      );
      return;
    }

    const roomId = Math.random().toString(36).substring(2, 10);
    state.rooms[roomId] = {
      roomId,
      roomUsers: [player],
    };

    broadcastRooms();
    return;
  }

  if (msg.type === "add_user_to_room") {
    let data;
    try {
      data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
    } catch {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { errorText: "Invalid data for add_user_to_room" },
          id: 0,
        }),
      );
      return;
    }

    const { indexRoom } = data;
    const room = state.rooms[indexRoom];

    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { errorText: "Room not found" },
          id: 0,
        }),
      );
      return;
    }

    const alreadyInRoom = Object.values(state.rooms).some((r) =>
      r.roomUsers.some((u) => u.index === player.index),
    );

    if (alreadyInRoom) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { errorText: "Player already in a room" },
          id: 0,
        }),
      );
      return;
    }

    room.roomUsers.push(player);

    const idGame = Math.random().toString(36).substring(2, 10);
    state.games[idGame] = {
      idGame,
      players: {},
      ships: {},
      currentPlayer: "",
      board: {},
      finished: false,
    };

    room.roomUsers.forEach((p) => {
      state.games[idGame].players[p.index] = p;
      p.ws?.send(
        JSON.stringify({
          type: "create_game",
          data: JSON.stringify({
            idGame,
            idPlayer: p.index,
          }),
          id: 0,
        }),
      );
    });

    delete state.rooms[indexRoom];
    broadcastRooms();
  }
};