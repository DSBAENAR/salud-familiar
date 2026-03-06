"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Calendar,
  FileCheck,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

interface Notificacion {
  id: string;
  tipo: "cita" | "autorizacion" | "orden";
  titulo: string;
  mensaje: string;
  urgencia: "alta" | "media" | "baja";
  fecha?: string;
}

const iconMap = {
  cita: Calendar,
  autorizacion: FileCheck,
  orden: ClipboardList,
};

const urgenciaStyles = {
  alta: "border-l-red-500 bg-red-50",
  media: "border-l-amber-500 bg-amber-50",
  baja: "border-l-blue-500 bg-blue-50",
};

export function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const res = await fetch("/api/notificaciones");
        if (res.ok) {
          const data = await res.json();
          setNotificaciones(data.notificaciones);
          setTotal(data.total);
        }
      } catch {
        // Silently fail
      }
    };

    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notificaciones"
        onClick={() => setOpen(!open)}
      >
        <Bell className="size-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-80 rounded-lg border bg-white shadow-xl z-50">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? "Todo al dia"
                : `${total} pendiente${total > 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay notificaciones
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notificaciones.map((n) => {
                  const Icon = iconMap[n.tipo];
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 rounded-md border-l-2 p-3 ${urgenciaStyles[n.urgencia]}`}
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold">{n.titulo}</p>
                          {n.urgencia === "alta" && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {n.mensaje}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
