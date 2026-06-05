import { getSession } from "@/lib/session";
import { isOwner as checkIsOwner } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage() {
    const session = await getSession();
    if (!session?.user?.email) redirect("/api/auth/signin?callbackUrl=/messages");

    const isOwner = checkIsOwner(session);

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
    });

    return (
        <MessagesClient isAdmin={isOwner} currentUserId={dbUser?.id || ""} />
    );
}
