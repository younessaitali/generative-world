import type { ChunkCoordinate, WorldConfig, TerrainGrid, ResourceVein } from '~/types/world';

export interface ChunkWithResources {
  terrain: TerrainGrid;
  resources: ResourceVein[];
}

export function useWorldChunks(config: WorldConfig) {
  const chunks = ref(new Map<string, ChunkWithResources>());

  const getChunkKey = (coordinate: ChunkCoordinate): string => {
    return `${coordinate.chunkX},${coordinate.chunkY}`;
  };

  const worldToChunk = (worldX: number, worldY: number): ChunkCoordinate => {
    return {
      chunkX: Math.floor(worldX / (config.chunkSize * config.cellSize)),
      chunkY: Math.floor(worldY / (config.chunkSize * config.cellSize)),
    };
  };

  const chunkToWorld = (coordinate: ChunkCoordinate) => {
    return {
      x: coordinate.chunkX * config.chunkSize * config.cellSize,
      y: coordinate.chunkY * config.chunkSize * config.cellSize,
    };
  };

  const calculateVisibleChunks = (
    leftWorld: number,
    topWorld: number,
    rightWorld: number,
    bottomWorld: number,
    padding = 1,
  ): ChunkCoordinate[] => {
    const topLeftChunk = worldToChunk(leftWorld, topWorld);
    const bottomRightChunk = worldToChunk(rightWorld, bottomWorld);

    const minChunkX = topLeftChunk.chunkX - padding;
    const maxChunkX = bottomRightChunk.chunkX + padding;
    const minChunkY = topLeftChunk.chunkY - padding;
    const maxChunkY = bottomRightChunk.chunkY + padding;

    const visibleChunks: ChunkCoordinate[] = [];

    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
        visibleChunks.push({ chunkX, chunkY });
      }
    }

    return visibleChunks;
  };

  const getVisibleChunksForViewport = (
    viewportBounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    },
    padding = 1,
  ): ChunkCoordinate[] => {
    return calculateVisibleChunks(
      viewportBounds.left,
      viewportBounds.top,
      viewportBounds.right,
      viewportBounds.bottom,
      padding,
    );
  };

  const isChunkLoaded = (coordinate: ChunkCoordinate): boolean => {
    const chunkKey = getChunkKey(coordinate);
    return chunks.value.has(chunkKey);
  };

  const getChunk = (coordinate: ChunkCoordinate): ChunkWithResources | undefined => {
    const chunkKey = getChunkKey(coordinate);
    return chunks.value.get(chunkKey);
  };

  const getChunkTerrain = (coordinate: ChunkCoordinate): TerrainGrid | undefined => {
    const chunkKey = getChunkKey(coordinate);
    const chunk = chunks.value.get(chunkKey);
    return chunk?.terrain;
  };

  const getChunkResources = (coordinate: ChunkCoordinate): ResourceVein[] => {
    const chunkKey = getChunkKey(coordinate);
    const chunk = chunks.value.get(chunkKey);
    return chunk?.resources || [];
  };

  const setChunk = (
    coordinate: ChunkCoordinate,
    terrain: TerrainGrid,
    resources: ResourceVein[] = [],
  ) => {
    const chunkKey = getChunkKey(coordinate);
    chunks.value.set(chunkKey, { terrain, resources });
  };

  const removeChunk = (coordinate: ChunkCoordinate) => {
    const chunkKey = getChunkKey(coordinate);
    chunks.value.delete(chunkKey);
  };

  const getUnloadedChunks = (coordinates: ChunkCoordinate[]): ChunkCoordinate[] => {
    return coordinates.filter((coord) => !isChunkLoaded(coord));
  };

  const sortChunksByDistance = (
    coordinates: ChunkCoordinate[],
    centerX: number,
    centerY: number,
  ): ChunkCoordinate[] => {
    const centerChunk = worldToChunk(centerX, centerY);

    return [...coordinates].sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.chunkX - centerChunk.chunkX, 2) + Math.pow(a.chunkY - centerChunk.chunkY, 2),
      );
      const distB = Math.sqrt(
        Math.pow(b.chunkX - centerChunk.chunkX, 2) + Math.pow(b.chunkY - centerChunk.chunkY, 2),
      );
      return distA - distB;
    });
  };

  const clearChunks = () => {
    chunks.value.clear();
  };

  const getChunkStats = () => {
    return {
      totalChunks: chunks.value.size,
      chunkKeys: Array.from(chunks.value.keys()),
    };
  };

  return {
    chunks: readonly(chunks),
    getChunkKey,
    worldToChunk,
    chunkToWorld,
    calculateVisibleChunks,
    getVisibleChunksForViewport,
    isChunkLoaded,
    getChunk,
    getChunkTerrain,
    getChunkResources,
    setChunk,
    removeChunk,
    getUnloadedChunks,
    sortChunksByDistance,
    clearChunks,
    getChunkStats,
  };
}
