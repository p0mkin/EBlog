import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";

// PATCH /api/photos/[id]/caption  — save caption
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { caption } = await req.json();

    const photo = await prisma.photo.update({
        where: { id },
        data: { caption: caption ?? null },
    });
    revalidateTag('photos', { expire: 0 });
    return NextResponse.json(photo);
}
