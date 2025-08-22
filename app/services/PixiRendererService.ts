import { Application, Container, Sprite, Graphics, type Texture } from 'pixi.js';
import type {
  ChunkCoordinate,
  TerrainGrid,
  RendererStats,
  ResourceVein,
  ExtendedTerrainType,
} from '#shared/types/world';
import type { ExtractorSprite } from '~/composables/world/useExtractorManager';
import { createServiceLogger } from '~/utils/logger';
import { WORLD_CONFIG, type WorldConfig } from '~/config/world.config';
import { getResourceColor } from '~/utils/resource-colors';
import { getTerrainPixiColor, getTerrainPixiColorDarkened } from '~/utils/terrain-colors';

interface PixiChunk {
  container: Container;
  sprites: Sprite[];
  resourceSprites: Sprite[];
}

interface PixiExtractorSprite {
  sprite: Sprite;
  animationContainer: Container;
  pulseSprite: Sprite;
  extractor: ExtractorSprite;
  animationFn?: () => void;
}

export class PixiRendererService {
  private app: Application | null = null;
  private chunks = new Map<string, PixiChunk>();
  private chunkLayer: Container | null = null;
  private extractorLayer: Container | null = null;
  private extractorSprites = new Map<string, PixiExtractorSprite>();
  private worldContainer: Container | null = null;
  private container: HTMLElement | null = null;

  private terrainTextures = new Map<ExtendedTerrainType, Texture>();
  private terrainTexturesDarkened = new Map<ExtendedTerrainType, Texture>();
  private unknownTexture: Texture | null = null;
  private resourceTextures = new Map<number, Texture>();
  private extractorTextures = new Map<number, Texture>();
  private config: WorldConfig;
  private logger = createServiceLogger('PixiRendererService');
  private stats: RendererStats = {
    chunksLoaded: 0,
    frameRate: 0,
    memory: 0,
  };

  constructor(config: WorldConfig = WORLD_CONFIG) {
    this.config = config;
    this.logger.info('PixiRendererService initialized', 'constructor');
  }

  async initialize(container: HTMLElement): Promise<void> {
    this.logger.info('Initializing PixiJS renderer', 'initialize');
    this.container = container;

    try {
      this.app = new Application();
      await this.app.init({
        width: container.clientWidth,
        height: container.clientHeight,
        ...this.config.renderer,
      });

      this.logger.info('PixiJS application initialized', 'initialize', {
        width: container.clientWidth,
        height: container.clientHeight,
      });

      container.appendChild(this.app.canvas);

      this.worldContainer = new Container();
      this.app.stage.addChild(this.worldContainer);

      this.chunkLayer = new Container();
      this.worldContainer.addChild(this.chunkLayer);

      this.extractorLayer = new Container();
      this.worldContainer.addChild(this.extractorLayer);

      await this.createTextures();

      this.logger.info('PixiJS renderer fully initialized', 'initialize');
    } catch (error) {
      this.logger.error('Failed to initialize PixiJS renderer', 'initialize', { error });
      throw error;
    }
  }

  private async createTextures(): Promise<void> {
    if (!this.app) throw new Error('PixiJS app not initialized');

    const cellSize = this.config.chunk.cellSize;

    const { ExtendedTerrainType } = await import('#shared/types/world');

    const terrainTypes = Object.values(ExtendedTerrainType);

    for (const terrainType of terrainTypes) {
      const color = getTerrainPixiColor(terrainType);
      const graphics = new Graphics();
      graphics.rect(0, 0, cellSize, cellSize).fill(color);

      const texture = this.app.renderer.generateTexture(graphics);
      this.terrainTextures.set(terrainType, texture);

      const darkenedColor = getTerrainPixiColorDarkened(terrainType);
      const darkenedGraphics = new Graphics();
      darkenedGraphics.rect(0, 0, cellSize, cellSize).fill(darkenedColor);

      const darkenedTexture = this.app.renderer.generateTexture(darkenedGraphics);
      this.terrainTexturesDarkened.set(terrainType, darkenedTexture);
    }

    const unknownGraphics = new Graphics();
    unknownGraphics.rect(0, 0, cellSize, cellSize).fill(0x95a5a6);
    this.unknownTexture = this.app.renderer.generateTexture(unknownGraphics);

    this.logger.debug('All terrain textures created successfully', 'createTextures', {
      terrainTypesCount: terrainTypes.length,
      terrainTypes: terrainTypes,
      darkenedTexturesCount: this.terrainTexturesDarkened.size,
    });
  }

