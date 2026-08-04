import { invalidateCache } from '$lib/server/db.js';

const connectedClients = new Set();

export function broadcastLiveUpdate() {
  invalidateCache();
  for (const client of connectedClients) {
    try {
      client.controller.enqueue(`data: ${JSON.stringify({ type: 'ORDER_UPDATED', timestamp: Date.now() })}\n\n`);
    } catch (e) {
      connectedClients.delete(client);
    }
  }
}

export function addClient(controller) {
  const clientRef = { controller };
  connectedClients.add(clientRef);
  return clientRef;
}

export function removeClient(clientRef) {
  if (clientRef) {
    connectedClients.delete(clientRef);
  }
}
