<script setup lang="ts">
import { useTemplateRef, onMounted, onUnmounted } from 'vue'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const resizeCanvas = () => {
  if (canvas.value) {
    const ctx = canvas.value.getContext('2d')
    if (ctx) {
      canvas.value.width = window.innerWidth
      canvas.value.height = window.innerHeight
    }
  }
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
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
