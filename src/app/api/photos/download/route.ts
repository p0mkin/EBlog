import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getDownloadUrl as getR2DownloadUrl } from "@/lib/r2";
import { getOracleDownloadUrl } from "@/lib/oracle";

function getAllowedHost(provider: string): string | null {
    const endpoint = provider === "oracle" ? process.env.ORACLE_ENDPOINT : process.env.R2_ENDPOINT;
    if (!endpoint) return null;
    try {
        return new URL(endpoint).host;
    } catch (error) {
        console.error("Invalid storage endpoint configuration:", endpoint, error);
        return null;
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const provider = searchParams.get("provider") || "r2";
    const direct = searchParams.get("direct");

    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    try {
        const url = provider === "oracle" 
            ? await getOracleDownloadUrl(key)
            : await getR2DownloadUrl(key);
        if (direct === "1" || direct === "true") {
            const expectedHost = getAllowedHost(provider);
            let targetHost: string;
            try {
                targetHost = new URL(url).host;
            } catch (error) {
                console.error("Failed to parse signed download URL:", error);
                return NextResponse.json({ error: "Failed to parse download URL from storage provider" }, { status: 500 });
            }
            if (!expectedHost || targetHost !== expectedHost) {
                return NextResponse.json({ error: "Invalid download URL host" }, { status: 500 });
            }
            return NextResponse.redirect(url);
        }
        return NextResponse.json({ url });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }
}
