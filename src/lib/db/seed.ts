import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "salud-familiar.db");
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");

// Seed paciente
sqlite.exec(`
  INSERT OR IGNORE INTO pacientes (id, nombre, identificacion, eps)
  VALUES (1, 'Alvaro Baena Montalvo', '---', 'Sura');
`);

// Seed especialidades
const especialidades = [
  "Fisiatría",
  "Neumología",
  "Neuromédica",
  "Protección Renal",
  "Urgencias",
  "Urología",
  "Medicina Interna",
  "Hematología",
];

const insert = sqlite.prepare(
  "INSERT OR IGNORE INTO especialidades (nombre, paciente_id) VALUES (?, 1)"
);

for (const esp of especialidades) {
  insert.run(esp);
}

// Seed cita de ejemplo (la del correo)
sqlite.exec(`
  INSERT OR IGNORE INTO citas (id, paciente_id, especialidad, profesional, fecha, hora, lugar, estado)
  VALUES (1, 1, 'Medicina Interna', 'Alejandro Botello Gil', '2026-04-10', '06:20', 'IPS Colsubsidio Plaz, CR 65 # 11 - 50 LCAL 247 A CCIAL Plaza Central', 'confirmada');
`);

// Seed autorización de ejemplo
sqlite.exec(`
  INSERT OR IGNORE INTO autorizaciones (id, paciente_id, especialidad, numero, tipo, estado, fecha_aprobacion)
  VALUES (1, 1, 'Medicina Interna', '2748-189579802', 'consulta', 'aprobada', '2026-03-05');
`);

console.log("Seed completado.");
sqlite.close();
