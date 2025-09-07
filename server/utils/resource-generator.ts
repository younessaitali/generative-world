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
import {
  normalizeWorldCoordinates,
  worldToFullCoordinate,
  validateResourcePosition,
  generateChunkResourcePositions,
  MIN_RESOURCE_DISTANCE,
  type WorldCoordinate,
} from '#shared/utils/coordinates';
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

const resourceDensityNoise = createNoise2D();
const resourceTypeNoise = createNoise2D();
const richnessnoise = createNoise2D();
const sizeNoise = createNoise2D();
const depthNoise = createNoise2D();

const RESOURCE_GENERATION_CONFIG = {
  BASE_RESOURCE_PROBABILITY: 0.15,

  DENSITY_NOISE_SCALE: 0.1,
  TYPE_NOISE_SCALE: 0.08, // Medium scale for resource type clustering
  RICHNESS_NOISE_SCALE: 0.12, // Smaller scale for local variations
  SIZE_NOISE_SCALE: 0.1, // Size variation scale
  DEPTH_NOISE_SCALE: 0.15, // Depth variation scale

  DENSITY_THRESHOLD: 0.2, // Minimum noise value for resource generation
  HIGH_DENSITY_THRESHOLD: 0.6,

  COMMON_MULTIPLIER: 1.5,
  RARE_MULTIPLIER: 0.3,
  ULTRA_RARE_MULTIPLIER: 0.1,
};

/**
 * Persists a resource vein to the database with PostGIS spatial data
 */
