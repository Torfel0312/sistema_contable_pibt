// Matches supabase/seed.sql — loaded only by `supabase db reset`, local only.
export const USERS = {
  admin: { email: "e2e-admin@local.test", password: "Testing123!", role: "ADMIN" },
  bursar: { email: "e2e-bursar@local.test", password: "Testing123!", role: "BURSAR" },
  finance: { email: "e2e-finance@local.test", password: "Testing123!", role: "FINANCE" },
  minister: { email: "e2e-minister@local.test", password: "Testing123!", role: "MINISTER" }
} as const

export const MINISTRY_ID = "e2e00000-0000-0000-0000-0000000000a1"

export type UserKey = keyof typeof USERS
