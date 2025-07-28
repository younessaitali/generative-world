import { ResourceType, FormationType, ProcessingStep, MarketDemand } from '~/types/world';
import type { ResourceConfig } from '~/types/world';

/**
 * Resource Configuration Database
 *
 * Based on real-world geological data and mining economics.
 * Each resource is configured with realistic properties for
 * spawning, extraction, and economic gameplay.
 */
export const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  // ===== COMMON METALS =====

  [ResourceType.IRON]: {
    type: ResourceType.IRON,
    baseValue: 8,
    rarity: 0.85, // Very common
    minSize: 800,
    maxSize: 8000,
    preferredFormations: [FormationType.BIF, FormationType.LATERITE],
    associatedResources: [ResourceType.MANGANESE],
    extractionDifficulty: 1,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Steel production',
      'Construction',
      'Automotive industry',
      'Infrastructure',
      'Machinery',
    ],
  },

  [ResourceType.COPPER]: {
    type: ResourceType.COPPER,
    baseValue: 25,
    rarity: 0.65,
    minSize: 400,
    maxSize: 4000,
    preferredFormations: [FormationType.PORPHYRY, FormationType.VMS],
    associatedResources: [ResourceType.GOLD, ResourceType.SILVER, ResourceType.MOLYBDENUM],
    extractionDifficulty: 2,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Electrical wiring',
      'Electronics',
      'Plumbing',
      'Renewable energy',
      'Electric vehicles',
    ],
  },

  [ResourceType.ALUMINUM]: {
    type: ResourceType.ALUMINUM,
    baseValue: 15,
    rarity: 0.7,
    minSize: 600,
    maxSize: 6000,
    preferredFormations: [FormationType.LATERITE],
    associatedResources: [],
    extractionDifficulty: 3,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.CHEMICAL_PROCESSING],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: ['Aerospace', 'Automotive', 'Packaging', 'Transportation', 'Construction'],
  },

  [ResourceType.ZINC]: {
    type: ResourceType.ZINC,
    baseValue: 20,
    rarity: 0.55,
    minSize: 300,
    maxSize: 3000,
    preferredFormations: [FormationType.SEDEX, FormationType.VMS],
    associatedResources: [ResourceType.LEAD, ResourceType.SILVER],
    extractionDifficulty: 2,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.STABLE,
    realWorldUses: [
      'Galvanizing steel',
      'Alloys',
      'Batteries',
      'Corrosion protection',
      'Die casting',
    ],
  },

  [ResourceType.LEAD]: {
    type: ResourceType.LEAD,
    baseValue: 18,
    rarity: 0.45,
    minSize: 250,
    maxSize: 2500,
    preferredFormations: [FormationType.SEDEX, FormationType.VMS],
    associatedResources: [ResourceType.ZINC, ResourceType.SILVER],
    extractionDifficulty: 2,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.LOW,
    realWorldUses: ['Batteries', 'Radiation shielding', 'Ammunition', 'Pipe work', 'Soldering'],
  },

  [ResourceType.TIN]: {
    type: ResourceType.TIN,
    baseValue: 180,
    rarity: 0.25,
    minSize: 150,
    maxSize: 1500,
    preferredFormations: [FormationType.PLACER, FormationType.GREISEN],
    associatedResources: [ResourceType.TUNGSTEN],
    extractionDifficulty: 3,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.STABLE,
    realWorldUses: ['Soldering', 'Tinplate', 'Bronze alloys', 'Electronics', 'Food packaging'],
  },

  // ===== PRECIOUS METALS =====

  [ResourceType.GOLD]: {
    type: ResourceType.GOLD,
    baseValue: 1800,
    rarity: 0.08,
    minSize: 50,
    maxSize: 800,
    preferredFormations: [FormationType.OROGENIC, FormationType.PLACER, FormationType.EPITHERMAL],
    associatedResources: [ResourceType.SILVER, ResourceType.COPPER],
    extractionDifficulty: 4,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.CYANIDE_LEACH],
    marketDemand: MarketDemand.STABLE,
    realWorldUses: ['Electronics', 'Jewelry', 'Investment', 'Aerospace', 'Medical devices'],
  },

  [ResourceType.SILVER]: {
    type: ResourceType.SILVER,
    baseValue: 450,
    rarity: 0.15,
    minSize: 80,
    maxSize: 1200,
    preferredFormations: [FormationType.EPITHERMAL, FormationType.VMS],
    associatedResources: [ResourceType.GOLD, ResourceType.LEAD, ResourceType.ZINC],
    extractionDifficulty: 4,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: ['Electronics', 'Solar panels', 'Photography', 'Medical equipment', 'Jewelry'],
  },

  [ResourceType.PLATINUM]: {
    type: ResourceType.PLATINUM,
    baseValue: 2200,
    rarity: 0.03,
    minSize: 30,
    maxSize: 400,
    preferredFormations: [FormationType.MAGMATIC_SULFIDE, FormationType.PLACER],
    associatedResources: [ResourceType.PALLADIUM, ResourceType.NICKEL],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: ['Catalysts', 'Jewelry', 'Electronics', 'Medical devices', 'Fuel cells'],
  },

  [ResourceType.PALLADIUM]: {
    type: ResourceType.PALLADIUM,
    baseValue: 1900,
    rarity: 0.04,
    minSize: 35,
    maxSize: 450,
    preferredFormations: [FormationType.MAGMATIC_SULFIDE],
    associatedResources: [ResourceType.PLATINUM, ResourceType.NICKEL],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.EXPLOSIVE,
    realWorldUses: [
      'Automotive catalysts',
      'Electronics',
      'Dentistry',
      'Hydrogen storage',
      'Jewelry',
    ],
  },

  // ===== INDUSTRIAL METALS =====

  [ResourceType.NICKEL]: {
    type: ResourceType.NICKEL,
    baseValue: 140,
    rarity: 0.35,
    minSize: 200,
    maxSize: 2000,
    preferredFormations: [FormationType.MAGMATIC_SULFIDE, FormationType.LATERITE],
    associatedResources: [ResourceType.COPPER, ResourceType.PLATINUM, ResourceType.PALLADIUM],
    extractionDifficulty: 3,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Stainless steel',
      'Batteries',
      'Electric vehicles',
      'Aerospace',
      'Chemical processing',
    ],
  },

  [ResourceType.COBALT]: {
    type: ResourceType.COBALT,
    baseValue: 320,
    rarity: 0.2,
    minSize: 120,
    maxSize: 1200,
    preferredFormations: [FormationType.MAGMATIC_SULFIDE, FormationType.LATERITE],
    associatedResources: [ResourceType.NICKEL, ResourceType.COPPER],
    extractionDifficulty: 4,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.EXPLOSIVE,
    realWorldUses: ['Batteries', 'Electric vehicles', 'Superalloys', 'Magnets', 'Catalysts'],
  },

  [ResourceType.CHROMIUM]: {
    type: ResourceType.CHROMIUM,
    baseValue: 85,
    rarity: 0.4,
    minSize: 300,
    maxSize: 3000,
    preferredFormations: [FormationType.MAGMATIC_SULFIDE],
    associatedResources: [ResourceType.NICKEL],
    extractionDifficulty: 3,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Stainless steel',
      'Chrome plating',
      'Refractories',
      'Pigments',
      'Leather tanning',
    ],
  },

  [ResourceType.MANGANESE]: {
    type: ResourceType.MANGANESE,
    baseValue: 35,
    rarity: 0.5,
    minSize: 400,
    maxSize: 4000,
    preferredFormations: [FormationType.LATERITE, FormationType.BIF],
    associatedResources: [ResourceType.IRON],
    extractionDifficulty: 2,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Steel production',
      'Batteries',
      'Aluminum alloys',
      'Chemical industry',
      'Water treatment',
    ],
  },

  [ResourceType.MOLYBDENUM]: {
    type: ResourceType.MOLYBDENUM,
    baseValue: 280,
    rarity: 0.18,
    minSize: 100,
    maxSize: 1000,
    preferredFormations: [FormationType.PORPHYRY, FormationType.SKARN],
    associatedResources: [ResourceType.COPPER, ResourceType.TUNGSTEN],
    extractionDifficulty: 4,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.STABLE,
    realWorldUses: ['Steel alloys', 'Catalysts', 'Lubricants', 'Electronics', 'Aerospace'],
  },

  [ResourceType.TUNGSTEN]: {
    type: ResourceType.TUNGSTEN,
    baseValue: 550,
    rarity: 0.12,
    minSize: 80,
    maxSize: 800,
    preferredFormations: [FormationType.SKARN, FormationType.GREISEN],
    associatedResources: [ResourceType.MOLYBDENUM, ResourceType.TIN],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: [
      'Tool steel',
      'Light bulb filaments',
      'Electronics',
      'Military applications',
      'X-ray tubes',
    ],
  },

  [ResourceType.TITANIUM]: {
    type: ResourceType.TITANIUM,
    baseValue: 380,
    rarity: 0.25,
    minSize: 150,
    maxSize: 1500,
    preferredFormations: [FormationType.PLACER, FormationType.MAGMATIC_SULFIDE],
    associatedResources: [],
    extractionDifficulty: 5,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.CHEMICAL_PROCESSING],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Aerospace',
      'Medical implants',
      'Marine applications',
      'Automotive',
      'Sports equipment',
    ],
  },

  // ===== RARE EARTH ELEMENTS =====

  [ResourceType.LITHIUM]: {
    type: ResourceType.LITHIUM,
    baseValue: 850,
    rarity: 0.06,
    minSize: 100,
    maxSize: 1000,
    preferredFormations: [FormationType.PEGMATITE],
    associatedResources: [ResourceType.BERYLLIUM, ResourceType.CERIUM],
    extractionDifficulty: 4,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.EXPLOSIVE,
    realWorldUses: [
      'Batteries',
      'Electric vehicles',
      'Ceramics',
      'Glass',
      'Mental health medication',
    ],
  },

  [ResourceType.NEODYMIUM]: {
    type: ResourceType.NEODYMIUM,
    baseValue: 1200,
    rarity: 0.03,
    minSize: 50,
    maxSize: 500,
    preferredFormations: [FormationType.CARBONATITE, FormationType.PLACER],
    associatedResources: [ResourceType.CERIUM, ResourceType.YTTRIUM],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.EXPLOSIVE,
    realWorldUses: [
      'Permanent magnets',
      'Electric motors',
      'Wind turbines',
      'Hard drives',
      'MRI machines',
    ],
  },

  [ResourceType.CERIUM]: {
    type: ResourceType.CERIUM,
    baseValue: 680,
    rarity: 0.04,
    minSize: 60,
    maxSize: 600,
    preferredFormations: [FormationType.CARBONATITE, FormationType.PLACER],
    associatedResources: [ResourceType.NEODYMIUM, ResourceType.YTTRIUM],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: [
      'Catalysts',
      'Glass polishing',
      'Self-cleaning ovens',
      'Arc lighting',
      'Metal alloys',
    ],
  },

  [ResourceType.YTTRIUM]: {
    type: ResourceType.YTTRIUM,
    baseValue: 950,
    rarity: 0.025,
    minSize: 40,
    maxSize: 400,
    preferredFormations: [FormationType.CARBONATITE, FormationType.PLACER],
    associatedResources: [ResourceType.NEODYMIUM, ResourceType.CERIUM],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: ['Phosphors', 'Lasers', 'Superconductors', 'LED lights', 'Cancer treatment'],
  },

  [ResourceType.SCANDIUM]: {
    type: ResourceType.SCANDIUM,
    baseValue: 2800,
    rarity: 0.015,
    minSize: 25,
    maxSize: 250,
    preferredFormations: [FormationType.LATERITE, FormationType.PLACER],
    associatedResources: [],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: [
      'Aerospace alloys',
      'Sports equipment',
      'Fuel cells',
      'High-intensity lighting',
      'Solid oxide fuel cells',
    ],
  },

  // ===== ENERGY RESOURCES =====

  [ResourceType.URANIUM]: {
    type: ResourceType.URANIUM,
    baseValue: 1400,
    rarity: 0.02,
    minSize: 200,
    maxSize: 2000,
    preferredFormations: [FormationType.SEDEX, FormationType.PLACER],
    associatedResources: [ResourceType.THORIUM],
    extractionDifficulty: 5,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.ACID_LEACH, ProcessingStep.ENRICHMENT],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: [
      'Nuclear fuel',
      'Nuclear weapons',
      'Medical isotopes',
      'Research reactors',
      'Space exploration',
    ],
  },

  [ResourceType.THORIUM]: {
    type: ResourceType.THORIUM,
    baseValue: 1100,
    rarity: 0.025,
    minSize: 150,
    maxSize: 1500,
    preferredFormations: [FormationType.PLACER, FormationType.CARBONATITE],
    associatedResources: [ResourceType.URANIUM, ResourceType.CERIUM],
    extractionDifficulty: 5,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.ACID_LEACH, ProcessingStep.ENRICHMENT],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: [
      'Nuclear reactors',
      'Welding electrodes',
      'High-temperature ceramics',
      'Gas mantles',
      'Research',
    ],
  },

  // ===== INDUSTRIAL MINERALS =====

  [ResourceType.QUARTZ]: {
    type: ResourceType.QUARTZ,
    baseValue: 5,
    rarity: 0.9,
    minSize: 1000,
    maxSize: 10000,
    preferredFormations: [FormationType.PEGMATITE, FormationType.OROGENIC],
    associatedResources: [ResourceType.GOLD],
    extractionDifficulty: 1,
    processingSteps: [ProcessingStep.CRUSH],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: ['Glass production', 'Electronics', 'Construction', 'Ceramics', 'Optics'],
  },

  [ResourceType.GRAPHITE]: {
    type: ResourceType.GRAPHITE,
    baseValue: 95,
    rarity: 0.3,
    minSize: 200,
    maxSize: 2000,
    preferredFormations: [FormationType.SKARN],
    associatedResources: [],
    extractionDifficulty: 2,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: ['Batteries', 'Lubricants', 'Steel production', 'Nuclear reactors', 'Pencils'],
  },

  [ResourceType.DIAMOND]: {
    type: ResourceType.DIAMOND,
    baseValue: 15000,
    rarity: 0.005,
    minSize: 10,
    maxSize: 100,
    preferredFormations: [FormationType.KIMBERLITE],
    associatedResources: [],
    extractionDifficulty: 5,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION],
    marketDemand: MarketDemand.STABLE,
    realWorldUses: ['Cutting tools', 'Drill bits', 'Jewelry', 'Electronics', 'Optical windows'],
  },

  [ResourceType.BERYLLIUM]: {
    type: ResourceType.BERYLLIUM,
    baseValue: 1800,
    rarity: 0.02,
    minSize: 50,
    maxSize: 500,
    preferredFormations: [FormationType.PEGMATITE, FormationType.SKARN],
    associatedResources: [ResourceType.LITHIUM],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.SPECIALIZED,
    realWorldUses: [
      'Aerospace',
      'Nuclear reactors',
      'Electronics',
      'Medical equipment',
      'Telecommunications',
    ],
  },

  // ===== COMPOSITE DEPOSITS =====

  [ResourceType.POLYMETALLIC]: {
    type: ResourceType.POLYMETALLIC,
    baseValue: 200,
    rarity: 0.15,
    minSize: 300,
    maxSize: 3000,
    preferredFormations: [FormationType.VMS, FormationType.SEDEX],
    associatedResources: [
      ResourceType.COPPER,
      ResourceType.ZINC,
      ResourceType.LEAD,
      ResourceType.SILVER,
    ],
    extractionDifficulty: 4,
    processingSteps: [ProcessingStep.CRUSH, ProcessingStep.FLOTATION, ProcessingStep.SMELT],
    marketDemand: MarketDemand.HIGH,
    realWorldUses: [
      'Multiple metal production',
      'Industrial applications',
      'Electronics',
      'Construction',
      'Energy infrastructure',
    ],
  },

  [ResourceType.RARE_EARTH_COMPLEX]: {
    type: ResourceType.RARE_EARTH_COMPLEX,
    baseValue: 800,
    rarity: 0.01,
    minSize: 100,
    maxSize: 1000,
    preferredFormations: [FormationType.CARBONATITE, FormationType.PLACER],
    associatedResources: [ResourceType.NEODYMIUM, ResourceType.CERIUM, ResourceType.YTTRIUM],
    extractionDifficulty: 5,
    processingSteps: [
      ProcessingStep.CRUSH,
      ProcessingStep.FLOTATION,
      ProcessingStep.CHEMICAL_PROCESSING,
    ],
    marketDemand: MarketDemand.EXPLOSIVE,
    realWorldUses: [
      'High-tech manufacturing',
      'Renewable energy',
      'Electronics',
      'Defense systems',
      'Medical technology',
    ],
  },
};

