export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Protect everything EXCEPT:
     * - /login (the sign-in page itself)
     * - /api/auth (NextAuth endpoints — login, callback, csrf, session)
     * - /_next (static assets, webpack HMR)
     * - /favicon.ico, /robots.txt (public files)
     */
    '/((?!login|api/auth|_next|favicon\\.ico|robots\\.txt).*)',
  ],
}
