import 'dotenv/config';
import { testConnection, closeConnection } from '../database/connection';

export default defineNitroPlugin(async (nitroApp) => {
  try {
    await testConnection();
    console.log('🗄️  Database connection initialized');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    // Don't throw error to prevent server from crashing
    // The application can still work without database connection
  }

  nitroApp.hooks.hook('close', async () => {
    await closeConnection();
  });
});
