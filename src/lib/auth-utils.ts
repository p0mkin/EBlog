import type { Session } from 'next-auth';

/**
 * Check if the current session belongs to the site owner.
 *
 * Matches against OWNER_EMAIL and OWNER_USERNAME env vars.
 * Session email is now a provider-suffixed identifier:
 *   - GitHub users: "username-git"
 *   - Google users: "username-google"
 *
 * So OWNER_USERNAME should be set to the GitHub login or Google username.
 * The check matches: session email, session username, or session name
 * against either OWNER_EMAIL or OWNER_USERNAME.
 */
export function isOwner(session: Session | null): boolean {
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();

    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();

    // Match on any combination
    const candidates = [userEmail, userUsername, userName].filter(Boolean);
    const owners = [ownerEmail, ownerUsername].filter(Boolean);

    // Also check if session email without suffix matches owner username
    // e.g. "octocat-git" matches OWNER_USERNAME="octocat"
    const emailBase = userEmail?.replace(/-git$/, '').replace(/-google$/, '');
    if (emailBase) candidates.push(emailBase);

    return candidates.some(c => owners.includes(c!));
}
