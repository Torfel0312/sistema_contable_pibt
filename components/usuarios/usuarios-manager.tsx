"use client";

import { useState } from "react";
import type { UserRole } from "@/types/auth";

type UsuarioRow = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  createdAt: string | Date;
};

type NewUserForm = {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  activo: boolean;
};

const defaultNewUser: NewUserForm = {
  nombre: "",
  email: "",
  password: "",
  rol: "OPERADOR",
  activo: true,
};

export function UsuariosManager({ initialUsers }: { initialUsers: UsuarioRow[] }) {
  const [users, setUsers] = useState<UsuarioRow[]>(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>(defaultNewUser);
  const [submitting, setSubmitting] = useState(false);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    setSubmitting(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? "No se pudo crear usuario.");
      return;
    }

    const created = (await res.json()) as UsuarioRow;
    setUsers((prev) => [...prev, created]);
    setNewUser(defaultNewUser);
  }

  async function saveUser(user: UsuarioRow) {
    setError(null);
    const res = await fetch(`/api/usuarios/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: user.nombre,
        rol: user.rol,
        activo: user.activo,
      }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? `No se pudo actualizar ${user.email}.`);
      return;
    }
  }

  function updateUserLocal(id: string, patch: Partial<UsuarioRow>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  return (
    <div className="space-y-4">
      <form className="rounded-xl border border-slate-200 bg-surface p-4" onSubmit={createUser}>
        <h2 className="mb-3 text-base font-semibold">Crear Usuario</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <input
            className="input"
            placeholder="Nombre"
            value={newUser.nombre}
            onChange={(e) => setNewUser((s) => ({ ...s, nombre: e.target.value }))}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            className="input"
            type="password"
            placeholder="Contrasena"
            value={newUser.password}
            onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
          />
          <select
            className="input"
            value={newUser.rol}
            onChange={(e) => setNewUser((s) => ({ ...s, rol: e.target.value as UserRole }))}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERADOR">OPERADOR</option>
            <option value="VISOR">VISOR</option>
          </select>
          <button
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creando..." : "Crear"}
          </button>
        </div>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Creado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <input
                    className="input"
                    value={user.nombre}
                    onChange={(e) => updateUserLocal(user.id, { nombre: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">
                  <select
                    className="input"
                    value={user.rol}
                    onChange={(e) => updateUserLocal(user.id, { rol: e.target.value as UserRole })}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="OPERADOR">OPERADOR</option>
                    <option value="VISOR">VISOR</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={user.activo}
                      onChange={(e) => updateUserLocal(user.id, { activo: e.target.checked })}
                    />
                    <span>{user.activo ? "Si" : "No"}</span>
                  </label>
                </td>
                <td className="px-3 py-2">{new Date(user.createdAt).toLocaleDateString("es-CL")}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    onClick={() => void saveUser(user)}
                  >
                    Guardar
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="px-3 py-4 text-center text-muted" colSpan={6}>
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
