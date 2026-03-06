import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const PACIENTE_ID = 1;

export async function GET() {
  try {
    const autorizaciones = await db
      .select()
      .from(schema.autorizaciones)
      .where(eq(schema.autorizaciones.pacienteId, PACIENTE_ID))
      .orderBy(schema.autorizaciones.createdAt);

    return NextResponse.json(autorizaciones);
  } catch (error) {
    console.error("[GET /api/autorizaciones]", error);
    return NextResponse.json(
      { error: "Error al obtener las autorizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { especialidad, tipo, numero, estado, fechaAprobacion, especialidadId, emailId } = body;

    if (!especialidad || !tipo) {
      return NextResponse.json(
        { error: "Los campos especialidad y tipo son obligatorios" },
        { status: 400 }
      );
    }

    const tiposValidos = ["consulta", "procedimiento", "examen"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `El tipo debe ser uno de: ${tiposValidos.join(", ")}` },
        { status: 400 }
      );
    }

    const [nueva] = await db
      .insert(schema.autorizaciones)
      .values({
        pacienteId: PACIENTE_ID,
        especialidadId: especialidadId ?? null,
        especialidad,
        numero: numero ?? null,
        tipo,
        estado: estado ?? "pendiente",
        fechaAprobacion: fechaAprobacion ?? null,
        emailId: emailId ?? null,
      })
      .returning();

    const session = await auth();
    await logActivity(
      session?.user?.email || "desconocido",
      "autorizacion_creada",
      `${especialidad} (${tipo})`
    );

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error("[POST /api/autorizaciones]", error);
    return NextResponse.json(
      { error: "Error al crear la autorización" },
      { status: 500 }
    );
  }
}
