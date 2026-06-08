/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { getCachedRoles } from "@/lib/db";
import { isOwner } from "@/lib/auth-utils";

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
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cached: 60s TTL, tagged "roles"
    const roles = await getCachedRoles();
    return NextResponse.json(roles);
}

// POST create a new role
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color, durationDays, isPayAsYouGo, photoUnlockPrice, blurPreviewCount } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const role = await prisma.role.create({
        data: {
            name: name.toLowerCase(),
            color: color || "#6366f1",
            durationDays: durationDays ? parseInt(durationDays, 10) : null,
            isPayAsYouGo: Boolean(isPayAsYouGo),
            photoUnlockPrice: photoUnlockPrice ? parseFloat(photoUnlockPrice) : null,
            blurPreviewCount: blurPreviewCount ? parseInt(blurPreviewCount, 10) : null
        },
    });

    revalidateTag('roles', { expire: 0 });
    return NextResponse.json(role);
}

// DELETE a role (but never the viewer role)
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    const role = await prisma.role.findUnique({ where: { id } });
    if (role?.name === 'viewer') {
        return NextResponse.json({ error: "Cannot delete the built-in viewer role" }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });

    revalidateTag('roles', { expire: 0 });
    revalidateTag('albums', { expire: 0 });
    return NextResponse.json({ success: true });
}
