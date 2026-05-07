"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Bell, Building2, ChevronLeft, ChevronRight,
  ClipboardList, CreditCard, History, LayoutDashboard, LayoutGrid,
  Menu, Users, X, LogOut, Activity, UserCircle,
  ShieldOff,
} from "lucide-react";
import { useState, useEffect } from "react";

// Ítems para supervisores y guardias
const supervisorItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard",  note: "Vista en vivo",      guardia: false },
  { href: "/registro",  icon: ClipboardList,   label: "Registro",   note: "Captura operativa",  guardia: true  },
  { href: "/alertas",   icon: Bell,            label: "Alertas",    note: "Incidentes activos", guardia: true  },
  { href: "/historial", icon: History,         label: "Historial",  note: "Trazabilidad",        guardia: false },
  { href: "/reporte",   icon: BarChart3,       label: "Análisis",   note: "Reporte detallado",  guardia: false },
  { href: "/empresa",   icon: Building2,       label: "Mi Empresa", note: "Configuración",      guardia: false },
];

// Ítems exclusivos del administrador
const adminItems = [
  { href: "/admin",        icon: LayoutGrid, label: "Empresas",  note: "Panel de control"    },
  { href: "/admin/pagos",  icon: CreditCard, label: "Pagos",     note: "Facturación"         },
  { href: "/monitor",      icon: Activity,   label: "Monitor",   note: "Salud del sistema"   },
  { href: "/usuarios",     icon: Users,      label: "Usuarios",  note: "Gestión de cuentas"  },
];

import { getUserProfile } from "@/app/actions";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Logo({
  compact = false,
  company,
  logoUrl,
  isAdmin = false,
}: {
  compact?: boolean;
  company?: string | null;
  logoUrl?: string | null;
  isAdmin?: boolean;
}) {
  const displayName = company ?? "SmartGuard";
  const isPowered = !!company;

  return (
    <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3">
      {logoUrl ? (
        <Image unoptimized width={32} height={32}
          src={logoUrl}
          alt={displayName}
          className="h-8 w-8 shrink-0 object-contain border border-[var(--sg-line)] bg-white p-0.5"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--sg-accent)]">
          {isPowered ? (
            <span className="sg-font-display text-[14px] font-bold uppercase text-[var(--sg-canvas)]">
              {displayName.trim().charAt(0)}
            </span>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-[var(--sg-canvas)]">
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          )}
        </div>
      )}
      {!compact && (
        <div className="min-w-0">
          <div
            className="sg-font-display font-bold uppercase leading-none text-[var(--sg-ink)]"
            style={{ fontSize: displayName.length > 14 ? "13px" : "15px", letterSpacing: "0.14em" }}
            title={displayName}
          >
            {displayName}
          </div>
          <div className="sg-font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--sg-muted)] mt-1">
            {isPowered ? "con tecnología de SmartGuard" : "Centro operativo"}
          </div>
        </div>
      )}
    </Link>
  );
}

