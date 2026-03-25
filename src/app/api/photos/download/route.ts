import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getDownloadUrl as getR2DownloadUrl } from "@/lib/r2";
import { getOracleDownloadUrl } from "@/lib/oracle";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const provider = searchParams.get("provider") || "r2";

    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    try {
        const url = provider === "oracle" 
            ? await getOracleDownloadUrl(key)
            : await getR2DownloadUrl(key);
        return NextResponse.json({ url });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }
}
