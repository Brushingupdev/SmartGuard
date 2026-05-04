const DB_ERRORS: [RegExp, string][] = [
  [/duplicate key value violates unique constraint/i, "Este registro ya existe en el sistema."],
  [/violates foreign key constraint/i, "Referencia inválida — el recurso relacionado no existe."],
  [/null value in column .* violates not-null constraint/i, "Falta un campo obligatorio. Completa todos los datos requeridos."],
  [/value too long for type character varying/i, "Uno de los campos excede la longitud máxima permitida."],
  [/invalid input syntax for type uuid/i, "Identificador inválido. Recarga la página e intenta de nuevo."],
  [/permission denied/i, "No tienes permisos para realizar esta acción."],
  [/JWT expired/i, "Tu sesión ha expirado. Vuelve a iniciar sesión."],
  [/network|ECONNRESET|ETIMEDOUT|fetch failed/i, "Error de conexión. Verifica tu internet e intenta de nuevo."],
  [/timeout/i, "La operación tardó demasiado. Intenta de nuevo."],
];

export function humanizeError(raw: string | null | undefined): string {
  if (!raw) return "Error inesperado. Intenta de nuevo.";
  for (const [pattern, friendly] of DB_ERRORS) {
    if (pattern.test(raw)) return friendly;
  }
  return "Error inesperado. Si persiste, contacta al administrador.";
}