  private createResourceTexture(color: number): Texture {
    if (!this.app) throw new Error('PixiJS app not initialized');

    if (this.resourceTextures.has(color)) {
      return this.resourceTextures.get(color)!;
    }

    const cellSize = this.config.chunk.cellSize;
    const resourceSize = Math.max(4, cellSize * 0.4);
    const offset = (cellSize - resourceSize) / 2;

    const graphics = new Graphics();
    graphics.circle(offset + resourceSize / 2, offset + resourceSize / 2, resourceSize / 2);
    graphics.fill(color);

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const factor = 0.7;
    const borderColor =
      (Math.floor(r * factor) << 16) | (Math.floor(g * factor) << 8) | Math.floor(b * factor);

    graphics.stroke({ color: borderColor, width: 1 });

    const texture = this.app.renderer.generateTexture(graphics);
    this.resourceTextures.set(color, texture);

    return texture;
  }

  private createExtractorTexture(color: number): Texture {
    if (!this.app) throw new Error('PixiJS app not initialized');

    if (this.extractorTextures.has(color)) {
      return this.extractorTextures.get(color)!;
    }

    const cellSize = this.config.chunk.cellSize;
    const extractorSize = Math.max(8, cellSize * 0.7);
    const offset = (cellSize - extractorSize) / 2;

    const graphics = new Graphics();

    graphics.roundRect(offset, offset, extractorSize, extractorSize, 2);
    graphics.fill(color);

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const factor = 0.6;
    const borderColor =
      (Math.floor(r * factor) << 16) | (Math.floor(g * factor) << 8) | Math.floor(b * factor);

    graphics.roundRect(offset, offset, extractorSize, extractorSize, 2);
    graphics.stroke({ color: borderColor, width: 2 });

    const centerSize = extractorSize * 0.3;
    const centerOffset = offset + (extractorSize - centerSize) / 2;
    graphics.rect(centerOffset, centerOffset, centerSize, centerSize);
    graphics.fill(0xffffff);

    const texture = this.app.renderer.generateTexture(graphics);
    this.extractorTextures.set(color, texture);

    return texture;
  }

  private createExtractorPulseTexture(color: number): Texture {
    if (!this.app) throw new Error('PixiJS app not initialized');

    const cellSize = this.config.chunk.cellSize;
    const pulseSize = cellSize * 1.2;
    const offset = (cellSize - pulseSize) / 2;

    const graphics = new Graphics();
    graphics.circle(offset + pulseSize / 2, offset + pulseSize / 2, pulseSize / 2);
    const alpha = 0.3;
    graphics.fill({ color, alpha });

    return this.app.renderer.generateTexture(graphics);
  }

  setCameraTransform(x: number, y: number, zoom: number): void {
    if (!this.app || !this.worldContainer) {
      this.logger.warn(
        'Cannot set camera transform - renderer not initialized',
        'setCameraTransform',
      );
      return;
    }

    this.worldContainer.position.set(x, y);
    this.worldContainer.scale.set(zoom);
  }

  addChunk(
    coordinate: ChunkCoordinate,
    terrain: TerrainGrid,
    resources: ResourceVein[] = [],
  ): void {
    if (!this.worldContainer) {
      this.logger.warn('Cannot add chunk - renderer not initialized', 'addChunk');
      return;
    }

    if (!this.terrainTextures.size || !this.unknownTexture) {
      this.logger.warn('Cannot add chunk - textures not created', 'addChunk');
      return;
    }

    const chunkKey = `${coordinate.chunkX},${coordinate.chunkY}`;

    if (this.chunks.has(chunkKey)) {
      this.removeChunk(coordinate);
    }

    const chunk = this.createChunk(coordinate, terrain, resources);
    this.chunks.set(chunkKey, chunk);
    this.worldContainer.addChild(chunk.container);
    this.stats.chunksLoaded++;

    this.logger.debug('Chunk added successfully', 'addChunk', {
      chunkKey,
      spritesCount: chunk.sprites.length,
    });
  }

