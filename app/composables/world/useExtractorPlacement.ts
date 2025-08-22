import type { ResourceType } from '#shared/types/world';

export interface ExtractorPlacement {
  id: string;
  x: number;
  y: number;
  resourceType: ResourceType;
  status: string;
  efficiency: number;
  createdAt: Date;
}

export interface PlaceExtractorRequest {
  x: number;
  y: number;
  resourceType: ResourceType;
}

export interface PlaceExtractorResponse {
  extractor: ExtractorPlacement;
  veinId: string;
  status: number;
}

export interface ExtractorError {
  message: string;
  code?: string;
}

export function useExtractorPlacement() {
  const isPlacing = ref(false);
  const placementError = ref<ExtractorError | null>(null);
  const lastPlacedExtractor = ref<ExtractorPlacement | null>(null);

  const placeExtractor = async (
    x: number,
    y: number,
    resourceType: ResourceType,
  ): Promise<ExtractorPlacement | null> => {
    try {
      isPlacing.value = true;
      placementError.value = null;

      const response = await $fetch<PlaceExtractorResponse>('/api/extractors/place', {
        method: 'POST',
        body: {
          x: Math.round(x),
          y: Math.round(y),
          resourceType,
        },
      });

      const placement: ExtractorPlacement = {
        id: response.extractor.id,
        x: response.extractor.x,
        y: response.extractor.y,
        resourceType: response.extractor.resourceType as ResourceType,
        status: response.extractor.status,
        efficiency: response.extractor.efficiency,
        createdAt: new Date(response.extractor.createdAt),
      };

      lastPlacedExtractor.value = placement;
      return placement;
    } catch (error: unknown) {
      console.error('Extractor placement failed:', error);
      placementError.value = {
        message:
          typeof error === 'object' &&
          error !== null &&
          'data' in error &&
          typeof (error as Record<string, unknown>).data === 'object' &&
          (error as { data?: { message?: unknown } }).data?.message &&
          typeof (error as { data?: { message?: unknown } }).data?.message === 'string'
            ? ((error as { data?: { message?: string } }).data!.message as string)
            : error instanceof Error
              ? error.message
              : 'Failed to place extractor',
        code: 'PLACEMENT_FAILED',
      };
      return null;
    } finally {
      isPlacing.value = false;
    }
  };

  const clearPlacementResult = () => {
    lastPlacedExtractor.value = null;
    placementError.value = null;
  };

  return {
    isPlacing: readonly(isPlacing),
    placementError: readonly(placementError),
    lastPlacedExtractor: readonly(lastPlacedExtractor),
    placeExtractor,
    clearPlacementResult,
  };
}
