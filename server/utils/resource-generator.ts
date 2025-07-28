import { createNoise2D } from 'simplex-noise';
import { v4 as uuidv4 } from 'uuid';
import { RESOURCE_CONFIGS } from '~/config/resources.config';
import type {
  ResourceVein,
  ResourceType,
  ResourceGrade,
  FormationType,
  ScanLevel,
  ExtendedTerrainType,
  ClimateType,
  EnvironmentalHazard,
} from '~/types/world';
import {
  ResourceGrade as ResourceGradeEnum,
  ExtendedTerrainType as ExtendedTerrainTypeEnum,
  ClimateType as ClimateTypeEnum,
  EnvironmentalHazard as EnvironmentalHazardEnum,
  ScanLevel as ScanLevelEnum,
} from '~/types/world';

/**
 * Resource Generation Utility
 *
 * Generates procedural resource veins for chunks using multiple noise layers
 * and realistic geological distribution patterns.
 */

// Create different noise functions for various aspects of resource generation
const resourceDensityNoise = createNoise2D(); // Controls overall resource density
const resourceTypeNoise = createNoise2D(); // Determines resource type distribution
const richnessnoise = createNoise2D(); // Controls ore richness/quality
const sizeNoise = createNoise2D(); // Controls vein size
const depthNoise = createNoise2D(); // Controls depth below surface

// Configuration constants
const RESOURCE_GENERATION_CONFIG = {
  // Base probability of resource generation per cell (0.0 - 1.0)
  BASE_RESOURCE_PROBABILITY: 0.15,

  // Noise scales for different aspects
  DENSITY_NOISE_SCALE: 0.05, // Larger scale for regional resource distribution
  TYPE_NOISE_SCALE: 0.08, // Medium scale for resource type clustering
  RICHNESS_NOISE_SCALE: 0.12, // Smaller scale for local variations
  SIZE_NOISE_SCALE: 0.1, // Size variation scale
  DEPTH_NOISE_SCALE: 0.15, // Depth variation scale

  // Resource generation thresholds
  DENSITY_THRESHOLD: 0.2, // Minimum noise value for resource generation
  HIGH_DENSITY_THRESHOLD: 0.6, // Threshold for higher density areas

  // Rarity modifiers
  COMMON_MULTIPLIER: 1.5, // Boost common resources
  RARE_MULTIPLIER: 0.3, // Reduce rare resources
  ULTRA_RARE_MULTIPLIER: 0.1, // Heavily reduce ultra-rare resources
};

/**
 * Generates resources for a given chunk
 */
export function generateChunkResources(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
): ResourceVein[] {
  const resources: ResourceVein[] = [];

  // Get all available resource types
  const resourceTypes = Object.keys(RESOURCE_CONFIGS) as ResourceType[];

  // Generate resources for each cell in the chunk
  for (let cellY = 0; cellY < chunkSize; cellY++) {
    for (let cellX = 0; cellX < chunkSize; cellX++) {
      const worldX = chunkX * chunkSize + cellX;
      const worldY = chunkY * chunkSize + cellY;

      // Check if this cell should have a resource vein
      const densityValue = resourceDensityNoise(
        worldX * RESOURCE_GENERATION_CONFIG.DENSITY_NOISE_SCALE,
        worldY * RESOURCE_GENERATION_CONFIG.DENSITY_NOISE_SCALE,
      );

      // Apply base probability check
      if (densityValue < RESOURCE_GENERATION_CONFIG.DENSITY_THRESHOLD) {
        continue; // No resource in this cell
      }

      // Determine resource type based on noise and rarity
      const resourceType = selectResourceType(worldX, worldY, resourceTypes);
      if (!resourceType) {
        continue; // No suitable resource type
      }

      // Generate the resource vein
      const resourceVein = generateResourceVein(
        resourceType,
        worldX,
        worldY,
        chunkX,
        chunkY,
        cellX,
        cellY,
        densityValue,
      );

      resources.push(resourceVein);
    }
  }

  return resources;
}

/**
 * Selects a resource type based on world coordinates and rarity
 */
