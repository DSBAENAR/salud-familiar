import path from "path";

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

/**
 * Convert a rutaArchivo (e.g. "/uploads/esp/tipo/file.pdf" or "/api/uploads/esp/tipo/file.pdf")
 * to an absolute filesystem path using UPLOADS_DIR.
 */
export function resolveUploadPath(rutaArchivo: string): string {
  // Strip /api/uploads/ or /uploads/ prefix to get relative path
  const relative = rutaArchivo
    .replace(/^\/api\/uploads\//, "")
    .replace(/^\/uploads\//, "");
  return path.join(UPLOADS_DIR, relative);
}

/**
 * Build the URL-safe rutaArchivo for a document served via the API route.
 */
export function buildUploadUrl(especialidad: string, tipo: string, fileName: string): string {
  return `/api/uploads/${especialidad.replace(/\s+/g, "_")}/${tipo}/${fileName}`;
}
