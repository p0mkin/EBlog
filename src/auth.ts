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
            // Google always provides email; GitHub may not if email is private
            const email = user.email || (profile as any)?.email;
            if (!email) {
                console.warn('Sign-in rejected: no email available for', profile);
                return false;
            }

            // Derive a display name from whatever the provider gives us
            const displayName =
                user.name ||
                (profile as any)?.login ||   // GitHub username
                (profile as any)?.name ||     // Google display name
                email.split('@')[0];

            // Derive a "username" (GitHub login or email prefix)
            const username =
                (profile as any)?.login ||    // GitHub
                email.split('@')[0];          // Google fallback

            // Upsert: create on first sign-in, update name on subsequent ones
            await prisma.user.upsert({
                where: { email: email.toLowerCase() },
                update: { name: displayName },
                create: {
                    email: email.toLowerCase(),
                    name: displayName,
                    role: 'viewer',
                },
            });

            return true;
        },
        jwt({ token, user, profile, account }) {
            if (profile) {
                // GitHub provides `login`, Google provides `email`
                token.username = (profile as any).login || (profile as any).email?.split('@')[0];
                token.name = (profile as any).name || token.name;
            }
            // Fallback for cases where profile isn't available but user is
            if (user && !token.username) {
                token.username = (user as any).username || (user as any).login || user.email?.split('@')[0];
            }
            // Store the provider so we know which service the user used
            if (account) {
                token.provider = account.provider;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).username = token.username as string;
                (session.user as any).provider = token.provider as string;
                session.user.name = token.name as string || session.user.name;
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
