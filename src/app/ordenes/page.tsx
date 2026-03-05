import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ClipboardList, Plus, ArrowRight, FileText, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClasificarOrdenes } from "@/components/clasificar-orden";

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

  const documentos = await db
    .select()
    .from(schema.documentos)
    .where(eq(schema.documentos.pacienteId, 1));

  const especialidades = await db
    .select()
    .from(schema.especialidades)
    .where(eq(schema.especialidades.pacienteId, 1));

  // Link each orden to its specific PDF by matching the filename in the description
  const ordenesConDocs = ordenes.map((o) => {
    const doc = documentos.find(
      (d) => d.emailId === o.emailId && d.tipo === "orden" && o.descripcion.includes(d.nombre)
    );
    return { ...o, documento: doc || null };
  });

  const porClasificar = ordenesConDocs.filter(
    (o) => (o.estado === "pendiente" || o.estado === "en_proceso") && o.especialidad === "General"
  );
  const asignadas = ordenesConDocs.filter(
    (o) => (o.estado === "pendiente" || o.estado === "en_proceso") && o.especialidad !== "General"
  );
  const completadas = ordenesConDocs.filter((o) => o.estado === "completada");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ordenes medicas</h2>
          <p className="text-sm text-muted-foreground">
            {porClasificar.length + asignadas.length} orden(es) por tramitar
            {porClasificar.length > 0 && ` - ${porClasificar.length} sin asignar`}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      {porClasificar.length === 0 && asignadas.length === 0 && completadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay ordenes registradas</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {porClasificar.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Por asignar especialidad</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Revisa el PDF para decidir a que especialidad pertenece cada orden.
              </p>
              <ClasificarOrdenes
                ordenes={porClasificar}
                especialidades={especialidades.map((e) => e.nombre)}
              />
            </div>
          )}

          {asignadas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Pendientes de tramitar</h3>
              <div className="space-y-3">
                {asignadas.map((orden) => (
                  <Card key={orden.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-400">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center bg-blue-100 text-blue-700 rounded-lg p-3">
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
                          {orden.documento && (
                            <div className="mt-2 flex items-center gap-2">
                              <a
                                href={orden.documento.rutaArchivo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  orden.documento.encriptado
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Ver PDF
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {orden.documento.encriptado && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                  <Lock className="h-3 w-3" />
                                  No se pudo desencriptar
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1 text-blue-600">
                          Tramitar <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completadas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Completadas</h3>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
