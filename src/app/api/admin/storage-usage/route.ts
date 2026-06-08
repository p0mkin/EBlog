/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getR2BucketSize } from "@/lib/r2";
import { getOracleBucketSize } from "@/lib/oracle";
import { isOwner } from "@/lib/auth-utils";

export async function POST() {
    const session = await getServerSession(authOptions);

    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [r2Result, oracleResult] = await Promise.allSettled([
            getR2BucketSize(),
            getOracleBucketSize(),
        ]);

        const r2Bytes = r2Result.status === 'fulfilled' ? r2Result.value : 0;
        const oracleBytes = oracleResult.status === 'fulfilled' ? oracleResult.value : 0;
        const oracleError = oracleResult.status === 'rejected' ? (oracleResult.reason?.message || 'Unknown error') : null;
        const r2Error = r2Result.status === 'rejected' ? (r2Result.reason?.message || 'Unknown error') : null;

        return NextResponse.json({ r2Bytes, oracleBytes, r2Error, oracleError });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Storage limit check failed' }, { status: 500 });
    }
}
