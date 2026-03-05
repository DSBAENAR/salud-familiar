/**
 * Migrates local SQLite data to Turso.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.mjs
 */
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const local = new Database("salud-familiar.db", { readonly: true });
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Create tables
const createStatements = [
  `CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    identificacion TEXT NOT NULL,
    eps TEXT NOT NULL DEFAULT 'Sura',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS especialidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id)
  )`,
  `CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    especialidad_id INTEGER REFERENCES especialidades(id),
    especialidad TEXT NOT NULL,
    profesional TEXT,
    fecha TEXT NOT NULL,
    hora TEXT,
    lugar TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    notas TEXT,
    autorizacion_id INTEGER,
    email_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS autorizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    especialidad_id INTEGER REFERENCES especialidades(id),
    especialidad TEXT NOT NULL,
    numero TEXT,
    tipo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    fecha_aprobacion TEXT,
    email_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    especialidad_id INTEGER REFERENCES especialidades(id),
    especialidad TEXT NOT NULL,
    tipo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    ruta_archivo TEXT NOT NULL,
    encriptado INTEGER NOT NULL DEFAULT 0,
    drive_file_id TEXT,
    email_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS emails_procesados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    especialidad_id INTEGER REFERENCES especialidades(id),
    especialidad TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    tipo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    email_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    autorizacion_id INTEGER REFERENCES autorizaciones(id),
    orden_id INTEGER REFERENCES ordenes(id),
    descripcion TEXT NOT NULL,
    completada INTEGER NOT NULL DEFAULT 0,
    fecha_limite TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

async function migrate() {
  console.log("Creating tables in Turso...");
  for (const sql of createStatements) {
    await turso.execute(sql);
  }

  const tables = [
    "pacientes",
    "especialidades",
    "autorizaciones",
    "citas",
    "documentos",
    "emails_procesados",
    "ordenes",
    "tareas",
  ];

  for (const table of tables) {
    const rows = local.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skip)`);
      continue;
    }

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(", ");
    const insertSql = `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

    // Batch insert in chunks of 20
    for (let i = 0; i < rows.length; i += 20) {
      const chunk = rows.slice(i, i + 20);
      const stmts = chunk.map((row) => ({
        sql: insertSql,
        args: cols.map((c) => row[c] ?? null),
      }));
      await turso.batch(stmts);
    }

    console.log(`  ${table}: ${rows.length} rows migrated`);
  }

  console.log("\nDone! Data migrated to Turso.");
  local.close();
}

migrate().catch(console.error);
