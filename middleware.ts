import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Check if maintenance mode is active in the environment
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true" || process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenanceMode) {
    const url = request.nextUrl.clone();

    // Allow access to the maintenance page and static assets/files
    const isStaticAsset =
      url.pathname.startsWith('/_next') ||
      url.pathname.includes('.') ||
      url.pathname === '/favicon.ico';

    if (url.pathname !== '/mantenimiento' && !isStaticAsset) {
      url.pathname = '/mantenimiento';
      return NextResponse.rewrite(url);
    }
  }

  return await updateSession(request);
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

