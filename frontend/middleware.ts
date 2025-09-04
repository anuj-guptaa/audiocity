import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get('token')?.value; // or your auth cookie name

  // Paths that are allowed without login
  const publicPaths = ['/login', '/login/password-reset', '/_next', '/api'];

  const isPublic = publicPaths.some(path => url.pathname.startsWith(path));

  if (!isPublic && !token) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Apply middleware to all routes except /login and /api
export const config = {
  matcher: [
    '/',                // root
    '/store/:path*',    // protect /store and all subpaths
    '/dashboard/:path*' // protect /dashboard too
  ],
};
