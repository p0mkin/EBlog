import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID || '',
            clientSecret: process.env.GITHUB_SECRET || '',
            authorization: {
                params: {
                    scope: 'read:user user:email',
                },
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
    ],
    callbacks: {
        async signIn({ user, profile, account }) {
            try {
                // Build an email: use real email if available, otherwise generate
                // a fallback from the provider (e.g. "octocat@github.noreply.com")
                const realEmail = user.email || (profile as any)?.email;
                const githubLogin = (profile as any)?.login;
                const providerAccountId = account?.providerAccountId;

                const email = realEmail
                    || (githubLogin ? `${githubLogin}@github.noreply.com` : null)
                    || (providerAccountId ? `${providerAccountId}@${account?.provider}.noreply.com` : null);

                if (!email) {
                    // Extremely rare edge case — still allow sign-in
                    console.warn('Sign-in with no identifiable email:', account?.provider);
                    return true;
                }

                const displayName =
                    user.name ||
                    githubLogin ||
                    (profile as any)?.name ||
                    email.split('@')[0];

                await prisma.user.upsert({
                    where: { email: email.toLowerCase() },
                    update: { name: displayName },
                    create: {
                        email: email.toLowerCase(),
                        name: displayName,
                        role: 'viewer',
                    },
                });
            } catch (err) {
                console.error('signIn callback error (non-fatal):', err);
            }

            return true;
        },
        jwt({ token, user, profile, account }) {
            if (profile) {
                token.username = (profile as any).login || (profile as any).email?.split('@')[0];
                token.name = (profile as any).name || token.name;
            }
            if (user && !token.username) {
                token.username = (user as any).username || (user as any).login || user.email?.split('@')[0];
            }
            if (account) {
                token.provider = account.provider;
            }

            // Ensure token always has an email — generate fallback for GitHub
            // users without a public email (same logic as signIn callback)
            if (!token.email && profile) {
                const githubLogin = (profile as any)?.login;
                const providerAccountId = account?.providerAccountId;
                token.email =
                    (githubLogin ? `${githubLogin}@github.noreply.com` : null)
                    || (providerAccountId ? `${providerAccountId}@${account?.provider}.noreply.com` : null)
                    || token.email;
            }

            return token;
        },
        session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).username = token.username as string;
                (session.user as any).provider = token.provider as string;
                session.user.name = token.name as string || session.user.name;
                // Always propagate email from token (includes fallback)
                session.user.email = token.email as string || session.user.email;
            }
            return session;
        },
    },
    pages: {
        // Use NextAuth's default pages but ensure error redirects work
        error: '/api/auth/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
