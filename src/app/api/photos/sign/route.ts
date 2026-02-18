import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getUploadUrl } from "@/lib/r2";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    if (!isOwner) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { filename, contentType, albumId } = await req.json();

        if (!filename || !contentType || !albumId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const key = `photos/${albumId}/${Date.now()}-${filename}`;
        const uploadUrl = await getUploadUrl(key, contentType);

        return NextResponse.json({ uploadUrl, key });
    } catch (error) {
        console.error("Signing error:", error);
        return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }
}
