import { z } from "zod";

// ─── Common ─────────────────────────────────────────────────────────────────

// preprocess garantiza trim+lowercase ANTES de .email() en Zod v4
export const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string()
    .min(1, "El correo es obligatorio")
    .email("Formato de correo inválido")
    .max(254, "El correo es demasiado largo")
);

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga");

export const roleSchema = z.enum([
  "administrador",
  "supervisor",
  "guardia",
]);

export const plantSchema = z
  .string()
  .max(100, "Nombre de planta muy largo")
  .transform((v) => v.trim())
  .or(z.literal(""));

export const uuidSchema = z
  .string()
  .uuid("Identificador inválido");

export const nonEmptyString = z
  .string()
  .min(1, "Campo obligatorio")
  .max(200, "Máximo 200 caracteres")
  .transform((v) => v.trim());

export const optionalString = z
  .string()
  .max(500, "Máximo 500 caracteres")
  .transform((v) => v.trim())
  .optional();

const notificationPhoneSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.union([
    z.string().regex(/^\+?[\d]{7,15}$/, "Teléfono inválido — solo dígitos, ej: 51987654321"),
    z.undefined(),
  ])
);

// ─── Atenciones ─────────────────────────────────────────────────────────────

export const createAtencionSchema = z.object({
  razonSocial: nonEmptyString,
  empresa: nonEmptyString,
  plant: nonEmptyString,
  type: z.enum(["Proveedor", "Propio", "Cliente", "Otro"]),
  tipoOperacion: nonEmptyString,
  responsable: z.string().max(150).transform((v) => v.trim()).optional(),
  agente: z.string().max(150).transform((v) => v.trim()).optional(),
  note: z.string().max(1000).transform((v) => v.trim()).optional(),
  horaCita: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
    .nullable(),
});

export const updateAtencionSchema = z.object({
  razonSocial: nonEmptyString,
  empresa: nonEmptyString,
  type: z.enum(["Proveedor", "Propio", "Cliente", "Otro"]),
  tipoOperacion: nonEmptyString,
  responsable: z.string().max(150).transform((v) => v.trim()).optional(),
  agente: z.string().max(150).transform((v) => v.trim()).optional(),
  note: z.string().max(1000).transform((v) => v.trim()).optional(),
  hAtencion: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
    .nullable(),
  hDevDocs: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
    .nullable(),
  horaCita: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
    .nullable(),
});

export const closeAtencionSchema = z.object({
  id: z.number().int().positive("ID inválido"),
  motivoDemora: optionalString.nullable(),
});

export const closeAtencionDocsSchema = z.object({
  id: z.number().int().positive("ID inválido"),
});

export const preRegisterCitaSchema = z
  .object({
    horaCita: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Hora de cita obligatoria (formato HH:MM)"),
    plant: nonEmptyString,
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
      .optional(),
    razonSocial: z.string().max(200).transform((v) => v.trim()).optional(),
    empresa: z.string().max(200).transform((v) => v.trim()).optional(),
    responsable: z.string().max(150).transform((v) => v.trim()).optional(),
    agente: z.string().max(150).transform((v) => v.trim()).optional(),
    type: z
      .enum(["Proveedor", "Propio", "Cliente", "Otro"])
      .optional(),
    tipoOperacion: z.string().max(100).transform((v) => v.trim()).optional(),
    note: z.string().max(500).transform((v) => v.trim()).optional(),
  })
  .refine(
    (d) => {
      const has = [d.razonSocial, d.empresa, d.responsable, d.agente]
        .some((v) => v && v.length > 0);
      return has;
    },
    { message: "Debe indicar al menos Razón Social, Empresa, Responsable o Agente" }
  );

export const activateCitaSchema = z.object({
  id: z.number().int().positive("ID inválido"),
});

export const searchSuggestionsSchema = z.object({
  field: z.enum(["razon_social", "empresa"]),
  term: z.string().min(2, "Mínimo 2 caracteres").max(100),
});

export const atencionPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().max(200).default(""),
  plant: z.string().max(100).default("Todos"),
  segment: z.enum(["Todos", "Normal", "Moderado", "Alto", "Crítico", "Pendiente"]).default("Todos"),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  sortBy: z.enum(["id", "espera_min"]).default("id"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  filterCompanyId: z.string().max(50).default(""),
});

