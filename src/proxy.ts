import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply logic to dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  // Build a Supabase client that can read cookies from the request
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not authenticated — let the layout handle the redirect to /login
    return response
  }

  // Fetch the role for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.roles?.name as string | undefined

  // ─── ROLE: reportes ────────────────────────────────────────────────────────
  // This role is allowed ONLY on /dashboard/reportes (and its sub-paths)
  if (role === 'reportes' && !pathname.startsWith('/dashboard/reportes')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/reportes'
    return NextResponse.redirect(url)
  }

  // ─── ROLE: visualizador ────────────────────────────────────────────────────
  // Allowed routes: inscripciones, asistencia, tutores, calificaciones, reportes
  const VISUALIZADOR_ALLOWED = [
    '/dashboard/inscripciones',
    '/dashboard/asistencia',
    '/dashboard/tutores',
    '/dashboard/calificaciones',
    '/dashboard/reportes',
  ]
  if (role === 'visualizador' && !VISUALIZADOR_ALLOWED.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/inscripciones'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Match all dashboard routes (excluding static assets and API routes)
  matcher: ['/dashboard/:path*'],
}
