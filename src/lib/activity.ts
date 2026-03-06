import { db, schema } from "@/lib/db";

export async function logActivity(
  usuario: string,
  accion: string,
  detalle?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.insert(schema.actividad).values({
      usuario,
      accion,
      detalle: detalle ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (e) {
    console.error("[logActivity]", e);
  }
}
