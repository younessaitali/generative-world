import type { ResourceType } from '#shared/types/world';

export interface PlacementValidationInput {
  x: number;
  y: number;
  resourceType: ResourceType | null;
  scanResult:
  | ({ x: number; y: number; discovered?: { type: ResourceType } | null } | null)
  | undefined;
  extractorAt: (x: number, y: number) => unknown | undefined;
}

export interface PlacementValidationResult {
  valid: boolean;
  reason?: string;
}

export function usePlacementValidation() {
  const validate = (input: PlacementValidationInput): PlacementValidationResult => {
    const { x, y, resourceType, scanResult, extractorAt } = input;

    if (!scanResult) {
      return { valid: false, reason: 'Scan an area first' };
    }

    if (!scanResult.discovered) {
      return { valid: false, reason: 'No resources discovered here' };
    }

    if (!resourceType) {
      return { valid: false, reason: 'Select a resource type to place' };
    }

    const targetX = Math.round(scanResult.x);
    const targetY = Math.round(scanResult.y);
    if (x !== targetX || y !== targetY) {
      return { valid: false, reason: 'Move to the scanned tile to place' };
    }

    if ((scanResult.discovered?.type as ResourceType | undefined) !== resourceType) {
      return { valid: false, reason: 'Resource type mismatch at this tile' };
    }

    const existing = extractorAt(x, y);
    if (existing) {
      return { valid: false, reason: 'Extractor already exists here' };
    }

    return { valid: true };
  };

  return { validate };
}
