import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID || '',
            clientSecret: process.env.GITHUB_SECRET || '',
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
    ],
    callbacks: {
        // signIn: no DB calls here — just allow everyone through.
        // DB record creation happens lazily in the jwt callback instead.
        async signIn() {
            return true;
        },
        async jwt({ token, user, profile, account }) {
            // Only runs with profile/account on FIRST sign-in
            if (account && profile) {
                const provider = account.provider; // "github" | "google"
                const p = profile as any;

                if (provider === 'github') {
                    // GitHub: always has `login` (username)
                    token.username = p.login;
                    token.name = p.name || p.login;
                    token.email = `${p.login}-git`;
                } else if (provider === 'google') {
                    // Google: always has email
                    const email = p.email || user?.email || '';
                    token.username = email.split('@')[0];
                    token.name = p.name || token.username;
                    token.email = token.username as string;
                }

                token.provider = provider;

                // Fire-and-forget DB upsert — never blocks, never crashes sign-in
                const identifier = token.email as string;
                const displayName = (token.name as string) || identifier;
                if (identifier) {
                    prisma.user.upsert({
                        where: { email: identifier.toLowerCase() },
                        update: { name: displayName },
                        create: {
                            email: identifier.toLowerCase(),
                            name: displayName,
                            role: 'viewer',
                        },
                    }).catch(err => console.error('User upsert failed (non-fatal):', err));
                }
            }

            return token;
        },
        session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).username = token.username as string;
                (session.user as any).provider = token.provider as string;
                session.user.name = token.name as string || session.user.name;
                session.user.email = token.email as string || session.user.email;
            }
            return session;
        },
    },
    pages: {
        signIn: '/signin',
        error: '/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
