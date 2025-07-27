import { closeRedisClient } from '~~/server/utils/redis'

export default defineNitroPlugin(async nitro => {
  nitro.hooks.hook('close', async () => {
    console.log('Shutting down Redis connection...')
    await closeRedisClient()
  })
})
