import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Calendar, Clock, MapPin, User, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const estadoStyles: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-blue-100 text-blue-800",
  completada: "bg-gray-100 text-gray-600",
  cancelada: "bg-red-100 text-red-800",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const dynamic = "force-dynamic";

export default async function CitasPage() {
  const citas = await db
    .select()
    .from(schema.citas)
    .where(eq(schema.citas.pacienteId, 1))
    .orderBy(schema.citas.fecha);

  const proximas = citas.filter((c) => c.estado === "pendiente" || c.estado === "confirmada");
  const pasadas = citas.filter((c) => c.estado === "completada" || c.estado === "cancelada");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Proximas citas</h2>
          <p className="text-sm text-muted-foreground">{proximas.length} cita(s) programada(s)</p>
        </div>
        <Link href="/citas/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        </Link>
      </div>

      {proximas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay citas programadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proximas.map((cita) => (
            <Card key={cita.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center bg-blue-100 text-blue-700 rounded-lg px-4 py-3 min-w-[72px]">
                    <span className="text-2xl font-bold leading-none">{cita.fecha.split("-")[2]}</span>
                    <span className="text-xs mt-1">
                      {["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(cita.fecha.split("-")[1])]} {cita.fecha.split("-")[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{cita.especialidad}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[cita.estado]}`}>
                        {estadoLabels[cita.estado]}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {cita.profesional && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" /> {cita.profesional}
                        </p>
                      )}
                      {cita.hora && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" /> {cita.hora}
                        </p>
                      )}
                      {cita.lugar && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" /> {cita.lugar}
                        </p>
                      )}
                    </div>
                    {cita.notas && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{cita.notas}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pasadas.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8">Historial</h2>
          <div className="space-y-3">
            {pasadas.map((cita) => (
              <Card key={cita.id} className="opacity-70">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-gray-100 text-gray-500 rounded-lg px-4 py-3 min-w-[72px]">
                      <span className="text-2xl font-bold leading-none">{cita.fecha.split("-")[2]}</span>
                      <span className="text-xs mt-1">
                        {["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(cita.fecha.split("-")[1])]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{cita.especialidad}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[cita.estado]}`}>
                          {estadoLabels[cita.estado]}
                        </span>
                      </div>
                      {cita.profesional && (
                        <p className="text-sm text-muted-foreground">{cita.profesional}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
