import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";
import { hasRole, ROLE_LABELS, type Staff, type StaffRole } from "@/lib/auth/staff";

type Item = { href: string; label: string; icon: ReactNode; roles: StaffRole[] };

const NAV: { title: string; items: Item[] }[] = [
  {
    title: "Agenda",
    items: [
      { href: "/admin", label: "Inicio", icon: <LayoutDashboard />, roles: ["admin", "reception", "professional", "editor"] },
      { href: "/admin/agenda", label: "Agenda y citas", icon: <CalendarDays />, roles: ["admin", "reception", "professional"] },
      { href: "/admin/solicitudes", label: "Solicitudes de contacto", icon: <MessageSquare />, roles: ["admin", "reception"] },
      { href: "/admin/disponibilidad", label: "Feriados y bloqueos", icon: <ClipboardList />, roles: ["admin", "reception"] },
    ],
  },
  {
    title: "Catálogo y contenido",
    items: [
      { href: "/admin/profesionales", label: "Profesionales", icon: <Stethoscope />, roles: ["admin", "editor"] },
      { href: "/admin/servicios", label: "Servicios", icon: <ClipboardList />, roles: ["admin", "editor", "professional"] },
      { href: "/admin/contenido", label: "Páginas, FAQ y blog", icon: <FileText />, roles: ["admin", "editor", "professional"] },
      { href: "/admin/medios", label: "Medios", icon: <ImageIcon />, roles: ["admin", "editor"] },
      { href: "/admin/redirecciones", label: "Redirecciones", icon: <Link2 />, roles: ["admin", "editor"] },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/admin/configuracion", label: "Configuración", icon: <Settings />, roles: ["admin"] },
      { href: "/admin/usuarios", label: "Usuarios", icon: <Users />, roles: ["admin"] },
      { href: "/admin/reportes", label: "Reportes", icon: <BarChart3 />, roles: ["admin", "reception"] },
      { href: "/admin/reclamaciones", label: "Reclamaciones y derechos", icon: <ShieldCheck />, roles: ["admin"] },
      { href: "/admin/auditoria", label: "Auditoría", icon: <ScrollText />, roles: ["admin"] },
    ],
  },
];

export function AdminShell({ staff, children }: { staff: Staff; children: ReactNode }) {
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => hasRole(staff, ...i.roles)) })).filter((s) => s.items.length);
  const nav = (
    <nav aria-label="Panel" className="space-y-6">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{s.title}</p>
          <ul className="mt-2 space-y-0.5">
            {s.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-ink hover:bg-plum-soft hover:text-plum [&_svg]:size-4.5 [&_svg]:text-sage-strong">
                  {i.icon}
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r border-line bg-paper px-4 py-6 lg:block">
        <Link href="/admin" className="mb-8 block px-3">
          <Logo />
        </Link>
        {nav}
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3 sm:px-8">
          <details className="lg:hidden">
            <summary className="cursor-pointer rounded-full border border-line px-4 py-2 font-semibold text-plum">Menú</summary>
            <div className="absolute left-0 right-0 z-40 mt-2 border-b border-line bg-paper p-5 shadow-lg">{nav}</div>
          </details>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{staff.display_name}</span> · {staff.roles.map((r) => ROLE_LABELS[r]).join(", ")}
          </p>
          <form action="/admin/auth/logout" method="post">
            <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-semibold text-plum hover:bg-plum-soft">
              Cerrar sesión
            </button>
          </form>
        </header>
        <main id="contenido" className="px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
