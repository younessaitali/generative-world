<script setup lang="ts">
import { useTemplateRef, onMounted, watch } from 'vue'
import { useEventListener, useDebounceFn, useWebSocket } from '@vueuse/core'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const worldStore = useWorldStore()

const CHUNK_SIZE = 16 // 16x16 cells per chunk
const CELL_SIZE = 32 // pixels per cell when zoom = 1

const isDragging = ref(false)
const lastMousePosition = ref({ x: 0, y: 0 })
const chunks = ref(new Map<string, number[][]>())


const { status,  send } = useWebSocket('/ws/world-stream', {
  autoReconnect: {
    retries: 5,
    delay: 1000,
    onFailed() {
      console.error('Failed to connect WebSocket after 5 retries')
    },
  },
  heartbeat: {
    message: 'ping',
    interval: 30000,
  },
  onMessage(ws, event) {

    if (!event.data) return

    if(event.data === 'pong') {
      console.log('WebSocket pong received')
      return
    }

    try {
      const message = JSON.parse(event.data)
      handleWebSocketMessage(message)
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  },
})

const getChunkKey = (chunkX: number, chunkY: number) => `${chunkX},${chunkY}`


const handleWebSocketMessage = (message: {
  type: string
  message?: string
  chunkX?: number
  chunkY?: number
  data?: number[][]
  chunksStreamed?: number
  progress?: { current: number; total: number }
  error?: string
}) => {
  switch (message.type) {
    case 'connected':
      console.log('WebSocket stream connected:', message.message)
      break

    case 'chunkData': {
      if (message.chunkX !== undefined && message.chunkY !== undefined && message.data) {
        const chunkKey = getChunkKey(message.chunkX, message.chunkY)
        chunks.value.set(chunkKey, message.data)

        // Log progress if available
        if (message.progress) {
          console.log(`Received chunk ${message.chunkX},${message.chunkY} (${message.progress.current}/${message.progress.total})`)
        }
      }
      break
    }

    case 'viewportComplete':
      console.log(`Viewport update complete: ${message.chunksStreamed} chunks streamed`)
      break

    case 'chunkError':
    case 'viewportError':
      console.error('WebSocket error:', message.error)
      break

    default:
      console.warn('Unknown WebSocket message type:', message.type)
  }
}

const sendViewportUpdate = (visibleChunks: Array<{ chunkX: number; chunkY: number }>) => {
  if (status.value !== 'OPEN') {
    console.warn('WebSocket not connected, cannot send viewport update')
    return
  }

  const neededChunks = visibleChunks.filter(({ chunkX, chunkY }) => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    return !chunks.value.has(chunkKey)
  })

  if (neededChunks.length === 0) {
    return
  }

  const { camera } = worldStore

  send(JSON.stringify({
    type: 'updateViewport',
    visibleChunks: neededChunks,
    cameraX: camera.x,
    cameraY: camera.y,
    cameraZoom: camera.zoom,
    requestId: `viewport-${Date.now()}`
  }))
}

const worldToChunk = (worldX: number, worldY: number) => {
  return {
    chunkX: Math.floor(worldX / (CHUNK_SIZE * CELL_SIZE)),
    chunkY: Math.floor(worldY / (CHUNK_SIZE * CELL_SIZE))
  }
}

const calculateVisibleChunks = () => {
  if (!canvas.value) return []

  const { camera } = worldStore

  const viewportWidth = canvas.value.width / camera.zoom
  const viewportHeight = canvas.value.height / camera.zoom

  const leftWorld = -camera.x
  const topWorld = -camera.y

  const rightWorld = leftWorld + viewportWidth
  const bottomWorld = topWorld + viewportHeight

  const topLeftChunk = worldToChunk(leftWorld, topWorld)
  const bottomRightChunk = worldToChunk(rightWorld, bottomWorld)

  const padding = 1
  const minChunkX = topLeftChunk.chunkX - padding
  const maxChunkX = bottomRightChunk.chunkX + padding
  const minChunkY = topLeftChunk.chunkY - padding
  const maxChunkY = bottomRightChunk.chunkY + padding

  const visibleChunks: Array<{ chunkX: number; chunkY: number }> = []

  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      visibleChunks.push({ chunkX, chunkY })
    }
  }

  return visibleChunks
}

