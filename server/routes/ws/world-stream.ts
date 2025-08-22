import type { ResourceVein, ExtendedTerrainType } from '#shared/types/world';
import { generateOrLoadChunk } from '~~/server/utils/resource-generator';

interface WebSocketPeer {
  id: string;
  send: (data: Record<string, unknown>) => void;
}

export default defineWebSocketHandler({
  open(peer) {
    console.log(`WebSocket opened: ${peer.id}`);

    peer.send({
      type: 'connected',
      message: 'World stream connected',
      timestamp: new Date().toISOString(),
    });
  },

  message(peer, message) {
    try {
      const messageText = typeof message.text === 'function' ? message.text() : message.text;

      if (messageText === 'ping') {
        peer.send('pong');
        return;
      }

      const data = typeof messageText === 'string' ? JSON.parse(messageText) : messageText;

      switch (data.type) {
        case 'requestChunk':
          handleChunkRequest(peer, data);
          break;

        case 'updateViewport':
          handleViewportUpdate(peer, data);
          break;

        default:
          peer.send({
            type: 'error',
            message: `Unknown message type: ${data.type}`,
          });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      peer.send({
        type: 'error',
        message: 'Invalid message format',
      });
    }
  },

  close(peer, event) {
    console.log(`WebSocket closed: ${peer.id}`, event);
  },

  error(peer, error) {
    console.error(`WebSocket error for ${peer.id}:`, error);
  },
});

// Handle individual chunk requests
async function handleChunkRequest(
  peer: WebSocketPeer,
  data: { chunkX: number; chunkY: number; requestId?: string },
) {
  const { chunkX, chunkY, requestId } = data;

  try {
    const chunkResult = await generateChunk(chunkX, chunkY);

    peer.send({
      type: 'chunkData',
      chunkX,
      chunkY,
      data: { cells: chunkResult.terrain },
      resources: chunkResult.resources,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error generating chunk ${chunkX},${chunkY}:`, error);
    peer.send({
      type: 'chunkError',
      chunkX,
      chunkY,
      requestId,
      error: 'Failed to generate chunk',
    });
  }
}

// Handle viewport updates and stream multiple chunks
async function handleViewportUpdate(
  peer: WebSocketPeer,
  data: {
    visibleChunks: Array<{ chunkX: number; chunkY: number }>;
    requestId?: string;
    cameraX?: number;
    cameraY?: number;
  },
) {
  const { visibleChunks, requestId, cameraX = 0, cameraY = 0 } = data;

  const prefetchChunks = calculatePrefetchRing(visibleChunks);

  try {
    // Sort chunks by distance from camera center for better perceived performance
    const sortedChunks = visibleChunks.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.chunkX - cameraX / (16 * 32), 2) + Math.pow(a.chunkY - cameraY / (16 * 32), 2),
      );
      const distB = Math.sqrt(
        Math.pow(b.chunkX - cameraX / (16 * 32), 2) + Math.pow(b.chunkY - cameraY / (16 * 32), 2),
      );
      return distA - distB;
    });

    const sortedPrefetchChunks = prefetchChunks.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.chunkX - cameraX / (16 * 32), 2) + Math.pow(a.chunkY - cameraY / (16 * 32), 2),
      );
      const distB = Math.sqrt(
        Math.pow(b.chunkX - cameraX / (16 * 32), 2) + Math.pow(b.chunkY - cameraY / (16 * 32), 2),
      );
      return distA - distB;
    });

    // Stream chunks asynchronously - don't block the event loop
    let streamedViewportCount = 0;
    let streamedPrefetchCount = 0;

    const streamChunk = async (chunkIndex: number, isPrefetch = false) => {
      const chunkArray = isPrefetch ? sortedPrefetchChunks : sortedChunks;

      if (chunkIndex >= chunkArray.length) {
        if (!isPrefetch && sortedPrefetchChunks.length > 0) {
          setImmediate(() => streamChunk(0, true));
          return;
        }
        return;
      }

      const { chunkX, chunkY } = chunkArray[chunkIndex];

      try {
        const chunkResult = await generateChunk(chunkX, chunkY);

        const progress = isPrefetch
          ? { current: chunkIndex + 1, total: sortedPrefetchChunks.length, phase: 'prefetch' }
          : { current: chunkIndex + 1, total: sortedChunks.length, phase: 'viewport' };

        peer.send({
          type: 'chunkData',
          chunkX,
          chunkY,
          data: { cells: chunkResult.terrain },
          resources: chunkResult.resources,
          requestId,
          priority: isPrefetch ? 'low' : 'viewport',
          progress,
          timestamp: new Date().toISOString(),
        });

        if (isPrefetch) {
          streamedPrefetchCount++;
        } else {
          streamedViewportCount++;
        }

        // Schedule next chunk on next tick to avoid blocking
        if (chunkIndex + 1 < chunkArray.length) {
          setImmediate(() => streamChunk(chunkIndex + 1, isPrefetch));
        } else if (!isPrefetch && sortedPrefetchChunks.length > 0) {
          setImmediate(() => streamChunk(0, true));
        } else {
          // All chunks streamed (viewport + prefetch)
          peer.send({
            type: 'viewportComplete',
            requestId,
            chunksStreamed: streamedViewportCount,
            prefetchChunksStreamed: streamedPrefetchCount,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error generating chunk ${chunkX},${chunkY}:`, error);
        peer.send({
          type: 'chunkError',
          chunkX,
          chunkY,
          requestId,
          priority: isPrefetch ? 'low' : 'viewport',
          error: 'Failed to generate chunk',
        });

        // Continue with next chunk even if one fails
        if (chunkIndex + 1 < chunkArray.length) {
          setImmediate(() => streamChunk(chunkIndex + 1, isPrefetch));
        } else if (!isPrefetch && sortedPrefetchChunks.length > 0) {
          setImmediate(() => streamChunk(0, true));
        }
      }
    };

    // Start streaming from the first chunk
    if (sortedChunks.length > 0) {
      streamChunk(0);
    } else {
      peer.send({
        type: 'viewportComplete',
        requestId,
        chunksStreamed: 0,
        prefetchChunksStreamed: 0,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error setting up viewport streaming:', error);
    peer.send({
      type: 'viewportError',
      requestId,
      error: 'Failed to setup chunk streaming',
    });
  }
}

function calculatePrefetchRing(
  visibleChunks: Array<{ chunkX: number; chunkY: number }>,
): Array<{ chunkX: number; chunkY: number }> {
  if (visibleChunks.length === 0) return [];

  const visibleSet = new Set(visibleChunks.map((chunk) => `${chunk.chunkX},${chunk.chunkY}`));

  const minX = Math.min(...visibleChunks.map((c) => c.chunkX));
  const maxX = Math.max(...visibleChunks.map((c) => c.chunkX));
  const minY = Math.min(...visibleChunks.map((c) => c.chunkY));
  const maxY = Math.max(...visibleChunks.map((c) => c.chunkY));

  const prefetchChunks: Array<{ chunkX: number; chunkY: number }> = [];

  for (let x = minX - 1; x <= maxX + 1; x++) {
    for (let y = minY - 1; y <= maxY + 1; y++) {
      const chunkKey = `${x},${y}`;

      if (!visibleSet.has(chunkKey)) {
        prefetchChunks.push({ chunkX: x, chunkY: y });
      }
    }
  }

  return prefetchChunks;
}

async function generateChunk(
  chunkX: number,
  chunkY: number,
): Promise<{ terrain: ExtendedTerrainType[][]; resources: ResourceVein[] }> {
  const worldId = 'default'; // For now, use default world until multi-world support is implemented

  const chunkData = await generateOrLoadChunk(chunkX, chunkY, 16, worldId);
  return {
    terrain: chunkData.terrain,
    resources: chunkData.resources,
  };
}
