import type { ExtractorPlacement } from './useExtractorPlacement';
import type { ResourceType } from '#shared/types/world';

interface ExtractorListResponse {
  extractors: Array<{
    id: string;
    x: number;
    y: number;
    resourceType: ResourceType;
    status: string;
    efficiency: number;
    createdAt: string;
  }>;
  count: number;
}

export function useExtractorLoader() {
  const isLoading = ref(false);
  const loadError = ref<{ message: string; code?: string } | null>(null);
  const lastLoaded = ref<Date | null>(null);

  const loadExtractors = async (): Promise<ExtractorPlacement[]> => {
    try {
      isLoading.value = true;
      loadError.value = null;

      const response = await $fetch<ExtractorListResponse>('/api/extractors/list');

      const extractors: ExtractorPlacement[] = response.extractors.map((extractor) => ({
        id: extractor.id,
        x: extractor.x,
        y: extractor.y,
        resourceType: extractor.resourceType as ResourceType,
        status: extractor.status,
        efficiency: extractor.efficiency,
        createdAt: new Date(extractor.createdAt),
      }));

      lastLoaded.value = new Date();
      return extractors;
    } catch (error) {
      console.error('Failed to load extractors:', error);
      loadError.value = {
        message: 'Failed to load extractors',
        code: 'LOAD_FAILED',
      };
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const clearLoadError = () => {
    loadError.value = null;
  };

  return {
    isLoading: readonly(isLoading),
    loadError: readonly(loadError),
    lastLoaded: readonly(lastLoaded),
    loadExtractors,
    clearLoadError,
  };
}
