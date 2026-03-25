export type MovimientoTipo = "INGRESO" | "EGRESO";

export const CATEGORIAS_INGRESO = [
  "diezmos",
  "ofrendas",
  "donaciones",
  "actividades",
  "otros",
] as const;

export const CATEGORIAS_EGRESO = [
  "servicios basicos",
  "mantencion",
  "ayuda social",
  "materiales",
  "actividades",
  "administracion",
  "transporte",
  "otros",
] as const;
