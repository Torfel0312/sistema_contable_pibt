"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SerieItem = { name: string; ingresos: number; egresos: number };
type CategoriaItem = { categoria: string; total: number };

const COLORS = ["#0f766e", "#0ea5e9", "#f59e0b", "#16a34a", "#ef4444", "#6366f1", "#a855f7", "#14b8a6"];

export function IngresosEgresosChart({ data }: { data: SerieItem[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="ingresos" fill="#0f766e" name="Ingresos" />
          <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoriaChart({ data }: { data: CategoriaItem[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="categoria" outerRadius={100} label>
            {data.map((entry, index) => (
              <Cell key={`${entry.categoria}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
