import { ExtendedTerrainType } from '~/types/world';
import { TERRAIN_CONFIGS } from '~/config/terrain.config';

export function isValidTerrainType(value: string): value is ExtendedTerrainType {
  return Object.values(ExtendedTerrainType).includes(value as ExtendedTerrainType);
}

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

export function isWaterTerrain(terrainType: ExtendedTerrainType): boolean {
  return terrainType === ExtendedTerrainType.OCEAN || terrainType === ExtendedTerrainType.SWAMP;
}

export function isTraversableTerrain(terrainType: ExtendedTerrainType): boolean {
  const config = getTerrainConfigSafe(terrainType);
  return config.traversal.difficulty < 0.8;
}

export function getMovementSpeed(terrainType: ExtendedTerrainType): number {
  return getTerrainConfigSafe(terrainType).traversal.speedModifier;
}

export function isValidTerrainGrid(grid: unknown): grid is ExtendedTerrainType[][] {
  if (!Array.isArray(grid)) return false;

  for (const row of grid) {
    if (!Array.isArray(row)) return false;
    for (const cell of row) {
      if (typeof cell !== 'string' || !isValidTerrainType(cell)) {
        return false;
      }
    }
  }

  return true;
}

export function analyzeTerrainDistribution(grid: ExtendedTerrainType[][]) {
  if (!grid.length || !grid[0]?.length) {
    throw new Error('Invalid terrain grid: empty or malformed');
  }

  const counts: Record<ExtendedTerrainType, number> = {} as Record<ExtendedTerrainType, number>;
  const total = grid.length * grid[0].length;

  // Initialize counts
  for (const terrainType of Object.values(ExtendedTerrainType)) {
    counts[terrainType] = 0;
  }

  // Count occurrences
  for (const row of grid) {
    for (const cell of row) {
      counts[cell]++;
    }
  }

  const percentages: Record<ExtendedTerrainType, number> = {} as Record<
    ExtendedTerrainType,
    number
  >;
  for (const [terrainType, count] of Object.entries(counts)) {
    percentages[terrainType as ExtendedTerrainType] = (count / total) * 100;
  }

  return {
    counts,
    percentages,
    total,
    dominantTerrain: Object.entries(counts).reduce((a, b) =>
      counts[a[0] as ExtendedTerrainType] > counts[b[0] as ExtendedTerrainType] ? a : b,
    )[0] as ExtendedTerrainType,
  };
}

export function getTerrainSummary(grid: ExtendedTerrainType[][]): string {
  if (!grid.length || !grid[0]?.length) {
    return 'Empty terrain grid';
  }

  const analysis = analyzeTerrainDistribution(grid);
  const topTerrain = Object.entries(analysis.percentages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type, pct]) => `${type}: ${pct.toFixed(1)}%`)
    .join(', ');

  return `${grid.length}x${grid[0].length} terrain grid. Top types: ${topTerrain}`;
}
