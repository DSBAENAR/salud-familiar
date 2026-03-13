import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!, {
      fetchConnectionCache: true,
    });
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export { schema };
