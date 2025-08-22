import type { Ref } from 'vue';
import { PixiRendererService } from '~/services/PixiRendererService';
import type {
  RendererConfig,
  ChunkCoordinate,
  TerrainGrid,
  RendererStats,
  ResourceVein,
} from '#shared/types/world';
import type { ExtractorSprite } from './useExtractorManager';
import { WORLD_CONFIG } from '~/config/world.config';

export function useWorldRenderer(container: Ref<HTMLElement | null | undefined>) {
  let rendererService: PixiRendererService | null = null;

  const isInitialized = ref(false);
  const stats = ref<RendererStats | null>(null);

  const initialize = async (_config: RendererConfig) => {
    // Wait for container to be available if it's not yet
    let attempts = 0;
    const maxAttempts = 50;

    while (!container.value && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!container.value) {
      throw new Error('Container element not available after waiting');
    }

    rendererService = new PixiRendererService(WORLD_CONFIG);
    await rendererService.initialize(container.value);
    isInitialized.value = true;

    console.log('PixiJS renderer initialized successfully');
  };

  const setCameraTransform = (x: number, y: number, zoom: number) => {
    if (!rendererService) return;
    rendererService.setCameraTransform(x, y, zoom);
  };

  const addChunk = (
    coordinate: ChunkCoordinate,
    data: TerrainGrid,
    resources: ResourceVein[] = [],
  ) => {
    if (!rendererService) return;
    rendererService.addChunk(coordinate, data, resources);
  };

  const removeChunk = (coordinate: ChunkCoordinate) => {
    if (!rendererService) return;
    rendererService.removeChunk(coordinate);
  };

  const updateChunk = (
    coordinate: ChunkCoordinate,
    data: TerrainGrid,
    resources: ResourceVein[] = [],
  ) => {
    if (!rendererService) return;
    rendererService.updateChunk(coordinate, data, resources);
  };

  const resize = (width: number, height: number) => {
    if (!rendererService) return;
    rendererService.resize(width, height);
  };

  const getStats = () => {
    if (!rendererService) return null;
    return rendererService.getStats();
  };

  const updateStats = () => {
    stats.value = getStats();
  };

  const addExtractor = (extractor: ExtractorSprite) => {
    if (!rendererService) return;
    rendererService.addExtractor(extractor);
  };

  const removeExtractor = (extractorId: string) => {
    if (!rendererService) return;
    rendererService.removeExtractor(extractorId);
  };

  const updateExtractorStatus = (extractorId: string, status: string) => {
    if (!rendererService) return;
    rendererService.updateExtractorStatus(extractorId, status);
  };

  const clearAllExtractors = () => {
    if (!rendererService) return;
    rendererService.clearAllExtractors();
  };

  const destroy = () => {
    if (rendererService) {
      rendererService.destroy();
      rendererService = null;
      isInitialized.value = false;
    }
  };

  onUnmounted(() => {
    destroy();
  });

  return {
    isInitialized: readonly(isInitialized),
    stats: readonly(stats),
    config: WORLD_CONFIG,
    initialize,
    setCameraTransform,
    addChunk,
    removeChunk,
    updateChunk,
    resize,
    getStats,
    updateStats,
    addExtractor,
    removeExtractor,
    updateExtractorStatus,
    clearAllExtractors,
    destroy,
  };
}
