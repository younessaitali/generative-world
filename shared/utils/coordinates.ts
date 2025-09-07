import type { ChunkCoordinate } from '../types/world';

export interface WorldCoordinate {
  x: number;
  y: number;
}

export interface CellCoordinate {
  cellX: number;
  cellY: number;
}

export interface FullCoordinate extends WorldCoordinate, ChunkCoordinate, CellCoordinate {}

export const COORDINATE_PRECISION = 3; // 0.001 precision
export const COORDINATE_TOLERANCE = 0.001;
export const MIN_RESOURCE_DISTANCE = 0.5; // Minimum distance between resources
export const COORDINATE_BOUNDS = {
  min: -1000000,
  max: 1000000,
} as const;

// Normalizes a world coordinate to fixed precision (3 decimal places)
// This prevents floating-point precision errors that can cause duplicates
export function normalizeWorldCoordinate(value: number): number {
  return (
    Math.round(value * Math.pow(10, COORDINATE_PRECISION)) / Math.pow(10, COORDINATE_PRECISION)
  );
}

export function normalizeWorldCoordinates(x: number, y: number): WorldCoordinate {
  return {
    x: normalizeWorldCoordinate(x),
    y: normalizeWorldCoordinate(y),
  };
}

// Converts world coordinates to chunk coordinates
// Handles negative coordinates correctly using Math.floor
export function worldToChunk(worldX: number, worldY: number, chunkSize: number): ChunkCoordinate {
  const normalizedX = normalizeWorldCoordinate(worldX);
  const normalizedY = normalizeWorldCoordinate(worldY);

  return {
    chunkX: Math.floor(normalizedX / chunkSize),
    chunkY: Math.floor(normalizedY / chunkSize),
  };
}

export function chunkToWorld(chunkX: number, chunkY: number, chunkSize: number): WorldCoordinate {
  return {
    x: chunkX * chunkSize,
    y: chunkY * chunkSize,
  };
}

// Converts world coordinates to cell coordinates within a chunk
// Handles negative coordinates correctly with proper modulo operation
export function worldToCell(worldX: number, worldY: number, chunkSize: number): CellCoordinate {
  const normalizedX = normalizeWorldCoordinate(worldX);
  const normalizedY = normalizeWorldCoordinate(worldY);

  return {
    cellX: ((normalizedX % chunkSize) + chunkSize) % chunkSize,
    cellY: ((normalizedY % chunkSize) + chunkSize) % chunkSize,
  };
}

export function worldToFullCoordinate(
  worldX: number,
  worldY: number,
  chunkSize: number,
): FullCoordinate {
  const normalized = normalizeWorldCoordinates(worldX, worldY);
  const chunk = worldToChunk(normalized.x, normalized.y, chunkSize);
  const cell = worldToCell(normalized.x, normalized.y, chunkSize);

  return {
    x: normalized.x,
    y: normalized.y,
    chunkX: chunk.chunkX,
    chunkY: chunk.chunkY,
    cellX: cell.cellX,
    cellY: cell.cellY,
  };
}

export function validateCoordinates(x: number, y: number): boolean {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= COORDINATE_BOUNDS.min &&
    x <= COORDINATE_BOUNDS.max &&
    y >= COORDINATE_BOUNDS.min &&
    y <= COORDINATE_BOUNDS.max
  );
}

export function assertValidCoordinates(x: number, y: number): void {
  if (!validateCoordinates(x, y)) {
    throw new Error(
      `Invalid coordinates: x=${x}, y=${y}. Coordinates must be finite numbers between ${COORDINATE_BOUNDS.min} and ${COORDINATE_BOUNDS.max}.`,
    );
  }
}

export function coordinatesEqual(
  coord1: WorldCoordinate,
  coord2: WorldCoordinate,
  tolerance: number = COORDINATE_TOLERANCE,
): boolean {
  return Math.abs(coord1.x - coord2.x) <= tolerance && Math.abs(coord1.y - coord2.y) <= tolerance;
}

export function calculateDistance(coord1: WorldCoordinate, coord2: WorldCoordinate): number {
  const dx = coord1.x - coord2.x;
  const dy = coord1.y - coord2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isWithinMinResourceDistance(
  coord1: WorldCoordinate,
  coord2: WorldCoordinate,
  minDistance: number = MIN_RESOURCE_DISTANCE,
): boolean {
  return calculateDistance(coord1, coord2) < minDistance;
}

export function getChunksInRadius(
  centerX: number,
  centerY: number,
  radius: number,
  chunkSize: number,
): ChunkCoordinate[] {
  const normalizedCenter = normalizeWorldCoordinates(centerX, centerY);

  const minChunkX = Math.floor((normalizedCenter.x - radius) / chunkSize);
  const maxChunkX = Math.floor((normalizedCenter.x + radius) / chunkSize);
  const minChunkY = Math.floor((normalizedCenter.y - radius) / chunkSize);
  const maxChunkY = Math.floor((normalizedCenter.y + radius) / chunkSize);

  const chunks: ChunkCoordinate[] = [];
  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      chunks.push({ chunkX, chunkY });
    }
  }
  return chunks;
}

export function snapToGrid(x: number, y: number, gridSize: number): WorldCoordinate {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

export function coordinateHash(x: number, y: number): string {
  const normalized = normalizeWorldCoordinates(x, y);
  return `${normalized.x},${normalized.y}`;
}

export function parseCoordinateHash(hash: string): WorldCoordinate {
  const [xStr, yStr] = hash.split(',');
  const x = Number(xStr);
  const y = Number(yStr);

  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`Invalid coordinate hash: ${hash}`);
  }

  return { x, y };
}

export function deduplicateCoordinates(
  coordinates: WorldCoordinate[],
  tolerance: number = COORDINATE_TOLERANCE,
): WorldCoordinate[] {
  const result: WorldCoordinate[] = [];

  for (const coord of coordinates) {
    const normalized = normalizeWorldCoordinates(coord.x, coord.y);
    const isDuplicate = result.some((existing) =>
      coordinatesEqual(normalized, existing, tolerance),
    );

    if (!isDuplicate) {
      result.push(normalized);
    }
  }

  return result;
}

export function validateResourcePosition(
  newPosition: WorldCoordinate,
  existingPositions: WorldCoordinate[],
  minDistance: number = MIN_RESOURCE_DISTANCE,
): boolean {
  const normalized = normalizeWorldCoordinates(newPosition.x, newPosition.y);

  return !existingPositions.some((existing) =>
    isWithinMinResourceDistance(normalized, existing, minDistance),
  );
}

export function generateChunkResourcePositions(
  chunkX: number,
  chunkY: number,
  chunkSize: number,
  maxResources: number,
  minDistance: number = MIN_RESOURCE_DISTANCE,
): WorldCoordinate[] {
  const chunkOrigin = chunkToWorld(chunkX, chunkY, chunkSize);
  const positions: WorldCoordinate[] = [];
  const maxAttempts = maxResources * 10; // Prevent infinite loops

  let attempts = 0;
  while (positions.length < maxResources && attempts < maxAttempts) {
    const randomX = chunkOrigin.x + Math.random() * chunkSize;
    const randomY = chunkOrigin.y + Math.random() * chunkSize;
    const position = normalizeWorldCoordinates(randomX, randomY);

    if (validateResourcePosition(position, positions, minDistance)) {
      positions.push(position);
    }

    attempts++;
  }

  return positions;
}
