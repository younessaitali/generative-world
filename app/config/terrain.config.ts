import {
  ExtendedTerrainType,
  ClimateType,
  ResourceType,
  type TerrainProperties,
} from '~/types/world';

/**
 * Terrain Configuration System
 *
 * Defines properties and characteristics for each terrain type including:
 * - Visual properties (colors, textures, rendering)
 * - Physical properties (elevation, traversal)
 * - Environmental properties (climate preferences, resource associations)
 * - Gameplay properties (movement modifiers, accessibility)
 */

export const TERRAIN_CONFIGS: Record<ExtendedTerrainType, TerrainProperties> = {
  [ExtendedTerrainType.OCEAN]: {
    type: ExtendedTerrainType.OCEAN,
    baseColor: 0x1a5490, // Strategic ocean blue
    elevation: {
      min: -1.0, // Below sea level
      max: -0.2, // Shallow areas
      variance: 0.3,
    },
    traversal: {
      difficulty: 0.9, // Very difficult to traverse without boats
      speedModifier: 0.1, // Very slow movement
    },
    visual: {
      pattern: 'waves',
      opacity: 1.0,
      animated: true, // Wave animations
    },
    climate: {
      preferredClimates: [ClimateType.TEMPERATE, ClimateType.TROPICAL, ClimateType.ARCTIC],
      temperatureModifier: 0.1, // Moderating temperature effect
      humidityModifier: 0.8, // High humidity
    },
    resources: {
      preferredResources: [ResourceType.IRON, ResourceType.COPPER, ResourceType.NICKEL], // Ocean floor minerals
      resourceDensityModifier: 0.2, // Low mineral density
      accessibilityModifier: 0.1, // Very difficult to access
    },
  },

  [ExtendedTerrainType.PLAINS]: {
    type: ExtendedTerrainType.PLAINS,
    baseColor: 0x7c9c5e, // Natural grassland green
    elevation: {
      min: 0.0, // Sea level
      max: 0.3, // Gentle elevation
      variance: 0.1,
    },
    traversal: {
      difficulty: 0.1, // Very easy to traverse
      speedModifier: 1.0, // Normal movement speed
    },
    visual: {
      pattern: 'grass',
      opacity: 1.0,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.TEMPERATE, ClimateType.ARID],
      temperatureModifier: 0.0, // Neutral temperature
      humidityModifier: 0.0, // Neutral humidity
    },
    resources: {
      preferredResources: [ResourceType.IRON, ResourceType.COPPER, ResourceType.ALUMINUM], // Common surface minerals
      resourceDensityModifier: 0.8, // High accessibility
      accessibilityModifier: 0.9, // Easy to access
    },
  },

  [ExtendedTerrainType.HILLS]: {
    type: ExtendedTerrainType.HILLS,
    baseColor: 0x8b7355, // Earthy hill brown
    elevation: {
      min: 0.2, // Above plains
      max: 0.6, // Moderate elevation
      variance: 0.3,
    },
    traversal: {
      difficulty: 0.3, // Moderate difficulty
      speedModifier: 0.8, // Slightly slower
    },
    visual: {
      pattern: 'rolling',
      opacity: 1.0,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.TEMPERATE, ClimateType.ALPINE],
      temperatureModifier: -0.2, // Slightly cooler
      humidityModifier: 0.1, // Slightly more humid
    },
    resources: {
      preferredResources: [
        ResourceType.IRON,
        ResourceType.GOLD,
        ResourceType.SILVER,
        ResourceType.LEAD,
      ],
      resourceDensityModifier: 1.0, // Normal density
      accessibilityModifier: 0.7, // Moderate accessibility
    },
  },

  [ExtendedTerrainType.MOUNTAINS]: {
    type: ExtendedTerrainType.MOUNTAINS,
    baseColor: 0x6b6b6b, // Rocky mountain gray
    elevation: {
      min: 0.6, // High elevation
      max: 1.0, // Peak elevation
      variance: 0.4,
    },
    traversal: {
      difficulty: 0.8, // Very difficult
      speedModifier: 0.4, // Much slower movement
    },
    visual: {
      pattern: 'rocky',
      opacity: 1.0,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.ALPINE, ClimateType.ARCTIC],
      temperatureModifier: -0.6, // Much cooler
      humidityModifier: -0.2, // Lower humidity
    },
    resources: {
      preferredResources: [
        ResourceType.GOLD,
        ResourceType.PLATINUM,
        ResourceType.TITANIUM,
        ResourceType.RARE_EARTH_COMPLEX,
      ],
      resourceDensityModifier: 1.5, // Higher rare mineral density
      accessibilityModifier: 0.3, // Very difficult to access
    },
  },

  [ExtendedTerrainType.DESERT]: {
    type: ExtendedTerrainType.DESERT,
    baseColor: 0xd4a76a, // Desert sand color
    elevation: {
      min: 0.0, // Variable elevation
      max: 0.4, // Moderate hills
      variance: 0.2,
    },
    traversal: {
      difficulty: 0.6, // Difficult due to sand/heat
      speedModifier: 0.6, // Slower movement
    },
    visual: {
      pattern: 'sand_dunes',
      opacity: 1.0,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.ARID],
      temperatureModifier: 0.7, // Much hotter
      humidityModifier: -0.8, // Very dry
    },
    resources: {
      preferredResources: [
        ResourceType.URANIUM,
        ResourceType.LITHIUM,
        ResourceType.RARE_EARTH_COMPLEX,
        ResourceType.COPPER,
      ],
      resourceDensityModifier: 0.6, // Lower overall density
      accessibilityModifier: 0.5, // Moderate accessibility (heat issues)
    },
  },

  [ExtendedTerrainType.FOREST]: {
    type: ExtendedTerrainType.FOREST,
    baseColor: 0x2d5016, // Deep forest green
    elevation: {
      min: 0.0, // Sea level
      max: 0.5, // Moderate elevation
      variance: 0.2,
    },
    traversal: {
      difficulty: 0.4, // Moderate difficulty due to dense vegetation
      speedModifier: 0.7, // Slower movement
    },
    visual: {
      pattern: 'trees',
      opacity: 1.0,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.TEMPERATE, ClimateType.TROPICAL],
      temperatureModifier: -0.1, // Slightly cooler (shade)
      humidityModifier: 0.6, // Higher humidity
    },
    resources: {
      preferredResources: [
        ResourceType.IRON,
        ResourceType.COPPER,
        ResourceType.GRAPHITE,
        ResourceType.TIN,
      ],
      resourceDensityModifier: 0.7, // Lower mineral density
      accessibilityModifier: 0.6, // Moderate accessibility (vegetation blocking)
    },
  },

  [ExtendedTerrainType.SWAMP]: {
    type: ExtendedTerrainType.SWAMP,
    baseColor: 0x4a5d3a, // Murky swamp green
    elevation: {
      min: -0.1, // Below sea level
      max: 0.2, // Low elevation
      variance: 0.1,
    },
    traversal: {
      difficulty: 0.9, // Very difficult due to mud/water
      speedModifier: 0.3, // Very slow movement
    },
    visual: {
      pattern: 'murky_water',
      opacity: 0.8,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.TROPICAL, ClimateType.TEMPERATE],
      temperatureModifier: 0.2, // Warmer (humidity)
      humidityModifier: 0.9, // Very humid
    },
    resources: {
      preferredResources: [
        ResourceType.IRON,
        ResourceType.NICKEL,
        ResourceType.ALUMINUM,
        ResourceType.ZINC,
      ],
      resourceDensityModifier: 0.4, // Low mineral density
      accessibilityModifier: 0.2, // Very difficult to access
    },
  },

  [ExtendedTerrainType.TUNDRA]: {
    type: ExtendedTerrainType.TUNDRA,
    baseColor: 0xb8c5d1, // Cold tundra blue-gray
    elevation: {
      min: 0.0, // Variable
      max: 0.3, // Generally flat
      variance: 0.1,
    },
    traversal: {
      difficulty: 0.5, // Moderate difficulty (cold, wind)
      speedModifier: 0.7, // Slower due to conditions
    },
    visual: {
      pattern: 'barren',
      opacity: 1.0,
      animated: false,
    },
    climate: {
      preferredClimates: [ClimateType.ARCTIC],
      temperatureModifier: -0.8, // Very cold
      humidityModifier: -0.4, // Dry
    },
    resources: {
      preferredResources: [
        ResourceType.URANIUM,
        ResourceType.RARE_EARTH_COMPLEX,
        ResourceType.DIAMOND,
        ResourceType.PLATINUM,
      ],
      resourceDensityModifier: 0.8, // Good mineral access due to permafrost exposure
      accessibilityModifier: 0.4, // Difficult due to harsh conditions
    },
  },
};