// ─── Users ──────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.default("guardia"),
  plant: plantSchema,
  companyId: uuidSchema.optional(),
  companyName: z.string().max(200).optional(),
});

export const updateUserSchema = z.object({
  userId: uuidSchema,
  role: roleSchema,
  plant: plantSchema,
  password: passwordSchema.optional(),
  companyId: uuidSchema.optional(),
  companyName: z.string().max(200).optional(),
});

export const deleteUserSchema = z.object({
  userId: uuidSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: passwordSchema,
});

// ─── Company / Onboarding ───────────────────────────────────────────────────

export const registerCompanySchema = z.object({
  companyName: z.string().min(1, "Campo obligatorio").max(150).transform(v => v.trim()),
  sector: z.string().min(1, "Campo obligatorio").max(100).transform(v => v.trim()),
  contactName: z.string().min(1, "Campo obligatorio").max(150).transform(v => v.trim()),
  plantasText: z
    .string()
    .min(1, "Debe indicar al menos una planta/sede")
    .max(500)
    .transform((v) => v.trim()),
  notificationEmail: emailSchema.optional(),
  notificationPhone: notificationPhoneSchema.optional(),
  supervisorEmail: emailSchema,
  supervisorPassword: passwordSchema,
  responsables: z
    .array(z.string().max(150).transform((v) => v.trim()))
    .max(50, "Máximo 50 responsables"),
  logoBase64: z.string().max(5_000_000).optional(),
  logoMimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/).optional(),
  excelRows: z.array(z.record(z.string(), z.any())).max(10_000).optional(),
  guardias: z
    .array(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        plant: plantSchema,
      })
    )
    .max(20, "Máximo 20 guardias")
    .optional(),
});

export const companySettingsSchema = z.object({
  notificationEmails: z.array(emailSchema).max(10).optional(),
  notificationPhones: z
    .array(
      z
        .string()
        .regex(/^\+?[\d\s\-()]{7,20}$/, "Teléfono inválido")
    )
    .max(10)
    .optional(),
  plantas: z.string().max(500).optional(),
  contactName: z.string().max(150).optional(),
  alertaMinutos: z.number().int().min(15).max(240).optional(),
});

export const plantContactSchema = z.object({
  companyId: uuidSchema,
  planta: z.string().min(1, "Campo obligatorio").max(100).transform(v => v.trim()),
  emails: z.array(emailSchema).max(10),
  phones: z.array(z.string().regex(/^\+?[\d\s\-()]{7,20}$/)).max(10),
});

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Contraseña requerida").max(128),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});

// ─── Admin ────────────────────────────────────────────────────────────────

export const adminUpdatePlanSchema = z.object({
  companyId: uuidSchema,
  plan: z.enum(["trial", "active", "suspended"]),
  trialEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const impersonateSchema = z.object({
  userId: uuidSchema,
});

// ─── Dashboard / Reporte ────────────────────────────────────────────────────

export const dashboardQuerySchema = z.object({
  plant: z.string().max(100).default("Todos"),
  timeframe: z
    .union([
      z.enum(["Día", "Semana", "Mes"]),
      z.string().regex(/^\d{4}$/),
    ])
    .default("Día"),
});

// ─── Responsables ─────────────────────────────────────────────────────────

export const addResponsableSchema = z.object({
  nombre: z.string().min(1, "Campo obligatorio").max(150).transform(v => v.trim()),
});

export const toggleResponsableSchema = z.object({
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export const removeResponsableSchema = z.object({
  id: z.number().int().positive(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

export type CreateAtencionInput = z.infer<typeof createAtencionSchema>;
export type UpdateAtencionInput = z.infer<typeof updateAtencionSchema>;
export type PreRegisterCitaInput = z.infer<typeof preRegisterCitaSchema>;
export type ActivateCitaInput = z.infer<typeof activateCitaSchema>;
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

/** Valida un objeto contra un schema Zod. En caso de error, devuelve un mensaje
 *  amigable para mostrar al usuario. Si es válido, devuelve undefined. */
export function validateForm<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    return { success: false, error: first?.message ?? "Datos inválidos" };
  }
  return { success: true, data: result.data };
}

/** Wrapper para Server Actions: valida y, si falla, retorna { success:false, error }.
 *  Útil cuando la función devuelve objetos { success, error }. */
export function validated<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }
  return { ok: true, data: r.data };
}
