import { defineStore } from 'pinia'
import { useCamera } from './world/useCamera'

export const useWorldStore = defineStore('world', () => {
  const cameraComposable = useCamera({
    initialX: 0,
    initialY: 0,
    initialZoom: 1.0,
    minZoom: 0.1,
    maxZoom: 10,
  })

  const worldConfig = {
    chunkSize: 16,
    cellSize: 32,
    cacheExpiration: 3600,
    prefetchRadius: 1,
  }
  const stats = ref({
    chunksLoaded: 0,
    chunksVisible: 0,
    activeConnections: 0,
  })

  const updateStats = (newStats: Partial<typeof stats.value>) => {
    Object.assign(stats.value, newStats)
  }

  return {
    camera: cameraComposable.camera,
    setPosition: cameraComposable.setPosition,
    setZoom: cameraComposable.setZoom,
    panCamera: cameraComposable.panCamera,
    zoomAtPoint: cameraComposable.zoomAtPoint,
    handleCameraEvent: cameraComposable.handleCameraEvent,
    resetCamera: cameraComposable.resetCamera,
    screenToWorld: cameraComposable.screenToWorld,
    worldToScreen: cameraComposable.worldToScreen,
    getViewportBounds: cameraComposable.getViewportBounds,
    worldConfig: readonly(worldConfig),
    stats: readonly(stats),
    updateStats,
  }
})
