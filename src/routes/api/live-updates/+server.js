import { addClient, removeClient } from '$lib/server/liveUpdates.js';

export function GET() {
  let clientRef;

  const stream = new ReadableStream({
    start(controller) {
      clientRef = addClient(controller);
      controller.enqueue(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
    },
    cancel() {
      removeClient(clientRef);
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
