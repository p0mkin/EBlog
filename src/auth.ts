import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

/**
 * Compute a stable identifier for the user based on their provider:
 * - GitHub → their username (profile.login), always available
 * - Google → their email, always available
 * This identifier is stored in User.email in the DB and used for
 * permission queries, role assignment, etc.
 */
function getUserIdentifier(
    user: any,
    profile: any,
    account: any,
): string | null {
    // Google always provides a real email
    if (account?.provider === 'google') {
        return user?.email || profile?.email || null;
    }

    // GitHub: use the login (username) — always present, even for
    // accounts created via Google auth on GitHub's side
    if (account?.provider === 'github') {
        return profile?.login || user?.email || null;
    }

    // Unknown provider fallback
    return user?.email || profile?.email || null;
}

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
        async signIn({ user, profile, account }) {
            try {
                const identifier = getUserIdentifier(user, profile, account);
                if (!identifier) return true; // extremely rare, still allow sign-in

                const displayName =
                    user.name ||
                    (profile as any)?.login ||
                    (profile as any)?.name ||
                    identifier;

                await prisma.user.upsert({
                    where: { email: identifier.toLowerCase() },
                    update: { name: displayName },
                    create: {
                        email: identifier.toLowerCase(),
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

            // Override token.email with our stable identifier so it
            // flows through to session.user.email for permission queries
            if (account && profile) {
                const identifier = getUserIdentifier(user, profile, account);
                if (identifier) {
                    token.email = identifier.toLowerCase();
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
        error: '/api/auth/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
