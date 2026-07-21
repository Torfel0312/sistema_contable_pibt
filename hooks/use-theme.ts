"use client"

import { useSyncExternalStore } from "react"
import { setTheme } from "@/app/actions/theme"

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
  return () => observer.disconnect()
}

const getSnapshot = () =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"

const getServerSnapshot = () => false

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = () => {
    const next = !dark
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark")
    } else {
      document.documentElement.removeAttribute("data-theme")
    }
    setTheme(next)
  }

  return { dark, toggle }
}
