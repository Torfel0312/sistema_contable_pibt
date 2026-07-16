"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

function formatThousands(digits: string): string {
  if (!digits) return ""
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function toDigits(raw: string): string {
  return raw.replace(/\D/g, "")
}

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: number | string | undefined | null
  onChange: (value: number | undefined) => void
}

// Displays a plain-number field with "." thousand separators (es-CL convention)
// while keeping the underlying form value an unformatted number.
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const cursorDigitsRef = React.useRef<number | null>(null)

    const digits = value === undefined || value === null || value === "" ? "" : toDigits(String(value))
    const display = formatThousands(digits)

    React.useEffect(() => {
      if (cursorDigitsRef.current === null || !innerRef.current) return
      const targetDigits = cursorDigitsRef.current
      let count = 0
      let pos = display.length
      for (let i = 0; i < display.length; i++) {
        if (/\d/.test(display[i])) count++
        if (count === targetDigits) {
          pos = i + 1
          break
        }
      }
      innerRef.current.setSelectionRange(pos, pos)
      cursorDigitsRef.current = null
    }, [display])

    return (
      <Input
        {...props}
        ref={(node) => {
          innerRef.current = node
          if (typeof forwardedRef === "function") forwardedRef(node)
          else if (forwardedRef) forwardedRef.current = node
        }}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const input = e.target
          const selectionStart = input.selectionStart ?? input.value.length
          cursorDigitsRef.current = toDigits(input.value.slice(0, selectionStart)).length
          const newDigits = toDigits(input.value)
          onChange(newDigits === "" ? undefined : Number(newDigits))
        }}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"
