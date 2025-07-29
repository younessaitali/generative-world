import { ResourceType } from '~/types/world';

/**
 * Resource color mapping for visual differentiation
 * Colors are chosen to be visually distinct and somewhat represent real-world colors
 */
export const RESOURCE_COLORS: Record<ResourceType, number> = {
  // Common Metals - Various metallic colors
  [ResourceType.IRON]: 0x8c7853, // Dark brown/rust
  [ResourceType.COPPER]: 0xb87333, // Copper brown
  [ResourceType.ALUMINUM]: 0xc0c0c0, // Silver gray
  [ResourceType.ZINC]: 0x7f7f7f, // Dark gray
  [ResourceType.LEAD]: 0x2e3a46, // Dark blue-gray
  [ResourceType.TIN]: 0xe8e8e8, // Light gray

  // Precious Metals - Golden/shiny colors
  [ResourceType.GOLD]: 0xffd700, // Gold
  [ResourceType.SILVER]: 0xc0c0c0, // Silver
  [ResourceType.PLATINUM]: 0xe5e4e2, // Platinum
  [ResourceType.PALLADIUM]: 0xced0dd, // Palladium

  // Industrial Metals - Distinct colors
  [ResourceType.NICKEL]: 0x8a8a8a, // Medium gray
  [ResourceType.COBALT]: 0x0066cc, // Blue
  [ResourceType.CHROMIUM]: 0x808080, // Gray
  [ResourceType.MANGANESE]: 0x9c7c38, // Bronze
  [ResourceType.MOLYBDENUM]: 0x54626f, // Blue-gray
  [ResourceType.TUNGSTEN]: 0x36454f, // Dark gray-blue
  [ResourceType.TITANIUM]: 0xddd9d0, // Light gray

  // Rare Earth Elements - Bright/exotic colors
  [ResourceType.LITHIUM]: 0xff69b4, // Hot pink
  [ResourceType.NEODYMIUM]: 0xda70d6, // Orchid
  [ResourceType.CERIUM]: 0xffa500, // Orange
  [ResourceType.YTTRIUM]: 0x9370db, // Medium purple
  [ResourceType.SCANDIUM]: 0x00ced1, // Dark turquoise

  // Energy Resources - Glowing colors
  [ResourceType.URANIUM]: 0x32cd32, // Lime green (radioactive)
  [ResourceType.THORIUM]: 0x00ff7f, // Spring green

  // Industrial Minerals - Earth tones
  [ResourceType.QUARTZ]: 0xffffff, // White
  [ResourceType.GRAPHITE]: 0x36454f, // Dark slate gray
  [ResourceType.DIAMOND]: 0xb9f2ff, // Light blue
  [ResourceType.BERYLLIUM]: 0x98fb98, // Pale green

  // Composite Deposits - Mixed colors
  [ResourceType.POLYMETALLIC]: 0x483d8b, // Dark slate blue
  [ResourceType.RARE_EARTH_COMPLEX]: 0xff1493, // Deep pink
};

/**
 * Get the color for a resource type
 */
export function getResourceColor(type: ResourceType): number {
  return RESOURCE_COLORS[type] || 0xff00ff; // Fallback to magenta
}

/**
 * Get a hex string representation of the resource color
 */
export function getResourceColorHex(type: ResourceType): string {
  const color = getResourceColor(type);
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Get resource color with opacity
 */
export function getResourceColorWithOpacity(type: ResourceType, opacity: number = 0.8): number {
  const baseColor = getResourceColor(type);
  const alpha = Math.floor(opacity * 255);
  return (alpha << 24) | baseColor;
}

/**
 * Get a darker variant of the resource color for borders/outlines
 */
export function getResourceColorDark(type: ResourceType): number {
  const baseColor = getResourceColor(type);
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;

  // Darken by 30%
  const factor = 0.7;
  const newR = Math.floor(r * factor);
  const newG = Math.floor(g * factor);
  const newB = Math.floor(b * factor);

  return (newR << 16) | (newG << 8) | newB;
}

/**
 * Resource color categories for UI grouping
 */
export const RESOURCE_COLOR_CATEGORIES = {
  common: [ResourceType.IRON, ResourceType.COPPER, ResourceType.ALUMINUM, ResourceType.ZINC],
  precious: [ResourceType.GOLD, ResourceType.SILVER, ResourceType.PLATINUM, ResourceType.PALLADIUM],
  industrial: [
    ResourceType.NICKEL,
    ResourceType.COBALT,
    ResourceType.CHROMIUM,
    ResourceType.MANGANESE,
  ],
  rare: [ResourceType.LITHIUM, ResourceType.NEODYMIUM, ResourceType.CERIUM, ResourceType.YTTRIUM],
  energy: [ResourceType.URANIUM, ResourceType.THORIUM],
  minerals: [ResourceType.QUARTZ, ResourceType.GRAPHITE, ResourceType.DIAMOND],
};
