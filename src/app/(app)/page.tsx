import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  Calendar,
  FileCheck,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const meses = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const estadoStyles: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-blue-100 text-blue-800",
  aprobada: "bg-green-100 text-green-800",
  solicitada: "bg-purple-100 text-purple-800",
  completada: "bg-gray-100 text-gray-600",
  rechazada: "bg-red-100 text-red-800",
  cancelada: "bg-red-100 text-red-800",
  en_proceso: "bg-blue-100 text-blue-800",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  aprobada: "Aprobada",
  solicitada: "Solicitada",
  completada: "Completada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  en_proceso: "En proceso",
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[estado] || "bg-gray-100 text-gray-800"}`}>
      {estadoLabels[estado] || estado}
    </span>
  );
}

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const citas = await db.select().from(schema.citas).where(eq(schema.citas.pacienteId, 1)).orderBy(schema.citas.fecha);
  const autorizaciones = await db.select().from(schema.autorizaciones).where(eq(schema.autorizaciones.pacienteId, 1)).orderBy(schema.autorizaciones.createdAt);
  const ordenesResult = await db.select().from(schema.ordenes).where(eq(schema.ordenes.pacienteId, 1));

  const hoy = new Date().toISOString().split("T")[0];
  const citasProximas = citas.filter((c) => c.fecha >= hoy && c.estado !== "cancelada" && c.estado !== "completada");
  const autPendientes = autorizaciones.filter((a) => a.estado === "pendiente" || a.estado === "solicitada");
  const ordPendientes = ordenesResult.filter((o) => o.estado === "pendiente");
  const autAprobadas = autorizaciones.filter((a) => a.estado === "aprobada");

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-muted-foreground truncate">Citas proximas</p>
                <p className="text-2xl lg:text-3xl font-bold">{citasProximas.length}</p>
              </div>
              <Calendar className="h-8 w-8 lg:h-10 lg:w-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-muted-foreground truncate">Autorizaciones pendientes</p>
                <p className="text-2xl lg:text-3xl font-bold">{autPendientes.length}</p>
              </div>
              <FileCheck className="h-8 w-8 lg:h-10 lg:w-10 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-muted-foreground truncate">Ordenes por tramitar</p>
                <p className="text-2xl lg:text-3xl font-bold">{ordPendientes.length}</p>
              </div>
              <ClipboardList className="h-8 w-8 lg:h-10 lg:w-10 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-muted-foreground truncate">Autorizaciones aprobadas</p>
                <p className="text-2xl lg:text-3xl font-bold">{autAprobadas.length}</p>
              </div>
              <FileCheck className="h-8 w-8 lg:h-10 lg:w-10 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {(autPendientes.length > 0 || ordPendientes.length > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900">Acciones pendientes</p>
                {autPendientes.map((a) => (
                  <p key={a.id} className="text-sm text-amber-800">
                    Autorizar: {a.especialidad} ({a.tipo})
                  </p>
                ))}
                {ordPendientes.map((o) => (
                  <p key={o.id} className="text-sm text-amber-800">
                    Tramitar orden: {o.descripcion}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Proximas citas</CardTitle>
            <Link href="/citas" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {citasProximas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay citas programadas</p>
            ) : (
              <div className="space-y-3">
                {citasProximas.slice(0, 5).map((cita) => (
                  <div key={cita.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center bg-blue-100 text-blue-700 rounded-lg px-3 py-2 min-w-[56px]">
                      <span className="text-lg font-bold leading-none">{cita.fecha.split("-")[2]}</span>
                      <span className="text-xs mt-0.5">{meses[parseInt(cita.fecha.split("-")[1])]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{cita.especialidad}</p>
                        <EstadoBadge estado={cita.estado} />
                      </div>
                      {cita.profesional && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" /> {cita.profesional}
                        </p>
                      )}
                      {cita.hora && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {cita.hora}
                        </p>
                      )}
                      {cita.lugar && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {cita.lugar}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Autorizaciones recientes</CardTitle>
            <Link href="/autorizaciones" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {autorizaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay autorizaciones registradas</p>
            ) : (
              <div className="space-y-3">
                {autorizaciones.slice(0, 5).map((aut) => (
                  <div key={aut.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-center bg-green-100 text-green-700 rounded-lg p-3">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{aut.especialidad}</p>
                        <EstadoBadge estado={aut.estado} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {aut.tipo.charAt(0).toUpperCase() + aut.tipo.slice(1)}
                        {aut.numero && ` - #${aut.numero}`}
                      </p>
                      {aut.fechaAprobacion && (
                        <p className="text-xs text-muted-foreground">Aprobada: {aut.fechaAprobacion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
