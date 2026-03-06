import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { resolveUploadPath } from "@/lib/uploads";
import fs from "fs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.especialidad) updates.especialidad = body.especialidad;
    if (body.tipo) updates.tipo = body.tipo;
    if (body.nombre) updates.nombre = body.nombre;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.documentos)
      .set(updates)
      .where(eq(schema.documentos.id, docId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/documentos/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(schema.documentos)
      .where(eq(schema.documentos.id, docId))
      .limit(1);

    if (!doc) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Delete the physical file
    try {
      const filePath = resolveUploadPath(doc.rutaArchivo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error("Error deleting file:", e);
    }

    // Delete the database record
    await db.delete(schema.documentos).where(eq(schema.documentos.id, docId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/documentos/[id]]", error);
    return NextResponse.json(
      { error: "Error al eliminar el documento" },
      { status: 500 }
    );
  }
}
