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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { ChevronsUpDown, LogOut, UserCircle, UserCog } from "lucide-react"
import Link from "next/link"
import { ImpersonationDialog } from "@/components/dashboard/impersonation-picker"

export function NavUser({
  user
}: {
  user: {
    name: string
    initials: string
    role: string
    canImpersonate: boolean
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
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
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground uppercase tracking-wide">
                    {user.role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/profile" />}>
                <UserCircle />
                Mi perfil
              </DropdownMenuItem>
              {user.canImpersonate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setImpersonationOpen(true)}>
                    <UserCog />
                    Suplantar usuario...
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <LogOut />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {user.canImpersonate && (
        <ImpersonationDialog open={impersonationOpen} onOpenChange={setImpersonationOpen} />
      )}
    </SidebarMenu>
  )
}
