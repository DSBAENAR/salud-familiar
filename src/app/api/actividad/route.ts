import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = "dsbaenar@gmail.com";

export async function GET() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const registros = await db
      .select()
      .from(schema.actividad)
      .orderBy(desc(schema.actividad.createdAt))
      .limit(100);

    return NextResponse.json(registros);
  } catch (error) {
    console.error("[GET /api/actividad]", error);
    return NextResponse.json(
      { error: "Error al obtener actividad" },
      { status: 500 }
    );
  }
}
