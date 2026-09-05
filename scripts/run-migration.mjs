import { Client } from 'pg';
import fs from 'fs';

const PROJECT_REF = 'szlfywgscnowxnhohpac';
const PASSWORD = 'hiStLXKNfOGmMOXh';
const HOST = `db.${PROJECT_REF}.supabase.co`;
const PORT = 5432;

const sqlFile = process.argv[2];
if (!sqlFile) { console.error('Usage: node scripts/run-migration.mjs <file.sql>'); process.exit(1); }

const client = new Client({
  host: HOST,
  port: PORT,
  user: 'postgres',
  password: PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connected to Supabase pooler.');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  const res = await client.query(sql);
  console.log('Migration applied. Rows affected:', JSON.stringify(res));
  await client.end();
} catch (err) {
  console.error('MIGRATION FAILED:', err.message);
  process.exit(1);
}