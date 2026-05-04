/**
 * Sanitización de inputs para queries SQL.
 *
 * Supabase/PostgreSQL con RLS ya protege contra SQL injection en la mayoría
 * de casos, pero estos helpers limpian inputs del usuario antes de pasarlos
 * a operadores como .ilike() para evitar caracteres especiales problemáticos.
 */

/**
 * Escapa caracteres especiales de LIKE/ILIKE en PostgreSQL.
 * Caracteres escapados: % _ \
 *
 * @example
 * sanitizeLikeInput("100%"); // → "100\\%"
 * sanitizeLikeInput("test_value"); // → "test\\_value"
 */
export function sanitizeLikeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/\\/g, "\\\\")  // backslash primero
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Limpia un string de búsqueda para uso seguro en queries.
 * - Trim
 * - Colapsa espacios múltiples
 * - Limita longitud
 * - Escapa caracteres especiales de LIKE
 */
export function sanitizeSearchTerm(term: string, maxLength = 200): string {
  if (!term) return "";
  return sanitizeLikeInput(
    term
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, maxLength)
  );
}

/**
 * Valida y sanitiza un ID numérico.
 * Retorna null si no es un entero positivo válido.
 */
export function sanitizeId(raw: unknown): number | null {
  const id = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

/**
 * Valida y sanitiza un UUID.
 * Retorna null si no tiene formato UUID válido.
 */
export function sanitizeUuid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

/**
 * Sanitiza un string para uso como nombre de planta/empresa.
 * Solo permite alfanuméricos, espacios, guiones, puntos y comas.
 */
export function sanitizeName(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/[<>\"'`;{}()\\]/g, "")  // Eliminar caracteres potencialmente peligrosos
    .slice(0, 200);
}