/**
 * Helper function to get resource configuration
 */
export function getResourceConfig(type: ResourceType): ResourceConfig {
  return RESOURCE_CONFIGS[type];
}

/**
 * Get all resource types by rarity category
 */
export function getResourcesByRarity() {
  const resourceTypes = Object.keys(RESOURCE_CONFIGS) as ResourceType[];

  return {
    common: resourceTypes.filter((type) => RESOURCE_CONFIGS[type].rarity > 0.5),
    uncommon: resourceTypes.filter(
      (type) => RESOURCE_CONFIGS[type].rarity > 0.2 && RESOURCE_CONFIGS[type].rarity <= 0.5,
    ),
    rare: resourceTypes.filter(
      (type) => RESOURCE_CONFIGS[type].rarity > 0.05 && RESOURCE_CONFIGS[type].rarity <= 0.2,
    ),
    legendary: resourceTypes.filter((type) => RESOURCE_CONFIGS[type].rarity <= 0.05),
  };
}

/**
 * Calculate total economic value of a resource vein
 */
export function calculateVeinValue(
  type: ResourceType,
  size: number,
  richness: number,
  purity: number,
  accessibility: number,
  depth: number,
): number {
  const config = getResourceConfig(type);

  const baseValue = config.baseValue;
  const sizeValue = size;
  const qualityMultiplier = richness * purity;
  const difficultyPenalty = accessibility / Math.sqrt(depth);

  return Math.floor(baseValue * sizeValue * qualityMultiplier * difficultyPenalty);
}
