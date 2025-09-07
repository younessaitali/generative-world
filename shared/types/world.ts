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

export enum ResourceType {
  IRON = 'IRON',
  COPPER = 'COPPER',
  ALUMINUM = 'ALUMINUM',
  ZINC = 'ZINC',
  LEAD = 'LEAD',
  TIN = 'TIN',

  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  PALLADIUM = 'PALLADIUM',

  NICKEL = 'NICKEL',
  COBALT = 'COBALT',
  CHROMIUM = 'CHROMIUM',
  MANGANESE = 'MANGANESE',
  MOLYBDENUM = 'MOLYBDENUM',
  TUNGSTEN = 'TUNGSTEN',
  TITANIUM = 'TITANIUM',

  LITHIUM = 'LITHIUM',
  NEODYMIUM = 'NEODYMIUM',
  CERIUM = 'CERIUM',
  YTTRIUM = 'YTTRIUM',
  SCANDIUM = 'SCANDIUM',

  URANIUM = 'URANIUM',
  THORIUM = 'THORIUM',

  QUARTZ = 'QUARTZ',
  GRAPHITE = 'GRAPHITE',
  DIAMOND = 'DIAMOND',
  BERYLLIUM = 'BERYLLIUM',

  POLYMETALLIC = 'POLYMETALLIC',
  RARE_EARTH_COMPLEX = 'RARE_EARTH_COMPLEX',
}

export enum ResourceGrade {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ULTRA = 'ULTRA',
}

export enum FormationType {
  PEGMATITE = 'PEGMATITE',
  MAGMATIC_SULFIDE = 'MAGMATIC_SULFIDE',
  KIMBERLITE = 'KIMBERLITE',
  CARBONATITE = 'CARBONATITE',

  PORPHYRY = 'PORPHYRY',
  EPITHERMAL = 'EPITHERMAL',
  OROGENIC = 'OROGENIC',
  VMS = 'VMS',

  PLACER = 'PLACER',
  BIF = 'BIF',
  LATERITE = 'LATERITE',
  SEDEX = 'SEDEX',

  SKARN = 'SKARN',
  GREISEN = 'GREISEN',
}

export enum ScanLevel {
  SURFACE = 'SURFACE',
  SHALLOW = 'SHALLOW',
  DEEP = 'DEEP',
  GEOLOGICAL = 'GEOLOGICAL',
}

export enum EnvironmentalHazard {
  RADIATION = 'RADIATION',
  INSTABILITY = 'INSTABILITY',
  TOXIC_GASES = 'TOXIC_GASES',
  HIGH_PRESSURE = 'HIGH_PRESSURE',
  ACIDIC_WATER = 'ACIDIC_WATER',
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
  nearbyVeins: string[];
  geologicalFeatures: string[];
  distanceToWater: number;
}

export interface ResourceVein {
  id: string;
  type: ResourceType;

  location: {
    worldX: number;
    worldY: number;
    chunkX: number;
    chunkY: number;
    cellX: number;
    cellY: number;
  };

  deposit: {
    size: number;
    richness: number;
    depth: number;
    accessibility: number;
    formation: FormationType;
  };

  quality: {
    grade: ResourceGrade;
    purity: number;
    complexity: number;
    yield: number;
  };

  extraction: {
    totalExtracted: number;
    remainingReserves: number;
    depletion: number;
    lastExtracted: string;
    extractionRate: number;
  };

  discovery: {
    isDiscovered: boolean;
    discoveredBy?: string;
    discoveredAt?: string;
    scanLevel: ScanLevel;
    confidence: number;
  };

  environment: {
    terrain: ExtendedTerrainType;
    climate: ClimateType;
    hazards: EnvironmentalHazard[];
    proximity: ProximityEffects;
  };

  metadata: {
    generated: string;
    seed: number;
    version: string;
    tags: string[];
  };
}

export interface ResourceConfig {
  type: ResourceType;
  baseValue: number;
  rarity: number;
  minSize: number;
  maxSize: number;
  preferredFormations: FormationType[];
  associatedResources: ResourceType[];
  extractionDifficulty: number;
  processingSteps: ProcessingStep[];
  marketDemand: MarketDemand;
  realWorldUses: string[];
}

export interface ChunkResourceData {
  chunkX: number;
  chunkY: number;
  veins: ResourceVein[];
  totalValue: number;
  dominantType?: ResourceType;
  lastUpdated: string;
}
