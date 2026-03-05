import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET() {
  try {
    const especialidades = await db
      .select()
      .from(schema.especialidades)
      .where(eq(schema.especialidades.pacienteId, PACIENTE_ID))
      .orderBy(schema.especialidades.nombre);

    return NextResponse.json(especialidades);
  } catch (error) {
    console.error("[GET /api/especialidades]", error);
    return NextResponse.json(
      { error: "Error al obtener las especialidades" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre } = await request.json();

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(schema.especialidades)
      .where(
        and(
          eq(schema.especialidades.pacienteId, PACIENTE_ID),
          eq(schema.especialidades.nombre, nombre.trim())
        )
      )
      .limit(1);

    if (existente.length > 0) {
      return NextResponse.json(
        { error: "Esta especialidad ya existe" },
        { status: 409 }
      );
    }

    const [nueva] = await db
      .insert(schema.especialidades)
      .values({ nombre: nombre.trim(), pacienteId: PACIENTE_ID })
      .returning();

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error("[POST /api/especialidades]", error);
    return NextResponse.json(
      { error: "Error al crear la especialidad" },
      { status: 500 }
    );
  }
}
