import type { Variants } from "framer-motion";
import {
  Bell,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  type LucideIcon,
  ShieldCheck,
  Upload,
  Users,
  Zap,
} from "lucide-react";

export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const numberFormatter = new Intl.NumberFormat("en-US");

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.55, ease: easeOut },
  }),
};

export const landingNavLinks = [
  { label: "Características", href: "#modulos" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Precios", href: "#precios" },
] as const;

export const heroTags = ["Sin instalación", "Multi-planta", "Datos en tiempo real"] as const;

export const heroEvents = [
  { plate: "ABC-4521", info: "Entrada · Garita Principal", time: "08:14", tone: "is-ok" },
  { plate: "XYZ-9983", info: "Denegado · Sin permiso", time: "08:09", tone: "is-deny" },
  { plate: "MKL-1102", info: "Salida · Garita Sur", time: "07:58", tone: "is-ok" },
  { plate: "PPQ-7734", info: "Revisión manual requerida", time: "07:51", tone: "is-warn" },
] as const;

export const stats = [
  { num: "100", suffix: "%", label: "Trazabilidad de registros" },
  { num: "<2", suffix: "s", label: "Tiempo de respuesta" },
  { num: "24", suffix: "/7", label: "Monitoreo continuo" },
  { num: "3", suffix: "", label: "Roles de acceso diferenciados" },
] as const;

type LandingStep = {
  num: string;
  title: string;
  desc: string;
  icon: LucideIcon;
};

export const steps: LandingStep[] = [
  {
    num: "01",
    title: "Registra tu empresa",
    desc: "Crea la cuenta de tu empresa en minutos. Configura el nombre de tu planta y los datos del supervisor principal.",
    icon: Building2,
  },
  {
    num: "02",
    title: "Carga tu personal",
    desc: "Importa la lista de responsables desde un archivo CSV exportado de Excel. El sistema queda configurado al instante.",
    icon: Upload,
  },
  {
    num: "03",
    title: "Opera en tiempo real",
    desc: "Tus guardias registran accesos desde la garita. Los supervisores monitorean el dashboard en vivo y auditan todo.",
    icon: Zap,
  },
];

type LandingModule = {
  num: string;
  name: string;
  desc: string;
  icon: LucideIcon;
};

export const modules: LandingModule[] = [
  {
    num: "01",
    name: "Control de Acceso",
    desc: "Gestión centralizada de vehículos por garita y zona. Registro de entrada, salida y revisiones con trazabilidad completa.",
    icon: ShieldCheck,
  },
  {
    num: "02",
    name: "Dashboard KPIs",
    desc: "Tablero ejecutivo con indicadores en tiempo real: flujo vehicular, incidentes activos, ocupación y alertas.",
    icon: LayoutDashboard,
  },
  {
    num: "03",
    name: "Registro Operativo",
    desc: "Formulario estructurado para el ingreso de vehículos con captura de datos completa y flujo de 3 pasos.",
    icon: ClipboardList,
  },
  {
    num: "04",
    name: "Historial & Auditoría",
    desc: "Registro histórico con filtros avanzados, exportación CSV y trazabilidad completa de eventos por período.",
    icon: History,
  },
  {
    num: "05",
    name: "Alertas & Seguridad",
    desc: "Notificaciones automáticas para demoras, accesos denegados e intentos de ingreso no autorizados.",
    icon: Bell,
  },
  {
    num: "06",
    name: "Gestión de Usuarios",
    desc: "Roles diferenciados por guardia y supervisor con permisos granulares configurables por planta y turno.",
    icon: Users,
  },
];

export const trialFeatures = [
  "Todo el Plan Pro incluido",
  "Dashboard, reportes y alertas",
  "Usuarios, sedes y garitas para la demo",
  "Importación de datos históricos",
  "Soporte de activación por WhatsApp",
] as const;

export const proFeatures = [
  "Operación inicial multi-garita",
  "Usuarios operativos incluidos",
  "Dashboard KPIs en tiempo real",
  "Alertas WhatsApp + Email",
  "Reportes PDF + Excel con logo",
  "Importación de datos históricos",
  "Configuración por sede/planta",
  "Soporte prioritario por WhatsApp",
] as const;

export const enterpriseFeatures = [
  "Todo lo del Plan Pro",
  "Múltiples sedes y garitas avanzadas",
  "Onboarding y capacitación al equipo",
  "SLA de disponibilidad garantizado",
  "API de integración con ERP/WMS",
  "Gerente de cuenta dedicado",
  "Reportes a medida",
  "Facturación empresarial",
] as const;

export const pricingGuarantees = [
  { label: "Sin permanencia", desc: "Cancela cuando quieras, sin penalidades ni contratos." },
  { label: "Sin instalación", desc: "100% en la nube. Funciona desde cualquier dispositivo con internet." },
  { label: "Soporte real", desc: "Atención directa por WhatsApp. Sin bots, sin tickets sin respuesta." },
] as const;

export const sectors = [
  "Manufactura",
  "Logística",
  "Distribución",
  "Minería",
  "Construcción",
  "Agroindustria",
] as const;

export const productFooterLinks = [
  { label: "Características", href: "#modulos" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Precios", href: "#precios" },
  { label: "Registrar empresa", href: "/onboarding" },
] as const;

export const accessFooterLinks = [
  { label: "Iniciar Sesión", href: "/login" },
  { label: "Recuperar contraseña", href: "/reset-password" },
] as const;
