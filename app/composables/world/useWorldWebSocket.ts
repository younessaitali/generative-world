import {
  WorldWebSocketService,
  type WebSocketEventHandlers,
} from '~/services/WorldWebSocketService';
import type {
  ChunkCoordinate,
  ChunkDataMessage,
  ErrorMessage,
  ViewportCompleteMessage,
} from '~/types/world';

export interface UseWorldWebSocketOptions {
  url?: string;
  autoReconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
}

export function useWorldWebSocket(options: UseWorldWebSocketOptions = {}) {
  let webSocketService: WorldWebSocketService | null = null;

  const isConnected = ref(false);
  const status = ref<'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>('CLOSED');
  const error = ref<Error | null>(null);
  const connectionAttempts = ref(0);

  const eventHandlers = ref<WebSocketEventHandlers>({});

  const connect = async () => {
    const config = {
      url: options.url || '/ws/world-stream',
      autoReconnect: options.autoReconnect ?? true,
      maxRetries: options.maxRetries ?? 5,
      retryDelay: options.retryDelay ?? 1000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
    };

    const handlers: WebSocketEventHandlers = {
      onConnected: (message: string) => {
        console.log('WebSocket stream connected:', message);
        isConnected.value = true;
        status.value = 'OPEN';
        error.value = null;
        eventHandlers.value.onConnected?.(message);
      },

      onChunkData: (message: ChunkDataMessage) => {
        eventHandlers.value.onChunkData?.(message);
      },

      onError: (message: ErrorMessage) => {
        console.error('WebSocket error:', message.error);
        eventHandlers.value.onError?.(message);
      },

      onViewportComplete: (message: ViewportCompleteMessage) => {
        eventHandlers.value.onViewportComplete?.(message);
      },

      onConnectionError: (err: Error) => {
        console.error('WebSocket connection error:', err);
        error.value = err;
        isConnected.value = false;
        status.value = 'CLOSED';
        connectionAttempts.value++;
      },
    };

    webSocketService = new WorldWebSocketService(config, handlers);

    try {
      await webSocketService.connect();
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  };

  const disconnect = () => {
    if (webSocketService) {
      webSocketService.disconnect();
      webSocketService = null;
    }
    isConnected.value = false;
    status.value = 'CLOSED';
  };

  const requestViewportUpdate = (
    visibleChunks: ChunkCoordinate[],
    cameraX?: number,
    cameraY?: number,
  ) => {
    if (!webSocketService || !isConnected.value) {
      console.warn('WebSocket not connected, cannot request viewport update');
      return;
    }

    webSocketService.requestViewportUpdate(visibleChunks, cameraX, cameraY);
  };

  const onChunkData = (handler: (message: ChunkDataMessage) => void) => {
    eventHandlers.value.onChunkData = handler;
  };

  const onError = (handler: (message: ErrorMessage) => void) => {
    eventHandlers.value.onError = handler;
  };

  const onViewportComplete = (handler: (message: ViewportCompleteMessage) => void) => {
    eventHandlers.value.onViewportComplete = handler;
  };

  const onConnected = (handler: (message: string) => void) => {
    eventHandlers.value.onConnected = handler;
  };

  onUnmounted(() => {
    disconnect();
  });

  watchEffect(() => {
    if (webSocketService) {
      status.value = webSocketService.status;
    }
  });

  return {
    isConnected: readonly(isConnected),
    status: readonly(status),
    error: readonly(error),
    connectionAttempts: readonly(connectionAttempts),
    connect,
    disconnect,
    requestViewportUpdate,
    onChunkData,
    onError,
    onViewportComplete,
    onConnected,
  };
}
