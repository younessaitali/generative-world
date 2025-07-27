import { useDebounceFn } from '@vueuse/core'
import { useWorldRenderer } from './useWorldRenderer'
import { useWorldWebSocket } from './useWorldWebSocket'
import { useWorldChunks } from './useWorldChunks'
import { useWorldInteraction } from './useWorldInteraction'
import type {
  RendererConfig,
  ChunkCoordinate,
  ChunkDataMessage,
  WorldConfig,
  CameraEvent,
  ErrorMessage,
  ViewportCompleteMessage,
} from '~/types/world'

export interface UseWorldManagerOptions {
  rendererConfig?: RendererConfig
  webSocketUrl?: string
  enableInteractions?: boolean
  debounceDuration?: number
}

/**
 * Main world manager composable
 * Orchestrates all world systems: rendering, networking, interaction, and chunks
 */
export function useWorldManager(
  container: Ref<HTMLElement | null | undefined>,
  options: UseWorldManagerOptions = {},
) {
  const worldStore = useWorldStore()

  const worldConfig: WorldConfig = worldStore.worldConfig

  const renderer = useWorldRenderer(container)
  const webSocket = useWorldWebSocket({
    url: options.webSocketUrl || '/ws/world-stream',
  })
  const chunks = useWorldChunks(worldConfig)
  const interaction = useWorldInteraction(container, {
    enablePanning: options.enableInteractions ?? true,
    enableZooming: options.enableInteractions ?? true,
  })

  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const initialize = async (rendererConfig?: RendererConfig) => {
    try {
      isLoading.value = true
      error.value = null

      const config = rendererConfig ||
        options.rendererConfig || {
          width: import.meta.client ? window.innerWidth : 800,
          height: import.meta.client ? window.innerHeight : 600,
          backgroundColor: 0x1a1a1a,
        }

      await renderer.initialize(config)

      await webSocket.connect()

      setupEventHandlers()

      loadVisibleChunks()

      isInitialized.value = true
      console.log('World manager initialized successfully')
    } catch (err) {
      error.value = err as Error
      console.error('Failed to initialize world manager:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const setupEventHandlers = () => {
    // Handle camera events from interactions
    interaction.onCameraEvent((event: CameraEvent) => {
      worldStore.handleCameraEvent(event)
    })

    // Handle chunk data from WebSocket
    webSocket.onChunkData((message: ChunkDataMessage) => {
      const coordinate: ChunkCoordinate = {
        chunkX: message.chunkX,
        chunkY: message.chunkY,
      }

      chunks.setChunk(coordinate, message.data)

      renderer.addChunk(coordinate, message.data)
    })

    webSocket.onError((message: ErrorMessage) => {
      console.error('WebSocket error:', message.error)
    })

    webSocket.onViewportComplete((message: ViewportCompleteMessage) => {
      console.log('Viewport update complete:', message.chunksStreamed, 'chunks loaded')
    })
  }

  const loadVisibleChunks = () => {
    if (!container.value || !webSocket.isConnected) return

    const viewport = worldStore.getViewportBounds(
      container.value.clientWidth,
      container.value.clientHeight,
    )

    const visibleChunks = chunks.getVisibleChunksForViewport(viewport)
    const unloadedChunks = chunks.getUnloadedChunks(visibleChunks)

    if (unloadedChunks.length > 0) {
      const sortedChunks = chunks.sortChunksByDistance(
        unloadedChunks,
        worldStore.camera.x,
        worldStore.camera.y,
      )

      webSocket.requestViewportUpdate(sortedChunks, worldStore.camera.x, worldStore.camera.y)
    }
  }

  // Debounced chunk loading to prevent excessive requests
  const debouncedLoadChunks = useDebounceFn(loadVisibleChunks, options.debounceDuration ?? 250)

  const resize = (width: number, height: number) => {
    renderer.resize(width, height)
    debouncedLoadChunks()
  }

  const updateStats = () => {
    const rendererStats = renderer.getStats()
    const chunkStats = chunks.getChunkStats()

    worldStore.updateStats({
      chunksLoaded: chunkStats.totalChunks,
      chunksVisible: rendererStats?.chunksVisible ?? 0,
      activeConnections: webSocket.isConnected ? 1 : 0,
    })
  }

  const destroy = () => {
    renderer.destroy()
    webSocket.disconnect()
    chunks.clearChunks()
    isInitialized.value = false
  }

  useEventListener(window, 'resize', () => {
    if (container.value) {
      resize(container.value.clientWidth, container.value.clientHeight)
    }
  })

  watch(
    () => worldStore.camera,
    camera => {
      renderer.setCameraTransform(camera.x, camera.y, camera.zoom)
      debouncedLoadChunks()
    },
    { deep: true, immediate: true },
  )

  onUnmounted(() => {
    destroy()
  })

  return {
    isInitialized: readonly(isInitialized),
    isLoading: readonly(isLoading),
    error: readonly(error),
    renderer,
    webSocket,
    chunks,
    interaction,
    initialize,
    resize,
    updateStats,
    destroy,
    loadVisibleChunks,
    debouncedLoadChunks,
  }
}
