import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getR2BucketSize } from "@/lib/r2";
import { getOracleBucketSize } from "@/lib/oracle";

export async function POST() {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner =
        (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    if (!isOwner) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [r2Bytes, oracleBytes] = await Promise.all([
            getR2BucketSize(),
            getOracleBucketSize(),
        ]);

        return NextResponse.json({ r2Bytes, oracleBytes });
    } catch (error: any) {
        console.error("Storage usage error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch usage" }, { status: 500 });
    }
}