const loadVisibleChunks = () => {
  const visibleChunks = calculateVisibleChunks()
  if (visibleChunks.length > 0) {
    sendViewportUpdate(visibleChunks)
  }
}

const debouncedLoadChunks = useDebounceFn(loadVisibleChunks, 250)

watch(
  () => worldStore.camera,
  () => {
    debouncedLoadChunks()
  },
  { deep: true, immediate: true }
)

const resizeCanvas = () => {
  if (canvas.value) {
    const ctx = canvas.value.getContext('2d')
    if (ctx) {
      canvas.value.width = window.innerWidth
      canvas.value.height = window.innerHeight
    }
  }
}

const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true
  lastMousePosition.value = { x: event.clientX, y: event.clientY }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - lastMousePosition.value.x
  const deltaY = event.clientY - lastMousePosition.value.y

  worldStore.panCamera(deltaX, deltaY)

  lastMousePosition.value = { x: event.clientX, y: event.clientY }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()

  if (!canvas.value) return

  const rect = canvas.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const zoomDelta = -event.deltaY * 0.001

  worldStore.zoomAtPoint(zoomDelta, mouseX, mouseY)
}

const render = () => {

  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  const { camera } = worldStore

  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(camera.x, camera.y)

  const visibleChunks = calculateVisibleChunks()

  for (const { chunkX, chunkY } of visibleChunks) {
    const chunkKey = getChunkKey(chunkX, chunkY)
    const chunkData = chunks.value.get(chunkKey)

    if (chunkData) {
      const chunkWorldX = chunkX * CHUNK_SIZE * CELL_SIZE
      const chunkWorldY = chunkY * CHUNK_SIZE * CELL_SIZE

      for (let row = 0; row < CHUNK_SIZE; row++) {
        for (let col = 0; col < CHUNK_SIZE; col++) {
          const cellRow = chunkData[row]
          if (cellRow) {
            const cellValue = cellRow[col]

            if (cellValue === 0) {
              ctx.fillStyle = '#3b82f6'
            } else if (cellValue === 1) {
              ctx.fillStyle = '#22c55e'
            } else {
              ctx.fillStyle = '#6b7280'
            }

            const cellX = chunkWorldX + col * CELL_SIZE
            const cellY = chunkWorldY + row * CELL_SIZE

            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE)
          }
        }
      }
    } else {
      const chunkWorldX = chunkX * CHUNK_SIZE * CELL_SIZE
      const chunkWorldY = chunkY * CHUNK_SIZE * CELL_SIZE

      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(chunkWorldX, chunkWorldY, CHUNK_SIZE * CELL_SIZE, CHUNK_SIZE * CELL_SIZE)

      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 2 / camera.zoom
      ctx.strokeRect(chunkWorldX, chunkWorldY, CHUNK_SIZE * CELL_SIZE, CHUNK_SIZE * CELL_SIZE)
    }
  }



  ctx.restore()

  requestAnimationFrame(render)
}

useEventListener(canvas, 'mousedown', handleMouseDown)
useEventListener(window, 'mousemove', handleMouseMove)
useEventListener(window, 'mouseup', handleMouseUp)
useEventListener(canvas, 'wheel', handleWheel, { passive: false })
useEventListener(window, 'resize', resizeCanvas)

onMounted(() => {
  resizeCanvas()
  requestAnimationFrame(render)
})


</script>

<template>
  <canvas
    ref="canvas"
    class="world-canvas"
  />
</template>

<style scoped>
.world-canvas {
  position: fixed;
  top: 5vh;
  left: 5vh;
  width: 90vw;
  height: 90vh;
  margin: 0;
  padding: 0;
  display: block;
  z-index: 1;
  user-select: none;
  cursor: grab;
  border: solid 1px red;
}

.world-canvas:active {
  cursor: grabbing;
}
</style>
