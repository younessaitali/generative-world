import { createNoise2D } from 'simplex-noise';
import { ExtendedTerrainType } from '#shared/types/world';

/**
 * Multi-Layer Terrain Generation Utility
 *
 * Implements realistic terrain generation using multiple Simplex noise layers:
 * - Elevation map (scale 0.001): Determines base terrain height
 * - Moisture map (scale 0.002): Influences vegetation
 * - Temperature map (scale 0.0005): Affects biome selection
 *
 * Uses thresholds: elevation < -0.2 = OCEAN, > 0.7 = MOUNTAINS, etc.
 * This creates realistic terrain distributions where mountains form ranges,
 * forests cluster in moist areas, and deserts appear in dry regions.
 */

// Create dedicated noise functions for terrain generation
const elevationNoise = createNoise2D();
const moistureNoise = createNoise2D();
const temperatureNoise = createNoise2D();

// Terrain generation configuration as specified in requirements
export const TERRAIN_GENERATION_CONFIG = {
  // Noise scales as specified in requirements
  ELEVATION_SCALE: 0.001, // Determines base terrain height
  MOISTURE_SCALE: 0.002, // Influences vegetation
  TEMPERATURE_SCALE: 0.0005, // Affects biome selection

  // Elevation thresholds as specified in requirements
  OCEAN_THRESHOLD: -0.2, // elevation < -0.2 = OCEAN
  MOUNTAIN_THRESHOLD: 0.7, // elevation > 0.7 = MOUNTAINS

  // Additional terrain thresholds for realistic distribution
  LAND_THRESHOLD: -0.1, // Above this = land
  HILL_THRESHOLD: 0.3, // Above this = hills/mountains

  // Moisture thresholds for vegetation
  DRY_THRESHOLD: -0.3, // Below this = dry biomes
  WET_THRESHOLD: 0.2, // Above this = wet biomes
  SWAMP_THRESHOLD: 0.4, // Above this = swamp (if low elevation)

  // Temperature thresholds for climate zones
  COLD_THRESHOLD: -0.4, // Below this = cold biomes
  HOT_THRESHOLD: 0.3, // Above this = hot biomes
};

/**
 * Generate terrain type for a single world coordinate using multi-layer noise
 */
export function generateTerrainType(worldX: number, worldY: number): ExtendedTerrainType {
  // Generate the three noise layers with specified scales
  const elevation = elevationNoise(
    worldX * TERRAIN_GENERATION_CONFIG.ELEVATION_SCALE,
    worldY * TERRAIN_GENERATION_CONFIG.ELEVATION_SCALE,
  );

  const moisture = moistureNoise(
    worldX * TERRAIN_GENERATION_CONFIG.MOISTURE_SCALE + 1000, // Offset to decorrelate
    worldY * TERRAIN_GENERATION_CONFIG.MOISTURE_SCALE + 1000,
  );

  const temperature = temperatureNoise(
    worldX * TERRAIN_GENERATION_CONFIG.TEMPERATURE_SCALE + 2000, // Offset to decorrelate
    worldY * TERRAIN_GENERATION_CONFIG.TEMPERATURE_SCALE + 2000,
  );

  // Apply elevation-based terrain selection first (primary factor)
  if (elevation < TERRAIN_GENERATION_CONFIG.OCEAN_THRESHOLD) {
    return ExtendedTerrainType.OCEAN;
  }

  if (elevation > TERRAIN_GENERATION_CONFIG.MOUNTAIN_THRESHOLD) {
    // High elevation terrain - check temperature for mountain/tundra
    if (temperature < TERRAIN_GENERATION_CONFIG.COLD_THRESHOLD) {
      return ExtendedTerrainType.TUNDRA;
    }
    return ExtendedTerrainType.MOUNTAINS;
  }

  // Medium elevation - hills and varied terrain
  if (elevation > TERRAIN_GENERATION_CONFIG.HILL_THRESHOLD) {
    // Check moisture and temperature for hill biomes
    if (moisture > TERRAIN_GENERATION_CONFIG.WET_THRESHOLD) {
      return ExtendedTerrainType.FOREST;
    }
    if (
      moisture < TERRAIN_GENERATION_CONFIG.DRY_THRESHOLD ||
      temperature > TERRAIN_GENERATION_CONFIG.HOT_THRESHOLD
    ) {
      return ExtendedTerrainType.DESERT;
    }
    return ExtendedTerrainType.HILLS;
  }

  // Low elevation - plains and wetlands
  if (elevation > TERRAIN_GENERATION_CONFIG.LAND_THRESHOLD) {
    // Check for swamp (wet + low elevation)
    if (moisture > TERRAIN_GENERATION_CONFIG.SWAMP_THRESHOLD) {
      return ExtendedTerrainType.SWAMP;
    }

    // Check moisture and temperature for plains biomes
    if (moisture > TERRAIN_GENERATION_CONFIG.WET_THRESHOLD) {
      return ExtendedTerrainType.FOREST;
    }

    if (
      moisture < TERRAIN_GENERATION_CONFIG.DRY_THRESHOLD ||
      temperature > TERRAIN_GENERATION_CONFIG.HOT_THRESHOLD
    ) {
      return ExtendedTerrainType.DESERT;
    }

    if (temperature < TERRAIN_GENERATION_CONFIG.COLD_THRESHOLD) {
      return ExtendedTerrainType.TUNDRA;
    }

    return ExtendedTerrainType.PLAINS;
  }

  // Very low elevation - check for coastal swamps or default to plains
  if (moisture > TERRAIN_GENERATION_CONFIG.WET_THRESHOLD) {
    return ExtendedTerrainType.SWAMP;
  }

  return ExtendedTerrainType.PLAINS;
}

/**
 * Generate terrain data for an entire chunk using multi-layer noise
 */
export function generateChunkTerrain(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
): ExtendedTerrainType[][] {
  const terrainData: ExtendedTerrainType[][] = [];

  for (let row = 0; row < chunkSize; row++) {
    const rowData: ExtendedTerrainType[] = [];

    for (let col = 0; col < chunkSize; col++) {
      const worldX = chunkX * chunkSize + col;
      const worldY = chunkY * chunkSize + row;

      const terrainType = generateTerrainType(worldX, worldY);
      rowData.push(terrainType);
    }

    terrainData.push(rowData);
  }

  return terrainData;
}

/**
 * Get the raw noise values for a world coordinate (useful for advanced features)
 */
export function getTerrainNoiseValues(worldX: number, worldY: number) {
  return {
    elevation: elevationNoise(
      worldX * TERRAIN_GENERATION_CONFIG.ELEVATION_SCALE,
      worldY * TERRAIN_GENERATION_CONFIG.ELEVATION_SCALE,
    ),
    moisture: moistureNoise(
      worldX * TERRAIN_GENERATION_CONFIG.MOISTURE_SCALE + 1000,
      worldY * TERRAIN_GENERATION_CONFIG.MOISTURE_SCALE + 1000,
    ),
    temperature: temperatureNoise(
      worldX * TERRAIN_GENERATION_CONFIG.TEMPERATURE_SCALE + 2000,
      worldY * TERRAIN_GENERATION_CONFIG.TEMPERATURE_SCALE + 2000,
    ),
  };
}
