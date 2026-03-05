import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const especialidad = searchParams.get("especialidad");
    const tipo = searchParams.get("tipo");

    const conditions = [eq(schema.documentos.pacienteId, PACIENTE_ID)];

    if (especialidad) {
      conditions.push(eq(schema.documentos.especialidad, especialidad));
    }

    if (tipo) {
      conditions.push(eq(schema.documentos.tipo, tipo));
    }

    const documentos = await db
      .select()
      .from(schema.documentos)
      .where(and(...conditions))
      .orderBy(schema.documentos.createdAt);

    return NextResponse.json(documentos);
  } catch (error) {
    console.error("[GET /api/documentos]", error);
    return NextResponse.json(
      { error: "Error al obtener los documentos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { especialidad, tipo, nombre, rutaArchivo, especialidadId, emailId } = body;

    if (!especialidad || !tipo || !nombre || !rutaArchivo) {
      return NextResponse.json(
        { error: "Los campos especialidad, tipo, nombre y rutaArchivo son obligatorios" },
        { status: 400 }
      );
    }

    const tiposValidos = ["historia_clinica", "orden", "autorizacion", "examen", "medicamento", "cita"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `El tipo debe ser uno de: ${tiposValidos.join(", ")}` },
        { status: 400 }
      );
    }

    const [nuevo] = await db
      .insert(schema.documentos)
      .values({
        pacienteId: PACIENTE_ID,
        especialidadId: especialidadId ?? null,
        especialidad,
        tipo,
        nombre,
        rutaArchivo,
        emailId: emailId ?? null,
      })
      .returning();

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documentos]", error);
    return NextResponse.json(
      { error: "Error al crear el documento" },
      { status: 500 }
    );
  }
}
