import type { ExtractorPlacement } from './useExtractorPlacement';
import type { ResourceType } from '#shared/types/world';
import { getResourceColor } from '~/utils/resource-colors';

export interface ExtractorSprite {
  id: string;
  x: number;
  y: number;
  resourceType: ResourceType;
  status: string;
  color: number;
  efficiency: number;
  isAnimated: boolean;
}

export function useExtractorManager() {
  const extractors = ref<Map<string, ExtractorSprite>>(new Map());

  const addExtractor = (extractor: ExtractorPlacement) => {
    const sprite: ExtractorSprite = {
      id: extractor.id,
      x: extractor.x,
      y: extractor.y,
      resourceType: extractor.resourceType,
      status: extractor.status,
      color: getResourceColor(extractor.resourceType),
      efficiency: extractor.efficiency,
      isAnimated: extractor.status === 'EXTRACTING',
    };

    extractors.value.set(extractor.id, sprite);
  };

  const removeExtractor = (extractorId: string) => {
    extractors.value.delete(extractorId);
  };

  const updateExtractorStatus = (extractorId: string, status: string) => {
    const extractor = extractors.value.get(extractorId);
    if (extractor) {
      extractor.status = status;
      extractor.isAnimated = status === 'EXTRACTING';
    }
  };

  const getExtractorAt = (x: number, y: number): ExtractorSprite | undefined => {
    return Array.from(extractors.value.values()).find(
      (extractor) => extractor.x === x && extractor.y === y,
    );
  };

  const getAllExtractors = (): ExtractorSprite[] => {
    return Array.from(extractors.value.values());
  };

  const getExtractorsByResourceType = (resourceType: ResourceType): ExtractorSprite[] => {
    return Array.from(extractors.value.values()).filter(
      (extractor) => extractor.resourceType === resourceType,
    );
  };

  const clearAllExtractors = () => {
    extractors.value.clear();
  };

  return {
    extractors: readonly(extractors),
    addExtractor,
    removeExtractor,
    updateExtractorStatus,
    getExtractorAt,
    getAllExtractors,
    getExtractorsByResourceType,
    clearAllExtractors,
  };
}
