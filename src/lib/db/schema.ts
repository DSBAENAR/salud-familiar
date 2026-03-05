import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const pacientes = pgTable("pacientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  identificacion: text("identificacion").notNull(),
  eps: text("eps").notNull().default("Sura"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const especialidades = pgTable("especialidades", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
});

export const autorizaciones = pgTable("autorizaciones", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(
    () => especialidades.id
  ),
  especialidad: text("especialidad").notNull(),
  numero: text("numero"),
  tipo: text("tipo").notNull(), // consulta, procedimiento, examen
  estado: text("estado").notNull().default("pendiente"),
  fechaAprobacion: text("fecha_aprobacion"),
  emailId: text("email_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const citas = pgTable("citas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(
    () => especialidades.id
  ),
  especialidad: text("especialidad").notNull(),
  profesional: text("profesional"),
  fecha: text("fecha").notNull(),
  hora: text("hora"),
  lugar: text("lugar"),
  estado: text("estado").notNull().default("pendiente"),
  notas: text("notas"),
  autorizacionId: integer("autorizacion_id").references(
    () => autorizaciones.id
  ),
  emailId: text("email_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentos = pgTable("documentos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(
    () => especialidades.id
  ),
  especialidad: text("especialidad").notNull(),
  tipo: text("tipo").notNull(),
  nombre: text("nombre").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  encriptado: boolean("encriptado").notNull().default(false),
  driveFileId: text("drive_file_id"),
  emailId: text("email_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailsProcesados = pgTable("emails_procesados", {
  id: serial("id").primaryKey(),
  emailId: text("email_id").notNull().unique(),
  tipo: text("tipo").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ordenes = pgTable("ordenes", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
  especialidadId: integer("especialidad_id").references(
    () => especialidades.id
  ),
  especialidad: text("especialidad").notNull(),
  descripcion: text("descripcion").notNull(),
  tipo: text("tipo").notNull(),
  estado: text("estado").notNull().default("pendiente"),
  emailId: text("email_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tareas = pgTable("tareas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
  autorizacionId: integer("autorizacion_id").references(
    () => autorizaciones.id
  ),
  ordenId: integer("orden_id").references(() => ordenes.id),
  descripcion: text("descripcion").notNull(),
  completada: boolean("completada").notNull().default(false),
  fechaLimite: text("fecha_limite"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
