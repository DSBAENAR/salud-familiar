"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Notificaciones } from "@/components/notificaciones";
import { useSidebar } from "./sidebar-context";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/citas": "Citas",
  "/autorizaciones": "Autorizaciones",
  "/documentos": "Documentos",
  "/ordenes": "Ordenes",
  "/correos": "Correos",
  "/actividad": "Actividad",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }
  const segment = "/" + pathname.split("/").filter(Boolean)[0];
  return pageTitles[segment] ?? "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex h-14 lg:h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 lg:px-8 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="lg:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Notificaciones />
      </div>
    </header>
  );
}
