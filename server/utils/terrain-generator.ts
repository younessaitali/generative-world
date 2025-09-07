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

const terrainElevationNoise = createNoise2D();
const moistureNoise = createNoise2D();
const temperatureNoise = createNoise2D();

const NOISE_SCALES = {
  ELEVATION: 0.001, // Primary terrain height
  MOISTURE: 0.002, // Vegetation and water distribution
  TEMPERATURE: 0.0005, // Climate zones
} as const;

const NOISE_OFFSETS = {
  ELEVATION: { x: 0, y: 0 },
  MOISTURE: { x: 10000, y: 10000 },
  TEMPERATURE: { x: 20000, y: 20000 },
} as const;

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
  const elevation = terrainElevationNoise(
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

  if (elevation < TERRAIN_THRESHOLDS.OCEAN_ELEVATION) {
    return TerrainTypeEnum.OCEAN;
  }

  if (elevation > TERRAIN_THRESHOLDS.MOUNTAIN_ELEVATION) {
    return TerrainTypeEnum.MOUNTAINS;
  }

  if (elevation <= 0.2) {
    if (moisture > TERRAIN_THRESHOLDS.HIGH_MOISTURE) {
      return TerrainTypeEnum.SWAMP;
    } else {
      return TerrainTypeEnum.PLAINS;
    }
  }

  if (elevation < 0.5) {
    if (moisture > TERRAIN_THRESHOLDS.HIGH_MOISTURE) {
      return TerrainTypeEnum.FOREST;
    } else {
      return TerrainTypeEnum.HILLS;
    }
  }

  if (temperature < TERRAIN_THRESHOLDS.LOW_TEMPERATURE) {
    return TerrainTypeEnum.TUNDRA;
  }

  if (
    moisture < TERRAIN_THRESHOLDS.LOW_MOISTURE &&
    temperature > TERRAIN_THRESHOLDS.HIGH_TEMPERATURE
  ) {
    return TerrainTypeEnum.DESERT;
  }

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
