import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getDownloadUrl } from "@/lib/r2";

/**
 * On-demand signed URL generation for R2 photos.
 * Called when a user opens the lightbox, instead of pre-generating
 * signed URLs for every photo during SSR.
 */
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
        return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    try {
        const url = await getDownloadUrl(key);
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error("Download URL error:", error.message);
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }
}
