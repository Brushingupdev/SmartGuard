#!/usr/bin/env node
/**
 * SmartGuard Demo Seeder — v2
 * Genera 6 meses de datos realistas (~900 registros):
 *  - Patrones reales: pico lunes/viernes, turnos mañana/tarde
 *  - 3 plantas con rendimiento distinto
 *  - Tendencia de mejora mes a mes (meses recientes más verdes)
 *  - Heatmap rico para dashboards
 *
 * Uso: node scripts/seed-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("❌ No se pudo leer .env.local");
    process.exit(1);
  }
}

loadEnv();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Credenciales demo ────────────────────────────────────────────────────────
const DEMO_EMAIL      = "supervisor@demo.smartguard.io";
const DEMO_PASSWORD   = "Demo2024!";
const GUARDIA1_EMAIL  = "guardia.lomas@demo.smartguard.io";
const GUARDIA2_EMAIL  = "guardia.callao@demo.smartguard.io";
const GUARDIA3_EMAIL  = "guardia.caja@demo.smartguard.io";
const GUARDIA_PASSWORD = "Guardia2024!";

// ─── Catálogos ────────────────────────────────────────────────────────────────
const PLANTAS = ["Lomas", "Cajamarquilla", "Callao"];

/**
 * Rendimiento base por planta (probabilidad de demora).
 * Lomas: la mejor → solo 12% demoras
 * Callao: la peor → 28% demoras (puerto, mucho tráfico)
 * Cajamarquilla: media → 20%
 */
const PLANTA_DEMORA_PROB = {
  Lomas:          0.12,
  Cajamarquilla:  0.20,
  Callao:         0.28,
};

const EMPRESAS_DESTINO = [
  "FAB. DE CHOCOLATES LA IBERICA SA",
  "TRANSPORTES PIMENTEL SAC",
  "CORPORACION LOGISTICA DEL NORTE",
  "MINERA ANDINA PERU SAC",
  "AGROINDUSTRIAL SANTA ROSA",
  "DISTRIBUIDORA MAYORISTA LIMA",
  "COMERCIAL DEL PACIFICO SA",
  "INDUSTRIAS METALICAS PERU",
  "QUIMICOS Y DERIVADOS PERU SA",
  "FRIGORIFICO NACIONAL SAC",
];

const RAZONES_SOCIALES = [
  "TRANSP. PIMENTEL C8E-819",
  "TRANSLOGIC ABC-4521",
  "CARGO EXPRESS XYZ-9983",
  "LOGISTICA NORTE MKL-1102",
  "TRANSPORTES UNION PPQ-7734",
  "EXPRESO ANDINO RST-3341",
  "CARGA RAPIDA LMN-5520",
  "TRANSANDES SAC BCD-1198",
  "COMERCIAL PERU TUV-6672",
  "DISTRIBUCIONES SA HJK-8893",
  "MULTISERVICIOS EFG-2241",
  "SERVITRANS CDE-7753",
  "GRUPO LOGISTICO GHI-4410",
  "PESQUERA DEL SUR JKL-3309",
  "IMPORTACIONES MNO-8867",
];

const AGENTES_POR_PLANTA = {
  Lomas:         ["Carlos Mendoza", "Luis García"],
  Cajamarquilla: ["Pedro Torres", "Ana Castillo"],
  Callao:        ["Diego Rojas", "María López"],
};

const RESPONSABLES = [
  "Juan Pérez", "María López", "Diego Rojas", "Ana Castillo",
  "Roberto Silva", "Carla Núñez", "Jorge Vega",
];

const MOTIVOS_DEMORA = [
  "Documentación incompleta",
  "Revisión manual requerida",
  "Exceso de vehículos en cola",
  "Verificación de carga",
  "Problema con conductor",
  "Báscula ocupada",
  "Falta de espacio en patio",
  "Coordinación con almacén",
];

