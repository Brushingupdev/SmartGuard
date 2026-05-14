import Link from "next/link";

export default function PWAOfflinePage() {
  return (
    <main
      className="flex min-h-screen min-h-[100dvh] items-center justify-center px-6 py-10"
      style={{ background: "var(--pwa-bg)", color: "var(--pwa-ink)" }}
    >
      <section
        className="w-full max-w-sm p-6"
        style={{
          background: "var(--pwa-surface)",
          borderTop: "3px solid var(--pwa-accent)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--pwa-accent)",
            margin: 0,
          }}
        >
          Sin conexion
        </p>

        <h1
          style={{
            fontFamily: "var(--sg-font-display)",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            lineHeight: 1.05,
            margin: "14px 0 0",
          }}
        >
          No pudimos cargar esta pantalla.
        </h1>

        <p
          style={{
            fontFamily: "var(--sg-font-body)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--pwa-ink-soft)",
            margin: "14px 0 0",
          }}
        >
          Revisa tu conexion e intenta volver al inicio del PWA cuando tengas red otra vez.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/pwa"
            className="flex h-12 items-center justify-center"
            style={{
              background: "var(--pwa-accent)",
              color: "#0d0f0e",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Ir al inicio
          </Link>

          <Link
            href="/pwa/home"
            className="flex h-12 items-center justify-center"
            style={{
              border: "1px solid var(--pwa-border)",
              color: "var(--pwa-ink)",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textDecoration: "none",
              background: "transparent",
            }}
          >
            Reintentar
          </Link>
        </div>
      </section>
    </main>
  );
}
