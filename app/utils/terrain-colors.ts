import { ExtendedTerrainType } from '#shared/types/world';

/**
 * Terrain Color Palette
 *
 * Strategic color palette designed for optimal terrain visualization in strategy games.
 * Colors are chosen for clarity, accessibility, and visual appeal in both light and dark themes.
 */

export const TERRAIN_HEX_COLORS = {
  [ExtendedTerrainType.OCEAN]: '#1a5490',
  [ExtendedTerrainType.PLAINS]: '#7c9c5e',
  [ExtendedTerrainType.HILLS]: '#8b7355',
  [ExtendedTerrainType.MOUNTAINS]: '#6b6b6b',
  [ExtendedTerrainType.DESERT]: '#d4a76a',
  [ExtendedTerrainType.FOREST]: '#2d5016',
  [ExtendedTerrainType.SWAMP]: '#4a5d3a',
  [ExtendedTerrainType.TUNDRA]: '#b8c5d1',
} as const;

export const TERRAIN_COLORS: Record<ExtendedTerrainType, number> = {
  [ExtendedTerrainType.OCEAN]: 0x1a5490,
  [ExtendedTerrainType.PLAINS]: 0x7c9c5e,
  [ExtendedTerrainType.HILLS]: 0x8b7355,
  [ExtendedTerrainType.MOUNTAINS]: 0x6b6b6b,
  [ExtendedTerrainType.DESERT]: 0xd4a76a,
  [ExtendedTerrainType.FOREST]: 0x2d5016,
  [ExtendedTerrainType.SWAMP]: 0x4a5d3a,
  [ExtendedTerrainType.TUNDRA]: 0xb8c5d1,
} as const;

export const TERRAIN_RGB_COLORS = {
  [ExtendedTerrainType.OCEAN]: { r: 26, g: 84, b: 144 },
  [ExtendedTerrainType.PLAINS]: { r: 124, g: 156, b: 94 },
  [ExtendedTerrainType.HILLS]: { r: 139, g: 115, b: 85 },
  [ExtendedTerrainType.MOUNTAINS]: { r: 107, g: 107, b: 107 },
  [ExtendedTerrainType.DESERT]: { r: 212, g: 167, b: 106 },
  [ExtendedTerrainType.FOREST]: { r: 45, g: 80, b: 22 },
  [ExtendedTerrainType.SWAMP]: { r: 74, g: 93, b: 58 },
  [ExtendedTerrainType.TUNDRA]: { r: 184, g: 197, b: 209 },
} as const;

/**
 * Get terrain color as hex string
 */
export function getTerrainHexColor(terrainType: ExtendedTerrainType): string {
  return TERRAIN_HEX_COLORS[terrainType];
}

/**
 * Get terrain color as PixiJS-compatible number
 */
export function getTerrainPixiColor(terrainType: ExtendedTerrainType): number {
  return TERRAIN_COLORS[terrainType];
}

/**
 * Get terrain color as RGB object
 */
export function getTerrainRGBColor(terrainType: ExtendedTerrainType): {
  r: number;
  g: number;
  b: number;
} {
  return TERRAIN_RGB_COLORS[terrainType];
}

/**
 * Get terrain color as CSS RGB string
 */
export function getTerrainCSSColor(terrainType: ExtendedTerrainType): string {
  const { r, g, b } = TERRAIN_RGB_COLORS[terrainType];
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert hex color to PixiJS number format
 */
export function hexToPixi(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Convert PixiJS number color to hex string
 */
export function pixiToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Get all terrain colors as an array for visualization
 */
export function getAllTerrainColors(): Array<{
  type: ExtendedTerrainType;
  hex: string;
  pixi: number;
}> {
  return Object.values(ExtendedTerrainType).map((type) => ({
    type,
    hex: TERRAIN_HEX_COLORS[type],
    pixi: TERRAIN_COLORS[type],
  }));
}

/**
 * Get darkened terrain color for border effects (terrain blending)
 * Darkens the color by the specified factor for visual edge detection
 */
export function getTerrainPixiColorDarkened(
  terrainType: ExtendedTerrainType,
  darkenFactor = 0.7,
): number {
  const { r, g, b } = TERRAIN_RGB_COLORS[terrainType];
  const darkenedR = Math.floor(r * darkenFactor);
  const darkenedG = Math.floor(g * darkenFactor);
  const darkenedB = Math.floor(b * darkenFactor);

  return (darkenedR << 16) | (darkenedG << 8) | darkenedB;
}

/**
 * Get darkened terrain color as hex string for border effects
 */
export function getTerrainHexColorDarkened(
  terrainType: ExtendedTerrainType,
  darkenFactor = 0.7,
): string {
  const { r, g, b } = TERRAIN_RGB_COLORS[terrainType];
  const darkenedR = Math.floor(r * darkenFactor);
  const darkenedG = Math.floor(g * darkenFactor);
  const darkenedB = Math.floor(b * darkenFactor);

  return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
}

/**
 * Validate terrain color accessibility (contrast ratios)
 * Useful for ensuring colors work well in different UI contexts
 */
export function getTerrainColorContrast(
  terrainType: ExtendedTerrainType,
  backgroundColor = '#ffffff',
): number {
  const { r, g, b } = TERRAIN_RGB_COLORS[terrainType];

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const bgBrightness = backgroundColor === '#ffffff' ? 255 : 0;

  return Math.abs(brightness - bgBrightness);
}
