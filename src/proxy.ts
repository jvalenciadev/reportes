import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── MAINTENANCE MODE ────────────────────────────────────────────────────────
  const isMaintenanceMode =
    process.env.MAINTENANCE_MODE === 'true' ||
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'

  if (isMaintenanceMode) {
    const isStaticAsset =
      pathname.startsWith('/_next') ||
      pathname.includes('.') ||
      pathname === '/favicon.ico'

    if (pathname !== '/mantenimiento' && !isStaticAsset) {
      const url = request.nextUrl.clone()
      url.pathname = '/mantenimiento'
      return NextResponse.rewrite(url)
    }
  }

  // ─── SESSION REFRESH (required for Supabase Server Components) ───────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ─── ROLE-BASED ROUTING (only for /dashboard routes) ─────────────────────────
  if (pathname.startsWith('/dashboard') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles(name)')
      .eq('id', user.id)
      .single()

    const role = (profile as any)?.roles?.name as string | undefined

    // ROLE: reportes — allowed ONLY on /dashboard/reportes
    if (role === 'reportes' && !pathname.startsWith('/dashboard/reportes')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/reportes'
      return NextResponse.redirect(url)
    }

    // ROLE: visualizador — allowed routes only
    const VISUALIZADOR_ALLOWED = [
      '/dashboard/inscripciones',
      '/dashboard/asistencia',
      '/dashboard/tutores',
      '/dashboard/calificaciones',
      '/dashboard/reportes',
    ]
    if (
      role === 'visualizador' &&
      !VISUALIZADOR_ALLOWED.some((p) => pathname.startsWith(p))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/inscripciones'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * Covers: maintenance mode (all routes) + session refresh + role routing.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export default proxy
