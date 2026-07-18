import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap"
})

export const metadata: Metadata = {
  title: "Sistema Contable Iglesia",
  description: "Sistema de contabilidad para iglesia"
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("pibt-theme")?.value

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(manrope.variable)}
      {...(theme === "dark" ? { "data-theme": "dark" } : {})}
    >
      <body className="antialiased min-h-screen font-sans bg-background text-on-surface">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}
