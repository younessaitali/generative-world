import { ExtendedTerrainType } from '#shared/types/world';
import { TERRAIN_CONFIGS } from '~/config/terrain.config';

// Import shared utilities (these will be used from shared folder in auto-imports)
import {
  isValidTerrainType as _isValidTerrainType,
  isWaterTerrain as _isWaterTerrain,
  isValidTerrainGrid as _isValidTerrainGrid,
  analyzeTerrainDistribution as _analyzeTerrainDistribution,
  getTerrainSummary as _getTerrainSummary,
} from '#shared/utils/terrain';

// Frontend-specific terrain utilities that require terrain config
export function getTerrainConfigSafe(terrainType: ExtendedTerrainType) {
  const config = TERRAIN_CONFIGS[terrainType];
  if (!config) {
    console.warn(`No configuration found for terrain type: ${terrainType}`);
    return TERRAIN_CONFIGS[ExtendedTerrainType.PLAINS];
  }
  return config;
}

export function getTerrainColor(terrainType: ExtendedTerrainType): number {
  return getTerrainConfigSafe(terrainType).baseColor;
}

export function isTraversableTerrain(terrainType: ExtendedTerrainType): boolean {
  const config = getTerrainConfigSafe(terrainType);
  return config.traversal.difficulty < 0.8;
}

export function getMovementSpeed(terrainType: ExtendedTerrainType): number {
  return getTerrainConfigSafe(terrainType).traversal.speedModifier;
}
