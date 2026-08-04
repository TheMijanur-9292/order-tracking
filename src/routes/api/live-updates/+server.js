import { invalidateCache } from '$lib/server/db.js';

const connectedClients = new Set();

export function _broadcastLiveUpdate() {
  invalidateCache();
  for (const client of connectedClients) {
    try {
      client.controller.enqueue(`data: ${JSON.stringify({ type: 'ORDER_UPDATED', timestamp: Date.now() })}\n\n`);
    } catch (e) {
      connectedClients.delete(client);
    }
  }
}

export function GET() {
  let clientRef;

  const stream = new ReadableStream({
    start(controller) {
      clientRef = { controller };
      connectedClients.add(clientRef);
      controller.enqueue(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
    },
    cancel() {
      if (clientRef) {
        connectedClients.delete(clientRef);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
