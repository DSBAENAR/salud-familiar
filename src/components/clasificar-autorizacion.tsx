"use client";

import { useState } from "react";
import { FileCheck, Hash, Check, Loader2, FileText, ExternalLink, Lock, Trash2 } from "lucide-react";
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

interface Autorizacion {
  id: number;
  especialidad: string;
  numero: string | null;
  tipo: string;
  estado: string;
  fechaAprobacion: string | null;
  documentos: Documento[];
}

interface Props {
  autorizaciones: Autorizacion[];
  especialidades: string[];
}

export function ClasificarAutorizaciones({ autorizaciones, especialidades }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  const handleSave = async (id: number) => {
    const especialidad = selected[id];
    if (!especialidad) return;

    setSaving((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/autorizaciones/${id}`, {
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

  const handleDelete = async (id: number) => {
    setDeleting((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/autorizaciones/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDone((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => router.refresh(), 500);
      }
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (autorizaciones.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Por clasificar</h2>
        <p className="text-sm text-muted-foreground">
          {autorizaciones.length} autorizacion(es) necesitan especialidad. Revisa el documento para decidir.
        </p>
      </div>

      {autorizaciones.map((aut) => (
        <Card
          key={aut.id}
          className={`transition-all border-l-4 border-l-orange-400 ${done[aut.id] ? "opacity-50" : "hover:shadow-md"}`}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center bg-orange-100 text-orange-700 rounded-lg p-3">
                <FileCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                    Aprobada
                  </span>
                  {aut.numero && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {aut.numero}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {aut.tipo.charAt(0).toUpperCase() + aut.tipo.slice(1)}
                  {aut.fechaAprobacion && ` - ${aut.fechaAprobacion}`}
                </p>

                {/* Documentos adjuntos */}
                {aut.documentos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aut.documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2">
                        <a
                          href={doc.rutaArchivo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            doc.encriptado
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {doc.nombre}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {doc.encriptado && (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              <Lock className="h-3 w-3" />
                              No se pudo desencriptar
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                              onClick={() => handleDelete(aut.id)}
                              disabled={deleting[aut.id] || done[aut.id]}
                            >
                              {deleting[aut.id] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {aut.documentos.length === 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground italic">
                      Sin documento adjunto
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                      onClick={() => handleDelete(aut.id)}
                      disabled={deleting[aut.id] || done[aut.id]}
                    >
                      {deleting[aut.id] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selected[aut.id] || ""}
                  onValueChange={(value) =>
                    setSelected((prev) => ({ ...prev, [aut.id]: value }))
                  }
                  disabled={done[aut.id]}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Elegir especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp} value={esp}>
                        {esp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleSave(aut.id)}
                  disabled={!selected[aut.id] || saving[aut.id] || done[aut.id]}
                >
                  {saving[aut.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : done[aut.id] ? (
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
