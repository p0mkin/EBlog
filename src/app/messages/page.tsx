import { getSession } from "@/lib/session";
import { isOwner as checkIsOwner } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage() {
    const session = await getSession();
    if (!session?.user?.email) redirect("/api/auth/signin?callbackUrl=/messages");

    const isOwner = checkIsOwner(session);

    return (
        <MessagesClient isAdmin={isOwner} currentUserId={session.user.email} />
    );
}
