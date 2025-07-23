import { createClient } from 'redis'

let redisClient: ReturnType<typeof createClient> | null = null
let redisAvailable = false

export async function getRedisClient() {
  if (!redisClient && !redisAvailable) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      })

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err)
        redisAvailable = false
      })

      redisClient.on('connect', () => {
        console.log('Redis Client Connected')
        redisAvailable = true
      })

      redisClient.on('ready', () => {
        console.log('Redis Client Ready')
        redisAvailable = true
      })

      redisClient.on('end', () => {
        console.log('Redis Client Disconnected')
        redisAvailable = false
      })

      await redisClient.connect()
    } catch (error) {
      console.warn('Redis not available, falling back to no caching:', error)
      redisAvailable = false
      redisClient = null
    }
  }

  return redisClient
}

export async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

// Helper functions for chunk caching
export async function getCachedChunk(chunkX: number, chunkY: number): Promise<number[][] | null> {
  try {
    const client = await getRedisClient()
    
    if (!client || !redisAvailable) {
      console.log(`Redis not available - Cache MISS for chunk ${chunkX},${chunkY}`)
      return null
    }
    
    const key = `chunk:${chunkX}:${chunkY}`
    const cachedData = await client.get(key)
    
    if (cachedData) {
      console.log(`Cache HIT for chunk ${chunkX},${chunkY}`)
      return JSON.parse(cachedData)
    }
    
    console.log(`Cache MISS for chunk ${chunkX},${chunkY}`)
    return null
  } catch (error) {
    console.error('Error reading from Redis cache:', error)
    return null
  }
}

export async function setCachedChunk(chunkX: number, chunkY: number, chunkData: number[][]): Promise<void> {
  try {
    const client = await getRedisClient()
    
    if (!client || !redisAvailable) {
      console.log(`Redis not available - Cannot cache chunk ${chunkX},${chunkY}`)
      return
    }
    
    const key = `chunk:${chunkX}:${chunkY}`
    
    // Cache for 1 hour (3600 seconds) to prevent infinite memory growth
    await client.setEx(key, 3600, JSON.stringify(chunkData))
    console.log(`Cached chunk ${chunkX},${chunkY}`)
  } catch (error) {
    console.error('Error writing to Redis cache:', error)
  }
}

// Optional: Clear all cached chunks (useful for debugging)
export async function clearChunkCache(): Promise<void> {
  try {
    const client = await getRedisClient()
    const keys = await client.keys('chunk:*')
    
    if (keys.length > 0) {
      await client.del(keys)
      console.log(`Cleared ${keys.length} cached chunks`)
    }
  } catch (error) {
    console.error('Error clearing chunk cache:', error)
  }
}
