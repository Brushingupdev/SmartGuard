import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ──────────────────────────────────────────────────────────────────────────────
// SMartGuard RBAC Middleware
//
// Roles determined STRICTLY from user_metadata.role (no email fallback):
//   • administrador → /admin (full access, multi-tenant overview)
//   • supervisor    → /dashboard, /historial, /registro, /reporte, /empresa, /monitor, /perfil
//   • guardia       → /registro only (garita operations)
//
// Edge cases handled:
//   • Users WITHOUT metadata.role → treated as guardia (least privilege)
//   • Admin visiting /dashboard  → redirected to /admin
//   • Signed-in user on /login   → redirected to home based on role
//   • Guardia visiting protected → redirected to /registro
//   • Supervisor visiting /alertas or /usuarios → redirected to /dashboard
//
// Protected routes: /dashboard, /historial, /registro, /alertas, /usuarios,
// /reporte, /empresa, /admin, /monitor, /perfil
// Public routes: /, /login, /onboarding, /reset-password, /update-password
// ──────────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                           request.nextUrl.pathname.startsWith('/historial') ||
                           request.nextUrl.pathname.startsWith('/registro') ||
                           request.nextUrl.pathname.startsWith('/alertas') ||
                           request.nextUrl.pathname.startsWith('/usuarios') ||
                           request.nextUrl.pathname.startsWith('/reporte')  ||
                           request.nextUrl.pathname.startsWith('/empresa')  ||
                           request.nextUrl.pathname.startsWith('/admin')   ||
                           request.nextUrl.pathname.startsWith('/monitor')  ||
                           request.nextUrl.pathname.startsWith('/perfil')   ||
                           request.nextUrl.pathname.startsWith('/upgrade')

  // If the user is not signed in and the current path is a protected route, redirect to the login page
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If the user is signed in and trying to access the login page, redirect them based on their role
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    const metaRole = user.user_metadata?.role as string | undefined;
    const isGuardia = metaRole === 'guardia';
    const isAdmin   = metaRole === 'administrador';
    url.pathname = isGuardia ? '/registro' : isAdmin ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Admin visiting /dashboard → redirect to /admin (their home)
  // Exception: if impersonation cookie is set, allow through
  if (user && request.nextUrl.pathname === '/dashboard') {
    const metaRole = user.user_metadata?.role as string | undefined;
    const isAdmin  = metaRole === 'administrador';
    const impersonateCookie = request.cookies.get("sg_impersonate");
    if (isAdmin && !impersonateCookie?.value) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  // Admin on admin-only routes while impersonating → redirect to /dashboard
  if (user) {
    const metaRole = user.user_metadata?.role as string | undefined;
    const isAdmin  = metaRole === 'administrador';
    const impersonateCookie = request.cookies.get("sg_impersonate");
    const path = request.nextUrl.pathname;
    if (isAdmin && impersonateCookie?.value) {
      if (path.startsWith('/admin') || path.startsWith('/monitor') || path.startsWith('/usuarios')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // --- ROLE-BASED ACCESS CONTROL (RBAC) ---
  if (user) {
    const metaRole = user.user_metadata?.role as string | undefined;
    const isGuardia    = metaRole === 'guardia';
    const isSupervisor = metaRole === 'supervisor';
    const path = request.nextUrl.pathname;

    // Guardias: solo /registro
    if (isGuardia && (path.startsWith('/dashboard') || path.startsWith('/historial') || path.startsWith('/alertas') || path.startsWith('/usuarios') || path.startsWith('/reporte'))) {
      const url = request.nextUrl.clone()
      url.pathname = '/registro'
      return NextResponse.redirect(url)
    }

    // Supervisores: sin acceso a /usuarios
    if (isSupervisor && path.startsWith('/usuarios')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // ── Trial / plan enforcement ───────────────────────────────────────────────
  // Only for company users (supervisor / guardia), not admin.
  // Uses a short-lived cookie (sg_plan) to avoid a DB round-trip on every request.
  if (user && isProtectedRoute) {
    const metaRole    = user.user_metadata?.role as string | undefined;
    const isAdmin     = metaRole === 'administrador';
    const path        = request.nextUrl.pathname;
    const companyId   = user.user_metadata?.company_id as string | undefined;

    if (!isAdmin && !path.startsWith('/upgrade') && companyId) {
      const planCookie = request.cookies.get('sg_plan');
      let isBlocked    = false;

      if (planCookie?.value === 'blocked') {
        // Cache hit — already known to be blocked
        isBlocked = true;
      } else if (planCookie?.value !== 'ok') {
        // No valid cache — query Supabase (uses user session + RLS)
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('plan, trial_ends_at')
            .eq('id', companyId)
            .single();

          if (company) {
            const plan        = company.plan as string;
            const trialEndsAt = company.trial_ends_at as string | null;
            if (plan === 'suspended') {
              isBlocked = true;
            } else if (plan === 'trial' && trialEndsAt) {
              isBlocked = new Date(trialEndsAt + 'T23:59:59') < new Date();
            }
          }
        } catch {
          // Query failed — fail open (don't block)
        }

        if (isBlocked) {
          const upgradeUrl = request.nextUrl.clone();
          upgradeUrl.pathname = '/upgrade';
          const redirectRes = NextResponse.redirect(upgradeUrl);
          redirectRes.cookies.set('sg_plan', 'blocked', {
            httpOnly: true, sameSite: 'lax', maxAge: 15 * 60, path: '/',
          });
          return redirectRes;
        }

        // Cache the "ok" result for 15 minutes
        supabaseResponse.cookies.set('sg_plan', 'ok', {
          httpOnly: true, sameSite: 'lax', maxAge: 15 * 60, path: '/',
        });
      }

      if (isBlocked) {
        const upgradeUrl = request.nextUrl.clone();
        upgradeUrl.pathname = '/upgrade';
        return NextResponse.redirect(upgradeUrl);
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
