import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { env } from '../env.js';

const client = postgres(env.databaseUrl, { max: 10 });
export const db = drizzle(client, { schema });
export { client as sql };
