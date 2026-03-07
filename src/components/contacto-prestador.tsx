"use client";

import { Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function generarMensaje(especialidad: string, numero: string | null, tipo: string): string {
  return [
    `Buenos días, quisiera agendar una cita de ${tipo.toUpperCase()} EN ${especialidad.toUpperCase()}`,
    `para el paciente ALVARO BAENA MONTALVO, CC 17029032.`,
    numero ? `Autorización No. ${numero}.` : "",
    `Quedo atento, gracias.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function ContactoPrestador({
  telefono,
  esWhatsapp,
  lugarAtencion,
  vigencia,
  especialidad,
  numero,
  tipo,
}: {
  telefono: string | null;
  esWhatsapp: boolean;
  lugarAtencion: string | null;
  vigencia: string | null;
  especialidad: string;
  numero: string | null;
  tipo: string;
}) {
  if (!telefono && !lugarAtencion && !vigencia) return null;

  const waLink = esWhatsapp && telefono
    ? `https://wa.me/57${telefono}?text=${encodeURIComponent(generarMensaje(especialidad, numero, tipo))}`
    : null;

  const telLink = telefono ? `tel:+57${telefono}` : null;

  return (
    <div className="mt-2 space-y-1.5">
      {telefono && (
        <div className="flex items-center gap-2">
          {esWhatsapp ? (
            <a href={waLink!} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 h-7 text-xs">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp {telefono}
              </Button>
            </a>
          ) : (
            <a href={telLink!}>
              <Button size="sm" variant="outline" className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50 h-7 text-xs">
                <Phone className="h-3.5 w-3.5" />
                Llamar {telefono}
              </Button>
            </a>
          )}
        </div>
      )}
      {lugarAtencion && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" /> {lugarAtencion}
        </p>
      )}
      {vigencia && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" /> Vigencia: {vigencia}
        </p>
      )}
    </div>
  );
}
