import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { especialidad } = body;

    if (!especialidad) {
      return NextResponse.json({ error: "Especialidad es requerida" }, { status: 400 });
    }

    const ordenId = parseInt(id);

    const current = await db
      .select()
      .from(schema.ordenes)
      .where(eq(schema.ordenes.id, ordenId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const oldEspecialidad = current[0].especialidad;

    // Update the order
    await db
      .update(schema.ordenes)
      .set({ especialidad })
      .where(eq(schema.ordenes.id, ordenId));

    // Move the linked document file and update its record
    if (oldEspecialidad !== especialidad && current[0].emailId) {
      const docs = await db
        .select()
        .from(schema.documentos)
        .where(eq(schema.documentos.emailId, current[0].emailId));

      // Find the specific doc matching this order's filename
      const fileName = current[0].descripcion.replace("Orden de remision: ", "");
      const doc = docs.find((d) => d.nombre === fileName && d.tipo === "orden");

      if (doc) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        const oldPath = path.join(process.cwd(), "public", doc.rutaArchivo);
        const newDir = path.join(uploadsDir, especialidad.replace(/\s+/g, "_"), "orden");

        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }

        if (fs.existsSync(oldPath)) {
          const newPath = path.join(newDir, doc.nombre);
          fs.renameSync(oldPath, newPath);
        }

        const newRelative = `/uploads/${especialidad.replace(/\s+/g, "_")}/orden/${doc.nombre}`;
        await db
          .update(schema.documentos)
          .set({ especialidad, rutaArchivo: newRelative })
          .where(eq(schema.documentos.id, doc.id));
      }
    }

    return NextResponse.json({ success: true, especialidad });
  } catch (error) {
    console.error("[PATCH /api/ordenes]", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
