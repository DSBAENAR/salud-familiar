import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET() {
  try {
    const ordenes = await db
      .select()
      .from(schema.ordenes)
      .where(eq(schema.ordenes.pacienteId, PACIENTE_ID))
      .orderBy(schema.ordenes.createdAt);

    return NextResponse.json(ordenes);
  } catch (error) {
    console.error("[GET /api/ordenes]", error);
    return NextResponse.json(
      { error: "Error al obtener las órdenes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { especialidad, descripcion, tipo, estado, especialidadId, emailId } = body;

    if (!especialidad || !descripcion || !tipo) {
      return NextResponse.json(
        { error: "Los campos especialidad, descripcion y tipo son obligatorios" },
        { status: 400 }
      );
    }

    const tiposValidos = ["remision", "examen", "medicamento"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `El tipo debe ser uno de: ${tiposValidos.join(", ")}` },
        { status: 400 }
      );
    }

    const [nueva] = await db
      .insert(schema.ordenes)
      .values({
        pacienteId: PACIENTE_ID,
        especialidadId: especialidadId ?? null,
        especialidad,
        descripcion,
        tipo,
        estado: estado ?? "pendiente",
        emailId: emailId ?? null,
      })
      .returning();

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error("[POST /api/ordenes]", error);
    return NextResponse.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}
