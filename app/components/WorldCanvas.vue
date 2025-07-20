<script setup lang="ts">
import { useTemplateRef, onMounted, watch } from 'vue'
import { useEventListener, useDebounceFn } from '@vueuse/core'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const worldStore = useWorldStore()

const CHUNK_SIZE = 16 // 16x16 cells per chunk
const CELL_SIZE = 32 // pixels per cell when zoom = 1

const isDragging = ref(false)
const lastMousePosition = ref({ x: 0, y: 0 })
const chunks = ref(new Map<string, number[][]>()) // Cache for loaded chunks

const getChunkKey = (chunkX: number, chunkY: number) => `${chunkX},${chunkY}`

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

  // Camera position represents the translation, so we need to account for it
  const leftWorld = -camera.x - viewportWidth / 2
  const rightWorld = -camera.x + viewportWidth / 2
  const topWorld = -camera.y - viewportHeight / 2
  const bottomWorld = -camera.y + viewportHeight / 2

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

const fetchChunk = async (chunkX: number, chunkY: number) => {
  const chunkKey = getChunkKey(chunkX, chunkY)

  if (chunks.value.has(chunkKey)) {
    return chunks.value.get(chunkKey)
  }

  try {
    const response = await $fetch<{
      success: boolean
      data: number[][]
      coordinates: { x: number; y: number }
      chunkSize: number
      timestamp: string
    }>('/api/world/chunk', {
      query: { x: chunkX, y: chunkY }
    })

    if (response.success) {
      chunks.value.set(chunkKey, response.data)
      return response.data
    }
  } catch (error) {
    console.error(`Failed to fetch chunk ${chunkKey}:`, error)
  }

  return null
}

const loadVisibleChunks = async () => {
  const visibleChunks = calculateVisibleChunks()

  const fetchPromises = visibleChunks.map(({ chunkX, chunkY }) => fetchChunk(chunkX, chunkY))

  if (fetchPromises.length > 0) {
    await Promise.all(fetchPromises)
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

  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(-50, -50, 100, 100)

  ctx.fillStyle = '#ef4444'
  ctx.fillRect(200, 100, 50, 50)

  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1 / camera.zoom

  const gridSize = 100
  const startX = Math.floor(-camera.x / gridSize) * gridSize
  const startY = Math.floor(-camera.y / gridSize) * gridSize
  const endX = startX + (canvas.value.width / camera.zoom) + gridSize
  const endY = startY + (canvas.value.height / camera.zoom) + gridSize

  ctx.beginPath()
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY)
    ctx.lineTo(x, endY)
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
  }
  ctx.stroke()

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
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: block;
  z-index: 1;
  user-select: none;
  cursor: grab;
}

.world-canvas:active {
  cursor: grabbing;
}
</style>
