import { getUserContext } from "@/utils/supabase/user";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const extractedRowSchema = z.object({
  fecha: z.string().nullable(),
  planta: z.string().nullable(),
  tipo: z.string().nullable(),
  razon_social: z.string().nullable(),
  empresa: z.string().nullable(),
  h_registro: z.string().nullable(),
  h_atencion: z.string().nullable(),
  h_dev_docs: z.string().nullable(),
  responsable: z.string().nullable(),
  agente: z.string().nullable(),
  observacion: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).max(8),
});

const extractionSchema = z.object({
  rows: z.array(extractedRowSchema).max(500),
  notes: z.array(z.string()).max(12),
});

function getOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("output" in payload)) return null;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object" || !("content" in item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        (block as { type?: unknown }).type === "output_text" &&
        typeof (block as { text?: unknown }).text === "string"
      ) {
        return (block as { text: string }).text;
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  const ctx = await getUserContext();
  if (!ctx?.companyId) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (ctx.role !== "supervisor" && ctx.role !== "administrador") {
    return Response.json(
      { error: "Solo supervisores pueden procesar imágenes" },
      { status: 403 },
    );
  }
  if (ctx.isReadOnly) {
    return Response.json({ error: "Modo solo lectura" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "El reconocimiento de imágenes aún no está configurado. Agrega OPENAI_API_KEY al servidor; Excel/CSV y el registro manual siguen disponibles.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return Response.json({ error: "Selecciona una imagen" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
    return Response.json({ error: "Usa una imagen JPG, PNG o WebP" }, { status: 400 });
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "La imagen debe pesar menos de 8 MB" }, { status: 400 });
  }
  const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("plantas")
    .eq("id", ctx.companyId)
    .maybeSingle();
  const companyPlants = Array.isArray(company?.plantas)
    ? company.plantas.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const currentDateLima = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const currentYear = currentDateLima.slice(0, 4);
  const prompt = [
    "Extrae únicamente la tabla operativa visible en la imagen.",
    "Puede ser una foto directa, una captura de Excel o una captura de WhatsApp que contiene una tabla.",
    "No inventes filas ni valores: si una celda no es legible devuelve null y agrega una advertencia.",
    "Detecta la fecha y la planta desde la propia imagen: encabezados, títulos, rótulos y celdas también cuentan.",
    `Fecha actual en Lima: ${currentDateLima}. Si la imagen muestra día y mes sin año, conserva ese día y mes y usa ${currentYear}; explica esa inferencia en notes.`,
    "Nunca reemplaces una fecha visible por la fecha actual. Si no existe ninguna fecha visible o deducible, devuelve fecha null.",
    companyPlants.length > 0
      ? `Plantas configuradas en la empresa: ${companyPlants.join(", ")}. Cuando una planta visible corresponda claramente, devuelve exactamente uno de estos nombres.`
      : "Si la planta no aparece en la imagen, devuelve planta null.",
    "Normaliza fechas a YYYY-MM-DD y horas a HH:mm. Conserva nombres y observaciones visibles.",
    "Razón social puede ser también placa, vehículo o unidad. Devuelve una fila por atención.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5.4-mini",
      store: false,
      max_output_tokens: 12_000,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_image",
              image_url: `data:${image.type};base64,${imageBase64}`,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "operational_table_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["rows", "notes"],
            properties: {
              rows: {
                type: "array",
                maxItems: 500,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "fecha",
                    "planta",
                    "tipo",
                    "razon_social",
                    "empresa",
                    "h_registro",
                    "h_atencion",
                    "h_dev_docs",
                    "responsable",
                    "agente",
                    "observacion",
                    "confidence",
                    "warnings",
                  ],
                  properties: {
                    fecha: { type: ["string", "null"] },
                    planta: { type: ["string", "null"] },
                    tipo: { type: ["string", "null"] },
                    razon_social: { type: ["string", "null"] },
                    empresa: { type: ["string", "null"] },
                    h_registro: { type: ["string", "null"] },
                    h_atencion: { type: ["string", "null"] },
                    h_dev_docs: { type: ["string", "null"] },
                    responsable: { type: ["string", "null"] },
                    agente: { type: ["string", "null"] },
                    observacion: { type: ["string", "null"] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    warnings: { type: "array", items: { type: "string" }, maxItems: 8 },
                  },
                },
              },
              notes: { type: "array", items: { type: "string" }, maxItems: 12 },
            },
          },
        },
      },
    }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: { message?: unknown } }).error?.message ?? "")
        : "";
    return Response.json(
      { error: message || "No se pudo analizar la imagen" },
      { status: response.status >= 400 && response.status < 500 ? 400 : 502 },
    );
  }

  const outputText = getOutputText(payload);
  if (!outputText) {
    return Response.json({ error: "La imagen no produjo una tabla revisable" }, { status: 422 });
  }

  try {
    const parsed = extractionSchema.parse(JSON.parse(outputText));
    return Response.json(parsed);
  } catch {
    return Response.json(
      { error: "No se pudo validar la tabla detectada. Intenta con la imagen original y mejor resolución." },
      { status: 422 },
    );
  }
}
