import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

function isOwnerCheck(session: any) {
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    return (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));
}

// Auto-create the viewer role if it doesn't exist
async function ensureViewerRole() {
    let viewer = await prisma.role.findUnique({ where: { name: 'viewer' } });
    if (!viewer) {
        viewer = await prisma.role.create({
            data: { name: 'viewer', color: '#71717a' }, // zinc-500
        });
    }
    return viewer;
}

// GET all roles with assignments and album access
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure viewer role exists
    await ensureViewerRole();

    const roles = await prisma.role.findMany({
        include: {
            assignments: { include: { user: true } },
            albumAccess: { include: { album: true } },
            exclusions: { include: { photo: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(roles);
}

// POST create a new role
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const role = await prisma.role.create({
        data: { name: name.toLowerCase(), color: color || "#6366f1" },
    });

    return NextResponse.json(role);
}

// DELETE a role (but never the viewer role)
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    const role = await prisma.role.findUnique({ where: { id } });
    if (role?.name === 'viewer') {
        return NextResponse.json({ error: "Cannot delete the built-in viewer role" }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
