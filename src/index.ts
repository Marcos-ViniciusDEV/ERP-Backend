import "dotenv/config";
import { createServer } from "http";
import { app } from "./app";
import { PDVWebSocketServer } from "./services/pdv-websocket.service";

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server for PDV connections
export const pdvWsServer = new PDVWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}/pdv-ws`);
});
