import type {
  ChunkCoordinate,
  WorldMessage,
  ChunkDataMessage,
  ErrorMessage,
  ViewportCompleteMessage,
  ViewportUpdateMessage,
} from '~/types/world'

export interface WebSocketConfig {
  url: string
  autoReconnect?: boolean
  maxRetries?: number
  retryDelay?: number
  heartbeatInterval?: number
}

export interface WebSocketEventHandlers {
  onChunkData?: (message: ChunkDataMessage) => void
  onError?: (message: ErrorMessage) => void
  onViewportComplete?: (message: ViewportCompleteMessage) => void
  onConnected?: (message: string) => void
  onConnectionError?: (error: Error) => void
}

export class WorldWebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private isConnecting = false
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null

  constructor(
    private config: WebSocketConfig,
    private handlers: WebSocketEventHandlers,
  ) {}

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.config.url)
      this.setupEventListeners()

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'))
          return
        }

        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onerror = error => {
          this.isConnecting = false
          reject(new Error(`WebSocket connection failed: ${error}`))
        }
      })
    } catch (error) {
      this.isConnecting = false
      this.handleConnectionError(error as Error)
      throw error
    }
  }

  send(message: object): void {
    if (!this.isConnected) {
      console.warn('WebSocket not connected, cannot send message:', message)
      return
    }

    try {
      this.ws!.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
    }
  }

  requestViewportUpdate(
    visibleChunks: ChunkCoordinate[],
    cameraX?: number,
    cameraY?: number,
  ): void {
    const message: ViewportUpdateMessage = {
      type: 'updateViewport',
      visibleChunks,
      cameraX,
      cameraY,
      requestId: `viewport-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    this.send(message)
  }

  ping(): void {
    if (this.isConnected) {
      this.ws!.send('ping')
    }
  }

  disconnect(): void {
    this.cleanup()
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get status(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    if (!this.ws) return 'CLOSED'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING'
      case WebSocket.OPEN:
        return 'OPEN'
      case WebSocket.CLOSING:
        return 'CLOSING'
      case WebSocket.CLOSED:
        return 'CLOSED'
      default:
        return 'CLOSED'
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onmessage = event => {
      this.handleMessage(event.data)
    }

    this.ws.onclose = event => {
      this.handleClose(event)
    }

    this.ws.onerror = error => {
      console.error('WebSocket error:', error)
    }
  }

  private handleMessage(data: string): void {
    if (data === 'pong') {
      console.log('WebSocket pong received')
      return
    }

    try {
      const message: WorldMessage = JSON.parse(data)
      this.routeMessage(message)
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private routeMessage(message: WorldMessage): void {
    switch (message.type) {
      case 'connected': {
        const connectedMessage = message as WorldMessage & { message?: string }
        this.handlers.onConnected?.(connectedMessage.message || 'Connected')
        break
      }

      case 'chunkData':
        this.handlers.onChunkData?.(message as ChunkDataMessage)
        break

      case 'viewportComplete':
        this.handlers.onViewportComplete?.(message as ViewportCompleteMessage)
        break

      case 'chunkError':
      case 'viewportError':
        this.handlers.onError?.(message as ErrorMessage)
        break

      default: {
        const unknownMessage = message as WorldMessage & { type: string }
        console.warn('Unknown WebSocket message type:', unknownMessage.type)
      }
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason)

    this.cleanup()

    // Attempt reconnection if enabled
    if (this.config.autoReconnect && this.shouldReconnect()) {
      this.scheduleReconnect()
    }
  }

  private handleConnectionError(error: Error): void {
    console.error('WebSocket connection error:', error)
    this.handlers.onConnectionError?.(error)
  }

  private shouldReconnect(): boolean {
    const maxRetries = this.config.maxRetries ?? 5
    return this.reconnectAttempts < maxRetries
  }

  private scheduleReconnect(): void {
    const delay = this.config.retryDelay ?? 1000
    const backoffDelay = delay * Math.pow(2, this.reconnectAttempts)

    console.log(`Reconnecting in ${backoffDelay}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++
      try {
        await this.connect()
      } catch (error) {
        console.error('Reconnection failed:', error)
      }
    }, backoffDelay)
  }

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval ?? 30000

    this.heartbeatTimer = setInterval(() => {
      this.ping()
    }, interval)
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnecting = false
  }
}
