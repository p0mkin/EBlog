import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
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
    ],
    callbacks: {
        async signIn({ user, profile }) {
            if (!user.email) return false;
            // Upsert: create user on first sign-in, update name on subsequent ones
            await prisma.user.upsert({
                where: { email: user.email },
                update: { name: user.name || (profile as any)?.login || '' },
                create: {
                    email: user.email,
                    name: user.name || (profile as any)?.login || '',
                    role: 'viewer',
                },
            });
            return true;
        },
        jwt({ token, user, profile }) {
            if (profile) {
                token.username = (profile as any).login;
                token.name = (profile as any).name;
            }
            // Fallback for cases where profile isn't available but user is
            if (user && !token.username) {
                token.username = (user as any).username || (user as any).login;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).username = token.username as string;
                session.user.name = token.name as string || session.user.name;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
