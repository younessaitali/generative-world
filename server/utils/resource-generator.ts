import { createNoise2D } from 'simplex-noise';
import { v4 as uuidv4 } from 'uuid';
import { RESOURCE_CONFIGS } from '~/config/resources.config';
import {
  generateTerrainType,
  getTerrainNoiseValues,
  generateChunkTerrain,
} from '~~/server/utils/terrain-generator';
import { getCacheService } from '~~/server/services/CacheService';
import { getStorageService } from '~~/server/services/StorageService';
import { db } from '~~/server/database/connection';
import { resourceVeins } from '~~/server/database/schema';
import { sql } from 'drizzle-orm';
import type {
  ResourceVein,
  ResourceType,
  ResourceGrade,
  ClimateType,
  EnvironmentalHazard,
  ChunkData,
} from '#shared/types/world';
import {
  ResourceGrade as ResourceGradeEnum,
  ClimateType as ClimateTypeEnum,
  EnvironmentalHazard as EnvironmentalHazardEnum,
  ScanLevel as ScanLevelEnum,
} from '#shared/types/world';
import { isValidUUID } from '#shared/index';

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
 * Persists a resource vein to the database with PostGIS spatial data
 */
async function persistResourceVeinToDatabase(vein: ResourceVein, worldId: string): Promise<void> {
  const { worldX, worldY } = vein.location;
  const { size, richness, depth } = vein.deposit;
  const { purity } = vein.quality;

  const extractionRadius = Math.sqrt(size) * 10;

  const centerPoint = sql`ST_SetSRID(ST_MakePoint(${worldX}, ${worldY}), 4326)`;
  const extractionArea = sql`ST_SetSRID(ST_Buffer(ST_MakePoint(${worldX}, ${worldY}), ${extractionRadius}), 4326)`;

  try {
    await db.insert(resourceVeins).values({
      worldId,
      resourceType: vein.type,
      centerX: worldX,
      centerY: worldY,
      radius: extractionRadius,
      centerPoint,
      extractionArea,
      density: richness,
      quality: purity,
      depth,
      isExhausted: false,
      extractedAmount: vein.extraction.totalExtracted,
    });
  } catch (error) {
    console.error(`Failed to persist resource vein ${vein.id}:`, error);
    // Don't throw - resource generation should continue even if DB fails
  }
}
/**
 * Ensures resource veins exist in database for chunks required by a spatial query.
 * This implements the "lazy persistence" pattern - veins are generated and saved
 * to the database only when first needed for queries.
 */
export async function ensureChunksHavePersistedVeins(
  chunksToCheck: Array<{ chunkX: number; chunkY: number }>,
  worldId: string,
  chunkSize: number = 16,
): Promise<void> {
  if (!worldId || !isValidUUID(worldId)) {
    console.warn('⚠️ [PERSISTENCE] Invalid worldId provided, skipping vein persistence');
    return;
  }

  try {
    const chunkEnvelopes = chunksToCheck.map(({ chunkX, chunkY }) => {
      const minX = chunkX * chunkSize;
      const maxX = (chunkX + 1) * chunkSize - 1;
      const minY = chunkY * chunkSize;
      const maxY = (chunkY + 1) * chunkSize - 1;
      return { chunkX, chunkY, minX, maxX, minY, maxY };
    });

    const existingVeinsPerChunk = await Promise.all(
      chunkEnvelopes.map(async ({ chunkX, chunkY, minX, maxX, minY, maxY }) => {
        const count = await db
          .select({ count: sql<number>`count(*)` })
          .from(resourceVeins)
          .where(
            sql`${resourceVeins.worldId} = ${worldId}
                AND ${resourceVeins.centerX} >= ${minX}
                AND ${resourceVeins.centerX} <= ${maxX}
                AND ${resourceVeins.centerY} >= ${minY}
                AND ${resourceVeins.centerY} <= ${maxY}`,
          );
        return { chunkX, chunkY, hasVeins: count[0].count > 0 };
      }),
    );

    // Persist veins for chunks that don't have any in the database
    const chunksNeedingVeins = existingVeinsPerChunk
      .filter(({ hasVeins }) => !hasVeins)
      .map(({ chunkX, chunkY }) => ({ chunkX, chunkY }));

    if (chunksNeedingVeins.length > 0) {
      console.log(
        `📍 [PERSISTENCE] Generating and persisting veins for ${chunksNeedingVeins.length} chunks in world ${worldId}`,
      );

      await Promise.all(
        chunksNeedingVeins.map(({ chunkX, chunkY }) =>
          generateAndPersistChunkResources(chunkX, chunkY, chunkSize, worldId),
        ),
      );

      console.log(
        `✅ [PERSISTENCE] Successfully persisted veins for chunks: ${chunksNeedingVeins.map((c) => `(${c.chunkX},${c.chunkY})`).join(', ')}`,
      );
    }
  } catch (error) {
    console.error('❌ [PERSISTENCE] Failed to ensure chunks have persisted veins:', error);
    // Don't throw - spatial queries should continue even if persistence fails
  }
}

/**
 * Generates and persists resource veins for a chunk to the database
 */
export async function generateAndPersistChunkResources(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
  worldId: string = 'default',
): Promise<ResourceVein[]> {
  const resources = generateChunkResources(chunkX, chunkY, chunkSize);

  // Persist all resource veins to database in parallel
  await Promise.allSettled(resources.map((vein) => persistResourceVeinToDatabase(vein, worldId)));

  return resources;
}

