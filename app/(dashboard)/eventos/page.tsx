"use client";

import { FormEvent, useState } from "react";

type Evento = {
  id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [fecha, setFecha] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fecha || !titulo) {
      return;
    }

    const nuevoEvento: Evento = {
      id: crypto.randomUUID(),
      fecha,
      titulo,
      descripcion,
    };

    setEventos((prev) => [nuevoEvento, ...prev]);
    setFecha("");
    setTitulo("");
    setDescripcion("");
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-slate-900">Eventos</h1>
      <p className="mt-1 text-sm text-slate-500">Registrar eventos separados de movimientos contables.</p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="evt-fecha">Fecha</label>
            <input
              id="evt-fecha"
              type="date"
              className="input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="evt-titulo">Título</label>
            <input
              id="evt-titulo"
              type="text"
              className="input"
              placeholder="Ej: Reunión de tesorería"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="evt-descripcion">Descripción</label>
            <textarea
              id="evt-descripcion"
              className="input h-24 resize-none"
              placeholder="Detalles del evento"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button type="submit" className="btn-primary px-4 py-2">
              Guardar evento
            </button>
            <button
              type="button"
              className="btn-secondary px-4 py-2"
              onClick={() => {
                setFecha("");
                setTitulo("");
                setDescripcion("");
              }}
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-800">Eventos registrados</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-slate-500">No hay eventos registrados aún.</p>
        ) : (
          <ul className="space-y-3">
            {eventos.map((evento) => (
              <li key={evento.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-800">{evento.titulo}</p>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{evento.fecha}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{evento.descripcion || "Sin descripción"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