function selectResourceType(
  worldX: number,
  worldY: number,
  availableTypes: ResourceType[],
): ResourceType | null {
  const typeNoise = resourceTypeNoise(
    worldX * RESOURCE_GENERATION_CONFIG.TYPE_NOISE_SCALE,
    worldY * RESOURCE_GENERATION_CONFIG.TYPE_NOISE_SCALE,
  );

  // Create weighted list based on resource rarity
  const weightedTypes: { type: ResourceType; weight: number }[] = [];

  for (const type of availableTypes) {
    const config = RESOURCE_CONFIGS[type];
    let weight = config.rarity;

    // Apply rarity modifiers
    if (config.rarity >= 0.7) {
      weight *= RESOURCE_GENERATION_CONFIG.COMMON_MULTIPLIER;
    } else if (config.rarity <= 0.1) {
      weight *= RESOURCE_GENERATION_CONFIG.ULTRA_RARE_MULTIPLIER;
    } else if (config.rarity <= 0.3) {
      weight *= RESOURCE_GENERATION_CONFIG.RARE_MULTIPLIER;
    }

    weightedTypes.push({ type, weight });
  }

  // Sort by weight (higher weight = more likely)
  weightedTypes.sort((a, b) => b.weight - a.weight);

  // Use noise to select from weighted list
  const normalizedNoise = (typeNoise + 1) / 2; // Convert from [-1,1] to [0,1]
  const totalWeight = weightedTypes.reduce((sum, item) => sum + item.weight, 0);

  let accumulator = 0;
  const threshold = normalizedNoise * totalWeight;

  for (const item of weightedTypes) {
    accumulator += item.weight;
    if (accumulator >= threshold) {
      return item.type;
    }
  }

  // Fallback to most common resource
  return weightedTypes[0]?.type || null;
}

/**
 * Generates a complete resource vein with all properties
 */
function generateResourceVein(
  resourceType: ResourceType,
  worldX: number,
  worldY: number,
  chunkX: number,
  chunkY: number,
  cellX: number,
  cellY: number,
  densityValue: number,
): ResourceVein {
  const config = RESOURCE_CONFIGS[resourceType];
  const id = uuidv4();

  // Generate richness based on noise and base rarity
  const richnessValue = richnessnoise(
    worldX * RESOURCE_GENERATION_CONFIG.RICHNESS_NOISE_SCALE,
    worldY * RESOURCE_GENERATION_CONFIG.RICHNESS_NOISE_SCALE,
  );
  const normalizedRichness = (richnessValue + 1) / 2; // Convert to [0,1]
  const richness = Math.max(0.1, Math.min(1.0, normalizedRichness * config.rarity + 0.2));

  // Generate size based on noise and config
  const sizeValue = sizeNoise(
    worldX * RESOURCE_GENERATION_CONFIG.SIZE_NOISE_SCALE,
    worldY * RESOURCE_GENERATION_CONFIG.SIZE_NOISE_SCALE,
  );
  const normalizedSize = (sizeValue + 1) / 2;
  const size = Math.floor(config.minSize + (config.maxSize - config.minSize) * normalizedSize);

  // Generate depth
  const depthValue = depthNoise(
    worldX * RESOURCE_GENERATION_CONFIG.DEPTH_NOISE_SCALE,
    worldY * RESOURCE_GENERATION_CONFIG.DEPTH_NOISE_SCALE,
  );
  const normalizedDepth = (depthValue + 1) / 2;
  const depth = Math.max(1, Math.min(10, Math.floor(1 + normalizedDepth * 9)));

  // Determine quality grade based on richness
  const grade: ResourceGrade =
    richness >= 0.8
      ? ResourceGradeEnum.ULTRA
      : richness >= 0.6
        ? ResourceGradeEnum.HIGH
        : richness >= 0.4
          ? ResourceGradeEnum.MEDIUM
          : ResourceGradeEnum.LOW;

  // Calculate accessibility (inversely related to depth)
  const accessibility = Math.max(0.1, Math.min(1.0, 1.0 - (depth - 1) / 9));

  // Calculate complexity and yield
  const complexity = config.extractionDifficulty;
  const baseYield = size * richness * accessibility;
  const expectedYield = Math.floor(baseYield / complexity);

  // Select random formation type from preferred formations
  const formation =
    config.preferredFormations[Math.floor(Math.random() * config.preferredFormations.length)];

  // Generate environmental properties
  const terrain = generateTerrain(worldX, worldY);
  const climate = generateClimate(worldX, worldY);
  const hazards = generateHazards(resourceType, depth);

  const resourceVein: ResourceVein = {
    id,
    type: resourceType,

    location: {
      worldX,
      worldY,
      chunkX,
      chunkY,
      cellX,
      cellY,
    },

    deposit: {
      size,
      richness,
      depth,
      accessibility,
      formation,
    },

    quality: {
      grade,
      purity: richness, // Use richness as base purity
      complexity,
      yield: expectedYield,
    },

    extraction: {
      totalExtracted: 0,
      remainingReserves: size,
      depletion: 0,
      lastExtracted: new Date().toISOString(),
      extractionRate: Math.floor(expectedYield / 10), // Base extraction rate
    },

    discovery: {
      isDiscovered: false,
      scanLevel: ScanLevelEnum.SURFACE,
      confidence: 0,
    },

    environment: {
      terrain,
      climate,
      hazards,
      proximity: {
        nearbyVeins: [],
        geologicalFeatures: [],
        distanceToWater: Math.random() * 1000, // Random distance for now
      },
    },

    metadata: {
      generated: new Date().toISOString(),
      seed: Math.floor(worldX * 1000 + worldY), // Reproducible seed
      version: '1.0.0',
      tags: [resourceType, grade, formation],
    },
  };

  return resourceVein;
}

