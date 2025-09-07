import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListBucketsCommand,
  type _Object,
} from '@aws-sdk/client-s3';
import type { ChunkData } from '#shared/types/world';

export class StorageService {
  private s3Client: S3Client | null = null;
  private isConnected = false;
  private connectionAttempted = false;
  private readonly bucketName = 'worlds';

  constructor() {
    this.initializeS3Client();
  }

  private async initializeS3Client(): Promise<void> {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    try {
      const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
      const accessKeyId = process.env.MINIO_ACCESS_KEY || 'minioadmin';
      const secretAccessKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

      this.s3Client = new S3Client({
        endpoint: minioEndpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region: 'us-east-1', // MinIO doesn't care about region, but SDK requires it
        forcePathStyle: true, // Required for MinIO
      });

      await this.s3Client.send(new ListBucketsCommand({}));
      this.isConnected = true;
    } catch (error) {
      console.warn('⚠️ MinIO storage not available, proceeding without cold storage:', error);
      this.s3Client = null;
      this.isConnected = false;
    }
  }

  private async ensureBucketExists(): Promise<void> {
    if (!this.s3Client) return;

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error) {
      if (this.isNotFoundError(error)) {
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        } catch (createError) {
          console.error(`❌ Failed to create bucket '${this.bucketName}':`, createError);
          throw createError;
        }
      } else {
        console.error(`❌ Error checking bucket '${this.bucketName}':`, error);
        throw error;
      }
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      (('name' in error && error.name === 'NotFound') ||
        ('name' in error && error.name === 'NoSuchBucket') ||
        ('$metadata' in error &&
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404))
    );
  }

  private getObjectKey(worldId: string, x: number, y: number): string {
    return `chunks/${worldId}/${x}/${y}.json`;
  }

  async getChunk(worldId: string, x: number, y: number): Promise<ChunkData | null> {
    if (!this.s3Client || !this.isConnected) {
      return null;
    }

    try {
      const key = this.getObjectKey(worldId, x, y);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        return null;
      }

      const data = await this.streamToString(response.Body as ReadableStream);
      const chunkData = JSON.parse(data);

      return chunkData;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }

      console.error('❌ Error reading from MinIO storage:', error);
      return null;
    }
  }

  async saveChunk(worldId: string, x: number, y: number, data: ChunkData): Promise<void> {
    if (!this.s3Client || !this.isConnected) {
      return;
    }

    try {
      const key = this.getObjectKey(worldId, x, y);
      const serializedData = JSON.stringify(data);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: serializedData,
        ContentType: 'application/json',
        Metadata: {
          worldId,
          chunkX: x.toString(),
          chunkY: y.toString(),
          size: serializedData.length.toString(),
        },
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('❌ Error writing to MinIO storage:', error);
    }
  }

  async deleteChunk(worldId: string, x: number, y: number): Promise<void> {
    if (!this.s3Client || !this.isConnected) {
      return;
    }

    try {
      const key = this.getObjectKey(worldId, x, y);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('❌ Error deleting from MinIO storage:', error);
    }
  }

  async clearWorld(worldId: string): Promise<void> {
    if (!this.s3Client || !this.isConnected) {
      return;
    }

    try {
      const prefix = `chunks/${worldId}/`;

      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: 1000, // Process in batches
      });

      let continuationToken: string | undefined;

      do {
        if (continuationToken) {
          listCommand.input.ContinuationToken = continuationToken;
        }

        const listResponse = await this.s3Client.send(listCommand);

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deletePromises = listResponse.Contents.map(async (object: _Object) => {
            if (object.Key) {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: object.Key,
              });
              await this.s3Client!.send(deleteCommand);
              return 1;
            }
            return 0;
          });

          await Promise.all(deletePromises);
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);
    } catch (error) {
      console.error('❌ Error clearing world storage:', error);
    }
  }

  async getStorageStats(): Promise<{
    connected: boolean;
    bucketName: string;
    objectCount?: number;
    totalSize?: number;
  }> {
    if (!this.s3Client || !this.isConnected) {
      return { connected: false, bucketName: this.bucketName };
    }

    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'chunks/',
        MaxKeys: 1000,
      });

      const response = await this.s3Client.send(listCommand);
      const objectCount = response.KeyCount || 0;
      const totalSize =
        response.Contents?.reduce((sum: number, obj: _Object) => sum + (obj.Size || 0), 0) || 0;

      return {
        connected: true,
        bucketName: this.bucketName,
        objectCount,
        totalSize,
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return { connected: false, bucketName: this.bucketName };
    }
  }

  isAvailable(): boolean {
    return this.s3Client !== null && this.isConnected;
  }

  private async streamToString(stream: NodeJS.ReadableStream | ReadableStream): Promise<string> {
    const chunks: string[] = [];

    if ('getReader' in stream) {
      // Handle ReadableStream (browser-like streams)
      const reader = stream.getReader();
      try {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle Node.js streams
      for await (const chunk of stream) {
        chunks.push(chunk.toString());
      }
    }

    return chunks.join('');
  }
}

let storageServiceInstance: StorageService | null = null;

/**
 * Get the global StorageService instance
 */
export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

export async function closeStorageService(): Promise<void> {
  if (storageServiceInstance) {
    storageServiceInstance = null;
  }
}
