import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

/** Development-only sign-in, so the app can be tried before Google OAuth credentials exist. */
export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";

const providers: Provider[] = [
  Google({ authorization: { params: { prompt: "select_account" } } }),
];

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev sign-in",
      credentials: { email: {}, name: {}, role: {} },
      async authorize(credentials) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const name = String(credentials.name ?? "").trim() || email.split("@")[0];
        const role = Object.values(Role).includes(credentials.role as Role) ? (credentials.role as Role) : Role.CUSTOMER;
        if (!email.includes("@")) return null;
        const user = await db.user.upsert({
          where: { email },
          update: { lastLoginAt: new Date(), role },
          create: { email, name, role, lastLoginAt: new Date() },
        });
        return user.disabled ? null : { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  // Encrypted, httpOnly JWT cookie. Authorization never trusts it alone: every request
  // re-loads the user (role, disabled flag) from the database — see lib/auth-helpers.ts.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || profile.email_verified === false) return false;

      const email = profile.email.toLowerCase();
      const googleSub = account.providerAccountId;
      const existing = await db.user.findFirst({ where: { OR: [{ googleSub }, { email }] } });
      if (existing?.disabled) return false;

      const data = {
        googleSub,
        email,
        name: profile.name ?? existing?.name ?? email.split("@")[0],
        googleImageUrl: typeof profile.picture === "string" ? profile.picture : null,
        lastLoginAt: new Date(),
      };
      const user = existing
        ? await db.user.update({ where: { id: existing.id }, data })
        : await db.user.create({ data });
      if (!existing) {
        await audit({ actorId: user.id, actorRole: user.role, action: "USER_CREATED", entityType: "User", entityId: user.id });
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account && token.email) {
        const user = await db.user.findUnique({ where: { email: token.email.toLowerCase() }, select: { id: true, role: true } });
        if (user) {
          token.uid = user.id;
          token.role = user.role;
          await audit({ actorId: user.id, actorRole: user.role, action: "LOGIN", entityType: "User", entityId: user.id, data: { provider: account.provider } });
        }
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      session.user.role = (token.role as Role) ?? Role.CUSTOMER;
      return session;
    },
  },
});
