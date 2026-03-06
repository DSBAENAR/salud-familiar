import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { resolveUploadPath, buildUploadUrl, UPLOADS_DIR } from "@/lib/uploads";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { especialidad } = body;

    if (!especialidad) {
      return NextResponse.json(
        { error: "Especialidad es requerida" },
        { status: 400 }
      );
    }

    const autId = parseInt(id);

    // Get current authorization to check for files to move
    const current = await db
      .select()
      .from(schema.autorizaciones)
      .where(eq(schema.autorizaciones.id, autId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json(
        { error: "Autorizacion no encontrada" },
        { status: 404 }
      );
    }

    const oldEspecialidad = current[0].especialidad;

    // Update authorization
    await db
      .update(schema.autorizaciones)
      .set({ especialidad })
      .where(eq(schema.autorizaciones.id, autId));

    // Update associated cita if exists (same emailId + "_cita")
    if (current[0].emailId) {
      await db
        .update(schema.citas)
        .set({ especialidad })
        .where(eq(schema.citas.emailId, current[0].emailId + "_cita"));
    }

    // Move files from old folder to new folder
    const needsMove = oldEspecialidad === "Por clasificar" || oldEspecialidad === "Sin especificar";
    if (needsMove) {
      const oldDir = path.join(UPLOADS_DIR, oldEspecialidad.replace(/\s+/g, "_"), "autorizacion");
      const newDir = path.join(
        UPLOADS_DIR,
        especialidad.replace(/\s+/g, "_"),
        "autorizacion"
      );

      if (fs.existsSync(oldDir)) {
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }

        // Move related documents
        const docs = await db
          .select()
          .from(schema.documentos)
          .where(eq(schema.documentos.emailId, current[0].emailId || ""));

        for (const doc of docs) {
          const oldPath = resolveUploadPath(doc.rutaArchivo);
          if (fs.existsSync(oldPath)) {
            const fileName = path.basename(doc.rutaArchivo);
            const newPath = path.join(newDir, fileName);
            fs.renameSync(oldPath, newPath);

            const newRelative = buildUploadUrl(especialidad, "autorizacion", fileName);
            await db
              .update(schema.documentos)
              .set({ especialidad, rutaArchivo: newRelative })
              .where(eq(schema.documentos.id, doc.id));
          }
        }
      }
    }

    return NextResponse.json({ success: true, especialidad });
  } catch (error) {
    console.error("[PATCH /api/autorizaciones]", error);
    return NextResponse.json(
      { error: "Error al actualizar" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const autId = parseInt(id);

    const current = await db
      .select()
      .from(schema.autorizaciones)
      .where(eq(schema.autorizaciones.id, autId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const emailId = current[0].emailId;

    if (emailId) {
      // Delete associated cita
      await db
        .delete(schema.citas)
        .where(eq(schema.citas.emailId, emailId + "_cita"));

      // Delete associated documents and their files
      const docs = await db
        .select()
        .from(schema.documentos)
        .where(eq(schema.documentos.emailId, emailId));

      for (const doc of docs) {
        const filePath = resolveUploadPath(doc.rutaArchivo);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await db
        .delete(schema.documentos)
        .where(eq(schema.documentos.emailId, emailId));
    }

    // Delete the authorization
    await db
      .delete(schema.autorizaciones)
      .where(eq(schema.autorizaciones.id, autId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/autorizaciones]", error);
    return NextResponse.json(
      { error: "Error al eliminar" },
      { status: 500 }
    );
  }
}