async function persistResourceVeinToDatabase(vein: ResourceVein, worldId: string): Promise<void> {
  const { worldX, worldY } = vein.location;
  const { size, richness, depth } = vein.deposit;
  const { purity } = vein.quality;

  const normalizedCoords = normalizeWorldCoordinates(worldX, worldY);
  const extractionRadius = Math.sqrt(size) * 10;

  const centerPoint = sql`ST_SetSRID(ST_MakePoint(${normalizedCoords.x}, ${normalizedCoords.y}), 4326)`;
  const extractionArea = sql`ST_SetSRID(ST_Buffer(ST_MakePoint(${normalizedCoords.x}, ${normalizedCoords.y}), ${extractionRadius}), 4326)`;

  try {
    await db.insert(resourceVeins).values({
      worldId,
      resourceType: vein.type,
      centerX: normalizedCoords.x,
      centerY: normalizedCoords.y,
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
  }
}
const chunkGenerationInProgress = new Map<string, Promise<void>>();
const MAX_CONCURRENT_CHUNK_GENERATIONS = 5;
let activeGenerations = 0;

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

      // Process chunks with concurrency limit and deduplication
      const generationPromises = chunksNeedingVeins.map(({ chunkX, chunkY }) => {
        const chunkKey = `${worldId}:${chunkX}:${chunkY}`;

        if (chunkGenerationInProgress.has(chunkKey)) {
          return chunkGenerationInProgress.get(chunkKey)!;
        }

        const generationPromise = (async () => {
          // Wait for available slot
          while (activeGenerations >= MAX_CONCURRENT_CHUNK_GENERATIONS) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          activeGenerations++;
          try {
            await generateAndPersistChunkResources(chunkX, chunkY, chunkSize, worldId);
          } finally {
            activeGenerations--;
            chunkGenerationInProgress.delete(chunkKey);
          }
        })();

        chunkGenerationInProgress.set(chunkKey, generationPromise);
        return generationPromise;
      });

      await Promise.allSettled(generationPromises);

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

  // Persist all resource veins to database with reduced parallelism to avoid overwhelming connections
  const batchSize = 3;
  for (let i = 0; i < resources.length; i += batchSize) {
    const batch = resources.slice(i, i + batchSize);
    await Promise.allSettled(batch.map((vein) => persistResourceVeinToDatabase(vein, worldId)));
  }

  return resources;
}

export function generateChunkResources(
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16,
): ResourceVein[] {
  const resources: ResourceVein[] = [];
  const resourceTypes = Object.keys(RESOURCE_CONFIGS) as ResourceType[];

  // Pre-generate potential resource positions to prevent overlaps
  const maxResourcesPerChunk = Math.ceil(
    chunkSize * chunkSize * RESOURCE_GENERATION_CONFIG.BASE_RESOURCE_PROBABILITY,
  );
  const candidatePositions = generateChunkResourcePositions(
    chunkX,
    chunkY,
    chunkSize,
    maxResourcesPerChunk,
    MIN_RESOURCE_DISTANCE,
  );

  const existingPositions: WorldCoordinate[] = [];

  for (const position of candidatePositions) {
    const densityValue = resourceDensityNoise(
      position.x * RESOURCE_GENERATION_CONFIG.DENSITY_NOISE_SCALE,
      position.y * RESOURCE_GENERATION_CONFIG.DENSITY_NOISE_SCALE,
    );

    if (densityValue < RESOURCE_GENERATION_CONFIG.DENSITY_THRESHOLD) {
      continue;
    }

    const resourceType = selectResourceType(position.x, position.y, resourceTypes);
    if (!resourceType) {
      continue;
    }

    if (!validateResourcePosition(position, existingPositions, MIN_RESOURCE_DISTANCE)) {
      continue;
    }

    const fullCoords = worldToFullCoordinate(position.x, position.y, chunkSize);
    const resourceVein = generateResourceVein(
      resourceType,
      position.x,
      position.y,
      fullCoords.chunkX,
      fullCoords.chunkY,
      fullCoords.cellX,
      fullCoords.cellY,
      densityValue,
    );

    resources.push(resourceVein);
    existingPositions.push(position);
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

  const weightedResources: Array<{ type: ResourceType; weight: number }> = [];

  for (const type of availableTypes) {
    const config = RESOURCE_CONFIGS[type];
    let weight = config.rarity;

    if (config.rarity >= 0.7) {
      weight *= RESOURCE_GENERATION_CONFIG.COMMON_MULTIPLIER;
    } else if (config.rarity <= 0.1) {
      weight *= RESOURCE_GENERATION_CONFIG.ULTRA_RARE_MULTIPLIER;
    } else if (config.rarity <= 0.3) {
      weight *= RESOURCE_GENERATION_CONFIG.RARE_MULTIPLIER;
    }

    weightedResources.push({ type, weight });
  }

  weightedResources.sort((a, b) => b.weight - a.weight);

  const normalizedNoise = (typeNoise + 1) / 2; // Convert from [-1,1] to [0,1]
  const totalWeight = weightedResources.reduce((sum, item) => sum + item.weight, 0);

  let accumulator = 0;
  const threshold = normalizedNoise * totalWeight;

  for (const item of weightedResources) {
    accumulator += item.weight;
    if (accumulator >= threshold) {
      return item.type;
    }
  }

  return weightedResources[0]?.type || null;
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

  const normalizedCoords = normalizeWorldCoordinates(worldX, worldY);

  const richnessValue = richnessnoise(
    normalizedCoords.x * RESOURCE_GENERATION_CONFIG.RICHNESS_NOISE_SCALE,
    normalizedCoords.y * RESOURCE_GENERATION_CONFIG.RICHNESS_NOISE_SCALE,
  );
  const normalizedRichness = (richnessValue + 1) / 2; // Convert to [0,1]
  const richness = Math.max(0.1, Math.min(1.0, normalizedRichness * config.rarity + 0.2));

  const sizeValue = sizeNoise(
    normalizedCoords.x * RESOURCE_GENERATION_CONFIG.SIZE_NOISE_SCALE,
    normalizedCoords.y * RESOURCE_GENERATION_CONFIG.SIZE_NOISE_SCALE,
  );
  const normalizedSize = (sizeValue + 1) / 2;
  const size = Math.floor(config.minSize + (config.maxSize - config.minSize) * normalizedSize);

  const depthValue = depthNoise(
    normalizedCoords.x * RESOURCE_GENERATION_CONFIG.DEPTH_NOISE_SCALE,
    normalizedCoords.y * RESOURCE_GENERATION_CONFIG.DEPTH_NOISE_SCALE,
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
  const terrain = generateTerrainType(normalizedCoords.x, normalizedCoords.y);
  const climate = generateClimate(normalizedCoords.x, normalizedCoords.y);
  const hazards = generateHazards(resourceType, depth);

  const resourceVein: ResourceVein = {
    id,
    type: resourceType,

    location: {
      worldX: normalizedCoords.x,
      worldY: normalizedCoords.y,
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
      seed: Math.floor(normalizedCoords.x * 1000 + normalizedCoords.y), // Reproducible seed
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
