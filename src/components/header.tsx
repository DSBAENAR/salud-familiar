"use client";

import { usePathname } from "next/navigation";
import { Notificaciones } from "@/components/notificaciones";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/citas": "Citas",
  "/autorizaciones": "Autorizaciones",
  "/documentos": "Documentos",
  "/ordenes": "Ordenes",
  "/correos": "Correos",
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

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Notificaciones />
      </div>
    </header>
  );
}
