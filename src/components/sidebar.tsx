"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  FileCheck,
  FolderOpen,
  ClipboardList,
  Mail,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Citas", href: "/citas", icon: Calendar },
  { label: "Autorizaciones", href: "/autorizaciones", icon: FileCheck },
  { label: "Documentos", href: "/documentos", icon: FolderOpen },
  { label: "Ordenes", href: "/ordenes", icon: ClipboardList },
  { label: "Correos", href: "/correos", icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0f172a] text-white">
      {/* App branding */}
      <div className="flex flex-col gap-1 px-6 pt-8 pb-6">
        <div className="flex items-center gap-2.5">
          <HeartPulse className="size-7 text-sky-400" />
          <span className="text-lg font-semibold tracking-tight text-white">
            Salud Familiar
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-400">Paciente</p>
        <p className="text-[15px] font-semibold text-slate-200">
          Alvaro Baena
        </p>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-slate-700/60" />

      {/* Navigation */}
      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px] transition-colors duration-200",
                  isActive
                    ? "text-sky-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5">
        <p className="text-xs text-slate-600">Salud Familiar v0.1</p>
      </div>
    </aside>
  );
}
