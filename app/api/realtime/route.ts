import { NextRequest } from 'next/server';
import { getConnections } from './broadcast';

// Route segment config for Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const businessNumberId = searchParams.get('businessNumberId');
  const phoneNumber = searchParams.get('phoneNumber');

  if (!businessNumberId && !phoneNumber) {
    return new Response('Missing businessNumberId or phoneNumber', { status: 400 });
  }

  // Create unique connection IDs for both business number and phone number
  const connectionIds: string[] = [];
  if (businessNumberId) {
    connectionIds.push(`business:${businessNumberId}`);
  }
  if (phoneNumber) {
    connectionIds.push(`phone:${phoneNumber}`);
  }

  // Get connections map
  const connections = getConnections();

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to all relevant maps
      connectionIds.forEach(connectionId => {
        if (!connections.has(connectionId)) {
          connections.set(connectionId, []);
        }
        connections.get(connectionId)!.push(controller);
      });

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Handle client disconnect
      const cleanup = () => {
        connectionIds.forEach(connectionId => {
          const conns = connections.get(connectionId);
          if (conns) {
            const index = conns.indexOf(controller);
            if (index > -1) {
              conns.splice(index, 1);
            }
            if (conns.length === 0) {
              connections.delete(connectionId);
            }
          }
        });
      };

      request.signal.addEventListener('abort', cleanup);
      
      // Also handle stream cancellation
      return () => {
        cleanup();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

