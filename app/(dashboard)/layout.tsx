import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner"
import { UserProvider } from "@/components/providers/user-provider"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/")
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  const sessionUser = { ...user, permissions: [...user.permissions] }
  const canImpersonate = (user.realUser?.role ?? user.role) === "ADMIN" && !user.impersonatorId

  return (
    <SidebarProvider>
      <UserProvider user={sessionUser}>
        <AppSidebar user={{ name: user.name ?? "", initials, role: user.role, canImpersonate }} />
        <SidebarInset>
          <ImpersonationBanner />
          <SiteHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-0 overflow-x-hidden">{children}</main>
        </SidebarInset>
      </UserProvider>
    </SidebarProvider>
  )
}
