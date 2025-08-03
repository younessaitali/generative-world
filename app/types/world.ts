export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type CameraState = Camera;

export interface Viewport {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ChunkCoordinate {
  chunkX: number;
  chunkY: number;
}

export interface ChunkData {
  coordinate: ChunkCoordinate;
  terrain: ExtendedTerrainType[][];
  elevationData?: number[][];
  climateData?: ClimateType[][];
  size: number;
  timestamp?: string;
  resources: ResourceVein[];
  metadata?: {
    version: string;
    generationMethod: string;
    seed: number;
  };
}

export interface TerrainGrid {
  cells: ExtendedTerrainType[][];
}

export interface WorldConfig {
  chunkSize: number;
  cellSize: number;
  cacheExpiration: number;
  prefetchRadius: number;
}

export interface WebSocketMessage {
  type: string;
  timestamp?: string;
  requestId?: string;
}

export interface ChunkRequestMessage extends WebSocketMessage {
  type: 'requestChunk';
  chunkX: number;
  chunkY: number;
}

export interface ViewportUpdateMessage extends WebSocketMessage {
  type: 'updateViewport';
  visibleChunks: ChunkCoordinate[];
  cameraX?: number;
  cameraY?: number;
}

export interface ChunkDataMessage extends WebSocketMessage {
  type: 'chunkData';
  chunkX: number;
  chunkY: number;
  data: TerrainGrid;
  elevationData?: number[][];
  climateData?: ClimateType[][];
  resources?: ResourceVein[];
  priority?: 'viewport' | 'low';
  progress?: {
    current: number;
    total: number;
    phase?: 'viewport' | 'prefetch';
  };
  metadata?: {
    version: string;
    generationTime: number;
    compressionUsed?: boolean;
  };
}

export interface ConnectedMessage extends WebSocketMessage {
  type: 'connected';
  message?: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'chunkError' | 'viewportError';
  error: string;
  chunkX?: number;
  chunkY?: number;
}

export interface ViewportCompleteMessage extends WebSocketMessage {
  type: 'viewportComplete';
  chunksStreamed: number;
  prefetchChunksStreamed?: number;
}

export type WorldMessage =
  | ChunkRequestMessage
  | ViewportUpdateMessage
  | ChunkDataMessage
  | ConnectedMessage
  | ErrorMessage
  | ViewportCompleteMessage;

export interface RendererConfig {
  width: number;
  height: number;
  backgroundColor?: string | number;
  antialias?: boolean;
  resolution?: number;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

export interface RendererStats {
  chunksLoaded: number;
  frameRate: number;
  memory: number;
  chunksVisible?: number;
  totalSprites?: number;
  visibleSprites?: number;
  renderer?: string;
  fps?: number;
  deltaTime?: number;
  batchingEnabled?: boolean;
}

export interface CameraEvent {
  type: 'pan' | 'zoom';
  deltaX?: number;
  deltaY?: number;
  zoomDelta?: number;
  mouseX?: number;
  mouseY?: number;
}

export interface WorldError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

// ===== RESOURCE SYSTEM TYPES =====

export enum ResourceType {
  // Common Metals (High availability, low value)
  IRON = 'IRON',
  COPPER = 'COPPER',
  ALUMINUM = 'ALUMINUM',
  ZINC = 'ZINC',
  LEAD = 'LEAD',
  TIN = 'TIN',

  // Precious Metals (Low availability, high value)
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  PALLADIUM = 'PALLADIUM',

  // Industrial Metals (Medium availability, medium value)
  NICKEL = 'NICKEL',
  COBALT = 'COBALT',
  CHROMIUM = 'CHROMIUM',
  MANGANESE = 'MANGANESE',
  MOLYBDENUM = 'MOLYBDENUM',
  TUNGSTEN = 'TUNGSTEN',
  TITANIUM = 'TITANIUM',

  // Rare Earth Elements (Very low availability, very high value)
  LITHIUM = 'LITHIUM',
  NEODYMIUM = 'NEODYMIUM',
  CERIUM = 'CERIUM',
  YTTRIUM = 'YTTRIUM',
  SCANDIUM = 'SCANDIUM',