  removeChunk(coordinate: ChunkCoordinate): void {
    if (!this.worldContainer) return;

    const chunkKey = `${coordinate.chunkX},${coordinate.chunkY}`;
    const chunk = this.chunks.get(chunkKey);

    if (chunk) {
      this.worldContainer.removeChild(chunk.container);
      chunk.container.destroy({ children: true });
      this.chunks.delete(chunkKey);
      this.stats.chunksLoaded--;

      this.logger.debug('Chunk removed successfully', 'removeChunk', { chunkKey });
    }
  }

  updateChunk(
    coordinate: ChunkCoordinate,
    terrain: TerrainGrid,
    resources: ResourceVein[] = [],
  ): void {
    const chunkKey = `${coordinate.chunkX},${coordinate.chunkY}`;
    const existingChunk = this.chunks.get(chunkKey);

    if (!existingChunk) {
      this.logger.warn('Cannot update chunk - chunk not found', 'updateChunk', { chunkKey });
      // If chunk doesn't exist, add it instead
      this.addChunk(coordinate, terrain, resources);
      return;
    }

    let spriteIndex = 0;
    for (let row = 0; row < this.config.chunk.size; row++) {
      for (let col = 0; col < this.config.chunk.size; col++) {
        const terrainType = terrain.cells[row]?.[col];

        const hasDifferentNeighbors = this.hasDifferentNeighbors(terrain, row, col);
        const texture = this.getTextureForCellWithBlending(terrainType, hasDifferentNeighbors);

        if (texture && existingChunk.sprites[spriteIndex]) {
          existingChunk.sprites[spriteIndex]!.texture = texture;
        }
        spriteIndex++;
      }
    }
    for (const resourceSprite of existingChunk.resourceSprites) {
      existingChunk.container.removeChild(resourceSprite);
      resourceSprite.destroy();
    }
    existingChunk.resourceSprites.length = 0;

    for (const resource of resources) {
      const terrainValue = terrain.cells[resource.location.cellY]?.[resource.location.cellX];
      if (terrainValue && terrainValue !== 'OCEAN') {
        const color = getResourceColor(resource.type);
        const texture = this.createResourceTexture(color);

        const resourceSprite = new Sprite(texture);
        resourceSprite.position.set(
          resource.location.cellX * this.config.chunk.cellSize,
          resource.location.cellY * this.config.chunk.cellSize,
        );

        resourceSprite.alpha = 0.8;

        existingChunk.container.addChild(resourceSprite);
        existingChunk.resourceSprites.push(resourceSprite);
      }
    }

    this.logger.debug('Chunk updated successfully', 'updateChunk', { chunkKey });
  }

  updateVisibleChunks(visibleChunks: ChunkCoordinate[]): void {
    const visibleKeys = new Set(visibleChunks.map((c) => `${c.chunkX},${c.chunkY}`));

    // Remove chunks that are no longer visible
    for (const [chunkKey] of this.chunks) {
      if (!visibleKeys.has(chunkKey)) {
        const coords = chunkKey.split(',').map(Number);
        const chunkX = coords[0];
        const chunkY = coords[1];
        if (chunkX !== undefined && chunkY !== undefined) {
          this.removeChunk({ chunkX, chunkY });
        }
      }
    }

    this.logger.debug('Visible chunks updated', 'updateVisibleChunks', {
      visibleCount: visibleChunks.length,
      loadedCount: this.chunks.size,
    });
  }

  getStats(): RendererStats {
    return {
      ...this.stats,
      frameRate: this.app?.ticker.FPS || 0,
      memory: this.getMemoryUsage(),
    };
  }

  private getMemoryUsage(): number {
    // Rough estimate: chunks * sprites per chunk * estimated bytes per sprite
    return this.chunks.size * this.config.chunk.size * this.config.chunk.size * 100;
  }

  resize(width: number, height: number): void {
    if (!this.app) return;

    this.app.renderer.resize(width, height);
    this.logger.debug('Renderer resized', 'resize', { width, height });
  }

