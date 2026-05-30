import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { verifyToken } from "./auth.service";

interface PDVClient {
  id: string;
  empresaId: number;
  ws?: WebSocket;
  name: string;
  location: string;
  lastSeen: Date;
  transport: "websocket" | "http";
}

let wss: WebSocketServer;
const clients: Map<string, PDVClient> = new Map();

export function initialize(server: Server) {
  wss = new WebSocketServer({ server, path: "/pdv-ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New PDV connection");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, data);
      } catch (error) {
        console.error("Invalid message:", error);
      }
    });

    ws.on("close", () => {
      for (const [id, client] of clients.entries()) {
        if (client.ws === ws) {
          clients.delete(id);
          console.log(`PDV ${id} disconnected`);
          break;
        }
      }
    });

    ws.send(JSON.stringify({ type: "connected", message: "Connected to server" }));
  });

  setInterval(() => checkHeartbeat(), 30000);
}

async function handleMessage(ws: WebSocket, data: any) {
  switch (data.type) {
    case "register":
      await registerPDV(ws, data.pdvId, data.name, data.location, data.token);
      break;
    case "heartbeat":
      updateHeartbeat(ws, data.pdvId);
      break;
    case "status":
      updateStatus(data.pdvId, data.status);
      break;
  }
}

async function registerPDV(ws: WebSocket, pdvId: string, name: string, location: string, token?: string) {
  if (!pdvId) return;

  const payload = await verifyToken(token);
  if (!payload?.empresaId || payload.role !== "pdv_operator") {
    ws.send(JSON.stringify({ type: "registration-error", message: "Token de sincronizacao invalido" }));
    ws.close();
    return;
  }

  const clientKey = getClientKey(payload.empresaId, pdvId);
  clients.set(clientKey, {
    id: pdvId,
    empresaId: payload.empresaId,
    ws,
    name: name || `PDV ${pdvId}`,
    location: location || "Nao especificado",
    lastSeen: new Date(),
    transport: "websocket",
  });
  console.log(`PDV ${pdvId} registered as ${name} at ${location}`);

  ws.send(JSON.stringify({
    type: "registered",
    pdvId,
    message: "Successfully registered",
  }));
}

export function registerHttpHeartbeat(empresaId: number, pdvId: string, name?: string, location?: string) {
  if (!pdvId) return;

  const clientKey = getClientKey(empresaId, pdvId);
  const existing = clients.get(clientKey);
  clients.set(clientKey, {
    id: pdvId,
    empresaId,
    ws: existing?.ws,
    name: name || existing?.name || `PDV ${pdvId}`,
    location: location || existing?.location || "Configurado via token",
    lastSeen: new Date(),
    transport: existing?.ws ? "websocket" : "http",
  });
}

function updateHeartbeat(ws: WebSocket, pdvId: string) {
  const client = Array.from(clients.values()).find((item) => item.id === pdvId && item.ws === ws);
  if (client) {
    client.lastSeen = new Date();
  }
}

function updateStatus(pdvId: string, status: any) {
  console.log(`PDV ${pdvId} status:`, status);
}

function checkHeartbeat() {
  const now = new Date();
  for (const [id, client] of clients.entries()) {
    const diff = now.getTime() - client.lastSeen.getTime();
    if (diff > 60000) {
      console.log(`PDV ${id} timeout, removing...`);
      client.ws?.close();
      clients.delete(id);
    }
  }
}

export function sendCatalogToPDV(empresaId: number, pdvId: string, catalog: any) {
  const client = clients.get(getClientKey(empresaId, pdvId));
  if (client?.ws && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({
      type: "catalog",
      data: catalog,
    }));
    return true;
  }
  return false;
}

export function broadcastCatalog(catalog: any, empresaId?: number) {
  let sent = 0;
  for (const client of clients.values()) {
    if (empresaId && client.empresaId !== empresaId) continue;
    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "catalog",
        data: catalog,
      }));
      sent++;
    }
  }
  return sent;
}

export function getActivePDVs(empresaId?: number) {
  return Array.from(clients.values())
    .filter((client) => !empresaId || client.empresaId === empresaId)
    .map((client) => ({
    id: client.id,
    empresaId: client.empresaId,
    name: client.name,
    location: client.location,
    lastSeen: client.lastSeen,
    online: true,
    transport: client.transport,
  }));
}

function getClientKey(empresaId: number, pdvId: string) {
  return `${empresaId}:${pdvId}`;
}
