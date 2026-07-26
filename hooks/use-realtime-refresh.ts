"use client"

import { useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type Row = Record<string, unknown>

export type RealtimeSubscription = {
  table: string
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
  filter?: string
  // Extra client-side check run on top of the (optional) server-side `filter` — e.g.
  // matching one of several ids that postgres_changes can't filter on directly.
  predicate?: (payload: RealtimePostgresChangesPayload<Row>) => boolean
}

// Server Components already own the join-heavy queries this data needs (ministry,
// reviewer, attachments, ...), so a postgres_changes event here just triggers a
// router.refresh() rather than hand-merging the bare-columns payload into state —
// same data-fetching shape the rest of the app already uses after every mutation.
// RLS on each subscribed table still governs what payloads a given user's socket
// receives, so this never surfaces rows the viewer couldn't already SELECT.
export function useRealtimeRefresh(subscriptions: RealtimeSubscription[]) {
  const router = useRouter()

  // Only table/event/filter decide the channel's wiring — re-subscribing on every
  // render (predicates are fresh closures each time) would drop and reopen the
  // socket constantly. Predicates are read from `latestRef` at call time instead,
  // by array index, so the effect only depends on this structural key.
  const structuralKey = useMemo(
    () =>
      JSON.stringify(subscriptions.map((s) => ({ table: s.table, event: s.event, filter: s.filter }))),
    [subscriptions]
  )

  const latestRef = useRef(subscriptions)
  useEffect(() => {
    latestRef.current = subscriptions
  })

  useEffect(() => {
    const structural = JSON.parse(structuralKey) as Omit<RealtimeSubscription, "predicate">[]
    if (!structural.length) return

    const supabase = createSupabaseBrowserClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => router.refresh(), 300)
    }

    // A freshly constructed client resolves its session asynchronously, so the
    // realtime socket's accessToken (needed for `TO authenticated` RLS policies
    // to apply on postgres_changes) is only set after that resolves. Subscribing
    // before then joins the channel as `anon` and every event gets silently
    // dropped for `TO authenticated` policies with no error surfaced — so wait
    // for the session before opening the channel at all.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) supabase.realtime.setAuth(data.session.access_token)

      channel = supabase.channel(`realtime-refresh-${Math.random().toString(36).slice(2)}`)
      structural.forEach((sub, index) => {
        channel!.on(
          "postgres_changes",
          { event: sub.event ?? "*", schema: "public", table: sub.table, filter: sub.filter },
          (payload: RealtimePostgresChangesPayload<Row>) => {
            const predicate = latestRef.current[index]?.predicate
            if (predicate && !predicate(payload)) return
            scheduleRefresh()
          }
        )
      })
      channel.subscribe()
    })

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [structuralKey, router])
}