  // Energy Resources
  URANIUM = 'URANIUM',
  THORIUM = 'THORIUM',

  // Industrial Minerals
  QUARTZ = 'QUARTZ',
  GRAPHITE = 'GRAPHITE',
  DIAMOND = 'DIAMOND',
  BERYLLIUM = 'BERYLLIUM',

  // Composite Deposits (contain multiple resources)
  POLYMETALLIC = 'POLYMETALLIC',
  RARE_EARTH_COMPLEX = 'RARE_EARTH_COMPLEX',
}

export enum ResourceGrade {
  LOW = 'LOW', // 0.1-0.3 richness, common
  MEDIUM = 'MEDIUM', // 0.3-0.6 richness, uncommon
  HIGH = 'HIGH', // 0.6-0.8 richness, rare
  ULTRA = 'ULTRA', // 0.8-1.0 richness, legendary
}

export enum FormationType {
  // Magmatic Deposits
  PEGMATITE = 'PEGMATITE', // REEs, lithium, beryllium
  MAGMATIC_SULFIDE = 'MAGMATIC_SULFIDE', // Nickel, copper, PGEs
  KIMBERLITE = 'KIMBERLITE', // Diamonds
  CARBONATITE = 'CARBONATITE', // Rare earth elements

  // Hydrothermal Deposits
  PORPHYRY = 'PORPHYRY', // Copper, molybdenum
  EPITHERMAL = 'EPITHERMAL', // Gold, silver
  OROGENIC = 'OROGENIC', // Gold in quartz veins
  VMS = 'VMS', // Volcanogenic massive sulfides

  // Sedimentary Deposits
  PLACER = 'PLACER', // Gold, platinum, titanium
  BIF = 'BIF', // Banded iron formation
  LATERITE = 'LATERITE', // Aluminum, nickel
  SEDEX = 'SEDEX', // Lead, zinc

  // Metamorphic Deposits
  SKARN = 'SKARN', // Tungsten, copper, iron
  GREISEN = 'GREISEN', // Tin, tungsten
}

export enum ScanLevel {
  SURFACE = 'SURFACE', // Visual indication only
  SHALLOW = 'SHALLOW', // Basic composition
  DEEP = 'DEEP', // Detailed composition & size
  GEOLOGICAL = 'GEOLOGICAL', // Complete analysis
}

export enum EnvironmentalHazard {
  RADIATION = 'RADIATION', // Uranium/thorium deposits
  INSTABILITY = 'INSTABILITY', // Unstable geology
  TOXIC_GASES = 'TOXIC_GASES', // Dangerous fumes
  HIGH_PRESSURE = 'HIGH_PRESSURE', // Deep deposits
  ACIDIC_WATER = 'ACIDIC_WATER', // Acid mine drainage
}

export enum ClimateType {
  ARCTIC = 'ARCTIC',
  TEMPERATE = 'TEMPERATE',
  TROPICAL = 'TROPICAL',
  ARID = 'ARID',
  ALPINE = 'ALPINE',
}

export enum ExtendedTerrainType {
  OCEAN = 'OCEAN',
  PLAINS = 'PLAINS',
  HILLS = 'HILLS',
  MOUNTAINS = 'MOUNTAINS',
  DESERT = 'DESERT',
  FOREST = 'FOREST',
  SWAMP = 'SWAMP',
  TUNDRA = 'TUNDRA',
}
export interface TerrainProperties {
  type: ExtendedTerrainType;
  baseColor: number;
  elevation: {
    min: number;
    max: number;
    variance: number;
  };
  traversal: {
    difficulty: number;
    speedModifier: number;
  };
  visual: {
    texture?: string;
    pattern?: string;
    opacity: number;
    animated?: boolean;
  };
  climate: {
    preferredClimates: ClimateType[];
    temperatureModifier: number;
    humidityModifier: number;
  };
  resources: {
    preferredResources: ResourceType[];
    resourceDensityModifier: number;
    accessibilityModifier: number;
  };
}

export interface TerrainCell {
  type: ExtendedTerrainType;
  elevation?: number;
  moisture?: number;
  temperature?: number;
  metadata?: {
    generated: string;
    seed: number;
    noise: number;
  };
}

export enum ProcessingStep {
  CRUSH = 'CRUSH',
  FLOTATION = 'FLOTATION',
  SMELT = 'SMELT',
  CYANIDE_LEACH = 'CYANIDE_LEACH',
  ACID_LEACH = 'ACID_LEACH',
  CHEMICAL_PROCESSING = 'CHEMICAL_PROCESSING',
  ENRICHMENT = 'ENRICHMENT',
}

export enum MarketDemand {
  LOW = 'LOW',
  STABLE = 'STABLE',
  HIGH = 'HIGH',
  EXPLOSIVE = 'EXPLOSIVE',
  SPECIALIZED = 'SPECIALIZED',
}

export interface ProximityEffects {
  nearbyVeins: string[]; // IDs of nearby resource veins
  geologicalFeatures: string[]; // Geological landmarks
  distanceToWater: number; // Distance to water in world units
}

export interface ResourceVein {
  // Core Identification
  id: string; // Unique identifier for this vein
  type: ResourceType; // The primary resource type

