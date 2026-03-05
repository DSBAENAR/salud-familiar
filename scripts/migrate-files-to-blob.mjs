/**
 * Uploads local PDF files to Vercel Blob and updates DB URLs.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate-files-to-blob.mjs
 */
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN || !BLOB_TOKEN) {
  console.error(
    "Set TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, and BLOB_READ_WRITE_TOKEN"
  );
  process.exit(1);
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function migrateFiles() {
  const result = await turso.execute(
    "SELECT id, ruta_archivo FROM documentos WHERE ruta_archivo LIKE '/uploads/%'"
  );

  console.log(`Found ${result.rows.length} local files to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const row of result.rows) {
    const id = row.id;
    const localPath = row.ruta_archivo;

    try {
      const fullPath = path.join(process.cwd(), "public", localPath);
      const buffer = await readFile(fullPath);
      const blobPath = localPath.replace(/^\//, ""); // remove leading /

      const blob = await put(blobPath, buffer, {
        access: "public",
        token: BLOB_TOKEN,
      });

      await turso.execute({
        sql: "UPDATE documentos SET ruta_archivo = ? WHERE id = ?",
        args: [blob.url, id],
      });

      migrated++;
      console.log(`  [${migrated}] ${localPath} -> ${blob.url}`);
    } catch (err) {
      errors++;
      console.error(`  [ERROR] ${localPath}: ${err.message}`);
    }
  }

  console.log(`\nDone! ${migrated} migrated, ${errors} errors.`);
}

migrateFiles().catch(console.error);