/**
 * Generate terrain type based on world coordinates
 */
function generateTerrain(worldX: number, worldY: number): ExtendedTerrainType {
  // Simple terrain generation - can be enhanced later
  const terrainNoise = resourceDensityNoise(worldX * 0.02, worldY * 0.02);

  if (terrainNoise < -0.5) return ExtendedTerrainTypeEnum.WATER;
  if (terrainNoise < -0.2) return ExtendedTerrainTypeEnum.PLAINS;
  if (terrainNoise < 0.1) return ExtendedTerrainTypeEnum.HILLS;
  if (terrainNoise < 0.4) return ExtendedTerrainTypeEnum.MOUNTAINS;
  if (terrainNoise < 0.6) return ExtendedTerrainTypeEnum.FOREST;
  return ExtendedTerrainTypeEnum.DESERT;
}

/**
 * Generate climate type based on world coordinates
 */
function generateClimate(worldX: number, worldY: number): ClimateType {
  // Simple climate generation based on latitude-like coordinate
  const latitudelike = Math.abs(worldY % 1000) / 1000;

  if (latitudelike < 0.2) return ClimateTypeEnum.ARCTIC;
  if (latitudelike < 0.4) return ClimateTypeEnum.TEMPERATE;
  if (latitudelike < 0.6) return ClimateTypeEnum.TROPICAL;
  if (latitudelike < 0.8) return ClimateTypeEnum.ARID;
  return ClimateTypeEnum.ALPINE;
}

/**
 * Generate environmental hazards based on resource type and depth
 */
function generateHazards(resourceType: ResourceType, depth: number): EnvironmentalHazard[] {
  const hazards: EnvironmentalHazard[] = [];

  // Add hazards based on resource type
  if (resourceType === 'URANIUM' || resourceType === 'THORIUM') {
    hazards.push(EnvironmentalHazardEnum.RADIATION);
  }

  // Add hazards based on depth
  if (depth >= 7) {
    hazards.push(EnvironmentalHazardEnum.HIGH_PRESSURE);
    if (Math.random() < 0.3) hazards.push(EnvironmentalHazardEnum.INSTABILITY);
  }

  if (depth >= 5 && Math.random() < 0.2) {
    hazards.push(EnvironmentalHazardEnum.TOXIC_GASES);
  }

  // Chance of acidic water in certain formations
  if (Math.random() < 0.1) {
    hazards.push(EnvironmentalHazardEnum.ACIDIC_WATER);
  }

  return hazards;
}
