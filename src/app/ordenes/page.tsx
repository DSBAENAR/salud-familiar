import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const estadoStyles: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  en_proceso: "bg-blue-100 text-blue-800",
  completada: "bg-green-100 text-green-800",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
};

const tipoLabels: Record<string, string> = {
  remision: "Remision",
  examen: "Examen",
  medicamento: "Medicamento",
};

export const dynamic = "force-dynamic";

export default async function OrdenesPage() {
  const ordenes = await db
    .select()
    .from(schema.ordenes)
    .where(eq(schema.ordenes.pacienteId, 1))
    .orderBy(schema.ordenes.createdAt);

  const pendientes = ordenes.filter((o) => o.estado === "pendiente" || o.estado === "en_proceso");
  const completadas = ordenes.filter((o) => o.estado === "completada");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ordenes medicas</h2>
          <p className="text-sm text-muted-foreground">{pendientes.length} orden(es) por tramitar</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      {pendientes.length === 0 && completadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay ordenes registradas</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendientes.length > 0 && (
            <div className="space-y-3">
              {pendientes.map((orden) => (
                <Card key={orden.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-400">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg p-3">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{orden.descripcion}</h3>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[orden.estado]}`}>
                            {estadoLabels[orden.estado]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {orden.especialidad} - {tipoLabels[orden.tipo] || orden.tipo}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 text-blue-600">
                        Tramitar <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {completadas.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mt-8">Completadas</h2>
              <div className="space-y-3">
                {completadas.map((orden) => (
                  <Card key={orden.id} className="opacity-70 border-l-4 border-l-green-400">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center bg-green-100 text-green-700 rounded-lg p-3">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{orden.descripcion}</h3>
                          <p className="text-sm text-muted-foreground">
                            {orden.especialidad} - {tipoLabels[orden.tipo] || orden.tipo}
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[orden.estado]}`}>
                          {estadoLabels[orden.estado]}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
