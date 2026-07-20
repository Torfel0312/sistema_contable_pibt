"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { ChevronsUpDown, LogOut, Moon, Sun, UserCircle, UserCog } from "lucide-react"
import Link from "next/link"
import { ImpersonationDialog } from "@/components/dashboard/impersonation-picker"
import { useTheme } from "@/hooks/use-theme"

export function NavUser({
  user
}: {
  user: {
    name: string
    email: string
    initials: string
    role: string
    canImpersonate: boolean
  }
}) {
  const router = useRouter()
  const { dark, toggle: toggleTheme } = useTheme()
  const [impersonationOpen, setImpersonationOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }, [router])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-sidebar-foreground">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/60 uppercase tracking-wide">
                {user.role}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64 rounded-2xl"
            side="bottom"
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/profile" />}>
                <UserCircle />
                Perfil
              </DropdownMenuItem>
              {user.canImpersonate && (
                <DropdownMenuItem onClick={() => setImpersonationOpen(true)}>
                  <UserCog />
                  Suplantar usuario...
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toggleTheme}>
                {dark ? <Sun /> : <Moon />}
                {dark ? "Modo claro" : "Modo oscuro"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void handleSignOut()}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {user.canImpersonate && (
        <ImpersonationDialog open={impersonationOpen} onOpenChange={setImpersonationOpen} />
      )}
    </SidebarMenu>
  )
}
