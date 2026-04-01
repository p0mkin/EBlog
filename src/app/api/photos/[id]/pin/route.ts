import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth-utils";
import { revalidateTag } from "next/cache";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { lat, lng } = await req.json();

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
        }

        const photo = await prisma.photo.update({
            where: { id },
            data: { lat, lng },
        });

        revalidateTag('photos', { expire: 0 });
        return NextResponse.json({ id: photo.id, lat: photo.lat, lng: photo.lng });
    } catch (error) {
        console.error("Manual pin error:", error);
        return NextResponse.json({ error: "Failed to pin photo" }, { status: 500 });
    }
}
