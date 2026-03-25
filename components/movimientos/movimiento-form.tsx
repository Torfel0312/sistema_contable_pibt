"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMovimientoSchema } from "@/lib/validators/movimiento";
import type { CreateMovimientoInput } from "@/lib/validators/movimiento";
import { CATEGORIAS_EGRESO, CATEGORIAS_INGRESO } from "@/types/movimientos";
import { z } from "zod";

type Props = {
  mode: "create" | "edit";
  movimientoId?: string;
  initialValues?: Partial<CreateMovimientoInput>;
};

function toDateValue(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function MovimientoForm({ mode, movimientoId, initialValues }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<MovimientoFormInput, unknown, CreateMovimientoInput>({
    resolver: zodResolver(createMovimientoSchema),
    defaultValues: {
      fechaMovimiento: toDateValue(initialValues?.fechaMovimiento),
      tipoMovimiento: initialValues?.tipoMovimiento ?? "INGRESO",
      monto: initialValues?.monto ?? 0,
      categoria: initialValues?.categoria ?? "",
      concepto: initialValues?.concepto ?? "",
      referente: initialValues?.referente ?? "",
      recibidoPor: initialValues?.recibidoPor ?? "",
      entregadoPor: initialValues?.entregadoPor ?? "",
      beneficiario: initialValues?.beneficiario ?? "",
      medioPago: initialValues?.medioPago ?? "",
      numeroRespaldo: initialValues?.numeroRespaldo ?? "",
      observaciones: initialValues?.observaciones ?? "",
    },
  });

  const tipo = useWatch({ control: form.control, name: "tipoMovimiento" });
  const categorias = useMemo(
    () => (tipo === "INGRESO" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO),
    [tipo],
  );

  async function onSubmit(values: CreateMovimientoInput) {
    setError(null);
    const endpoint = mode === "create" ? "/api/movimientos" : `/api/movimientos/${movimientoId}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? "No se pudo guardar el movimiento.");
      return;
    }

    const payload = (await res.json()) as { id?: string };
    if (mode === "create") {
      router.push(`/movimientos/${payload.id}`);
    } else {
      router.push(`/movimientos/${movimientoId}`);
    }
    router.refresh();
  }

  return (
    <form className="space-y-4 rounded-2xl border border-slate-200 bg-surface p-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Fecha">
          <input className="input" type="date" {...form.register("fechaMovimiento")} />
        </Field>
        <Field label="Tipo">
          <select className="input" {...form.register("tipoMovimiento")}>
            <option value="INGRESO">Ingreso</option>
            <option value="EGRESO">Egreso</option>
          </select>
        </Field>
        <Field label="Monto">
          <input className="input" type="number" min="1" {...form.register("monto", { valueAsNumber: true })} />
        </Field>
        <Field label="Categoria">
          <select className="input" {...form.register("categoria")}>
            <option value="">Selecciona</option>
            {categorias.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Concepto">
        <input className="input" {...form.register("concepto")} />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Referente">
          <input className="input" {...form.register("referente")} />
        </Field>
        <Field label="Recibido por">
          <input className="input" {...form.register("recibidoPor")} />
        </Field>
        <Field label="Entregado por">
          <input className="input" {...form.register("entregadoPor")} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Beneficiario">
          <input className="input" {...form.register("beneficiario")} />
        </Field>
        <Field label="Medio de pago">
          <input className="input" {...form.register("medioPago")} />
        </Field>
        <Field label="Numero de respaldo">
          <input className="input" {...form.register("numeroRespaldo")} />
        </Field>
      </div>

      <Field label="Observaciones">
        <textarea className="input min-h-24" {...form.register("observaciones")} />
      </Field>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        {form.formState.isSubmitting
          ? "Guardando..."
          : mode === "create"
            ? "Guardar movimiento"
            : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      {children}
    </label>
  );
}
type MovimientoFormInput = z.input<typeof createMovimientoSchema>;
