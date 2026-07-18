import type { UserRole } from "@/types/auth"

export interface RealUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  status: string
  permissions: string[]
  impersonatorId: string | null
  realUser: RealUser | null
}