  // Geographic Properties
  location: {
    worldX: number; // World coordinate X
    worldY: number; // World coordinate Y
    chunkX: number; // Chunk coordinate X
    chunkY: number; // Chunk coordinate Y
    cellX: number; // Cell within chunk (0-15)
    cellY: number; // Cell within chunk (0-15)
  };

  // Geological Properties
  deposit: {
    size: number; // Total extractable units (100-10000)
    richness: number; // Ore grade/purity (0.1-1.0)
    depth: number; // Depth below surface (1-10)
    accessibility: number; // How easy to extract (0.1-1.0)
    formation: FormationType; // Geological formation type
  };

  // Economic Properties
  quality: {
    grade: ResourceGrade; // LOW, MEDIUM, HIGH, ULTRA
    purity: number; // Additional purity modifier (0.5-1.5)
    complexity: number; // Processing complexity (1-5)
    yield: number; // Expected yield per extraction (calculated)
  };

  // Extraction State
  extraction: {
    totalExtracted: number; // Amount already extracted
    remainingReserves: number; // Calculated remaining amount
    depletion: number; // Depletion rate (0-1, where 1 = depleted)
    lastExtracted: string; // ISO timestamp of last extraction
    extractionRate: number; // Units per time period
  };

  // Discovery & Scanning
  discovery: {
    isDiscovered: boolean; // Has been discovered by any player
    discoveredBy?: string; // Player ID who discovered it
    discoveredAt?: string; // ISO timestamp of discovery
    scanLevel: ScanLevel; // SURFACE, SHALLOW, DEEP, GEOLOGICAL
    confidence: number; // Scan confidence level (0-1)
  };

  // Environmental Factors
  environment: {
    terrain: ExtendedTerrainType; // PLAINS, HILLS, MOUNTAINS, DESERT, etc.
    climate: ClimateType; // Affects extraction conditions
    hazards: EnvironmentalHazard[]; // Radiation, instability, etc.
    proximity: ProximityEffects; // Effects from nearby veins/features
  };

  // Metadata
  metadata: {
    generated: string; // ISO timestamp when generated
    seed: number; // Generation seed for reproducibility
    version: string; // Data structure version
    tags: string[]; // Custom tags for categorization
  };
}

export interface ResourceConfig {
  type: ResourceType;
  baseValue: number; // Economic base value
  rarity: number; // Spawn rarity (0-1, lower = rarer)
  minSize: number; // Minimum vein size
  maxSize: number; // Maximum vein size
  preferredFormations: FormationType[];
  associatedResources: ResourceType[]; // Often found together
  extractionDifficulty: number; // Base extraction complexity
  processingSteps: ProcessingStep[];
  marketDemand: MarketDemand;
  realWorldUses: string[]; // Educational information
}

export interface ChunkResourceData {
  chunkX: number;
  chunkY: number;
  veins: ResourceVein[];
  totalValue: number; // Cached total value
  dominantType?: ResourceType; // Most common resource
  lastUpdated: string; // Cache invalidation
}
