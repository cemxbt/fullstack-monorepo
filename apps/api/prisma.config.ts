import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL is only required by commands that talk to the database (migrate),
// so `prisma generate` still works on a fresh clone without a .env file.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(url ? { datasource: { url } } : {}),
});
