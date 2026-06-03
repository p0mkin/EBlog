import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getDownloadUrl as getR2DownloadUrl } from "@/lib/r2";
import { getOracleDownloadUrl } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";
import { canAccessAlbum } from "@/lib/auth-utils";

function getAllowedHost(provider: string): string | null {
    const endpoint = provider === "oracle" ? process.env.ORACLE_ENDPOINT : process.env.R2_ENDPOINT;
    if (!endpoint) return null;
    try {
        return new URL(endpoint).hostname;
    } catch (error) {
        console.error("Invalid storage endpoint configuration:", endpoint, error);
        return null;
    }
}

function isAllowedRedirectHost(targetHost: string, expectedHost: string): boolean {
    if (targetHost === expectedHost) return true;
    const targetParts = targetHost.split(".");
    const expectedParts = expectedHost.split(".");
    // Intentionally only allow a single added left-most label (e.g. <bucket>.<endpoint-host>)
    // instead of arbitrary nesting to keep redirect host checks strict.
    if (targetParts.length !== expectedParts.length + 1) return false;
    return targetParts.slice(1).join(".") === expectedHost;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const direct = searchParams.get("direct");

    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    try {
        const photo = await prisma.photo.findUnique({
            where: { r2Key: key },
            select: { albumId: true, storageProvider: true, r2Key: true },
        });

        if (!photo) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        const canAccess = await canAccessAlbum(session, photo.albumId);
        if (!canAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const provider = photo.storageProvider || "r2";
        const url = provider === "oracle"
            ? await getOracleDownloadUrl(photo.r2Key)
            : await getR2DownloadUrl(photo.r2Key);
        if (direct === "1" || direct === "true") {
            const expectedHost = getAllowedHost(provider);
            let targetHost: string;
            try {
                targetHost = new URL(url).hostname;
            } catch (error) {
                console.error("Failed to parse signed download URL:", error);
                return NextResponse.json({ error: "Failed to parse download URL from storage provider" }, { status: 500 });
            }
            if (!expectedHost || !isAllowedRedirectHost(targetHost, expectedHost)) {
                return NextResponse.json({ error: "Invalid download URL host" }, { status: 500 });
            }
            return NextResponse.redirect(url);
        }
        return NextResponse.json({ url });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }
}
