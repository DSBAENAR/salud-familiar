"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";

interface Cita {
  id: number;
  especialidad: string;
  profesional: string | null;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  direccion: string | null;
  estado: string;
  notas: string | null;
  observaciones: string | null;
}

export function EditarCita({ cita }: { cita: Cita }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profesional, setProfesional] = useState(cita.profesional || "");
  const [fecha, setFecha] = useState(cita.fecha);
  const [hora, setHora] = useState(cita.hora || "");
  const [lugar, setLugar] = useState(cita.lugar || "");
  const [direccion, setDireccion] = useState(cita.direccion || "");
  const [estado, setEstado] = useState(cita.estado);
  const [notas, setNotas] = useState(cita.notas || "");
  const [observaciones, setObservaciones] = useState(cita.observaciones || "");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/citas/${cita.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profesional: profesional || null,
          fecha,
          hora: hora || null,
          lugar: lugar || null,
          direccion: direccion || null,
          estado,
          notas: notas || null,
          observaciones: observaciones || null,
        }),
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cita - {cita.especialidad}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profesional">Profesional</Label>
            <Input
              id="profesional"
              value={profesional}
              onChange={(e) => setProfesional(e.target.value)}
              placeholder="Nombre del profesional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lugar">Lugar / Sede</Label>
            <Input
              id="lugar"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Ej: Centro Medico Sura Plaza Central"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Direccion</Label>
            <Input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Cra 65 #11-50, Bogota"
            />
            {direccion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Ver en Google Maps
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas previas a la cita (preparacion, ayuno, etc.)"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones despues de la cita (diagnostico, indicaciones, etc.)"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !fecha}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
