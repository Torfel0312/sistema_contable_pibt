"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegenerarPdfButton({ movimientoId }: { movimientoId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    const res = await fetch(`/api/movimientos/${movimientoId}/regenerar-pdf`, {
      method: "POST",
    });
    setLoading(false);

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      window.alert(payload.message ?? "No se pudo regenerar el PDF.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {loading ? "Procesando..." : "Regenerar PDF"}
    </button>
  );
}