export const TERRAIN_GENERATION_WEIGHTS = {
  [ExtendedTerrainType.OCEAN]: 0.15, // 15% of world surface
  [ExtendedTerrainType.PLAINS]: 0.25, // 25% - most common land type
  [ExtendedTerrainType.HILLS]: 0.2, // 20% - common
  [ExtendedTerrainType.MOUNTAINS]: 0.1, // 10% - less common
  [ExtendedTerrainType.DESERT]: 0.12, // 12% - moderate
  [ExtendedTerrainType.FOREST]: 0.15, // 15% - common
  [ExtendedTerrainType.SWAMP]: 0.05, // 5% - rare
  [ExtendedTerrainType.TUNDRA]: 0.08, // 8% - less common
} as const;

export const TERRAIN_TRANSITIONS: Record<ExtendedTerrainType, ExtendedTerrainType[]> = {
  [ExtendedTerrainType.OCEAN]: [
    ExtendedTerrainType.PLAINS,
    ExtendedTerrainType.SWAMP,
    ExtendedTerrainType.TUNDRA,
  ],
  [ExtendedTerrainType.PLAINS]: [
    ExtendedTerrainType.OCEAN,
    ExtendedTerrainType.HILLS,
    ExtendedTerrainType.FOREST,
    ExtendedTerrainType.DESERT,
    ExtendedTerrainType.SWAMP,
  ],
  [ExtendedTerrainType.HILLS]: [
    ExtendedTerrainType.PLAINS,
    ExtendedTerrainType.MOUNTAINS,
    ExtendedTerrainType.FOREST,
    ExtendedTerrainType.DESERT,
  ],
  [ExtendedTerrainType.MOUNTAINS]: [
    ExtendedTerrainType.HILLS,
    ExtendedTerrainType.TUNDRA,
    ExtendedTerrainType.DESERT,
  ],
  [ExtendedTerrainType.DESERT]: [
    ExtendedTerrainType.PLAINS,
    ExtendedTerrainType.HILLS,
    ExtendedTerrainType.MOUNTAINS,
  ],
  [ExtendedTerrainType.FOREST]: [
    ExtendedTerrainType.PLAINS,
    ExtendedTerrainType.HILLS,
    ExtendedTerrainType.SWAMP,
  ],
  [ExtendedTerrainType.SWAMP]: [
    ExtendedTerrainType.OCEAN,
    ExtendedTerrainType.PLAINS,
    ExtendedTerrainType.FOREST,
  ],
  [ExtendedTerrainType.TUNDRA]: [ExtendedTerrainType.OCEAN, ExtendedTerrainType.MOUNTAINS],
};

export function getTerrainConfig(terrainType: ExtendedTerrainType): TerrainProperties {
  return TERRAIN_CONFIGS[terrainType];
}

export function isValidTerrainTransition(
  from: ExtendedTerrainType,
  to: ExtendedTerrainType,
): boolean {
  return TERRAIN_TRANSITIONS[from].includes(to);
}

export function getTerrainColor(terrainType: ExtendedTerrainType): number {
  return TERRAIN_CONFIGS[terrainType].baseColor;
}

export function isValidTerrainType(value: string): value is ExtendedTerrainType {
  return Object.values(ExtendedTerrainType).includes(value as ExtendedTerrainType);
}
