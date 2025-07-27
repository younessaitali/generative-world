import type { Camera, CameraEvent } from '~/types/world'

export interface UseCameraOptions {
  initialX?: number
  initialY?: number
  initialZoom?: number
  minZoom?: number
  maxZoom?: number
  zoomSensitivity?: number
}

export function useCamera(options: UseCameraOptions = {}) {
  const camera = ref<Camera>({
    x: options.initialX ?? 0,
    y: options.initialY ?? 0,
    zoom: options.initialZoom ?? 1.0,
  })

  const minZoom = options.minZoom ?? 0.1
  const maxZoom = options.maxZoom ?? 10
  const zoomSensitivity = options.zoomSensitivity ?? 0.001

  const setPosition = (x: number, y: number) => {
    camera.value.x = x
    camera.value.y = y
  }

  const setZoom = (zoom: number) => {
    camera.value.zoom = Math.max(minZoom, Math.min(maxZoom, zoom))
  }

  const panCamera = (deltaX: number, deltaY: number) => {
    camera.value.x += deltaX / camera.value.zoom
    camera.value.y += deltaY / camera.value.zoom
  }

  const zoomAtPoint = (zoomDelta: number, mouseX: number, mouseY: number) => {
    const oldZoom = camera.value.zoom
    const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom + zoomDelta * zoomSensitivity))

    if (newZoom !== oldZoom) {
      const zoomFactor = newZoom / oldZoom
      camera.value.x = mouseX - (mouseX - camera.value.x) * zoomFactor
      camera.value.y = mouseY - (mouseY - camera.value.y) * zoomFactor
      camera.value.zoom = newZoom
    }
  }

  const handleCameraEvent = (event: CameraEvent) => {
    switch (event.type) {
      case 'pan':
        if (event.deltaX !== undefined && event.deltaY !== undefined) {
          panCamera(event.deltaX, event.deltaY)
        }
        break

      case 'zoom':
        if (
          event.zoomDelta !== undefined &&
          event.mouseX !== undefined &&
          event.mouseY !== undefined
        ) {
          zoomAtPoint(event.zoomDelta, event.mouseX, event.mouseY)
        }
        break
    }
  }

  const resetCamera = () => {
    camera.value.x = options.initialX ?? 0
    camera.value.y = options.initialY ?? 0
    camera.value.zoom = options.initialZoom ?? 1.0
  }

  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - camera.value.x) / camera.value.zoom,
      y: (screenY - camera.value.y) / camera.value.zoom,
    }
  }

  const worldToScreen = (worldX: number, worldY: number) => {
    return {
      x: worldX * camera.value.zoom + camera.value.x,
      y: worldY * camera.value.zoom + camera.value.y,
    }
  }

  const getViewportBounds = (viewportWidth: number, viewportHeight: number) => {
    const worldViewportWidth = viewportWidth / camera.value.zoom
    const worldViewportHeight = viewportHeight / camera.value.zoom

    return {
      left: -camera.value.x / camera.value.zoom,
      top: -camera.value.y / camera.value.zoom,
      right: (-camera.value.x + viewportWidth) / camera.value.zoom,
      bottom: (-camera.value.y + viewportHeight) / camera.value.zoom,
      width: worldViewportWidth,
      height: worldViewportHeight,
    }
  }

  return {
    camera: readonly(camera),
    setPosition,
    setZoom,
    panCamera,
    zoomAtPoint,
    handleCameraEvent,
    resetCamera,
    screenToWorld,
    worldToScreen,
    getViewportBounds,
    minZoom,
    maxZoom,
    zoomSensitivity,
  }
}
