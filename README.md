# SmartGuard

Plataforma SaaS de control de acceso vehicular industrial. Registro en tiempo real, trazabilidad operativa y monitoreo de KPIs.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| UI | Framer Motion, Recharts, Lucide Icons |
| Validación | Zod v4 |
| Email | Resend |
| Testing | Vitest |

## Arquitectura

```
src/
├── app/
│   ├── actions/          # Server Actions (CRUD + dashboard + alertas)
│   │   ├── atenciones.ts # CRUD principal de registros vehiculares
│   │   ├── dashboard.ts  # Stats, KPIs, tendencias (usa RPCs SQL)
│   │   ├── companies.ts  # Gestión de empresas (admin)
│   │   ├── users.ts      # Gestión de usuarios (admin)
│   │   ├── alertas.ts    # Alertas y notificaciones
│   │   ├── _helpers.ts   # Utilidades compartidas (nowLima, calcSegmento, logError)
│   │   └── index.ts      # Re-exporta todo
│   ├── dashboard/        # Vista principal del supervisor
│   ├── registro/         # Formulario de captura (garita)
│   ├── historial/        # Historial con filtros y paginación
│   ├── reporte/          # Análisis detallado
│   ├── admin/            # Panel multi-empresa (administrador)
│   ├── monitor/          # Salud del sistema (administrador)
│   ├── onboarding/       # Registro de nuevas empresas
│   └── login/            # Auth (login, reset-password, update-password)
├── components/           # Componentes React compartidos
├── lib/
│   ├── validations.ts    # Esquemas Zod para toda la app
│   └── humanizeError.ts  # Mensajes de error amigables
├── utils/
│   └── supabase/
│       ├── client.ts     # Browser client (SSR)
│       ├── server.ts     # Server client (cookies)
│       ├── admin.ts      # Service role client
│       └── user.ts       # getUserContext (RBAC)
├── proxy.ts               # RBAC + protección de rutas
└── types/                # Interfaces TypeScript
```

## Roles

| Rol | Acceso |
|-----|--------|
| `administrador` | Panel admin, monitor, todas las empresas, gestión de usuarios |
| `supervisor` | Dashboard, historial, reporte, registro, empresa, alertas |
| `guardia` | Solo /registro (modo garita) |

Los roles se determinan por `user.user_metadata.role`. Sin metadata → `guardia` (menor privilegio).

## Flujos principales

### Registro vehicular (3 pasos)
1. **Registrar ingreso** → crea registro con `h_registro`
2. **Marcar atención** → calcula `espera_min` = `h_atencion - h_registro`
3. **Entregar documentos** → calcula `tiempo_total_min` = `h_dev_docs - h_registro`

Si `espera_min >= 45` → se dispara alerta automática (email + WhatsApp).

### Segmentación de demoras
| Segmento | Rango | Color |
|----------|-------|-------|
| Normal | < 30 min | Verde |
| Moderado | 30–45 min | Amarillo |
| Alto | 45–90 min | Naranja |
| Crítico | > 90 min | Rojo |

## Base de datos

### Tablas principales
- `atenciones` — registros vehiculares
- `companies` — empresas clientes
- `user_profiles` — perfiles (sync con auth.users via trigger)
- `responsables` — responsables de almacén por empresa
- `company_plant_contacts` — contactos por planta
- `alert_logs` — log de alertas enviadas
- `error_logs` — errores de aplicación

### RPCs SQL (optimización)
- `get_dashboard_kpis` — KPIs del dashboard
- `get_dashboard_flow` — flujo de acceso agrupado
- `get_dashboard_events` — eventos recientes
- `get_dashboard_breakdown` — desglose por planta
- `get_reporte_stats` — estadísticas del reporte
- `get_historial_stats` — estadísticas del historial
- `get_active_personnel` — personal activo
- `get_user_plants` — plantas configuradas

### Seguridad
- **RLS** en todas las tablas: aislamiento por `company_id`
- **Defense-in-depth**: RLS + filtro explícito en queries
- **Service role** solo para operaciones admin (bypass RLS)

## Variables de entorno

Ver `.env.example` para la lista completa.

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Service role key (server-side) |
| `UPSTASH_REDIS_REST_URL` | Sí | URL de Upstash Redis (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Sí | Token de Upstash Redis |

## Desarrollo

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Ejecutar en desarrollo
npm run dev

# Tests
npm run test

# Lint
npm run lint

# Build
npm run build
```

## Migrations

Las migraciones SQL están en `supabase/migrations/`. Se ejecutan automáticamente con Supabase CLI:

```bash
supabase db push
```

Orden de ejecución:
1. `20260501090000_rls_policies.sql` — RLS + user_profiles + trigger
2. `20260501090001_dashboard_functions.sql` — RPCs del dashboard
3. `20260501090002_error_logs.sql` — tabla error_logs
4. `20260502000000_error_logs.sql` — (duplicado, ignorar)

## Deploy

La app está optimizada para **Vercel**:
1. Conectar repo de GitHub
2. Configurar variables de entorno
3. Deploy automático en push a `main`

Para otros entornos, ejecutar `npm run build` y servir con `npm run start`.

## Convenciones

- **Server Actions**: toda lógica de negocio en `src/app/actions/`
- **Validación**: usar schemas Zod de `src/lib/validations.ts`
- **Errores**: usar `logError()` de `_helpers.ts` (persiste a `error_logs`)
- **Tiempo**: usar `nowLima()` para consistencia timezone (America/Lima)
- **Estilos**: CSS variables `--sg-*` definidas en `globals.css`
- **Componentes**: Client components con `"use client"`, Server Components por defecto
