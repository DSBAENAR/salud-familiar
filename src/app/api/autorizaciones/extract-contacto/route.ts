import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { extractDatosAutorizacion } from "@/lib/pdf/extract-contacto";
import { resolveUploadPath } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    // Find autorizaciones without contact info that have linked PDFs
    const autorizaciones = await db
      .select()
      .from(schema.autorizaciones)
      .where(
        and(
          eq(schema.autorizaciones.pacienteId, 1),
          isNull(schema.autorizaciones.telefonoContacto)
        )
      );

    let updated = 0;
    const results: { id: number; especialidad: string; telefono: string | null; esWhatsapp: boolean }[] = [];

    for (const aut of autorizaciones) {
      // Find PDF documents linked to this authorization's email
      if (!aut.emailId) continue;

      const docs = await db
        .select()
        .from(schema.documentos)
        .where(
          and(
            eq(schema.documentos.emailId, aut.emailId),
            eq(schema.documentos.pacienteId, 1)
          )
        );

      for (const doc of docs) {
        if (!doc.nombre.toLowerCase().endsWith(".pdf")) continue;

        try {
          const fullPath = resolveUploadPath(doc.rutaArchivo);
          const pdfData = await extractDatosAutorizacion(fullPath);

          if (pdfData?.telefonoContacto) {
            await db
              .update(schema.autorizaciones)
              .set({
                telefonoContacto: pdfData.telefonoContacto,
                lugarAtencion: pdfData.lugarAtencion || null,
                vigencia: pdfData.vigencia || null,
                esWhatsapp: pdfData.esWhatsapp,
              })
              .where(eq(schema.autorizaciones.id, aut.id));

            updated++;
            results.push({
              id: aut.id,
              especialidad: aut.especialidad,
              telefono: pdfData.telefonoContacto,
              esWhatsapp: pdfData.esWhatsapp,
            });
            break;
          }
        } catch {
          // Skip PDFs that can't be read
        }
      }
    }

    return NextResponse.json({ updated, results });
  } catch (error) {
    console.error("[POST /api/autorizaciones/extract-contacto]", error);
    return NextResponse.json(
      { error: "Error al extraer contactos" },
      { status: 500 }
    );
  }
}