function NavLinks({
  collapsed,
  pathname,
  onNavigate,
  isGuardia,
  isAdmin,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  isGuardia: boolean;
  isAdmin: boolean;
}) {
  const visibleNavItems = isAdmin
    ? adminItems
    : supervisorItems.filter(item => !isGuardia || item.guardia);

  return (
    <nav className="flex flex-col">
      {visibleNavItems.map((item, idx) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`group relative flex items-center gap-3 border-b border-[var(--sg-line)] px-4 py-4 transition-colors ${
              idx === 0 ? "border-t" : ""
            } ${
              isActive
                ? "bg-[var(--sg-panel-2)] text-[var(--sg-ink)]"
                : "text-[var(--sg-copy)] hover:bg-[var(--sg-panel-2)] hover:text-[var(--sg-ink)]"
            } ${collapsed ? "justify-center" : ""}`}
          >
            {isActive && (
              <motion.div
                layoutId="sg-sidebar-active"
                className="absolute left-0 top-0 h-full w-[3px] bg-[var(--sg-accent)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}

            <item.icon className="h-[18px] w-[18px] min-w-[18px]" strokeWidth={1.6} />

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.12em]">
                  {item.label}
                </div>
                <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mt-0.5">
                  {item.note}
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [detectedPlant, setDetectedPlant] = useState("Sede Central");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    getUserProfile().then((profile) => {
      if (profile) {
        setUserEmail(profile.email);
        setUserRole(profile.role);
        setCompanyName(profile.companyName);
        setLogoUrl(profile.logoUrl);
        setIsImpersonating(profile.isImpersonating ?? false);
        if (profile.plant) setDetectedPlant(profile.plant);
      }
      setProfileLoaded(true);
    });
  }, []);

  const isGuardia = userRole === "guardia";
  const isAdmin   = userRole === "administrador" && !isImpersonating;

  const handleStopImpersonation = async () => {
    const { stopImpersonation } = await import("@/app/actions/companies");
    await stopImpersonation();
    router.push("/admin");
  };

  return (
    <>
      {/* Mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-40 border-b border-[var(--sg-line)] bg-[rgba(10,12,11,0.96)] backdrop-blur lg:hidden">
        <div className="sg-shell flex h-[64px] items-center justify-between">
          <Logo company={companyName} logoUrl={logoUrl} isAdmin={isAdmin} />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel)] text-[var(--sg-ink)]"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar menu"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[rgba(3,5,4,0.7)] lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="fixed inset-y-0 left-0 z-[60] flex w-[300px] flex-col border-r border-[var(--sg-line)] bg-[var(--sg-canvas-2)] lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4">
                <Logo company={companyName} logoUrl={logoUrl} isAdmin={isAdmin} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel)] text-[var(--sg-copy)]"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pt-4 pb-3">
                <div className="sg-slabel">Navegación</div>
              </div>
              {isImpersonating && companyName && (
                <div className="border-b border-[var(--sg-accent)] bg-[rgba(200,168,75,0.08)] px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
                      Viendo como
                    </span>
                    <button
                      onClick={handleStopImpersonation}
                      className="flex items-center gap-1 sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
                    >
                      <ShieldOff className="h-3 w-3" />
                      Volver
                    </button>
                  </div>
                  <div className="sg-font-display text-[12px] font-bold uppercase tracking-tight text-[var(--sg-ink)] truncate">
                    {companyName}
                  </div>
                  <div className="sg-font-mono text-[8px] text-[var(--sg-muted)] mt-0.5">
                    Solo lectura
                  </div>
                </div>
              )}
              {profileLoaded
                ? <NavLinks collapsed={false} pathname={pathname} onNavigate={() => setMobileOpen(false)} isGuardia={isGuardia} isAdmin={isAdmin} />
                : <div className="flex flex-col">{[0,1,2].map(i => <div key={i} className="h-[57px] border-b border-[var(--sg-line)] animate-pulse bg-[var(--sg-panel-2)]" />)}</div>
              }

              <div className="mt-auto border-t border-[var(--sg-line)] p-5">
                {!isAdmin && (
                  <>
                    <div className="sg-slabel mb-2">Turno activo</div>
                    <div className="sg-font-display text-[16px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
                      Garita {detectedPlant}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="sg-live-dot sg-pulse" />
                      <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-success)]">
                        Conectado
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--sg-line)]">
                  <Link
                    href="/perfil"
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-1 items-center gap-2 text-[var(--sg-copy)] hover:text-[var(--sg-ink)] transition-colors"
                  >
                    <UserCircle className="h-4 w-4 shrink-0" />
                    <span className="sg-font-mono text-[10px] uppercase tracking-[0.16em]">Mi Perfil</span>
                  </Link>
                  <form action={async () => {
                    const { logout } = await import('@/app/login/actions');
                    await logout();
                  }}>
                    <button type="submit" className="flex items-center gap-1.5 text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
                      <LogOut className="h-4 w-4" />
                      <span className="sg-font-mono text-[10px] uppercase tracking-[0.16em]">Salir</span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.28, ease: easeOut }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--sg-line)] bg-[var(--sg-canvas-2)] lg:flex"
      >
        <div className={`flex items-center border-b border-[var(--sg-line)] px-5 py-4 ${collapsed ? "justify-center px-0" : ""}`}>
          <Logo compact={collapsed} company={companyName} logoUrl={logoUrl} isAdmin={isAdmin} />
        </div>

        {!collapsed && (
          isAdmin ? (
            <div className="border-b border-[var(--sg-accent)] bg-[rgba(200,168,75,0.06)] px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-[var(--sg-accent)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-accent)]">
                  Modo Administrador
                </span>
              </div>
              <div className="text-[11px] text-[var(--sg-muted)] font-light">
                Acceso total · todas las empresas
              </div>
            </div>
          ) : (
            <div className="border-b border-[var(--sg-line)] px-5 py-4">
              <div className="sg-slabel mb-2">Estado</div>
              <div className="flex items-center gap-2">
                <span className="sg-live-dot sg-pulse" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-success)]">
                  Operación en línea
                </span>
              </div>
              <div className="mt-2 text-[12px] leading-[1.5] text-[var(--sg-copy)] font-light">
                Sede: {detectedPlant}
              </div>
            </div>
          )
        )}

        {!collapsed && isImpersonating && companyName && (
          <div className="border-b border-[var(--sg-accent)] bg-[rgba(200,168,75,0.08)] px-5 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
                Viendo como
              </span>
              <button
                onClick={handleStopImpersonation}
                className="flex items-center gap-1 sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
              >
                <ShieldOff className="h-3 w-3" />
                Volver
              </button>
            </div>
            <div className="sg-font-display text-[12px] font-bold uppercase tracking-tight text-[var(--sg-ink)] truncate">
              {companyName}
            </div>
            <div className="sg-font-mono text-[8px] text-[var(--sg-muted)] mt-0.5">
              Solo lectura
            </div>
          </div>
        )}

        <div className={`px-5 py-3 ${collapsed ? "text-center" : ""}`}>
          <div className={`sg-slabel ${collapsed ? "text-[8px]" : ""}`}>
            {collapsed ? "NAV" : isImpersonating ? "Menú" : isAdmin ? "Panel Admin" : "Menú"}
          </div>
        </div>

        {profileLoaded
          ? <NavLinks collapsed={collapsed} pathname={pathname} isGuardia={isGuardia} isAdmin={isAdmin} />
          : <div className="flex flex-col">{[0,1,2].map(i => <div key={i} className="h-[57px] border-b border-[var(--sg-line)] animate-pulse bg-[var(--sg-panel-2)]" />)}</div>
        }

        <div className="mt-auto flex flex-col border-t border-[var(--sg-line)]">
          {!collapsed && (
            <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center border sg-font-display text-[12px] font-bold ${
                isAdmin || isImpersonating
                  ? "bg-[rgba(200,168,75,0.15)] border-[var(--sg-accent)] text-[var(--sg-accent)]"
                  : "bg-[var(--sg-panel-2)] border-[var(--sg-line)] text-[var(--sg-ink)]"
              }`}>
                {userEmail ? userEmail.slice(0, 2).toUpperCase() : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="sg-font-display text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)] truncate" title={userEmail ?? ""}>
                  {userEmail ? userEmail.split("@")[0] : "Usuario"}
                </div>
                <div className={`sg-font-mono text-[9px] uppercase tracking-[0.16em] ${isAdmin || isImpersonating ? "text-[var(--sg-accent)]" : "text-[var(--sg-muted)]"}`}>
                  {isAdmin ? "Administrador · SmartGuard"
                   : isImpersonating ? "Admin · viendo empresa"
                   : isGuardia ? "Guardia · " + detectedPlant
                   : "Supervisor · " + detectedPlant}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/perfil"
                  className="inline-flex h-8 w-8 items-center justify-center border border-[var(--sg-line)] text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                  title="Mi perfil"
                >
                  <UserCircle className="h-3.5 w-3.5" />
                </Link>
                <form action={async () => {
                  const { logout } = await import('@/app/login/actions');
                  await logout();
                }}>
                  <button
                    type="submit"
                    className="inline-flex h-8 w-8 items-center justify-center border border-[var(--sg-line)] text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
                    aria-label="Salir"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={`flex items-center gap-3 px-5 py-4 sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)] transition-colors hover:bg-[var(--sg-panel-2)] hover:text-[var(--sg-ink)] ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Compactar</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
