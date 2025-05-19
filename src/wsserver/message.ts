import { handleAttackMsg } from "./handlers/handleAttackMessage";
import { handleRoomMessage } from "./handlers/room";
import { handleShipsMessage } from "./handlers/ship";
import { addPlayer, state } from "./state";
import { WebSocket } from "ws";

interface Message {
    type: string;
    data: string;
    id: number;
}

interface RegistrationData {
    name: string;
    password: string;
}

export function broadcastRooms(): void {
    const rooms = Object.values(state.rooms)
        .filter((room) => room.roomUsers.length === 1)
        .map((room) => ({
            roomId: room.roomId,
            roomUsers: room.roomUsers.map((u) => ({ name: u.name, index: u.index })),
        }));

    const payload = {
        type: "update_room",
        data: JSON.stringify(rooms),
        id: 0,
    };

    sendToAllClients(payload);
}

function broadcastWinners(): void {
    const winners = Object.entries(state.winners).map(([name, wins]) => ({
        name,
        wins,
    }));

    const payload = {
        type: "update_winners",
        data: JSON.stringify(winners),
        id: 0,
    };

    sendToAllClients(payload);
}

function sendToAllClients(message: object): void {
    const msgStr = JSON.stringify(message);
    Object.values(state.players).forEach((p) => p.ws?.send(msgStr));
}

export function handleMessage(ws: WebSocket, rawMsg: Message): void {
    try {
        const { type, data, id } = rawMsg;

        switch (type) {
            case "reg": {
                const { name, password } = JSON.parse(data) as RegistrationData;

                if (!name || !password) {
                    sendError(ws, "Name and password required", id);
                    return;
                }

                let player = state.players[name];
                if (!player) {
                    player = addPlayer(name, password, ws);
                }

                console.log("Player registered:", player);

                ws.send(
                    JSON.stringify({
                        type: "reg",
                        data: JSON.stringify({
                            name,
                            index: player.index,
                            error: false,
                            errorText: "",
                        }),
                        id,
                    })
                );

                broadcastRooms();
                broadcastWinners();
                break;
            }

            case "create_room":
            case "add_user_to_room":
                handleRoomMessage(ws, rawMsg);
                break;

            case "add_ships":
                handleShipsMessage(ws, rawMsg);
                break;

            case "attack":
            case "randomAttack":
                handleAttackMsg(ws, rawMsg);
                break;

            default:
                sendError(ws, "Unknown command", id);
                break;
        }
    } catch (error) {
        console.error("Error handling message:", error);
        sendError(ws, "Internal server error", -1);
    }
}

function sendError(ws: WebSocket, errorMessage: string, id: number): void {
    ws.send(
        JSON.stringify({
            type: "error",
            data: JSON.stringify({ errorText: errorMessage }),
            id,
        })
    );
}