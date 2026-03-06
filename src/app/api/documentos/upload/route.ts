import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { UPLOADS_DIR } from "@/lib/uploads";

const PACIENTE_ID = 1;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const especialidad = formData.get("especialidad") as string | null;
    const tipo = formData.get("tipo") as string | null;

    if (!file || !especialidad || !tipo) {
      return NextResponse.json(
        { error: "Archivo, especialidad y tipo son obligatorios" },
        { status: 400 }
      );
    }

    const tiposValidos = [
      "historia_clinica",
      "orden",
      "autorizacion",
      "examen",
      "medicamento",
      "cita",
    ];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo invalido: ${tipo}` },
        { status: 400 }
      );
    }

    // Ensure the specialty exists
    const espExistente = await db
      .select()
      .from(schema.especialidades)
      .where(eq(schema.especialidades.nombre, especialidad))
      .limit(1);

    let especialidadId: number | null = null;
    if (espExistente.length > 0) {
      especialidadId = espExistente[0].id;
    } else {
      const [nueva] = await db
        .insert(schema.especialidades)
        .values({ nombre: especialidad, pacienteId: PACIENTE_ID })
        .returning();
      especialidadId = nueva.id;
    }

    const sanitize = (s: string) =>
      s.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\-_.]/g, "").trim();
    const timestamp = Date.now();
    const ext = path.extname(file.name) || ".pdf";
    const safeName = sanitize(path.basename(file.name, ext));

    const dirPath = path.join(UPLOADS_DIR, sanitize(especialidad), tipo);
    await mkdir(dirPath, { recursive: true });
    const fileName = `${timestamp}_${safeName}${ext}`;
    const filePath = path.join(dirPath, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const rutaArchivo = `/api/uploads/${sanitize(especialidad)}/${tipo}/${fileName}`;

    const [nuevo] = await db
      .insert(schema.documentos)
      .values({
        pacienteId: PACIENTE_ID,
        especialidadId,
        especialidad,
        tipo,
        nombre: file.name,
        rutaArchivo,
        encriptado: false,
      })
      .returning();

    const session = await auth();
    await logActivity(
      session?.user?.email || "desconocido",
      "documento_subido",
      `${tipo} - ${especialidad}`,
      { nombre: file.name, documentoId: nuevo.id }
    );

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documentos/upload]", error);
    return NextResponse.json(
      { error: "Error al subir el documento" },
      { status: 500 }
    );
  }
}
