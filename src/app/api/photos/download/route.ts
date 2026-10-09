/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getDownloadUrl as getR2DownloadUrl } from "@/lib/r2";
import { getOracleDownloadUrl } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth-utils";

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
    if (targetParts.length !== expectedParts.length + 1) return false;
    return targetParts.slice(1).join(".") === expectedHost;
}

/**
 * ✅ FIX (IDOR): previously this route only checked `if (!session) return 401`
 * — ANY authenticated user could pass an arbitrary `key` and receive a signed
 * download URL / direct redirect to ANY object in storage, including private
 * vault photos (bypassing visibility/role checks AND the PAYG blur paywall)
 * and other users' private DM images/voice messages. r2Key/mediaKey values
 * are deterministic and guessable, so this was exploitable by any logged-in
 * user, not just the owner.
 *
 * This resolves `key` against the DB and enforces the SAME authorization
 * rules used by the gallery (Photo) or the messenger (Message.mediaKey)
 * before ever issuing a URL. Unknown keys are rejected outright.
 */
async function authorizeKeyAccess(key: string, session: any): Promise<boolean> {
    if (isOwner(session)) return true;

    const userEmail = session?.user?.email as string | undefined;

    // Case 1: key belongs to a Photo (gallery vault)
    const photo = await prisma.photo.findFirst({
        where: { r2Key: key },
        select: {
            visibility: true,
            album: {
                select: {
                    visibility: true,
                    permissions: { select: { user: { select: { email: true } } } },
                    roleAccess: {
                        select: {
                            role: {
                                select: {
                                    name: true,
                                    assignments: { select: { expiresAt: true, user: { select: { email: true } } } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (photo) {
        if (photo.visibility === "hidden") return false;
        const album = photo.album;
        if (album.visibility === "public") return true;
        if (!userEmail) return false;
        if (album.permissions.some(p => p.user?.email === userEmail)) return true;
        const now = new Date();
        return album.roleAccess.some(ra =>
            ra.role.name === "viewer" ||
            ra.role.assignments.some(a => a.user?.email === userEmail && (!a.expiresAt || a.expiresAt > now))
        );
    }

    // Case 2: key belongs to a chat Message (messenger media)
    const message = await prisma.message.findFirst({
        where: { mediaKey: key },
        select: { chat: { select: { userId: true } } },
    });

    if (message) {
        if (!userEmail) return false;
        const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
        return !!user && user.id === message.chat.userId;
    }

    // Unknown key — don't silently serve it
    return false;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const provider = searchParams.get("provider") || "r2";
    const direct = searchParams.get("direct");

    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    const authorized = await authorizeKeyAccess(key, session);
    if (!authorized) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const url = provider === "oracle"
            ? await getOracleDownloadUrl(key)
            : await getR2DownloadUrl(key);
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