  addExtractor(extractor: ExtractorSprite): void {
    if (!this.extractorLayer || !this.app) {
      this.logger.warn('Cannot add extractor - renderer not initialized', 'addExtractor');
      return;
    }

    if (this.extractorSprites.has(extractor.id)) {
      this.removeExtractor(extractor.id);
    }

    const animationContainer = new Container();

    const pulseTexture = this.createExtractorPulseTexture(extractor.color);
    const pulseSprite = new Sprite(pulseTexture);
    pulseSprite.alpha = 0.5;
    pulseSprite.anchor.set(0.5);

    const extractorTexture = this.createExtractorTexture(extractor.color);
    const sprite = new Sprite(extractorTexture);
    sprite.anchor.set(0.5);

    const worldX = extractor.x * this.config.chunk.cellSize + this.config.chunk.cellSize / 2;
    const worldY = extractor.y * this.config.chunk.cellSize + this.config.chunk.cellSize / 2;

    animationContainer.position.set(worldX, worldY);
    animationContainer.addChild(pulseSprite);
    animationContainer.addChild(sprite);

    this.extractorLayer.addChild(animationContainer);

    const pixiExtractor: PixiExtractorSprite = {
      sprite,
      animationContainer,
      pulseSprite,
      extractor,
    };

    this.extractorSprites.set(extractor.id, pixiExtractor);

    this.updateExtractorAnimation(extractor.id);

    this.logger.debug('Extractor added successfully', 'addExtractor', {
      extractorId: extractor.id,
      position: { x: extractor.x, y: extractor.y },
      resourceType: extractor.resourceType,
    });
  }

  removeExtractor(extractorId: string): void {
    const pixiExtractor = this.extractorSprites.get(extractorId);
    if (!pixiExtractor || !this.extractorLayer) return;

    this.extractorLayer.removeChild(pixiExtractor.animationContainer);
    pixiExtractor.animationContainer.destroy({ children: true });
    this.extractorSprites.delete(extractorId);

    this.logger.debug('Extractor removed successfully', 'removeExtractor', { extractorId });
  }

  updateExtractorStatus(extractorId: string, status: string): void {
    const pixiExtractor = this.extractorSprites.get(extractorId);
    if (!pixiExtractor) return;

    pixiExtractor.extractor.status = status;
    pixiExtractor.extractor.isAnimated = status === 'EXTRACTING';
    this.updateExtractorAnimation(extractorId);
  }

  private updateExtractorAnimation(extractorId: string): void {
    const pixiExtractor = this.extractorSprites.get(extractorId);
    if (!pixiExtractor || !this.app) return;

    if (pixiExtractor.animationFn) {
      this.app.ticker.remove(pixiExtractor.animationFn);
      pixiExtractor.animationFn = undefined;
    }

    if (pixiExtractor.extractor.isAnimated) {
      let time = 0;
      const animate = () => {
        time += this.app!.ticker.deltaTime * 0.1;

        const scale = 1 + Math.sin(time) * 0.1;
        pixiExtractor.pulseSprite.scale.set(scale);

        const alpha = 0.3 + Math.sin(time) * 0.2;
        pixiExtractor.pulseSprite.alpha = alpha;

        pixiExtractor.sprite.rotation = Math.sin(time * 0.5) * 0.1;
      };

      this.app.ticker.add(animate);
      pixiExtractor.animationFn = animate;
    }
  }

  clearAllExtractors(): void {
    for (const [extractorId] of this.extractorSprites) {
      this.removeExtractor(extractorId);
    }
  }

