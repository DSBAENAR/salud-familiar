import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { FileCheck, Plus, Hash, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClasificarAutorizaciones } from "@/components/clasificar-autorizacion";
import Link from "next/link";

const estadoStyles: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  solicitada: "bg-purple-100 text-purple-800",
  aprobada: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  solicitada: "Solicitada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const dynamic = "force-dynamic";

export default async function AutorizacionesPage() {
  const autorizaciones = await db
    .select()
    .from(schema.autorizaciones)
    .where(eq(schema.autorizaciones.pacienteId, 1))
    .orderBy(schema.autorizaciones.createdAt);

  const especialidades = await db
    .select()
    .from(schema.especialidades)
    .where(eq(schema.especialidades.pacienteId, 1));

  // Fetch all documents to link to authorizations
  const documentos = await db
    .select()
    .from(schema.documentos)
    .where(eq(schema.documentos.pacienteId, 1));

  const sinEspecialidad = (esp: string) => esp === "Por clasificar" || esp === "Sin especificar";
  const porClasificar = autorizaciones
    .filter((a) => sinEspecialidad(a.especialidad))
    .map((a) => ({
      ...a,
      documentos: documentos.filter((d) => d.emailId === a.emailId),
    }));
  const pendientes = autorizaciones.filter(
    (a) => (a.estado === "pendiente" || a.estado === "solicitada") && !sinEspecialidad(a.especialidad)
  );
  const resueltas = autorizaciones.filter(
    (a) => (a.estado === "aprobada" || a.estado === "rechazada") && !sinEspecialidad(a.especialidad)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Autorizaciones</h2>
          <p className="text-sm text-muted-foreground">
            {autorizaciones.length} total - {porClasificar.length} por clasificar
          </p>
        </div>
        <Link href="/autorizaciones/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nueva autorizacion
          </Button>
        </Link>
      </div>

      {/* Por clasificar */}
      <ClasificarAutorizaciones
        autorizaciones={porClasificar}
        especialidades={especialidades.map((e) => e.nombre)}
      />

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-4">Pendientes de tramitar</h2>
          <div className="space-y-3">
            {pendientes.map((aut) => (
              <Card key={aut.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-400">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg p-3">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{aut.especialidad}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[aut.estado]}`}>
                          {estadoLabels[aut.estado]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {aut.tipo.charAt(0).toUpperCase() + aut.tipo.slice(1)}
                      </p>
                      {aut.numero && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3" /> {aut.numero}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Resueltas */}
      {resueltas.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-4">Resueltas</h2>
          <div className="space-y-3">
            {resueltas.map((aut) => (
              <Card key={aut.id} className={`hover:shadow-md transition-shadow border-l-4 ${aut.estado === "aprobada" ? "border-l-green-400" : "border-l-red-400"}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center rounded-lg p-3 ${aut.estado === "aprobada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{aut.especialidad}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[aut.estado]}`}>
                          {estadoLabels[aut.estado]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {aut.tipo.charAt(0).toUpperCase() + aut.tipo.slice(1)}
                        {aut.numero && ` - #${aut.numero}`}
                      </p>
                      {aut.fechaAprobacion && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Aprobada: {aut.fechaAprobacion}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {pendientes.length === 0 && resueltas.length === 0 && porClasificar.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay autorizaciones registradas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
