export interface Camera {
  x: number
  y: number
  zoom: number
}

export type CameraState = Camera

export interface Viewport {
  width: number
  height: number
  left: number
  top: number
  right: number
  bottom: number
}

export interface ChunkCoordinate {
  chunkX: number
  chunkY: number
}

export interface ChunkData {
  coordinate: ChunkCoordinate
  data: number[][]
  size: number
  timestamp?: string
}

export type TerrainType = 0 | 1 // 0 = water, 1 = land
export interface TerrainGrid {
  cells: TerrainType[][]
}

export interface WorldConfig {
  chunkSize: number
  cellSize: number
  cacheExpiration: number
  prefetchRadius: number
}

export interface WebSocketMessage {
  type: string
  timestamp?: string
  requestId?: string
}

export interface ChunkRequestMessage extends WebSocketMessage {
  type: 'requestChunk'
  chunkX: number
  chunkY: number
}

export interface ViewportUpdateMessage extends WebSocketMessage {
  type: 'updateViewport'
  visibleChunks: ChunkCoordinate[]
  cameraX?: number
  cameraY?: number
}

export interface ChunkDataMessage extends WebSocketMessage {
  type: 'chunkData'
  chunkX: number
  chunkY: number
  data: TerrainGrid
  priority?: 'viewport' | 'low'
  progress?: {
    current: number
    total: number
    phase?: 'viewport' | 'prefetch'
  }
}

export interface ConnectedMessage extends WebSocketMessage {
  type: 'connected'
  message?: string
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'chunkError' | 'viewportError'
  error: string
  chunkX?: number
  chunkY?: number
}

export interface ViewportCompleteMessage extends WebSocketMessage {
  type: 'viewportComplete'
  chunksStreamed: number
  prefetchChunksStreamed?: number
}

export type WorldMessage =
  | ChunkRequestMessage
  | ViewportUpdateMessage
  | ChunkDataMessage
  | ConnectedMessage
  | ErrorMessage
  | ViewportCompleteMessage

export interface RendererConfig {
  width: number
  height: number
  backgroundColor?: string | number
  antialias?: boolean
  resolution?: number
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

export interface RendererStats {
  chunksLoaded: number
  frameRate: number
  memory: number
  chunksVisible?: number
  totalSprites?: number
  visibleSprites?: number
  renderer?: string
  fps?: number
  deltaTime?: number
  batchingEnabled?: boolean
}

export interface CameraEvent {
  type: 'pan' | 'zoom'
  deltaX?: number
  deltaY?: number
  zoomDelta?: number
  mouseX?: number
  mouseY?: number
}

export interface WorldError {
  code: string
  message: string
  context?: Record<string, unknown>
  recoverable: boolean
}
