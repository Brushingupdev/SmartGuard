import { Resend } from "resend";

// Usa directamente la variable de entorno (NO parsea .env.local)
// Ejecutar con: node --env-file=.env.local test_email.mjs

const key = process.env.RESEND_API_KEY;

if (!key) {
  console.error("❌ RESEND_API_KEY no encontrada. Usa: node --env-file=.env.local test_email.mjs");
  process.exit(1);
}

const resend = new Resend(key);

const { data, error } = await resend.emails.send({
  from:    "onboarding@resend.dev",
  to:      ["adrishio09@gmail.com"],
  subject: "Test SmartGuard — Email de prueba",
  html:    "<h1>✅ Resend funciona correctamente</h1><p>El sistema de alertas de SmartGuard está configurado.</p>",
});

if (error) {
  console.error("❌ Error al enviar:", JSON.stringify(error, null, 2));
} else {
  console.log("✅ Email enviado correctamente. ID:", data?.id);
}