export function generateChunkResources(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
): ResourceVein[] {
  const resources: ResourceVein[] = [];

  const resourceTypes = Object.keys(RESOURCE_CONFIGS) as ResourceType[];

  for (let cellY = 0; cellY < chunkSize; cellY++) {
    for (let cellX = 0; cellX < chunkSize; cellX++) {
      const worldX = chunkX * chunkSize + cellX;
      const worldY = chunkY * chunkSize + cellY;

      const densityValue = resourceDensityNoise(
        worldX * RESOURCE_GENERATION_CONFIG.DENSITY_NOISE_SCALE,
        worldY * RESOURCE_GENERATION_CONFIG.DENSITY_NOISE_SCALE,
      );

      if (densityValue < RESOURCE_GENERATION_CONFIG.DENSITY_THRESHOLD) {
        continue;
      }

      const resourceType = selectResourceType(worldX, worldY, resourceTypes);
      if (!resourceType) {
        continue;
      }

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
  _densityValue: number,
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
  const terrain = generateTerrainType(worldX, worldY);
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
 * Generate climate type based on world coordinates
 */
function generateClimate(worldX: number, worldY: number): ClimateType {
  const noiseValues = getTerrainNoiseValues(worldX, worldY);

  const latitudelike = Math.abs(worldY % 1000) / 1000;
  const temperatureModifier = noiseValues.temperature;

  if (latitudelike < 0.2 || temperatureModifier < -0.3) return ClimateTypeEnum.ARCTIC;
  if (latitudelike < 0.4) return ClimateTypeEnum.TEMPERATE;
  if (latitudelike < 0.6 && temperatureModifier > 0.1) return ClimateTypeEnum.TROPICAL;
  if (latitudelike < 0.8 || noiseValues.moisture < -0.2) return ClimateTypeEnum.ARID;
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

/**
 * Orchestrate the new persistence flow: Cache -> Storage -> Generate
 *
 * This function implements the new multi-tiered architecture:
 * 1. Request chunk from CacheService (Redis). If found, return it.
 * 2. If not in cache, request chunk from StorageService (MinIO). If found, return it AND asynchronously add it to the Redis cache.
 * 3. If not in storage, generate the chunk procedurally.
 * 4. Asynchronously save the newly generated chunk to BOTH the StorageService (for persistence) and the CacheService (for subsequent requests).
 */
export async function generateOrLoadChunk(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
  worldId: string = 'default',
): Promise<ChunkData> {
  const cacheService = getCacheService();
  const storageService = getStorageService();

  try {
    // Step 1: Check Redis cache first
    const cachedChunk = await cacheService.getChunk(worldId, chunkX, chunkY);

    if (cachedChunk) {
      return cachedChunk;
    }

    // Step 2: Check MinIO storage if not in cache
    const storedChunk = await storageService.getChunk(worldId, chunkX, chunkY);

    if (storedChunk) {
      // Asynchronously cache the chunk in Redis for future requests
      setImmediate(async () => {
        try {
          await cacheService.setChunk(worldId, chunkX, chunkY, storedChunk);
        } catch (error) {
          console.error(
            `❌ [CACHE WRITE ERROR] Failed to cache chunk (${chunkX}, ${chunkY}):`,
            error,
          );
        }
      });

      return storedChunk;
    }

    // Step 3: Generate chunk procedurally if not found anywhere
    const terrain = generateChunkTerrain(chunkX, chunkY, chunkSize);
    const resources = generateChunkResources(chunkX, chunkY, chunkSize);

    const chunkData: ChunkData = {
      coordinate: { chunkX, chunkY },
      terrain,
      resources,
      size: chunkSize,
      timestamp: new Date().toISOString(),
      metadata: {
        version: '3.0.0',
        generationMethod: 'multi_layer_noise',
        seed: Math.floor(chunkX * 1000 + chunkY),
      },
    };

    // Step 4: Asynchronously save to both storage and cache
    setImmediate(async () => {
      try {
        // Save to MinIO storage for persistence
        await storageService.saveChunk(worldId, chunkX, chunkY, chunkData);

        // Save to Redis cache for subsequent requests
        await cacheService.setChunk(worldId, chunkX, chunkY, chunkData);
      } catch (error) {
        console.error(`❌ [PERSISTENCE ERROR] Failed to save chunk (${chunkX}, ${chunkY}):`, error);
      }
    });

    return chunkData;
  } catch (error) {
    // Fallback to generation-only if entire persistence layer fails
    console.error(
      `❌ [PERSISTENCE ERROR] Full persistence failure for chunk (${chunkX}, ${chunkY}):`,
      error,
    );
    console.log(
      `🔄 [FALLBACK] Falling back to generation-only mode for chunk (${chunkX}, ${chunkY})`,
    );

    const terrain = generateChunkTerrain(chunkX, chunkY, chunkSize);
    const resources = generateChunkResources(chunkX, chunkY, chunkSize);

    return {
      coordinate: { chunkX, chunkY },
      terrain,
      resources,
      size: chunkSize,
      timestamp: new Date().toISOString(),
      metadata: {
        version: '3.0.0',
        generationMethod: 'multi_layer_noise_fallback',
        seed: Math.floor(chunkX * 1000 + chunkY),
      },
    };
  }
}
