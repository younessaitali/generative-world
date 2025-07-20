import { defineStore } from 'pinia'

interface Camera {
  x: number
  y: number
  zoom: number
}

interface WorldState {
  camera: Camera
}

export const useWorldStore = defineStore('world', () => {
  const camera = ref<Camera>({
    x: 0,
    y: 0,
    zoom: 1.0
  })

  const updateCameraPosition = (x: number, y: number) => {
    camera.value.x = x
    camera.value.y = y
  }

  const updateCameraZoom = (zoom: number) => {
    camera.value.zoom = zoom
  }

  const panCamera = (deltaX: number, deltaY: number) => {
    camera.value.x += deltaX / camera.value.zoom
    camera.value.y += deltaY / camera.value.zoom
  }

  const zoomAtPoint = (zoomDelta: number, mouseX: number, mouseY: number) => {
    const oldZoom = camera.value.zoom
    const newZoom = Math.max(0.1, Math.min(10, oldZoom + zoomDelta))

    if (newZoom !== oldZoom) {
      const zoomFactor = newZoom / oldZoom
      camera.value.x = mouseX - (mouseX - camera.value.x) * zoomFactor
      camera.value.y = mouseY - (mouseY - camera.value.y) * zoomFactor
      camera.value.zoom = newZoom
    }
  }

  const resetCamera = () => {
    camera.value.x = 0
    camera.value.y = 0
    camera.value.zoom = 1.0
  }

  return {
    camera: readonly(camera),
    updateCameraPosition,
    updateCameraZoom,
    panCamera,
    zoomAtPoint,
    resetCamera
  }
})
