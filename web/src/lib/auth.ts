import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credenziali",
      credentials: {
        telefono: { label: "Telefono", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.telefono || !credentials?.password) return null;

        const input = (credentials.telefono as string).replace(/\s/g, "");
        const telefono = input.startsWith("+39") ? input : `+39${input}`;

        const user = await prisma.user.findUnique({
          where: { telefono },
        });

        if (!user || !user.attivo) return null;
        if (!user.passwordHash) return null; // password non ancora impostata

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: `${user.nome} ${user.cognome}`,
          role: user.ruolo,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
});
