import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { logActivity } from "@/lib/activity";

const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase() || "";
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(email);
    },
    session({ session }) {
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      await logActivity(
        user.email || "desconocido",
        "inicio_sesion",
        user.name || undefined
      );
    },
    async signOut(message) {
      const token = "token" in message ? (message.token as { email?: string; name?: string }) : undefined;
      const session = "session" in message ? (message.session as { user?: { email?: string; name?: string } } | undefined) : undefined;
      const email = token?.email || session?.user?.email;
      const name = token?.name || session?.user?.name;
      await logActivity(email || "desconocido", "cierre_sesion", name || undefined);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
