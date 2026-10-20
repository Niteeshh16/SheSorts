import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { checkDbConnection, pool } from './config/db';
import { runMigration } from './db/migrate';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Check database connectivity
  console.log('Connecting to PostgreSQL database...');
  const isConnected = await checkDbConnection();

  if (isConnected) {
    console.log('✅ Connected to PostgreSQL successfully.');
    // Run schema migrations automatically on startup
    try {
      await runMigration();
    } catch (migrationError) {
      console.warn('⚠️  Auto-migration encountered an issue (you can also run "npm run db:migrate"):', migrationError);
    }
  } else {
    console.warn('⚠️  Could not connect to PostgreSQL. Please ensure your database is running and check your .env settings.');
  }

  server.listen(env.PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Authentication Server running on port ${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`🔐 Auth Endpoints: http://localhost:${env.PORT}/api/auth`);
    console.log('====================================================');
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('PostgreSQL connection pool closed.');
      } catch (err) {
        console.error('Error closing database pool:', err);
      }
      process.exit(0);
    });

    // Force shutdown after timeout if pending connections hang
    setTimeout(() => {
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
