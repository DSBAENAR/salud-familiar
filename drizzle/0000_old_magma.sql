CREATE TABLE `autorizaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`especialidad_id` integer,
	`especialidad` text NOT NULL,
	`numero` text,
	`tipo` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`fecha_aprobacion` text,
	`email_id` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `citas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`especialidad_id` integer,
	`especialidad` text NOT NULL,
	`profesional` text,
	`fecha` text NOT NULL,
	`hora` text,
	`lugar` text,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`notas` text,
	`autorizacion_id` integer,
	`email_id` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`autorizacion_id`) REFERENCES `autorizaciones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`especialidad_id` integer,
	`especialidad` text NOT NULL,
	`tipo` text NOT NULL,
	`nombre` text NOT NULL,
	`ruta_archivo` text NOT NULL,
	`email_id` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `especialidades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`paciente_id` integer NOT NULL,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ordenes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`especialidad_id` integer,
	`especialidad` text NOT NULL,
	`descripcion` text NOT NULL,
	`tipo` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`email_id` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pacientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`identificacion` text NOT NULL,
	`eps` text DEFAULT 'Sura' NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
