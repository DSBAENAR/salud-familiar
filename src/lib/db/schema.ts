import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const pacientes = sqliteTable("pacientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  identificacion: text("identificacion").notNull(),
  eps: text("eps").notNull().default("Sura"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const especialidades = sqliteTable("especialidades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientes.id),
});

export const citas = sqliteTable("citas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pacienteId: integer("paciente_id").notNull().references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(() => especialidades.id),
  especialidad: text("especialidad").notNull(),
  profesional: text("profesional"),
  fecha: text("fecha").notNull(),
  hora: text("hora"),
  lugar: text("lugar"),
  estado: text("estado").notNull().default("pendiente"), // pendiente, confirmada, completada, cancelada
  notas: text("notas"),
  autorizacionId: integer("autorizacion_id").references(() => autorizaciones.id),
  emailId: text("email_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const autorizaciones = sqliteTable("autorizaciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pacienteId: integer("paciente_id").notNull().references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(() => especialidades.id),
  especialidad: text("especialidad").notNull(),
  numero: text("numero"),
  tipo: text("tipo").notNull(), // consulta, procedimiento, examen
  estado: text("estado").notNull().default("pendiente"), // pendiente, solicitada, aprobada, rechazada
  fechaAprobacion: text("fecha_aprobacion"),
  emailId: text("email_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const documentos = sqliteTable("documentos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pacienteId: integer("paciente_id").notNull().references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(() => especialidades.id),
  especialidad: text("especialidad").notNull(),
  tipo: text("tipo").notNull(), // historia_clinica, orden, autorizacion, examen, medicamento, cita
  nombre: text("nombre").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  encriptado: integer("encriptado", { mode: "boolean" }).notNull().default(false),
  emailId: text("email_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const emailsProcesados = sqliteTable("emails_procesados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailId: text("email_id").notNull().unique(),
  tipo: text("tipo").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const ordenes = sqliteTable("ordenes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pacienteId: integer("paciente_id").notNull().references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(() => especialidades.id),
  especialidad: text("especialidad").notNull(),
  descripcion: text("descripcion").notNull(),
  tipo: text("tipo").notNull(), // remision, examen, medicamento
  estado: text("estado").notNull().default("pendiente"), // pendiente, en_proceso, completada
  emailId: text("email_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
