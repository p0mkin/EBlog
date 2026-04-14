import { getSession } from "@/lib/session";
import { isOwner as checkIsOwner } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import FeedClientWrapper from "./FeedClientWrapper";

export default async function FeedPage() {
    const session = await getSession();
    if (!session?.user?.email) redirect("/api/auth/signin?callbackUrl=/feed");

    const isOwner = checkIsOwner(session);

    // Using session.user.email as the ID placeholder to match how we look things up
    return (
        <FeedClientWrapper isOwner={isOwner} currentUserId={session.user.email} />
    );
}
