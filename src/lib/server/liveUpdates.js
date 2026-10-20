import { invalidateCache, bumpDataVersion } from '$lib/server/db.js';

const connectedClients = new Set();

// Call (and await) after every data change: clears the local cache, notifies SSE clients on this
// instance, and bumps the shared data version so polling clients on any instance pick it up.
export async function broadcastLiveUpdate() {
  invalidateCache();
  for (const client of connectedClients) {
    try {
      client.controller.enqueue(`data: ${JSON.stringify({ type: 'ORDER_UPDATED', timestamp: Date.now() })}\n\n`);
    } catch (e) {
      connectedClients.delete(client);
    }
  }
  try {
    await bumpDataVersion();
  } catch (e) {
    console.error('Failed to bump data version:', e);
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
