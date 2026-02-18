import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

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
