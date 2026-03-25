"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnularButton({ movimientoId, disabled }: { movimientoId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const motivo = window.prompt("Indica motivo de anulacion:");
    if (!motivo) return;

    setLoading(true);
    const res = await fetch(`/api/movimientos/${movimientoId}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivoAnulacion: motivo }),
    });
    setLoading(false);

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      window.alert(payload.message ?? "No se pudo anular.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
    >
      {loading ? "Anulando..." : "Anular"}
    </button>
  );
}
