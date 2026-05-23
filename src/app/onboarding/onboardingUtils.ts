export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SECTORS = [
  "Manufactura", "Logística y Distribución", "Minería", "Construcción",
  "Agroindustria", "Alimentos y Bebidas", "Química e Industrial", "Otro",
];

export const PREVIEW_FIELDS = ["fecha", "h_registro", "razon_social", "empresa", "planta"] as const;

export function parseResponsables(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => line.trim().replace(/^["']|["']$/g, ""))
    .filter((line) => line.length > 1 && line.length < 80);
}
