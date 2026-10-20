import fs from 'fs';
import path from 'path';
import { Client, Pool } from 'pg';
import { env } from '../config/env';

export async function runMigration(): Promise<void> {
  console.log('🔄 Running database migrations...');

  let targetDbName = env.DB_NAME;
  let maintenanceConnectionString: string | undefined;

  if (env.DATABASE_URL) {
    try {
      const parsedUrl = new URL(env.DATABASE_URL);
      targetDbName = parsedUrl.pathname.replace(/^\//, '') || env.DB_NAME;
      parsedUrl.pathname = '/postgres';
      maintenanceConnectionString = parsedUrl.toString();
    } catch {
      maintenanceConnectionString = undefined;
    }
  }

  // 1. Ensure target database exists
  const maintenanceClient = new Client(
    maintenanceConnectionString
      ? { connectionString: maintenanceConnectionString }
      : {
          host: env.DB_HOST,
          port: env.DB_PORT,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: 'postgres', // Connect to default database first
        }
  );

  try {
    await maintenanceClient.connect();
    const checkDb = await maintenanceClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkDb.rowCount === 0) {
      console.log(`Creating database "${targetDbName}"...`);
      // CREATE DATABASE cannot use parameter placeholders
      await maintenanceClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database "${targetDbName}" created successfully.`);
    }
    await maintenanceClient.end();
  } catch (err: any) {
    try {
      await maintenanceClient.end();
    } catch (_) {}
    console.warn('Note on maintenance database check:', err.message);
  }

  // 2. Connect to the target database and apply schema
  const targetPool = new Pool(
    env.DATABASE_URL
      ? { connectionString: env.DATABASE_URL }
      : {
          host: env.DB_HOST,
          port: env.DB_PORT,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: targetDbName,
        }
  );

  try {
    const candidatePaths = [
      path.join(__dirname, 'schema.sql'),
      path.resolve(process.cwd(), 'src/db/schema.sql'),
      path.resolve(process.cwd(), 'dist/db/schema.sql'),
    ];

    let schemaSql: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        schemaSql = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (!schemaSql) {
      throw new Error('schema.sql file not found in searched paths');
    }

    await targetPool.query(schemaSql);
    console.log('✅ Database migration completed successfully! Tables and indexes are ready.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await targetPool.end();
  }
}

// Execute migration when script is run directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
