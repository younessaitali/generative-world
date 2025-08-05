import { createNoise2D } from 'simplex-noise';
import type { ExtendedTerrainType } from '#shared/types/world';
import { ExtendedTerrainType as TerrainTypeEnum } from '#shared/types/world';

/**
 * Terrain Generation System
 *
 * Multi-layer terrain generation using Simplex noise with decorrelated offsets
 * for realistic terrain variation. Implements the exact specifications from
 * the terrain system documentation.
 */

// Create independent noise functions with decorrelated offsets
const elevationNoise = createNoise2D();
const moistureNoise = createNoise2D();
const temperatureNoise = createNoise2D();

// Noise scale constants from specifications
const NOISE_SCALES = {
  ELEVATION: 0.001, // Primary terrain height
  MOISTURE: 0.002, // Vegetation and water distribution
  TEMPERATURE: 0.0005, // Climate zones
} as const;

// Decorrelated noise offsets for realistic variation
const NOISE_OFFSETS = {
  ELEVATION: { x: 0, y: 0 },
  MOISTURE: { x: 10000, y: 10000 },
  TEMPERATURE: { x: 20000, y: 20000 },
} as const;

// Terrain determination thresholds
const TERRAIN_THRESHOLDS = {
  OCEAN_ELEVATION: -0.2,
  MOUNTAIN_ELEVATION: 0.7,
  HIGH_MOISTURE: 0.1,
  LOW_MOISTURE: -0.2,
  HIGH_TEMPERATURE: 0.1,
  LOW_TEMPERATURE: -0.3,
} as const;

/**
 * Interface for noise values at a specific coordinate
 */
export interface NoiseValues {
  elevation: number;
  moisture: number;
  temperature: number;
}

/**
 * Get raw noise values for a world coordinate
 * Used by resource generation and other systems that need climate data
 */
export function getTerrainNoiseValues(worldX: number, worldY: number): NoiseValues {
  const elevation = elevationNoise(
    (worldX + NOISE_OFFSETS.ELEVATION.x) * NOISE_SCALES.ELEVATION,
    (worldY + NOISE_OFFSETS.ELEVATION.y) * NOISE_SCALES.ELEVATION,
  );

  const moisture = moistureNoise(
    (worldX + NOISE_OFFSETS.MOISTURE.x) * NOISE_SCALES.MOISTURE,
    (worldY + NOISE_OFFSETS.MOISTURE.y) * NOISE_SCALES.MOISTURE,
  );

  const temperature = temperatureNoise(
    (worldX + NOISE_OFFSETS.TEMPERATURE.x) * NOISE_SCALES.TEMPERATURE,
    (worldY + NOISE_OFFSETS.TEMPERATURE.y) * NOISE_SCALES.TEMPERATURE,
  );

  return { elevation, moisture, temperature };
}

/**
 * Generate terrain type for a single coordinate
 * Implements the exact terrain determination logic from specifications
 */
export function generateTerrainType(worldX: number, worldY: number): ExtendedTerrainType {
  const { elevation, moisture, temperature } = getTerrainNoiseValues(worldX, worldY);

  // Ocean: elevation < -0.2
  if (elevation < TERRAIN_THRESHOLDS.OCEAN_ELEVATION) {
    return TerrainTypeEnum.OCEAN;
  }

  // Mountains: elevation > 0.7
  if (elevation > TERRAIN_THRESHOLDS.MOUNTAIN_ELEVATION) {
    return TerrainTypeEnum.MOUNTAINS;
  }

  // Other terrain types based on moisture/temperature combinations

  // Low elevation terrain (plains vs swamp)
  if (elevation < 0.2) {
    if (moisture > TERRAIN_THRESHOLDS.HIGH_MOISTURE) {
      return TerrainTypeEnum.SWAMP;
    } else {
      return TerrainTypeEnum.PLAINS;
    }
  }

  // Medium elevation terrain (hills vs forest)
  if (elevation < 0.5) {
    if (moisture > TERRAIN_THRESHOLDS.HIGH_MOISTURE) {
      return TerrainTypeEnum.FOREST;
    } else {
      return TerrainTypeEnum.HILLS;
    }
  }

  // High elevation terrain (mountains vs tundra vs desert)
  if (temperature < TERRAIN_THRESHOLDS.LOW_TEMPERATURE) {
    return TerrainTypeEnum.TUNDRA;
  }

  if (
    moisture < TERRAIN_THRESHOLDS.LOW_MOISTURE &&
    temperature > TERRAIN_THRESHOLDS.HIGH_TEMPERATURE
  ) {
    return TerrainTypeEnum.DESERT;
  }

  // Default fallback
  return TerrainTypeEnum.HILLS;
}

/**
 * Generate terrain grid for a chunk
 * Returns ExtendedTerrainType[][] for enhanced terrain system
 */
export function generateChunkTerrain(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
): ExtendedTerrainType[][] {
  const terrain: ExtendedTerrainType[][] = [];

  for (let cellY = 0; cellY < chunkSize; cellY++) {
    const row: ExtendedTerrainType[] = [];

    for (let cellX = 0; cellX < chunkSize; cellX++) {
      const worldX = chunkX * chunkSize + cellX;
      const worldY = chunkY * chunkSize + cellY;

      const terrainType = generateTerrainType(worldX, worldY);
      row.push(terrainType);
    }

    terrain.push(row);
  }

  return terrain;
}

/**
 * Generate legacy terrain grid for backward compatibility
 * Returns number[][] where 0 = water, 1 = land
 */
export function generateChunkTerrainLegacy(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
): number[][] {
  const terrain: number[][] = [];

  for (let cellY = 0; cellY < chunkSize; cellY++) {
    const row: number[] = [];

    for (let cellX = 0; cellX < chunkSize; cellX++) {
      const worldX = chunkX * chunkSize + cellX;
      const worldY = chunkY * chunkSize + cellY;

      const terrainType = generateTerrainType(worldX, worldY);

      // Convert to legacy binary: ocean = 0, everything else = 1
      const legacyValue = terrainType === TerrainTypeEnum.OCEAN ? 0 : 1;
      row.push(legacyValue);
    }

    terrain.push(row);
  }

  return terrain;
}

/**
 * Utility function to check if a terrain type is water-based
 */
export function isWaterTerrain(terrainType: ExtendedTerrainType): boolean {
  return terrainType === TerrainTypeEnum.OCEAN;
}

/**
 * Utility function to check if a terrain type is traversable
 */
export function isTraversableTerrain(terrainType: ExtendedTerrainType): boolean {
  return terrainType !== TerrainTypeEnum.OCEAN;
}

/**
 * Get elevation value for a coordinate (useful for height maps)
 */
export function getElevationAt(worldX: number, worldY: number): number {
  const { elevation } = getTerrainNoiseValues(worldX, worldY);
  return elevation;
}

/**
 * Get moisture value for a coordinate (useful for vegetation systems)
 */
export function getMoistureAt(worldX: number, worldY: number): number {
  const { moisture } = getTerrainNoiseValues(worldX, worldY);
  return moisture;
}

/**
 * Get temperature value for a coordinate (useful for climate systems)
 */
export function getTemperatureAt(worldX: number, worldY: number): number {
  const { temperature } = getTerrainNoiseValues(worldX, worldY);
  return temperature;
}
