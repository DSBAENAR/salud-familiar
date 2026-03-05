import { auth } from "@/lib/auth";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    // Protect everything except login, api/auth, static files
    "/((?!login|api/auth|api/gmail/callback|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
