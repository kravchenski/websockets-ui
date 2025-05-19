import { WebSocketServer } from "ws";
import { handleMessage } from "./message";

export function startWsServer() {
  const WS_PORT = parseInt(process.env.WS_PORT ?? "") || 3000;
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      try {
        console.log(message.toString());
        const data = JSON.parse(message.toString()) as {
          type: string;
          data: string;
          id: number;
        };
        handleMessage(ws, data);
      } catch (error) {
        console.error("Error parsing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: { errorText: "Invalid JSON" },
            id: 0,
          }),
        );
      }
    });

    ws.on("close", () => {
    });
  });

  console.log(`WebSocket server started on ws://localhost:${WS_PORT}`);
}