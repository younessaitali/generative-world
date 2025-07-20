<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue'
import { useEventListener } from '@vueuse/core'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const worldStore = useWorldStore()

const isDragging = ref(false)
const lastMousePosition = ref({ x: 0, y: 0 })

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

useEventListener(canvas, 'mousedown', handleMouseDown)
useEventListener(window, 'mousemove', handleMouseMove)
useEventListener(window, 'mouseup', handleMouseUp)
useEventListener(window, 'resize', resizeCanvas)

onMounted(() => {
  resizeCanvas()
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