  private createChunk(
    coordinate: ChunkCoordinate,
    terrain: TerrainGrid,
    resources: ResourceVein[] = [],
  ): PixiChunk {
    const container = new Container();
    const sprites: Sprite[] = [];
    const resourceSprites: Sprite[] = [];

    const chunkWorldX = coordinate.chunkX * this.config.chunk.size * this.config.chunk.cellSize;
    const chunkWorldY = coordinate.chunkY * this.config.chunk.size * this.config.chunk.cellSize;
    container.position.set(chunkWorldX, chunkWorldY);

    this.logger.debug('Creating chunk with terrain data', 'createChunk', {
      chunkKey: `${coordinate.chunkX},${coordinate.chunkY}`,
      terrainSample: terrain.cells[0]?.slice(0, 3),
      terrainDataType: typeof terrain.cells[0]?.[0],
    });

    for (let row = 0; row < this.config.chunk.size; row++) {
      if (!terrain.cells[row]) continue;

      for (let col = 0; col < this.config.chunk.size; col++) {
        const terrainType = terrain.cells[row]?.[col];

        // Check if this cell has different neighbors for terrain blending
        const hasDifferentNeighbors = this.hasDifferentNeighbors(terrain, row, col);
        const texture = this.getTextureForCellWithBlending(terrainType, hasDifferentNeighbors);

        if (texture) {
          const sprite = new Sprite(texture);
          sprite.position.set(col * this.config.chunk.cellSize, row * this.config.chunk.cellSize);
          container.addChild(sprite);
          sprites.push(sprite);
        } else {
          // Log when no texture is found
          this.logger.warn('No texture found for terrain type', 'createChunk', {
            terrainType,
            row,
            col,
            typeofTerrain: typeof terrainType,
          });
        }
      }
    }

    for (const resource of resources) {
      const terrainValue = terrain.cells[resource.location.cellY]?.[resource.location.cellX];
      if (terrainValue && terrainValue !== 'OCEAN') {
        const color = getResourceColor(resource.type);
        const texture = this.createResourceTexture(color);

        const resourceSprite = new Sprite(texture);
        resourceSprite.position.set(
          resource.location.cellX * this.config.chunk.cellSize,
          resource.location.cellY * this.config.chunk.cellSize,
        );

        resourceSprite.alpha = 0.8;

        container.addChild(resourceSprite);
        resourceSprites.push(resourceSprite);
      }
    }

    return { container, sprites, resourceSprites };
  }

  private getTextureForCell(terrainType: ExtendedTerrainType | undefined): Texture | null {
    if (!terrainType) {
      return this.unknownTexture;
    }

    const texture = this.terrainTextures.get(terrainType);
    return texture || this.unknownTexture;
  }

  private getTextureForCellWithBlending(
    terrainType: ExtendedTerrainType | undefined,
    hasDifferentNeighbors: boolean,
  ): Texture | null {
    if (!terrainType) {
      return this.unknownTexture;
    }

    if (hasDifferentNeighbors) {
      const darkenedTexture = this.terrainTexturesDarkened.get(terrainType);
      if (darkenedTexture) {
        return darkenedTexture;
      }
    }

    const texture = this.terrainTextures.get(terrainType);
    return texture || this.unknownTexture;
  }

  private hasDifferentNeighbors(terrain: TerrainGrid, row: number, col: number): boolean {
    const currentTerrain = terrain.cells[row]?.[col];
    if (!currentTerrain) return false;

    const chunkSize = this.config.chunk.size;

    const neighbors = [
      { row: row - 1, col }, // North
      { row: row + 1, col }, // South
      { row, col: col - 1 }, // West
      { row, col: col + 1 }, // East
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.row < 0 ||
        neighbor.row >= chunkSize ||
        neighbor.col < 0 ||
        neighbor.col >= chunkSize
      ) {
        continue;
      }

      const neighborTerrain = terrain.cells[neighbor.row]?.[neighbor.col];

      if (neighborTerrain && neighborTerrain !== currentTerrain) {
        return true;
      }
    }

    return false;
  }

  destroy(): void {
    this.logger.info('Destroying PixiJS renderer', 'destroy');

    this.clearAllExtractors();

    for (const [chunkKey] of this.chunks) {
      const coords = chunkKey.split(',').map(Number);
      const chunkX = coords[0];
      const chunkY = coords[1];
      if (chunkX !== undefined && chunkY !== undefined) {
        this.removeChunk({ chunkX, chunkY });
      }
    }

    if (this.app) {
      if (this.container && this.app.canvas.parentNode === this.container) {
        this.container.removeChild(this.app.canvas);
      }
      this.app.destroy(true);
      this.app = null;
    }

    this.chunks.clear();
    this.extractorSprites.clear();
    this.terrainTextures.clear();
    this.terrainTexturesDarkened.clear();
    this.resourceTextures.clear();
    this.extractorTextures.clear();
    this.worldContainer = null;
    this.chunkLayer = null;
    this.extractorLayer = null;
    this.container = null;
    this.unknownTexture = null;

    this.logger.info('PixiJS renderer destroyed successfully', 'destroy');
  }
}
