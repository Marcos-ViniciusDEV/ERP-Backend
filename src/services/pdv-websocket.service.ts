import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface PDVClient {
  id: string;
  ws: WebSocket;
  name: string;
  location: string;
  lastSeen: Date;
}

let wss: WebSocketServer;
const clients: Map<string, PDVClient> = new Map();

export function initialize(server: Server) {
  wss = new WebSocketServer({ server, path: '/pdv-ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New PDV connection');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, data);
      } catch (error) {
        console.error('Invalid message:', error);
      }
    });

    ws.on('close', () => {
      // Remove client
      for (const [id, client] of clients.entries()) {
        if (client.ws === ws) {
          clients.delete(id);
          console.log(`PDV ${id} disconnected`);
          break;
        }
      }
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to server' }));
  });

  // Heartbeat check every 30s
  setInterval(() => checkHeartbeat(), 30000);
}

function handleMessage(ws: WebSocket, data: any) {
  switch (data.type) {
    case 'register':
      registerPDV(ws, data.pdvId, data.name, data.location);
      break;
    case 'heartbeat':
      updateHeartbeat(data.pdvId);
      break;
    case 'status':
      updateStatus(data.pdvId, data.status);
      break;
  }
}

function registerPDV(ws: WebSocket, pdvId: string, name: string, location: string) {
  clients.set(pdvId, {
    id: pdvId,
    ws,
    name: name || `PDV ${pdvId}`,
    location: location || 'Não especificado',
    lastSeen: new Date(),
  });
  console.log(`PDV ${pdvId} registered as ${name} at ${location}`);
  
  ws.send(JSON.stringify({ 
    type: 'registered', 
    pdvId,
    message: 'Successfully registered' 
  }));
}

function updateHeartbeat(pdvId: string) {
  const client = clients.get(pdvId);
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
    if (diff > 60000) { // 1 minute timeout
      console.log(`PDV ${id} timeout, removing...`);
      client.ws.close();
      clients.delete(id);
    }
  }
}

// Send catalog to specific PDV
export function sendCatalogToPDV(pdvId: string, catalog: any) {
  const client = clients.get(pdvId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({
      type: 'catalog',
      data: catalog,
    }));
    return true;
  }
  return false;
}

// Send catalog to all connected PDVs
export function broadcastCatalog(catalog: any) {
  let sent = 0;
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'catalog',
        data: catalog,
      }));
      sent++;
    }
  }
  return sent;
}

// Get list of active PDVs
export function getActivePDVs() {
  return Array.from(clients.values()).map(client => ({
    id: client.id,
    name: client.name,
    location: client.location,
    lastSeen: client.lastSeen,
    online: true,
  }));
}
