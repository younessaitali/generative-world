export const WORLD_CONFIG = {
  chunk: {
    size: 16,
    cellSize: 32,
    prefetchRadius: 1,
    cacheExpiration: 3600000,
    maxCachedChunks: 1000
  },

  camera: {
    initialX: 0,
    initialY: 0,
    initialZoom: 1.0,
    minZoom: 0.1,
    maxZoom: 10.0,
    panSpeed: 1.0,
    zoomSpeed: 0.001
  },

  renderer: {
    backgroundColor: 0x2c3e50,
    antialias: true,
    powerPreference: 'high-performance' as const,
    resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    autoDensity: true
  },

  websocket: {
    url: typeof window !== 'undefined' ? `ws://${window.location.host}/ws/world-stream` : '',
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectDecay: 1.5,
    timeoutInterval: 30000,
    enableLogs: true,
    heartbeatInterval: 25000
  },

  performance: {
    maxFPS: 60,
    targetFrameTime: 16.67,      // Target 60fps = ~16.67ms per frame
    enableStats: process.env.NODE_ENV === 'development',
    batchSize: 100,              // Number of chunks to process per batch
    debounceDelay: 100           // Debounce delay for user interactions
  }
} as const

export type WorldConfig = typeof WORLD_CONFIG
