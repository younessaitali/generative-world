import * as PIXI from 'pixi.js';
import type { ChunkCoordinate, TerrainGrid, RendererStats, ResourceVein } from '../types/world';
import { createServiceLogger } from '../utils/logger';
import { WORLD_CONFIG, type WorldConfig } from '../config/world.config';
import { getResourceColor, getResourceColorDark } from '../utils/resource-colors';

interface PixiChunk {
  container: PIXI.Container;
  sprites: PIXI.Sprite[];
  resourceSprites: PIXI.Sprite[];
}

export class PixiRendererService {
  private app: PIXI.Application | null = null;
  private chunks = new Map<string, PixiChunk>();
  private chunkLayer: PIXI.Container | null = null;
  private worldContainer: PIXI.Container | null = null;
  private container: HTMLElement | null = null;
  private waterTexture: PIXI.Texture | null = null;
  private landTexture: PIXI.Texture | null = null;
  private unknownTexture: PIXI.Texture | null = null;
  private resourceTextures = new Map<number, PIXI.Texture>();
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
      this.app = new PIXI.Application();
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

      this.worldContainer = new PIXI.Container();
      this.app.stage.addChild(this.worldContainer);

      this.chunkLayer = new PIXI.Container();
      this.worldContainer.addChild(this.chunkLayer);

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

    const waterGraphics = new PIXI.Graphics();
    waterGraphics.rect(0, 0, cellSize, cellSize).fill(0x3498db);
    this.waterTexture = this.app.renderer.generateTexture(waterGraphics);

    const landGraphics = new PIXI.Graphics();
    landGraphics.rect(0, 0, cellSize, cellSize).fill(0x27ae60);
    this.landTexture = this.app.renderer.generateTexture(landGraphics);

    const unknownGraphics = new PIXI.Graphics();
    unknownGraphics.rect(0, 0, cellSize, cellSize).fill(0x95a5a6);
    this.unknownTexture = this.app.renderer.generateTexture(unknownGraphics);

    this.logger.debug('Textures created successfully', 'createTextures');
  }

  private createResourceTexture(color: number): PIXI.Texture {
    if (!this.app) throw new Error('PixiJS app not initialized');

    if (this.resourceTextures.has(color)) {
      return this.resourceTextures.get(color)!;
    }

    const cellSize = this.config.chunk.cellSize;
    const resourceSize = Math.max(4, cellSize * 0.4);
    const offset = (cellSize - resourceSize) / 2;

    const graphics = new PIXI.Graphics();
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

    if (!this.waterTexture || !this.landTexture || !this.unknownTexture) {
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
        const cellValue = terrain.cells[row]?.[col];
        const texture = this.getTextureForCell(cellValue);

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
      if (terrainValue === 1) {
        const color = getResourceColor(resource.type);
        const texture = this.createResourceTexture(color);

        const resourceSprite = new PIXI.Sprite(texture);
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

  private createChunk(
    coordinate: ChunkCoordinate,
    terrain: TerrainGrid,
    resources: ResourceVein[] = [],
  ): PixiChunk {
    const container = new PIXI.Container();
    const sprites: PIXI.Sprite[] = [];
    const resourceSprites: PIXI.Sprite[] = [];

    const chunkWorldX = coordinate.chunkX * this.config.chunk.size * this.config.chunk.cellSize;
    const chunkWorldY = coordinate.chunkY * this.config.chunk.size * this.config.chunk.cellSize;
    container.position.set(chunkWorldX, chunkWorldY);

    // Create terrain sprites
    for (let row = 0; row < this.config.chunk.size; row++) {
      if (!terrain.cells[row]) continue;

      for (let col = 0; col < this.config.chunk.size; col++) {
        const cellValue = terrain.cells[row]?.[col];
        const texture = this.getTextureForCell(cellValue);

        if (texture) {
          const sprite = new PIXI.Sprite(texture);
          sprite.position.set(col * this.config.chunk.cellSize, row * this.config.chunk.cellSize);
          container.addChild(sprite);
          sprites.push(sprite);
        }
      }
    }

    for (const resource of resources) {
      const terrainValue = terrain.cells[resource.location.cellY]?.[resource.location.cellX];
      if (terrainValue === 1) {
        const color = getResourceColor(resource.type);
        const texture = this.createResourceTexture(color);

        const resourceSprite = new PIXI.Sprite(texture);
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

  private getTextureForCell(cellValue: number | undefined): PIXI.Texture | null {
    switch (cellValue) {
      case 0:
        return this.waterTexture;
      case 1:
        return this.landTexture;
      default:
        return this.unknownTexture;
    }
  }

  destroy(): void {
    this.logger.info('Destroying PixiJS renderer', 'destroy');

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
    this.worldContainer = null;
    this.chunkLayer = null;
    this.container = null;
    this.waterTexture = null;
    this.landTexture = null;
    this.unknownTexture = null;

    this.logger.info('PixiJS renderer destroyed successfully', 'destroy');
  }
}