const TIPOS = ["Proveedor", "Propio", "Cliente", "Otro"];
const TIPOS_OPERACION = ["Carga", "Descarga", "Visita", "Mantenimiento", "Traslado"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand  = (list) => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = () => Math.random();

/**
 * Número de atenciones para un día dado.
 * Weekday 0=Dom … 6=Sáb
 * Lunes y viernes: más carga. Finde: mucho menos.
 */
function recordsForDay(dayOfWeek, monthOffset) {
  // monthOffset: 0=hace 6 meses, 5=mes actual → negocio crece
  const base = [2, 6, 5, 5, 6, 7, 2]; // Dom…Sáb
  const growth = 1 + monthOffset * 0.08; // +8% por mes (negocio en crecimiento)
  const jitter = randInt(-1, 1);
  return Math.max(1, Math.round(base[dayOfWeek] * growth + jitter));
}

/**
 * Hora de registro distribuida en 2 turnos:
 * Turno mañana: 06:00–12:00  (60% del tráfico)
 * Turno tarde:  13:00–19:00  (35%)
 * Nocturno:     20:00–05:00  (5%)
 */
function randomHour() {
  const r = randFloat();
  if (r < 0.60) return randInt(6, 11);
  if (r < 0.95) return randInt(13, 18);
  return randInt(20, 23);
}

/**
 * Dado el mes (0=hace 6 meses, 5=actual) y la planta,
 * calcula la probabilidad de demora. Los meses recientes mejoran
 * porque el equipo va optimizando el proceso.
 */
function demoraProb(planta, monthOffset) {
  const base = PLANTA_DEMORA_PROB[planta] ?? 0.20;
  const improvement = monthOffset * 0.015; // cada mes mejora 1.5%
  return Math.max(0.05, base - improvement);
}

// ─── Generador principal ──────────────────────────────────────────────────────
function generateRecords(companyId) {
  const records = [];
  const today   = new Date();
  today.setHours(0, 0, 0, 0);

  // 6 meses atrás = 183 días
  const START_DAYS_BACK = 183;

  for (let d = START_DAYS_BACK; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);

    const dayOfWeek   = date.getDay();    // 0=Dom…6=Sáb
    const fechaStr    = date.toISOString().split("T")[0];
    const anio        = date.getFullYear();
    const mesNum      = date.getMonth() + 1;

    // monthOffset: 0 = hace 6 meses, 5 = mes actual (aprox)
    const monthOffset = Math.floor((START_DAYS_BACK - d) / 30);

    // Distribuir atenciones entre las 3 plantas del día
    const totalDia = recordsForDay(dayOfWeek, monthOffset);

    // Asignar cada atención a una planta con pesos (Callao más activo)
    const plantaWeights = [
      { planta: "Lomas",         weight: 0.30 },
      { planta: "Cajamarquilla", weight: 0.30 },
      { planta: "Callao",        weight: 0.40 },
    ];

    for (let i = 0; i < totalDia; i++) {
      // Elegir planta según peso
      const r = randFloat();
      let planta = "Callao";
      let cumulative = 0;
      for (const pw of plantaWeights) {
        cumulative += pw.weight;
        if (r < cumulative) { planta = pw.planta; break; }
      }

      const hour   = randomHour();
      const minute = randInt(0, 59);
      const hRegistro = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`;

      const agentes   = AGENTES_POR_PLANTA[planta];
      const agente     = rand(agentes);
      const responsable = rand(RESPONSABLES);
      const tipo        = rand(TIPOS);
      const tipoOp      = rand(TIPOS_OPERACION);
      const razonSocial = rand(RAZONES_SOCIALES);
      const empresa     = rand(EMPRESAS_DESTINO);

      // ── Determinar tiempo de espera ─────────────────────────────────────────
      const prob      = demoraProb(planta, monthOffset);
      const diceStatus = randFloat();

      let esperaMin    = null;
      let hAtencion    = null;
      let segmentoEspera = null;
      let segmentoOrden  = 0;
      let esDemora       = 0;
      let motivoDemora   = null;
      let observacion    = null;

      if (diceStatus < 0.04) {
        // Pendiente (sin atender aún) — solo en días recientes
        if (d <= 1) {
          // leave as null
        } else {
          // para datos históricos, forzar a "atendido rápido"
          esperaMin = randInt(5, 20);
        }
      }

      if (esperaMin === null && diceStatus >= 0.04) {
        if (diceStatus < (1 - prob)) {
          // Atención normal (< 30 min)
          esperaMin      = randInt(4, 29);
          segmentoEspera = "🟢 < 30 min";
          segmentoOrden  = 1;
        } else if (diceStatus < (1 - prob * 0.4)) {
          // En revisión (30-45 min)
          esperaMin      = randInt(30, 44);
          segmentoEspera = "🟡 30-45 min";
          segmentoOrden  = 2;
          esDemora       = 1;
        } else if (diceStatus < (1 - prob * 0.15)) {
          // Demora moderada (45-90 min)
          esperaMin      = randInt(45, 89);
          segmentoEspera = "🟠 45-90 min";
          segmentoOrden  = 3;
          esDemora       = 1;
          motivoDemora   = rand(MOTIVOS_DEMORA);
          observacion    = randFloat() > 0.5 ? "Notificado a supervisor" : null;
        } else {
          // Demora grave (> 90 min)
          esperaMin      = randInt(90, 180);
          segmentoEspera = "🔴 > 90 min";
          segmentoOrden  = 4;
          esDemora       = 1;
          motivoDemora   = rand(MOTIVOS_DEMORA);
          observacion    = "Requiere seguimiento urgente";
        }
      }

      // Calcular h_atencion
      if (esperaMin !== null) {
        const totalMin = hour * 60 + minute + esperaMin;
        const attH = Math.floor(totalMin / 60) % 24;
        const attM = totalMin % 60;
        hAtencion = `${String(attH).padStart(2,"0")}:${String(attM).padStart(2,"0")}:00`;
      }

      records.push({
        fecha:           fechaStr,
        h_registro:      hRegistro,
        h_atencion:      hAtencion,
        razon_social:    razonSocial,
        empresa,
        planta,
        tipo,
        tipo_operacion:  tipoOp,
        responsable,
        agente,
        espera_min:      esperaMin,
        segmento_espera: segmentoEspera,
        segmento_orden:  segmentoOrden,
        es_demora:       esDemora,
        motivo_demora:   motivoDemora,
        observacion,
        anio,
        mes_num:         mesNum,
        company_id:      companyId,
      });
    }
  }

  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 SmartGuard Demo Seeder v2 — 6 meses de data realista\n");

  // 1. Limpiar demo anterior si existe
  const { data: existing } = await admin
    .from("companies")
    .select("id")
    .eq("name", "Transportes del Norte S.A.C.")
    .maybeSingle();

  if (existing) {
    console.log("⚠️  Demo anterior encontrada. Limpiando...");

    // Borrar atenciones en lotes de 1000
    let deletedCount = 0;
    while (true) {
      const { data: batch } = await admin
        .from("atenciones")
        .select("id")
        .eq("company_id", existing.id)
        .limit(1000);
      if (!batch?.length) break;
      await admin.from("atenciones").delete().in("id", batch.map(r => r.id));
      deletedCount += batch.length;
      process.stdout.write(`\r   🗑️  ${deletedCount} registros eliminados...`);
    }
    if (deletedCount) console.log();

    // Borrar usuarios demo
    const { data: usersData } = await admin.auth.admin.listUsers();
    const demoUsers = (usersData?.users ?? []).filter(u =>
      u.email?.endsWith("@demo.smartguard.io")
    );
    for (const u of demoUsers) {
      await admin.auth.admin.deleteUser(u.id);
      console.log(`   🗑️  Usuario ${u.email} eliminado`);
    }

    // Borrar empresa (hard delete — es demo)
    await admin.from("companies").delete().eq("id", existing.id);
    console.log("   🗑️  Empresa demo eliminada\n");
  }

  // 2. Crear empresa demo
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  const expiryStr = expiryDate.toISOString().split("T")[0];

  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({
      name:                 "Transportes del Norte S.A.C.",
      sector:               "Logística y Distribución",
      contact_name:         "Ing. Ricardo Sánchez",
      notification_emails:  ["supervisor@demo.smartguard.io"],
      notification_phones:  [],
      plantas:              PLANTAS,
      plan:                 "trial",
      trial_ends_at:        expiryStr,
    })
    .select("id")
    .single();

  if (companyErr) {
    console.error("❌ Error creando empresa:", companyErr.message);
    process.exit(1);
  }

  const companyId = company.id;
  console.log(`✅ Empresa creada: Transportes del Norte S.A.C. (${companyId.slice(0, 8)}...)`);

  // 3. Crear usuarios
  const users = [
    {
      email:    DEMO_EMAIL,
      password: DEMO_PASSWORD,
      meta:     { role: "supervisor", company_id: companyId, company: "Transportes del Norte S.A.C." },
      label:    "Supervisor",
    },
    {
      email:    GUARDIA1_EMAIL,
      password: GUARDIA_PASSWORD,
      meta:     { role: "guardia", company_id: companyId, company: "Transportes del Norte S.A.C.", plant: "Lomas" },
      label:    "Guardia Lomas",
    },
    {
      email:    GUARDIA2_EMAIL,
      password: GUARDIA_PASSWORD,
      meta:     { role: "guardia", company_id: companyId, company: "Transportes del Norte S.A.C.", plant: "Callao" },
      label:    "Guardia Callao",
    },
    {
      email:    GUARDIA3_EMAIL,
      password: GUARDIA_PASSWORD,
      meta:     { role: "guardia", company_id: companyId, company: "Transportes del Norte S.A.C.", plant: "Cajamarquilla" },
      label:    "Guardia Cajamarquilla",
    },
  ];

  for (const u of users) {
    const { error } = await admin.auth.admin.createUser({
      email:          u.email,
      password:       u.password,
      email_confirm:  true,
      user_metadata:  u.meta,
    });
    if (error) {
      console.error(`❌ Error creando ${u.label}:`, error.message);
    } else {
      console.log(`✅ ${u.label}: ${u.email}`);
    }
  }

  // 4. Generar registros
  console.log("\n⏳ Generando registros (6 meses)...");
  const records = generateRecords(companyId);
  console.log(`   📊 ${records.length} registros generados`);

  // 5. Insertar en lotes de 200
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error: insertErr } = await admin.from("atenciones").insert(batch);
    if (insertErr) {
      console.error(`\n❌ Error en lote ${i}–${i + BATCH}:`, insertErr.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\r   💾 Insertando... ${inserted}/${records.length}`);
  }
  console.log("\n");

  // 6. Resumen
  const onTime  = records.filter(r => r.espera_min !== null && r.espera_min < 30).length;
  const review  = records.filter(r => r.espera_min !== null && r.espera_min >= 30 && r.espera_min < 45).length;
  const delayM  = records.filter(r => r.espera_min !== null && r.espera_min >= 45 && r.espera_min < 90).length;
  const delayG  = records.filter(r => r.espera_min !== null && r.espera_min >= 90).length;
  const pending = records.filter(r => r.espera_min === null).length;

  const byPlanta = {};
  for (const r of records) {
    if (!byPlanta[r.planta]) byPlanta[r.planta] = 0;
    byPlanta[r.planta]++;
  }

  console.log("📈 Resumen de registros:");
  console.log("─────────────────────────────────────────────────────");
  console.log(`  Total:            ${records.length} registros`);
  console.log(`  🟢 A tiempo:      ${onTime}  (${pct(onTime, records.length)}%)`);
  console.log(`  🟡 En revisión:   ${review}  (${pct(review, records.length)}%)`);
  console.log(`  🟠 Demora mod.:   ${delayM}  (${pct(delayM, records.length)}%)`);
  console.log(`  🔴 Demora grave:  ${delayG}  (${pct(delayG, records.length)}%)`);
  console.log(`  ⚪ Pendientes:    ${pending}`);
  console.log("");
  console.log("  Por planta:");
  for (const [p, n] of Object.entries(byPlanta)) {
    console.log(`    ${p.padEnd(16)} ${n} registros`);
  }

  console.log("\n📋 Credenciales de acceso:");
  console.log("─────────────────────────────────────────────────────");
  console.log(`  Supervisor:          ${DEMO_EMAIL}`);
  console.log(`  Password:            ${DEMO_PASSWORD}`);
  console.log(`  Guardia Lomas:       ${GUARDIA1_EMAIL}`);
  console.log(`  Guardia Callao:      ${GUARDIA2_EMAIL}`);
  console.log(`  Guardia Cajamarq.:   ${GUARDIA3_EMAIL}`);
  console.log(`  Password guardias:   ${GUARDIA_PASSWORD}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("\n🚀 Demo lista. Ingresa en https://smart-guard-six.vercel.app/login\n");
}

function pct(n, total) {
  return total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
}

main().catch((e) => {
  console.error("❌ Error fatal:", e.message);
  process.exit(1);
});
