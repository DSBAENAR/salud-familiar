"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

const tiposValidos = [
  { value: "historia_clinica", label: "Historia clinica" },
  { value: "orden", label: "Orden" },
  { value: "autorizacion", label: "Autorizacion" },
  { value: "examen", label: "Examen" },
  { value: "medicamento", label: "Medicamento" },
  { value: "cita", label: "Cita" },
];

export function ReclasificarDocumento({
  id,
  nombre,
  especialidadActual,
  tipoActual,
}: {
  id: number;
  nombre: string;
  especialidadActual: string;
  tipoActual: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [especialidad, setEspecialidad] = useState(especialidadActual);
  const [tipo, setTipo] = useState(tipoActual);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/especialidades")
      .then((r) => r.json())
      .then((data) => setEspecialidades(data.map((e: { nombre: string }) => e.nombre)));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/documentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especialidad, tipo }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al reclasificar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-blue-600 shrink-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="Reclasificar"
      >
        <ArrowRightLeft className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Reclasificar documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{nombre}</p>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Select value={especialidad} onValueChange={setEspecialidad}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposValidos.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
