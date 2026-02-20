import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

function isOwnerCheck(session: any) {
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    return (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));
}

// POST assign a user to a role by email
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, userEmail } = await req.json();
    if (!roleId || !userEmail) {
        return NextResponse.json({ error: "roleId and userEmail required" }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
    if (!user) {
        user = await prisma.user.create({
            data: { email: userEmail.toLowerCase(), name: userEmail.split('@')[0] }
        });
    }

    const assignment = await prisma.roleAssignment.upsert({
        where: { roleId_userId: { roleId, userId: user.id } },
        update: {},
        create: { roleId, userId: user.id },
    });

    revalidateTag('roles', { expire: 0 });
    return NextResponse.json(assignment);
}

// DELETE remove a user from a role
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    await prisma.roleAssignment.delete({ where: { id } });

    revalidateTag('roles', { expire: 0 });
    return NextResponse.json({ success: true });
}
