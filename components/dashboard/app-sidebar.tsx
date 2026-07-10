"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  ClipboardList,
  Receipt,
  Church,
  FileCheck,
  SlidersHorizontal,
  Mail,
  ShieldCheck
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/dashboard/nav-user"
import { ThemeToggle } from "@/components/ui/theme-toggle"

type NavLink = {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

type NavGroup = {
  label: string | null
  links: NavLink[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    links: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
  },
  {
    label: "Finanzas",
    links: [
      {
        href: "/movements",
        label: "Movimientos",
        icon: Briefcase,
        roles: ["ADMIN", "BURSAR", "FINANCE"]
      },
      {
        href: "/settlements",
        label: "Rendiciones",
        icon: Receipt,
        roles: ["ADMIN", "BURSAR", "FINANCE"]
      }
    ]
  },
  {
    label: "Ministerios",
    links: [
      { href: "/ministries", label: "Ministerios", icon: Church, roles: ["ADMIN", "BURSAR"] },
      {
        href: "/requests",
        label: "Solicitudes",
        icon: FileCheck,
        roles: ["ADMIN", "BURSAR", "FINANCE", "MINISTER"]
      }
    ]
  },
  {
    label: "Administración",
    links: [
      { href: "/settings/general", label: "General", icon: SlidersHorizontal, roles: ["ADMIN"] },
      { href: "/settings/inbound-email", label: "Correo entrante", icon: Mail, roles: ["ADMIN"] },
      { href: "/settings/permissions", label: "Permisos", icon: ShieldCheck, roles: ["ADMIN"] },
      { href: "/users", label: "Usuarios", icon: Users, roles: ["ADMIN"] },
      { href: "/audit", label: "Auditoría", icon: ClipboardList, roles: ["ADMIN"] }
    ]
  }
]

const GROUP_THRESHOLD = 5

export function AppSidebar({
  user
}: {
  user: {
    name: string
    initials: string
    role: string
  }
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        links: group.links.filter((l) => !l.roles || l.roles.includes(user.role))
      })).filter((group) => group.links.length > 0),
    [user.role]
  )

  const useGroups = useMemo(
    () => visibleGroups.reduce((sum, g) => sum + g.links.length, 0) >= GROUP_THRESHOLD,
    [visibleGroups]
  )

  const renderLinks = (links: NavLink[]) =>
    links.map((link) => {
      const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
      return (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            render={<Link href={link.href} />}
            isActive={isActive}
            tooltip={link.label}
            onClick={() => setOpenMobile(false)}
          >
            <link.icon />
            <span>{link.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    })

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center">
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />} className="flex-1">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Sistema Contable</span>
                <span className="truncate text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  PIBT
                </span>
              </div>
            </SidebarMenuButton>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {useGroups ? (
          visibleGroups.map((group) => (
            <SidebarGroup key={group.label ?? "__general"}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{renderLinks(group.links)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{renderLinks(visibleGroups.flatMap((g) => g.links))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
