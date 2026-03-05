"use client";

import { useState } from "react";
import { ClipboardList, Check, Loader2, FileText, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Documento {
  id: number;
  nombre: string;
  rutaArchivo: string;
  encriptado: boolean;
}

interface OrdenConDoc {
  id: number;
  especialidad: string;
  descripcion: string;
  tipo: string;
  estado: string;
  documento: Documento | null;
}

const tipoLabels: Record<string, string> = {
  remision: "Remision",
  examen: "Examen",
  medicamento: "Medicamento",
};

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

export function ClasificarOrdenes({
  ordenes,
  especialidades,
}: {
  ordenes: OrdenConDoc[];
  especialidades: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});

  const handleSave = async (id: number) => {
    const especialidad = selected[id];
    if (!especialidad) return;

    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/ordenes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especialidad }),
      });
      if (res.ok) {
        setDone((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => router.refresh(), 500);
      }
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-3">
      {ordenes.map((orden) => (
        <Card
          key={orden.id}
          className={`transition-all border-l-4 border-l-amber-400 ${done[orden.id] ? "opacity-50" : "hover:shadow-md"}`}
        >
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
              <div className="flex items-center gap-2">
                <Select
                  value={selected[orden.id] || ""}
                  onValueChange={(value) =>
                    setSelected((prev) => ({ ...prev, [orden.id]: value }))
                  }
                  disabled={done[orden.id]}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleSave(orden.id)}
                  disabled={!selected[orden.id] || saving[orden.id] || done[orden.id]}
                >
                  {saving[orden.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : done[orden.id] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    "Asignar"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
