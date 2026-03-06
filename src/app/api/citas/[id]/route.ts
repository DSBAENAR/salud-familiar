import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citaId = parseInt(id);
    const body = await request.json();

    const current = await db
      .select()
      .from(schema.citas)
      .where(eq(schema.citas.id, citaId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const allowedFields = [
      "especialidad",
      "profesional",
      "fecha",
      "hora",
      "lugar",
      "direccion",
      "estado",
      "notas",
      "observaciones",
    ] as const;

    const updates: Record<string, string | null> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] ?? null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.citas)
      .set(updates)
      .where(eq(schema.citas.id, citaId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/citas]", error);
    return NextResponse.json({ error: "Error al actualizar la cita" }, { status: 500 });
  }
}
