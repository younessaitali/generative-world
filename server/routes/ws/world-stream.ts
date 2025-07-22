export default defineWebSocketHandler({
  open(peer) {
    console.log(`WebSocket opened: ${peer.id}`)

    // Send initial connection confirmation
    peer.send({
      type: 'connected',
      message: 'World stream connected',
      timestamp: new Date().toISOString()
    })
  },

  message(peer, message) {
    try {
      const messageText = typeof message.text === 'function' ? message.text() : message.text

      if (messageText === 'ping') {
        peer.send('pong')
        return
      }

      const data = typeof messageText === 'string' ? JSON.parse(messageText) : messageText

      switch (data.type) {
        case 'requestChunk':
          handleChunkRequest(peer, data)
          break

        case 'updateViewport':
          handleViewportUpdate(peer, data)
          break

        default:
          peer.send({
            type: 'error',
            message: `Unknown message type: ${data.type}`
          })
      }
    } catch (error) {
      console.error('Error processing message:', error)
      peer.send({
        type: 'error',
        message: 'Invalid message format'
      })
    }
  },

  close(peer, event) {
    console.log(`WebSocket closed: ${peer.id}`, event)
  },

  error(peer, error) {
    console.error(`WebSocket error for ${peer.id}:`, error)
  }
})

// Handle individual chunk requests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChunkRequest(peer: any, data: { chunkX: number; chunkY: number; requestId?: string }) {
  const { chunkX, chunkY, requestId } = data

  try {
    const chunkData = await generateChunk(chunkX, chunkY)

    peer.send({
      type: 'chunkData',
      chunkX,
      chunkY,
      data: chunkData,
      requestId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`Error generating chunk ${chunkX},${chunkY}:`, error)
    peer.send({
      type: 'chunkError',
      chunkX,
      chunkY,
      requestId,
      error: 'Failed to generate chunk'
    })
  }
}

// Handle viewport updates and stream multiple chunks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleViewportUpdate(peer: any, data: {
  visibleChunks: Array<{ chunkX: number; chunkY: number }>;
  requestId?: string;
  cameraX?: number;
  cameraY?: number;
}) {
  const { visibleChunks, requestId, cameraX = 0, cameraY = 0 } = data

  console.log(`Streaming ${visibleChunks.length} chunks for viewport update ${requestId}`)

  try {
    // Sort chunks by distance from camera center for better perceived performance
    const sortedChunks = visibleChunks.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.chunkX - cameraX / (16 * 32), 2) + Math.pow(a.chunkY - cameraY / (16 * 32), 2))
      const distB = Math.sqrt(Math.pow(b.chunkX - cameraX / (16 * 32), 2) + Math.pow(b.chunkY - cameraY / (16 * 32), 2))
      return distA - distB
    })

    // Stream chunks asynchronously - don't block the event loop
    let streamedCount = 0

    const streamChunk = async (chunkIndex: number) => {
      if (chunkIndex >= sortedChunks.length) return

      const { chunkX, chunkY } = sortedChunks[chunkIndex]

      try {
        const chunkData = await generateChunk(chunkX, chunkY)

        peer.send({
          type: 'chunkData',
          chunkX,
          chunkY,
          data: chunkData,
          requestId,
          priority: 'viewport',
          progress: {
            current: chunkIndex + 1,
            total: sortedChunks.length
          },
          timestamp: new Date().toISOString()
        })

        streamedCount++

        // Schedule next chunk on next tick to avoid blocking
        if (chunkIndex + 1 < sortedChunks.length) {
          setImmediate(() => streamChunk(chunkIndex + 1))
        } else {
          // All chunks streamed
          peer.send({
            type: 'viewportComplete',
            requestId,
            chunksStreamed: streamedCount,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error(`Error generating chunk ${chunkX},${chunkY}:`, error)
        peer.send({
          type: 'chunkError',
          chunkX,
          chunkY,
          requestId,
          error: 'Failed to generate chunk'
        })

        // Continue with next chunk even if one fails
        if (chunkIndex + 1 < sortedChunks.length) {
          setImmediate(() => streamChunk(chunkIndex + 1))
        }
      }
    }

    // Start streaming from the first chunk
    if (sortedChunks.length > 0) {
      streamChunk(0)
    } else {
      peer.send({
        type: 'viewportComplete',
        requestId,
        chunksStreamed: 0,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error setting up viewport streaming:', error)
    peer.send({
      type: 'viewportError',
      requestId,
      error: 'Failed to setup chunk streaming'
    })
  }
}

// Generate chunk data (reuse the logic from chunk.get.ts)
async function generateChunk(chunkX: number, chunkY: number): Promise<number[][]> {
  const { createNoise2D } = await import('simplex-noise')

  // Use consistent noise function
  const noise2D = createNoise2D()
  const chunkSize = 16
  const noiseScale = 0.1
  const chunkData: number[][] = []

  for (let row = 0; row < chunkSize; row++) {
    const rowData: number[] = []

    for (let col = 0; col < chunkSize; col++) {
      const worldX = chunkX * chunkSize + col
      const worldY = chunkY * chunkSize + row

      const noiseValue = noise2D(worldX * noiseScale, worldY * noiseScale)
      const terrainType = noiseValue < 0 ? 0 : 1

      rowData.push(terrainType)
    }

    chunkData.push(rowData)
  }

  return chunkData
}
