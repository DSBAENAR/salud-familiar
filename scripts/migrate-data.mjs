/**
 * Migrates data from local SQLite to Neon PostgreSQL.
 * Usage: node scripts/migrate-data.mjs
 */
import Database from "better-sqlite3";
import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const local = new Database("salud-familiar.db", { readonly: true });
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const tables = [
  {
    name: "pacientes",
    cols: ["id", "nombre", "identificacion", "eps", "created_at"],
  },
  {
    name: "especialidades",
    cols: ["id", "nombre", "paciente_id"],
  },
  {
    name: "autorizaciones",
    cols: ["id", "paciente_id", "especialidad_id", "especialidad", "numero", "tipo", "estado", "fecha_aprobacion", "email_id", "created_at"],
  },
  {
    name: "citas",
    cols: ["id", "paciente_id", "especialidad_id", "especialidad", "profesional", "fecha", "hora", "lugar", "estado", "notas", "autorizacion_id", "email_id", "created_at"],
  },
  {
    name: "documentos",
    cols: ["id", "paciente_id", "especialidad_id", "especialidad", "tipo", "nombre", "ruta_archivo", "encriptado", "drive_file_id", "email_id", "created_at"],
  },
  {
    name: "emails_procesados",
    cols: ["id", "email_id", "tipo", "created_at"],
  },
  {
    name: "ordenes",
    cols: ["id", "paciente_id", "especialidad_id", "especialidad", "descripcion", "tipo", "estado", "email_id", "created_at"],
  },
  {
    name: "tareas",
    cols: ["id", "paciente_id", "autorizacion_id", "orden_id", "descripcion", "completada", "fecha_limite", "created_at"],
  },
];

async function migrate() {
  await client.connect();

  for (const table of tables) {
    const rows = local.prepare(`SELECT * FROM ${table.name}`).all();
    if (rows.length === 0) {
      console.log(`  ${table.name}: 0 rows (skip)`);
      continue;
    }

    // Clear existing data
    await client.query(`DELETE FROM ${table.name}`);

    for (const row of rows) {
      const values = table.cols.map((c) => {
        let val = row[c];
        // Convert SQLite booleans (0/1) to PostgreSQL booleans
        if (c === "encriptado" || c === "completada") {
          val = val === 1 || val === true;
        }
        // Convert SQLite datetime strings to proper timestamps
        if (c === "created_at" && typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) {
          return val;
        }
        return val ?? null;
      });

      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table.name} (${table.cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      try {
        await client.query(sql, values);
      } catch (err) {
        console.error(`  Error inserting into ${table.name}:`, err.message);
      }
    }

    // Reset sequence to max id
    const maxId = Math.max(...rows.map((r) => r.id || 0));
    if (maxId > 0) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), $1)`, [maxId]);
    }

    console.log(`  ${table.name}: ${rows.length} rows migrated`);
  }

  await client.end();
  local.close();
  console.log("\nDone!");
}

migrate().catch(console.error);
