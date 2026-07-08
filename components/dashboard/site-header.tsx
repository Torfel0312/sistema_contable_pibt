"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeft } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { NotificationBell } from "@/components/dashboard/notification-bell"

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/movements": "Movimientos",
  "/movements/new": "Nuevo Movimiento",
  "/settlements": "Rendiciones",
  "/users": "Usuarios",
  "/audit": "Auditoría",
  "/requests": "Solicitudes",
  "/ministries": "Ministerios",
  "/budget": "Presupuesto",
  "/settings": "Configuración"
}

function usePageLabel() {
  const pathname = usePathname()
  if (pathname.startsWith("/movements/") && pathname !== "/movements/new") {
    return { parent: { label: "Movimientos", href: "/movements" }, current: "Detalle" }
  }
  if (pathname === "/movements/new") {
    return { parent: { label: "Movimientos", href: "/movements" }, current: "Nuevo" }
  }
  if (pathname.startsWith("/requests/")) {
    return { parent: { label: "Solicitudes", href: "/requests" }, current: "Detalle" }
  }
  const label = PAGE_LABELS[pathname]
  return { parent: null, current: label ?? "..." }
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { parent, current } = usePageLabel()

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-14 w-full items-center gap-2 px-4">
        <Button
          className="size-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft />
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-auto"
        />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>Sistema Contable</BreadcrumbLink>
            </BreadcrumbItem>
            {parent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={parent.href} />}>
                    {parent.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <a
            href={`https://github.com/Primera-Iglesia-Bautista-de-Talcahuano/sistema_contable_pibt/commit/${process.env.NEXT_PUBLIC_COMMIT_SHA_FULL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
          >
            Version: {process.env.NEXT_PUBLIC_COMMIT_SHA}
          </a>
        </div>
      </div>
    </header>
  )
}
